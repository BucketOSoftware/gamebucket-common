import { clamp as scalarClamp } from './math'
import { GVec2, ZMatrix3, ZVec2 } from './geometry'
import invariant from 'tiny-invariant'

export interface Size {
    width: number
    height: number
}

/** An axis-aligned rectangle. `x` and `y` represent the minium coordinate in the rectangle, and `width` and `height` are the size/shape */
export type Rect = {
    x: number
    y: number
    width: number
    height: number
}

export type OptionalArea = {
    x: number
    y: number
    width?: number
    height?: number
}

export function build(
    x: number,
    y: number,
    width: number,
    height: number,
): Rect {
    invariant(width >= 0, 'Width must be 0 or greater')
    invariant(height >= 0, 'Height must be 0 or greater')
    return { x, y, width, height }
}

export function fromCorners(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    out: Rect = { x: 0, y: 0, width: 0, height: 0 },
): Rect {
    out.x = Math.min(x1, x2)
    out.y = Math.min(y1, y2)
    out.width = Math.abs(x1 - x2)
    out.height = Math.abs(y1 - y2)

    return out
}

export function applyMatrix3(
    matrix: ZMatrix3,
    rect: Rect,
    out: Rect = build(0, 0, 0, 0),
): Rect {
    // TODO: warn if the matrix has a rotation element?
    const min = ZVec2(rect.x, rect.y)
    const max = ZVec2(rect.width, rect.height)
    max.add(min)

    min.applyMatrix3(matrix)
    max.applyMatrix3(matrix)

    out.x = min.x
    out.y = min.y
    out.width = max.x - min.x
    out.height = max.y - min.y

    return out
}

export const area = (size: Size) => size.width * size.height
export const longerSide = (size: Size) => Math.max(size.width, size.height)

export const containsPoint = (
    rect: Readonly<Rect>,
    { x, y }: Readonly<GVec2>,
) =>
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height

export const intersects = (a: Readonly<Rect>, b: Readonly<Rect>) =>
    !(
        a.x + a.width - 1 < b.x ||
        b.x + b.width - 1 < a.x ||
        a.y + a.height - 1 < b.y ||
        b.y + b.height - 1 < a.y
    )

/** Determine which side o  f a rect the point lies on, as a vector  */
export function side(
    r: Readonly<Rect>,
    p: Readonly<GVec2>,
    out: GVec2 = { x: 0, y: 0 },
) {
    if (p.x < r.x) {
        out.x = -1
    } else if (p.x >= r.x + r.width) {
        out.x = 1
    }

    if (p.y < r.y) {
        out.y = -1
    } else if (p.y >= r.y + r.height) {
        out.y = 1
    }

    return out
}

/** If `p` is outside of `r`, wrap it around to the other side. Mutates the point */
export function wrap(r: Readonly<Rect>, p: GVec2) {
    p.x -= r.x
    p.y -= r.y

    // Most of the time the point will probably be less than width/height outside
    // the rect, but we can't be sure of that, can we
    let oldX
    let oldY
    do {
        oldX = p.x
        oldY = p.y
        p.x = (p.x + r.width) % r.width
        p.y = (p.y + r.height) % r.height
    } while (oldX !== p.x || oldY !== p.y)

    p.x += r.x
    p.y += r.y
}

/** Clamp the given point to fit within the rect. Mutates the point */
export function clamp(r: Readonly<Rect>, p: GVec2) {
    p.x = scalarClamp(p.x, r.x, r.x + r.width - 1)
    p.y = scalarClamp(p.y, r.y, r.y + r.height - 1)

    return p
}

/** Resize a rectangle to encompass the point */
export function expandToInclude(r: Rect, { x, y }: Readonly<GVec2>) {
    r.x = Math.min(r.x, x)
    r.y = Math.min(r.y, y)
    r.width = Math.max(r.width, x - r.x)
    r.height = Math.max(r.height, y - r.y)

    return r
}
