import { clamp as scalarClamp } from './math'
import { GVec2 } from './geometry'
import invariant from 'tiny-invariant'

export interface Size {
    width: number
    height: number
}

/** A rectangle. `x` and `y` represent the minium coordinate in the rectangle, and `width` and `height` are the size/shape */
export type Rect = GVec2 & Size

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

export function fromCorners(x1: number, y1: number, x2: number, y2: number) {
    return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x1 - x2),
        height: Math.abs(y1 - y2),
    }
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
