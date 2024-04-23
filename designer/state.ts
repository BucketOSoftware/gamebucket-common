import { TSchema, ValueGuard } from '@sinclair/typebox'
import { Edit } from '@sinclair/typebox/value'
import { enableMapSet, produce } from 'immer'
import debounce from 'lodash-es/debounce'
import { createContext, useContext, useSyncExternalStore } from 'react'
import invariant from 'tiny-invariant'

import { LAYER_TYPES, LayerType } from '../formats'

import { GesturePhase, GestureState, phaseFromGesture } from './gestures'
import { Resource as DesignerResource, ResourceAdapter } from './resource'
import { Palette, PaletteID, ToolID } from './types'

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

        /** TBD */
        ongoingGesture: undefined as unknown,

        /** True if the current tool can't be used (no item selected, wrong layer type, etc.) */
        toolBroken: false,

        /** Objects returned by a hover gesture */
        hover: [] as Readonly<unknown[]>,

        /** Independent of active layer or what have you */
        selection: [] as Readonly<unknown[]>,

        canvas: null as HTMLCanvasElement | null,
    }
}

type DesignerState = ReturnType<typeof defaultState>

type DispatchActions = 'select' /*| 'hover' */

export interface ToolContext<T = any> {
    paletteItem: PaletteID
    userData: T
    dispatch: (type: DispatchActions, ...args: any[]) => void
}

export class StateStore {
    constructor(public readonly userData: any) {
        this.toolContext.userData = userData
    }

    get canvas() {
        return this.state.canvas
    }

    subscribe = (onStoreChange: () => void) => {
        this.subscribers.add(onStoreChange)

        return () => this.subscribers.delete(onStoreChange)
    }
    getSnapshot = () => this.state

    createSelector<T = unknown>(selector: (st: Readonly<DesignerState>) => T) {
        return () => selector(this.state)
    }

    /** Anything that needs to be reactive has to go in here */
    private state = produce(defaultState(), () => {})

    /** Info sent to resources about the state of the designer */
    private toolContext: ToolContext = {
        paletteItem: NaN as PaletteID,
        userData: null,
        dispatch: (type, ...args: any[]) => {
            this.queuedActions.push([type, args])
        },
    }
    private subscribers = new Set<() => void>()

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

    private notifySubscribers = debounce(() => {
        for (let s of this.subscribers) {
            s()
        }
    }, 1000 / 60)

    private queuedActions: any[] = []
    private drainQueue() {
        requestAnimationFrame(this.actuallyDrainQueue)
    }

    private actuallyDrainQueue = () => {
        if (!this.queuedActions.length) {
            return
        }

        this.update((draft) => {
            for (let action of this.queuedActions) {
                const [type, [arg, ...rest]] = action as [
                    DispatchActions,
                    any[],
                ]

                switch (type) {
                    case 'select':
                        invariant(ValueGuard.IsArray(arg))
                        draft.selection = arg
                }
            }
        })

        this.queuedActions.length = 0
    }

    /** Apply the given patch to the selected object(s) according to the current layer's update logic.
     * @todo A little concerned about the layer and selection being implicit */
    patchElement = (patch: Edit[]) => {
        const {
            toolContext,
            state: { activeLayer, selection },
        } = this

        const callback = activeLayer?.toolCallbacks.update

        invariant(activeLayer, 'No layer selected')
        invariant(
            selection.length === 1,
            'TODO: multiselect. Too many or too few elements selected',
        )
        invariant(callback, 'Selected layer does not support edits')

        // TODO: multiselect
        callback(selection[0], patch, toolContext)
    }

    private ongoingPhase: GesturePhase | undefined
    handleGesture = <G extends 'move' | 'drag'>(
        gesture: GestureState<G>,
        type: G,
    ) => {
        const {
            toolContext,
            state: { activeLayer, currentTool, activePaletteItem },
        } = this

        invariant(activeLayer, 'No layer selected')

        const tool = currentTool[activeLayer.type]
        const item = activePaletteItem.get(activeLayer.palette)
        const callback = activeLayer.toolCallbacks[tool]

        invariant(tool, 'No tool selected')
        invariant(item, 'No palette item')

        const phase = phaseFromGesture(type, gesture, this.ongoingPhase)

        if (callback && phase) {
            switch (phase) {
                case GesturePhase.DragCommit:
                case GesturePhase.Tap:
                    this.ongoingPhase = undefined
                    break
                case GesturePhase.DragStart:
                    this.ongoingPhase = phase
                    break
                case GesturePhase.DragContinue:
                    invariant(this.ongoingPhase === GesturePhase.DragStart)
                    break
                default:
                    invariant(
                        !this.ongoingPhase,
                        "I didn't understand this code enough I guess",
                    )
            }

            toolContext.paletteItem = item

            const memo = callback(phase, gesture, toolContext)
            this.drainQueue()
            return memo
        } else {
            // We don't have a handler for the gesture, or we should ignore it
            // This will effectively clobber the memo by not returning anything,
            // but that's fine?

            // TODO: examine this behavior
            if ('cancel' in gesture) {
                invariant(typeof gesture.cancel === 'function')
                gesture.cancel()
                console.debug('Canceling:', gesture)
            }
        }
    }
}

function validate(state: DesignerState) {
    const labels = state.activeResource?.layers.map((n) => n.displayName) ?? []
    const uniqLabels = new Set(labels)
    invariant(
        labels.length === uniqLabels.size,
        "Isn't it time we came up with a unique ID system",
    )
}

export const DesignerContext = createContext(new StateStore(undefined))

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

export function usePatch() {
    return useContext(DesignerContext).patchElement
}

export function useGestureHandler() {
    return useContext(DesignerContext).handleGesture
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
            !!state.activeLayer?.toolCallbacks.create,
        supportsDraw: (state: Readonly<DesignerState>) =>
            !!state.activeLayer?.toolCallbacks.draw,
        supportsSelect: (state: Readonly<DesignerState>) =>
            !!state.activeLayer?.toolCallbacks.select,
        supportsUpdate: (state: Readonly<DesignerState>) =>
            !!state.activeLayer?.toolCallbacks.update,
    },

    selection: {
        single: (state: Readonly<DesignerState>) =>
            state.selection.length === 1 ? state.selection[0] : undefined,
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
