import { ResizeSensor } from '@blueprintjs/core'
import classnames from 'classnames'
import { useCallback, useRef, useState } from 'react'
import invariant from 'tiny-invariant'

import { GVec2 } from '../../geometry'
import {
    GesturePhase,
    GestureState,
    IGNORE_GESTURE,
    gesturePhasePersists,
    phaseFromGesture,
    useViewportGestures,
} from '../gestures'
import { useLiaison } from '../liaison'
import { useDispatch, useSelectedLayer, useSelector } from '../store'
import { useTool } from '../tools'
import { MarchingAnts } from './common'
import { ScalarResource, TODO } from '../types'
// import { MarchingAnts } from '../ui'

export function Viewport() {
    const dispatch = useDispatch()

    const viewportRef = useRef<HTMLDivElement>(null)
    const [viewportSize, setViewportSize] = useState<DOMRect>(new DOMRect())

    // Last pointer position in viewport coords
    const [cursor, setCursor] = useState<GVec2>({ x: Infinity, y: Infinity })

    const toolHandler = useTool()
    const phase = useRef<GesturePhase>()

    const editedLayer = useSelectedLayer()
    const ants = useSelector((state) => state.selected.marquee)
    const toolId = useSelector((state) => state.selected.tool)

    const onResize = useCallback(
        // TODO: why are there multiple entries? Do we have to care?
        (_: ResizeObserverEntry[]) => {
            invariant(viewportRef.current)
            setViewportSize(viewportRef.current.getBoundingClientRect())
        },
        [viewportRef],
    )

    // does useCallback actually get us anything here?
    // maybe we should move more of the tool-specific logic out of this, like it's just a dispatch
    const handleGesture = useCallback(
        <G extends 'move' | 'drag' | 'hover'>(
            gesture: GestureState<G>,
            type: G,
        ) => {
            // we want the cursor position regardless
            // console.warn(gesture.hovering, 'HOV')

            if (type === 'hover') {
                setCursor({ x: Infinity, y: Infinity })
                return
            }

            setCursor({
                x: gesture.xy[0] - viewportSize.left,
                y: gesture.xy[1] - viewportSize.top,
            })

            // Track whether a gesture is ongoing, and ignore ones that aren't relevant
            const newPhase = phaseFromGesture(type, gesture, phase.current)
            if (newPhase === IGNORE_GESTURE || !editedLayer) return
            phase.current = gesturePhasePersists(newPhase)

            return toolHandler(newPhase, gesture, viewportSize, editedLayer)
        },
        [dispatch, phase, toolHandler, editedLayer, viewportSize],
    )

    useViewportGestures(viewportRef, handleGesture)

    return (
        // <Carte title="viewport" wholeHeight stacking>
        <ResizeSensor targetRef={viewportRef} onResize={onResize}>
            <div
                ref={viewportRef}
                className={classnames(
                    'layerboss',
                    'gbk-viewport',
                    'gbk-tool-' + (toolId || 'none'),
                )}
            >
                <ViewportLayers viewportSize={viewportSize} cursor={cursor} />
                {ants && <MarchingAnts {...ants} />}
            </div>
        </ResizeSensor>
    )
}

function ViewportLayers({
    viewportSize,
    cursor,
}: {
    cursor: GVec2
    viewportSize: DOMRect
}) {
    const { Depict } = useLiaison()
    const resources = useSelector((state) => {
        const thaRoot = state.root && state.resources[state.root]
        if (!thaRoot) {
            return []
        }

        invariant('items' in thaRoot)
        // TODO: nested containers
        return thaRoot.items.map((id) => [id, state.resources[id]] as const)
    })

    if (!Depict) {
        return (
            <div className="gbk-warning">
                [!] No "Depict" component passed to designer.
            </div>
        )
    }

    if (!resources.length) {
        return <div className="gbk-warning">[!] No assets loaded.</div>
    }

    return resources.map(([id, res]) => (
        <Depict
            key={id as string}
            resourceId={id}
            resource={res as ScalarResource<TODO>}
            canvasSize={viewportSize}
            pointer={cursor}
        />
    ))
}
