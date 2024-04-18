import { Section, SectionCard } from '@blueprintjs/core'
import { Type, TypeGuard, ValueGuard } from '@sinclair/typebox'
import { Check } from '@sinclair/typebox/value'
import { useSelector } from '../state'
import { FormControl } from './forms'

export function PropertiesBox(props: unknown) {
    const layer = useSelector((st) => st.activeLayer)
    const selection = useSelector((st) => st.selection)

    const schema = layer?.elementSchema
    if (!(schema && selection.length)) {
        return null
    }

    if (selection.length > 1) {
        return (
            <Section compact elevation={1} title="Entity">
                <SectionCard>
                    [!] {selection.length} entities selected
                </SectionCard>
            </Section>
        )
    } else {
        let effectiveSchema = schema

        const obj = selection[0]
        if (TypeGuard.IsUnion(schema)) {
            const matching = schema.anyOf.filter((s) => Check(s, obj))

            if (matching.length === 1) {
                effectiveSchema = matching[0]
            } else {
                // probably not going to work very well, but attempt to edit what fields we can
                console.warn('Editing with union schema:', effectiveSchema)
                effectiveSchema = Type.Intersect(matching)
            }
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
                        <FormControl
                            path=""
                            schema={effectiveSchema}
                            value={obj}
                        />
                    </form>
                </SectionCard>
            </Section>
        )
    }
}
