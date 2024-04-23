import { ResizeSensor, Section, SectionCard } from '@blueprintjs/core'
import { useGesture } from '@use-gesture/react'
import { forwardRef, useCallback, useEffect, useRef } from 'react'
import invariant from 'tiny-invariant'

import { useGestureHandler, useSelector, useUpdate } from '../state'
import { LeaveMeAlone } from './util'

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
                    position: 'fixed',
                    margin: '5px',
                    width: '100%',
                    // borderRadius: '3px',
                    touchAction: 'none',
                }}
            />
        </LeaveMeAlone>
    )
})

export function Viewport() {
    const update = useUpdate()
    const handleGesture = useGestureHandler()
    const resource = useSelector((state) => state.activeResource)

    const canvasRef = useRef<HTMLCanvasElement>(null)

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

    useEffect(() => {
        const canvas = canvasRef.current
        invariant(canvas)

        update((draft) => {
            draft.canvas = canvas
        })

        return () => {
            update((draft) => {
                draft.canvas = null
            })
        }
    }, [canvasRef.current, resource])

    return (
        <Section compact title="Viewport">
            <SectionCard>
                {/* <ResizeSensor 
                    targetRef={canvasRef}
                >*/}
                <Canvy ref={canvasRef} className="gbk-viewport" />
                {/* </ResizeSensor> */}
            </SectionCard>
        </Section>
    )
}
