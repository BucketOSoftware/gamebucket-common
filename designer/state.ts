import { produce } from 'immer'
import debounce from 'lodash-es/debounce'
import { createContext, useContext, useSyncExternalStore } from 'react'
import invariant from 'tiny-invariant'

import { Resource, ResourceType, ToolID } from './types'

function defaultState() {
    return {
        openResources: [] as Resource[],
        activeResource: undefined as Resource | undefined,

        // currentLayer: '',
        // currentTool: {} as Record<ResourceType, ToolID>,
        currentTool: {
            object_list: 'select',
            tile_map: 'draw',
            continuous_map: 'draw',
        } as Record<ResourceType, ToolID>,

        canvas: null as HTMLCanvasElement | null,
    }
}

type DesignerState = ReturnType<typeof defaultState>

export class StateStore {
    private state = produce(defaultState(), () => {})

    get canvas() {
        return this.state.canvas
    }

    subscribers = new Set<() => void>()

    subscribe = (onStoreChange: () => void) => {
        this.subscribers.add(onStoreChange)
        return () => {
            this.subscribers.delete(onStoreChange)
        }
    }

    getSnapshot = () => this.state

    createSelector<T = unknown>(selector: (st: DesignerState) => T) {
        return () => selector(this.state)
    }

    update = (callback: (draft: DesignerState) => void | DesignerState) => {
        // TODO?: rollback to old state if the validation fails
        // const oldState = this.state
        this.state = produce(this.state, callback)
        validate(this.state)
        this.notify()
    }

    private notify = debounce(() => {
        for (let s of this.subscribers) {
            s()
        }
    }, 1000 / 60)
}

function validate(state: DesignerState) {
    const labels = state.openResources.map((n) => n.label)
    const uniqLabels = new Set(labels)
    invariant(
        labels.length === uniqLabels.size,
        "Isn't it time we came up with a unique ID system",
    )
}

export const DesignerContext = createContext(new StateStore())
// const getAll = (st: DesignerStateType) => st

export function useStore() {
    return useSelector((x) => x)
}

export function useSelector<T>(selector: (st: DesignerState) => T) {
    const store = useContext(DesignerContext)
    return useSyncExternalStore(store.subscribe, store.createSelector(selector))
}

export function useUpdate() {
    return useContext(DesignerContext).update
}
