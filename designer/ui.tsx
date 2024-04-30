import { PropsWithChildren, ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import invariant from 'tiny-invariant'
import {
    PanelGroup as Group,
    Panel,
    PanelResizeHandle as ResizeHandle,
} from 'react-resizable-panels'
import { Provider } from 'react-redux'

import { store } from './state'
import { Liaison, LiaisonProvider } from './liaison'

import 'normalize.css'
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'

import './ui.css'

export function createApp(domElement: HTMLElement, App: ReactNode) {
    const liaison = new Liaison()
    const root = createRoot(domElement)
    root.render(
        <StrictMode>
            <Provider store={store}>
                <LiaisonProvider liaison={liaison}>{App}</LiaisonProvider>
            </Provider>
        </StrictMode>,
    )

    return [
        liaison,
        () => {
            root.unmount()
        },
    ] as const
}

export function ColumnGroup({ children }: { children: JSX.Element[] }) {
    return (
        <Group direction="horizontal" className='columns'>
            {children.flatMap((element, idx) => {
                if (idx < children.length - 1) {
                    return [element, <ResizeHandle className="resize-handle" />]
                } else {
                    return element
                }
            })}
        </Group>
    )
}

export function Column({ children }: PropsWithChildren) {
    return <Panel className="resizable-column">{children}</Panel>
}

export function Sidebar({ children }: PropsWithChildren) {
    return (
        <Panel
            className="resizable-column"
            style={{ overflow: 'hidden auto' }}
            defaultSize={30}
            minSize={20}
            maxSize={50}
        >
            <section className="column">{children}</section>
        </Panel>
    )
}
