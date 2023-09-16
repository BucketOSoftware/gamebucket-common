import { Vector2 as TVec2, Vector3 as TVec3 } from 'three'

// This is solely so other code doesn't have to depend on three.js directly
export type ZVec2 = TVec2
export type ZVec3 = TVec3

export const ZVec2 = (x: number, y: number) => new TVec2(x, y) as ZVec2
export const ZVec3 = (x: number, y: number, z: number) =>
    new TVec3(x, y, z) as ZVec3

// For parameter types when we don't care whether the object has a prototype
export type GVec2 = { x: number; y: number }
export type GVec3 = { x: number; y: number; z: number }

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
