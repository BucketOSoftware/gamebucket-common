import { TypedArray } from "three"
import { GVec2 } from "../geometry"
import {  GenericResource, ResourceType } from "./common"

// TODO?: are the types MIME-ish? */
export interface Scene extends GenericResource<ResourceType.Scene> {
    // ...scenebucket...
}

/** @todo But is a state machine definition data or code? */
interface StateMachine {
}

/** Change one or more values over time, to be applied to whatever at runtime.
 * Base on the GLTF animation format */
interface TimelineAnimation extends GenericResource<ResourceType.Timeline> {
    // type:
}

interface Equation extends GenericResource<ResourceType.Equation> {
    ast: EquationNode
}

interface EquationNode {
    car: 'identifier'
    cdr: EquationNode[]
}

/** TODO: make sure this covers different use cases */
interface TexturePackerSpriteSheet extends GenericResource<ResourceType.SpriteSheet> {
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

interface Song extends GenericResource<ResourceType.Song> {
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
