import invariant from 'tiny-invariant'
import { clamp, lerp, inverseLerp } from 'three/src/math/MathUtils.js'
export { clamp, lerp, inverseLerp } from 'three/src/math/MathUtils.js'
export * as ease from 'd3-ease'

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

export function roundBy(i: number, increments: number) {
    return Math.round(i / increments) * increments
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

/** Apply gain to a number and clip it to the range [-1, 1] */
export function hardclip(n: number, gain: number) {
    invariant(n >= -1 && n <= 1, 'Expected a number between -1 and 1')
    return clamp(n * gain, -1, 1)
}

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

/**
 * @todo Don't know if this is the right name for this
 * @param value A number in the range of [0, 1] inclusive
 * @param easing An easing function to apply to the input
 * @returns `value` mapped to the range [-1, 1] inclusive
 */
export function mapUnitToNormal(value: number, easing?: typeof identity) {
    return mapRange(value, 0, 1, -1, 1, easing)
}

/** Exponential moving average */
export function ema(prev: number, current: number, smoothing: number) {
    invariant(
        smoothing >= 0 && smoothing <= 1,
        'Smoothing factor must be between 0 and 1',
    )

    return smoothing * current + (1 - smoothing) * prev
}

export class SmoothValue {
    private currentAverage: number
    constructor(
        initial: number,
        public smoothing: number,
    ) {
        invariant(
            smoothing >= 0 && smoothing <= 1,
            'Smoothing factor must be between 0 and 1',
        )
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
    return lerp(x, y, (hardclip(oscillate(time_s, hz), gain) + 1) / 2)
}

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

/** Turn on bit number `item` (counting from the right) in `accumulator`.
 * Works with {@link Array.prototype.reduce}
 */
export function setBit(accumulator: number, item: number) {
    return accumulator | (1 << item)
}

// https://stackoverflow.com/a/43053803/72141
type MapCartesian<T extends any[][]> = {
    [P in keyof T]: T[P] extends Array<infer U> ? U : never
}

/** Given multiple arrays, return an array with every permutation of the individual array elements */
export const cartesianProduct = <T extends any[][]>(
    ...collections: T
): MapCartesian<T>[] =>
    collections.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())))
