// import { Static, TSchema, Type } from '@sinclair/typebox'
import { GVec2 } from 'gamebucket'
import type { TypedArray } from 'three'

import { GenericResource, Metadata, ResourceType } from './common'
// import {  } from './spatial'
import { TSchema } from '@sinclair/typebox'

export { Spatial2D } from './spatial'
/** "File" formats as they'd exist in memory. */

// type Iff<P> = P extends void ? {} : P

/** Resource that contains other resources.
 * @todo Make specific container types so we can have a Spatial2D container that only contains 2D maps? */
export namespace Container {
    type Items = GenericResource.Serialized<ResourceType>[]
    type Properties = Record<keyof any, any> | void

    export interface Serialized<
        L extends Items = Items,
        P extends Properties = Properties,
    > extends GenericResource.Serialized<ResourceType.Container> {
        type: ResourceType.Container
        items: L
        properties?: P
    }

    export interface Editable<
        L extends Items = Items,
        P extends Properties = Properties,
        K extends string = string,
    > extends Omit<Serialized<L, P>, 'items'> {
        items: Record<K, L[number]>
        itemOrder: K[]
    }

    /** @todo */
    export interface Packed<L extends Items, P extends Properties>
        extends Serialized<L, P> {}
}

/** All types supported by designer */
export type BucketResource =
    | Scene
    | TimelineAnimation
    // | Spatial2D<Layer2D<TSchema>[]>
    | Equation
    | Song

// type ResourceTypes = BucketResource['type']

// TODO?: are the types MIME-ish? */
export interface Scene extends Metadata<ResourceType.Scene> {
    // ...scenebucket...
}

/** Change one or more values over time, to be applied to whatever at runtime.
 * Base on the GLTF animation format */
interface TimelineAnimation extends Metadata<ResourceType.Timeline> {
    // type:
}

interface Equation extends Metadata<ResourceType.Equation> {
    ast: EquationNode
}

interface EquationNode {
    car: 'identifier'
    cdr: EquationNode[]
}

/** TODO: make sure this covers different use cases */
interface TexturePackerSpriteSheet extends Metadata<ResourceType.SpriteSheet> {
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

interface Song extends Metadata<ResourceType.Song> {
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
}
