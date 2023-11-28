import ow from 'ow'

import { clamp } from './math'
import { GVec2, radToDeg, degToRad } from './geometry'
import { Size } from './rect'

export function build({ width, height }: Size) {
    let output = []
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            output.push({ x, y, idx: toIdx(x, y, width) })
        }
    }
    return output
}

/**
 * Returns an index
 * @param {number} x
 * @param {number} y
 * @param {number} gridWidth
 */
export function toIdx(x: number, y: number, gridWidth: number) {
    return y * gridWidth + x
}

/**
 *
 * @param {number} idx
 * @param {number} gridWidth
 */
export function toCoord(idx: number, gridWidth: number): GVec2 {
    ow(idx, ow.number.greaterThanOrEqual(0))
    ow(gridWidth, ow.number.greaterThanOrEqual(0))
    return { x: idx % gridWidth, y: (idx / gridWidth) | 0 }
}

const offsets4 = [
    [0, -1], // N
    [-1, 0], // W
    [1, 0], // E
    [0, 1], // S
] as const

// clockwise from northwest!
const offsets8 = [
    [-1, -1], // NW
    [0, -1], // N
    [1, -1], // NE
    [1, 0], // E
    [1, 1], // SE
    [0, 1], // S
    [-1, 1], // SW
    [-1, 0], // W
] as const

/**
 * Returns indexes of tile neighbors in 4 or 8 directions
 */
export function neighbors(
    grid: Size,
    idx: number,
    distance = 1,
    eightway = false,
    output: number[] = [],
) {
    let { width } = grid

    // let output: number[] = []

    let { x, y } = toCoord(idx, width)
    for (let [dx, dy] of eightway ? offsets8 : offsets4) {
        let mx = x + dx * distance
        let my = y + dy * distance
        if (inBounds(grid, mx, my)) {
            output.push(toIdx(mx, my, width))
        }
    }

    return output
}

/**
 * Returns true if x, y is within the given grid
 */
export function inBounds(grid: Size, x: number, y: number) {
    let { width, height } = grid
    return x >= 0 && y >= 0 && x < width && y < height
}

export function tilesInCircle(
    grid: Size,
    center_x: number,
    center_y: number,
    radius: number,
) {
    ow(center_x, ow.number.finite)
    ow(center_y, ow.number.finite)
    ow(radius, ow.number.greaterThan(0))

    // TODO: garbage
    const tiles = []

    // ASSUMPTION: [0, 0] is the center of the top-left(?) tile. The border to the next tile to the east would be at [0.5, 0]
    // the naive way would be to sample every point along the circle and check what tile it's in
    // so let's do that

    const radiansPerEighth = degToRad(360) / 8
    // for (let radians = 0; radians += radiansPerEighth; radians < degToRad(360)) {
    for (let slices = 0; slices < 8; slices++) {
        const radians = slices * radiansPerEighth

        let x = center_x + Math.cos(radians) * radius
        let y = center_y + Math.cos(radians) * radius

        // TODO: +0.5 and |0 might do if we don't allow negative coordinates
        x = Math.round(x)
        y = Math.round(y)

        if (inBounds(grid, x, y)) {
            // ow(this.inBounds(x, y), ow.boolean.true)
            tiles.push({
                x,
                y,
                angle: radToDeg(radians),
            })
        }
    }

    return tiles
}

/**
 *
 * @param center_x
 * @param center_y
 * @param halfwidth
 * @param output Array to be filled with packed coordinates
 * @returns
 */
export function tilesInSquarePacked(
    center_x: number,
    center_y: number,
    halfwidth: number,
    output: Uint16Array,
) {
    // ow(center_x, ow.number.finite)
    // ow(center_y, ow.number.finite)
    // ow(halfwidth, ow.number.greaterThan(0))

    const min_x = Math.round(center_x - halfwidth)
    const max_x = Math.round(center_x + halfwidth)
    const min_y = Math.round(center_y - halfwidth)
    const max_y = Math.round(center_y + halfwidth)

    let idx = 0
    for (let x = min_x; x <= max_x; x++) {
        for (let y = min_y; y <= max_y; y++, idx += 2) {
            // TODO: just skip if it's out of range of map
            // ow(x, ow.number.inRange(0, 0xffff))
            // ow(y, ow.number.inRange(0, 0xffff))

            output[idx] = x
            output[idx + 1] = y
        }
    }

    return idx >> 1
}

export function clipToBounds(grid: Size, x: number, y: number) {
    return new Tile(clamp(x, 0, grid.width - 1), clamp(y, 0, grid.height - 1), grid)
}

export class Tile implements GVec2 {
    public readonly idx: number

    constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly grid: Size,
    ) {
        /*
        ow(x, ow.number.integer)
        ow(y, ow.number.integer)
        ow(
            grid.inBounds(x, y),
            ow.boolean.true.message('Tile is out of bounds')
        )
*/
        this.idx = toIdx(x, y, grid.width)
    }

    /// TODO: remove onlyInBounds and replace with an inBounds(tile, grid) function that can be passed to .filter
    neighbors(diagonal = false, onlyInBounds = true) {
        let output = []

        for (let [dx, dy] of diagonal ? offsets8 : offsets4) {
            let mx = this.x + dx
            let my = this.y + dy
            if (inBounds(this.grid, mx, my)) {
                output.push(new Tile(mx, my, this.grid))
            } else if (!onlyInBounds) {
                output.push(undefined)
            }
        }

        return output
    }
}
