import { ResizeSensor } from '@blueprintjs/core'
import { useGesture } from '@use-gesture/react'
import { PropsWithChildren, useCallback, useRef, useState } from 'react'
import invariant from 'tiny-invariant'

import { Container, GenericResource, ResourceType } from '../../formats'
import * as rect from '../../rect'

import {
    GesturePhase,
    GestureState,
    IGNORE_GESTURE,
    gesturePhasePersists,
    phaseFromGesture,
} from '../gestures'
import { useLiaison } from '../liaison'
import { EditableSubresource, useDispatch, useSelector } from '../state'
import { useTool } from '../tools'

import { Carte } from './common'

export const Viewport = (props: PropsWithChildren) => {
    const toolHandler = useTool()
    const { Depict } = useLiaison()

    const dispatch = useDispatch()
    const loaded = useSelector((state) => state.loaded[0])
    const editedLayer = useSelector((state) => loaded?.items[state.layer!])
    // const paletteSelections = useSelector((state) => state.attribs)

    const phase = useRef<GesturePhase>()
    const viewportRef = useRef<HTMLDivElement>(null)

    const [viewportSize, setViewportSize] = useState<DOMRect>(new DOMRect())

    const onResize = useCallback(
        // TODO: multiple??
        (_: ResizeObserverEntry[]) => {
            if (!viewportRef.current) {
                console.warn(viewportRef.current, 'no viewport?')
                return
            }

            setViewportSize(viewportRef.current.getBoundingClientRect())
        },
        [viewportRef.current],
    )

    const handleGesture = <G extends 'move' | 'drag'>(
        gesture: GestureState<G>,
        type: G,
    ) => {
        // Track whether a gesture is ongoing, and ignore ones that aren't relevant
        const newPhase = phaseFromGesture(type, gesture, phase.current)

        if (newPhase === IGNORE_GESTURE) {
            return
        }

        let memo = toolHandler(
            newPhase,
            gesture,
            viewportSize,
            editedLayer,
            dispatch,
        )

        phase.current = gesturePhasePersists(newPhase)

        return memo
    }

    const onMove = useCallback(
        (state: GestureState<'move'>) => handleGesture(state, 'move'),
        [handleGesture],
    )

    const onDrag = useCallback(
        (state: GestureState<'drag'>) => handleGesture(state, 'drag'),
        [handleGesture],
    )

    useGesture(
        { onMove, onDrag },
        {
            target: viewportRef,
            eventOptions: { passive: false, capture: true },
            drag: {
                from: [0, 0],
                filterTaps: false,
            },
        },
    )

    return (
        <Carte title="viewport" wholeHeight stacking>
            <ResizeSensor targetRef={viewportRef} onResize={onResize}>
                <div ref={viewportRef} className="layerboss gbk-viewport">
                    {Depict &&
                        loaded?.itemOrder.map((id) => {
                            return (
                                <Depict
                                    key={id}
                                    resourceId={id as Container.ItemID}
                                    resource={
                                        loaded.items[
                                            id as Container.ItemID
                                        ] as EditableSubresource
                                    }
                                    canvasSize={viewportSize}
                                />
                            )
                        })}
                    <MarchingAnts x={0} y={0} width={42} height={97} />
                </div>
            </ResizeSensor>
        </Carte>
    )
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
