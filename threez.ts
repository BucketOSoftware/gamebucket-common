import {
    ACESFilmicToneMapping,
    Camera,
    Cylindrical,
    DirectionalLight,
    OrthographicCamera,
    PCFShadowMap,
    PCFSoftShadowMap,
    PerspectiveCamera,
    SRGBColorSpace,
    WebGLRenderer,
} from 'three'
import invariant from 'tiny-invariant'

import { GVec2 } from './geometry'

export const SHADOW_QUALITY = {
    Abysmal: 0,
    Low: 1,
    Medium: 2,
    High: 3,
} as const

export function setupRenderer(
    canvas: HTMLCanvasElement | undefined,
    shadowQuality: number = SHADOW_QUALITY.Low,
) {
    const gl = new WebGLRenderer({
        canvas: canvas,
        antialias: true,
        // powerPreference: "low-power",
    })

    gl.setPixelRatio(window.devicePixelRatio)
    gl.outputColorSpace = SRGBColorSpace
    gl.shadowMap.enabled = true
    if (shadowQuality <= SHADOW_QUALITY.Low) {
        gl.shadowMap.type = PCFSoftShadowMap
    } else {
        gl.shadowMap.type = PCFShadowMap
    }

    gl.autoClear = false
    gl.toneMapping = ACESFilmicToneMapping
    console.info('GPU capabilities:', gl.capabilities)

    gl.setSize(window.innerWidth, window.innerHeight)

    return gl
}

export function setShadowQuality(
    light: DirectionalLight,
    quality: number,
    near = 50,
    far = 1000,
) {
    const w = 20 + quality * 5
    const h = w
    light.castShadow = true
    light.shadow.camera.near = near
    light.shadow.camera.far = far
    light.shadow.camera.right = w
    light.shadow.camera.left = -w
    light.shadow.camera.top = h
    light.shadow.camera.bottom = -h

    light.shadow.mapSize.width = 2 ** (quality + 10)
    light.shadow.mapSize.height = 2 ** (quality + 10)
}

export function fixShadows(
    shadowLight: DirectionalLight,
    camera: PerspectiveCamera,
    sunAngle: Cylindrical,
) {
    // TODO: polar coords? We really care about:
    // angle around
    // angle up
    // distance
    shadowLight.position.setFromCylindrical(sunAngle)
    shadowLight.position.add(camera.position)
    shadowLight.target.position.copy(camera.position)

    // const lightDistToBike = shadowLight.position.distanceTo(targetPosition)
    // shadowLight.shadow.camera.near = lightDistToBike * 0.75 //lightDistToBike / 100
    // shadowLight.shadow.camera.far = lightDistToBike * 1.25
    shadowLight.shadow.camera.updateProjectionMatrix()
}

export function fillScreen(
    gl: WebGLRenderer,
    camera: OrthographicCamera | PerspectiveCamera,
    options: {
        frustumSize?: number
        fov?: number
        aspect?: number
    },
) {
    // TODO: Maybe transition between 16:9 and 4:3 ratios depending on which one we're closer to?
    // This assumes we're not actually filling the screen, I guess? what was the idea here
    if (camera instanceof OrthographicCamera) {
        // TODO: if aspect is undefined, fill the screen
        const { frustumSize, aspect } = options
        // ow(frustumSize, ow.number)
        // ow(aspect, ow.number)
        invariant(frustumSize)
        invariant(aspect)

        camera.left = (-frustumSize * aspect) / 2
        camera.right = (frustumSize * aspect) / 2
        camera.top = frustumSize / 2
        camera.bottom = -frustumSize / 2
    } else {
        // TODO: support aspect
        gl.setSize(window.innerWidth, window.innerHeight)
        camera.aspect = gl.domElement.clientWidth / gl.domElement.clientHeight
    }

    camera.updateProjectionMatrix()
}

/**
 * @returns True if `obj` and all its ancestors are visible
 */
export function objectWillBeRendered(obj: THREE.Object3D) {
    let walker: THREE.Object3D | null = obj
    while (walker) {
        if (!walker.visible) {
            return false
        }

        walker = walker.parent
    }
    return true
}

/** Ways the camera could be positioned */
type CameraMode =
    // Whatever the normal game behavior would be
    | 'game'
    // Move at will
    | 'fly'
    // Orbit the target (prob. doesn't work with mouselook)
    | 'orbit'

/** Things the camera could be looking at */
type CameraTarget =
    // Whatever the normal game behavior would be
    | 'game'
    // Track a 3D object
    | 'object'
    // Track a cursor/point in 3D space
    | 'point'
    // Ensure multiple points are visible on screen, somehow?
    | 'area'
    // Track a spherical coordinate relative to the camera
    | 'mouselook'

export class Cinematographer {
    mode: CameraMode = 'game'
    target: CameraTarget = 'game'

    constructor(public camera: Camera) {}
}

/**
 * @param event A mouse or pointer event targeted on a canvas
 * @returns A 2D vector ranging from -1, -1 at the bottom left to 1, 1 at the top right
 */
export function normalizedCanvasPosition(
    event: MouseEvent | PointerEvent,
): GVec2 {
    let canvas = event.target as HTMLCanvasElement
    const { top, left, width, height } = canvas.getBoundingClientRect()
    let x = ((event.clientX - left) * canvas.width) / width
    let y = ((event.clientY - top) * canvas.height) / height

    x = (x / canvas.width) * 2 - 1
    y = (y / canvas.height) * -2 + 1

    return { x, y }
}
