import type {
    Vector2Tuple,
    Vector3Tuple,
    Matrix3Tuple,
    Matrix4Tuple,
} from 'three'
import { Static, TObject, TSchema } from '@sinclair/typebox'

import { Palette } from '../designer'
import * as rect from '../rect'

import { ResourceType } from './common'
// import { Container } from './resources'

const K_POSITION = 'position'

export type Types2D = ResourceType.SpatialDense2D | ResourceType.SpatialSparse2D
export type Types3D = ResourceType.SpatialDense3D | ResourceType.SpatialSparse3D
export type Types = Types2D | Types3D

export type Dimensions = 2 | 3

export type Vector<D extends Dimensions = Dimensions> = D extends 2
    ? Vector2Tuple
    : Vector3Tuple

/**
 * Determine whether the schema is densely- or sparsely-addressed
 * @todo Enforce that POSITION is actually a vector. And/or improve this in general
 */
// export type IsSparse<S extends TSchema> =
// Static<S> extends SparseElement ? Sparse : Dense

export interface SparseElement<D extends Dimensions = Dimensions> {
    [K_POSITION]: Vector<D>
}

/* A dataset where elements are located by 2D or 3D coordinates, e.g. an area/level.
 * @todo Size of the overall map is considered to be the size of: the largest layer? the first layer with a size?
 */
interface Base<S extends TSchema> {
    type: Types

    displayName?: string

    bounds?: rect.Rect

    /** Each element in the dataset must follow this schema */
    schema: S

    /**
     * Multiply element positions by this matrix to convert to the parent's
     * coordinate space. A 2D dataset could be converted to 3D by using a 4D
     * matrix and including a translation
     *
     * @default Identity matrix
     */
    worldTransform?: Matrix3Tuple | Matrix4Tuple
}

/**
 * A spatial dataset with explicitly specified positions on each element, i.e.
 * an entity list
 */
export interface Sparse<
    D extends Dimensions = Dimensions,
    S extends TSchema = TSchema,
> extends Base<S> {
    type: D extends 2
        ? ResourceType.SpatialSparse2D
        : ResourceType.SpatialSparse3D

    /** Map of element IDs to elements.
     * ID is arbitrary and unique only to this dataset */
    items: Record<string, Static<S>>
}

/**
 * A spatial dataset with densely-packed elements which are positioned
 * implicitly, i.e. a tile map
 */
export interface Dense<
    D extends Dimensions = Dimensions,
    S extends TSchema = TSchema,
> extends Base<S> {
    type: D extends 2
        ? ResourceType.SpatialDense2D
        : ResourceType.SpatialDense3D
    displayName?: string

    bounds: rect.Rect

    items: Static<S>[]
}

export type Spatial<
    D extends Dimensions = Dimensions,
    S extends TSchema = TSchema,
> = Dense<D, S> | Sparse<D, S>

// export type Serialized<
//     D extends Dimensions = Dimensions,
//     S extends TSchema = TSchema,
//     P extends {} | void = void,
// > = (Sparse<D, S> | Dense<D, S>) & HasProperties<P>

/** @todo ensure that `data.length === rect.area(size)`, worldTransform is a valid matrix if present, there are enough tiles to fill out the space if it's a dense coord, etc. */
export function validate<D extends 2 | 3>(
    layer: Dense<D, any> | Sparse<D, any>,
) {
    return true
}
