// import { Button, Section, SectionCard, Tag } from '@blueprintjs/core'
import { MouseEventHandler, useCallback } from 'react'
import invariant from 'tiny-invariant'

/** Display a selection of possible  */

/*
export function PaletteBox(props: unknown) {
    const palette: Palette<PaletteID> | undefined = useSelector(
        selectors.activeLayer.palette,
    )
    if (!palette) return null

    let klass = ''
    if (palette.length) {
        if (palette[0].icon || palette[0].img) {
            klass = 'palette-grid'
        } else if (palette[0].label) {
            klass = 'palette-tags'
        }
    }
    // TODO: real keys
    return (
        <Section title="Palette" compact elevation={1}>
            <SectionCard padded className={klass}>
                {Object.entries(palette).map(([id, entry], idx) => (
                    <PaletteButton id={id} item={entry} key={id} />
                    // <Button key={idx} icon={getIcon(choice)} />
                ))}
            </SectionCard>
        </Section>
    )
}

function PaletteButton(props: { id: PaletteID; item: Palette[number] }) {
    const update = useUpdate()
    const layer = useSelector(selectors.activeLayer.get)
    const palette = layer.palette

    const selected = useSelector(
        (st) => st.activePaletteItem.get(palette) === props.id,
    )

    const { id, item } = props

    const onClick: MouseEventHandler<HTMLElement> = useCallback(
        (ev) => {
            update((draft) => {
                draft.activePaletteItem.set(palette, id)
            })
        },
        [id, palette],
    )
6
    if (item.icon) {
        return (
            <Button active={selected} minimal onClick={onClick}>
                <img
                    src={item.icon}
                    width={24}
                    height={24}
                    title={item.label}
                />
            </Button>
        )
    }

    if (item.img) {
        throw new Error('TODO')
    }

    invariant(item.label, 'Invalid palette entry')
    if (item.label) {
        return (
            <Tag
                round
                intent={selected ? 'primary' : 'none'}
                interactive
                onClick={onClick}
            >
                {item.label}
            </Tag>
        )
    }
}
*/
