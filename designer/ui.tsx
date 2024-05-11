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
// import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Liaison, LiaisonProvider } from './liaison'
import { ElementID, store } from './store'

import 'photon/dist/css/photon.css'

import './ui.css'

import { ToolDef } from './tools'
import { Toolbar } from './components'
import * as rect from '../rect'

export function createApp<T extends string>(
    domElement: HTMLElement,
    App: ReactNode,
    tools: ToolDef<T>[],
) {
    const liaison = new Liaison(tools)
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
        <div className="window gbk-columns">
            <header className="toolbar toolbar-header">
                <h1 className="title">Gamebucket Designer</h1>
                <Toolbar />
            </header>
            <div className="window-content">
                <div className="pane-group">{children}</div>
            </div>
        </div>
    )
}

export function ResizeHandle() {
    return null
    // return <PanelResizeHandle className="resize-handle" />
}

export function MainColumn({ children }: PropsWithChildren) {
    return (
        <div className="pane">
            <section className="padded" style={{ height: '100%' }}>
                {children}
            </section>
        </div>
    )
}

export function Sidebar({ children }: PropsWithChildren) {
    return (
        // <Panel
        //     className="resizable-column"
        //     style={{ overflow: 'hidden auto' }}
        //     defaultSize={30}
        //     minSize={20}
        //     maxSize={50}
        // >
        <div className="pane pane-sm sidebar padded">{children}</div>
    )
}

export function MarchingAnts(props: rect.Rect) {
    return (
        <svg
            style={{
                left: props.x,
                top: props.y,
                width: props.width,
                height: props.height,
            }}
            className="marching-ants"
            viewBox="0 0 40 40"
            // prevents the scaling from applying to the rect
            preserveAspectRatio="none"
        >
            <rect width="40" height="40" />
        </svg>
    )
}
