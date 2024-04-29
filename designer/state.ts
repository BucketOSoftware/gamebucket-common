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
import { PayloadAction, configureStore, createSlice } from '@reduxjs/toolkit'
import { uniqueId, zipObject } from 'lodash-es'

export type EditableSubresource = Spatial.Editable<2, TSchema, any>
export type EditableResource = Container.Editable<EditableSubresource[]>

// export const uiSlice = createSlice({
//     name: 'ui',
//     initialState: { tool: 'draw', attribs: {} } as {},
//     reducers: {},
// })

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
        selectTool: (state, { payload }: PayloadAction<ToolID>) => {
            state.tool = payload
        },

        selectLayer: (
            state,
            { payload }: PayloadAction<Container.ItemID | undefined>,
        ) => {
            state.layer = payload
        },

        editElement: (
            draft,
            {
                payload,
            }: PayloadAction<{
                layer: Container.ItemID,
                id: string | number
                property: string
                newValue: any
            }>,
        ) => {
            // const { id, layer: layerId, property, newValue } = payload
            console.log("Hi!", payload)
            // [id]
            /*
            const layerObj = draft.loaded[0].items.find(i => i === layer)
            const data = layerObj.data
            invariant(
                id in data,
                `Invalid ID for layer ${layerId} '${layerObj.displayName}': ${id}`,
            )
            // @ts-expect-error
            const element = data[id]
            // FIXME: element might not be an object!
            console.log("setting", element, property, newValue)
            element[property] = newValue
            */
        },

        open: (
            draft,
            { payload: resource }: PayloadAction<EditableResource>,
        ) => {
            // console.warn('responding!!', resource)
            if (!resource) {
                draft.loaded = []
                return
            }

            // TODO: accept serialized form, convert to editable form.

            // // TODO?: should we ever not auto-generate these?
            // invariant(resource.items, 'No items??')
            // const ids = resource.itemOrder.map((item) =>
            //     uniqueId(`gbres/${item}/`),
            // )
            // const items = zipObject(ids, resource.items)

            // draft.loaded = [
            //     {
            //         ...resource,
            //         items,
            //         itemOrder: ids,
            //     },
            // ]

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

export const { open, selectLayer, selectTool,editElement } = designerSlice.actions

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

// export const useSelector = reduxUseSelector<RootState>
// export const useDispatch = reduxUseDispatch/
export const useSelector = reduxUseSelector.withTypes<RootState>()
export const useDispatch = reduxUseDispatch.withTypes<AppDispatch>() // Export a hook that can be reused to resolve types
