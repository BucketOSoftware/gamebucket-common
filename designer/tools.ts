import { noop } from 'ts-essentials'
import { ButtonProps, MaybeElement } from '@blueprintjs/core'
import { createContext, useMemo } from 'react'
import invariant from 'tiny-invariant'

import { Container, ResourceType, Spatial } from '../formats'
import { GesturePhase, GestureState } from './gestures'
import { useLiaison } from './liaison'
import {
    RootState,
    applyPalette,
    getSelectedLayer,
    selectElements,
    selectMarquee,
    useDispatch,
    useSelectedLayer,
    useSelector,
} from './store'

type LiaisonData = ReturnType<typeof useLiaison>

// export function useTool(): ToolFn<Spatial.Editable> {
//     const dispatch = useDispatch()
//     const liaisonData = useLiaison()
//     const toolName = useSelector((state) => state.selected.tool)

//     return useMemo(
//         () => toolCallbacks[toolName](dispatch, liaisonData),
//         [toolName, dispatch, liaisonData],
//     )
// }

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

// const toolCallbacks: Record<
//     ToolID,
//     (
//         dispatch: ReturnType<typeof useDispatch>,
//         liaison: LiaisonData,
//     ) => ToolFn<Spatial.Editable>
// > = {
export const SelectTool: ToolDef<'select'> = {
    id: 'select',
    displayName: 'Select',
    icon: 'hand-up',

    enabled(state) {
        return getSelectedLayer(state)?.type === ResourceType.SpatialSparse2D
        // return state.loaded[0].items[state.selected.layer as Container.ItemID].type === 
    },

    viewportHandler(dispatch, liaison) {
        return (phase, gesture, viewport, layer) => {
            invariant(liaison.select)

            const marqueeArea = [
                gestureVecToViewportRelative(gesture.values, viewport),
                gestureVecToViewportRelative(
                    gesture.memo ?? gesture.values,
                    viewport,
                ),
            ] as const

            switch (phase) {
                case GesturePhase.DragStart:
                    return gesture.values
                case GesturePhase.DragContinue:
                    invariant(gesture.memo)

                    liaison.select(layer, viewport, marqueeArea, (r) =>
                        dispatch(selectMarquee(r)),
                    )

                    return gesture.memo
                case GesturePhase.DragCommit:
                    dispatch(
                        selectElements([
                            undefined,
                            liaison.select(layer, viewport, marqueeArea, noop),
                        ]),
                    )
                    dispatch(selectMarquee())
                    return
                default:
                // TODO?
                // case GesturePhase.Tap:
                // case GesturePhase.Hover:
            }

            return
        }
    },
}


export const CreateTool: ToolDef<'create'> = {
    id: 'create',
    icon: 'new-object',
    displayName: 'Create',

    enabled(state) {
        return getSelectedLayer(state)?.type === ResourceType.SpatialSparse2D
    },

    viewportHandler
}

export const PlotTool: ToolDef<'plot'> = {
    id: 'plot',
    icon: 'draw',
    displayName: 'Draw',
    
    enabled(state) {
        return getSelectedLayer(state)?.type === ResourceType.SpatialDense2D
        // return state.loaded[0].items[state.selected.layer as Container.ItemID].type === 
    },

    viewportHandler(dispatch, liaison) {
        return (phase, gesture, viewport, layer) => {
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
        }
    },
}
// create: (dispatch, liaison) => (phase, gesture, viewport, layer) => {},

// zoom: (dispatch, liaison) => (phase, gesture, viewport, layer) => {},
// }

///// utils

// TODO?: factor in window.scroll*?
const gestureVecToViewportRelative = (
    [x, y]: [number, number],
    { left, top }: DOMRect,
) => ({ x: x - left, y: y - top })

export interface ToolDef<
    ID extends string,
    Layer extends Spatial.Editable = Spatial.Editable,
> {
    readonly id: ID
    readonly icon: ButtonProps['icon']
    readonly displayName: string

    readonly viewportHandler: (
        dispatch: ReturnType<typeof useDispatch>,
        liaison: LiaisonData,
    ) => ToolFn<Layer>

    readonly enabled?: (state: Readonly<RootState>) => boolean

    // readonly viewportClass: (state: Readonly<RootState>) => string
}

export const Toolboxy = createContext<ToolDef<string, Spatial.Editable>[]>([])

// function Buh () {
//     return (<Toolboxy.Provider values={}></Toolboxy.Provider>)
// // return <Toolbox.Provider ><div/></Toolbox.Provider>
// }
