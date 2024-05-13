import {
    DragConfig,
    GestureKey,
    Handler,
    createUseGesture,
    dragAction,
    moveAction,
    hoverAction,
} from '@use-gesture/react'
import { RefObject, useCallback, useMemo, useState } from 'react'
import invariant from 'tiny-invariant'

export const useGesture = createUseGesture([
    moveAction,
    dragAction,
    hoverAction,
])

export const DRAG_ENTITY_THRESHOLD_MS = 200
// export const DRAG_ENTITY_THRESHOLD_DISTANCE = 1

export type GestureType = GestureKey
export type GestureState<G extends GestureType = GestureType> = Parameters<
    Handler<G>
>[0]

export enum GesturePhase {
    Hover = 'HOVER',
    DragStart = 'DRAG_START',
    DragContinue = 'DRAG_CONTINUE',
    DragCommit = 'DRAG_COMMIT',
    Tap = 'TAP',
    MouseOut = 'MOUSE_OUT',
}

const uVG_eventOptions = { passive: false } as const
const uVG_dragOptions: DragConfig = {
    delay: true,
    preventDefault: true,
    from: [0, 0],
} as const

export function useViewportGestures(
    ref: RefObject<HTMLElement>,
    handleGesture: <G extends 'move' | 'drag'>(
        gesture: GestureState<G>,
        type: G,
    ) => any,
) {
    const handlers = useMemo(
        () => ({
            onHover: (gesture: GestureState<'hover'>) => {
                if (gesture.hovering === false) {
                    handleGesture(gesture as GestureState<'move'>, 'move')
                }
            },
            onMove: (gesture: GestureState<'move'>) =>
                handleGesture(gesture, 'move'),
            onDrag: (gesture: GestureState<'drag'>) =>
                handleGesture(gesture, 'drag'),
        }),
        [handleGesture],
    )

    return useGesture(handlers, {
        target: ref,
        eventOptions: uVG_eventOptions,
        drag: uVG_dragOptions,
    })
}

export const IGNORE_GESTURE = Symbol()

export function phaseFromGesture<G extends GestureKey>(
    type: G,
    gesture: GestureState<G>,
    ongoingPhase: GesturePhase | undefined,
): GesturePhase | typeof IGNORE_GESTURE {
    switch (type) {
        case 'move':
            // we only want a hover event if nothing else is happening
            return ongoingPhase ? IGNORE_GESTURE : GesturePhase.Hover
        case 'drag':
            invariant('tap' in gesture)
            if (gesture.tap) {
                return GesturePhase.Tap
            } else if (gesture.first) {
                invariant(!ongoingPhase)
                return GesturePhase.DragStart
            } else if (gesture.last) {
                invariant(
                    ongoingPhase === GesturePhase.DragStart ||
                        ongoingPhase === GesturePhase.DragContinue,
                )
                return GesturePhase.DragCommit
            } else {
                invariant(
                    ongoingPhase === GesturePhase.DragStart ||
                        ongoingPhase === GesturePhase.DragContinue,
                )
                return GesturePhase.DragContinue
            }
    }
    throw new Error('Unhandleable gesture: ' + type)
}
/**
 *
 * @return The gesture phase to keep for next time, or undefined
 */
export function gesturePhasePersists(
    phase: GesturePhase,
): GesturePhase | undefined {
    switch (phase) {
        // These gesture phases don't need to be passed to the next invocation of the handlers
        case GesturePhase.DragCommit:
        case GesturePhase.Hover:
        case GesturePhase.Tap:
            return
    }

    return phase
}

const draggableConfig: DragConfig = {
    preventDefault: true,
    from: [0, 0], // for .offset
}

export type DraggableCallback = (value: true | [dx: number, dy: number]) => void
export function useDraggable<T extends HTMLElement>(
    ref: RefObject<T>,
    callback: DraggableCallback,
) {
    const [displacement, setDisplacement] = useState([0, 0])

    const onDrag = useCallback(
        (state: GestureState<'drag'>) => {
            // prevent events from bubbling to elements behind this one
            state.event.stopPropagation()

            if (state.tap) {
                setDisplacement([0, 0])
                callback(true)
            } else {
                const [dx, dy] = state.movement
                if (state.last) {
                    callback([dx, dy])
                    setDisplacement([0, 0])
                } else {
                    setDisplacement([dx, dy])
                }
            }
        },
        [callback],
    )

    useGesture(
        { onDrag },
        {
            target: ref,
            eventOptions: { passive: false, capture: false },

            drag: draggableConfig,
        },
    )

    return displacement
}
