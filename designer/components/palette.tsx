import {
    Button,
    H6,
    Section,
    SectionCard,
    Tag,
    Tooltip,
} from '@blueprintjs/core'
import classnames from 'classnames'
import { useCallback } from 'react'
import invariant from 'tiny-invariant'

import { Palette, PaletteDiscrete, PaletteID } from '../resource'
import {
    selectPalette,
    selectedLayer,
    useDispatch,
    useSelector,
} from '../state'

/** Display possibilities for each attribute in the current layer */
export function PaletteBox(props: unknown) {
    const layer = useSelector(selectedLayer)

    if (!layer?.palettes) return null

    if (Array.isArray(layer.palettes)) {
        // it's just one palette
        console.warn('TODO: one-value schema?', layer.schema, layer.palettes)
    } else if ('paletteType' in layer.palettes) {
        console.warn('TODO: one-value schema?', layer.schema, layer.palettes)
    }

    return (
        <Section title="Palette" compact elevation={1}>
            {Object.entries(layer.palettes).map(([attribute, palette]) => (
                <SectionCard key={attribute}>
                    <H6 className="bp5-text-muted">{attribute}</H6>
                    <SinglePalette
                        key={attribute}
                        attribute={attribute}
                        palette={palette}
                    />
                </SectionCard>
            ))}
        </Section>
    )
}

function SinglePalette<V extends PaletteID>({
    attribute,
    palette,
}: {
    attribute?: string
    palette: Palette<V>
}) {
    const dispatch = useDispatch()

    const onSelect = useCallback(
        (value: V) => {
            console.log('SEL', attribute, value)
            dispatch(selectPalette([attribute, value]))
        },
        [dispatch, attribute],
    )

    useSelector((state) => attribute && state.attribs[attribute])

    if ('paletteType' in palette) {
        const { paletteType, format, alpha } = palette
        invariant(paletteType === 'COLOR_PICKER')

        return (
            <ColorPicker
                attribute={attribute}
                onSelect={onSelect}
                outputFormat={format}
                alpha={alpha}
            />
        )
    }

    return (
        <div className="palette-grid">
            {palette.map((entry, _idx) => (
                <PaletteButton
                    key={entry.value}
                    attribute={attribute}
                    onSelect={onSelect}
                    {...entry}
                />
            ))}
        </div>
    )
}

function ColorPicker(props: any) {
    return <div className="palette-grid">TODO: Color Picker</div>
}

function PaletteButton<V extends PaletteID>({
    value,
    attribute,
    label,
    img,
    icon,
    swatch,
    onSelect,
}: {
    value: V
    attribute?: string
    onSelect: (value: V) => void
} & PaletteDiscrete[number]) {
    invariant(attribute, 'what do we do for this, huh')

    const selected = useSelector((state) => state.attribs[attribute] === value)
    const onClick = useCallback(() => onSelect(value), [onSelect, value])

    if (icon) {
        return (
            <Tooltip content={label} placement="bottom">
                <Button
                    value={value}
                    onClick={onClick}
                    className={classnames('gbk-palette-button', {
                        ['gbk-palette-button-selected']: selected,
                    })}
                    minimal={!selected}
                    rightIcon={
                        <img className="gbk-palette-sizing" src={icon} />
                    }
                ></Button>
            </Tooltip>
        )
    }

    if (img) {
        throw new Error(`TODO: ${img}`)
    }

    if (swatch) {
        return (
            <Button
                value={value}
                onClick={onClick}
                minimal={!selected}
                className={classnames(
                    'gbk-palette-button',
                    'gbk-palette-sizing',
                    'gbk-palette-swatch', // TODO: style this
                    { ['gbk-palette-button-selected']: selected },
                )}
                style={{ backgroundColor: swatch }}
            />
        )
    }

    invariant(label, 'Invalid palette entry')
    if (label) {
        return (
            <Tag
                interactive
                round
                intent={selected ? 'primary' : 'none'}
                onClick={onClick}
            >
                {label}
            </Tag>
        )
    }
}
