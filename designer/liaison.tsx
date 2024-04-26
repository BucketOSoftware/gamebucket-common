import {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useSyncExternalStore,
} from 'react'
import { produce } from 'immer'
import { CompoundResource, DesignerResource } from './resource'
import { useDispatch } from 'react-redux'
import { open } from './state'
import { ResourceType } from '../formats'

interface LiaisonData {
    openResources: DesignerResource[]
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

    open(resource: CompoundResource<ResourceType.Spatial2D>) {
        console.log('Wanna open:', resource)
        this.snapshot = produce(this.snapshot, (draft) => {
            draft.openResources = [resource]
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

    // console.log('bam!', clientData)

    const dispatch = useDispatch()

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
