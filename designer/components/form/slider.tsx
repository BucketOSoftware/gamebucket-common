import { FormGroup, Slider } from '@blueprintjs/core';
import {
    TInteger,
    TypeGuard, type TNumber
} from '@sinclair/typebox';
import invariant from 'tiny-invariant';
import { FormFieldProps } from './updater';

export default function SliderField(props: FormFieldProps<TNumber | TInteger, number>) {
    const { schema, value, onChange } = props;

    if (schema.minimum && schema.multipleOf) {
        invariant(
            schema.minimum / schema.multipleOf === 0,
            'Schema minimum is not a multiple of multipleOf'
        );
    }

    const multipleOf = schema.multipleOf || (TypeGuard.IsInteger(schema) && 1) || undefined;
    // TODO: base this on the number of items we want shown on the slider
    // const labelStepSize = multipleOf ? multipleOf * 4 : undefined
    const labelStepSize = undefined;

    return (
        <FormGroup label={schema.title}>
            <Slider
                min={schema.minimum}
                max={schema.maximum}
                stepSize={multipleOf}
                value={value as number} // What if it's not
                onChange={onChange}
                // TODO: these aren't the same thing, esp. if min isn't a multiple of multipleOf
                labelStepSize={labelStepSize} />
        </FormGroup>
    );
}
