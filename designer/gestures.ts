import { Static, TSchema } from '@sinclair/typebox'
import { rect } from 'gamebucket'
import invariant from 'tiny-invariant'

export const GESTURE_PHASE = {
    START: 'gesture.start',
    CONTINUE: 'gesture.continue',
    COMMIT: 'gesture.commit',
    CANCEL: 'gesture.cancel',
    HOVER: 'gesture.hover',
} as const

export type GesturePhase = (typeof GESTURE_PHASE)[keyof typeof GESTURE_PHASE]

//

/** called by the editor when this resource is selected and there's a click in the viewport with the pencil tool active, or perhaps a line drawn by a line tool. Params will be the normalized viewport coordinate [0..1)?, and the value that's been plotted.
 * @todo what could the return value mean?
 * @todo make this a two-point thing
 */
export type PlotHandler<PK> = (
    phase: Omit<GesturePhase, typeof GESTURE_PHASE.CANCEL>,
    x: number,
    y: number,
    value: PK,
) => void

/** @returns An iterable of items within the rect */
export type SelectHandler<V extends TSchema> = (
    phase: GesturePhase | undefined,
    selectionArea: rect.Rect | 'all',
) => Iterable<Static<V>> | void

const mouseEvents = ['mousedown', 'mousemove', 'mouseup'] as const

export function recognizeGestures(
    dom: HTMLCanvasElement,
    mouseInput: (
        phase: GesturePhase,
        viewport_x: number,
        viewport_y: number,
        begin_x: number,
        begin_y: number,
        originalEvent: MouseEvent,
    ) => void,
) {
    let leftButtonDown = false
    let begin_x = NaN
    let begin_y = NaN
    let last_x = 0
    let last_y = 0

    function mouseHandler(ev: MouseEvent) {
        const viewport_x = ev.offsetX / dom.offsetWidth
        const viewport_y = ev.offsetY / dom.offsetHeight

        switch (ev.type) {
            case 'mousedown':
                if (ev.buttons === 1) {
                    invariant(!leftButtonDown)
                    leftButtonDown = true
                    begin_x = viewport_x
                    begin_y = viewport_y
                    mouseInput(
                        GESTURE_PHASE.START,
                        viewport_x,
                        viewport_y,
                        begin_x,
                        begin_y,
                        ev,
                    )
                }
                break
            case 'mousemove':
                if (ev.buttons === 1) {
                    invariant(leftButtonDown, 'button handling??')
                    // drag
                    mouseInput(
                        GESTURE_PHASE.CONTINUE,
                        viewport_x,
                        viewport_y,
                        begin_x,
                        begin_y,
                        ev,
                    )
                } else if (ev.buttons === 0) {
                    // hover
                    mouseInput(
                        GESTURE_PHASE.HOVER,
                        viewport_x,
                        viewport_y,
                        NaN,
                        NaN,
                        ev,
                    )
                }
                break
            case 'mouseup':
                invariant((ev.buttons & 1) === 0)
                mouseInput(
                    GESTURE_PHASE.COMMIT,
                    viewport_x,
                    viewport_y,
                    begin_x,
                    begin_y,
                    ev,
                )
                leftButtonDown = false
                begin_x = NaN
                begin_y = NaN
                break
        }
    }

    for (let eventType of mouseEvents) {
        // console.log('Attaching', eventType)
        dom.addEventListener(eventType, mouseHandler)
    }

    return () => {
        for (let eventType of mouseEvents) {
            // console.log('Removing', eventType)
            dom.removeEventListener(eventType, mouseHandler)
        }
    }
}
