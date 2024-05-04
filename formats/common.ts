import { Static, TSchema } from '@sinclair/typebox'

export enum ResourceType {
    Container = 'gamebucket/container',
    // Spatial2D = 'resource/spatial2d',

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

export type Serializable =
    | string
    | number
    | boolean
    | null
    | Serializable[]
    | { [key: string]: Serializable }

// export type CompoundResourceType = ResourceType.Spatial2D

export interface Metadata<R extends ResourceType> {
    /** where the resource was loaded from, or new/unsaved if undefined */
    src?: string
    /** If present, a user-facing name for the resource */
    displayName?: string

    type: R
}

/** Any resource! */
export namespace GenericResource {
    export interface Serialized<R extends ResourceType> {
        type: R

        /** If present, a user-facing name for the resource */
        displayName?: string
    }

    export interface Editable<R extends ResourceType = ResourceType>
        extends Serialized<R> {
        /** where the resource was loaded from, or new/unsaved if undefined */
        src?: string
    }
}
