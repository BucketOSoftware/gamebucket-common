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

import {
    File,
    GenericResource,
    ResourceType,
    Spatial,
    WithProperties,
} from '../formats'
import { GVec2 } from '../geometry'
import * as grid from '../grid'
import * as rect from '../rect'
import { Dimensions } from '../formats/spatial'

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

export type SupportedDimension = 2

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

/**
 * The way the client identifies an element within a resource, i.e. a 2D coord
 * on a tile map or a specific entity
 */
export type ElementKey<
    L extends FlattenedResource<Dimensions, any> = FlattenedResource<
        Dimensions,
        any
    >,
> =
    L extends FlattenedDense<infer D, TSchema>
        ? Spatial.Vector<D>
        : L extends FlattenedSparse<infer D, TSchema>
          ? string
          : L extends FlattenedContainer
            ? number
            : never

export function elementAt<
    O extends {},
    S extends TSchema = TSchema,
    D extends 2 = 2, //SupportedDimension = SupportedDimension,
>(layer: FlattenedResource<D, S>, id: ElementKey<FlattenedResource<D, S>>): O {
    // console.warn('get', id)
    if (Array.isArray(id)) {
        invariant('chunks' in layer)
        // const [x, y] = id

        const [ox, oy, localIdx] = positionInChunk(
            id,
            layer.bounds,
            layer.chunkSize,
        )

        const e = layer.chunks[ox][oy][localIdx]
        invariant(e, 'Element not found')
        invariant(typeof e === 'object', 'Element is not an object')
        return e as O
    }

    // @ts-expect-error: could use a more permissive system, guys
    const e = (layer.data || layer.items)[id]
    invariant(e, 'Element not found')
    invariant(typeof e === 'object', 'Element is not an object')
    return e
}

/** The kind of resource we can load and work with */
export type FlattenedResource<
    D extends Spatial.Dimensions = Spatial.Dimensions,
    S extends TSchema = TSchema,
    P = unknown,
> = (FlattenedContainer | ScalarResource<D, S>) & WithProperties<P>

export function notContainer<R extends FlattenedResource>(r?: R) {
    invariant(r, 'Not a layer')
    invariant(r.type !== ResourceType.Container, 'Expected a non-container')

    return r
}

interface FlattenedContainer extends File<ResourceType.Container> {
    items: ResourceID[]
}

export type ScalarResource<D extends Spatial.Dimensions, S extends TSchema> =
    | FlattenedSparse<D, S>
    | FlattenedDense<D, S>

export interface FlattenedSparse<
    D extends Spatial.Dimensions,
    S extends TSchema = TSchema,
> extends Spatial.Sparse<D, S>,
        HasPalette<S> {}

/** in-memory representation for SpatialDense2D */
export interface FlattenedDense<
    D extends Spatial.Dimensions,
    S extends TSchema = TSchema,
> extends Omit<Spatial.Dense<D, S>, 'data'>,
        HasPalette<S> {
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

export function positionInChunk<
    D extends SupportedDimension = SupportedDimension,
>(
    [x, y]: Spatial.Vector<D>,
    bounds: rect.Rect,
    size: ChunkSize,
): [offsetx: number, offsety: number, localIdx: number] {
    invariant(rect.containsPoint(bounds, { x, y }), 'Point out of bounds')
    const offsetx = Math.floor((x + bounds.x) / size) * size
    const offsety = Math.floor((y + bounds.y) / size) * size

    return [offsetx, offsety, grid.toIdx(x - offsetx, y - offsety, size)]
}

type ChunkedDense2D<S extends TSchema> = Pick<
    FlattenedDense<2, S>,
    'chunkSize' | 'chunks'
>

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
                const { x, y } = grid.toCoord(idx, bounds.width)
                // Get the map coordinates of the current element
                const [offsetx, offsety, localIdx] = positionInChunk(
                    [x, y],
                    bounds,
                    size,
                )

                chunks[offsetx] ??= {}
                chunks[offsetx][offsety] ??= fill(
                    new Array<Static<S>>(size ** 2),
                    null,
                )

                chunks[offsetx][offsety][localIdx] = element

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
    resource: Spatial.Dense<SupportedDimension, S>,
    palettes: Palettes<S>,
    chunkSize: ChunkSize = 32,
): FlattenedDense<2, S> {
    return {
        ...resource,
        ...chunkData(resource.data, resource.bounds, chunkSize),
        palettes: { ...palettes },
    }
}

export function prepareSparse<S extends TSchema>(
    resource: Spatial.Sparse<SupportedDimension, S>,
): FlattenedSparse<SupportedDimension, S> {
    // TODO: what do we use for palettes here?
    return { ...resource, palettes: {} }
}

export function prepareContainer<S extends TSchema, P = void>(
    container: {
        items: FlattenedResource<SupportedDimension, S, P>[]
    } & File<ResourceType.Container> &
        WithProperties<P>,
): [
    resources: Record<
        ResourceID,
        FlattenedResource<SupportedDimension, S, any>
    >,
    root: ResourceID,
] {
    const resources: Record<
        ResourceID,
        FlattenedResource<SupportedDimension, S, any>
    > = {}

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
    // [P in keyof S['properties']]: Palette
    [k: string]: Palette
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
