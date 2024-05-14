import { Type, TypeGuard, ValueGuard } from '@sinclair/typebox'
import { Check } from '@sinclair/typebox/value'

import { ResourceType } from '../../formats'
import { useSelectedLayer, useSelector } from '../store'
import FormControl from './form'

export function PropertiesBox() {
    const layer = useSelectedLayer()
    const selectedIds = useSelector((st) => st.selected.elements)

    const correctType = layer?.type === ResourceType.SpatialSparse2D
    const schema = layer?.schema
    if (
        !(
            correctType &&
            schema &&
            Array.isArray(selectedIds) &&
            selectedIds.length
        )
    ) {
        return null
    }

    if (selectedIds.length > 1) {
        return <div>[!] {selectedIds.length} entities selected</div>
    } else {
        const selection = selectedIds.map((id) => layer.data[id])
        let effectiveSchema = schema

        const [obj] = selection
        if (TypeGuard.IsUnion(schema)) {
            const matching = schema.anyOf.filter((s) => Check(s, obj))

            if (matching.length === 1) {
                effectiveSchema = matching[0]
            } else {
                // probably not going to work very well, but attempt to edit what fields we can
                effectiveSchema = Type.Intersect(matching)
                console.warn('Editing with union schema:', effectiveSchema)
            }
        }

        // TODO: let the user specify this somehow. We shouldn't know anything about the semantics of the object we're editing
        const title =
            ValueGuard.IsObject(obj) && ValueGuard.IsString(obj.type)
                ? obj.type
                : 'Entity'

        return (
            // <NavGroup title={title}>
            <section>
                <hr />
                <h4 style={{ display: 'flex', flexDirection: 'row' }}>
                    <span style={{ flexGrow: 1 }}>{selectedIds[0]}</span>
                    <button className="btn btn-negative">Delete</button>
                </h4>
                <FormControl path="" schema={effectiveSchema} value={obj} />
            </section>
            // </NavGroup>
        )
    }
}
