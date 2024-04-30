import {
    TSchema,
    ValueGuard,
    Kind,
    Hint,
    OptionalKind,
} from '@sinclair/typebox'
import invariant from 'tiny-invariant'
import {
    useDispatch as reduxUseDispatch,
    useSelector as reduxUseSelector,
} from 'react-redux'
import { Tuple, Opaque } from 'ts-essentials'

import { ResourceType, Container, Spatial, GenericResource } from '../formats'

import { PaletteID } from './resource'
import { ToolID } from './types'
import {
    PayloadAction,
    configureStore,
    createSelector,
    createSlice,
    current,
} from '@reduxjs/toolkit'

const PALETTES_MUTEX = true

export type EditableSubresource = Spatial.Editable<2, TSchema, any>
export type EditableResource = Container.Editable<EditableSubresource[]>

export const designerSlice = createSlice({
    name: 'designer',
    initialState: { tool: 'select', attribs: {}, loaded: [] } as {
        tool: ToolID
        attribs: Record<string, PaletteID>
        /** ID of the layer under edit */
        layer?: Container.ItemID

        // TODO: do we need to store this? Should we just get it from the Liaison and copy the thing we're editing into ui.layer?
        loaded: EditableResource[]
    },
    reducers: {
        selectPalette: (
            draft,
            {
                payload: [attribute, value],
            }: PayloadAction<[string | undefined, any]>,
        ) => {
            invariant(attribute, 'TODO: single-attribute layers')
            console.warn('SETTING:', attribute, value)
            if (PALETTES_MUTEX) {
                draft.attribs = { [attribute]: value }
            } else {
                draft.attribs[attribute] = value
            }
        },

        selectTool: (draft, { payload }: PayloadAction<ToolID>) => {
            draft.tool = payload
        },

        selectLayer: (
            draft,
            { payload }: PayloadAction<Container.ItemID | undefined>,
        ) => {
            draft.layer = payload
        },

        editElement: (
            draft,
            {
                payload,
            }: PayloadAction<{
                layer: Container.ItemID
                id: string | number
                property: string
                newValue: any
            }>,
        ) => {
            const { id, layer: layerId, property, newValue } = payload
            // console.log('Hi!', payload)
            // console.log("yo", current(draft))
            invariant(
                id in draft.loaded[0].items[layerId].data,
                "Element doesn't exist",
            )

            // const layerObj = draft.loaded[0].items.find(i => i === layer)
            const data = draft.loaded[0].items[layerId].data

            // FIXME: element might not be an object!
            /*
            console.log(
                'setting',
                current(data[id as keyof typeof data]),
                property,
                newValue,
            )
            */
            // @ts-expect-error
            data[id as keyof typeof data][property] = newValue
        },

        open: (
            draft,
            { payload: resource }: PayloadAction<EditableResource>,
        ) => {
            if (!resource) {
                draft.loaded = []
                return
            }

            // TODO: accept serialized form, convert to editable form.

            draft.loaded = [resource]
            console.log(
                Object.entries(resource.items).map(([k, v]) =>
                    Object.values(v.data),
                ),
            )
        },
    },
})

export const store = configureStore({
    reducer: designerSlice.reducer,
})

export const { open, selectLayer, selectTool, selectPalette, editElement } =
    designerSlice.actions

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export const useSelector = reduxUseSelector.withTypes<RootState>()
export const useDispatch = reduxUseDispatch.withTypes<AppDispatch>() // Export a hook that can be reused to resolve types

export const selectedLayer = createSelector(
    [(state: RootState) => state.loaded[0], (state: RootState) => state.layer],
    (loadedResource, layerId) =>
        loadedResource && layerId ? loadedResource.items[layerId] : undefined,
)
