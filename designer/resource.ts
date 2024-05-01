import { Static, TSchema, TUnknown } from '@sinclair/typebox'

// /** @param [K]: ID/key of things that can be placed in the layer */
// export type Resource<
//     T extends ResourceType = ResourceType,
//     E extends TSchema | unknown = unknown,
//     K extends PaletteID | unknown = unknown,
// > =
//     | Layer2D<
//           E extends TSchema ? E : TUnknown,
//           K extends PaletteID ? K : string | number
//       >
//     | MinimalResource<T>

// export interface MinimalResource<T extends ResourceType = ResourceType>
//     extends Metadata<T> {}

// -----
//  Palettes
// -----

import { Rect } from '../rect'

// export function validID<T extends object>(
//     o: T,
//     v: string | number | symbol,
// ): asserts v is keyof T {
//     invariant(v in o, 'Not a valid key')
// }

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

export function isNil(pal: PaletteEntry<any>) {
    return (
        pal.label === undefined &&
        pal.icon === undefined &&
        pal.img === undefined &&
        pal.swatch === undefined
    )
}
