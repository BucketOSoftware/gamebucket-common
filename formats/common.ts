import { Static, TSchema } from '@sinclair/typebox'
import { NonEmptyObject, NonNever, Primitive } from 'ts-essentials'

export enum ResourceType {
    /**
     * Can hold multiple other resource, and optionally have properties
     * (metadata); otherwise generic
     */
    Container = 'gamebucket/container',

    SpatialSparse2D = 'resource/spatial2d/sparse',
    SpatialDense2D = 'resource/spatial2d/dense',
    SpatialSparse3D = 'resource/spatial3d/sparse',
    /** Unclear what this is currently. Voxels? */
    SpatialDense3D = 'resource/spatial3d/dense',

    Scene = 'application/gltf+scenebucket',
    Timeline = 'resource/timeline',

    SpriteSheet = 'texture-packer/spritesheet',

    Song = 'audio/raw+soundbucket',

    Equation = 'resource/equation',
}

/** @todo replace this with a library type */
type Serializable =
    | string
    | number
    | boolean
    | null
    | Serializable[]
    | { [key: string]: Serializable }

/**
 * A resource that was loaded from disk, or could be saved to disk. `&` this with
 * any other resource to get an editable "file" */
export interface File<R extends ResourceType> extends GenericResource<R> {
    /** where the resource was loaded from, or new/unsaved if undefined */
    src?: string
    /** If present, a user-facing name for the resource */
    displayName?: string
}

export interface GenericResource<R extends ResourceType = ResourceType> {
    type: R

    properties?: unknown
}

export type WithProperties<P> = IfPresent<'properties', P>

/**
 * A type that maps `K` to `P` if `P` is a primitive or a non-empty object, or
 * an empty object type otherwise
 */
type IfPresent<K extends string, P = never> = NonNever<
    Record<K, AllowPrimitiveOrFullObject<P>>
>

type AllowPrimitiveOrFullObject<P> = P extends Primitive
    ? P
    : AllowNonEmptyObject<P>

type AllowNonEmptyObject<P> = P extends {} ? NonEmptyObject<P> : never
