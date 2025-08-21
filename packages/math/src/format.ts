/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Quaternion } from 'three/src/math/Quaternion.js'
import { Euler } from 'three/src/math/Euler.js'

import * as round from './round.js'
import type { SVec2, SVec3, SQuat } from './geometry.js'
import { radToDeg } from './geometry.js'

export function formatSize2D({ x, y }: Readonly<SVec2>, places = 3) {
    return '[' + [x, y].map((n) => round.toPlaces(n, places)).join(' × ') + ']'
}

export function formatSize3D({ x, y, z }: Readonly<SVec3>, places = 3) {
    return (
        '[' + [x, y, z].map((n) => round.toPlaces(n, places)).join(' × ') + ']'
    )
}

export function formatVec2({ x, y }: Readonly<SVec2>, places = 3) {
    return (
        '(' +
        [round.toPlaces(x, places), round.toPlaces(y, places)].join(', ') +
        ')'
    )
}

export function formatVec3({ x, y, z }: Readonly<SVec3>, places = 3) {
    return (
        '(' + [x, y, z].map((n) => round.toPlaces(n, places)).join(', ') + ')'
    )
}

export function formatRotation(quaternion: Readonly<SQuat>, places = 1) {
    const { x, y, z } = new Euler().setFromQuaternion(
        new Quaternion().copy(quaternion as Quaternion)
    )
    return (
        '{' +
        [x, y, z]
            .map((n) => `${round.toPlaces(radToDeg(n), places)}°`)
            .join(', ') +
        '}'
    )
}
