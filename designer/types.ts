import { NumberOptions, Type, type SchemaOptions } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import invariant from 'tiny-invariant'

import { Metadata } from '../formats/common'

import { ResourceAdapter } from './resource'

export const TOOLS = [
    'draw',
    'select',
    'create',
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

// ----------------
//  Tool callbacks
// ----------------

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
