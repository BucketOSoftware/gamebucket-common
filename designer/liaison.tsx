import { Static, TSchema } from '@sinclair/typebox'
import { produce } from 'immer'
import {
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useSyncExternalStore,
} from 'react'
import { useDispatch } from 'react-redux'

import { Container, Spatial } from '../formats'
import { GVec2 } from '../geometry'
import * as rect from '../rect'

import { EditableResource, EditableSubresource, open } from './state'

export interface DepictProps {
    resourceId: Container.ItemID
    resource: EditableSubresource
    canvasSize: rect.Size
}

interface LiaisonData {
    openResources: EditableResource[]

    /** Given two points in the viewport, and a presumably dense layer, return a list of elements */
    selectLine?: (
        coordinates: [to: GVec2, from: GVec2],
        viewport: DOMRect,
        layer: Spatial.Dense<2>,
    ) => Array<number> | undefined

    /** Designer wants to know the ID sof the elements at the given coordinate in the viewport ( [0..1) in both directions)
     * @param [area] position and optionally size of the area we're interested in
     * @param [viewport] CSS size of the viewport in px
     * @param [layer] which layer we want to know about.
     *
     * @todo: `undefined` for layer means consider all layers?
     */
    select?: (
        area: rect.OptionalArea,
        viewport: DOMRect,
        layer: Spatial.Editable,
    ) => Array<string | number> | undefined

    /** User has "dragged" the edit window by this amount (normalized coordinates) */
    onPan?: (normalizedMovement: GVec2) => void

    /** Returns either a list of entities (dense layer) or layer-coordinates of what's within the marquee. If the rect has width/height of 0 or undefined, select based on the point */
    onMarquee?: <ID>(
        canvas: HTMLCanvasElement,
        layer: EditableSubresource,
        normalizedRect: rect.Rect,
    ) => ID[] | rect.Rect

    /** given input from the designer (position, area if applicable, and any selected palette items as attributes), return a new entity (spawn point) that will be added to the active dataset*/
    onCreate?: <E extends TSchema>(
        canvas: HTMLCanvasElement,
        layer: EditableSubresource,
        normalizedPosition: GVec2,
        properties: { area?: rect.Size; [k: string]: unknown },
    ) => Static<E>

    /** the given element has been edited */
    onEdit?: (
        canvas: HTMLCanvasElement,
        layer: EditableSubresource,
        elementId: string | number | undefined, // if undefined, refresh all
    ) => void

    /** map a layer to a react component */
    Depict?: React.FunctionComponent<DepictProps>
}

const defaultClientData: LiaisonData = {
    openResources: [],
} as const

const LiaisonContext = createContext(defaultClientData)

export class Liaison {
    private snapshot: LiaisonData = defaultClientData

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
        // console.log('Wanna open:', resource)
        this.snapshot = produce(this.snapshot, (draft) => {
            draft.openResources = [resource]
        })
        // console.warn('SNAPSHOT', this.snapshot)
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
        console.log('Got resources...', clientData)
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
