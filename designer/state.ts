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

import { ResourceType, Container, Spatial } from '../formats'

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
type ElementID = string | number

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

        /** apply currently selected palette attributes to the given elements in the selected layer */
        applyPalette: (draft, { payload: ids }: PayloadAction<ElementID[]>) => {
            invariant(Container.isItemID(draft.layer!, draft.loaded[0]))
            const layer = draft.loaded[0].items[draft.layer!]

            const array = Array.isArray(layer.data) && layer.data
            const record = !Array.isArray(layer.data) && layer.data
            // TODO: coerce values to match layer schema?
            for (let id of ids) {
                const e =
                    typeof id === 'number'
                        ? array && array[id]
                        : record && record[id]
                invariant(e && typeof e === 'object', `Element ${id} not found`)
                Object.assign(e, draft.attribs)
            }
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
            // TODO: accept serialized form, convert to editable form.
            draft.loaded = [resource]
        },
    },
})

export const store = configureStore({
    reducer: designerSlice.reducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            // we're using immer, so I'm not sure we need this
            immutableCheck: false,
            serializableCheck: false,
        }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// ---------
//  Actions
// ---------

export const useDispatch = reduxUseDispatch.withTypes<AppDispatch>() // Export a hook that can be reused to resolve types

export const {
    open,
    applyPalette,
    selectLayer,
    selectTool,
    selectPalette,
    editElement,
} = designerSlice.actions

// -----------------
//  Retrieving Data
// -----------------

export const useSelector = reduxUseSelector.withTypes<RootState>()

export const selectedLayer = createSelector(
    [(state: RootState) => state.loaded[0], (state: RootState) => state.layer],
    (loadedResource, layerId) =>
        loadedResource && layerId ? loadedResource.items[layerId] : undefined,
)

export const useCurrentPalettes = () =>
    useSelector(
        (state) => state.layer && state.loaded[0]?.items[state.layer]?.palettes,
    )
