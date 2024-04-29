import { ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import invariant from 'tiny-invariant'

import { Provider } from 'react-redux'
import { store } from './state'
import { Liaison, LiaisonProvider } from './liaison'

export * from './components'
export * from './gestures'
export * from './state'
export * from './types'
export * from './resource'
export { useLiaison } from './liaison'

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
