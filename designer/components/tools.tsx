import {
    Button,
    ButtonGroup,
    Card,
    CardProps,
    Tooltip,
} from '@blueprintjs/core'
import { BlueprintIcons_16Id } from '@blueprintjs/icons/lib/esm/generated/16px/blueprint-icons-16'
import { PropsWithChildren } from 'react'

import { selectors, useSelector, useUpdate } from '../state'
import { type ToolID } from '../types'

export function Toolbar(
    props: PropsWithChildren<{ className: CardProps['className'] }>,
) {
    return (
        <Card compact elevation={3} className={props.className}>
            <ButtonGroup>{props.children}</ButtonGroup>
        </Card>
    )
}
function ToolButton(
    props: PropsWithChildren<{
        id: ToolID
        icon: BlueprintIcons_16Id
        disabled?: boolean
        children: string | JSX.Element
    }>,
) {
    const update = useUpdate()
    const layerType = useSelector((st) => st.activeLayer?.type)
    const tool = useSelector((st) => layerType && st.currentTool[layerType])

    if (props.disabled) return null

    return (
        <Tooltip
            openOnTargetFocus={true}
            placement="bottom"
            usePortal={false}
            content={props.id}
            className="flex-shrink" // For some reason the tooltip enlarges the button area in the stock CSS
        >
            <Button
                icon={props.icon}
                large
                disabled={!layerType}
                intent={tool === props.id ? 'primary' : 'none'}
                onClick={() => {
                    update((draft) => {
                        draft.currentTool[layerType!] = props.id
                    })
                }}
            />
        </Tooltip>
    )
}

export function CreateTool(props: unknown) {
    return (
        <ToolButton
            id="create"
            icon="new-object"
            disabled={
                !selectors.activeLayer.is('resource/spatial2d/entity_list')
            }
        >
            New Entity
        </ToolButton>
    )
}

export function SelectTool(props: unknown) {
    return (
        <ToolButton
            id="select"
            icon="hand-up"
            disabled={
                !selectors.activeLayer.is('resource/spatial2d/entity_list')
            }
        >
            Select
        </ToolButton>
    )
}

export function DrawTool(props: unknown) {
    const enabled = selectors.activeLayer.is('resource/spatial2d/tile_map')

    return (
        <ToolButton id="draw" icon="draw" disabled={!enabled}>
            Draw
        </ToolButton>
    )
}
