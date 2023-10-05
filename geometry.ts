import { Vector2 as TVec2, Vector3 as TVec3, Quaternion, Euler } from 'three'
import { roundToPlaces } from './math'

// This is solely so other code doesn't have to depend on three.js directly
export type ZVec2 = TVec2
export type ZVec3 = TVec3

export const ZVec2 = (x: number, y: number) => new TVec2(x, y) as ZVec2
export const ZVec3 = (x: number, y: number, z: number) =>
    new TVec3(x, y, z) as ZVec3

// For parameter types when we don't care whether the object has a prototype
export type GVec2 = { x: number; y: number }
export type GVec3 = { x: number; y: number; z: number }
export type GQuat = { w: number, x: number; y: number; z: number }

export function degToRad(degrees: number) {
    return (degrees * Math.PI) / 180
}

export function radToDeg(radians: number) {
    return radians * (180 / Math.PI)
}

/** Squashes v3 onto a ground plane, discarding y, and sets v2 to the squashed vector */
export function squashVec3(vec2: GVec2, vec3: GVec3) {
    /*
    if (v3.y) {
        console.warn('Discarding y dimension:', v3.y)
    }
    */
    vec2.x = vec3.x
    vec2.y = vec3.z
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
export function getNormalToRef(input: TVec3, result: TVec3): TVec3 {
    /**
     * Calculates the spherical coordinates of the current vector
     * so saves on memory rather than importing whole Spherical Class
     */
    const radius = input.length();
    let theta = Math.acos(input.y / radius);
    const phi = Math.atan2(input.z, input.x);
    //makes angle 90 degs to current vector
    if (theta > Math.PI / 2) {
        theta -= Math.PI / 2;
    } else {
        theta += Math.PI / 2;
    }

    //Calculates resutant normal vector from spherical coordinate of perpendicular vector
    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(theta) * Math.sin(phi);
    result.set(x, y, z);
    return result;
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



export function formatSize2D({ x, y }: Readonly<GVec2>, places = 3) {
    return '(' + [x, y].map(n => roundToPlaces(n, places)).join(' × ') + ')'
}

export function formatSize3D({ x, y, z }: Readonly<GVec3>, places = 3) {
    return '(' + [x, y, z].map(n => roundToPlaces(n, places)).join(' × ') + ')'
}

export function formatVec3({ x, y, z }: Readonly<GVec3>, places = 3) {
    return '{' + [x, y, z].map(n => roundToPlaces(n, places)).join(', ') + '}'
}

const formatRotationTempQ = new Quaternion()
const formatRotationTempEu = new Euler()
export function formatRotation(rotation: Readonly<GQuat>, places = 1) {
    const { x, y, z } = formatRotationTempEu.setFromQuaternion(
        formatRotationTempQ.copy(rotation as Quaternion)
    )
    return '[' + [x, y, z].map(n => `${roundToPlaces(radToDeg(n), places)}°`).join(', ') + ']'
}

