/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { SVec } from './geometry'
import * as round from './round.js'

export function by(n: number, increments: number) {
    return Math.round(n / increments) * increments
}

export function toPlaces(n: number, places: number) {
    places = 10 ** places
    return Math.round(n * places) / places
}

export function vec2(v: SVec<2>, increments = 1, out = v): SVec<2> {
    out.x = round.by(v.x, increments)
    out.y = round.by(v.y, increments)

    return out
}

export function vec3(v: SVec<3>, increments = 1, out = v): SVec<3> {
    out.x = round.by(v.x, increments)
    out.y = round.by(v.y, increments)
    out.z = round.by(v.z, increments)

    return out
}
