import { type TSchema } from '@sinclair/typebox'
import { Check, Convert } from '@sinclair/typebox/value'
import { debounce } from 'lodash-es'
import { useCallback, useEffect, useState } from 'react'

import { editSelectedElements, useDispatch } from '../../store'

/**
 * @param [S] Schema for acceptable values for the control
 */
export interface AggregateControlProps<S extends TSchema> {
    path: string
    schema: S
    value: /*Static<T> */ unknown
}

/**
 * @param [S] Schema for acceptable values for the control
 * @param [I] Value from the
 */
export interface FormFieldProps<S extends TSchema, I>
    extends AggregateControlProps<S> {
    onChange: (newValue: I) => void
}

/** Wraps a controlled component and updates the selected object with valid
 * inputs but still allows invalid inputs  */
export function UpdateSelectionData<S extends TSchema, I = string>(
    props: AggregateControlProps<S> & {
        element: (props: FormFieldProps<S, I>) => JSX.Element
    },
) {
    const { path, schema, value: realValue } = props

    const dispatch = useDispatch()
    const [formValue, setFormValue] = useState<I | null>(null)

    useEffect(() => {
        setFormValue(realValue as I)
    }, [realValue])

    const updateData = useCallback(
        debounce((newValue: unknown) => {
            console.log('Setting!', path, newValue, schema)
            const converted = Convert(schema, newValue)
            if (Check(schema, converted)) {
                dispatch(
                    editSelectedElements({
                        path: path,
                        value: converted,
                        limit: 1,
                    }),
                )
            }
        }, 250),
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

    return (
        <props.element
            value={formValue}
            path={path}
            schema={schema}
            onChange={onEdit}
        />
    )
}
