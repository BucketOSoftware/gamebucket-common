import type { Matrix3Tuple, Matrix4Tuple } from 'three'
import {
    Static,
    TObject,
    TSchema,
    TTuple,
    TUnion,
    Type,
} from '@sinclair/typebox'

import { Palette } from '../designer'
import * as rect from '../rect'

import { ResourceType } from './common'

/** A dataset where elements are located by 2D or 3D coordinates, e.g. an area/level.
 * @todo Size of the overall map is considered to be the size of: the largest layer? the first layer with a size?
 */
export namespace Spatial {
    const K_POSITION = 'position'

    export type Dimensions = 2 | 3

    /**
     * Determine whether the schema is densely- or sparsely-addressed
     * @todo Enforce that POSITION is actually a vector
     */
    export type IsSparse<S extends TSchema, Sparse, Dense> =
        Static<S> extends {
            [K_POSITION]: [number, number] | [number, number, number] | number[]
        }
            ? Sparse
            : Dense

    type SpatialResourceType<
        D extends Dimensions,
        S extends TSchema,
    > = IsSparse<
        S,
        D extends 2
            ? ResourceType.SpatialSparse2D
            : ResourceType.SpatialSparse3D,
        D extends 2 ? ResourceType.SpatialDense2D : ResourceType.SpatialDense3D
    >

    interface Sparse<
        D extends Dimensions = Dimensions,
        S extends TSchema = TSchema,
        // P extends {} | void = void,
    > {
        type: D extends 2
            ? ResourceType.SpatialSparse2D
            : ResourceType.SpatialSparse3D
        displayName?: string

        size?: rect.Size
        worldTransform?: Matrix3Tuple | Matrix4Tuple

        schema: S
        data: Record<string, Static<S>>
    }

    interface Dense<
        D extends Dimensions,
        S extends TSchema,
        // P extends {} | void = void,
    > {
        type: D extends 2
            ? ResourceType.SpatialDense2D
            : ResourceType.SpatialDense3D
        displayName?: string

        size: rect.Size
        worldTransform?: Matrix3Tuple | Matrix4Tuple

        schema: S
        data: Static<S>[]
    }

    export type Serialized<
        D extends Dimensions = Dimensions,
        S extends TSchema = TSchema,
        P extends {} | void = void,
    > = (Sparse<D, S> | Dense<D, S>) & (P extends void ? {} : { properties: P })

    interface SNEERerialized<
        D extends Dimensions = Dimensions,
        S extends TSchema = TSchema,
        P extends {} | void = void,
    > {
        type: SpatialResourceType<D, S>

        /** Label for the designer UI or user's own benefit */
        displayName?: string

        /** Size of the layer. Valid coordinates range from [0..width), [0..height)
         * @todo Make optional if it's a sparse layer
         */
        size: IsSparse<S, rect.Size | undefined, rect.Size>

        /** Transformation to turn an [x,y] coordinate on this layer into a
         * coordinate in world space. If this is a Matrix4Tuple, the coordinates
         * should be coerced into 3D coordinates with a z coordinate of 0 and
         * then transformed (e.g., to "stack" 2D layers to create a 3D world)
         * @todo Probably just accept integer translations to start, the rest can come later
         * @default [1,0,0,0,1,0,0,0,1]
         */
        worldTransform?: Matrix3Tuple | Matrix4Tuple

        /** The schema for each element
         * @todo Should this be optional when stored in a file, if the game code is going to know the right one?
         */
        schema: S

        /** The elements in this layer. Can be an array or an object; either way
         * the key uniquely identifies the element.
         *  - If schema has a key named [POSITION], this is a sparse layer and
         *    that property will be the element's position.
         * - If not, this is a dense layer and the element's position is based
         *   on its key, i.e. itssequential position in the array. */
        // data: IndexedData<Static<S>, IsSparse<S, string | number, number>>
        data: IsSparse<S, Record<string, Static<S>>, Record<number, Static<S>>>

        properties?: P
    }

    export type Palettes<S extends TSchema> = S extends TObject
        ? { [P in keyof S['properties']]?: Palette }
        : Record<string, Palette> | Palette | undefined

    export type Editable<
        D extends Dimensions = Dimensions,
        S extends TSchema = TSchema,
        P extends {} | void = void,
    > = Serialized<D, S, P> & {
        /** For each field in the schema, the palette provides information for the editor to create an interface. If a given property doesn't have a palette, it's assumed that the schema data will be enough to present form elements to edit the value (for an entity list this would be the typical case, but maybe we want to use it for metadata, e.g. this one property is a color and should have a color picker
         */
        palettes: Palettes<S>
    }

    // export function check<S extends TSchema, D extends Data<Static<S>>>(
    //     layer: Editable<S, D>,
    // ): Editable<S, D> {
    //     // serialied or editable?
    //     return layer
    // }

    /** @todo ensure that `data.length === rect.area(size)`, worldTransform is a valid matrix if present, there are enough tiles to fill out the space if it's a dense coord, etc. */
    export function validate<D extends 2 | 3>(layer: Serialized<D, any>) {
        return true
    }
}

// const v = Spatial2D.check({
//     type: ResourceType.SpatialDense2D,
//     schema: Type.Integer({ minimum: 0 }),
//     data: [1, 2, 3],
//     size: { width: 50, height: 50 },
// })
