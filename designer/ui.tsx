import { ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import invariant from 'tiny-invariant'

import { Provider } from 'react-redux'
import { store } from './state'

export * from './components'
export * from './gestures'
export * from './state'
export * from './types'
export * from './resource'

import { Liaison, LiaisonProvider } from './liaison'
export { useLiaison } from './liaison'

import './ui.css'

export function create(domElement: HTMLElement, App: ReactNode) {
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
