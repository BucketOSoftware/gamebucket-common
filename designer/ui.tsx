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
    const liaison = new Liaison(tools, () => root.unmount())
    const root = createRoot(domElement)
    root.render(
        <StrictMode>
            <Provider store={store}>
                <LiaisonProvider liaison={liaison}>{App}</LiaisonProvider>
            </Provider>
        </StrictMode>,
    )

    return liaison
}


