import { PayloadAction, configureStore, createSlice } from '@reduxjs/toolkit'
import { Errors } from '@sinclair/typebox/errors'
import { Check, ValuePointer } from '@sinclair/typebox/value'
import {
    useDispatch as reduxUseDispatch,
    useSelector as reduxUseSelector,
} from 'react-redux'
import invariant from 'tiny-invariant'
import { Dictionary } from 'ts-essentials'

import { GVec2 } from '../geometry'
import * as rect from '../rect'
import {
    ElementID,
    LoadableResource,
    PaletteID,
    ResourceID,
    prepareContainer,
} from './types'
import { ResourceType } from '../formats'
import { TSchema } from '@sinclair/typebox'

const PALETTES_MUTEX = true

export const designerSlice = createSlice({
    name: 'designer',

    // TODO: remove the need for a default tool, so the toolset can be customizable?
    initialState: {
        selected: {
            tool: {
                [ResourceType.SpatialDense2D]: 'plot',
                [ResourceType.SpatialSparse2D]: 'select',
            },
            attribs: {},
        },
        resources: {},
        roots: [],
    } as {
        selected: {
            /**
             * Last point the pointer was at and not doing anything, in
             * viewport coordinates, or undefined if the pointer is outside the
             * viewport or mid-gesture.
             */
            hover?: boolean

            /**
             * currently active tool.
             * @todo Type checking?
             */
            tool: Partial<Record<ResourceType, string>>

            /** items selected from the palette */
            attribs: Record<string, PaletteID>
            /** ID of the layer under edit */
            layer?: ResourceID

            /** Area selected OR elements selected
             * @todo unfortunately element IDs are unique to the LAYER, but not globally...
             */
            elements?: rect.Rect | ElementID[]

            /** If defined, viewport coordinates of the area currently being selected */
            marquee?: rect.Rect
        }

        /** All loaded resources, which can reference children by ID */
        resources: Record<ResourceID, LoadableResource<TSchema, any>>
        /** Which resource the editor is */
        root?: ResourceID
        /** Future expansion: multiple distinct roots can be loaded but not edited at the same time */
        roots: ResourceID[]
    },

    reducers: {
        selectPalette: (
            draft,
            {
                payload: [attribute, value],
            }: PayloadAction<[string | undefined, any]>,
        ) => {
            invariant(attribute, 'TODO: single-attribute layers')
            if (PALETTES_MUTEX) {
                draft.selected.attribs = { [attribute]: value }
            } else {
                draft.selected.attribs[attribute] = value
            }
        },

        selectTool: (draft, { payload }: PayloadAction<string>) => {
            invariant(draft.selected.layer, 'No layer selected')
            const restype = draft.resources[draft.selected.layer].type
            draft.selected.tool[restype] = payload
        },

        selectLayer: (
            draft,
            { payload }: PayloadAction<ResourceID | undefined>,
        ) => {
            draft.selected.layer = payload
        },

        selectMarquee: (
            draft,
            { payload }: PayloadAction<rect.Rect | undefined>,
        ) => {
            draft.selected.marquee = payload
        },

        selectElements: (
            draft,
            {
                payload: [layer, elements],
            }: PayloadAction<
                [layer: ResourceID | undefined, elements: ElementID[]]
            >,
        ) => {
            if (layer) {
                // TODO: this is very iffy
                draft.selected.layer = layer
            }
            draft.selected.elements = elements
        },

        /** apply currently selected palette attributes to the given elements in the selected layer */
        applyPalette: (draft, { payload: ids }: PayloadAction<ElementID[]>) => {
            /*
            const layer =
                draft.loaded[0].items[draft.selected.layer as ResourceID]
            // TODO: this is how we do it
            if ('chunks' in layer) {
                layer.chunks[0][-32][0] = 3
            } else {
                const array = Array.isArray(layer.items) && layer.items
                const record = !Array.isArray(layer.items) && layer.items
            }
            // TODO: coerce values to match layer schema?
            for (let id of ids) {
                const e =
                    typeof id === 'number'
                        ? array && array[id]
                        : record && record[id]
                invariant(e && typeof e === 'object', `Element ${id} not found`)

                Object.assign(e, draft.selected.attribs)
            }
            */
        },

        editElement: (
            draft,
            {
                payload,
            }: PayloadAction<{
                layer: ResourceID
                id: ElementID
                /** JSON pointer.
                 * @see https://www.rfc-editor.org/rfc/rfc6901 */
                pointer: string
                value: unknown
            }>,
        ) => {
            console.warn('TODO')
            /*
            const { id: elementId, layer: ResourceID, pointer, value } = payload

            const { schema, items, chunks } = draft.loaded[0].items[ResourceID]
            const element = items[elementId as keyof typeof items]

            ValuePointer.Set(element, pointer, value)
            if (!Check(schema, element)) {
                console.error(
                    'Invalid update to an element:',
                    Array.from(
                        Errors(schema, data[elementId as keyof typeof data]),
                    ),
                )
            }
            */
        },

        editSelectedElements: (
            draft,
            {
                payload: { pointer, value },
            }: PayloadAction<{
                pointer: string
                value: unknown
                limit?: number
            }>,
        ) => {
            /*
            // TODO: check type as well?
            invariant(
                Array.isArray(draft.selected.elements),
                "Can't edit a rect or undefined",
            )

            const layer = getSelectedLayer(draft)
            invariant(layer, 'Layer not found')

            const elementId = draft.selected.elements[0]
            const element = layer.items[elementId as keyof typeof layer.items]
            invariant(element, 'Element not found')
            // ValuePointer.Get(
            ValuePointer.Set(element, pointer, value)
            */
        },

        open: (
            draft,
            { payload: resource }: PayloadAction<any>, //LoadableResource<TSchema, unknown>
        ) => {
            const [resources, root] = prepareContainer(resource)
            draft.resources = resources
            draft.root = root
            draft.roots = [root]

            console.log('DONE', resources)
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
    editSelectedElements,
    selectElements,
    selectLayer,
    selectTool,
    selectPalette,
    selectMarquee,
} = designerSlice.actions

// -----------------
//  Retrieving Data
// -----------------

export const useSelector = reduxUseSelector.withTypes<RootState>()

export const getSelectedLayer = (state: Readonly<RootState>) =>
    state.selected.layer && state.resources[state.selected.layer]

export const useSelectedLayer = () =>
    useSelector((state) => getSelectedLayer(state))

export const useCurrentPalettes = () => undefined // useSelector((state) => getSelectedLayer(state)?.palettes)
