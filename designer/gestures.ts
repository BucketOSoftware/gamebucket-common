import invariant from 'tiny-invariant'
import { GVec2 } from '../geometry'

export type GesturePhase = (typeof GESTURE_PHASE)[keyof typeof GESTURE_PHASE]
export interface GestureInfo {
    phase: GesturePhase
    to: GVec2
    from?: GVec2
    distSq: number
    /** How long the button has been down */
    held?: number
}

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
    'contextmenu',
] as const

type MOUSE_BTN = 0 | 1 | 2 | 3 | 4

type MouseLogItemBase<
    Action extends 'CURSOR_TO' | 'BUTTON_DOWN' | 'BUTTON_UP',
    Detail,
> = {
    action: Action
    detail: Detail
    timestamp: number
}

type MouseLogItem =
    | MouseLogItemBase<'CURSOR_TO', GVec2>
    | MouseLogItemBase<'BUTTON_DOWN', MOUSE_BTN>
    | MouseLogItemBase<'BUTTON_UP', MOUSE_BTN>

interface GestureGathering {
    phase?: GesturePhase
    downAt?: number
    upAt?: number
    from?: GVec2
    to?: GVec2
    lastUpdate: number // timestamp
}

class MouseEventStack {
    private log: MouseLogItem[] = []
    private lastButtons = NaN

    /**
     * @param [btn=0] Ignore clicks from all buttons but this one
     * @returns Current gesture state
     */
    getStatus(btn: MOUSE_BTN = 0): GestureInfo | undefined {
        const { log } = this

        const info = log.reduce<GestureGathering>(
            (acc, logitem) => {
                acc.lastUpdate = Math.max(acc.lastUpdate, logitem.timestamp)

                switch (logitem.action) {
                    case 'CURSOR_TO':
                        acc.from ??= logitem.detail
                        acc.to = logitem.detail
                        break
                    case 'BUTTON_DOWN':
                        if (logitem.detail === btn) {
                            acc.downAt = logitem.timestamp
                            delete acc.upAt
                        }
                        break
                    case 'BUTTON_UP':
                        if (logitem.detail === btn && acc.downAt) {
                            acc.upAt ??= logitem.timestamp
                        }
                        break
                }
                return acc
            },
            {
                lastUpdate: -Infinity,
            },
        )

        invariant(!(info.downAt && info.upAt) || info.upAt > info.downAt)

        const phase =
            [
                info.upAt && GESTURE_PHASE.COMMIT,
                info.to && info.to !== info.from && GESTURE_PHASE.CONTINUE,
                info.downAt && GESTURE_PHASE.START,
                info.from && GESTURE_PHASE.HOVER,
            ].find((i) => !!i) || undefined

        if (phase === GESTURE_PHASE.COMMIT) {
            this.reset()
        }

        if (!(phase && info.to)) {
            return
        }
        let dx = (info.to?.x || NaN) - (info.from?.x || NaN)
        let dy = (info.to?.y || NaN) - (info.from?.y || NaN)
        let distSq = dx * dx + dy * dy || 0

        return {
            phase,
            from: info.from,
            to: info.to,
            distSq,
            held:
                info.downAt &&
                (info.upAt
                    ? info.upAt - info.downAt
                    : info.lastUpdate - info.downAt),
        }
    }

    reset() {
        this.log.length = 0
    }

    private store(
        timestamp: number,
        action: MouseLogItem['action'],
        detail: any,
    ) {
        const top = this.log.at(-1)
        if (top?.action === action && top.action === 'CURSOR_TO') {
            // update
            top.detail.x = detail.x
            top.detail.y = detail.y
            top.timestamp = timestamp
            return
        }

        this.log.push({
            action,
            detail,
            timestamp,
        })
    }

    position(ev: MouseEvent, x: number, y: number) {
        this.store(ev.timeStamp, 'CURSOR_TO', { x, y })
    }

    buttons({ timeStamp, buttons }: MouseEvent) {
        const diff = buttons ^ this.lastButtons
        this.lastButtons = buttons

        for (let btn = 0; btn < 5; btn++) {
            const changed = (diff >> btn) & 1
            const newlyDown = (buttons >> btn) & 1

            if (changed) {
                this.store(
                    timeStamp,
                    newlyDown ? 'BUTTON_DOWN' : 'BUTTON_UP',
                    btn,
                )
            }
        }
    }
}

/**
 * Track mouse inputs on a DOM element and report gesture progress to a callback
 * @todo Touch inputs
 * @param [dom]
 * @param [mouseInput] Called
 * @returns
 */
export function recognizeGestures(
    dom: HTMLElement,
    mouseInput: (info: GestureInfo) => unknown,
) {
    let stack = new MouseEventStack()

    const blockContextMenu = true

    function mouseHandler(ev: MouseEvent) {
        const element_x = ev.offsetX / dom.offsetWidth
        const element_y = ev.offsetY / dom.offsetHeight

        switch (ev.type) {
            case 'mouseover':
                break
            case 'mouseout':
                // TODO: handle mouseup outside the element
                stack.reset()
                break
            case 'mousedown':
            case 'mouseup':
                // TODO: handle mouseup outside the element
                stack.position(ev, element_x, element_y)
                stack.buttons(ev)
                break
            case 'mousemove':
                stack.position(ev, element_x, element_y)
                break
            case 'contextmenu':
                if (blockContextMenu) {
                    ev.preventDefault()
                } else {
                    console.error(
                        'TODO: should we just not track right button if the user wants context menu events?',
                    )
                }
                break
            default:
                throw new Error('Unrecognized event: ' + ev.type)
        }

        const info = stack.getStatus(0)
        if (info) mouseInput(info)
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
