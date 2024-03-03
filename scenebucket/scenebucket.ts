import { GLTF as GLTFType } from '@gltf-transform/core'
import { clone, cloneDeep, isUndefined, set } from 'lodash-es'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import invariant from 'tiny-invariant'

import { radToDeg } from '../geometry'

import {
    BucketNode,
    Object3DUserData,
    CameraProperties,
    LightProperties,
    SceneBucketFormat,
    SerializedNode,
    SerializedScene,
    UniqueID,
    createNodeID,
    getThreeID,
    nodeTypeFromThree,
} from './format'
import { Object3D } from 'three'
export type TODO = any

// TODO: replace with types from our own lib
export type Tup3 = THREE.Vector3Tuple
export type Quat4 = THREE.Vector4Tuple

// #pragma section -

/**
 * Translates between SceneBucket format (SBK) and Three.js via editor intermediary
 */
export class SceneBucketFile {
    public readonly nodes = new Map<UniqueID, BucketNode>()
    private readonly nodeToId = new WeakMap<BucketNode, UniqueID>()
    /** Properties contained in separate chunks of the GLTF file. @todo: Write types for these as they exist in the GLTF file, as oppposed to how we serialize them */
    private readonly extras = new WeakMap<
        BucketNode,
        LightProperties | CameraProperties
    >()

    private readonly doc: Readonly<SceneBucketFormat>

    constructor(gltf: TODO) {
        // necessary to clone?
        this.doc = cloneDeep(gltf)

        const { doc: scene, nodes: idToNode, nodeToId, extras } = this

        // index the nodes in this file
        for (let node of scene.nodes ?? []) {
            const id = createNodeID()
            idToNode.set(id, node)
            nodeToId.set(node, id)

            if ('camera' in node) {
                extras.set(node, scene.cameras![node.camera!])
            }

            const lightIdx = node.extensions?.KHR_lights_punctual?.light
            if (!isUndefined(lightIdx)) {
                const light =
                    scene.extensions.KHR_lights_punctual?.lights[lightIdx]
                invariant(light)
                extras.set(node, light)
            }
        }
    }

    get defaultScene() {
        return this.doc.scenes[this.doc.scene || 0]
    }

    /** translate the GLTF version of the `this.doc` graph into the editor format */
    serialize() {
        const {
            defaultScene,
            doc: scene,
            nodeToId,
            nodes: idToNode,
            extras,
        } = this

        const draft = {
            roots: defaultScene.nodes.map(
                (idx) => nodeToId.get(scene.nodes[idx])!, // TODO: verify
            ),
            nodes: {} as { [id: UniqueID]: SerializedNode },
        }

        for (let [id, node] of idToNode) {
            // TODO: make this another function I guess

            draft.nodes[id] = this.nodeFromSBk(id, node)
        }
        return draft
    }

    nodeFromSBk(id: UniqueID, node: BucketNode): SerializedNode {
        const bucketMeta = node.extras?.bucket

        const isCamera = node.camera !== undefined && 'camera'
        const isLight =
            node.extensions?.KHR_lights_punctual?.light !== undefined && 'light'
        const isMesh = node.extras?.bucket?.src !== undefined && 'mesh'
        const isGroup = node.children && 'group'

        const canBeHidden = !isCamera
        const canCastShadow = isMesh || isCamera
        const canReceiveShadow = isMesh

        const extras = this.extras.get(node)

        const position: Tup3 = node.translation
            ? clone(node.translation)
            : [0, 0, 0]
        const rotation: Quat4 = node.rotation
            ? clone(node.rotation)
            : [0, 0, 0, 1]
        const scale: Tup3 = node.scale ? clone(node.scale) : [1, 1, 1]

        return {
            id,
            type: isCamera || isLight || isMesh || isGroup || 'node',
            name: node.name,

            position,
            rotation,
            scale,

            visible: canBeHidden ? !(bucketMeta?.hidden || false) : null,
            castShadow: canCastShadow ? bucketMeta?.castShadow || false : null,
            receiveShadow: canReceiveShadow
                ? bucketMeta?.receiveShadow || false
                : null,

            src: isMesh ? node.extras?.bucket?.src?.uri : null,
            light: isLight ? serializeLight(extras) : null,
            camera: isCamera ? serializeCamera(extras) : null,

            children:
                node.children?.map(
                    (idx) =>
                        // TODO: this is a WeakMap... would we ever drop the node in a way that needs that functionality, though?
                        this.nodeToId.get(this.doc.nodes[idx])!,
                ) ?? [],
        }
    }
}

/**
 * Doesn't know about GLTF at all, just translates between editor format and
 * Three objects. In an ideal world we could render straight from the editor
 * format -- we can put all the info we need on it. For now, we create a mapping
 * between our spec objects and three objects
 */
export class ThreeSync implements SerializedScene {
    public readonly idToThree = new Map<UniqueID, THREE.Object3D>()
    public readonly threeToId = new Map<THREE.Object3D, UniqueID>()

    roots: UniqueID[]
    nodes: Record<UniqueID, SerializedNode>
    onLoad?: (obj?: unknown) => void

    constructor(
        gltf: SceneBucketFile,
        private readonly loader: GLTFLoader = new GLTFLoader(),
    ) {
        const { roots, nodes } = gltf.serialize()

        this.nodes = nodes
        this.roots = roots
    }

    asSerialized() {
        return { nodes: this.nodes, roots: this.roots }
    }

    /** Sync a single node to three.js */
    updateNode(newNode: SerializedNode) {
        // console.debug("Update: ", newNode.id)
        const oldNode = this.nodes[newNode.id]
        invariant(oldNode)
        if (newNode === oldNode) {
            console.debug('No change:', oldNode.id)
            return
        }

        // Object.assign(oldNode, newNode)
        oldNode.visible = newNode.visible

        const threepio = this.idToThree.get(oldNode.id)
        // console.log(threepio)
        if (!threepio) {
            console.warn('Okay nevermind')
            return
        }

        this.syncNodeToThree(oldNode.id, threepio.parent!, false)
    }

    /** TODO: support multiple cameras I guess */
    get camera(): THREE.PerspectiveCamera | THREE.OrthographicCamera | null {
        for (let [id, obj] of this.idToThree) {
            if (obj instanceof THREE.Camera) {
                // @ts-expect-error
                return obj
            }
        }
        return null
    }

    getID(obj: THREE.Object3D | null): UniqueID | undefined {
        if (obj === null) {
            return undefined
        }

        const id = this.threeToId.get(obj)
        return id ?? this.getID(obj.parent)
    }

    toThree(threeScene: THREE.Scene) {
        // Recursively sync the editor scene to the given Three scene;
        // don't delete Three objects that weren't added by this function, i.e.
        // added dynamically in code

        console.time('syncToThree')
        for (let id of this.roots) {
            this.syncNodeToThree(id, threeScene)
        }
        console.timeEnd('syncToThree')
    }

    fromThree(threeScene: THREE.Scene) {
        console.time('syncFromThree')

        // Note: the scene itself isn't ever loaded from a GLTF, it's passed in to us.
        // Thus, we start from the kids
        for (let threepio of threeScene.children) {
            this.updateNodeFromThree(threepio)
        }

        console.timeEnd('syncFromThree')
    }

    private updateNodeFromThree(threepio: THREE.Object3D) {
        const existing = this.threeToId.get(threepio)
        if (existing) {
            const node = this.nodes[existing]
            invariant(node)
            Object.assign(node, this.nodeThatRepresents(threepio))
            return node
        } else {
            const node = this.nodeThatRepresents(threepio)
            invariant(!this.threeToId.has(threepio))
            invariant(!this.roots.includes(node.id))

            const data = threepio.userData as Object3DUserData
            set(data, 'bucket.id', node.id)

            this.threeToId.set(threepio, node.id)
            this.idToThree.set(node.id, threepio)
            this.nodes[node.id] = node
            // console.warn('Created new node for obj: ', node, threepio)
            // TODO?: does this bear oout?
            if ((threepio.parent as THREE.Scene).isScene) {
                this.roots.push(node.id)
            }
            return node
        }
    }

    private nodeThatRepresents(
        threepio: THREE.Object3D<THREE.Object3DEventMap>,
    ): SerializedNode {
        const existingId = threepio.userData.bucket?.id

        // was this node created by us, or some other code?
        const ud = threepio.userData as Object3DUserData
        if (ud.bucket?.src) {
            // The node should already exist
            invariant(existingId)
            invariant(this.nodes[existingId])
        } else {
            // The node may or may not exist but it should have no src
            invariant(existingId === undefined || existingId === threepio.uuid)
            invariant(ud.bucket?.src === undefined)
        }

        const {
            name,
            position,
            scale,
            quaternion,
            visible,
            castShadow,
            receiveShadow,
        } = threepio

        const type = nodeTypeFromThree(threepio)

        return {
            id: getThreeID(threepio),
            name: name || threepio.constructor.name,
            type,
            children: threepio.children.map(
                (child) => this.updateNodeFromThree(child).id,
            ), // TODO: move this out so this can be a plain function
            position: position.toArray() as Tup3,
            scale: scale.toArray() as Tup3,
            rotation: quaternion.toArray() as Quat4,
            // booleans
            visible,
            castShadow,
            receiveShadow,
        }
    }

    private syncNodeToThree(
        id: UniqueID,
        threeParent: THREE.Object3D,
        recurse = true,
    ) {
        let node = this.nodes[id]
        let threepio = this.idToThree.get(id)

        const desiredUri = node.src || undefined
        if (!isUndefined(desiredUri)) {
            // Different rules here -- we're going to import this threepio
            // instead of creating it
            invariant(isUndefined(threepio) || threepio instanceof THREE.Group)
            invariant(
                !node.children || node.children.length === 0,
                "Children on a pointer node -- should be supported, but currenlty isn't",
            )

            const userData: Object3DUserData | undefined = threepio?.userData
            const existingUri = userData?.bucket?.src
            const uriChanged = existingUri !== desiredUri
            // console.warn('URI:', existingUri, '->', desiredUri, uriChanged)
            if (uriChanged && desiredUri) {
                console.debug(
                    'src changed for node ',
                    id,
                    ': ',
                    existingUri,
                    '->',
                    desiredUri,
                )
                invariant(typeof desiredUri === 'string')

                // TODO?: what do we do if desiredUri is now undefined? Should we
                // remove the loaded object?

                // TODO: better handle race conditions here
                // console.warn('Loading...', src)
                this.loader.loadAsync(desiredUri).then((gltf) => {
                    // see if another one has been loaded in the meantime
                    threepio = this.idToThree.get(id)
                    if (threepio) {
                        threepio.removeFromParent()
                        console.error(
                            'TODO: release geometry/material resources',
                        )
                    }

                    // TODO: allow for doing stuff like setting all children to
                    // .castShadow = true or something
                    // TODO?: is this necessary?
                    // TODO: handle SkinnedMeshes with that special utility function dammit
                    const loaded = gltf.scene.clone()
                    set(
                        loaded.userData as Object3DUserData,
                        'bucket.src',
                        new URL(desiredUri, window.location.href), //TODO: is this a good idea?
                    )

                    this.registerThreepio(id, loaded, threeParent)
                    copyProps(loaded, node)

                    if (this.onLoad) {
                        this.onLoad(loaded)
                    }

                    console.debug('Loaded and ready to go:', desiredUri, loaded)
                    return loaded
                })
            } else {
                invariant(threepio)
                copyProps(threepio, node)
            }

            return
        }

        if (!threepio) {
            threepio = createThreeFromNode(node)
            this.registerThreepio(id, threepio, threeParent)
        }

        copyProps(threepio, node)

        if (recurse) {
            for (let child of node.children) {
                this.syncNodeToThree(child, threepio)
            }
        }
    }

    private registerThreepio(
        id: UniqueID,
        threepio: Object3D,
        parent: Object3D,
    ) {
        this.idToThree.set(id, threepio)
        this.threeToId.set(threepio, id)
        parent.add(threepio)
        set(threepio.userData, 'bucket.id', id)
    }
}

export function colorFromTuple(color: Tup3 = [1, 1, 1]) {
    return new THREE.Color().setRGB(
        color[0],
        color[1],
        color[2],
        THREE.LinearSRGBColorSpace,
    )
}

function setAndCheckV3(dest: THREE.Vector3, src: Readonly<THREE.Vector3Tuple>) {
    let diff = dest.x !== src[0] || dest.y !== src[1] || dest.z !== src[2]

    dest.x = src[0]
    dest.y = src[1]
    dest.z = src[2]
    return diff
}

const typeToKlass = {
    point: THREE.PointLight,
    spot: THREE.SpotLight,
    directional: THREE.DirectionalLight,
    perspective: THREE.PerspectiveCamera,
    orthographic: THREE.OrthographicCamera,
    ambient: THREE.AmbientLight,
    hemisphere: THREE.HemisphereLight,
    OTHER: THREE.Object3D,
}

function createThreeFromNode(node: SerializedNode): THREE.Object3D {
    let threepio: THREE.Object3D
    // TODO: meshes!
    let klass = typeToKlass[node.light?.type ?? node.camera?.type ?? 'OTHER']
    invariant(klass)
    if (!klass) {
        if (node.children?.length) {
            klass = THREE.Group
        } else {
            klass = THREE.Object3D
        }
    }

    threepio = new klass()
    const userData: Object3DUserData['bucket'] = {
        // src: 'TODO?', //; should this point to the SBK file or something',
        id: node.id,
    }
    threepio.userData.bucket = userData

    // console.debug('New object crated', threepio)
    // specific behavior for lights...
    if ('target' in threepio && threepio.target instanceof THREE.Object3D) {
        threepio.target.position.set(0, 0, -1)
        threepio.add(threepio.target)
    }

    return threepio
}

function copyProps(dest: THREE.Object3D, source: SerializedNode) {
    invariant(dest.parent)
    if (dest.name && source.name !== dest.name) {
        // console.info('Renaming threepio: ', dest.name, source.name)
    }
    dest.name = source.name || dest.name

    // TODO: check whether anything actually changed
    // or do we even want to override if we don't have a value locally?
    dest.position.fromArray(source.position)
    dest.quaternion.fromArray(source.rotation)
    dest.scale.fromArray(source.scale)

    // TODO?: it's really problematic to have to repeat basically this code when syncing the other direction!
    // TODO?: is it okay to coerce null to a boolean here
    dest.visible = source.visible === null ? true : source.visible
    dest.castShadow = !!source.castShadow
    dest.receiveShadow = !!source.receiveShadow
    // @ts-expect-error
    if (dest.isLight) {
        // @ts-expect-error
        dest.shadow?.camera.updateProjectionMatrix()
    }
    // console.warn('changing shadows:', dest, dest.castShadow, dest.receiveShadow)

    // dest.matrixWorldNeedsUpdate = true
    // dest.updateMatrixWorld()

    // const extras = source.extras
    invariant(!(source.light && source.camera))
    if (source.light) {
        invariant(dest instanceof THREE.Light)
        const { color, spot, range, intensity } = source.light
        // const { type } = extras
        dest.color = colorFromTuple(color)

        switch (source.light.type) {
            case 'spot': {
                invariant(dest instanceof THREE.SpotLight)
                invariant(spot)
                const { innerConeAngle, outerConeAngle } = spot
                dest.angle = outerConeAngle ?? Math.PI / 4
                dest.penumbra = 1 - (innerConeAngle ?? 0) / dest.angle
            }
            case 'point':
                invariant(
                    dest instanceof THREE.SpotLight ||
                        dest instanceof THREE.PointLight,
                )

                // spot and point have a distance param
                dest.distance = range ?? 0 // apparently 0 means infinite. sure, why not
            case 'directional':
                invariant(dest instanceof THREE.Light)
                dest.intensity = intensity ?? 1
                break
        }
    }

    if (source.camera) {
        const { type, perspective, orthographic } = source.camera
        switch (type) {
            // now for the camera stuff
            case 'perspective': {
                invariant(dest instanceof THREE.PerspectiveCamera)

                const { yfov, aspectRatio, znear, zfar } = perspective!
                // TODO?: is this the right thing to do? seems like resizing the viewport would require the user to change the aspect ratio anyway
                dest.aspect = aspectRatio ?? 1
                dest.fov = radToDeg(yfov)
                dest.far = zfar ?? 2_000_000 // can't remember why this is the default
                dest.near = znear
                break
            }
            case 'orthographic': {
                invariant(dest instanceof THREE.OrthographicCamera)

                const { xmag, ymag, zfar, znear } = orthographic!

                const params: Partial<THREE.OrthographicCamera> = {
                    left: -xmag,
                    right: xmag,
                    top: -ymag,
                    bottom: ymag,
                    near: znear,
                    far: zfar,
                }
                Object.assign(dest, params)
                break
            }
        }

        dest.updateProjectionMatrix()
    }
}

function serializeLight(light: any): LightProperties {
    const { color, intensity, type, range, spot } = light
    // TODO: three-specific types
    invariant(['point', 'directional', 'spot'].includes(type))

    const isSpot = type === 'spot'
    const isDirectional = type === 'directional'
    // TODO: sanity check that we don't have unreasonable properties
    // const {} = light
    return {
        type,
        color,
        intensity,
        range: isSpot || isDirectional ? range : null,
        spot: isSpot ? spot : null,
    }
}

/** Placeholder in case the serialized version of camera diverges from the GLTF version */
function serializeCamera(
    extras: LightProperties | GLTFType.ICamera | undefined,
): CameraProperties {
    return extras as CameraProperties
}
