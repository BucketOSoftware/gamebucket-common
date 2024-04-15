export interface Metadata {
    /** where the resource was loaded from, or new/unsaved if undefined */
    src?: File | URL | string
    /** If present, a user-facing name for the resource */
    displayName?: string
}

export const LAYER_TYPES = {
    ENTITY_LIST: 'resource/spatial2d/entity_list',
    TILE_MAP: 'resource/spatial2d/tile_map',
} as const

export type LayerType = (typeof LAYER_TYPES)[keyof typeof LAYER_TYPES]
