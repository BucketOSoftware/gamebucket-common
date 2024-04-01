import type { Matrix3 } from 'three'
import {
    type TSchema,
    type Static,
    type SchemaOptions,
    Type,
} from '@sinclair/typebox'

import type { rect } from 'gamebucket'

import type { PlotHandler, SelectHandler } from './gestures'

export const TOOLS = [
    'select',
    'create',
    /*'marquee',*/ 'draw' /*'line'*/,
] as const
export type ToolID = (typeof TOOLS)[number]

type TODO = any

export type Resource<P extends TSchema> = MapResource<P>

/** Metadata for resources that can be edited as map layers */
type MapResource<P extends TSchema> =
    | TileMapResource<P>
    | ContinuousMapResource<P>
    | ObjectListResource<P, string>

export type ResourceType = Resource<any>['type']

// -----
// Extra stuff
// -----

export function TVec2(opts?: SchemaOptions) {
    return Type.Tuple([Type.Number(), Type.Number()], opts)
}

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
}

interface TileSet {}

export interface TileMapResource<P extends TSchema> extends ResourceCommon {
    type: 'tile_map'
    elementType: P

    palette?: TileSet[]

    plot: PlotHandler<P>
}

/** TODO: this is kind of theoretical, mostly meant as a look-ahead  */
export interface ContinuousMapResource<P extends TSchema>
    extends ResourceCommon {
    type: 'continuous_map'
    elementType: P

    /** @todo Mostly same as tilemap. But does it apply? */
    plot: PlotHandler<P>
}

// https://json-schema.org/implementations

// TODO: ugh. this wants to be a unique value that identifies an object
/** A list of object properties  */
export interface ObjectListResource<P extends TSchema, K extends string>
    extends ResourceCommon {
    type: 'object_list'

    /** property name that identifies an object */
    // key: TODO
    // properties: TSchema
    properties: P
    key: K
    /*
    create: (
        viewport_x: number,
        viewport_y: number,
        object_type: string,
    ) => void
*/

    select: SelectHandler<P>
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
