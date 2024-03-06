import { compact } from 'lodash-es'
import {
    Camera,
    CameraHelper,
    DirectionalLight,
    DirectionalLightHelper,
    Object3D,
    PointLight,
    PointLightHelper,
    Raycaster,
    Scene,
    SpotLight,
    SpotLightHelper,
    WebGLRenderer,
    type PerspectiveCamera,
    type Vector2,
} from 'three'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { ClearPass } from 'three/addons/postprocessing/ClearPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import invariant from 'tiny-invariant'

import { GVec2, ZVec2, toGVec3 } from '../geometry'
import type { Object3DUserData, SerializedNode, UniqueID } from '../scenebucket'
import { isNormalizedCanvasPosition } from '../threez'

type EitherCamera = PerspectiveCamera | THREE.OrthographicCamera

export interface Params {
    scene: Scene
    camera: EitherCamera
    canvas: HTMLCanvasElement
    getObjectById: (id: UniqueID) => Object3D
    onUpdate: EditorLiaison['onUpdate'] //  (node?: SerializedNode) => void
}

export default class EditorLiaison {
    static readonly OBJECT_PICKED = 'objectPicked'

    getObjectById: Params['getObjectById']
    /** Callback: called when a node is modified */
    onUpdate: (node?: SerializedNode) => void

    public readonly canvas: HTMLCanvasElement
    private readonly editorCamera: EitherCamera
    /** Scene for widgets and such */
    private readonly editorScene: Scene = new Scene()
    /** The scene under edit.
     * @todo? What if we want to edit more than one, or change it while the editor is open? */
    private userScene: Scene

    private raycaster = new Raycaster()
    private controls?: MapControls

    private outlinePass?: OutlinePass
    private overlayPass?: RenderPass
    private activeHelpers = new Map<Object3D, Object3D[]>()

    constructor(
        { camera, getObjectById, onUpdate, scene, canvas }: Params,
        public readonly editorRoot: HTMLElement,
    ) {
        this.getObjectById = getObjectById
        this.onUpdate = onUpdate

        this.canvas = canvas
        this.userScene = scene
        this.editorCamera = camera.clone()
    }

    /** stop rendering the editor. afterwards, you should probably toss this object! */
    teardown() {
        console.debug('Tearing down the editor app!')
        console.error('TODO: root.unmount()')
        // render(null, this.editorRoot)

        // deselect to release any resources
        this.setSelection()
        // TODO: dispose this.editorScene

        if (this.outlinePass) {
            this.outlinePass.dispose()
            this.outlinePass = undefined
        }

        if (this.controls) {
            this.mapControls(false)
            this.controls.dispose()
            this.controls = undefined
        }
    }

    get camera() {
        return this.editorCamera
    }

    // get postProcessingPasses() {
    //     return this.passes
    // }

    /** Get an effects composer that renders the editor's graphics. Tied to a
     * particular scene, so it would be necessary to recreate it if you
     * change the scene. */
    getRenderer(renderer: WebGLRenderer) {
        const { editorCamera, editorScene, userScene } = this
        this.outlinePass = outlinePass(userScene, editorCamera)
        this.outlinePass.enabled = false

        this.overlayPass = renderOverlayPass(editorScene, editorCamera)
        this.overlayPass.enabled = false

        const compo = new EffectComposer(renderer)
        compo.passes = [
            new ClearPass(),
            renderPass(userScene, this.editorCamera),
            this.outlinePass,
            this.overlayPass,
            new OutputPass(),
        ]

        return compo
    }

    update(dt?: number) {
        // TODO: update helpers? or do we do that when the objects move somehow
        this.controls?.update(dt)
    }

    private hitTest(point: GVec2) {
        invariant(isNormalizedCanvasPosition(point))

        const { raycaster, editorCamera, userScene } = this

        raycaster.setFromCamera(point as Vector2, editorCamera)
        return raycaster.intersectObject(userScene, true)
    }

    idAt(point: GVec2) {
        invariant(isNormalizedCanvasPosition(point))

        // TODO: allow picking objects behind objects. maybe: if the
        // result of objectsAt is _exactly_ the same as it was last
        // time, cycle through the results instead of picking the last one
        for (let hit of this.hitTest(point)) {
            const id = selectionId(hit)

            if (id) {
                return id
            }
        }
    }

    hitTestWithId(point: GVec2) {
        invariant(isNormalizedCanvasPosition(point))

        for (let hit of this.hitTest(point)) {
            const id = selectionId(hit)

            if (id) {
                // otherwise redux will complain about

                return {
                    id,
                    point: toGVec3(hit.point),
                    distance: hit.distance,
                    // normal: hit.normal
                }
            }
        }
    }

    mapControls(enabled: boolean) {
        const { editorCamera, canvas } = this
        if (enabled) {
            invariant(canvas)
            // TODO: would need to redo this if editorCamera changes!
            this.controls ??= new MapControls(editorCamera, canvas)
            this.controls.enabled = true
            this.controls.enableDamping = false
            this.controls.listenToKeyEvents(window)
        } else {
            if (this.controls) {
                this.controls.stopListenToKeyEvents()

                this.controls.enabled = false
            }
        }
    }

    /** Highlight the objects defined by these IDs in the Outline pass */
    setSelection(id?: UniqueID | UniqueID[]) {
        invariant(
            this.outlinePass && this.overlayPass,
            'setSelection: must create the renderer before calling setSelection',
        )

        this.outlinePass.selectedObjects = arrayWrap(id)
            .filter((i) => i)
            .map((id) => this.getObjectById(id as UniqueID))

        // TODO: reuse helpers if applicable
        for (let [_threepio, helpers] of this.activeHelpers) {
            for (let helper of helpers) {
                helper.removeFromParent()
                if ('dispose' in helper) {
                    invariant(helper.dispose instanceof Function)
                    helper.dispose()
                }
            }
        }

        for (let threepio of this.outlinePass.selectedObjects) {
            const helpers = compact(helpersForObject(threepio))
            // console.warn(helpers)
            if (helpers.length) {
                this.activeHelpers.set(threepio, helpers)
                this.editorScene.add(...helpers)
            }
        }

        const enable = !!this.outlinePass.selectedObjects.length
        this.outlinePass.enabled = enable
        this.overlayPass.enabled = enable

        this.onUpdate()
    }
}

function arrayWrap<T>(ik: unknown): T[] {
    return Array.isArray(ik) ? ik : [ik]
}

function renderPass(scene: Scene, camera: Camera) {
    return new RenderPass(scene, camera)
}

function renderOverlayPass(scene: Scene, camera: Camera) {
    const pass = new RenderPass(scene, camera)
    pass.clear = false
    pass.clearDepth = true
    return pass
}

function outlinePass(scene: Scene, camera: Camera) {
    // DONTYET: this creates a bunch of materials but doesn't provide a way to precompile them
    const brite = 1 / 50
    const outliner = new OutlinePass(ZVec2(1, 1), scene, camera)
    outliner.edgeStrength = 12
    outliner.edgeGlow = 2
    outliner.edgeThickness = 3
    outliner.visibleEdgeColor.set(0.1 * brite, 0.5 * brite, 2.5 * brite)
    outliner.hiddenEdgeColor.set(1 * brite, 1 * brite, 2.25 * brite)
    outliner.pulsePeriod = 1.4

    return outliner
}

function helpersForObject(threepio: Object3D): (Object3D | null)[] {
    switch (threepio.type) {
        case 'DirectionalLight':
            invariant(threepio instanceof DirectionalLight)
            return [
                new DirectionalLightHelper(threepio),
                threepio.castShadow
                    ? new CameraHelper(threepio.shadow.camera)
                    : null,
            ]
        case 'SpotLight':
            invariant(threepio instanceof SpotLight)
            return [
                new SpotLightHelper(threepio),
                threepio.castShadow
                    ? new CameraHelper(threepio.shadow.camera)
                    : null,
            ]
        case 'PointLight':
            invariant(threepio instanceof PointLight)
            return [
                new PointLightHelper(threepio),
                // new PointLightHelper(threepio, threepio.distance),
            ]
        case 'PerspectiveCamera':
        case 'OrthographicCamera':
            invariant(threepio instanceof Camera)
            return [new CameraHelper(threepio)]

        default:
            return []
    }
}

/** Return the closest ancestor with an ID that is visible and corporeal */
function selectionId(hit: THREE.Intersection) {
    let foundID: UniqueID | undefined
    let walker: THREE.Object3D | null = hit.object

    // Ignore helpers and lines and such
    if (!hit.face) return

    while (walker) {
        if (!walker.visible) {
            // the clicked object won't be drawn
            return undefined
        }

        if (!foundID && (walker.userData as Object3DUserData).bucket?.id) {
            foundID = walker.userData.bucket.id
        }
        walker = walker.parent
    }

    return foundID
}
