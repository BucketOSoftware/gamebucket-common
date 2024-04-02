import {
    Type,
    type SchemaOptions,
    type TSchema
} from '@sinclair/typebox'

import type { rect } from 'gamebucket'

import invariant from 'tiny-invariant'
import type { PlotHandler, SelectHandler } from './gestures'

export const TOOLS = [
    'select',
    'create',
    /*'marquee',*/ 'draw' /*'line'*/,
] as const
export type ToolID = (typeof TOOLS)[number]

type TODO = any

// export type Resource<S extends TSchema> = MapResource<S>

/** Metadata for resources that can be edited as map layers */
export type Resource<S extends TSchema> =
    | TileMapResource<S>
    | ContinuousMapResource<S>
    | EntityListResource<S>
// type MapResource = Resource

export type ResourceType = Resource<any>['type']

// -----
// Extra stuff
// -----

export function TVec2(opts?: SchemaOptions) {
    return Type.Tuple([Type.Number(), Type.Number()], opts)
}

/** Constructor functions for typescript */
// -----
//
// -----
interface ResourceCommon {
    /** Label shown in the editor. Must be unique.
     * @todo Make one up if it's not given?
     */
    label: string

    /** Matrix to transform the map's local coordinates into world coordinates, suitable for arranging maps in a larger space. TODO: is it necessary? */
    // worldTransform?: Matrix3

    /** Size of the map in local coordinates */
    size: rect.Size

    /** Each element of the resource's data matches this schema. Can be a scalar, object, etc. */
    element: TSchema
}

export interface TileMapResource<P extends TSchema> extends ResourceCommon {
    type: 'tile_map'
    element: P
    palette: Palette

    plot: PlotHandler<PaletteID>
}

export function tileMap<P extends TSchema>(r: TileMapResource<P>) {
    return r
}

// export function entityList<P extends TSchema>(e: EntityListResource<P>) {
// return e
// }
/** TODO: this is kind of theoretical, mostly meant as a look-ahead  */
export interface ContinuousMapResource<P extends TSchema>
    extends ResourceCommon {
    type: 'continuous_map'
    element: P
    // palette: Palette

    /** @todo Mostly same as tilemap. But does it apply? */
    plot: PlotHandler<PaletteID>
}

/** A list of object properties  */
export interface EntityListResource<P extends TSchema> extends ResourceCommon {
    type: 'object_list'
    element: P

    /** Schema for properties that can be set in the designer. Doesn't have to
     * be the entire entity.
     */

    palette: Palette<PaletteID>

    select: SelectHandler<P>
    create: (
        viewport_x: number,
        viewport_y: number,
        object_type: PaletteID,
    ) => void

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

export function entityList<P extends TSchema>(e: EntityListResource<P>) {
    return e
}

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

type PaletteEntry = PaletteEntryText | /*PaletteEntryImage |*/ PaletteEntryIcon

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
