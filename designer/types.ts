import type { Matrix3 } from 'three'
import type { rect } from 'gamebucket'
import { PlotHandler } from './gestures'

export const TOOLS = ['select', 'create', 'marquee', 'draw', 'line'] as const
export type ToolID = (typeof TOOLS)[number]

type TODO = any

export type Resource = MapResource

/** Metadata for resources that can be edited as map layers */
type MapResource = TileMapResource | ContinuousMapResource | ObjectListResource

export type ResourceType = Resource['type']

/** Specifies what values are valid for a property, allowing us to build a UI around it */
type TypeSpec = IntegerSpec

// TODO: replace with JSON schema
export interface IntegerSpec {
    type: 'Integer'
    // if not specified as `true`, this value is required
    optional?: boolean

    // if type is Integer, the value of each element is an index into an array
    indexInto?: (string | number)[]
    range?: [
        min: number | undefined,
        max: number | undefined,
        step?: number | undefined,
    ]
    default?: number
}

interface ResourceCommon {
    /** Label shown in the editor. Must be unique.
     * @todo Make one up if it's not given?
     */
    label: string

    /** Matrix to transform the map's local coordinates into world coordinates, suitable for arranging maps in a larger space*/
    worldTransform?: Matrix3

    /** Size of the map in local coordinates */
    size: rect.Size
}

export interface TileMapResource extends ResourceCommon {
    type: 'tile_map'
    elementType: TypeSpec

    plot: PlotHandler<number>
}

export interface ContinuousMapResource extends ResourceCommon {
    type: 'continuous_map'

    /** Matrix to transform the map's local coordinates into world coordinates, suitable for arranging maps in a larger space*/
    worldTransform?: Matrix3

    /** @todo Mostly same as tilemap. But does it apply? */
    plot: (viewport_x: number, viewport_y: number, value: number) => void
}

// https://json-schema.org/implementations

// TODO: ugh. this wants to be a unique value that identifies an object
/** A list of object properties  */
export interface ObjectListResource<
    Key extends string = string,
    Rec extends object = { [k: string]: any },
> extends ResourceCommon {
    type: 'object_list'

    /** property name that identifies an object */
    key: TODO
    properties: ObjectPropertyDict<Rec>

    create: (
        viewport_x: number,
        viewport_y: number,
        object_type: string,
    ) => void

    /** Called when the user wants to remove an object from the dataset */
    delete: (id: Key) => void

    get: (id: Key) => Rec

    /**
     * Callback when the user modified an object property.
     * @todo better types
     * @param id Which object has been modified by the user
     * @param property Which property has been changed
     * @param value The new value for the property
     */
    set: (id: Key, property: string, value: any) => void
}
// TODO: mapped type
type ObjectPropertyDict<Rec> = { [name: string]: ObjectProperty<Rec> }
/** A string is the title of a group of related properties */
type ObjectProperty<Rec> =
    | TypeSpec
    | [condition: (record: Rec) => boolean, properties: ObjectPropertyDict<Rec>]
