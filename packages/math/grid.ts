/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Tagged } from 'type-fest'

import { type SVec } from './geometry'
import { clamp as scalarClamp } from './index'
import { type Rect, type Size } from './rect'

export type GridIndex = Tagged<number, 'GridIndex'>

/**
 * A grid is essentially a special case of {@link Rect} with integer coordinates
 * and an implicit origin of (0,0). The height is optional for converting
 * coordinates but helps with bounds checking.
 */
export interface IGrid {
    w: number
    h?: number
}

/**
 * Given a grid, return a function that converts a tile coordinate to a linear
 * into the grid where 0 is { 0,0 } and area(grid) - 1 is the bottom-right tile.
 * Useful for storing grid data in a 1-dimensional array.
 */
export function toIdx(grid: Readonly<IGrid>, tile: SVec<2>): GridIndex {
    return (tile.y * grid.w + tile.x) as GridIndex
}

/**
 * Given a grid, return a function that converts a linear grid index to a 2D
 * vector.
 */
export function toCoord(
    grid: Readonly<IGrid>,
    idx: GridIndex | number
): SVec<2> {
    return {
        x: idx % grid.w,
        y: (idx / grid.w) | 0,
    }
}

/** Clamp the given point to fit within the grid. Mutates the point */
export function clamp(grid: Readonly<Size>, tile: SVec<2>): SVec<2> {
    tile.x = scalarClamp(tile.x, 0, grid.w - 1)
    tile.y = scalarClamp(tile.y, 0, grid.h - 1)
    return tile
}

// ─── Directional Vectors ─────────────────────────────────────────────────────

/**
 * 2D unit vectors for the cardinal directions.
 */
export const cardinal = [
    { x: 0, y: -1 }, // N
    { x: -1, y: 0 }, // W
    { x: 1, y: 0 }, // E
    { x: 0, y: 1 }, // S
] as const satisfies SVec<2>[]

/**
 * 2D vectors for cardinal and ordinal (8-way) directions, not normalized.
 * Order is clockwise from northwest, assuming north is negative Y
 */
export const ordinal = [
    { x: -1, y: -1 }, // NW
    { x: 0, y: -1 }, // N
    { x: 1, y: -1 }, // NE
    { x: 1, y: 0 }, // E
    { x: 1, y: 1 }, // SE
    { x: 0, y: 1 }, // S
    { x: -1, y: 1 }, // SW
    { x: -1, y: 0 }, // W
] as const satisfies SVec<2>[]

/**
 * Returns all tiles on the grid that are offset from `tile` by one of the
 * distance vectors in `offsets`.
 *
 * @example
 *  neighbors({ w: 10, h: 10 }, { x: 5, y: 0 }, cardinal)
 *  // => [{ x: 4, y: 0 }, { x: 6, y: 0 }, { x: 5, y: 1 }]
 *
 * @param [output=[]] If given, neighbor coordinates will be appended to this array.
 */
export function neighbors(
    grid: Size,
    tile: SVec<2>,
    offsets: SVec<2>[] = cardinal,
    output: SVec<2>[] = []
) {
    const { x, y } = tile

    for (let { x: dx, y: dy } of offsets) {
        let neighbor = { x: x + dx, y: y + dy }
        if (inBounds(grid, neighbor)) {
            output.push(neighbor)
        }
    }

    return output
}

/** Determines whether `tile` is a valid tile coordinate within the given `grid` */
export function inBounds(grid: Size, tile: SVec<2>) {
    // let { w: width, h: height } = grid
    let width = grid.w
    let height = grid.h ?? Infinity
    let { x, y } = tile

    let ints = (x | 0) === x && (y | 0) === y
    return ints && x >= 0 && y >= 0 && x < width && y < height
}

/**
 * Calculates the horizontal and vertical offset between two linear grid indexes
 */
export function offset(grid: IGrid, a: GridIndex, b: GridIndex): SVec<2> {
    const { w: gridWidth } = grid

    const x1 = a % gridWidth
    const x2 = b % gridWidth
    const y1 = (a / gridWidth) | 0
    const y2 = (b / gridWidth) | 0

    return { x: x2 - x1, y: y2 - y1 }
}

export function tilesInCircle(
    grid: Size,
    center: SVec<2>,
    radius: number,
    output: { x: number; y: number; angle: number }[] = []
) {
    // ASSUMPTION: [0, 0] is the center of the top-left(?) tile. The border to
    // the next tile to the east would be at [0.5, 0]
    // the naive way would be to sample every point along the circle and check what tile it's in
    // so let's do that

    const radiansPerEighth = (Math.PI + Math.PI) / 8
    for (let slices = 0; slices < 8; slices++) {
        const radians = slices * radiansPerEighth

        let x = center.x + Math.cos(radians) * radius
        let y = center.y + Math.cos(radians) * radius

        // TODO: +0.5 and |0 might do if we don't allow negative coordinates
        x = Math.round(x)
        y = Math.round(y)

        if (inBounds(grid, { x, y })) {
            output.push({ x, y, angle: radians })
        }
    }

    return output
}

// ─────────────────────────────────────────────────────────────────────────────

/** A Grid class for OO-style calls to grid functions */
export class Grid implements Size {
    constructor(public readonly w: number, public readonly h: number) {}

    toIdx(tile: SVec<2>) {
        return toIdx(this, tile)
    }

    toCoord(idx: GridIndex | number) {
        return toCoord(this, idx)
    }

    clamp(tile: SVec<2>) {
        return clamp(this, tile)
    }

    inBounds(tile: SVec<2>) {
        return inBounds(this, tile)
    }

    offset(a: GridIndex, b: GridIndex) {
        return offset(this, a, b)
    }

    neighbors(
        tile: SVec<2>,
        offsets: SVec<2>[] = cardinal,
        output: SVec<2>[] = []
    ) {
        return neighbors(this, tile, offsets, output)
    }
}
