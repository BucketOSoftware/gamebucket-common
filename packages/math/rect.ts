/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import invariant from 'tiny-invariant'

import { rangeSide, clamp as scalarClamp } from './index.js'
import { type SVec } from './geometry'

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A 2D size, or a rectangle whose minimum coordinate is assumed to be [0, 0].
 */
export interface Size {
    w: number
    h: number
}

/**
 * An axis-aligned rectangle. `x` and `y` represent the minium coordinate in the
 * rectangle, and `w` and `h` are the size.
 */
export interface Rect extends Size, SVec<2> {
    x: number
    y: number
    w: number
    h: number
}

// ─── Creating Rectangles ─────────────────────────────────────────────────────

/** Construct a rectangle with some argument checking */
export function build(
    x: number,
    y: number,
    width: number,
    height: number
): Rect {
    invariant(width >= 0, 'Width must be 0 or greater')
    invariant(height >= 0, 'Height must be 0 or greater')
    return { x, y, w: width, h: height }
}

/**
 * Creates a rectangle that includes both points
 * @param [out] If specified, the given rect will be modified instead of creating a new one.
 */
export function fromCorners(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    out: Rect = { x: 0, y: 0, w: 0, h: 0 }
): Rect {
    out.x = Math.min(x1, x2)
    out.y = Math.min(y1, y2)
    out.w = Math.abs(x1 - x2)
    out.h = Math.abs(y1 - y2)

    return out
}

const getx = (v: SVec<2>) => v.x
const gety = (v: SVec<2>) => v.y

/** Create a rectangle that includes all the given points */
export function fromPoints(...points: Readonly<SVec<2>>[]) {
    const x = points.map(getx)
    const y = points.map(gety)

    const x_min = Math.min(...x)
    const x_max = Math.max(...x)
    const y_min = Math.min(...y)
    const y_max = Math.max(...y)

    return { x: x_min, y: y_min, width: x_max - x_min, height: y_max - y_min }
}

// ─── Measurement ─────────────────────────────────────────────────────────────

/** Calculate the area of a rectangle */
export const area = (rect: Size) => rect.w * rect.h

/** Return the longer of the rectangle's dimensions */
export const longerSide = (rect: Size) => Math.max(rect.w, rect.h)

// ─── Predicates ──────────────────────────────────────────────────────────────

/**
 * Determine whether the given `point` is within `rect`
 */
export const contains = (rect: Readonly<Rect>, point: Readonly<SVec<2>>) =>
    point.x >= rect.x &&
    point.x < rect.x + rect.w &&
    point.y >= rect.y &&
    point.y < rect.y + rect.h

/** Determine whether the given rectangles overlap */
export const intersects = (a: Readonly<Rect>, b: Readonly<Rect>) =>
    !(
        a.x + a.w - 1 < b.x ||
        b.x + b.w - 1 < a.x ||
        a.y + a.h - 1 < b.y ||
        b.y + b.h - 1 < a.y
    )

/**
 * Determine which area the given `point` lies in, relative to `rect`.
 * @param [out] If provided, the result will be stored in this vector.
 * @returns A 2D vector. If the point is within the rectangle, this will be `{ x: 0, y: 0 }`. Otherwise, the x and y components will be -1 if they are on the min side and 1 if they are on the max side.
 */
export function side(
    rect: Readonly<Rect>,
    point: Readonly<SVec<2>>,
    out: SVec<2> = { x: 0, y: 0 }
) {
    out.x = rangeSide(rect.x, rect.x + rect.w, point.x)
    out.y = rangeSide(rect.y, rect.y + rect.h, point.y)
    return out
}

/** If `p` is outside of `r`, wrap it around to the other side. Mutates the point */
export function wrap(rect: Readonly<Rect>, point: SVec<2>) {
    let { x: rx, y: ry, w: rw, h: rh } = rect

    point.x -= rx
    while (point.x < 0) point.x += rw
    point.x %= rw
    point.x += rx

    point.y -= ry
    while (point.y < 0) point.y += rh
    point.y %= rh
    point.y += ry
}

/** Clamp the given point to fit within the rect. Mutates the point */
export function clamp(r: Readonly<Rect>, p: SVec<2>) {
    p.x = scalarClamp(p.x, r.x, r.x + r.w - 1)
    p.y = scalarClamp(p.y, r.y, r.y + r.h - 1)

    return p
}

/** Size up a rectangle to encompass the point, if necessary */
export function expand(r: Rect, { x, y }: Readonly<SVec<2>>) {
    r.x = Math.min(r.x, x)
    r.y = Math.min(r.y, y)
    r.w = Math.max(r.w, x - r.x)
    r.h = Math.max(r.h, y - r.y)

    return r
}
