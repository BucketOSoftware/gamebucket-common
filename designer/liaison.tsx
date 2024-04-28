import {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useSyncExternalStore,
} from 'react'
import { produce } from 'immer'
// import {  } from './resource'
import { useDispatch } from 'react-redux'
import { EditableResource, open } from './state'
import { Matrix3Tuple } from 'three'
import { Spatial2D } from '../formats'
import { TSchema } from '@sinclair/typebox'

interface LiaisonData {
    openResources: EditableResource[]
    onRender?: (
        canvas: HTMLCanvasElement,
        camera: Matrix3Tuple,
        layer: Spatial2D.Editable<TSchema, any>,
    ) => void
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

    onRender(callback: LiaisonData['onRender']) {
        this.snapshot = produce(this.snapshot, (draft) => {
            draft.onRender = callback
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
