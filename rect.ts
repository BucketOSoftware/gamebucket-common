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
    y <= origin.y + size.height

export const intersects = (a: Readonly<Rect>, b: Readonly<Rect>) =>
    !(
        a.origin.x + a.size.width - 1 < b.origin.x ||
        b.origin.x + b.size.width - 1 < a.origin.x ||
        a.origin.y + a.size.height - 1 < b.origin.y ||
        b.origin.y + b.size.height - 1 < a.origin.y
    )

export function expandToInclude(r: Rect, { x, y }: Readonly<GVec2>) {
    r.origin.x = Math.min(r.origin.x, x)
    r.origin.y = Math.min(r.origin.y, y)
    r.size.width = Math.max(r.size.width, x - r.origin.x)
    r.size.height = Math.max(r.size.height, y - r.origin.y)
}
