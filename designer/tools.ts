import invariant from 'tiny-invariant'
import { rect } from '..'
import { GenericResource, Spatial } from '../formats'
import { GesturePhase, GestureState } from './gestures'
import { useLiaison } from './liaison'
import { useSelector } from './state'

type Callbacks = ReturnType<typeof useLiaison>

export function useTool() {
    const liaisonData = useLiaison()
    const resource = useSelector((state) => state.edited.loaded[0])
    /** the layer we're editing */
    const layer = useSelector((state) => resource?.items[state.ui.layer!])

    const toolName = useSelector((state) => state.ui.tool)
    console.log('hook for', toolName)

    switch (toolName) {
        case 'select':
            return useSelectTool(liaisonData, layer)
        case 'draw':
            return useDrawTool(liaisonData, layer)
        case 'create':
            return useCreateTool(liaisonData, layer)
    }

    throw new Error('Invalid tool: ' + toolName)
}

function useSelectTool(callbacks: Callbacks, layer: GenericResource.Editable) {
    return (
        canvas: HTMLCanvasElement,
        phase: GesturePhase,
        gesture: GestureState,
    ) => {
        // console.warn("select", phase, layer)
        // @ts-expect-error
        const can_drag_elements = layer.isSparse
        const has_held_still_for_enough_time =
            // @ts-expect-error
            gesture.total_movement < 1 && gesture.duration > 200
        const already_dragging_something = gesture.memo

        const big_enough_for_marquee = true

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
                    const k = callbacks.onMarquee(
                        canvas,
                        layer,
                        rect.fromCorners(...gesture.initial, ...gesture.values),
                    )
                }
                break
            case GesturePhase.DragCommit:
                break
        }
        return
    }
}

function useDrawTool(callbacks: Callbacks, layer: GenericResource.Editable) {
    return (
        canvas: HTMLCanvasElement,
        phase: GesturePhase,
        g: GestureState,
    ) => {
        // console.warn('draw', phase, g)
    }
}

function useCreateTool(callbacks: Callbacks, layer: GenericResource.Editable) {
    return (
        canvas: HTMLCanvasElement,
        phase: GesturePhase,
        g: GestureState,
    ) => {
        // console.warn('create', phase, g)
    }
}
