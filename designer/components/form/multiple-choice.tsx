import {
    TUnion,
    TypeGuard
} from '@sinclair/typebox';
import invariant from 'tiny-invariant';
import { FormFieldProps } from './updater';

export default function MultipleChoiceField<U extends TUnion>({
    value, schema, onChange,
}: FormFieldProps<U, string>) {
    invariant(TypeGuard.IsUnionLiteral(schema));
return <div>TODO</div>

    /*
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
                onValueChange={onChange} />
        </FormGroup>
        
    );
    */
}
