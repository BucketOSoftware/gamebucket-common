import {
    NumberOptions,
    SchemaOptions,
    Static,
    TObject,
    TSchema,
    Type,
} from '@sinclair/typebox'
import { Opaque, WithOpaque } from 'ts-essentials'

import * as Spatial from '../formats/spatial'
import { Rect } from '../rect'
import { File, ResourceType, WithProperties } from '../formats'
import uniqueId from 'lodash-es/uniqueId'

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

export type TopLevelResourceID = Opaque<string, 'TOP_LEVEL_RESOURCE_ID'>
export function TopLevelResourceID(prefix?: string) {
    return uniqueId(prefix ? prefix + '_' : undefined) as TopLevelResourceID
}
export type LayerID<ID extends string = string> = ID
export type ElementID<ID extends string | number = string | number> = ID

/** Resource types the designer can work with */
export type Editable<S extends TSchema = TSchema> = Dense2D<S> | Sparse2D<S>
export type EditableTopLevel = Container

/**  */
export type Container<P = void> = ContainerItems &
    File<ResourceType.Container> &
    WithProperties<P>

interface ContainerItems {
    items: Record<LayerID, Editable>
    itemOrder: LayerID[]
}

type Sparse2D<S extends TSchema> = Spatial.Sparse<2, S> &
    HasPalette<S> &
    WithOpaque<'EDITOR_PREPARED'>

/** in-memory representation for SpatialDense2D */
type Dense2D<S extends TSchema> = Omit<Spatial.Dense<2, S>, 'items'> &
    ChunkedDense2D<S> &
    HasPalette<S> &
    WithOpaque<'EDITOR_PREPARED'>

/** Dense layer data, but stored in chunks */
interface ChunkedDense2D<S extends TSchema> {
    /** width and height of each chunk */
    chunkSize: 16 | 32 | 64 | 128 | 256
    /** chunks[offsetx][offsety] contains an array of `chunkSize ** 2` elements  */
    chunks: {
        [x: number]: {
            [y: number]: Static<S>[]
        }
    }
}

interface HasPalette<S extends TSchema = TSchema> {
    /** For each field in the schema, the palette provides information for the editor to create an interface. If a given property doesn't have a palette, it's assumed that the schema data will be enough to present form elements to edit the value (for an entity list this would be the typical case, but maybe we want to use it for metadata, e.g. this one property is a color and should have a color picker
     */
    palettes: Palettes<S>
}

// -----
//  Palettes
// -----

export type Palettes<S extends TSchema> = S extends TObject
    ? { [P in keyof S['properties']]?: Palette }
    : Record<string, Palette> | Palette | undefined

export type PaletteID = string

/** Information on which values are valid for a given property */
export type Palette<K extends PaletteID = PaletteID> =
    | PaletteDiscrete<K>
    | ColorPicker

/** User can select from the given items */
export type PaletteDiscrete<K extends PaletteID = PaletteID> = PaletteEntry<K>[]

/** Select an arbitrary color. Use a PaletteDiscrete with swatches to select
 * from a specific set of colors */
interface ColorPicker {
    paletteType: 'COLOR_PICKER'

    // default is false
    alpha?: boolean
    format: 'rgbtuple'
}

// an image URL, or an image URL plus the portion of the image that should be displayed
export type PaletteImage = string | [string, Rect]

/** If icon/img/label are all omitted, the entry is considered "nil", i.e. no tile in this location or whatever */
interface PaletteEntry<K extends PaletteID> {
    /** when this entry is drawn/placed/whatever, the data-adding logic will get
     * the position (and maybe area, if `this.area` is true), and this value */
    value: K
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
