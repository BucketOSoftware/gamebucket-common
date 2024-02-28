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

export const { loadScene, setVisible } = sceneSlice.actions
export const { selectNode } = uiSlice.actions

type StoreType = ReturnType<typeof createStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<StoreType['getState']>
export type AppDispatch = StoreType['dispatch']

export const useDispatch = useDispatchUntyped.withTypes<AppDispatch>()
export const useSelector = useSelectorUntyped.withTypes<RootState>()
