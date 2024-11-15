import invariant from 'tiny-invariant'
import { GVec } from './geometry'
import { mapRange } from './math'
import * as grid from './grid'
import type { Size } from './rect'

export interface Heightmap extends Size {
    // TODO: greater precision
    cells: Uint8ClampedArray | Uint8Array
    w: number
    h: number
    /** height of the highest point in the map (optional, treated as 1 if not specified) */
    scale?: number
}

export function idx(map: Heightmap, { x, y }: GVec<2>) {
    invariant(x >= 0 && x < 1)
    invariant(y >= 0 && y < 1)
    return grid.toIdx(Math.round(x * map.w), Math.round(y * map.h), map.w) * 4
}

export function heightAt(map: Heightmap, normalizedPosition: GVec<2>) {
    const max = (1 << (map.cells.BYTES_PER_ELEMENT * 8)) - 1
    // const { x, y } = normalizedPosition

    return mapRange(
        map.cells[idx(map, normalizedPosition)],
        0,
        max,
        0,
        map.scale || 1,
    )
}

/**
 * Produce an RGBA normal map given an Rxxx (grayscale) height map
 * via https://mrdoob.com/lab/javascript/height2normal/
 * @param heightmap
 * @param normals
 *
 */
export function calculateNormalMap(
    map: Readonly<Heightmap>,
    normals: Uint8ClampedArray | Uint8Array,
) {
    const heightmap = map.cells
    const { w, h } = map

    const stride = 4
    for (var i = 0, l = w * h * 4; i < l; i += stride) {
        var x1, x2, y1, y2

        if (i % (w * stride) == 0) {
            // left edge
            x1 = heightmap[i]
            x2 = heightmap[i + stride]
        } else if (i % (w * stride) == (w - 1) * stride) {
            // right edge
            x1 = heightmap[i - stride]
            x2 = heightmap[i]
        } else {
            x1 = heightmap[i - stride]
            x2 = heightmap[i + stride]
        }

        if (i < w * stride) {
            // top edge
            y1 = heightmap[i]
            y2 = heightmap[i + w * stride]
        } else if (i > w * (h - 1) * stride) {
            // bottom edge
            y1 = heightmap[i - w * stride]
            y2 = heightmap[i]
        } else {
            y1 = heightmap[i - w * stride]
            y2 = heightmap[i + w * stride]
        }

        normals[i] = x1 - x2 + 127
        normals[i + 1] = y1 - y2 + 127
        normals[i + 2] = 255
        normals[i + 3] = 255
    }
}
