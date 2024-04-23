import { GestureKey, Handler } from '@use-gesture/react'
import invariant from 'tiny-invariant'
import { ToolContext } from './state'

export type GestureType = GestureKey
export type GestureState<G extends GestureType> = Parameters<Handler<G>>[0]

export enum GesturePhase {
    Hover = 'HOVER',
    DragStart = 'DRAG_START',
    DragContinue = 'DRAG_CONTINUE',
    DragCommit = 'DRAG_COMMIT',
    Tap = 'TAP',
}

export type GestureFn<K extends GestureKey = GestureKey> = (
    phase: GesturePhase,
    gesture: GestureState<K>,
    context: ToolContext,
) => unknown

export function phaseFromGesture<G extends GestureKey>(
    type: G,
    gesture: GestureState<G>,
    ongoingPhase: GesturePhase | undefined,
): GesturePhase | null {
    switch (type) {
        case 'move':
            return ongoingPhase ? null : GesturePhase.Hover
        case 'drag':
            invariant('tap' in gesture)
            if (gesture.tap) {
                return GesturePhase.Tap
            } else if (gesture.first) {
                return GesturePhase.DragStart
            } else if (gesture.last) {
                return GesturePhase.DragCommit
            } else {
                return GesturePhase.DragContinue
            }
    }
    throw new Error('Unhandleable gesture: ' + type)
}
