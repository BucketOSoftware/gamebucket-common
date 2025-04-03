/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Object3D } from 'three/src/core/Object3D.js'
import { Vector2 } from 'three/src/math/Vector2.js'
import { Vector3 } from 'three/src/math/Vector3.js'

import { by as roundBy } from './round.js'

/**
 * Struct-style vector: an object with x/y/z fields, compatible with Three.js'
 * Vector2Like/Vector3Like
 */
export type SVec<D extends 2 | 3> = D extends 2 ? SVec2 : SVec3

export type SVec2 = { x: number; y: number }
export type SVec3 = { x: number; y: number; z: number }
export type SQuat = { w: number; x: number; y: number; z: number }

/**
 * Tuple vector:
 */
export type TVec<D extends 2 | 3> = D extends 2
    ? [x: number, y: number]
    : [x: number, y: number, z: number]

export function toVector2(v: SVec2): Vector2 {
    return new Vector2(v.x, v.y)
}

export function toTVec3(v: SVec3): Vector3 {
    return new Vector3(v.x, v.y, v.z)
}

export function degToRad(degrees: number) {
    return (degrees * Math.PI) / 180
}

export function radToDeg(radians: number) {
    return radians * (180 / Math.PI)
}

export function floorVec2(vec2: SVec2): SVec2 {
    vec2.x = Math.floor(vec2.x)
    vec2.y = Math.floor(vec2.y)

    return vec2
}

export function roundVec2(v: SVec2, increments = 1, out = v): SVec2 {
    out.x = roundBy(v.x, increments)
    out.y = roundBy(v.y, increments)

    return out
}

/** Squashes `vec3` onto the XZ (ground) plane, discarding y, and sets `out`
 * to the squashed vector */
export function squashVec3(vec3: SVec<3>, out: SVec<2> = { x: 0, y: 0 }) {
    out.x = vec3.x
    out.y = vec3.z

    return out
}

/**
 * @param a An object
 * @param b Another object
 * @returns The position of `a` in `b`'s local space
 */
export function relativePosition(a: Object3D, b: Object3D, output: Vector3) {
    return b.worldToLocal(a.getWorldPosition(output))
}
