import {
    Button,
    ButtonGroup,
    Card,
    CardProps,
    Tooltip,
} from '@blueprintjs/core'
import { BlueprintIcons_16Id } from '@blueprintjs/icons/lib/esm/generated/16px/blueprint-icons-16'
import { PropsWithChildren } from 'react'

import { type ToolID } from '../types'
import { selectTool, useDispatch, useSelector } from '../state'

export function Toolbar(
    props: PropsWithChildren<{ className?: CardProps['className'] }>,
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
    const dispatch = useDispatch()
    const tool = useSelector(({ selected }) => selected.tool)

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
                // disabled={!layerType}
                intent={tool === props.id ? 'primary' : 'none'}
                onClick={() => {
                    console.log('DISPA!', props.id)
                    dispatch(selectTool(props.id))
                    // update((draft) => {
                    // draft.currentTool[layerType!] = props.id
                    // })
                }}
            />
        </Tooltip>
    )
}

export function CreateTool(props: unknown) {
    // const enabled = useSelector(supportsCreate)
    const enabled = true

    return (
        <ToolButton id="create" icon="new-object" disabled={!enabled}>
            New Entity
        </ToolButton>
    )
}

export function SelectTool(props: unknown) {
    // const enabled = useSelector(supportsSelect)
    const enabled = true

    return (
        <ToolButton id="select" icon="hand-up" disabled={!enabled}>
            Select
        </ToolButton>
    )
}

export function DrawTool(props: unknown) {
    // const enabled = useSelector(supportsDraw)
    const enabled = true

    return (
        <ToolButton id="draw" icon="draw" disabled={!enabled}>
            Draw
        </ToolButton>
    )
}
