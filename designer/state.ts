import { TSchema } from '@sinclair/typebox'
import { enableMapSet, produce } from 'immer'
import debounce from 'lodash-es/debounce'
import { createContext, useContext, useSyncExternalStore } from 'react'
import invariant from 'tiny-invariant'

import { LAYER_TYPES, LayerType } from '../formats'

import { GESTURE_PHASE, GestureInfo } from './gestures'
import {
    Resource as DesignerResource,
    Palette,
    PaletteID,
    ResourceAdapter,
    ToolID,
} from './types'

enableMapSet()

function defaultState() {
    return {
        openResources: [] as DesignerResource[],
        activeResource: undefined as DesignerResource | undefined,
        // TODO: need to get ready for the active resource to not be spatial!
        activeLayer: undefined as ResourceAdapter<TSchema> | undefined,

        activePaletteItem: new Map<Palette, PaletteID>(),

        // TODO: load from localStorage?
        currentTool: {
            [LAYER_TYPES.ENTITY_LIST]: 'select',
            [LAYER_TYPES.TILE_MAP]: 'draw',
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
            draft.activeLayer = resource.layers[0]

            // set some defaults so we don't have to deal with nulls
            for (let layer of resource.layers) {
                draft.activePaletteItem.set(
                    layer.palette,
                    Object.keys(layer.palette)[0],
                )
            }
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

    handleMouseInput = (gesture: GestureInfo) => {
        invariant(gesture.phase)
        invariant(gesture.to)

        const { activeLayer, currentTool, activePaletteItem } = this.state

        if (!activeLayer) {
            return console.warn('No layer selected and/or no tool selected')
        }

        const tool = currentTool[activeLayer.type]
        if (!tool) {
            return console.warn('No tool selected')
        }

        this.update((draft) => {
            draft.toolBroken = false

            const item = activePaletteItem.get(activeLayer.palette)

            switch (tool) {
                case 'draw':
                    invariant(activeLayer.callbacks.draw)
                    invariant(item)
                    if (!activePaletteItem) {
                        draft.toolBroken = true
                        break
                    }
                    // TODO: draw a line from the last point to this one
                    activeLayer.callbacks.draw(gesture, item)
                    break
                case 'select':
                    invariant(activeLayer.callbacks.select)
                    const selection = activeLayer.callbacks.select(
                        gesture,
                        this.toolCallback,
                    )

                    if (selection !== undefined) {
                        invariant(Array.isArray(selection))
                        if (gesture.phase === GESTURE_PHASE.HOVER) {
                            draft.hover = selection
                        } else {
                            draft.selection = selection
                        }
                    }

                    break
                case 'create':
                    invariant(activeLayer.callbacks.create)
                    invariant(item)
                    // TODO: provide more feedback that a create has happened. Onscreen log?
                    if (!activePaletteItem) {
                        draft.toolBroken = true
                        // return
                        break
                    }

                    activeLayer.callbacks.create(gesture, item)
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
        get: (state: Readonly<DesignerState>) =>
            (state.activeLayer ?? {
                type: '',
            }) as unknown as ResourceAdapter<TSchema>,

        palette: (state: Readonly<DesignerState>) => state.activeLayer?.palette,

        supportsCreate: (state: Readonly<DesignerState>) =>
            !!state.activeLayer?.callbacks.create,
        supportsDraw: (state: Readonly<DesignerState>) =>
            !!state.activeLayer?.callbacks.draw,
        supportsSelect: (state: Readonly<DesignerState>) =>
            !!state.activeLayer?.callbacks.select,
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
            return [toolClass, broken, dragging || hovering].join(' ')
        },
    },
} as const)

function verifySelectors<T extends SelectorBag>(bag: T): T {
    return bag
}
