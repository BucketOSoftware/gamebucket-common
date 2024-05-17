import {
    NumberOptions,
    SchemaOptions,
    Static,
    TSchema,
    Type,
} from '@sinclair/typebox'
import fill from 'lodash-es/fill'
import uniqueId from 'lodash-es/uniqueId'
import invariant from 'tiny-invariant'
import { Opaque } from 'ts-essentials'

import { File, GenericResource, ResourceType, WithProperties } from '../formats'
import * as Spatial from '../formats/spatial'
import * as grid from '../grid'
import * as rect from '../rect'

export type TODO = any

// -----
//  JSON schema "presets"
// -----

/**
 * @todo Allow user to specify integer, etc.
 * @todo Add this to the typebox registry
 */
export function TVec2(
    tupleOpts?: SchemaOptions,
    numberOpts: NumberOptions = {},
) {
    return Type.Tuple(
        [
            Type.Number({ ...numberOpts, title: 'x' }),
            Type.Number({ ...numberOpts, title: 'y' }),
        ],
        tupleOpts,
    )
}

// -----
// Resources
// -----

/**
 * A unique ID for a resource we're editing. Unique across the editor but does
 * not persist past a save/load
 */
export type ResourceID = Opaque<string, 'DESIGNER_RESOURCE_ID'>
/**
 *
 * @param prefix An optional prefix for help when debugging or what have you
 * @returns
 */
export function ResourceID(_resource: GenericResource, prefix: string = 'res') {
    return uniqueId(prefix + '/') as ResourceID
}

export type ElementID<ID extends string | number = string | number> = ID

/** Resource types the designer can work with */

/** The kind of container we get as an argument */
export type ScalarResource<S extends TSchema> = Sparse2D<S> | Dense2D<S>
export type LoadableResource<S extends TSchema, P = void> = (
    | ({
          items: ResourceID[]
      } & File<ResourceType.Container>)
    | ScalarResource<S>
) &
    WithProperties<P>

export type Sparse2D<S extends TSchema> = Spatial.Sparse<2, S> & HasPalette<S>

/** in-memory representation for SpatialDense2D */
export type Dense2D<S extends TSchema> = Omit<Spatial.Dense<2, S>, 'data'> &
    ChunkedDense2D<S> &
    HasPalette<S>

/** Dense layer data, but stored in chunks */
interface ChunkedDense2D<S extends TSchema> {
    /** width and height of each chunk */
    chunkSize: ChunkSize
    /** chunks[offsetx][offsety] contains an array of `chunkSize ** 2` elements  */
    chunks: {
        [x: number]: {
            [y: number]: ChunkData<S>
        }
    }
}

export type ChunkData<S extends TSchema> = (Static<S> | null)[]
export type ChunkSize = 16 | 32 | 64 | 128 | 256

interface HasPalette<S extends TSchema = TSchema> {
    /** For each field in the schema, the palette provides information for the editor to create an interface. If a given property doesn't have a palette, it's assumed that the schema data will be enough to present form elements to edit the value (for an entity list this would be the typical case, but maybe we want to use it for metadata, e.g. this one property is a color and should have a color picker
     */
    palettes: Palettes<S>
}

function chunkData<S extends TSchema>(
    data: Static<S>[],
    bounds: rect.Rect,
    size: ChunkSize,
): ChunkedDense2D<S> {
    invariant(data.length === rect.area(bounds))

    // this is probably inefficient -- we could fill out a whole chunk at a
    // time, but we'd have to do some preprocessing and I'm not sure it matters.
    // plus this would also work for non-dense coordinates with light modification
    return {
        chunks: data.reduce<ChunkedDense2D<S>['chunks']>(
            (chunks, element, idx) => {
                // Get the map coordinates of the current element
                const { x, y } = grid.toCoord(idx, bounds.width)
                const chunkOffset = {
                    x: Math.floor((x + bounds.x) / size) * size,
                    y: Math.floor((y + bounds.y) / size) * size,
                }
                // console.log(data,bounds, size)
                const localIdx = grid.toIdx(
                    x - chunkOffset.x,
                    y - chunkOffset.y,
                    size,
                )

                chunks[chunkOffset.x] ??= {}
                chunks[chunkOffset.x][chunkOffset.y] ??= fill(
                    new Array<Static<S>>(size ** 2),
                    null,
                )

                chunks[chunkOffset.x][chunkOffset.y][localIdx] = element

                return chunks
            },
            {},
        ),
        chunkSize: size,
    }
}

/**
 * @todo Can we embed the palette info in the Typebox schema? Custom properties or whatever? Also multiple layers should be able to share palettes as appropriate so we can save the selection per-palette-set
 *
 * @param resource
 * @param palettes
 * @param chunkSize
 * @returns
 */
export function prepareDense<S extends TSchema>(
    resource: Spatial.Dense<2, S>,
    palettes: Palettes<S>,
    chunkSize: ChunkSize = 32,
): Dense2D<S> {
    return {
        ...resource,
        ...chunkData(resource.data, resource.bounds, chunkSize),
        palettes: { ...palettes },
    }
}

export function prepareSparse<S extends TSchema>(
    resource: Spatial.Sparse<2, S>,
): Sparse2D<S> {
    // TODO: what do we use for palettes here?
    return { ...resource, palettes: {} }
}

export function prepareContainer<S extends TSchema, P = void>(
    container: {
        items: LoadableResource<S, P>[]
    } & File<ResourceType.Container> &
        WithProperties<P>,
): [resources: Record<ResourceID, LoadableResource<S, any>>, root: ResourceID] {
    const resources: Record<ResourceID, LoadableResource<S, any>> = {}

    return [resources, flatten(container, resources)]
}

function flatten(
    thing: any, //{ items: any[] } & File<ResourceType.Container>,
    resources: Record<ResourceID, any>,
): ResourceID {
    // if this is a container,
    if ('items' in thing) {
        invariant(Array.isArray(thing.items))

        const flattenedThing = {
            ...thing,
            items: thing.items.map((item: any) => flatten(item, resources)),
        }

        const id = ResourceID(flattenedThing)
        invariant(!(id in resources))

        resources[id] = flattenedThing
        return id
    }

    const id = ResourceID(thing)
    invariant(!(id in resources))

    resources[id] = thing
    return id
}

// -----
//  Palettes
// -----

export type Palettes<S extends TSchema> = {
    [P in keyof S['properties']]?: Palette
}
// : never //Record<string, Palette> | Palette | undefined

export type PaletteID = string

/** Information on which values are valid for a given property */
export type Palette<K extends PaletteID = PaletteID> =
    | PaletteDiscrete<K>
    | ColorPicker

/** User can select from the given items */
export type PaletteDiscrete<V extends PaletteID = PaletteID> = PaletteEntry<V>[]

/** Select an arbitrary color. Use a PaletteDiscrete with swatches to select
 * from a specific set of colors */
interface ColorPicker {
    paletteType: 'COLOR_PICKER'

    // default is false
    alpha?: boolean
    format: 'rgbtuple'
}

// an image URL, or an image URL plus the portion of the image that should be displayed
export type PaletteImage = string | [string, rect.Rect]

/** If icon/img/label are all omitted, the entry is considered "nil", i.e. no tile in this location or whatever */
interface PaletteEntry<V extends PaletteID> {
    /** when this entry is drawn/placed/whatever, the data-adding logic will get
     * the position (and maybe area, if `this.area` is true), and this value */
    value: V
    /** src for an icon used to represent the thing */
    icon?: PaletteImage
    /** src for an image of the thing, intended to be displayed as large as
     * reasonable. @todo */
    img?: never
    /** name of the thing, for tooltip */
    label?: string
    /** Swatch. Use a subset of CSS colors maybe?
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
     */
    swatch?: string

    /** if true, this item occupies a rectangular area rather than a point */
    area?: boolean
}
