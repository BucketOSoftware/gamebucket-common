import { PayloadAction, configureStore, createSlice } from '@reduxjs/toolkit'
import { TSchema } from '@sinclair/typebox'
import { Errors } from '@sinclair/typebox/errors'
import { Check, ValuePointer } from '@sinclair/typebox/value'
import get from 'lodash-es/get'
import {
    useDispatch as reduxUseDispatch,
    useSelector as reduxUseSelector,
} from 'react-redux'
import invariant from 'tiny-invariant'

import { ResourceType } from '../formats'
import { GVec, GVec2 } from '../geometry'
import * as rect from '../rect'
import {
    ElementID,
    LoadableResource,
    PaletteID,
    ResourceID,
    positionInChunk,
    prepareContainer,
} from './types'
import { set } from 'lodash-es'

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
        applyPalette: (
            draft,
            { payload: elements }: PayloadAction<GVec<2>[] | ElementID[]>,
        ) => {
            const layer = getSelectedLayer(draft)
            invariant(layer, 'No layer selected')

            // TODO: this is how we do it
            invariant('chunks' in layer)
            if ('chunks' in layer) {
                for (let pos of elements) {
                    invariant(typeof pos === 'object')

                    // layer.chunks[0][-32][0] = 3
                    const [ox, oy, i] = positionInChunk(
                        pos as GVec2,
                        layer.bounds,
                        layer.chunkSize,
                    )
                    const e = layer.chunks[ox][oy][i]
                    // layer.chunks[0][-32][0] = 3
                    invariant(
                        e && typeof e === 'object',
                        `Element at ${pos} not found`,
                    )

                    Object.assign(e, draft.selected.attribs)
                }
            } else {
                invariant('TODO')
                /*
                const array = Array.isArray(layer.items) && layer.items
                const record = !Array.isArray(layer.items) && layer.items
                // TODO: coerce values to match layer schema?
                for (let id of elements) {
                    const e =
                        typeof id === 'number'
                            ? array && array[id]
                            : record && record[id]
                    invariant(
                        e && typeof e === 'object',
                        `Element ${id} not found`,
                    )

                    Object.assign(e, draft.selected.attribs)
                    */
            }
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
            const { id: elementId, layer: layerID, pointer, value } = payload

            const layer = draft.resources[layerID]
            invariant('schema' in layer)
            invariant('data' in layer)
            const { schema, data } = layer
            const element = get(layer.data, elementId as keyof typeof data)

            // ValuePointer.Set(element, pointer, value)
            if (!Check(schema, element)) {
                console.error(
                    'Invalid update to an element:',
                    Array.from(
                        Errors(schema, data[elementId as keyof typeof data]),
                    ),
                )
            }
        },

        editSelectedElements: (
            draft,
            {
                payload: { path, value, limit },
            }: PayloadAction<{
                path: string
                value: unknown
                limit?: number
            }>,
        ) => {
            // TODO: check type as well?
            invariant(
                Array.isArray(draft.selected.elements),
                "Can't edit a rect or undefined",
            )

            if (limit !== undefined) {
                invariant(
                    draft.selected.elements.length <= limit,
                    'Too many selected',
                )
            }

            const layer = getSelectedLayer(draft)
            invariant(layer, 'Layer not found')

            const element = get(layer, draft.selected.elements[0])
            set(element, path, value)

            if (!Check(layer.schema, element)) {
                console.error(
                    'Invalid update to an element:',
                    Array.from(Errors(layer.schema, element)),
                )
            }
            // const elementId = draft.selected.elements[0]

            // const element = layer.items[elementId as keyof typeof layer.items]
            // invariant(element, 'Element not found')
            // ValuePointer.Set(element, pointer, value)
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

export function getSelectedLayer(state: Readonly<RootState>) {
    const layer = state.selected.layer && state.resources[state.selected.layer]
    if (layer && layer.type !== ResourceType.Container) {
        return layer
    }
}

/** Returns  */
export const useSelectedLayer = () =>
    useSelector((state) => getSelectedLayer(state))

export const useCurrentPalettes = () =>
    useSelector((state) => {
        const layer = getSelectedLayer(state)
        if (layer && 'palettes' in layer) {
            // console.log('uh oh', layer)
            return layer.palettes
        }
    })
