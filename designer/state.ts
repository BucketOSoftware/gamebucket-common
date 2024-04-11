import { TSchema } from '@sinclair/typebox'
import { produce } from 'immer'
import debounce from 'lodash-es/debounce'
import { createContext, useContext, useSyncExternalStore } from 'react'
import invariant from 'tiny-invariant'

import * as rect from '../rect'

import { GESTURE_PHASE, GesturePhase } from './gestures'
import {
    Resource as DesignerResource,
    LayerType,
    Palette,
    PaletteID,
    ResourceLayer,
    ToolID,
} from './types'

function defaultState() {
    return {
        openResources: [] as DesignerResource[],
        activeResource: undefined as DesignerResource | undefined,
        // TODO: need to get ready for the active resource to not be spatial!
        activeLayer: undefined as ResourceLayer<TSchema> | undefined,

        activePaletteItem: null as PaletteID | null,

        // TODO: load from localStorage?
        currentTool: {
            ['resource/spatial2d/entity_list']: 'select',
            ['resource/spatial2d/tile_map']: 'draw',
            continuous_map: 'draw',
        } as Record<LayerType, ToolID>,

        /** Independent of active layer or what have you */
        selection: [] as any[],

        canvas: null as HTMLCanvasElement | null,
        overlay: null as HTMLCanvasElement | null,
    }
}

type DesignerState = ReturnType<typeof defaultState>

export type RenderCallback = (store: StateStore) => void

export class StateStore {
    private state = produce(defaultState(), () => {})

    get canvas() {
        return this.state.canvas
    }

    get overlay() {
        return this.state.overlay
    }

    private subscribers = new Set<() => void>()

    subscribe = (onStoreChange: () => void) => {
        this.subscribers.add(onStoreChange)

        return () => this.subscribers.delete(onStoreChange)
    }

    private renderFns: RenderCallback[] = []
    private toolCallback = (
        enqueueRender: (store: StateStore) => void = () => {},
    ) => {
        this.renderFns = [enqueueRender]
    }

    renderViewport() {
        for (let cb of this.renderFns) {
            cb(this)
        }
    }

    getSnapshot = () => this.state

    createSelector<T = unknown>(selector: (st: DesignerState) => T) {
        return () => selector(this.state)
    }

    // ------
    //  Actions/Dispatch
    // ------

    open(resource: DesignerResource) {
        // TODO: enqueue this instead of doing it right away?
        this.update((draft) => {
            draft.openResources = [resource]
            draft.activeResource = draft.openResources[0]
        })
    }

    // ------

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
        const { activeLayer, currentTool, activePaletteItem } = this.state
        if (!activeLayer) {
            return console.warn(
                'No layer selected and/or no tool selected',
                originalEvent,
            )
        }

        const tool = currentTool[activeLayer.type]
        if (!tool) {
            return console.warn('No tool selected', originalEvent)
        }

        const dragArea = rect.fromCorners(
            viewport_x,
            viewport_y,
            Number.isNaN(begin_x) ? viewport_x : begin_x,
            Number.isNaN(begin_y) ? viewport_y : begin_y,
        )

        switch (tool) {
            case 'draw':
                invariant('plot' in activeLayer)
                try {
                    invariant(
                        activePaletteItem,
                        'TODO: disable tool cursor / show feedback if no item is selected',
                    )

                    // TODO: draw a line from the last point to this one
                    activeLayer.plot(
                        phase,
                        viewport_x,
                        viewport_y,
                        activePaletteItem,
                    )
                } catch (e) {
                    console.error(e)
                }
                break
            case 'select':
                invariant('select' in activeLayer)
                const selection = activeLayer.select(
                    phase,
                    dragArea,
                    this.toolCallback,
                )
                if (selection !== undefined) {
                    invariant(Array.isArray(selection))
                    this.update((state) => {
                        state.selection = selection
                        console.log(selection)
                    })
                }

                break
            case 'create':
                invariant('create' in activeLayer)
                console.log(phase)
                try {
                    invariant(
                        activePaletteItem,
                        'TODO: disable tool cursor/whatever when no item is selected',
                    )

                    if (phase === GESTURE_PHASE.START) {
                        activeLayer.create(
                            viewport_x,
                            viewport_y,
                            activePaletteItem,
                        )
                    }
                } catch (e) {
                    console.error(e)
                }
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
    const labels = state.openResources.map((n) => n.displayName)
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
    activeLayer: {
        is: (type: LayerType) => {
            return useSelector((state) => state.activeLayer?.type) === type
        },
        palette: () => {
            return useSelector((state) => {
                return state.activeLayer?.palette as Palette | undefined
            })
        },
    },
}
