import * as THREE from 'three'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import type { Pass } from 'three/addons/postprocessing/Pass.js'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { ClearPass } from 'three/addons/postprocessing/ClearPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ZVec2 } from '../geometry'
import type { SerializedNode, SerializedScene, UniqueID } from '../scenebucket'
import invariant from 'tiny-invariant'

type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera

export interface Params {
    // scene: THREE.Scene
    camera: Camera
    getObjectById: (id: UniqueID) => THREE.Object3D
    onUpdate: EditorLiaison['onUpdate'] //  (node?: SerializedNode) => void
}

export default class EditorLiaison {
    static readonly OBJECT_PICKED = 'objectPicked'

    getObjectById: Params['getObjectById']
    onUpdate: (node?: SerializedNode) => void

    // private outliner: OutlinePass
    private editorCamera: Camera
    // private passes: [render: RenderPass, outline: OutlinePass]
    private controls?: MapControls
    private outlinePass?: OutlinePass

    constructor(
        { camera, getObjectById, onUpdate }: Params,
        public readonly domElement: HTMLElement,
    ) {
        this.getObjectById = getObjectById
        this.onUpdate = onUpdate

        this.editorCamera = camera.clone()
    }

    get camera() {
        return this.editorCamera
    }

    // get postProcessingPasses() {
    //     return this.passes
    // }

    /** Get an effects composer that renders the editor's graphics. Tied to a particular scene. */
    getRenderer(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        this.outlinePass = outlinePass(scene, this.editorCamera)

        const compo = new EffectComposer(renderer)
        compo.passes = [
            new ClearPass(),
            renderPass(scene, this.editorCamera),
            this.outlinePass,
            new OutputPass(),
        ]

        return compo
    }

    mapControls(enabled: boolean, renderer?: THREE.WebGLRenderer) {
        if (enabled) {
            this.controls ??= new MapControls(
                this.editorCamera,
                renderer!.domElement,
            )
            this.controls.enabled = true
            // TODO: requires a loop
            // controls.enableDamping = true
        } else {
            if (this.controls) {
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

function outlinePass(scene: THREE.Scene, camera: Camera) {
    const brite = 1 / 50
    const outliner = new OutlinePass(
        ZVec2(1, 1),
        scene,
        camera,
        // this.editorCamera,
    )
    outliner.edgeStrength = 12
    outliner.edgeGlow = 2
    outliner.edgeThickness = 3
    outliner.visibleEdgeColor.set(0.1 * brite, 0.5 * brite, 2.5 * brite)
    outliner.hiddenEdgeColor.set(1 * brite, 1 * brite, 2.25 * brite)
    outliner.pulsePeriod = 1.4

    return outliner
}
