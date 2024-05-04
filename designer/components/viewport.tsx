import { ResizeSensor } from '@blueprintjs/core'
import {
    PropsWithChildren,
    RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import classnames from 'classnames'

import { Container } from '../../formats'
import * as rect from '../../rect'

import {
    GesturePhase,
    GestureState,
    IGNORE_GESTURE,
    gesturePhasePersists,
    phaseFromGesture,
    useViewportGestures,
} from '../gestures'
import { useLiaison } from '../liaison'
import {
    EditableSubresource,
    useDispatch,
    useSelectedLayer,
    useSelector,
} from '../store'
import { useTool } from '../tools'
import { Carte } from './common'
import invariant from 'tiny-invariant'

export const Viewport = (props: PropsWithChildren) => {
    const viewportRef = useRef<HTMLDivElement>(null)
    const [viewportSize, setViewportSize] = useState<DOMRect>(new DOMRect())
    const dispatch = useDispatch()
    const editedLayer = useSelectedLayer()
    const toolHandler = useTool()
    const phase = useRef<GesturePhase>()

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
        <G extends 'move' | 'drag'>(gesture: GestureState<G>, type: G) => {
            // Track whether a gesture is ongoing, and ignore ones that aren't relevant
            const newPhase = phaseFromGesture(type, gesture, phase.current)

            if (newPhase === IGNORE_GESTURE || !editedLayer) return

            let memo = toolHandler(newPhase, gesture, viewportSize, editedLayer)
            phase.current = gesturePhasePersists(newPhase)

            return memo
        },
        [dispatch, phase, toolHandler, editedLayer, viewportSize],
    )

    useViewportGestures(viewportRef, handleGesture)

    return (
        <Carte title="viewport" wholeHeight stacking>
            <ResizeSensor targetRef={viewportRef} onResize={onResize}>
                <div
                    ref={viewportRef}
                    className={classnames(
                        'layerboss',
                        'gbk-viewport',
                        'gbk-tool-' + (toolId || 'none'),
                    )}
                >
                    <ViewportLayers viewportSize={viewportSize} />
                    {ants && <MarchingAnts {...ants} />}
                </div>
            </ResizeSensor>
        </Carte>
    )
}

function ViewportLayers({ viewportSize }: { viewportSize: DOMRect }) {
    const { Depict } = useLiaison()
    const loaded = useSelector((state) => state.loaded[0])

    if (!Depict) {
        return (
            <div className="gbk-warning">
                [!] No "Depict" component passed to designer.
            </div>
        )
    }

    if (!loaded) {
        return <div className="gbk-warning">[!] No assets loaded.</div>
    }

    return loaded.itemOrder.map((id) => (
        <Depict
            key={id}
            resourceId={id as Container.ItemID}
            resource={
                loaded.items[id as Container.ItemID] as EditableSubresource
            }
            canvasSize={viewportSize}
        />
    ))
}

function MarchingAnts(props: rect.Rect) {
    return (
        <svg
            style={{
                left: props.x,
                top: props.y,
                width: props.width,
                height: props.height,
            }}
            className="marching-ants"
            viewBox="0 0 40 40"
            // prevents the scaling from applying to the rect
            preserveAspectRatio="none"
        >
            <rect width="40" height="40" />
        </svg>
    )
}
