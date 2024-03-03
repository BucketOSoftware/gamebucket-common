import { LocationIcon } from '@primer/octicons-react'
import { Box, SegmentedControl } from '@primer/react'
import { FunctionComponent } from 'preact'
import { PropsWithChildren } from 'preact/compat'
import { useContext, useEffect, useState } from 'preact/hooks'
import type * as THREE from 'three'

import { Object3DUserData, type UniqueID } from '../scenebucket'
import { normalizedCanvasPosition } from '../threez'

import { LiaisonContext } from './editor'
import { selectNode, useDispatch } from './store'

type Tools = 'drag' | 'select'

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

    const [tool, setTool] = useState<Tools>('drag')

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
            event.preventDefault()
            const point = normalizedCanvasPosition(event)

            // TODO: allow picking objects behind objects. maybe: if the
            // result of objectsAt is _exactly_ the same as it was last
            // time, cycle through the results instead of picking the last one
            for (let hit of liaison.hitTest(point)) {
                const id = selectionId(hit)

                if (id) {
                    dispatch(selectNode(id))
                    return
                }
            }
        }

        canvas.addEventListener('click', handleClick)
        return () => {
            canvas.removeEventListener('click', handleClick)
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

/** Return the closest ancestor with an ID that is visible and corporeal */
function selectionId(hit: THREE.Intersection) {
    let foundID: UniqueID | undefined
    let walker: THREE.Object3D | null = hit.object

    // Ignore helpers and lines and such
    if (!hit.face) return

    while (walker) {
        if (!walker.visible) {
            // the clicked object won't be drawn
            return undefined
        }

        if (!foundID && (walker.userData as Object3DUserData).bucket?.id) {
            foundID = walker.userData.bucket.id
        }
        walker = walker.parent
    }

    return foundID
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
            leadingIcon={icon || null}
            sx={
                {
                    /*userSelect: 'none'*/
                }
            }
            selected={active}
            onClick={() => {
                choose(which)
            }}
        >
            {children}
        </SegmentedControl.Button>
    )
}
