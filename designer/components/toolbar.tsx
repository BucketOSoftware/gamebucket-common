import { Button, ButtonGroup, MaybeElement, Tooltip } from '@blueprintjs/core'
import { BlueprintIcons_16Id } from '@blueprintjs/icons/lib/esm/generated/16px/blueprint-icons-16'
import { PropsWithChildren } from 'react'

import { selectTool, useDispatch, useSelector } from '../store'
import { useLiaison } from '../liaison'
import { Carte } from './common'

export  function Toolbar() {
    const liaison = useLiaison()

    const enabledTools = liaison.tools.filter((toolDef) => {
        return useSelector(toolDef.enabled ?? (() => false))
    })

    if (!enabledTools.length) {
        return null
    } // or should we show some other null UI?

    return (
        <Carte>
            <ButtonGroup>
                {enabledTools.map((tool) => (
                    <ToolButton key={tool.id} id={tool.id} icon={tool.icon}>
                        {tool.displayName}
                    </ToolButton>
                ))}
            </ButtonGroup>
        </Carte>
    )
}

function ToolButton(
    props: PropsWithChildren<{
        id: string
        icon: BlueprintIcons_16Id | MaybeElement
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
                intent={tool === props.id ? 'primary' : 'none'}
                onClick={() => {
                    dispatch(selectTool(props.id))
                }}
            />
        </Tooltip>
    )
}
