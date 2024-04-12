import { BlueprintProvider, Section, SectionCard } from '@blueprintjs/core'
import { ValueGuard } from '@sinclair/typebox'
import { ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { Check } from '@sinclair/typebox/value'
import { LAYER_TYPES as TYPES } from '../formats'
import { FormControl } from './components/forms'
import { DesignerContext, StateStore, useSelector } from './state'

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

export function PropertiesBox(props: unknown) {
    const layer = useSelector(
        (st) => st.activeLayer?.type === TYPES.entityList && st.activeLayer,
    )

    const selection = useSelector((st) => st.selection)
    if (!(layer && selection.length)) {
        return null
    }

    // TODO: would be very nice to have the real type on this
    const schema = layer.element

    if (selection.length > 1) {
        return (
            <Section compact elevation={1} title="Entity">
                <SectionCard>
                    [!] {selection.length} entities selected
                </SectionCard>
            </Section>
        )
    } else {
        const obj = selection[0]
        if (!Check(schema, obj)) {
            console.warn('Not what we wanted:', selection)
            return null
        }

        // TODO: let the user specify this somehow. We shouldn't know anything about the semantics of the object we're editing
        const title =
            ValueGuard.IsObject(obj) && ValueGuard.IsString(obj.type)
                ? obj.type
                : 'Entity'
        return (
            <Section compact elevation={1} title={title}>
                <SectionCard>
                    <form>
                        <FormControl path={[]} schema={schema} value={obj} />
                    </form>
                </SectionCard>
            </Section>
        )
    }
}
