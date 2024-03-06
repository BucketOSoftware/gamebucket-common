import { LocationIcon } from '@primer/octicons-react'
import { Box, SegmentedControl } from '@primer/react'
import {
    FunctionComponent,
    PropsWithChildren,
    useContext,
    useEffect,
    useState,
} from 'react'

import { normalizedCanvasPosition } from '../threez'

import { LiaisonContext } from './editor'
import { openContext, selectNode, useDispatch } from './store'

type Tools = 'drag' | 'select'
const DEFAULT_TOOL: Tools = 'select'

const cursors: Record<Tools, string> = {
    drag: 'grab',
    select: 'pointer',
}

interface ToolProps {
    activeTool: Tools
    selectTool: (which: Tools) => void
}

export function Toolbar(props: PropsWithChildren) {
    const liaison = useContext(LiaisonContext)

    const [tool, setTool] = useState<Tools>(DEFAULT_TOOL)

    useEffect(() => {
        liaison.canvas.style.cursor = cursors[tool] || 'default'
    }, [tool])

    return (
        <Box
            position="absolute"
            sx={{ top: 0, right: 0, margin: 2 }}
            role="toolbar"
        >
            <SegmentedControl aria-label="Tools">
                <DragTool activeTool={tool} selectTool={setTool} />
                <SelectionTool activeTool={tool} selectTool={setTool} />
            </SegmentedControl>
        </Box>
    )
}

function DragTool({ activeTool, selectTool }: ToolProps) {
    const slug: Tools = 'drag'
    const liaison = useContext(LiaisonContext)

    useEffect(() => {
        liaison.mapControls(activeTool === slug)
    }, [liaison, activeTool])

    return (
        <ToolButton
            active={activeTool === slug}
            which={slug}
            choose={selectTool}
        >
            Drag
        </ToolButton>
    )
}

function SelectionTool({ activeTool, selectTool }: ToolProps) {
    const slug: Tools = 'select'
    const liaison = useContext(LiaisonContext)
    const dispatch = useDispatch()

    useEffect(() => {
        if (activeTool !== slug) return

        const canvas = liaison.canvas

        function handleClick(event: MouseEvent | PointerEvent) {
            if (event.button === 0) {
                event.preventDefault()
                dispatch(
                    selectNode(liaison.idAt(normalizedCanvasPosition(event))),
                )
            }
        }

        function handleContext(event: MouseEvent) {
            event.preventDefault()

            // const canvas = event.target as HTMLCanvasElement
            const point = normalizedCanvasPosition(event)
            // pageX, pageY
            console.warn('context!', event.pageX, event.pageY)
            const info = liaison.hitTestWithId(normalizedCanvasPosition(event))
            if (info) {
                dispatch(
                    openContext({
                        id: info.id,
                        world: info?.point,
                        origin: { x: event.pageX, y: event.pageY },
                    }),
                )
            } else {
                dispatch(
                    openContext({
                        origin: { x: event.pageX, y: event.pageY },
                    }),
                )
            }
        }

        canvas.addEventListener('click', handleClick)
        canvas.addEventListener('contextmenu', handleContext)
        return () => {
            canvas.removeEventListener('click', handleClick)
            canvas.removeEventListener('contextmenu', handleContext)
        }
    }, [liaison, activeTool])

    return (
        <ToolButton
            active={activeTool === slug}
            which={slug}
            choose={selectTool}
            icon={LocationIcon}
        >
            Select
        </ToolButton>
    )
}

function ToolButton({
    active,
    which,
    choose,
    icon,
    children,
}: {
    active: boolean
    which: Tools
    icon?: FunctionComponent
    choose: (which: Tools) => void
} & PropsWithChildren) {
    return (
        <SegmentedControl.Button
            leadingIcon={icon || undefined}
            sx={{
                userSelect: 'none',
            }}
            selected={active}
            onClick={() => {
                choose(which)
            }}
        >
            {children as string}
        </SegmentedControl.Button>
    )
}
