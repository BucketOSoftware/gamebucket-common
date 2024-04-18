import {
    Alignment,
    ControlGroup,
    FormGroup,
    InputGroup,
    NumericInput,
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
    type Static,
    type TNumber,
    type TObject,
    type TSchema,
    type TTuple,
} from '@sinclair/typebox'
import {
    Cast,
    Check,
    Convert,
    Value,
    ValuePointer,
} from '@sinclair/typebox/value'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import invariant from 'tiny-invariant'
import {
    DesignerContext,
    ToolHandlers,
    handleEntityUpdate,
    useUpdate,
} from '../state'

interface ControlProps<T extends TSchema> {
    path: string // JSON pointer
    schema: T
    value: /*Static<T> */ unknown
}

export function FormControl<T extends TSchema>(
    props: ControlProps<T> & {
        readonly?: boolean
    },
) {
    const { schema, value, path } = props

    if (!Check(schema, value)) {
        console.error('Not valid:', Array.from(Value.Errors(schema, value)))
    }

    // TODO: show readonly values in another way (optionally?)
    if (TypeGuard.IsReadonly(schema)) {
        return null
    }

    if (TypeGuard.IsLiteral(schema)) {
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
            <FormControlMultipleChoice
                path={path}
                value={value}
                schema={schema}
            />
        )
    }

    if (TypeGuard.IsNumber(schema) || TypeGuard.IsInteger(schema)) {
        if ('minimum' in schema && 'maximum' in schema) {
            return (
                <FormControlSlider path={path} value={value} schema={schema} />
            )
        }

        console.warn('TODO: number entry', schema)

        return null
    }

    if (TypeGuard.IsTuple(schema)) {
        invariant(ValueGuard.IsArray(value))
        invariant(schema.items, 'No items in schema?')

        return (
            <FormControlTuple schema={schema} path={path} value={value as []} />
        )
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
function FormControlTuple<T extends TTuple>(props: ControlProps<T>) {
    const { schema, value, path } = props
    invariant(ValueGuard.IsArray(value), 'Expected an array, got: ${value}')

    return (
        <FormGroup label={schema.title ?? path.at(-1)}>
            <ControlGroup fill>
                {schema.items?.map((subschema, idx) => (
                    <FormControlTupleElement
                        schema={subschema as TNumber}
                        key={idx}
                        path={path + '/' + idx}
                        value={value[idx]}
                    />
                ))}
            </ControlGroup>
        </FormGroup>
    )
}

function FormControlSlider(props: ControlProps<TNumber | TInteger>) {
    const { schema, value, path } = props

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

    const onChange = useUpdateSelected(path, schema)

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
    path,
    value,
    schema,
}: ControlProps<U>) {
    invariant(TypeGuard.IsUnionLiteral(schema))

    return (
        <SegmentedControl
            value={String(value)}
            intent="primary"
            options={schema.anyOf.map((opt) => ({
                label: String(opt.title || opt.const.valueOf()),
                value: String(opt.const.valueOf()),
            }))}
            onValueChange={useUpdateSelected(path, schema)}
        />
    )
}

function FormControlTupleElement({
    schema,
    path,
    value,
}: ControlProps<TNumber>) {
    const placeholder = '0'

    // const [isValid, setValid] = useState(true)
    const [formValue, setFormValue] = useState(String(value))

    useEffect(() => {
        setFormValue(String(value))
    }, [value])

    const intent = Check(schema, Convert(schema, formValue)) ? 'none' : 'danger'
    const update = useUpdateSelected(path, schema)

    return (
        <InputGroup
            small
            fill
            // data-path={JSON.stringify(path)}
            intent={intent}
            leftElement={
                schema.title ? (
                    <Tag minimal intent={intent}>
                        {schema.title}
                    </Tag>
                ) : undefined
            }
            placeholder={placeholder}
            value={formValue}
            // selectAllOnFocus
            onValueChange={(val, targ) => {
                const castVal = Convert(schema, val)
                if (Check(schema, castVal)) {
                    update(castVal)
                }
                // if it's not a reasonable value, we still let it happen as input
                setFormValue(val)
                // TODO?: should we not do this if it gets set OK
            }}
            onBlur={(ev) => {
                console.log('I blur:', ev)
            }}
        />
    )
}

function useUpdateSelected<I extends string | number, S extends TSchema>(
    path: string,
    schema: S,
) {
    const { update } = useContext(DesignerContext)

    return useCallback(
        (v: I) => {
            // convert the value if it fits the schema, otherwise leave it
            const castValue = Convert(schema, v)
            if (Check(schema, castValue)) {
                update((draft) => {
                    ToolHandlers.update(draft, [
                        {
                            type: 'update',
                            path: path,
                            value: castValue,
                        },
                    ])
                })
            }
        },
        [path, schema, update],
    )
}
