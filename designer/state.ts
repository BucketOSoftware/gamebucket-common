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
import { TYPES } from '../formats'

function defaultState() {
    return {
        openResources: [] as DesignerResource[],
        activeResource: undefined as DesignerResource | undefined,
        // TODO: need to get ready for the active resource to not be spatial!
        activeLayer: undefined as ResourceLayer<TSchema> | undefined,

        activePaletteItem: null as PaletteID | null,

        // TODO: load from localStorage?
        currentTool: {
            [TYPES.entityList]: 'select',
            [TYPES.tileMap]: 'draw',
            continuous_map: 'draw',
        } as Record<LayerType, ToolID>,

        /** True if a UI drag is ongoing */
        dragging: false,

        /** True if the current tool can't be used (no item selected, wrong layer type, etc.) */
        toolBroken: false,

        /** Objects returned by a hover gesture */
        hover: [] as Readonly<any[]>,

        /** Independent of active layer or what have you */
        selection: [] as Readonly<any[]>,

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

    createSelector<T = unknown>(selector: (st: Readonly<DesignerState>) => T) {
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

        // TODO: act as if no area when drag area is too small
        const dragArea = rect.fromCorners(
            viewport_x,
            viewport_y,
            Number.isNaN(begin_x) ? viewport_x : begin_x,
            Number.isNaN(begin_y) ? viewport_y : begin_y,
        )

        this.update((draft) => {
            draft.dragging = phase === 'gesture.continue'
            draft.toolBroken = false

            switch (tool) {
                case 'draw':
                    invariant('plot' in activeLayer)
                    if (!activePaletteItem) {
                        draft.toolBroken = true
                        break
                    }

                    // TODO: draw a line from the last point to this one
                    activeLayer.plot(
                        phase,
                        viewport_x,
                        viewport_y,
                        activePaletteItem,
                    )
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
                        if (phase === GESTURE_PHASE.HOVER) {
                            draft.hover = selection
                        } else {
                            draft.selection = selection
                        }
                        console.log(selection)
                    }

                    break
                case 'create':
                    invariant('create' in activeLayer)
                    // TODO: provide more feedback that a create has happened. Onscreen log?
                    if (!activePaletteItem) {
                        draft.toolBroken = true
                        break
                    }

                    if (phase === GESTURE_PHASE.START) {
                        activeLayer.create(
                            viewport_x,
                            viewport_y,
                            activePaletteItem,
                        )
                    }
                    break
                default:
                    console.warn('TODO:', tool)
            }
        })
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

export function useSelector<T>(selector: (st: Readonly<DesignerState>) => T) {
    const store = useContext(DesignerContext)
    return useSyncExternalStore(store.subscribe, store.createSelector(selector))
}

export function useUpdate() {
    return useContext(DesignerContext).update
}

export function useMouse() {
    return useContext(DesignerContext).handleMouseInput
}

type SelectorFn<R> = (state: Readonly<DesignerState>) => R
type SelectorHigherOrderFn<R> = (...args: any[]) => SelectorFn<R>
interface SelectorBag<R = unknown> {
    [k: string]: SelectorBag<R> | SelectorFn<R> | SelectorHigherOrderFn<R>
}

export const selectors = verifySelectors({
    activeLayer: {
        is: (type: LayerType) => (state: Readonly<DesignerState>) =>
            state.activeLayer?.type === type,

        palette: (state: Readonly<DesignerState>) => state.activeLayer?.palette,
    },

    tool: {
        classes: (state: Readonly<DesignerState>) => {
            const lay = state.activeLayer
            let toolClass = lay
                ? 'gbk-tool-' + state.currentTool[lay.type]
                : 'gbk-tool-none'

            let broken = state.toolBroken ? 'gbk-tool-no-use' : undefined
            let dragging = state.dragging ? 'gbk-tool-dragging' : undefined
            let hovering = state.hover.length ? 'gbk-tool-hovering' : undefined

            // not sure if this will come up, but dragging takes precedence
            // over hovering
            const c = [toolClass, broken, dragging || hovering].join(' ')
            console.warn('c', c)
            return c
        },
    },
} as const)

function verifySelectors<T extends SelectorBag>(bag: T): T {
    return bag
}
