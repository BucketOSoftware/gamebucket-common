import { PayloadAction, configureStore, createSlice } from '@reduxjs/toolkit'
import { TSchema } from '@sinclair/typebox'
import { Errors } from '@sinclair/typebox/errors'
import { Check, ValuePointer } from '@sinclair/typebox/value'
import {
    useDispatch as reduxUseDispatch,
    useSelector as reduxUseSelector,
} from 'react-redux'
import invariant from 'tiny-invariant'

import { Container, Spatial } from '../formats'
import * as rect from '../rect'
import { PaletteID } from './resource'
import { ToolID } from './types'

const PALETTES_MUTEX = true

export type EditableSubresource = Spatial.Editable<2, TSchema, any>
export type EditableResource = Container.Editable<EditableSubresource[]>
export type ElementID<S extends string | number = string | number> = S

export const designerSlice = createSlice({
    name: 'designer',

    initialState: { selected: { tool: 'select', attribs: {} }, loaded: [] } as {
        selected: {
            tool: ToolID
            attribs: Record<string, PaletteID>
            /** ID of the layer under edit */
            layer?: Container.ItemID
            /** If defined, viewport coordinates of the area currently being selected */
            marquee?: rect.Rect
        }

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
                draft.selected.attribs = { [attribute]: value }
            } else {
                draft.selected.attribs[attribute] = value
            }
        },

        selectTool: (draft, { payload }: PayloadAction<ToolID>) => {
            draft.selected.tool = payload
        },

        selectLayer: (
            draft,
            { payload }: PayloadAction<Container.ItemID | undefined>,
        ) => {
            draft.selected.layer = payload
        },

        selectMarquee: (
            draft,
            {payload}: PayloadAction<rect.Rect | undefined>,
        ) => {
            draft.selected.marquee = payload
        },

        /** apply currently selected palette attributes to the given elements in the selected layer */
        applyPalette: (draft, { payload: ids }: PayloadAction<ElementID[]>) => {
            invariant(
                Container.isItemID(draft.selected.layer!, draft.loaded[0]),
            )
            const layer = draft.loaded[0].items[draft.selected.layer!]

            const array = Array.isArray(layer.data) && layer.data
            const record = !Array.isArray(layer.data) && layer.data
            // TODO: coerce values to match layer schema?
            for (let id of ids) {
                const e =
                    typeof id === 'number'
                        ? array && array[id]
                        : record && record[id]
                invariant(e && typeof e === 'object', `Element ${id} not found`)

                Object.assign(e, draft.selected.attribs)
            }
        },

        editElement: (
            draft,
            {
                payload,
            }: PayloadAction<{
                layer: Container.ItemID
                id: ElementID
                /** JSON pointer.
                 * @see https://www.rfc-editor.org/rfc/rfc6901 */
                pointer: string
                value: unknown
            }>,
        ) => {
            const { id: elementId, layer: layerId, pointer, value } = payload

            const { schema, data } = draft.loaded[0].items[layerId]
            const element = data[elementId as keyof typeof data]

            invariant(
                element && typeof element === 'object',
                "Element doesn't exist",
            )

            ValuePointer.Set(element, pointer, value)
            if (!Check(schema, element)) {
                console.error(
                    'Invalid update to an element:',
                    Array.from(
                        Errors(schema, data[elementId as keyof typeof data]),
                    ),
                )
            }
        },

        open: (
            draft,
            { payload: resource }: PayloadAction<EditableResource>,
        ) => {
            // TODO: accept serialized form, convert to editable form.
            draft.loaded = [resource]
            draft.selected.layer = resource.itemOrder[0]
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
    editElement,
    selectLayer,
    selectTool,
    selectPalette,
    selectMarquee,
} = designerSlice.actions

// -----------------
//  Retrieving Data
// -----------------

export const useSelector = reduxUseSelector.withTypes<RootState>()

export const useSelectedLayer = () =>
    useSelector(
        (state) =>
            state.selected.layer &&
            state.loaded[0]?.items[state.selected.layer],
    )

export const useCurrentPalettes = () =>
    useSelector(
        (state) =>
            state.selected.layer &&
            state.loaded[0]?.items[state.selected.layer]?.palettes,
    )
