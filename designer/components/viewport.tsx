import { useGesture } from '@use-gesture/react'
import {
    PropsWithChildren,
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import invariant from 'tiny-invariant'
import { noop } from 'lodash-es'

import { Container, Spatial } from '../../formats'

import { EditableSubresource, useSelector } from '../state'
import { useLiaison } from '../liaison'
import { useTool } from '../tools'
import {
    GesturePhase,
    GestureState,
    IGNORE_GESTURE,
    gesturePhasePersists,
    phaseFromGesture,
} from '../gestures'

import { LeaveMeAlone } from './util'
import { Carte } from './common'
import { Opaque } from 'ts-essentials'
import { ResizeSensor } from '@blueprintjs/core'

/** Normalized coordinates of the viewport, [0..1) on both axes. May be out of
 * those bounds if the gesture has gone outside of the viewport */
type ViewportCoordinates = Opaque<[number, number], 'VIEWPORT_VEC2'>

const Canvy = forwardRef<
    HTMLCanvasElement,
    React.HTMLAttributes<HTMLCanvasElement>
>((props, ref) => {
    return (
        <LeaveMeAlone>
            <canvas
                ref={ref}
                {...props}
                // className={props.className}
                style={{
                    margin: '5px',
                    width: '100%',
                    // borderRadius: '3px',
                    touchAction: 'none',
                }}
            />
        </LeaveMeAlone>
    )
})

// export const Viewport = forwardRef<HTMLCanvasElement>((props, ref) => {
export const Viewport = (props: PropsWithChildren) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const { redraw } = useLiaison()

    const loaded = useSelector((state) => state.edited.loaded[0])
    const editedLayer = useSelector((state) => loaded?.items[state.ui.layer!])
    const toolHandler = useTool()
    const p = useSelector((state) => state.ui.attribs)

    function redrawAll() {
        if (canvasRef.current && loaded && redraw) {
            // console.warn('Draw it all!', loaded)
            for (let layer of loaded.itemOrder) {
                redraw(
                    canvasRef.current,
                    layer as Container.ItemID,
                    loaded.items[
                        layer as Container.ItemID
                    ] as EditableSubresource,
                )
            }
        }
    }

    useEffect(() => {
        console.warn('Changggg...', canvasRef.current, loaded, redraw)
        requestAnimationFrame(redrawAll)
    }, [canvasRef.current, loaded, redraw])

    const onResize = useCallback(
        ([re]: ResizeObserverEntry[]) => {
            // requestAnimationFrame(() => {
            console.log(
                canvasRef.current?.width,
                canvasRef.current?.height,
                re.contentBoxSize[0],
                // re.borderBoxSize[0].blockSize,
            )
            // if (!canvasRef.current) return
            invariant(canvasRef.current)
            const w = Math.ceil(re.contentBoxSize[0].inlineSize)
            const h = Math.ceil(re.contentBoxSize[0].blockSize)
            canvasRef.current.width = w * window.devicePixelRatio
            canvasRef.current.height = h * window.devicePixelRatio
            redrawAll()
        },
        [canvasRef.current],
    )

    const normalizeCoordinates = (v: [number, number]) => {
        // hope this works
        // TODO: use a resize observer
        // TODO: it seems like we need to useLayoutEffect for this? but how?

        const bounds = canvasRef.current?.getBoundingClientRect()
        if (!(bounds && bounds.width && bounds.height)) {
            // FIXME: we have to return a valid result -- what should we do?
            console.warn(
                'Returning an invalid coordinate because canvas is',
                canvasRef.current,
                bounds,
            )
            return [0.97, 0.97] as [number, number]
        }

        // useGesture wants a tuple
        return [
            (v[0] - bounds.left - window.scrollX) / bounds.width,
            (v[1] - bounds.top - window.scrollY) / bounds.height,
        ] as ViewportCoordinates
    }

    const phase = useRef<GesturePhase>()

    const handleGesture = <G extends 'move' | 'drag'>(
        gesture: GestureState<G>,
        type: G,
    ) => {
        // Track whether a gesture is ongoing, and ignore ones that aren't relevant
        const newPhase = phaseFromGesture(type, gesture, phase.current)

        if (newPhase === IGNORE_GESTURE) {
            return
        }

        invariant(canvasRef.current)
        let memo = toolHandler(canvasRef.current, newPhase, gesture)
        phase.current = gesturePhasePersists(newPhase)
        // console.log('Ope:', newPhase, phase.current)

        return memo
    }

    const onMove = useCallback(
        (state: GestureState<'move'>) => handleGesture(state, 'move'),
        [handleGesture],
    )

    const onDrag = useCallback(
        (state: GestureState<'drag'>) => handleGesture(state, 'drag'),
        [handleGesture],
    )

    useGesture(
        { onMove, onDrag },
        {
            target: canvasRef,
            transform: normalizeCoordinates,
            eventOptions: { passive: false, capture: true },
            drag: {
                from: [0, 0],
                filterTaps: false,
            },
        },
    )

    return (
        <Carte title="viewport" wholeHeight>
            {/* <LeaveMeAlone> */}
            <ResizeSensor targetRef={canvasRef} onResize={onResize}>
                <canvas
                    ref={canvasRef}
                    className="gbk-viewport"
             
                />
            </ResizeSensor>
            {/* </LeaveMeAlone> */}
        </Carte>
    )
}

// maybe eac

// function LayerCanvas(props: {
//     layer: Spatial.Editable<2>
//     layerID: Container.ItemID
// }) {
//     // This is to render onto, not to actually render. TODO: offscreencanvas?
//     // const [canvas] = useState(document.createElement('canvas'))
//     // useEffect(() => console.warn('NEW CANVAS:', canvas), [canvas])
//     const canvy = useMemo(
//         () => document.createElement('canvas'),
//         [props.layerID],
//     )

//     // useLiaison
//     // useEffect(() => {

//     // }, [props.layer, props.layerID])
//     // return <></>
// }
