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
import { useDispatch } from 'react-redux'

import { Container, Spatial } from '../formats'
import { GVec2, GVec3 } from '../geometry'
import * as rect from '../rect'

import { EditableResource, EditableSubresource, ElementID, open } from './store'
import { ToolDef } from './tools'

export interface DepictProps {
    resourceId: Container.ItemID
    resource: EditableSubresource
    canvasSize: rect.Size
    pointer: GVec2
}

interface LiaisonData {
    openResources: EditableResource[]
    tools: ToolDef<string>[]

    /** Given two points in the viewport, and a presumably dense layer, return a list of elements
     * @param [coordinates] Points in viewport space
     */
    selectLine?: (
        layer: Spatial.Dense<2>,
        viewport: DOMRect,
        coordinates: Readonly<[to: GVec2, from: GVec2]>,
    ) => Array<number> | undefined

    /** Returns either a list of entities (dense layer) or layer-coordinates of what's within the marquee. If the rect has width/height of 0 or undefined, select based on the point */
    select?: (
        layer: Spatial.Editable,
        viewport: DOMRect,
        coordinates: Readonly<[to: GVec2, from: GVec2]>,
        marquee: (r: rect.Rect) => void,
    ) => ElementID[]

    /** The user has moved an entity relative to the viewport
     * @returns The entity's new `position` or `undefined` if it shouldn't move
     */
    translateElement?: (
        element: Spatial.SparseElement,
        viewportMovement: GVec2,
        selectedLayer?: Spatial.Sparse,
    ) => Spatial.Position | void

    /** User has "dragged" the edit window by this amount */
    onPan?: (pixelMovement: GVec2) => void

    /** given input from the designer (position, area if applicable, and any selected palette items as attributes), return a new entity (spawn point) that will be added to the active dataset*/
    onCreate?: <E extends TSchema>(
        canvas: HTMLCanvasElement,
        layer: EditableSubresource,
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
    openResources: [],
    tools: [],
} satisfies LiaisonData

const LiaisonContext = createContext<LiaisonData>(defaultClientData)

export class Liaison {
    private snapshot: LiaisonData

    constructor(tools: ToolDef<string>[]) {
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

    open(resource: EditableResource) {
        this.snapshot = produce(this.snapshot, (draft) => {
            draft.openResources = [resource]
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
        dispatch(open(clientData.openResources[0]))
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
