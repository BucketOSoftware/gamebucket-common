import { PayloadAction, configureStore, createSlice } from '@reduxjs/toolkit'
import { TSchema } from '@sinclair/typebox'
import { Errors } from '@sinclair/typebox/errors'
import { Check } from '@sinclair/typebox/value'
import get from 'lodash-es/get'
import set from 'lodash-es/set'
import {
    useDispatch as reduxUseDispatch,
    useSelector as reduxUseSelector,
} from 'react-redux'
import invariant from 'tiny-invariant'

import { ResourceType } from '../formats'
import { GVec, GVec2 } from '../geometry'
import * as rect from '../rect'
import {
    ElementKey,
    FlattenedResource,
    PaletteID,
    ResourceID,
    ScalarResource,
    SupportedDimension,
    elementAt,
    notContainer,
    positionInChunk,
    prepareContainer,
} from './types'

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

            /**
             * Elements that are to be modified by the user
             * @todo unfortunately element IDs are unique to the LAYER, but not globally...
             */
            elements?: ElementKey[]

            /** If defined, viewport coordinates of the area currently being selected */
            marquee?: rect.Rect
        }

        /** All loaded resources, which can reference children by ID */
        resources: Record<
            ResourceID,
            FlattenedResource<SupportedDimension, TSchema, any>
        >
        /** Which resource the editor is */
        root?: ResourceID
        /**
         * @todo Future expansion: multiple distinct roots can be loaded but not edited at the same time
         */
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
                [layer: ResourceID | undefined, elements: ElementKey[]]
            >,
        ) => {
            // TODO: require the layer ID
            if (layer) {
                draft.selected.layer = layer
            }
            draft.selected.elements = elements
        },

        /** apply currently selected palette attributes to the given elements in the selected layer */
        applyPalette: (
            draft,
            { payload: keys }: PayloadAction<ElementKey[]>,
        ) => {
            const layer = getSelectedLayer(draft)
            invariant(layer, 'No layer selected')

            invariant('chunks' in layer)
            if ('chunks' in layer) {
                for (let key of keys) {
                    // getele
                    // const [ox, oy, i] = globalToChunked(key)
                    invariant(Array.isArray(key), key.toString())
                    const e = elementAt(layer, key)
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

        editElemente: (
            draft,
            {
                payload: { key, path, value, layer: layerID },
            }: PayloadAction<{
                path: string[]
                value: unknown
                key: ElementKey
                layer?: ResourceID
            }>,
        ) => {
            // TODO: check type as well?
            // invariant(
            //     Array.isArray(draft.selected.elements),
            //     "Can't edit a rect or undefined",
            // )

            // if (limit !== undefined) {
            //     invariant(
            //         draft.selected.elements.length <= limit,
            //         'Too many selected',
            //     )
            // }

            const layer = layerID
                ? draft.resources[layerID]
                : getSelectedLayer(draft)
            invariant(layer && 'schema' in layer, 'Invalid layer')

            const element = elementAt(layer, key)
            invariant(typeof element === 'object')

            console.debug('Setting:', element, path, value)
            set(element, path, value)

            if (!Check(layer.schema, element)) {
                console.error(
                    'Invalid update to an element:',
                    Array.from(Errors(layer.schema, element)),
                )
            }
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
    editElemente,
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

export function getSelectedLayer(
    state: Readonly<RootState>,
): ScalarResource<2, TSchema> | undefined {
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
