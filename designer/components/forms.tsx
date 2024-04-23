import {
    Alignment,
    ControlGroup,
    FormGroup,
    InputGroup,
    SegmentedControl,
    Slider,
    Switch,
    Tag,
} from '@blueprintjs/core'
import {
    TInteger,
    TUnion,
    TypeGuard,
    ValueGuard,
    type TNumber,
    type TObject,
    type TSchema,
    type TTuple,
} from '@sinclair/typebox'
import { Check, Convert, Value } from '@sinclair/typebox/value'
import { debounce } from 'lodash-es'
import { useCallback, useEffect, useState } from 'react'
import invariant from 'tiny-invariant'

import { selectors, usePatch, useSelector } from '../state'

interface AggregateControlProps<T extends TSchema, I = string> {
    path: string // JSON pointer
    schema: T
    value: /*Static<T> */ unknown
}

interface ControlProps<T extends TSchema, I = string>
    extends AggregateControlProps<T, I> {
    onChange: (newValue: I) => void
}

/** Wraps a controlled component and updates the selected object with valid
 * inputs but still allows invalid inputs  */
function UpdateSelectionData<S extends TSchema, I = string>(
    props: AggregateControlProps<S, I> & {
        element: (props: ControlProps<S, I>) => JSX.Element
    },
) {
    const { path, schema, value: realValue } = props

    const [formValue, setFormValue] = useState<I | null>(null)
    const patchSelection = usePatch()

    useEffect(() => {
        setFormValue(realValue as I)
    }, [realValue])

    const updateData = useCallback(
        debounce(
            (newValue: unknown) => {
                const converted = Convert(schema, newValue)
                if (Check(schema, converted)) {
                    patchSelection([
                        {
                            type: 'update',
                            path: path,
                            value: converted,
                        } as const,
                    ])
                }
            },
            250,
            { leading: false, trailing: true },
        ),
        [path, schema],
    )

    const onEdit = useCallback(
        (edited: I) => {
            // set the value right away
            setFormValue(edited)

            // if validates, update the actual data
            updateData(edited)
        },
        [path, schema],
    )

    if (formValue === null) {
        return null
    }

    // useUpdateSelected(path, schema)
    return (
        <props.element
            value={formValue}
            path={path}
            schema={schema}
            onChange={onEdit}
        />
    )
}

export function FormControl<T extends TSchema>(
    props: AggregateControlProps<T> & {
        readonly?: boolean
    },
) {
    const { schema, value, path } = props

    if (!Check(schema, value)) {
        console.error('Not valid:', Array.from(Value.Errors(schema, value)))
    }

    // TODO: show readonly or literal values in another way (optionally?)
    if (TypeGuard.IsReadonly(schema)) {
        return null
    }

    if (TypeGuard.IsLiteral(schema)) {
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
                    <FormControl
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
                element={FormControlMultipleChoice<typeof schema>}
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
                    element={FormControlSlider}
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

        return <FormControlTuple schema={schema} path={path} value={value} />
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

            return null
            throw new Error(
                `Can't handle number without whatever? ${path} ${value} ${schema}`,
            )
        case 'array': {
            // TODO: exclude versions?
            if (TypeGuard.IsTuple(schema)) {
                console.warn('Being weird about tuples')
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

    console.warn("Don't know how to make a form for: ", path, schema)
}
function FormControlTuple<T extends TTuple>(props: AggregateControlProps<T>) {
    const { schema, value, path } = props
    invariant(ValueGuard.IsArray(value), 'Expected an array, got: ${value}')

    return (
        <FormGroup label={schema.title ?? path.at(-1)}>
            <ControlGroup fill>
                {schema.items?.map((subschema, idx) => (
                    <UpdateSelectionData
                        element={FormControlTupleElement}
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

function FormControlSlider(props: ControlProps<TNumber | TInteger, number>) {
    const { schema, value, onChange } = props

    if (schema.minimum && schema.multipleOf) {
        invariant(
            schema.minimum / schema.multipleOf === 0,
            'Schema minimum is not a multiple of multipleOf',
        )
    }

    const multipleOf = schema.multipleOf || (TypeGuard.IsInteger(schema) && 1)
    // TODO: base this on the number of items we want shown on the slider
    // const labelStepSize = multipleOf ? multipleOf * 4 : undefined
    const labelStepSize = undefined

    return (
        <FormGroup label={schema.title}>
            <Slider
                min={schema.minimum}
                max={schema.maximum}
                stepSize={schema.multipleOf}
                value={value as number} // What if it's not
                onChange={onChange}
                // TODO: these aren't the same thing, esp. if min isn't a multiple of multipleOf
                labelStepSize={labelStepSize}
            />
        </FormGroup>
    )
}

function FormControlMultipleChoice<U extends TUnion>({
    value,
    schema,
    onChange,
}: ControlProps<U>) {
    invariant(TypeGuard.IsUnionLiteral(schema))

    return (
        <FormGroup label={schema.title}>
            <SegmentedControl
                fill
                value={String(value)}
                intent="primary"
                options={schema.anyOf.map((opt) => ({
                    label: String(opt.title || opt.const.valueOf()),
                    value: String(opt.const.valueOf()),
                }))}
                onValueChange={onChange}
            />
        </FormGroup>
    )
}

function FormControlTupleElement({
    schema,
    value,
    onChange,
}: ControlProps<TNumber>) {
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
