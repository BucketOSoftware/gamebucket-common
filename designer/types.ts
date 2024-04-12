import {
    NumberOptions,
    Static,
    TNumber,
    TTuple,
    Type,
    type SchemaOptions,
    type TSchema,
} from '@sinclair/typebox'

import type { rect } from 'gamebucket'

import invariant from 'tiny-invariant'
import { Matrix3 } from 'three'
import { Spatial2D, TileMapLayer } from '../formats/spatial'
import { GESTURE_PHASE, GesturePhase } from './gestures'
import { RenderCallback } from './state'
import { Metadata } from '../formats/common'

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
export type ResourceLayer<S extends TSchema> = MapLayerHandler<S>

interface MapHandler {
    layers: MapLayerHandler<any>[]
}

type MapLayerHandler<S extends TSchema> =
    | TileMapHandler<S>
    | ContinuousMapHandler<S>
    | EntityListHandler<S>

export type LayerType = MapLayerHandler<any>['type']

// -----
// Extra stuff
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

// -----
//
// -----

interface DesignerMetadata<T extends TSchema> extends Metadata {
    /** The resource sans metadata is an array of this. */
    element: T
}

export interface TileMapHandler<P extends TSchema> extends DesignerMetadata<P> {
    type: 'resource/spatial2d/tile_map'
    palette: Palette

    plot: PlotHandler<PaletteID>
}

/**
 * @todo this is kind of theoretical, mostly meant as a look-ahead  */
interface ContinuousMapHandler<P extends TSchema> extends DesignerMetadata<P> {
    type: 'continuous_map'
    palette: Palette

    /** @todo Mostly same as tilemap. But does it apply? */
    plot: PlotHandler<PaletteID>
}

/** A list of object properties  */
export interface EntityListHandler<P extends TSchema>
    extends DesignerMetadata<P> {
    type: 'resource/spatial2d/entity_list'
    // element: P

    /** Schema for properties that can be set in the designer. Doesn't have to
     * be the entire entity.
     */

    palette: Palette<PaletteID>

    select: SelectHandler<P>
    create: CreateHandler

    /** Called when the user wants to remove an object from the dataset */
    // delete: (id: K) => void

    // /    get: (id: K) => Static<P>

    /**
     * Callback when the user modified an object property.
     * @todo better types
     * @param id Which object has been modified by the user
     * @param property Which property has been changed
     * @param value The new value for the property
     */
    // set: (id: K, property: string, value: any) => void
}

// --------------
//  Type helpers
// --------------
export function tileMap<P extends TSchema>(r: TileMapHandler<P>) {
    return r
}

export function entityList<P extends TSchema>(e: EntityListHandler<P>) {
    return e
}

/** Special value indicating the select callback should select everything it contains */
const EVERYTHING = Symbol()
entityList.EVERYTHING = EVERYTHING

export function validID<T extends object>(
    o: T,
    v: string | number | symbol,
): asserts v is keyof T {
    invariant(v in o, 'Not a valid key')
}

// -----
//  Palettes
// -----
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

/** called by the editor when this resource is selected and there's a click in the viewport with the pencil tool active, or perhaps a line drawn by a line tool. Params will be the normalized viewport coordinate [0..1)?, and the value that's been plotted.
 * @todo what could the return value mean?
 * @todo make this a two-point thing
 */
type PlotHandler<PK> = (
    phase: Omit<GesturePhase, typeof GESTURE_PHASE.CANCEL>,
    viewport_x: number,
    viewport_y: number,
    value: PK,
) => void

/** @returns An iterable of items within the rect */
type SelectHandler<E extends TSchema> = (
    phase: GesturePhase | undefined,
    selectionArea: rect.Rect | typeof entityList.EVERYTHING,
    renderDeferred: (cb?: RenderCallback) => void,
) => Iterable<Static<E>> | void

type CreateHandler = (
    viewport_x: number,
    viewport_y: number,
    object_type: PaletteID,
) => void
