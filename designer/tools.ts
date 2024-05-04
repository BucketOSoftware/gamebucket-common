import { useMemo } from 'react'
import invariant from 'tiny-invariant'

import { ResourceType, Spatial } from '../formats'
import * as rect from '../rect'
import { GesturePhase, GestureState } from './gestures'
import { useLiaison } from './liaison'
import {
    applyPalette,
    selectElements,
    selectMarquee,
    useDispatch,
    useSelector,
} from './state'
import { ToolID } from './types'
import { noop } from 'ts-essentials'

type LiaisonData = ReturnType<typeof useLiaison>

export function useTool(): ToolFn<Spatial.Editable> {
    const dispatch = useDispatch()
    const liaisonData = useLiaison()
    const toolName = useSelector((state) => state.selected.tool)

    return useMemo(
        () => toolCallbacks[toolName](dispatch, liaisonData),
        [toolName, dispatch, liaisonData],
    )
}

type ToolFn<L extends Spatial.Editable> = (
    phase: GesturePhase,
    gesture: GestureState,
    viewport: DOMRect,
    layer: Readonly<L>,
) => any

const toolCallbacks: Record<
    ToolID,
    (
        dispatch: ReturnType<typeof useDispatch>,
        liaison: LiaisonData,
    ) => ToolFn<Spatial.Editable>
> = {
    select: (dispatch, liaison) => (phase, gesture, viewport, layer) => {
        invariant(liaison.select)

        // @ts-expect-error
        const can_drag_elements = layer.isSparse
        const has_held_still_for_enough_time =
            // @ts-expect-error
            gesture.total_movement < 1 && gesture.duration > 200
        const already_dragging_something = gesture.memo

        const big_enough_for_marquee = true

        const marqueeArea = [
            gestureVecToViewportRelative(gesture.values, viewport),
            gestureVecToViewportRelative(
                gesture.memo ?? gesture.values,
                viewport,
            ),
        ] as const

        // console.log(gesture.values)
        switch (phase) {
            // case GesturePhase.Hover:
            // 1. get objects under the cursor and mark them as "hovered"
            // break
            case GesturePhase.DragStart:
                return gesture.values
                // do nothing
                break
            case GesturePhase.DragContinue: {
                invariant(gesture.memo)
                const selected = liaison.select(
                    layer,
                    viewport,
                    marqueeArea,
                    (r) => dispatch(selectMarquee(r)),
                )

                return gesture.memo
            }
            case GesturePhase.DragCommit:
                {
                    dispatch(
                        selectElements([
                            undefined,
                            liaison.select(layer, viewport, marqueeArea, noop),
                        ]),
                    )
                    dispatch(selectMarquee())
                    return
                }
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
                // console.warn(
                // rect.fromCorners(...gesture.initial, ...gesture.values),
                // )
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

    draw: (dispatch, liaison) => (phase, gesture, viewport, layer) => {
        invariant(liaison.selectLine, 'No selectLine handler')
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

                const ids = liaison.selectLine(
                    layer as Spatial.Dense<2>, // no idea why this was failing despite the invariant above
                    viewport,
                    [pos, previous],
                )

                if (ids) {
                    dispatch(applyPalette(ids!))
                }
                return pos
            }
        }
    },

    create: (dispatch, liaison) => (phase, gesture, viewport, layer) => {},

    zoom: (dispatch, liaison) => (phase, gesture, viewport, layer) => {},
} as const

///// utils

// TODO?: factor in window.scroll*?
const gestureVecToViewportRelative = (
    [x, y]: [number, number],
    { left, top }: DOMRect,
) => ({ x: x - left, y: y - top })
