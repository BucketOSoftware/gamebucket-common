import type { GLTF as GLTFType } from '@gltf-transform/core'
import { uniqueId } from 'lodash-es'
import type * as THREE from 'three'

import { Quat4, Tup3 } from './scenebucket'

type Brand<T extends string> = { __brand__: T }

export type UniqueID = string & Brand<'EDITOR_UNIQUE_ID'>

export function createNodeID(): UniqueID {
    return uniqueId('SBk') as UniqueID
}

export function getThreeID(threepio: THREE.Object3D): UniqueID {
    return threepio.uuid as UniqueID
}
// stuff we don't care about
type GLTFUnusedFields =
    | 'accessors'
    | 'buffers'
    | 'bufferViews'
    | 'materials'
    | 'meshes' // TODO: include meshes later?
    | 'samplers'
    | 'textures'

/** GLTF altered to support SceneBucket stuff */
export interface SceneBucketFormat
    extends Omit<GLTFType.IGLTF, GLTFUnusedFields> {
    /** These are turned into THREE.Group objs */
    scenes: {
        name?: string
        nodes: number[] // indices of root nodes (there can be multiple!)
        extras: BucketExtras
    }[]

    nodes: BucketNode[]

    extensions: {
        KHR_lights_punctual?: {
            // /** As per https://github.com/CesiumGS/glTF/blob/3d-tiles-next/extensions/2.0/Khronos/KHR_lights_punctual/README.md#light-shared-properties
            lights: LightProperties[]
        }
    }
}

/**
 *
 * @todo matrix/skin/weights
 */

/** @see https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#reference-node */
// Notes:
// - A node MAY have either a matrix or any combination of translation/
// rotation/scale (TRS) properties
// - When a node is targeted for animation (referenced by an animation.
// channel.target), matrix MUST NOT be present.
export interface BucketNode
    extends Omit<GLTFType.INode, 'matrix' | 'skin' | 'weights' | 'mesh'> {
    // name?: string // for finding/debugging
    // NOT MATERIAL! at least not yet
    // TODO: matrix: number[] (16) -- but can't be used if node is targeted by animations
    translation?: Tup3
    rotation?: Quat4
    scale?: Tup3

    // mesh?: number
    extras?: BucketExtras

    extensions?: {
        KHR_lights_punctual?: {
            light: number
        }
    }
}
/** Stuff added to "extras" in SBk files */
export interface BucketExtras {
    bucket?: {
        hidden?: boolean
        castShadow?: boolean
        receiveShadow?: boolean

        /** if this is defined, this object came from a loaded GLTF file */
        src?: {
            uri: string
        }
    }
    [k: string]: unknown
}

/** Lights in GLTF/SBk files */
/*
export type LightProperties = {
    name?: string
    // RGB value for light's color in linear space. 
    color?: Tup3
    intensity?: number
} & (
    | {
          type: 'point'
          range?: number
      }
    | {
          type: 'directional'
      }
    | {
          type: 'spot'
          spot: {
              innerConeAngle?: number // default 0
              outerConeAngle?: number // PI / 4.0
          }
          range?: number
      }
)
*/

export interface LightProperties {
    type: 'point' | 'directional' | 'spot' | 'ambient' | 'hemisphere'
    /** RGB value for light's color in linear space. */
    color?: Tup3
    /** @todo What's the unit here */
    intensity?: number

    /** Point and spot only. 3js default if undefined */
    range?: number | null

    /** Spot only, clearly */
    spot: {
        innerConeAngle?: number // default 0
        outerConeAngle?: number // PI / 4.0
    } | null
}

// We don't change 'em
export type CameraProperties = GLTFType.ICamera

/** Properties added to the Three obj's userData.bucket */
export interface BucketThreepioUserData {
    /** Indicates that this object was created from a node that linked to a
     * GLTF file */
    src: 'TODO?' | undefined
    id: UniqueID
}

export interface SerializedScene {
    roots: UniqueID[]
    nodes: Record<UniqueID, SerializedNode>
}

/**
 * A NULL field indicates that the field is n/a for that type of object -- i.e.
 * "visible" doesn't exist on cameras
 * @todo Make more specific subclasses so we know that type == 'camera' implies a camera field, etc.
 */

export interface SerializedNode {
    id: UniqueID
    /** Node's type from a user point of view (i.e. Spotlight and Directional
     * are both lights). TODO: what does "node" mean? */
    type: 'group' | 'mesh' | 'camera' | 'light' | 'node'
    name?: string

    position: Tup3
    rotation: Quat4
    scale: Tup3

    visible: boolean | null
    castShadow: boolean | null
    receiveShadow: boolean | null

    /** URL to GLTF file -- null unless type is `mesh` */
    src?: string | null

    light?: LightProperties | null

    camera?: CameraProperties | null

    /**  @todo Are there any objects that can't have descendents? */
    children: UniqueID[]
}

export function nodeTypeFromThree(threepio: any): SerializedNode['type'] {
    if (threepio.isMesh) return 'mesh'
    if (threepio.isGroup) return 'group'
    if (threepio.isLight) return 'light'
    if (threepio.isCamera) return 'camera'

    return 'node'
}
