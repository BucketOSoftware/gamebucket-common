// import { ResizeSensor, Section, SectionCard } from '@blueprintjs/core'
import { useGesture } from '@use-gesture/react'
import {
    PropsWithChildren,
    forwardRef,
    useCallback,
    useEffect,
    useRef,
} from 'react'
import invariant from 'tiny-invariant'

import { LeaveMeAlone } from './util'
import { noop } from 'lodash-es'
import { Card } from '@blueprintjs/core'
import { Carte } from './common'
import { useSelector } from '../state'
import { useLiaison } from '../liaison'

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
    // const update = useUpdate()
    // const handleGesture = useGestureHandler()
    // const resource = useSelector((state) => state.activeResource)

    const handleGesture = noop
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const editedLayer = useSelector(
        (state) =>
            state.edited.loaded[0] &&
            state.edited.loaded[0].items[state.ui.layer!],
    )

    const { onRender } = useLiaison()

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) {
            console.warn("Can't get a context for", canvasRef.current)
            return
        }

        if (canvasRef.current && onRender) {
            onRender(
                canvasRef.current,
                [1, 0, 0, 0, 1, 0, 0, 0, 1],
                editedLayer,
            )
        }
        console.log('DRAW', editedLayer?.displayName)
    }, [canvasRef.current, editedLayer])

    // const getCanvasSize = useCallback(() => {
    //     return (
    //         canvasRef.current?.getBoundingClientRect() ?? {
    //             x: 0,
    //             y: 0,
    //             width: 0,
    //             height: 0,
    //         }
    //     )
    // }, [canvasRef.current])

    const normalizeCoordinates = useCallback(
        (v: [number, number]) => {
            // hope this works
            // TODO: use a resize observer
            const bounds = canvasRef.current?.getBoundingClientRect()
            if (!bounds) {
                return v
            }

            return [
                (v[0] - bounds.left - window.scrollX) / bounds.width,
                (v[1] - bounds.top - window.scrollY) / bounds.height,
            ] as [number, number]
        },
        [canvasRef.current],
    )

    useGesture(
        {
            onMove: (state) => {
                return handleGesture(state, 'move')
            },
            onDrag: (state) => {
                return handleGesture(state, 'drag')
            },
        },
        {
            target: canvasRef,
            transform: normalizeCoordinates,
            eventOptions: { passive: false, capture: true },
            drag: {
                from: [0, 0],
                // filterTaps: true,
            },
        },
    )

    return (
        <Carte title="viewport">
            <LeaveMeAlone>
                <canvas
                    ref={canvasRef}
                    className="gbk-viewport"
                    style={{
                        margin: '5px',
                        width: '100%',
                        touchAction: 'none',
                    }}
                />
            </LeaveMeAlone>
        </Carte>
    )
}
