import type { Matrix3Tuple } from 'three'

import * as rect from '../rect'
import { Metadata, LAYER_TYPES } from './common'
import { Static, TSchema, Type } from '@sinclair/typebox'

/** A dataset where elements are located by 2D coordinates, e.g. an area/level.
 * Contains layers in a defined order. Extend to add metadata.
 * @todo Size of the overall map is considered to be the size of: the largest layer? the first layer with a size? */

export interface Spatial2D<
    L extends [...Layer2D<TSchema>[]],
    P extends {} | undefined,
> extends Metadata {
    type: 'resource/spatial2d'
    layers: L
    properties: P
}

// export type Map2D<L> = Spatial2D<L>

export type Layer2D<S extends TSchema> = TileMapLayer<S> | EntityLayer<S>

const DefaultTileSchema = Type.Object({ tile: Type.Integer() })
/** Generic 2D map layer with implicit coordinates, in row-major (?) order */
export interface TileMapLayer<
    S extends TSchema = typeof DefaultTileSchema,
    K extends string | number = number,
    Tile = { src: string }, // TODO
> {
    type: typeof LAYER_TYPES.TILE_MAP
    size: rect.Size

    /** Allows a map to have layers with different origins/orientations
     * @todo Probably just accept integer translations to start, the rest can come later
     * @default Identity matrix.
     */
    worldTransform?: Matrix3Tuple

    /** The schema for each element. @todo make another attempt to derive `Element` from this */
    schema: S

    /**
     * Data
     * @todo Store as struct of arrays, or save that for the actual game?
     */
    data: Static<S>[]

    /** The `tile` field of `data` is an array of indexes into this. Can contain
     * whatever properties are needed to render the map. Could be stored in a
     * separate shared file. */
    tileset: Record<K, Tile>
}

// export interface EntityLayer<Element> {
export interface EntityLayer<S extends TSchema> {
    type: typeof LAYER_TYPES.ENTITY_LIST

    schema: S
    /**
     * Simple array of things. Not even confined to the bounds of the map,
     * because that may have some function in the game, or they may be temporary,
     * or whatever
     */
    data: Static<S>[]
}
