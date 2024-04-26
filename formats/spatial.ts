import type { Matrix3Tuple, Matrix4Tuple } from 'three'
import {
    Static,
    TObject,
    TSchema,
    TTuple,
    TUnion,
    Type,
} from '@sinclair/typebox'

import { Palette, TVec2 } from '../designer'
import * as rect from '../rect'

import { ResourceType } from './common'

/** A dataset where elements are located by 2D coordinates, e.g. an area/level.
 * @todo Size of the overall map is considered to be the size of: the largest layer? the first layer with a size?
 */
export namespace Spatial2D {
    type Data<T, K extends keyof any = keyof any> = Array<T> | Record<K, T>

    export interface Serialized<S extends TSchema, D extends Data<Static<S>>> {
        type: D extends Array<any>
            ? ResourceType.SpatialDense2D
            : ResourceType.SpatialSparse2D

        /** Label for the designer UI or user's own benefit */
        displayName?: string

        /** Size of the layer. Valid coordinates range from [0..width), [0..height)
         * @todo Make optional if it's a sparse layer
         */
        size: rect.Size

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

        /** If an array, this is a "dense" layer where every possible integer coordinate has a value, so we expect this array to be `size.width * size.height` elements long. Convert [x,y] to a linear index to retrieve the item. If an object, each element contains its coordinate. TODO: do we enforce that? */
        data: D
    }

    export type Palettes<S extends TSchema> = S extends TObject
        ? { [P in keyof S['properties']]?: Palette }
        : Palette | undefined

    export interface Editable<S extends TSchema, D extends Data<Static<S>>>
        extends Serialized<S, D> {
        /** For each field in the schema, the palette provides information for the editor to create an interface. If a given property doesn't have a palette, it's assumed that the schema data will be enough to present form elements to edit the value (for an entity list this would be the typical case, but maybe we want to use it for metadata, e.g. this one property is a color and should have a color picker
         */

        palettes: Palettes<S>
    }

    export function check<S extends TSchema, D extends Data<Static<S>>>(
        layer: Editable<S, D>,
    ): Editable<S, D> {
        // serialied or editable?
        return layer
    }

    /** @todo ensure that all coordinates are within `size`, worldTransform is a valid matrix if present, there are enough tiles to fill out the space if it's a dense coord, etc. */
    export function validate(layer: Serialized<any, any>) {
        return true
    }
}
