import { useMemo } from 'react'
import invariant from 'tiny-invariant'
import { noop } from 'ts-essentials'

import { ResourceType, Spatial } from '../formats'
import { GesturePhase, GestureState } from './gestures'
import { useLiaison } from './liaison'
import {
    RootState,
    applyPalette,
    getSelectedLayer,
    selectElements,
    selectMarquee,
    useDispatch,
    useSelector,
} from './store'
import { GVec2, roundVec2 } from '../geometry'

export interface ToolDef<
    ID extends string,
    Layer extends Spatial.Editable = Spatial.Editable,
> {
    readonly id: ID
    readonly icon: string //ButtonProps['icon']
    readonly displayName: string

    readonly viewportHandler: (
        dispatch: ReturnType<typeof useDispatch>,
        liaison: LiaisonData,
    ) => ToolFn<Layer>

    readonly enabled?: (state: Readonly<RootState>) => boolean
}

type LiaisonData = ReturnType<typeof useLiaison>

export function useTool(): ToolFn<Spatial.Editable> {
    const dispatch = useDispatch()
    const liaisonData = useLiaison()
    const selectedTool = useSelector((state) => state.selected.tool)

    return useMemo(
        () =>
            liaisonData.tools
                .find((toolDef) => toolDef.id == selectedTool)!
                .viewportHandler(dispatch, liaisonData),
        [selectedTool, dispatch, liaisonData],
    )
}

type ToolFn<L extends Spatial.Editable> = (
    phase: GesturePhase,
    gesture: GestureState,
    viewport: DOMRect,
    layer: Readonly<L>,
) => any

/** Select elements via marquee */
export const SelectTool: ToolDef<'select'> = {
    id: 'select',
    displayName: 'Select',
    // icon: 'hand-up',
    icon: 'icon-tools',

    enabled(state) {
        return getSelectedLayer(state)?.type === ResourceType.SpatialSparse2D
        // return state.loaded[0].items[state.selected.layer as Container.ItemID].type ===
    },

    viewportHandler(dispatch, liaison) {
        return (phase, gesture, viewport, layer) => {
            invariant(liaison.select)

            const to = gestureVecToViewportRelative(gesture.values, viewport)
            const from = gestureVecToViewportRelative(
                gesture.memo ?? gesture.values,
                viewport,
            )
            if (!(to && from)) {
                return
            }

            switch (phase) {
                case GesturePhase.Hover:
                    // DOM can probably handle this
                    return
                case GesturePhase.DragStart:
                    return gesture.values
                case GesturePhase.DragContinue:
                    invariant(gesture.memo)

                    liaison.select(
                        {
                            viewport,
                            dispatch,
                            gesture: { action: 'drag', to, from },
                        },
                        layer,
                    )

                    return gesture.memo
                case GesturePhase.DragCommit:
                    liaison.select(
                        {
                            viewport,
                            dispatch,
                            gesture: {
                                action: 'drag',
                                to,
                                from,
                                complete: true,
                            },
                        },
                        layer,
                    )
                    return
                default:
            }

            return
        }
    },
}

export const CreateTool: ToolDef<'create'> = {
    id: 'create',
    // icon: 'new-object',
    icon: 'new-object',
    displayName: 'Create',

    enabled(state) {
        return false
        // return getSelectedLayer(state)?.type === ResourceType.SpatialSparse2D
    },

    viewportHandler(dispatch, liaison) {
        return (phase, gesture, viewport, layer) => {}
    },
}

/** Apply currently selected palette items to elements */
export const PlotTool: ToolDef<'plot'> = {
    id: 'plot',
    icon: 'icon-pencil',
    displayName: 'Draw',

    enabled(state) {
        return getSelectedLayer(state)?.type === ResourceType.SpatialDense2D
    },

    viewportHandler(dispatch, liaison) {
        return (phase, gesture, viewport, layer) => {
            invariant(liaison.selectLine, 'No selectLine handler')
            invariant(
                ResourceType.SpatialDense2D === layer.type,
                'Draw only works on tilemaps (dense 2D layers)',
            )

            const pos = gestureVecToViewportRelative(gesture.values, viewport)
            if (!pos) {
                return
            }
            roundVec2(pos)

            switch (phase) {
                case GesturePhase.DragStart:
                case GesturePhase.DragContinue: {
                    const previous = (gesture.memo as GVec2) ?? pos

                    const ids =
                        liaison.selectLine(
                            layer as Spatial.Dense<2>, // no idea why this was failing despite the invariant above
                            viewport,
                            [pos, previous],
                        ) ?? []

                    dispatch(applyPalette(ids))
                    return pos
                }
            }
        }
    },
}

///// utils

// TODO?: factor in window.scroll*?
function gestureVecToViewportRelative(
    [x, y]: [number, number],
    { left, top, right, bottom }: DOMRect,
    clip: boolean = true,
) {
    // TODO: are right and bottom inclusive or exclusive
    if (clip && (x < left || x > right || y < top || y > bottom)) {
        return
    }

    return { x: x - left, y: y - top }
}
