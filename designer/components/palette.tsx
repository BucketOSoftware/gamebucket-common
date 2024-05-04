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

import { Palette, PaletteDiscrete, PaletteID, PaletteImage } from '../resource'
import {
    selectPalette,
    useCurrentPalettes,
    useDispatch,
    useSelector,
} from '../store'

/** Display possibilities for each attribute in the current layer */
export function PaletteBox() {
    const palettes = useCurrentPalettes()
    if (!palettes) return null

    if (Array.isArray(palettes)) {
        // it's just one palette
        console.warn('TODO: one-value schema?', palettes)
    } else if ('paletteType' in palettes) {
        console.warn('TODO: one-value schema?', palettes)
    }

    return (
        <Section title="Palette" compact elevation={1}>
            {Object.entries(palettes).map(([attribute, palette]) => (
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
        (value: V) => dispatch(selectPalette([attribute, value])),
        [dispatch, attribute],
    )

    const selectedValue = useSelector(
        ({ selected }) => attribute && selected.attribs[attribute],
    )

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
                    selected={selectedValue === entry.value}
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
    label,
    img,
    icon,
    swatch,

    value,
    selected,
    onSelect,
}: {
    value: V
    selected?: boolean
    onSelect: (value: V) => void
} & PaletteDiscrete[number]) {
    const onClick = useCallback(() => onSelect(value), [onSelect, value])

    if (icon) {
        return (
            <Tooltip
                compact
                disabled={!label}
                content={label || ''}
                placement="bottom"
            >
                <Button
                    value={value}
                    onClick={onClick}
                    className={classnames('gbk-palette-button', {
                        ['gbk-palette-button-selected']: selected,
                    })}
                    minimal={!selected}
                    rightIcon={<PaletteIcon icon={icon} />}
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

/** @todo This re-renders an awful lot, what gives */
function PaletteIcon({ icon }: { icon: PaletteImage }) {
    if (Array.isArray(icon)) {
        throw new Error('TODO')
        /*
        const [url, { x, y, width, height }] = icon

        return (
            <div
                className="gbk-palette-sizing"
                style={{
                    width,
                    height,
                    imageRendering: 'pixelated',
                    // transform: 'scale(3)',
                    backgroundColor: 'hsl(0 0% 0%)',
                    backgroundImage: `url("${url}")`,
                    // backgroundSize: '100%',
                    backgroundPositionX: -x,
                    backgroundPositionY: -y,
                }}
            />
        )
        */
    } else {
        return <img className="gbk-palette-icon" src={icon} />
    }
}
