import { Popover, Section, SectionCard } from '@blueprintjs/core'
import { forwardRef, useEffect, useRef } from 'react'
import invariant from 'tiny-invariant'

import { recognizeGestures } from '../gestures'
import { useMouse, useSelector, useUpdate } from '../state'
import { LeaveMeAlone } from './util'

const Canvy = forwardRef<HTMLCanvasElement, { className?: string }>(
    (props, ref) => {
        return (
            <LeaveMeAlone>
                <canvas
                    ref={ref}
                    className={props.className}
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
    },
)

export function Viewport() {
    const update = useUpdate()
    const resource = useSelector((state) => state.activeResource)
    const mouse = useMouse()

    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        invariant(canvas)

        update((draft) => {
            draft.canvas = canvas
        })

        const detachGestures = recognizeGestures(canvas, mouse)
        return () => {
            detachGestures()
            update((draft) => {
                draft.canvas = null
            })
        }
    }, [canvasRef.current, resource])

    return (
        <Section compact title="Viewport">
            <SectionCard>
                <Canvy ref={canvasRef} className="gbk-viewport" />
            </SectionCard>
        </Section>
    )
}
