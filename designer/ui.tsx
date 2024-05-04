import classnames from 'classnames'
import {
    PropsWithChildren,
    ReactNode,
    StrictMode,
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

import { type Rect } from '../rect'
import {
    DraggableCallback,
    GestureState,
    useDraggable,
    useGesture,
} from './gestures'
import { Liaison, LiaisonProvider } from './liaison'
import { ElementID, store } from './state'

import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import 'normalize.css'

import './ui.css'
import { Clone } from '@sinclair/typebox'
import { DragConfig } from '@use-gesture/react'
import invariant from 'tiny-invariant'

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

export function ColumnGroup({ children }: PropsWithChildren) {
    return (
        <PanelGroup direction="horizontal" className="columns">
            {children}
        </PanelGroup>
    )
}

export function ResizeHandle() {
    return <PanelResizeHandle className="resize-handle" />
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

