import type {
    Vector2Tuple,
    Vector3Tuple,
    Matrix3Tuple,
    Matrix4Tuple,
} from 'three'
import { Static, TObject, TSchema } from '@sinclair/typebox'

import * as rect from '../rect'

import { ResourceType as RT } from './common'

const K_POSITION = 'position'

export type Dimensions = 2 | 3

/** Tuple of 2 or 3 dimensions */
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
    displayName?: string

    /** @todo This is a `Rect` rather than a `Size` because a dataset doesn't have to start at `[0,0]` */
    bounds?: rect.Rect

    /** @todo If `bounds` is defined:
     *  - `fixed` means that the bounds should stay as they are unless manually
     *    changed. (Does that mean coordinates are meant to be always >=0?)
     *    Elements outside bounds may be saved with the dataset but may be
     *    discarded as part of the asset pipeline
     *  - `expand` means that the bounds should be whatever AABB contains all
     *    the coordinates, which may be negative. If `bounds` is defined by the
     *    user it's purely advisory, e.g. as a guide
     */
    boundaryType?: 'fixed' | 'expand'

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

/** @todo: This is a way to link a bunch of maps together */
interface World {
    displayName?: string
    // worldTransform:

    areas: Record<string, Spatial[]>
}

/**
 * A spatial dataset with explicitly specified positions on each element, i.e.
 * an entity list
 */
export interface Sparse<
    D extends Dimensions = Dimensions,
    S extends TSchema = TSchema,
> extends Base<S> {
    type: D extends 2 ? RT.SpatialSparse2D : RT.SpatialSparse3D

    /** Map of element IDs to elements.
     * ID is arbitrary and unique only to this dataset */
    data: Record<string, Static<S>>
}


/**
 * A spatial dataset with densely-packed elements which are positioned
 * implicitly, i.e. a tile map
 */
export interface Dense<
    D extends Dimensions = Dimensions,
    S extends TSchema = TSchema,
> extends Base<S> {
    type: D extends 2 ? RT.SpatialDense2D : RT.SpatialDense3D
    displayName?: string

    bounds: rect.Rect

    data: Static<S>[]
}

/** any of the types of spatial datasets */
export type Spatial<
    D extends Dimensions = Dimensions,
    S extends TSchema = TSchema,
> = Dense<D, S> | Sparse<D, S>

export type ResourceType<D extends Dimensions = Dimensions> = Spatial<D>['type']

/** @todo ensure that `data.length === rect.area(size)`, worldTransform is a valid matrix if present, there are enough tiles to fill out the space if it's a dense coord, etc. */
export function validate<D extends 2 | 3>(
    layer: Dense<D, any> | Sparse<D, any>,
) {
    return true
}
