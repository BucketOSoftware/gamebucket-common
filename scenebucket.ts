import { GLTF as GLTFType } from '@gltf-transform/core'
import { clone, cloneDeep, isUndefined, set, uniqueId } from 'lodash-es'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import invariant from 'tiny-invariant'

import { radToDeg } from '../lib/geometry'


export type TODO = any

// TODO: replace with types from our own lib
export type Tup3 = THREE.Vector3Tuple
export type Quat4 = THREE.Vector4Tuple

type Brand<T extends string> = { __brand__: T }

export type UniqueID = string & Brand<'EDITOR_UNIQUE_ID'>

function createFileID(): UniqueID {
    return uniqueId('SBK') as UniqueID
}

function getThreeID(threepio: THREE.Object3D): UniqueID {
    return threepio.uuid as UniqueID
}

// stuff we don't care about
type GLTFUnusedFields =
    | 'accessors'
    | 'buffers'
    | 'bufferViews'
    | 'materials'
    | 'meshes' // TODO: include meshes later?
    | 'samplers'
    | 'textures'

/** GLTF altered to support SceneBucket stuff */
interface SceneBucketFormat extends Omit<GLTFType.IGLTF, GLTFUnusedFields> {
    /** These are turned into THREE.Group objs */
    scenes: {
        name?: string
        nodes: number[] // indices of root nodes (there can be multiple!)
        extras: BucketExtras
    }[]

    /** @see https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#reference-node */
    // Notes:
    // - A node MAY have either a matrix or any combination of translation/
    // rotation/scale (TRS) properties
    // - When a node is targeted for animation (referenced by an animation.
    // channel.target), matrix MUST NOT be present.
    nodes: BucketNode[]

    extensions: {
        KHR_lights_punctual?: {
            // /** As per https://github.com/CesiumGS/glTF/blob/3d-tiles-next/extensions/2.0/Khronos/KHR_lights_punctual/README.md#light-shared-properties
            lights: Light[]
        }
    }
}

export type Light = {
    name?: string
    /** RGB value for light's color in linear space. */
    color?: Tup3
    intensity?: number
} & (
    | {
          type: 'point'
          range?: number
      }
    | {
          type: 'directional'
      }
    | {
          type: 'spot'
          spot: {
              innerConeAngle?: number // default 0
              outerConeAngle?: number // PI / 4.0
          }
          range?: number
      }
)

/** Properties added to the Three obj's userData */
export interface BucketUserData {
    src: 'TODO?' | undefined
    id: UniqueID
}

/**
 *
 * @todo matrix/skin/weights
 */
export interface BucketNode
    extends Omit<GLTFType.INode, 'matrix' | 'skin' | 'weights' | 'mesh'> {
    // name?: string // for finding/debugging

    // NOT MATERIAL! at least not yet
    // TODO: matrix: number[] (16) -- but can't be used if node is targeted by animations
    translation?: Tup3
    rotation?: Quat4
    scale?: Tup3

    // mesh?: number

    extras?: BucketExtras

    extensions?: {
        KHR_lights_punctual?: {
            light: number
        }
    }
}

/** Stuff added to "extras" */
interface BucketExtras {
    bucket?: {
        hidden?: boolean
        /** if this is defined, this object came from a loaded GLTF file */
        src?: {
            uri: string
            // TODO: point to an object within the hierarchy -- maybe with a
            // CSS-style selector?
        }
    }
    [k: string]: unknown
}

// #pragma section -

/**
 * Translates between SceneBucket format (SBK) and Three.js via editor intermediary
 */
export class SceneBucketFile {
    public readonly nodes = new Map<UniqueID, BucketNode>()
    private readonly nodeToId = new WeakMap<BucketNode, UniqueID>()
    private readonly extras = new WeakMap<
        BucketNode,
        Light | GLTFType.ICamera
    >()

    private readonly doc: Readonly<SceneBucketFormat>

    constructor(gltf: TODO) {
        // necessary to clone?
        this.doc = cloneDeep(gltf)

        const { doc: scene, nodes: idToNode, nodeToId, extras } = this

        // index the nodes in this file
        for (let node of scene.nodes ?? []) {
            const id = createFileID()
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
            const isCamera = node.camera !== undefined && 'camera'
            const isLight =
                node.extensions?.KHR_lights_punctual?.light !== undefined &&
                'light'
            const isMesh = node.extras?.bucket?.src !== undefined && 'mesh'
            const isGroup = node.children && 'group'

            draft.nodes[id] = {
                id,
                type: isCamera || isLight || isMesh || isGroup || 'node',
                name: node.name,
                position: node.translation
                    ? clone(node.translation)
                    : [0, 0, 0],
                rotation: node.rotation ? clone(node.rotation) : [0, 0, 0, 1],
                scale: node.scale ? clone(node.scale) : [1, 1, 1],

                // This ties it back to the SBK it was loaded from
                src: node.extras?.bucket?.src?.uri,

                children:
                    node.children?.map(
                        (idx) =>
                            // TODO: this is a WeakMap... would we ever drop the node in a way that needs that functionality, though?
                            nodeToId.get(scene.nodes[idx])!,
                    ) ?? [],
                visible: !(node.extras?.bucket?.hidden || false),

                extras: extras.get(node),
            }
        }
        return draft
    }
}

export interface SerializedScene {
    roots: UniqueID[]
    nodes: Record<UniqueID, SerializedNode>
}

export interface SerializedNode {
    id: UniqueID
    type: 'group' | 'mesh' | 'camera' | 'light' | 'node'

    name: string | undefined
    children: UniqueID[]

    position: Tup3
    scale: Tup3
    rotation: Quat4

    visible: boolean
    // castShadow: boolean
    // receiveShadow: boolean

    src?: string // URL to GLTF

    extras?: Light | GLTFType.ICamera
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

        this.syncNodeToThree(oldNode.id, threepio.parent!)
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

            this.threeToId.set(threepio, node.id)
            this.idToThree.set(node.id, threepio)
            this.nodes[node.id] = node
            // TODO: does this bear oout?
            // console.warn('Created new node for obj: ', node, threepio)
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
        const ud = threepio.userData.bucket as BucketUserData | undefined
        if (ud?.src) {
            // The node should already exist
            invariant(existingId)
            invariant(this.nodes[existingId])
        } else {
            // The node may or may not exist but it should have no src
            invariant(existingId === undefined || existingId === threepio.uuid)
            invariant(ud?.src === undefined)
        }

        const { name, position, scale, quaternion, visible } = threepio
        const type = typeFromThreepio(threepio)
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
            visible,
        }
    }

    private syncNodeToThree(id: UniqueID, threeParent: THREE.Object3D) {
        let node = this.nodes[id]
        let threepio = this.idToThree.get(id)
        // console.debug('Syncing:', node, threepio)

        const { src } = node
        if (!isUndefined(src)) {
            // if (false) {
            // Different rules here -- we're going to import this threepio
            // instead of creating it
            invariant(isUndefined(threepio) || threepio instanceof THREE.Group)
            invariant(
                node.children.length === 0,
                "Children on a pointer node -- should be supported, but currenlty in'st",
            )

            const uriChanged = threepio?.userData.bucket?.src !== src
            if (uriChanged) {
                // console.warn('Loading...', src)
                this.loader.loadAsync(src).then((gltf) => {
                    // see if another one has been loaded in the meantime
                    threepio = this.idToThree.get(id)
                    if (threepio) {
                        threepio.removeFromParent()
                        console.error(
                            'TODO: release geometry/material resources',
                        )
                    }

                    const loaded = gltf.scene.clone() // TODO: necessary?
                    set(loaded, 'userData.bucket.src', src)
                    this.idToThree.set(id, loaded)
                    this.threeToId.set(loaded, id)
                    threeParent.add(loaded)

                    // TODO: allow for doing stuff like setting all children to
                    // .castShadow = true or something
                    console.debug('Loaded and ready to go:', src, loaded)
                    copyProps(loaded, node)
                    if (this.onLoad) {
                        this.onLoad(loaded)
                    }
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
            this.idToThree.set(id, threepio)
            this.threeToId.set(threepio, id)
            threeParent.add(threepio)
        }

        copyProps(threepio, node)

        for (let child of node.children) {
            this.syncNodeToThree(child, threepio)
        }
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

const typeToKlass /* : Record<Light['type'] | GLTFType.ICamera['type'],> */ = {
    point: THREE.PointLight,
    spot: THREE.SpotLight,
    directional: THREE.DirectionalLight,
    perspective: THREE.PerspectiveCamera,
    orthographic: THREE.OrthographicCamera,
    OTHER: THREE.Object3D,
}

function createThreeFromNode(node: SerializedNode): THREE.Object3D {
    let threepio: THREE.Object3D
    // TODO: meshes!
    let klass = typeToKlass[node.extras?.type ?? 'OTHER']

    if (!klass) {
        if (node.children.length) {
            klass = THREE.Group
        } else {
            klass = THREE.Object3D
        }
    }

    threepio = new klass()
    const userData: BucketUserData = {
        src: 'TODO?', //; should this point to the SBK file or something',
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

    dest.visible = source.visible

    // dest.matrixWorldNeedsUpdate = true
    // dest.userData.spec = source
    // dest.updateMatrixWorld()

    const extras = source.extras
    if (extras) {
        const { type } = extras

        switch (type) {
            case 'spot': {
                invariant(dest instanceof THREE.SpotLight)
                const { innerConeAngle, outerConeAngle } = extras.spot
                dest.angle = outerConeAngle ?? Math.PI / 4
                dest.penumbra = 1 - (innerConeAngle ?? 0) / dest.angle
            }
            case 'point':
                invariant(
                    dest instanceof THREE.SpotLight ||
                        dest instanceof THREE.PointLight,
                )

                // spot and point have a distance param
                dest.distance = extras.range ?? 0 // apparently 0 means infinite. sure, why not
            case 'directional':
                invariant(dest instanceof THREE.Light)
                dest.color = colorFromTuple(extras.color!)
                dest.intensity = extras.intensity ?? 1
                break

            // now for the camera stuff
            case 'perspective':
                invariant(dest instanceof THREE.PerspectiveCamera)

                const { yfov, aspectRatio, znear, zfar } = extras.perspective!
                dest.fov = radToDeg(yfov)
                // TODO: is this the right thing to do? seems like resizing the viewport would affect aspect ratio
                dest.aspect = aspectRatio ?? 1
                dest.near = znear
                dest.far = zfar ?? 2_000_000 // can't remember why this is the default
                break
            case 'orthographic':
                invariant(dest instanceof THREE.OrthographicCamera)

                console.error('TODO')
                break
        }
    }
}
function typeFromThreepio(threepio: any): SerializedNode['type'] {
    if (threepio.isMesh) return 'mesh'
    if (threepio.isGroup) return 'group'
    if (threepio.isLight) return 'light'
    if (threepio.isCamera) return 'camera'

    return 'node'
}
