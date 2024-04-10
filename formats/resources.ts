import { GVec2, rect } from 'gamebucket'
import { Brand } from 'gamebucket/types'
import type { Matrix3Tuple, Matrix3, TypedArray } from 'three'

/** "File" formats, or I guess metadata/wrappers so the designer knows how to
 * edit them */

/** All types supported by designer */
export type BucketResource =
    | Scene
    | TimelineAnimation
    | Spatial2D
    | Equation
    | Song

export interface Metadata {
    /** where the resource was loaded from, or new/unsaved if undefined */
    src?: File | URL | string
    /** If present, a user-facing name for the resource */
    displayName?: string
}

export interface Scene extends Metadata {
    /** MIME-ish? */
    type: 'application/gltf+scenebucket'
    // ...scenebucket...
}

/** Change one or more values over time, to be applied to whatever at runtime.
 * Base on the GLTF animation format */
export interface TimelineAnimation extends Metadata {
    type: 'resource/timeline'
}

export interface Equation extends Metadata {
    type: 'resource/equation'
    ast: EquationNode
}

interface EquationNode {
    car: 'identifier'
    cdr: EquationNode[]
}

// -----
//  Maps/levels
// -----

/** A dataset where elements are located by 2D coordinates, e.g. an area/level.
 * Contains layers in a defined order. Extend to add metadata.
 * @todo Size of the overall map is considered to be the size of: the largest layer? the first layer with a size? */
export interface Spatial2D extends Metadata {
    type: 'resource/spatial2d'
    layers: Layer2D[]
}

export type Map2D = Spatial2D

type Layer2D = TileMapLayer | EntityLayer

/** Generic 2D map layerwith implicit coordinates */
export interface TileMapLayer<
    K extends string | number = number,
    Element extends { tile: K } = { tile: K },
> {
    type: 'resource/spatial2d/tile_map'
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

export interface EntityLayer<Element extends {} = {}> {
    type: 'resource/spatial2d/entity_list'

    /**
     * Simple array of things. Not even confined to the bounds of the map,
     * because that may have some function in the game, or they may be temporary,
     * or whatever
     */
    data: Element[]
}

export interface Tile {
    /** image source, possibly with rect, e.g. 'backgrounds.png#0,0,16,16' */
    src: string
}

/** TODO: make sure this covers different use cases */
export interface TexturePackerSpriteSheet extends Metadata {
    frames: {
        /** poorly named -- just the identifier for the frame */
        filename: string

        /** rotated 90° clockwise if true */
        rotated: boolean
        trimmed: boolean
        /** coordinates in the sheet */
        frame: {
            x: number
            y: number
            w: number
            h: number
        }
        /**
         * "The non-transparent part of the sprite that is used in the frame.
         * Additional space around the sprite is transparent. This value
         * unfortunately contains redundancy because the w and h value is
         * identical with the frame's w and h"
         * https://gamedev.stackexchange.com/a/116000/9158
         */
        spriteSourceSize: {
            x: number
            y: number
            w: number
            h: number
        }
        /** center of the sprite relative to sizze */
        pivot?: GVec2

        /** size */
        sourceSize: {
            w: number
            h: number
        }
    }[]

    meta: {
        size: {
            w: number
            h: number
        }
        image: string
        format: TexturePackerImageFormat

        frameTags: {
            name: string
            from: number
            to: number
            direction: 'forward' | 'pingpong' // TODO: look up
            color: HexColorWithAlpha
        }[]
    }
}

type HexColorWithAlpha = '#000000ff'
type TexturePackerImageFormat = 'RGBA8888'

// -------
//  Audio
// -------

export interface Song extends Metadata {
    type: 'audio/raw+soundbucket'
    /** Uncompressed audio data */
    samples: TypedArray
    /** Samples per second */
    samplerate: number
    /** Channels per sample */
    channels: 2
    /** 1 or more sample #s, duration is calculated. default is [0] */
    sections: number[]
    /** which order to play the sections. default is to loop  */
    sequence: {
        /**  index into section list */
        section: number
        /** number of times to play this segment before moving on. Must be >0,
         * default is 1 */
        repeats?: number
        /** section to play when this one ends. if undefined, just move on to
         *  the next one, wrapping if loop is on. can of course be changed at
         *  runtime. */
        next?: number
    }[]
    // if true,
    loop: boolean
}
