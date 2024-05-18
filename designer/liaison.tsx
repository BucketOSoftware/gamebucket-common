import { Static, TSchema } from '@sinclair/typebox'
import { produce } from 'immer'
import {
    PropsWithChildren,
    FunctionComponent,
    createContext,
    useContext,
    useEffect,
    useSyncExternalStore,
} from 'react'
import { DeepReadonly } from 'ts-essentials'

import { Spatial, Vector } from '../formats'
import { GVec2, GVec3 } from '../geometry'
import * as rect from '../rect'

import { open, AppDispatch, useDispatch } from './store'
import { ToolDef } from './tools'
import { ResourceID, ScalarResource } from './types'

export interface DepictProps {
    resourceId: ResourceID
    resource: ScalarResource<TSchema>
    canvasSize: rect.Size
    pointer: GVec2
}

/** Information to be made available to callbacks (but read-only) */
interface DesignerContext {
    /**
     * Location and size of the viewport in viewport coordinates
     * @todo Ugh. Using "viewport" 2 different ways
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
     */
    viewport: DOMRect

    /** gesture we're responding to/being asked about. coordinates are all relative to  */
    gesture: {
        action: 'hover' | 'drag'

        /** Current pointer position
         */
        to: GVec2

        /**
         * where the pointer was at the beginning of this gesture update.
         * `to - from` is the movement this frame
         */
        from: GVec2

        /** vector of from -> to
         * @todo
         */
        movement?: GVec2

        /** If true, the gesture is at the "commit" stage */
        complete?: boolean
    }

    /** modify state if you want! */
    dispatch: AppDispatch
}

interface LiaisonData {
    openResources: Parameters<typeof open>[0] | null

    tools: ToolDef<string>[]

    /** Given two points in the viewport, and a presumably dense layer, return a list of element positions
     * @param [coordinates] Points in viewport space
     */
    selectLine?: (
        layer: Spatial.Dense<2>,
        viewport: DOMRect,
        coordinates: Readonly<[to: GVec2, from: GVec2]>,
    ) => Array<GVec2> | undefined

    /** Returns either a list of entities (dense layer) or layer-coordinates of what's within the marquee. If the rect has width/height of 0 or undefined, select based on the point */
    select?: (
        ctx: DeepReadonly<DesignerContext>,
        layer: Spatial.Spatial,
    ) => void

    /** The user has moved an entity relative to the viewport
     * @returns The entity's new `position`, or `undefined` if it shouldn't move
     */
    translateElement?: (
        element: Spatial.SparseElement,
        viewportMovement: GVec2,
        selectedLayer?: Spatial.Sparse,
    ) => Vector | void

    /** User has "dragged" the edit window by this amount */
    onPan?: (pixelMovement: GVec2) => void

    /** given input from the designer (position, area if applicable, and any selected palette items as attributes), return a new entity (spawn point) that will be added to the active dataset*/
    onCreate?: <E extends TSchema>(
        canvas: HTMLCanvasElement,
        layer: Spatial.Spatial,
        normalizedPosition: GVec2,
        properties: { area?: rect.Size; [k: string]: unknown },
    ) => Static<E>

    /** the given element has been edited */
    // onEdit?: (
    //     canvas: HTMLCanvasElement,
    //     layer: EditableSubresource,
    //     elementId: string | number | undefined, // if undefined, refresh all
    // ) => void

    /** map a layer to a react component */
    Depict?: FunctionComponent<DepictProps>
}

const defaultClientData = {
    openResources: null,
    tools: [],
} satisfies LiaisonData

const LiaisonContext = createContext<LiaisonData>(defaultClientData)

export class Liaison {
    private snapshot: LiaisonData

    constructor(
        tools: ToolDef<string>[],
        public readonly unmount: () => void,
    ) {
        this.snapshot = { ...defaultClientData, tools }
    }

    private subscribers = new Set<() => void>()

    private notifySubscribers() {
        for (let s of this.subscribers) {
            s()
        }
    }

    subscribe = (onStoreChange: () => void) => {
        this.subscribers.add(onStoreChange)

        return () => this.subscribers.delete(onStoreChange)
    }

    getSnapshot = () => {
        return this.snapshot
    }

    open(resource: LiaisonData['openResources']) {
        this.snapshot = produce(this.snapshot, (draft) => {
            draft.openResources = resource
        })
        this.notifySubscribers()
    }

    configure(callback: (draft: LiaisonData) => void) {
        this.snapshot = produce(this.snapshot, (draft) => {
            callback(draft)
        })
        this.notifySubscribers()
    }
}

export function LiaisonProvider({
    liaison,
    children,
}: PropsWithChildren<{ liaison: Liaison }>) {
    const clientData = useSyncExternalStore(
        liaison.subscribe,
        liaison.getSnapshot,
    )

    const dispatch = useDispatch()

    // notify of new data from the user. TODO: will updating callbacks trigger the right stuff, or do we have to do those individually?
    useEffect(() => {
        if (clientData.openResources) {
            dispatch(open(clientData.openResources))
        }
    }, [clientData.openResources])

    return (
        <LiaisonContext.Provider value={clientData}>
            {children}
        </LiaisonContext.Provider>
    )
}

export function useLiaison() {
    return useContext(LiaisonContext)
}
