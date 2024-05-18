import { useCallback, useMemo } from 'react'
import invariant from 'tiny-invariant'
import { noop } from 'ts-essentials'

import { ResourceType, Spatial } from '../formats'
import { GVec2, roundVec2 } from '../geometry'
import { Button } from './components/common'
import { GesturePhase, GestureState } from './gestures'
import { useLiaison } from './liaison'
import { applyPalette, selectTool, useDispatch, useSelector } from './store'

export interface ToolDef<
    ID extends string,
    Layer extends Spatial.Spatial = Spatial.Spatial,
> {
    readonly id: ID

    readonly viewportHandler: (
        dispatch: ReturnType<typeof useDispatch>,
        liaison: ReturnType<typeof useLiaison>,
    ) => ToolFn<Layer>

    readonly ToolbarButton: React.FunctionComponent
}

type ToolFn<L extends Spatial.Spatial> = (
    phase: GesturePhase,
    gesture: GestureState,
    viewport: DOMRect,
    layer: Readonly<L>,
) => any

export function useTool(): ToolFn<Spatial.Spatial> {
    const dispatch = useDispatch()
    const liaisonData = useLiaison()
    const selectedTool = useSelectedTool()

    return useMemo(
        () =>
            liaisonData.tools
                .find((toolDef) => toolDef.id == selectedTool)
                ?.viewportHandler(dispatch, liaisonData) ?? noop,
        [selectedTool, dispatch, liaisonData],
    )
}

/** Select elements via marquee */
export const SelectTool: ToolDef<'select'> = {
    id: 'select',

    ToolbarButton() {
        const id = 'select'
        const dispatch = useDispatch()
        const currentTool = useSelectedTool()
        const possible = useSelector(
            (state) =>
                state.resources[state.selected.layer!]?.type ===
                ResourceType.SpatialSparse2D,
        )

        const onClick = useCallback(() => {
            dispatch(selectTool(id))
        }, [])

        return (
            <Button
                icon="icon-tools"
                label="Select"
                disabled={!possible}
                active={possible && currentTool === id}
                onClick={onClick}
            />
        )
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
                    return
            }
        }
    },
}

export const CreateTool: ToolDef<'create'> = {
    id: 'create',

    ToolbarButton(props: {}) {
        return null
    },

    viewportHandler(dispatch, liaison) {
        return (phase, gesture, viewport, layer) => {}
    },
}

/**
 *  Apply currently selected palette items to elements
 *
 * @todo Fix lag when first starting the drag -- we don't care about the drag/tap distinction
 */
export const PlotTool: ToolDef<'plot'> = {
    id: 'plot',

    ToolbarButton() {
        const id = 'plot'
        const dispatch = useDispatch()
        const currentTool = useSelectedTool()
        const possible = useSelector(
            (state) =>
                state.resources[state.selected.layer!]?.type ===
                ResourceType.SpatialDense2D,
        )

        const onClick = useCallback(() => {
            dispatch(selectTool(id))
        }, [])

        return (
            <Button
                icon="icon-pencil"
                label="Draw"
                disabled={!possible}
                active={possible && currentTool === id}
                onClick={onClick}
            />
        )
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
                case GesturePhase.Tap:
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

/////
// Hooks
/////

function useSelectedTool() {
    return useSelector(
        (state) =>
            state.selected.tool[state.resources[state.selected.layer!]?.type!],
    )
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
