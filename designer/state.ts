import { produce } from 'immer'
import debounce from 'lodash-es/debounce'
import { createContext, useContext, useSyncExternalStore } from 'react'
import invariant from 'tiny-invariant'

import * as rect from '../rect'
import { GesturePhase } from './gestures'
import { Resource, ResourceType, ToolID } from './types'

import { TSchema } from '@sinclair/typebox'

function defaultState<P extends TSchema>() {
    return {
        openResources: [] as Resource<P>[],
        activeResource: undefined as Resource<P> | undefined,

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
        this.notifySubscribers()
    }

    handleMouseInput = (
        phase: GesturePhase,
        viewport_x: number,
        viewport_y: number,
        begin_x: number,
        begin_y: number,
        originalEvent: MouseEvent,
    ) => {
        const { activeResource, currentTool } = this.state
        if (!activeResource) {
            return console.warn(
                'No layer selected and/or no tool selected',
                originalEvent,
            )
        }

        const tool = currentTool[activeResource.type]
        if (!tool) {
            return console.warn('No tool selected', originalEvent)
        }

        const item = 97
        const dragArea = rect.fromCorners(
            viewport_x,
            viewport_y,
            Number.isNaN(begin_x) ? viewport_x : begin_x,
            Number.isNaN(begin_y) ? viewport_y : begin_y,
        )

        switch (tool) {
            case 'draw':
                invariant('plot' in activeResource)
                // TODO: draw a line from the last point to this one
                activeResource.plot(phase, viewport_x, viewport_y, item)
                break
            case 'select':
                invariant('select' in activeResource)
                console.log(activeResource.select(phase, dragArea))
                break
            default:
                console.warn('TODO:', tool)
        }
    }

    private notifySubscribers = debounce(() => {
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

export function useMouse() {
    return useContext(DesignerContext).handleMouseInput
}

export const selectors = {
    activeResource: {
        is: (type: ResourceType) => {
            return useSelector((st) => st.activeResource?.type) === type
        },
    },
}
