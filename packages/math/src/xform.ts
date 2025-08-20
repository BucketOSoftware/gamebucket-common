/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import invariant from 'tiny-invariant'

import { clamp, lerp } from './index'

const identity = (n: number) => n

// ─── Transforming Numbers ────────────────────────────────────────────────────

/**
 * Takes a value assumed to be between `inMin` and `inMax`, normalizes it to
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
 * Maps a value in the unit range of [0, 1] inclusive to a new range.
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
 * Map a value in the range [min..max] into the range [0..1], both inclusive.
 * Does not bounds check or clamp.
 */

export function normalize(value: number, min: number, max: number) {
    return (value - min) / (max - min)
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
/**
 * Smoothly interpolate a number from `x` to `y` in  a spring-like manner using
 * a delta time to maintain frame rate independent movement. Similar to the
 * version in Three.js' MathUtils but uses a smoothing value instead of lambda.
 * For details, see {@link http://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/ | Frame rate independent damping using lerp}.
 *
 * @param x The current value.
 * @param y The target value.
 * @param smoothing A value between 0 and 1 that represents how far from `x` to `y` the value will have changed after 1 second. 0 will result in no change and return `x`, and 1 will immediately return `y`.
 * @param dt Delta time in seconds.
 * @return The interpolated value.
 */
export function damp(x: number, y: number, smoothing: number, dt: number = 1) {
    return lerp(x, y, 1 - (1 - smoothing) ** dt)
}
