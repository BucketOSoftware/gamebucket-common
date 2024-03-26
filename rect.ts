import { clamp as scalarClamp } from './math'
import { GVec2 } from './geometry'

export interface Rect {
    /** The smallest coordinates in the rectangle */
    origin: GVec2
    size: Size
}

export interface Size {
    width: number
    height: number
}

export const area = (size: Size) => size.width * size.height
export const longerSide = (size: Size) => Math.max(size.width, size.height)

export const containsPoint = (
    { origin, size }: Readonly<Rect>,
    { x, y }: Readonly<GVec2>,
) =>
    x >= origin.x &&
    x < origin.x + size.width &&
    y >= origin.y &&
    y < origin.y + size.height

export const intersects = (a: Readonly<Rect>, b: Readonly<Rect>) =>
    !(
        a.origin.x + a.size.width - 1 < b.origin.x ||
        b.origin.x + b.size.width - 1 < a.origin.x ||
        a.origin.y + a.size.height - 1 < b.origin.y ||
        b.origin.y + b.size.height - 1 < a.origin.y
    )

/** Determine which side of a rect the point lies on, as a vector  */
export function side(
    r: Readonly<Rect>,
    p: Readonly<GVec2>,
    out: GVec2 = { x: 0, y: 0 },
) {
    if (p.x < r.origin.x) {
        out.x = -1
    } else if (p.x >= r.origin.x + r.size.width) {
        out.x = 1
    }

    if (p.y < r.origin.y) {
        out.y = -1
    } else if (p.y >= r.origin.y + r.size.height) {
        out.y = 1
    }

    return out
}

/** If `p` is outside of `r`, wrap it around to the other side. Mutates `p` */
export function wrap(r: Readonly<Rect>, p: GVec2) {
    p.x -= r.origin.x
    p.y -= r.origin.y

    // Most of the time the point will probably be less than width/height outside
    // the rect, but we can't be sure of that, can we
    let oldX
    let oldY
    do {
        oldX = p.x
        oldY = p.y
        p.x = (p.x + r.size.width) % r.size.width
        p.y = (p.y + r.size.height) % r.size.height
    } while (oldX !== p.x || oldY !== p.y)

    p.x += r.origin.x
    p.y += r.origin.y
}

/** Clamp the given point to fit within the rect */
export function clamp(r: Readonly<Rect>, p: GVec2) {
    p.x = scalarClamp(p.x, r.origin.x, r.origin.x + r.size.width - 1)
    p.y = scalarClamp(p.y, r.origin.y, r.origin.y + r.size.height - 1)
    return p
}

export function expandToInclude(r: Rect, { x, y }: Readonly<GVec2>) {
    r.origin.x = Math.min(r.origin.x, x)
    r.origin.y = Math.min(r.origin.y, y)
    r.size.width = Math.max(r.size.width, x - r.origin.x)
    r.size.height = Math.max(r.size.height, y - r.origin.y)
}
