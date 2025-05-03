/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/** Determine whether the value is exactly halfway between integers */
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

const vr_a = 12.9898,
    vr_b = 78.233,
    vr_c = 43758.5453

/**
 * Apparently a classic algorithm. Given two numbers, return a unique hash, and quickly.
 *
 * @remarks
 * This is not tested for
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
