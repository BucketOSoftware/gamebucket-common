import { PropsWithChildren } from 'react'
import classnames from 'classnames'

import { selectTool, useDispatch, useSelector } from '../store'
import { useLiaison } from '../liaison'
import { ButtonGroup } from './common'

export function Toolbar() {
    const liaison = useLiaison()

    const state = useSelector((state) => state)

    return (
        <div className="toolbar-actions">
            <ButtonGroup>
                {liaison.tools.map((tool) => (
                    <ToolButton
                        key={tool.id}
                        label={tool.displayName}
                        id={tool.id}
                        icon={tool.icon}
                        disabled={!tool.enabled!(state)}
                    >
                        {tool.displayName}
                    </ToolButton>
                ))}
            </ButtonGroup>
        </div>
    )
}

function ToolButton(
    props: PropsWithChildren<{
        id: string
        label: string
        icon: string
        disabled?: boolean
        children: string | JSX.Element
    }>,
) {
    const dispatch = useDispatch()
    const tool = useSelector(({ selected }) => selected.tool)

    // if (props.disabled) return null

    return (
        <button
            title={props.label}
            type="button"
            disabled={props.disabled}
            onClick={() => {
                dispatch(selectTool(props.id))
            }}
            className={classnames('btn', {
                ['btn-default']: true, //!props.disabled,
                ['btn-disabled']: props.disabled,
                active: tool === props.id,
            })}
        >
            <span className={'icon ' + props.icon} />
            &nbsp;{props.label}
        </button>
    )
}
