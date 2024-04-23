import { BlueprintProvider } from '@blueprintjs/core'
import { ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import invariant from 'tiny-invariant'

// include blueprint-icons.css for icon font support
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import 'normalize.css'

import { DesignerContext, StateStore } from './state'
export * from './components'
import './ui.css'

export function create(
    domElement: HTMLElement,
    App: ReactNode,
    userData?: any,
) {
    const store = new StateStore(userData)
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
