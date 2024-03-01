import * as THREE from 'three'
import {
    Scene,
    Object3D,
    DirectionalLight,
    DirectionalLightHelper,
    CameraHelper,
} from 'three'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import type { Pass } from 'three/addons/postprocessing/Pass.js'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { ClearPass } from 'three/addons/postprocessing/ClearPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import invariant from 'tiny-invariant'
import { ZVec2 } from '../geometry'
import type { SerializedNode, UniqueID } from '../scenebucket'
import { render } from 'preact'

type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera

export interface Params {
    // scene: THREE.Scene
    camera: Camera
    getObjectById: (id: UniqueID) => Object3D
    onUpdate: EditorLiaison['onUpdate'] //  (node?: SerializedNode) => void
}

export default class EditorLiaison {
    static readonly OBJECT_PICKED = 'objectPicked'

    getObjectById: Params['getObjectById']
    onUpdate: (node?: SerializedNode) => void

    // private outliner: OutlinePass
    private editorCamera: Camera
    /** Scene for  */
    private editorScene: THREE.Scene = new Scene()
    // private passes: [render: RenderPass, outline: OutlinePass]
    private controls?: MapControls
    private outlinePass?: OutlinePass
    private overlayPass?: RenderPass

    constructor(
        { camera, getObjectById, onUpdate }: Params,
        public readonly domElement: HTMLElement,
    ) {
        this.getObjectById = getObjectById
        this.onUpdate = onUpdate

        this.editorCamera = camera.clone()
    }

    /** stop rendering the editor. afterwards, you should probably toss this object! */
    teardown() {
        console.debug('Tearing down the editor app!')
        render(null, this.domElement)

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
     * particular THREE.scene, so it would be necessary to recreate it if you
     * change the scene. */
    getRenderer(renderer: THREE.WebGLRenderer, userScene: THREE.Scene) {
        const { editorCamera, editorScene } = this
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
        this.controls?.update(dt)
    }

    mapControls(enabled: boolean, canvas?: HTMLCanvasElement) {
        if (enabled) {
            invariant(canvas)
            this.controls ??= new MapControls(this.editorCamera, canvas)
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
    setSelection(id: UniqueID | UniqueID[] | undefined) {
        invariant(
            this.outlinePass,
            'setSelection: must create the renderer before calling setSelection',
        )
        this.outlinePass.selectedObjects = arrayWrap(id)
            .filter((i) => i)
            .map((id) => this.getObjectById(id as UniqueID))

        invariant(
            this.outlinePass.selectedObjects.length <= 1,
            'TODO: support multiple selection',
        )

        requestIdleCallback(
            (e) => {
                console.warn('idle', e.timeRemaining())
                if (this.outlinePass) {
                    // Show/hide helpers as needed
                    for (let obj of this.outlinePass.selectedObjects) {
                        switch (obj.type) {
                            case 'DirectionalLight':
                                invariant(obj instanceof DirectionalLight)
                                const helper = new DirectionalLightHelper(
                                    obj as DirectionalLight,
                                )
                                const shadowCamHelp = new CameraHelper(
                                    obj.shadow.camera,
                                )
                                this.editorScene.add(helper)
                                this.editorScene.add(shadowCamHelp)
                                this.overlayPass!.enabled = true
                                break
                            default:
                        }
                    }
                }
            },
            { timeout: 500 },
        )

        this.outlinePass.enabled = !!this.outlinePass.selectedObjects.length

        this.onUpdate()
    }

    /** Report a click on the canvas to the editor. Invoke like this:
     *  @deprecated
     * 	@example liaison.clickAt(
     *              (event.clientX / window.innerWidth) * 2 - 1,
     *				-(event.clientY / window.innerHeight) * 2 + 1))
     *
     */
    private clickAt(x: number, y: number) {}
}

function arrayWrap<T>(ik: unknown): T[] {
    return Array.isArray(ik) ? ik : [ik]
}

function renderPass(scene: THREE.Scene, camera: Camera) {
    return new RenderPass(scene, camera)
}

function renderOverlayPass(scene: THREE.Scene, camera: Camera) {
    const pass = new RenderPass(scene, camera)
    pass.clear = false
    pass.clearDepth = true
    return pass
}

function outlinePass(scene: THREE.Scene, camera: Camera) {
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
