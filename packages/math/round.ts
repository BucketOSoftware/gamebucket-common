/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function by(n: number, increments: number) {
    return Math.round(n / increments) * increments
}

export function toPlaces(n: number, places: number) {
    places = 10 ** places
    return Math.round(n * places) / places
}
