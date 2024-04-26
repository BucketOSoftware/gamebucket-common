import { NumberOptions, Type, type SchemaOptions } from '@sinclair/typebox'
import invariant from 'tiny-invariant'

export const TOOLS = [
    'draw',
    'select',
    'create',
    /*'line'*/
    /*'marquee',*/
] as const

export type ToolID = (typeof TOOLS)[number]

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
