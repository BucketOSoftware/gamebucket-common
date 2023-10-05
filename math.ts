import ow, { ObjectPredicate } from 'ow'
import { MathUtils, Vector2 as TVec2 } from 'three'

export const isGVec2: ObjectPredicate = ow.object.exactShape({
    x: ow.number,
    y: ow.number,
})

/** Returns a number between min and max, inclusive */
export function randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min)
}

export function roundTo(i: number, places: number) {
    return Math.round(i * places) / places
}

export function roundToPlaces(i: number, places: number) {
    places = 10 ** places
    return Math.round(i * places) / places
}

export function isHalf(n: number) {
    return ((n + 0.5) | 0) === n + 0.5
}

/** Sine-waves between -1 and 1 over time
 * @param time_s Monotonically increasing time, in seconds
 * @param hz Cycles per second
 */
export function oscillate(time_s: number, hz = 1) {
    return Math.sin(time_s * hz * 2 * Math.PI)
}

export function hardclip(n: number, gain: number) {
    ow(n, ow.number.inRange(-1, 1))
    return MathUtils.clamp(n * gain, -1, 1)
}

export function ema(prev: number, current: number, smoothing: number) {
    // const P =
    ow(smoothing, ow.number.inRange(0, 1))

    return (smoothing * current) + (1 - smoothing) * prev
    return prev + (0.1 * (current - prev))
}

export class SmoothValue {
    private currentAverage: number
    constructor(initial: number, public smoothing: number) {

        ow(smoothing, ow.number.inRange(0, 1))
        this.currentAverage = initial
    }

    get average() {
        return this.currentAverage
    }
    update(newValue: number) {
        this.currentAverage = (this.smoothing * newValue) + (1 - this.smoothing) * this.currentAverage
        return this.currentAverage
    }
}

export function oscillerp(x: number, y: number, time_s: number, hz = 1, gain = 1, softClip = false) {
    // TODO: softclip
    return MathUtils.lerp(x, y, (hardclip(oscillate(time_s, hz), gain) + 1) / 2)
}

export const lerp = MathUtils.lerp
export const inverseLerp = MathUtils.inverseLerp

const vr_a = 12.9898,
    vr_b = 78.233,
    vr_c = 43758.5453
const vrand_vec1 = new TVec2(0, 0)
const vrand_vec2 = new TVec2(vr_a, vr_b)

/**
 * Apparently a classic algorithm. Given two numbers, return a unique hash, and quickly. Limitations/caveats: ??? Overflow?
 * @param x Input 1
 * @param y Input 2
 * @returns A hash based on the inputs
 */
export function vhash(x: number, y: number) {
    vrand_vec1.set(x, y)

    // TODO: unroll this. we can do a dot product by hand, dammit
    const dt = vrand_vec1.dot(vrand_vec2)
    const sn = dt % Math.PI

    const result = Math.sin(sn) * vr_c
    return result - (result | 0)
}
