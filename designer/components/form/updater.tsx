import { type TSchema } from '@sinclair/typebox'
import { Check, Convert } from '@sinclair/typebox/value'
import { debounce } from 'lodash-es'
import { useCallback, useEffect, useState } from 'react'

import { editElemente, useDispatch } from '../../store'
import { ElementKey } from '../../types'

/**
 * @param [S] Schema for acceptable values for the control
 */
export interface AggregateControlProps<S extends TSchema> {
    id: ElementKey
    path: string[]
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
        /** this is the JSX element, not a layer element. oof */
        element: (props: FormFieldProps<S, I>) => JSX.Element
    },
) {
    const { path, schema, value: realValue, id } = props

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
                    editElemente({
                        key: id,
                        path: path,
                        value: converted,
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
            id={id}
            value={formValue}
            path={path}
            schema={schema}
            onChange={onEdit}
        />
    )
}
