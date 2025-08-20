/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Object3D } from 'three/src/core/Object3D.js'
import { Vector2 } from 'three/src/math/Vector2.js'
import { Vector3 } from 'three/src/math/Vector3.js'

/**
 * Struct-style vector: an object with x/y/z fields, compatible with Three.js'
 * Vector2Like/Vector3Like
 */
export type SVec<D extends 2 | 3> = D extends 2 ? SVec2 : SVec3

export type SVec2 = { x: number; y: number }
export type SVec3 = { x: number; y: number; z: number }
export type SQuat = { w: number; x: number; y: number; z: number }

/**
 * Tuple vector: an array with 2 or 3 elements, as used by gl-matrix
 */
export type TVec<D extends 2 | 3> = D extends 2
    ? [x: number, y: number]
    : [x: number, y: number, z: number]

/**
 * Converts a struct-style vector to a Three.js Vector2 object
 */
export function toVector2(v: SVec2): Vector2 {
    return new Vector2(v.x, v.y)
}

/**
 * Converts a struct-style vector to a Three.js Vector3 object
 */
export function toVector3(v: SVec3): Vector3 {
    return new Vector3(v.x, v.y, v.z)
}

/**
 * Converts degrees to radians
 */
export function degToRad(degrees: number) {
    return (degrees * Math.PI) / 180
}

/**
 * Converts radians to degrees
 */
export function radToDeg(radians: number) {
    return radians * (180 / Math.PI)
}

export function floorVec2(vec2: SVec2): SVec2 {
    vec2.x = Math.floor(vec2.x)
    vec2.y = Math.floor(vec2.y)

    return vec2
}

/** Squashes `vec3` onto the XZ (ground) plane, discarding y, and sets `out`
 * to the squashed vector */
export function squashVec3(vec3: SVec<3>, out: SVec<2> = { x: 0, y: 0 }) {
    out.x = vec3.x
    out.y = vec3.z

    return out
}
