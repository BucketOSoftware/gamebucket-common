export interface Metadata {
    /** where the resource was loaded from, or new/unsaved if undefined */
    src?: File | URL | string
    /** If present, a user-facing name for the resource */
    displayName?: string
}

export const TYPES = {
    entityList: 'resource/spatial2d/entity_list',
    tileMap: 'resource/spatial2d/tile_map',
} as const
