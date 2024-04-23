import {
    Euler,
    Object3D,
    Quaternion,
    Vector2 as TVec2,
    Vector3 as TVec3,
} from 'three'
export { Matrix3 as ZMatrix3 } from 'three'

import { roundBy, roundToPlaces } from './math'

// This is solely so other code doesn't have to depend on three.js directly
export type ZVec2 = TVec2
export type ZVec3 = TVec3

export const ZVec2 = (x: number, y: number) => new TVec2(x, y) as ZVec2
export const ZVec3 = (x: number, y: number, z: number) =>
    new TVec3(x, y, z) as ZVec3

// For parameter types when we don't care whether the object has a prototype
/** A generic 2D vector */
export type GVec2 = { x: number; y: number }
/** A generic 3D vector */
export type GVec3 = { x: number; y: number; z: number }
/** A generic quaternion */
export type GQuat = { w: number; x: number; y: number; z: number }

export const GVec2 = (x: number, y: number) => ({ x, y })
export const GVec3 = (x: number, y: number, z: number) => ({ x, y, z })

export function toTVec2(v: GVec2): TVec2 {
    return new TVec2(v.x, v.y)
}

export function toTVec3(v: GVec3): TVec3 {
    return new TVec3(v.x, v.y, v.z)
}

export function toGVec3({ x, y, z }: TVec3): GVec3 {
    return { x, y, z }
}

export function degToRad(degrees: number) {
    return (degrees * Math.PI) / 180
}

export function radToDeg(radians: number) {
    return radians * (180 / Math.PI)
}

export function floorVec2(vec2: GVec2): GVec2 {
    vec2.x = Math.floor(vec2.x)
    vec2.y = Math.floor(vec2.y)

    return vec2
}

export function roundVec2(vec2: GVec2, increments = 1): GVec2 {
    vec2.x = roundBy(vec2.x, increments)
    vec2.y = roundBy(vec2.y, increments)

    return vec2
}

/** Squashes `vec3` onto the XZ (ground) plane, discarding y, and sets `vec2`
 * to the squashed vector */
export function squashVec3(vec2: GVec2, vec3: GVec3) {
    vec2.x = vec3.x
    vec2.y = vec3.z

    return vec2
}

/**
 * From babylon.js:
 *
 * Creates a vector normal (perpendicular) to the current Vector3 and stores the result in the given vector
 * Out of the infinite possibilities the normal chosen is the one formed by rotating the current vector
 * 90 degrees about an axis which lies perpendicular to the current vector
 * and its projection on the xz plane. In the case of a current vector in the xz plane
 * the normal is calculated to be along the y axis.
 * Example Playground https://playground.babylonjs.com/#R1F8YU#230
 * Example Playground https://playground.babylonjs.com/#R1F8YU#231
 * @param result defines the Vector3 object where to store the resultant normal
 * returns the result
 */
export function getNormalToRef(input: TVec3, result: GVec3): GVec3 {
    /**
     * Calculates the spherical coordinates of the current vector
     * so saves on memory rather than importing whole Spherical Class
     */
    const radius = input.length()
    let theta = Math.acos(input.y / radius)
    const phi = Math.atan2(input.z, input.x)
    //makes angle 90 degs to current vector
    if (theta > Math.PI / 2) {
        theta -= Math.PI / 2
    } else {
        theta += Math.PI / 2
    }

    //Calculates resutant normal vector from spherical coordinate of perpendicular vector
    result.x = radius * Math.sin(theta) * Math.cos(phi)
    result.y = radius * Math.cos(theta)
    result.z = radius * Math.sin(theta) * Math.sin(phi)
    return result
}

/** Rounds the direction of a 2D vector. Mutates the vector. Doesn't require a unit vector but always produces one. */
export function roundDirection(dir: GVec2, increments: number): void {
    if (!(dir.x || dir.y)) {
        // zero length vector has no direction
        return
    }

    const r_inc = (Math.PI * 2) / increments

    // TODO: this reduces code size SLIGHTLY for a possible performance penalty. Figure out if we care
    const r_angle = TVec2.prototype.angle.call(dir)
    const r_quantized_angle = Math.round(r_angle / r_inc) * r_inc
    const c = Math.cos(r_quantized_angle),
        s = Math.sin(r_quantized_angle)

    dir.x = c
    dir.y = s
}

/**
 * @param a An object
 * @param b Another object
 * @returns The position of `a` in `b`'s local space
 */
export function relativePosition(a: Object3D, b: Object3D, output: TVec3) {
    return b.worldToLocal(a.getWorldPosition(output))
}

export function formatSize2D({ x, y }: Readonly<GVec2>, places = 3) {
    return '[' + [x, y].map((n) => roundToPlaces(n, places)).join(' × ') + ']'
}

export function formatSize3D({ x, y, z }: Readonly<GVec3>, places = 3) {
    return (
        '[' + [x, y, z].map((n) => roundToPlaces(n, places)).join(' × ') + ']'
    )
}

export function formatVec3({ x, y, z }: Readonly<GVec3>, places = 3) {
    return '(' + [x, y, z].map((n) => roundToPlaces(n, places)).join(', ') + ')'
}

const formatRotationTempQ = new Quaternion()
const formatRotationTempEu = new Euler()
export function formatRotation(quaternion: Readonly<GQuat>, places = 1) {
    const { x, y, z } = formatRotationTempEu.setFromQuaternion(
        formatRotationTempQ.copy(quaternion as Quaternion),
    )
    return (
        '{' +
        [x, y, z]
            .map((n) => `${roundToPlaces(radToDeg(n), places)}°`)
            .join(', ') +
        '}'
    )
}
