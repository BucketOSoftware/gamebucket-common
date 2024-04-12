import { Section, SectionCard } from '@blueprintjs/core'
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

    const display = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = display.current
        invariant(canvas)

        // const type = resource && resource.type
        // TODO: set cursors via CSS
        // let regCursor = ''
        // if (type === 'tile_map') {
        //     regCursor = 'crosshair'
        // }
        // canvas.style.cursor = regCursor
        update((draft) => {
            draft.canvas = canvas
            // draft.overlay = document.createElement('canvas')
        })

        const detachGestures = recognizeGestures(canvas, mouse)
        return () => {
            detachGestures()
            update((draft) => {
                draft.canvas = null
                // draft.overlay = null
            })
        }
    }, [display.current, resource])

    return (
        <Section compact title="Viewport">
            <SectionCard>
                <Canvy ref={display} className="gbk-viewport" />
            </SectionCard>
        </Section>
    )
}
