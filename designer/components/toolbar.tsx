import { useLiaison } from '../liaison'
import { ButtonGroup } from './common'

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
