import { useCallback } from 'react'
import invariant from 'tiny-invariant'

import { rect } from '..'

import { Container, ResourceType, Spatial } from '../formats'

import { GesturePhase, GestureState } from './gestures'
import { editElement, useDispatch, useSelector } from './state'
import { useLiaison } from './liaison'

type Callbacks = ReturnType<typeof useLiaison>

export function useTool() {
    const liaisonData = useLiaison()
    // const resource = useSelector((state) => state.edited.loaded[0])

    const toolName = useSelector((state) => state.tool)
    console.log('hook for', toolName)

    const getThing = useCallback(() => {
        switch (toolName) {
            case 'select':
                return useSelectTool(liaisonData)
            case 'draw':
                return useDrawTool(liaisonData)
            case 'create':
                return useCreateTool(liaisonData)
        }

        throw new Error('Invalid tool: ' + toolName)
    }, [toolName, liaisonData])

    return getThing()
}

const useSelectTool =
    <L extends Spatial.Editable>(callbacks: Callbacks) =>
    (
        phase: GesturePhase,
        gesture: GestureState,
        layer: Readonly<L>,
        dispatch: any,
    ) => {
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
                    invariant(callbacks.onMarquee, 'No marquee handler')
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
                if (gesture.memo) {
                    // finish dragging this object
                } else {
                    // select items at this coordinate
                }
                break
        }
        return
    }

const useDrawTool =
    <L extends Spatial.Editable>(callbacks: Callbacks) =>
    (
        phase: GesturePhase,
        gesture: GestureState,
        layer: Readonly<L>,
        dispatch: any,
        // dispatch: typeof useDispatch,
        // update: (draft: L) => void,
    ) => {
        const guff = layer as Spatial.Editable<2>
        invariant(guff.type === ResourceType.SpatialDense2D)
        // const elem = guff.data[4] as any

        dispatch(
            editElement({
                layer: 'ground' as Container.ItemID,
                id: 4,
                property: 'tile',
                newValue: 99,
            }),
        )

        // dispatch(
        // TODO: need the update fn
        // elem.tile = 97
        // console.warn('draw', phase, g)
    }

const useCreateTool =
    <L extends Spatial.Editable>(callbacks: Callbacks) =>
    (
        phase: GesturePhase,
        gesture: GestureState,
        layer: Readonly<L>,
        update: (draft: L) => void,
    ) => {
        console.warn('yay')
    }
