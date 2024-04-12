import invariant from 'tiny-invariant'

export type GesturePhase = (typeof GESTURE_PHASE)[keyof typeof GESTURE_PHASE]

export const GESTURE_PHASE = {
    START: 'gesture.start',
    CONTINUE: 'gesture.continue',
    COMMIT: 'gesture.commit',
    CANCEL: 'gesture.cancel',
    HOVER: 'gesture.hover',
} as const

const mouseEvents = [
    'mousedown',
    'mousemove',
    'mouseup',
    'mouseover',
    'mouseout',
] as const

type MouseInputCallback = (
    phase: GesturePhase,
    viewport_x: number,
    viewport_y: number,
    begin_x: number,
    begin_y: number,
    originalEvent: MouseEvent,
) => void

/**
 * Track mouse inputs on a DOM element and report gesture progress to a callback
 * @todo Touch inputs
 * @param [dom]
 * @param [mouseInput] Called
 * @returns
 */
export function recognizeGestures(
    dom: HTMLElement,
    mouseInput: MouseInputCallback,
) {
    let leftButtonDown = false
    let begin_x = NaN
    let begin_y = NaN
    // TODO
    // // let last_x = 0
    // let last_y = 0

    function mouseHandler(ev: MouseEvent) {
        const viewport_x = ev.offsetX / dom.offsetWidth
        const viewport_y = ev.offsetY / dom.offsetHeight

        switch (ev.type) {
            case 'mouseover':
                break
            case 'mouseout':
                leftButtonDown = false
                break
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
                    leftButtonDown = true

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
                if (!leftButtonDown) {
                    console.warn(
                        "Got a mouseUp but we hadn't been tracking the input",
                    )
                }
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
        let element = eventType === 'mouseup' ? dom.ownerDocument.body : dom
        element.addEventListener(eventType, mouseHandler)
    }

    return () => {
        for (let eventType of mouseEvents) {
            let element = eventType === 'mouseup' ? dom.ownerDocument.body : dom
            element.removeEventListener(eventType, mouseHandler)
        }
    }
}
