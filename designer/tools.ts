import { useCallback } from 'react'
import invariant from 'tiny-invariant'

import { rect } from '..'

import { Container, ResourceType, Spatial } from '../formats'

import { GesturePhase, GestureState } from './gestures'
import { applyPalette, editElement, useDispatch, useSelector } from './state'
import { useLiaison } from './liaison'
import { ToolID } from './types'

type LiaisonData = ReturnType<typeof useLiaison>

export function useTool() {
    const liaisonData = useLiaison()
    const toolName = useSelector((state) => state.tool)

    return useCallback(
        () => toolCallbacks[toolName](liaisonData),
        [toolName, liaisonData],
    )()
}

type ToolFn<L extends Spatial.Editable> = (
    phase: GesturePhase,
    gesture: GestureState,
    viewport: DOMRect,
    layer: Readonly<L>,
    dispatch: any,
) => any

const toolCallbacks: Record<
    ToolID,
    (liaison: LiaisonData) => ToolFn<Spatial.Editable>
> = {
    select: (liaison) => (phase, gesture, viewport, layer, dispatch) => {
        // console.warn("select", phase, layer)
        // @ts-expect-error
        const can_drag_elements = layer.isSparse
        const has_held_still_for_enough_time =
            // @ts-expect-error
            gesture.total_movement < 1 && gesture.duration > 200
        const already_dragging_something = gesture.memo

        const big_enough_for_marquee = true

        // console.log(gesture.values)
        switch (phase) {
            case GesturePhase.Hover:
                // 1. get objects under the cursor and mark them as "hovered"
                break
            case GesturePhase.DragStart:
                // do nothing
                break
            case GesturePhase.DragContinue:
                if (already_dragging_something) {
                    // keep dragging: show the element(s) moved by this amount
                    return gesture.memo
                } else if (
                    can_drag_elements &&
                    has_held_still_for_enough_time
                ) {
                    // whatever we initially clicked on, now we're dragging it
                    // 1. show it somewhere else
                } else if (big_enough_for_marquee) {
                    invariant(liaison.onMarquee, 'No marquee handler')
                    /*
                    const inProgressSelectionItems = callbacks.onMarquee(
                        canvas,
                        layer,
                        rect.fromCorners(...gesture.initial, ...gesture.values),
                    )
                    */
                }
                break
            case GesturePhase.DragCommit:
            case GesturePhase.Tap:
                console.warn(
                    rect.fromCorners(...gesture.initial, ...gesture.values),
                )
                // console.debug(gesture)
                if (gesture.memo) {
                    // finish dragging this object
                } else {
                    // select items at this coordinate
                }
                break
        }
        return
    },

    draw: (liaison) => (phase, gesture, viewport, layer, dispatch) => {
        invariant(
            ResourceType.SpatialDense2D === layer.type,
            'Draw only works on tilemaps (dense 2D layers)',
        )

        switch (phase) {
            case GesturePhase.DragStart:
            case GesturePhase.DragContinue: {
                const pos = gestureVecToViewportRelative(
                    gesture.values,
                    viewport,
                )

                const previous = gesture.memo ?? pos

                const ids = liaison.selectLine!(
                    [pos, previous],
                    viewport,
                    layer,
                )
                if (ids) {
                    dispatch(applyPalette(ids!))
                }
                return pos
            }
        }
    },
    create: (liaison) => (phase, gesture, viewport, layer, dispatch) => {},
} as const

function gestureVecToViewportRelative(
    [x, y]: [number, number],
    { left, top }: DOMRect,
) {
    // TODO?: factor in window.scroll*?
    return { x: x - left, y: y - top }
}
