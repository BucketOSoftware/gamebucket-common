import { PropsWithChildren } from 'react'
import classnames from 'classnames'

import { selectTool, useDispatch, useSelector } from '../store'
import { useLiaison } from '../liaison'
import { ButtonGroup, Button } from './common'

export function Toolbar() {
    const liaison = useLiaison()

    return (
        <ButtonGroup>
            {liaison.tools.map((tool) => (
                <tool.ToolbarButton key={tool.id} />
            ))}
        </ButtonGroup>
    )
}
