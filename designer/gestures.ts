import { GestureKey, Handler } from '@use-gesture/react'
import { RefObject } from 'react'
import invariant from 'tiny-invariant'
import { createUseGesture, dragAction, moveAction } from '@use-gesture/react'
const useGesture = createUseGesture([moveAction, dragAction])
// import { ToolContext } from './state'

export const DRAG_ENTITY_THRESHOLD_MS = 200
export const DRAG_ENTITY_THRESHOLD_DISTANCE = 1

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
}

/*
export type GestureFn<K extends GestureKey = GestureKey> = (
    phase: GesturePhase,
    gesture: GestureState<K>,
    context: ToolContext,
) => unknown
*/

export const IGNORE_GESTURE = Symbol()

export function useViewportGestures(
    ref: RefObject<HTMLElement>,
    handleGesture: <G extends 'move' | 'drag'>(
        gesture: GestureState<G>,
        type: G,
    ) => any,
) {
    // const handlers = useMemo(() => {
    // return {
    const handlers = {
        onMove: (gesture: GestureState<'move'>) =>
            handleGesture(gesture, 'move'),
        onDrag: (gesture: GestureState<'drag'>) =>
            handleGesture(gesture, 'drag'),
    }
    // }, [handleGesture])

    return useGesture(handlers, {
        target: ref,
        eventOptions: { passive: false, capture: true },
        drag: {
            from: [0, 0],
        },
    })
}

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
/*
function phaseFromGesture<G extends GestureKey>(
    type: G,
    gesture: GestureState<G>,
    ongoingPhase: GesturePhase | undefined,
) {
    const nextPhase = shitPhaseFromGesture(type,gesture,ongoingPhase)


switch (nextPhase) {
    case IGNORE_GESTURE:
        return
    case GesturePhase.DragCommit:
    case GesturePhase.Tap:
        phase.current = undefined
        break
    case GesturePhase.DragStart:
        phase.current = nextPhase
        break
    case GesturePhase.DragContinue:
        invariant(phase.current === GesturePhase.DragStart)
        break
    default:
        invariant(
            !phase.current,
            "I didn't understand this code enough I guess",
        )
}
*/
