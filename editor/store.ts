// this line gets remove by Organize Imports but we need it to suppress a TS build error
// import type * as rtx from '@reduxjs/toolkit'
import type * as rtx from '@reduxjs/toolkit'
import {
    PayloadAction as Payload,
    configureStore,
    createSlice,
} from '@reduxjs/toolkit'
import {
    useDispatch as useDispatchUntyped,
    useSelector as useSelectorUntyped,
} from 'react-redux'
import { cloneDeep } from 'lodash-es'

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
    boolean
>

/** Stuff related to the scene under edit */
export const sceneSlice = createSlice({
    name: 'scene',
    initialState: INITIAL_STATE,
    reducers: {
        loadScene(state, action: Payload<typeof INITIAL_STATE>) {
            return cloneDeep(action.payload)
        },
        setVisible(state, action: Payload<[id: UniqueID, visible: boolean]>) {
            state.nodes[action.payload[0]].visible = action.payload[1]
        },
        setCastShadow(
            state,
            { payload }: Payload<{ id: UniqueID; castShadow: boolean }>,
        ) {
            state.nodes[payload.id].castShadow = payload.castShadow
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
