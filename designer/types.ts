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
