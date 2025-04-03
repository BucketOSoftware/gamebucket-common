/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import invariant from 'tiny-invariant'
import { clamp, lerp } from 'three/src/math/MathUtils.js'

export function isHalf(n: number) {
    return ((n + 0.5) | 0) === n + 0.5
}

/** Determine whether the value is in the unit range [0..1] */
export function isUnit(n: number) {
    return n >= 0 && n <= 1
}

/**
 * Determine which side of the semi-open range `[min, max)` the `value is on.
 * @returns -1 if `value` is less than `min`, 1 if `value` value is greater than or equal to `max`, or 0 if `value is in the range
 */
export function rangeSide(min: number, max: number, value: number) {
    if (value < min) {
        return -1
    } else if (value >= max) {
        return 1
    } else {
        return 0
    }
}

const identity = (n: number) => n

// ─── Transforming Numbers ────────────────────────────────────────────────────

/**
 * Takes a value assumes to be between `inMin` and `inMax`, normalizes it to
 * 0..1, clamps it, optionally applies an `easing` function to the normalized
 * value, and remaps it to the range `outMin` and `outMax`
 */
export function remap(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
    easing = identity
) {
    // Normalize to [0..1]
    let v = clamp(normalize(value, inMin, inMax), 0, 1)
    // Apply desired easing
    v = easing(v)
    // Map to desired range
    v *= outMax - outMin
    v += outMin
    return v
}

/**
 * Map a value in the range [min..max] into the range [0..1], both inclusive.
 * Does not bounds check or clamp.
 */
export function normalize(value: number, min: number, max: number) {
    return (value - min) / (max - min)
}

/**
 * Maps a value in the
 * @param value A number in the range of [0, 1] inclusive
 * @param easing An easing function to apply to the input
 */
export function remapUnit(
    value: number,
    outMin: number,
    outMax: number,
    easing?: (n: number) => number
) {
    return remap(value, 0, 1, outMin, outMax, easing)
}

/**
 * Sine-waves between -1 and 1 over time
 * @param time Monotonically increasing time
 * @param rate Cycles per unit of time
 */
export function oscillate(time: number, rate = 1) {
    return Math.sin(time * rate * 2 * Math.PI)
}

/** Apply gain to a number and clip it to the range [-1, 1] */
export function hardclip(n: number, gain: number) {
    invariant(n >= -1 && n <= 1, 'Expected a number between -1 and 1')
    return clamp(n * gain, -1, 1)
}

// /**
//  * Exponential moving average: get the weighted average of two numbers. If this
//  * is applied at a regular interval, the return value will transition from `a`
//  * to `b` at a rate determined by `smoothing`.
//  * @param smoothing A value in the interval [0..1] that controls the weighting. 1 will result in an instant change
//  */
// export function ema(a: number, b: number, smoothing: number) {
//     /*
//     invariant(
//         smoothing >= 0 && smoothing <= 1,
//         'Smoothing factor must be between 0 and 1'
//     )
//         */
//     //    lerp

//     // return smoothing * current + (1 - smoothing) * prev
//     return lerp(a, b, smoothing)
// }

export interface SmoothValue {
    /** The starting or current value. */
    current: number

    /**
     * The smoothing factor, between 0 and 1 inclusive. A value of 1 will jump
     * immediately to the next value, whereas 0 will never change from
     * `current`. Values in between will transition to the next value gradually,
     * slowing down as it approaches.
     */
    smoothing: number
}

/**
 * Perform an exponential moving average. Calling this repeatedly on the same
 * {@link SmoothValue} object will gradually transition from `sv.current` to
 * `next` at a rate determined by `sv.smoothing`.
 */
export function smoothValue(sv: SmoothValue, next: number) {
    return (sv.current = lerp(sv.current, next, sv.smoothing))
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
