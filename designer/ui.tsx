import { BlueprintProvider } from '@blueprintjs/core'
import { ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import invariant from 'tiny-invariant'

import { DesignerContext, StateStore } from './state'

// include blueprint-icons.css for icon font support
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import 'normalize.css'
import './ui.css'

export * from './components'

export function create(domElement: HTMLElement, App: ReactNode) {
    const store = new StateStore()

    const root = createRoot(domElement)
    root.render(
        <StrictMode>
            <BlueprintProvider>
                <DesignerContext.Provider value={store}>
                    {App}
                </DesignerContext.Provider>
            </BlueprintProvider>
        </StrictMode>,
    )

    return [
        store,
        () => {
            root.unmount()
        },
    ] as const
}


