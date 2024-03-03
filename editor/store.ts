// this import declaration is to silence some odd build errors...
import type * as rtx from '@reduxjs/toolkit'
// ...and this is to keep "Organize Imports" or other tools from removing that import
if (false) {
    const doNothing: () => rtx.Action | undefined = () => undefined
}

import {
    PayloadAction as Payload,
    configureStore,
    createSlice,
} from '@reduxjs/toolkit'
import { cloneDeep } from 'lodash-es'
import {
    useDispatch as useDispatchUntyped,
    useSelector as useSelectorUntyped,
} from 'react-redux'

import { SerializedNode, UniqueID } from '../scenebucket'

const INITIAL_STATE = {
    roots: [] as UniqueID[],
    nodes: {} as Record<UniqueID, SerializedNode>,
}

// TODO: librarify
type KeysOfType<T, ValueType> = {
    [K in keyof T]: T[K] extends ValueType ? K : never
}[keyof T]

type OnlyKeysOfType<T, ValueType> = Omit<
    T,
    Exclude<keyof T, KeysOfType<T, ValueType>>
>

/** Properties of a node that can be toggled, i.e. booleans */
export type NodeTogglableProperties = keyof OnlyKeysOfType<
    SerializedNode,
    boolean | null // this seems like it has to exactly match what's in SerializedNode -- maybe it's best to just list them out
>

/** Stuff related to the scene under edit */
export const sceneSlice = createSlice({
    name: 'scene',
    initialState: INITIAL_STATE,
    reducers: {
        loadScene(_state, action: Payload<typeof INITIAL_STATE>) {
            return cloneDeep(action.payload)
        },
        /** Redux Best Practices tells us not to do this because we should be
         * basing these on actions the user takes -- but in this case that's
         * what this is!
         */

        toggleProperty(
            state,
            {
                payload: { id, property, value },
            }: Payload<{
                id: UniqueID
                property: NodeTogglableProperties
                value: boolean
            }>,
        ) {
            state.nodes[id][property] = value
        },
    },
    extraReducers: undefined, // for listening to actions not defined here
})

export const uiSlice = createSlice({
    name: 'ui',
    initialState: { selected: undefined as UniqueID | undefined },
    reducers: {
        selectNode(state, action: Payload<UniqueID | undefined>) {
            state.selected = action.payload
        },
    },
})

export const createStore = () =>
    configureStore({
        reducer: {
            ui: uiSlice.reducer,
            scene: sceneSlice.reducer,
        },
    })

export const { loadScene, toggleProperty } = sceneSlice.actions
export const { selectNode } = uiSlice.actions

type StoreType = ReturnType<typeof createStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<StoreType['getState']>
export type AppDispatch = StoreType['dispatch']

export const useDispatch = useDispatchUntyped.withTypes<AppDispatch>()
export const useSelector = useSelectorUntyped.withTypes<RootState>()
