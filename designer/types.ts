import { NumberOptions, Type, type SchemaOptions } from '@sinclair/typebox'

// -----
//  JSON schema "presets"
// -----

/** @todo Allow user to specify integer, etc.  */
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
//  Palettes
// -----

import { Rect } from '../rect'

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
