import { Alignment, FormGroup, InputGroup, Switch } from '@blueprintjs/core'
import {
    TypeGuard,
    ValueGuard,
    type TObject,
    type TSchema,
} from '@sinclair/typebox'
import { Check, Value } from '@sinclair/typebox/value'
import invariant from 'tiny-invariant'

import MultipleChoice from './multiple-choice'
import Slider from './slider'
import Tuple from './tuple'
import { AggregateControlProps, UpdateSelectionData } from './updater'

export default function FormField<T extends TSchema>(
    props: AggregateControlProps<T> & {
        readonly?: boolean
    },
) {
    const { schema, value, path } = props

    if (!Check(schema, value)) {
        console.error(
            'Not valid:',
            schema,
            Array.from(Value.Errors(schema, value)),
        )
    }

    // TODO: show readonly or literal values in another way (optionally?)
    if (TypeGuard.IsReadonly(schema) || TypeGuard.IsLiteral(schema)) {
        return null

        return (
            <div>
                {path} : {`${value}`}
            </div>
        )
    }

    if (TypeGuard.IsObject(schema)) {
        const data = value as { [k: string]: any }
        return Object.entries((schema as unknown as TObject).properties).map(
            ([name, subschema]: [string, TSchema]) => {
                return (
                    <FormField
                        key={name}
                        path={path + '/' + name}
                        schema={subschema}
                        value={data[name]}
                    />
                )
            },
        )
    }

    if (TypeGuard.IsUnion(schema)) {
        // Assume it's an enum?
        return (
            <UpdateSelectionData
                element={MultipleChoice<typeof schema>}
                path={path}
                value={value}
                schema={schema}
            />
        )
    }

    if (TypeGuard.IsNumber(schema) || TypeGuard.IsInteger(schema)) {
        if ('minimum' in schema && 'maximum' in schema) {
            return (
                <UpdateSelectionData
                    element={Slider}
                    path={path}
                    value={value}
                    schema={schema}
                />
            )
        }

        console.warn('TODO: number entry', schema)

        return null
    }

    if (TypeGuard.IsTuple(schema)) {
        invariant(ValueGuard.IsArray(value))
        invariant(schema.items, 'No items in schema?')

        return <Tuple schema={schema} path={path} value={value} />
    }

    switch (schema.type) {
        case 'object': {
        }

        case 'boolean':
            invariant(
                typeof value === 'boolean' || typeof value === 'undefined',
            )
            return (
                <Switch
                    label={schema.title}
                    alignIndicator={Alignment.RIGHT}
                    checked={false}
                    onChange={(e) => console.warn('TODO', name, e)}
                />
            )

        case 'array': {
            // TODO: exclude versions?
            if (TypeGuard.IsTuple(schema)) {
                console.warn('Being weird about tuples')
                // TODO: the actual types
                // TODO: max, min
                // const ary = schema as unknown as TArray
                return null
            }
            break
        }
        case 'string': {
            const data = props.value
            invariant(typeof data === 'string')
            return (
                <FormGroup inline label={schema.title}>
                    <InputGroup value={data} disabled={props.readonly} />
                </FormGroup>
            )
        }
    }

    console.warn("Don't know how to make a form for: ", path, schema)
}
