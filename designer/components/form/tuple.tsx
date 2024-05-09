import { ControlGroup, FormGroup, InputGroup, Tag } from '@blueprintjs/core'
import { TTuple, ValueGuard, type TNumber } from '@sinclair/typebox'
import { Check, Convert } from '@sinclair/typebox/value'
import invariant from 'tiny-invariant'
import {
    AggregateControlProps,
    FormFieldProps,
    UpdateSelectionData,
} from './updater'

import './form.css'

export default function TupleField<T extends TTuple>(
    props: AggregateControlProps<T>,
) {
    const { schema, value, path } = props
    invariant(ValueGuard.IsArray(value), 'Expected an array, got: ${value}')

    return (
        <div className="form-group">
            <label>{schema.title ?? path.at(-1)}</label>
            <div className="gbk-input-tuple">
                {schema.items?.map((subschema, idx) => (
                    <UpdateSelectionData
                        element={TupleElement}
                        key={idx}
                        schema={subschema as TNumber}
                        path={path + '/' + idx}
                        value={value[idx]}
                    />
                ))}
            </div>
        </div>
    )
}

// {/* <input type="email" class="form-control" placeholder="Email"> */}
// <FormGroup label={schema.title ?? path.at(-1)}>
//     <ControlGroup fill>

function TupleElement({
    schema,
    value,
    onChange,
}: FormFieldProps<TNumber, string>) {
    const converted = Convert(schema, value)
    const valid = Check(schema, converted)
    const intent = valid ? 'none' : 'danger'

    return (
        <div className="gbk-input-group">
            <span className="gbk-input-inset">{schema.title}</span>
            <input
                className="form-control"
                type="number"
                // placeholder="0"
                value={converted as number}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    )
}
