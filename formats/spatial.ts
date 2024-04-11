import { rect } from 'gamebucket'
import type { Matrix3Tuple } from 'three'
import { Metadata, TYPES } from './common'

/** A dataset where elements are located by 2D coordinates, e.g. an area/level.
 * Contains layers in a defined order. Extend to add metadata.
 * @todo Size of the overall map is considered to be the size of: the largest layer? the first layer with a size? */

export interface Spatial2D extends Metadata {
    type: 'resource/spatial2d'
    layers: Layer2D<any>[]
}

export type Map2D = Spatial2D

type Layer2D<S> = TileMapLayer<S> | EntityLayer<S>

/** Generic 2D map layerwith implicit coordinates */
export interface TileMapLayer<
    Element = { tile: number },
    K extends string | number = number,
    Tile = { src: string }, // TODO
> {
    type: (typeof TYPES)['tileMap']
    size: rect.Size

    /** Allows a map to have layers with different origins/orientations
     * @todo Probably just accept integer translations to start, the rest can come later
     * @default Identity matrix.
     */
    worldTransform?: Matrix3Tuple

    /**
     * Data
     * @todo Store as struct of arrays, or save that for the actual game?
     */
    data: Element[]

    /** The `tile` field of `data` is an array of indexes into this. Can contain
     * whatever properties are needed to render the map. Could be stored in a
     * separate shared file. */
    tileset: Record<K, Tile>
}

export interface EntityLayer<Element> {
    type: (typeof TYPES)['tileMap']

    /**
     * Simple array of things. Not even confined to the bounds of the map,
     * because that may have some function in the game, or they may be temporary,
     * or whatever
     */
    data: Element[]
}
