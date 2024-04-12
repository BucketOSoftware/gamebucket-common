import {
    Alignment,
    ControlGroup,
    FormGroup,
    InputGroup,
    Slider,
    Switch,
    Tag,
} from '@blueprintjs/core'
import {
    TypeGuard,
    ValueGuard,
    type Static,
    type TNumber,
    type TObject,
    type TSchema,
    type TTuple,
} from '@sinclair/typebox'
import { Check, Convert } from '@sinclair/typebox/value'
import { useCallback, useMemo, useState } from 'react'
import invariant from 'tiny-invariant'

interface ControlProps<T extends TSchema> {
    path: (string | number)[]
    schema: T
    value: Static<T>
}

export function FormControl<T extends TSchema>(
    props: ControlProps<T> & {
        readonly?: boolean
    },
) {
    const { schema, value, path = [] } = props
    invariant(ValueGuard.IsString(schema.type))
    invariant(Check(schema, value), "Value doesn't match schema")

    if (TypeGuard.IsTuple(schema)) {
        invariant(ValueGuard.IsArray(value))
        invariant(schema.items, 'No items in schema?')

        return (
            <FormControlTuple
                schema={schema}
                // name={name}
                path={path}
                value={value as []}
            />
        )
    }

    switch (schema.type) {
        case 'object': {
            const data = value as { [k: string]: any }
            return Object.entries(
                (schema as unknown as TObject).properties,
            ).map(([name, subschema]: [string, TSchema]) => {
                return (
                    <FormControl
                        key={name}
                        path={path.concat(name)}
                        schema={subschema}
                        readonly={schema.required.includes(name)}
                        value={data[name]}
                    />
                )
            })
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
        case 'number':
        case 'integer':
            if ('minimum' in schema && 'maximum' in schema) {
                return (
                    <FormGroup label={schema.title}>
                        <Slider
                            min={schema.minimum}
                            max={schema.maximum}
                            stepSize={schema.multipleOf}
                            value={0}
                            onChange={(e) => console.warn('TODO', e)}
                            // TODO: these aren't the same thing, esp. if min isn't a multiple of multipleOf
                            labelStepSize={schema.multipleOf * 4}
                        />
                    </FormGroup>
                )
            }
            throw new Error("Can't do it")
        case 'array': {
            // TODO: exclude versions?
            if (TypeGuard.IsTuple(schema)) {
                // TODO: the actual types
                // TODO: max, min
                // const ary = schema as unknown as TArray
                // invariant()
                // invariant(Check(schema, value))
                // invariant(value.length === 2)
                return <></>
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

    throw new Error("Can't do it")
}
function FormControlTuple<T extends TTuple>(props: ControlProps<T>) {
    const { schema, value, path } = props

    return (
        <FormGroup label={schema.title ?? path.at(-1)}>
            <ControlGroup fill>
                {schema.items?.map((subschema, idx) => (
                    <FormControlTupleElement
                        schema={subschema as TNumber}
                        key={idx}
                        path={path!.concat(idx)}
                        value={value[idx]}
                    />
                ))}
            </ControlGroup>
        </FormGroup>
    )
}
function FormControlTupleElement(props: ControlProps<TNumber>) {
    const placeholder = '0'

    const { schema, value, path } = props

    const [isValid, setValid] = useState(true)
    const intent = isValid ? 'none' : 'danger'

    const label = useMemo(
        () =>
            schema.title ? (
                <Tag minimal intent={intent}>
                    {schema.title}
                </Tag>
            ) : undefined,
        [schema.title, intent],
    )

    const handler = useCallback(
        (text: string, target: HTMLInputElement | null) => {
            invariant(target)
            const castValue = Convert(schema, text || placeholder)
            const validity = Check(schema, castValue)
            setValid(validity)
            if (validity) {
                console.log(path, castValue)
            }
        },
        [schema, path],
    )

    return (
        // TODO: non-numeric
        <InputGroup
            small
            data-path={JSON.stringify(path)}
            intent={intent}
            type="numeric"
            leftElement={label}
            fill={false}
            placeholder={placeholder}
            defaultValue={String(value)}
            onValueChange={handler}
            onBlur={(ev) => {
                console.log('I blur:', ev)
            }}
        />
    )
}
