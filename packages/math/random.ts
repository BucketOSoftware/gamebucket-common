/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/** Returns a number between min and max, inclusive */
export function inRange(min: number, max: number, rand = Math.random) {
    return min + rand() * (max - min)
}

/** Returns an integer between min and max, inclusive */
export function int(min: number, max: number, rand = Math.random) {
    return (min + rand() * (max - min)) | 0
}

export function choice<T>(choices: ArrayLike<T>, rand = Math.random): T {
    // is this a good method? who knows
    return choices[(rand() * choices.length) | 0]
}

/**
 * Create a random number generator from a 4-number seed.
 * Via {@link https://stackoverflow.com/a/47593316}
 */
export function sfc32(a: number, b: number, c: number, d: number) {
    return function () {
        a |= 0
        b |= 0
        c |= 0
        d |= 0

        let t = (((a + b) | 0) + d) | 0
        d = (d + 1) | 0
        a = b ^ (b >>> 9)
        b = (c + (c << 3)) | 0
        c = (c << 21) | (c >>> 11)
        c = (c + t) | 0
        return (t >>> 0) / 4294967296
    }
}

/**
 * Create a 128-bit seed from a string.
 * Via {@link https://stackoverflow.com/a/47593316}
 * @remarks
 * Side note: Only designed & tested for seed generation, may be suboptimal as a
 * general 128-bit hash.
 */
export function cyrb128(str: string): [number, number, number, number] {
    let h1 = 1779033703,
        h2 = 3144134277,
        h3 = 1013904242,
        h4 = 2773480762

    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i)
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
    }

    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
    ;(h1 ^= h2 ^ h3 ^ h4), (h2 ^= h1), (h3 ^= h1), (h4 ^= h1)
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}
