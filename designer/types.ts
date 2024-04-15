import {
    NumberOptions,
    Static,
    Type,
    type SchemaOptions,
    type TSchema,
} from '@sinclair/typebox'
import invariant from 'tiny-invariant'

import { LayerType, Metadata } from '../formats/common'
import { GestureInfo } from './gestures'
import { RenderCallback } from './state'

export const TOOLS = [
    'select',
    'create',
    'draw',
    /*'line'*/
    /*'marquee',*/
] as const

export type ToolID = (typeof TOOLS)[number]

/** Metadata for resources that can be edited as map layers */
export type Resource = MapHandler & Metadata

interface MapHandler {
    layers: ResourceAdapter<any, any>[]
}

// -----
//  JSON schema "presets"
// -----

const VecTitles = ['x', 'y'] as const

/** @todo Allow user to specify integer, etc.  */
export function TVec2(
    tupleOpts?: SchemaOptions,
    numberOpts: NumberOptions = {},
) {
    return Type.Tuple(
        [
            Type.Number({ ...numberOpts, title: VecTitles[0] }),
            Type.Number({ ...numberOpts, title: VecTitles[1] }),
        ],
        tupleOpts,
    )
}

// -------------------
// #region Resource adapters
// -------------------

interface Adapter<E extends TSchema, ID extends PaletteID>
    extends Record<ToolID, Function> {
    callbacks: ToolCallbacks<E, ID>
    displayName?: string
}

export class ResourceAdapter<
    E extends TSchema,
    ID extends PaletteID = PaletteID,
> implements Adapter<E, ID>
{
    callbacks: ToolCallbacks<E, ID> = {}
    displayName?: string

    constructor(
        public readonly type: LayerType,
        public elementSchema: E,
        public palette: Palette<ID>,
    ) {
        console.dir(palette)
    }

    title(t: string) {
        this.displayName = t
        return this
    }

    select(hand: SelectHandler<E>) {
        this.callbacks.select = hand
        return this
    }

    create(hand: CreateHandler) {
        this.callbacks.create = hand
        return this
    }

    draw(hand: PlotHandler<ID>) {
        this.callbacks.draw = hand
        return this
    }
}

// ----------------
//  Tool callbacks
// ----------------

interface ToolCallbacks<E extends TSchema, ID extends PaletteID> {
    select?: SelectHandler<E>
    create?: CreateHandler
    draw?: PlotHandler<ID>
}

/** called by the editor when this resource is selected and there's a click in the viewport with the pencil tool active, or perhaps a line drawn by a line tool. Params will be the normalized viewport coordinate [0..1]?, and the value that's been plotted.
 * @todo what could the return value mean?
 * @todo make this a two-point thing
 */
type PlotHandler<PK> = (gesture: GestureInfo, value: PK) => void

/** @returns An iterable of items within the rect */
type SelectHandler<E extends TSchema> = (
    gesture: GestureInfo,
    renderDeferred: (cb?: RenderCallback) => void,
) => Iterable<Static<E>> | void

/** creates a new entity where indicated */
type CreateHandler = (gesture: GestureInfo, object_type: PaletteID) => void

// -----
//  Palettes
// -----

export function validID<T extends object>(
    o: T,
    v: string | number | symbol,
): asserts v is keyof T {
    invariant(v in o, 'Not a valid key')
}

export type PaletteID = string | number

export type Palette<
    ID extends PaletteID = PaletteID,
    E extends PaletteEntry = PaletteEntry,
> = Record<ID, E>

export type PaletteEntry = PaletteEntryText | PaletteEntryIcon
// | PaletteEntryImage

interface PaletteEntryText {
    icon?: undefined
    img?: undefined
    label: string

    /** if true, this item occupies a rectangular area rather than a point */
    area?: boolean
}

interface PaletteEntryImage {
    icon?: undefined
    // src for an image of the thing, intended to be displayed as large as reasonable
    img: string
    // name of the thing, for tooltip
    label?: string

    /** if true, this item occupies a rectangular area rather than a point */
    area?: boolean
}

interface PaletteEntryIcon {
    // src for an icon used to represent the thing
    icon: string
    img?: undefined
    // name of the thing, for tooltip
    label?: string

    /** if true, this item occupies a rectangular area rather than a point */
    area?: boolean
}
