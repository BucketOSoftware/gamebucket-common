import { ControlGroup, FormGroup, InputGroup, Tag } from '@blueprintjs/core'
import { TTuple, ValueGuard, type TNumber } from '@sinclair/typebox'
import { Check, Convert } from '@sinclair/typebox/value'
import invariant from 'tiny-invariant'
import {
    AggregateControlProps,
    FormFieldProps,
    UpdateSelectionData,
} from './updater'

export default function TupleField<T extends TTuple>(
    props: AggregateControlProps<T>,
) {
    const { schema, value, path } = props
    invariant(ValueGuard.IsArray(value), 'Expected an array, got: ${value}')

    return (
        <FormGroup label={schema.title ?? path.at(-1)}>
            <ControlGroup fill>
                {schema.items?.map((subschema, idx) => (
                    <UpdateSelectionData
                        element={TupleElement}
                        key={idx}
                        schema={subschema as TNumber}
                        path={path + '/' + idx}
                        value={value[idx]}
                    />
                ))}
            </ControlGroup>
        </FormGroup>
    )
}

function TupleElement({
    schema,
    value,
    onChange,
}: FormFieldProps<TNumber, string>) {
    const converted = Convert(schema, value)
    const valid = Check(schema, converted)
    const intent = valid ? 'none' : 'danger'

    return (
        <InputGroup
            small
            fill
            className="right-align"
            intent={intent}
            leftElement={
                schema.title ? (
                    <Tag minimal intent={intent}>
                        {schema.title}
                    </Tag>
                ) : undefined
            }
            value={value as string}
            onValueChange={onChange}
            onBlur={(ev) => {
                console.log('I blur:', ev)
            }}
        />
    )
}
