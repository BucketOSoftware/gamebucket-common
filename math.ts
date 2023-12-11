import ow, { ObjectPredicate } from 'ow'
import { MathUtils } from 'three'

export const isGVec2: ObjectPredicate = ow.object.exactShape({
    x: ow.number,
    y: ow.number,
})

/** Returns a number between min and max, inclusive */
export function randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min)
}

export function randomIntBetween(min: number, max: number) {
    return (min + Math.random() * (max - min)) | 0
}

export function randomChoice<T>(a: ArrayLike<T>): T {
    // is this a good method? who knows
    return a[(Math.random() * a.length) | 0]
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

export const clamp = MathUtils.clamp

const identity = (n: number) => n

export function mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
    easing = identity,
) {
    return (
        easing(
            // convert value into 0..1
            clamp((value - inMin) / (inMax - inMin), 0, 1),
        ) * // convert it into outMin..outMax
            (outMax - outMin) +
        outMin
    )
}

/** Don't know if this is the right name for this */
export function mapUnitToNormal(value: number, easing?: typeof identity) {
    return mapRange(value, 0, 1, -1, 1, easing)
}

/** Exponential moving average */
export function ema(prev: number, current: number, smoothing: number) {
    ow(smoothing, ow.number.inRange(0, 1))

    return smoothing * current + (1 - smoothing) * prev
}

export class SmoothValue {
    private currentAverage: number
    constructor(
        initial: number,
        public smoothing: number,
    ) {
        ow(smoothing, ow.number.inRange(0, 1))
        this.currentAverage = initial
    }

    get average() {
        return this.currentAverage
    }
    update(newValue: number) {
        this.currentAverage =
            this.smoothing * newValue +
            (1 - this.smoothing) * this.currentAverage
        return this.currentAverage
    }
}

export function oscillerp(
    x: number,
    y: number,
    time_s: number,
    hz = 1,
    gain = 1,
    softClip = false,
) {
    // TODO: softclip
    return MathUtils.lerp(x, y, (hardclip(oscillate(time_s, hz), gain) + 1) / 2)
}

export const lerp = MathUtils.lerp
export const inverseLerp = MathUtils.inverseLerp

const vr_a = 12.9898,
    vr_b = 78.233,
    vr_c = 43758.5453

/**
 * Apparently a classic algorithm. Given two numbers, return a unique hash, and quickly. Limitations/caveats: ??? Overflow?
 * @param x Input 1
 * @param y Input 2
 * @returns A hash based on the inputs
 */
export function vhash(x: number, y: number) {
    const dt = x * vr_a + y * vr_b
    const sn = dt % Math.PI
    const result = Math.sin(sn) * vr_c
    return result - (result | 0)
}

/** Turn on bit number `item` (counting from the right) in `accumulator`. Works
 * with {@link Array.prototype.reduce}
 */
export function setBit(accumulator: number, item: number) {
    return accumulator | (1 << item)
}
