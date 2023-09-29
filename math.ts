import ow, { ObjectPredicate } from 'ow'

import { ZVec2 } from './geometry'

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

export function isHalf(n: number) {
    return ((n + 0.5) | 0) === n + 0.5
}

/** Sine-waves between x and y over time
 * @param time_s Monotonically increasing time, in seconds
 * @param hz Cycles per second
 */
export function oscillate(x: number, y: number, time_s: number, hz: number = 1) {
    // Apparently this works out to the same thing! I don't understand why
    // const t = Math.cos(Math.PI * time_s * hz) * Math.sin(Math.PI * time_s * hz) + 0.5
    return ((y - x) * ((Math.sin(time_s * hz * 2 * Math.PI) + 1) / 2)) + x
}


const vr_a = 12.9898,
    vr_b = 78.233,
    vr_c = 43758.5453
const vrand_vec1 = ZVec2(0, 0)
const vrand_vec2 = ZVec2(vr_a, vr_b)

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
