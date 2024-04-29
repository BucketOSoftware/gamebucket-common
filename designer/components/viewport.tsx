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

    const [canvasSize, setCanvasSize] = useState({ width: NaN, height: NaN })
    // const [height, setHeight] = useState(0)

    useEffect(() => {
        // console.warn('Changggg...', canvasRef.current, loaded, redraw)
        requestAnimationFrame(redrawAll)
    }, [canvasRef.current, loaded, redraw])

    useEffect(() => {
        const bound = canvasRef.current?.getBoundingClientRect()
        // requestAnimationFrame(redrawAll)
    }, [canvasRef.current])

    const onResize = useCallback(
        // TODO: multiple??
        ([re]: ResizeObserverEntry[]) => {
            invariant(canvasRef.current)

            const { inlineSize: width, blockSize: height } =
                re.contentBoxSize[0]
            setCanvasSize({ width, height })
            canvasRef.current.width =
                Math.floor(width) * window.devicePixelRatio
            canvasRef.current.height =
                Math.floor(height) * window.devicePixelRatio

            // this should be happening inside a rAF
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

    function redrawAll() {
        if (canvasRef.current && loaded && redraw) {
            const ctx = canvasRef.current.getContext('2d')
            ctx?.clearRect(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height,
            )
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

    return (
        <Carte title="viewport" wholeHeight stacking>
            <ResizeSensor onResize={onResize}>
                <div className="layerboss">
                    <canvas ref={canvasRef} className="gbk-viewport" />
                    <div>
                    </div>
                    <svg
                        style={{ left: 32, top: 32, width: 32, height: 32 }}
                        className="marching-ants"
                        viewBox="0 0 40 40"
                        preserveAspectRatio="none"
                    >
                        <rect width="40" height="40" />
                    </svg>
                </div>
            </ResizeSensor>
        </Carte>
    )
}
