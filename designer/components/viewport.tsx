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

import {
    Container,
    GenericResource,
    ResourceType,
    Spatial,
} from '../../formats'

import { EditableSubresource, useDispatch, useSelector } from '../state'
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
import { rect } from '../..'

/** Normalized coordinates of the viewport, [0..1) on both axes. May be out of
 * those bounds if the gesture has gone outside of the viewport */
type ViewportCoordinates = Opaque<[number, number], 'VIEWPORT_VEC2'>

// export const Viewport = forwardRef<HTMLCanvasElement>((props, ref) => {
export const Viewport = (props: PropsWithChildren) => {
    const toolHandler = useTool()
    const { Depict } = useLiaison()

    const dispatch = useDispatch()
    const loaded = useSelector((state) => state.loaded[0])
    const editedLayer = useSelector((state) => loaded?.items[state.layer!])
    const paletteSelections = useSelector((state) => state.attribs)

    const phase = useRef<GesturePhase>()
    // const canvasRef = useRef<HTMLCanvasElement>(null)
    const viewportRef = useRef<HTMLDivElement>(null)

    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

    // useEffect(() => {
    //     requestAnimationFrame(redrawAll)
    //     console.warn(
    //         'Things have changed...',
    //         viewportRef.current,
    //         loaded,
    //         redraw,
    //     )
    // }, [viewportRef.current, loaded, redraw])

    // useEffect(() => {
    //     const bound = canvasRef.current?.getBoundingClientRect()
    //     // console.warn('Changggg...', canvasRef.current, bound)
    // }, [canvasRef.current])

    const onResize = useCallback(
        // TODO: multiple??
        ([re]: ResizeObserverEntry[]) => {
            if (!viewportRef.current) {
                console.warn(viewportRef.current, 'no viewport?')
                return
            }

            const { inlineSize: width, blockSize: height } =
                re.contentBoxSize[0]
            setCanvasSize({ width, height })
            // canvasRef.current.width =
            //     Math.floor(width) * window.devicePixelRatio
            // canvasRef.current.height =
            //     Math.floor(height) * window.devicePixelRatio

            // this should be happening inside a rAF
            // redrawAll()
        },
        [viewportRef.current],
    )

    const normalizeCoordinates = (v: [number, number]) => {
        // hope this works
        // TODO: use a resize observer
        // TODO: it seems like we need to useLayoutEffect for this? but how?

        const bounds = viewportRef.current?.getBoundingClientRect()
        if (!(bounds && bounds.width && bounds.height)) {
            // FIXME: we have to return a valid result -- what should we do?
            console.warn(
                'Returning an invalid coordinate because canvas is',
                viewportRef.current,
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

    const handleGesture = <G extends 'move' | 'drag'>(
        gesture: GestureState<G>,
        type: G,
    ) => {
        // Track whether a gesture is ongoing, and ignore ones that aren't relevant
        const newPhase = phaseFromGesture(type, gesture, phase.current)

        if (newPhase === IGNORE_GESTURE) {
            return
        }

        invariant(viewportRef.current)
        let memo = toolHandler(
            newPhase,
            gesture,
            editedLayer,
            dispatch,

            // viewportRef.current as unknown as HTMLCanvasElement,
        )
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
            target: viewportRef,
            transform: normalizeCoordinates,
            eventOptions: { passive: false, capture: true },
            drag: {
                from: [0, 0],
                filterTaps: false,
            },
        },
    )

    // function redrawAll() {
    //     if (viewportRef.current && loaded && redraw) {
    //         /*
    //         const ctx = canvasRef.current.getContext('2d')
    //         ctx?.clearRect(
    //             0,
    //             0,
    //             canvasRef.current.width,
    //             canvasRef.current.height,
    //         )
    //         */
    //         for (let layer of loaded.itemOrder) {
    //             redraw(
    //                 canvasSize,
    //                 layer as Container.ItemID,
    //                 loaded.items[
    //                     layer as Container.ItemID
    //                 ] as EditableSubresource,
    //             )
    //         }
    //     }
    // }

    return (
        <Carte title="viewport" wholeHeight stacking>
            <ResizeSensor targetRef={viewportRef} onResize={onResize}>
                <div ref={viewportRef} className="layerboss gbk-viewport">
                    {Depict &&
                        loaded?.itemOrder.map((id) => {
                            return (
                                <Depict
                                    key={id}
                                    resourceId={id as Container.ItemID}
                                    resource={
                                        loaded.items[
                                            id as Container.ItemID
                                        ] as EditableSubresource
                                    }
                                    canvasSize={canvasSize}
                                />
                            )
                            // key: id as Container.ItemID,
                            // layer: loaded.items[id as Container.ItemID],
                            // size: canvasSize,
                            // })
                        })}
                </div>
            </ResizeSensor>
        </Carte>
    )
}

function ViewportLayer<
    L extends GenericResource.Editable<ResourceType>,
>(props: { key: Container.ItemID; layer: L; size: rect.Size }) {
    // const { redraw } = useLiaison()

    const x = document.createElement('div')
    x.innerText = 'Hellote' + props.key
    return <>{x}</>
}
/*

<canvas ref={canvasRef} className="gbk-viewport" />
                    <div>
                        <div
                            style={{
                                position: 'absolute',
                                top: 32,
                                left: 32,
                                width: 32,
                                height: 32,
                                borderRadius: '5px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '1.5rem',
                                backgroundColor: 'black',
                                color: 'white',
                                cursor: 'pointer',
                                userSelect: 'none',
                                touchAction: 'none',
                            }}
                        >
                            !
                        </div>
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

                */
