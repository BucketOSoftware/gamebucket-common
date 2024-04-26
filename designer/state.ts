import { TSchema, ValueGuard } from '@sinclair/typebox'
import invariant from 'tiny-invariant'

import { ResourceType, Container, Spatial2D, GenericResource } from '../formats'

import { LayerID, PaletteID } from './resource'
import { ToolID } from './types'
import { PayloadAction, configureStore, createSlice } from '@reduxjs/toolkit'
import { uniqueId, zipObject } from 'lodash-es'

export const uiSlice = createSlice({
    name: 'ui',
    initialState: { tool: 'draw', attribs: {} } as {
        tool: ToolID
        attribs: Record<string, PaletteID>
        /** ID of the layer under edit */
        layer?: LayerID
    },
    reducers: {
        selectTool: (state, { payload }: PayloadAction<ToolID>) => {
            state.tool = payload
        },
        selectLayer: (
            state,
            { payload }: PayloadAction<LayerID | undefined>,
        ) => {
            state.layer = payload
        },
    },
})

type AcceptableResource = Container.Serialized<
    Spatial2D.Serialized<TSchema, any>[]
>

export const editedSlice = createSlice({
    name: 'edited',
    initialState: { loaded: [] } as {
        // TODO: do we need to store this? Should we just get it from the Liaison and copy the thing we're editing into ui.layer?
        loaded: Container.Editable[]
    },
    reducers: {
        open: (
            draft,
            { payload: resource }: PayloadAction<AcceptableResource>,
        ) => {
            if (!resource) {
                draft.loaded = []
                return
            }

            // Convert to editable form

            // if (resource.type === ResourceType.Container) {
            // TODO?: should we ever not auto-generate these?
            const ids = resource.items.map((item) =>
                uniqueId(`gbres/${item.displayName}/`),
            )
            const items = zipObject(ids, resource.items)

            draft.loaded = [
                {
                    ...resource,
                    items,
                    itemOrder: ids,
                },
            ]
        },
    },
})

export const store = configureStore({
    reducer: {
        ui: uiSlice.reducer,
        edited: editedSlice.reducer,
    },
})

export const { open } = editedSlice.actions
export const { selectTool, selectLayer } = uiSlice.actions

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
