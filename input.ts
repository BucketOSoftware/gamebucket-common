import { Key } from 'w3c-keys'
import { GVec2, GVec3 } from './geometry'
import invariant from 'tiny-invariant'

export default class Input {
    /** Mouse position in pixels relative to the attached element */
    mouseCursor: GVec2 = { x: Infinity, y: Infinity }
    mouseNormalized: GVec2 = { x: Infinity, y: Infinity }
    previousMouseCursor: GVec2 = { x: 0, y: 0 }
    /** Wheel movement since last frame */
    mouseWheelDelta: GVec3 = { x: 0, y: 0, z: 0 }

    mouseDown: boolean = false

    private attachedElement: HTMLElement | undefined = undefined

    private mouseLastPagePos: GVec2 = { x: Infinity, y: Infinity } // is this wise
    private mouseWheelAccumulator: GVec3 = { x: 0, y: 0, z: 0 }

    /** Saving a reference to the Gamepad object seemed to result in an object that
     * never got updates, at least in Chrome. This method saves the index and gets
     * the gamepads from Navigator each time, which might be slower but it works */
    private gamepadIndex = -1

    // TODO: accept a mapping or something
    constructor() {}

    /**
     * Start listening for input
     * @param element Element to attach to -- only relevant for mouse and touch inputs
     */
    attach(element: HTMLElement) {
        // TODO: should this attach keyboard events to the `element`?
        invariant(this.attachedElement === undefined, 'Already attached')
        // this.attachedElement, ow.undefined)

        this.attachedElement = element
        const doc = element.ownerDocument
        const win = doc.defaultView
        invariant(win instanceof Window)
        invariant(win === window, 'Multiple windows?')

        const passive = { passive: true }

        // doc.addEventListener('keydown', this.handleKeyDown)
        // doc.addEventListener('keyup', this.handleKeyUp)

        doc.addEventListener('focusin', this.handleDocFocusChange)
        doc.addEventListener('focusout', this.handleDocFocusChange)
        doc.addEventListener('visibilitychange', this.handleDocFocusChange)

        element.addEventListener('mousedown', this.handleMouseDown)
        //
        doc.addEventListener('mouseup', this.handleMouseUp)
        doc.addEventListener('mousemove', this.handleMouseMove)
        element.addEventListener('wheel', this.handleMouseWheel, passive)

        // element.addEventListener('touchstart', this.handleTouch, passive)

        win.addEventListener('gamepadconnected', this.handleGamepadConnected)
        win.addEventListener(
            'gamepaddisconnected',
            this.handleGamepadDisconnected,
        )
    }

    detach() {
        const element = this.attachedElement!
        const doc = element.ownerDocument
        const win = doc.defaultView!

        // doc.removeEventListener('keydown', this.handleKeyDown)
        // doc.removeEventListener('keyup', this.handleKeyUp)

        doc.removeEventListener('focusin', this.handleDocFocusChange)
        doc.removeEventListener('focusout', this.handleDocFocusChange)
        doc.removeEventListener('visibilitychange', this.handleDocFocusChange)

        element.removeEventListener('mousedown', this.handleMouseDown)
        doc.removeEventListener('mouseup', this.handleMouseUp)
        doc.removeEventListener('mousemove', this.handleMouseMove)
        element.removeEventListener('wheel', this.handleMouseWheel)

        win.removeEventListener('gamepadconnected', this.handleGamepadConnected)
        win.removeEventListener(
            'gamepaddisconnected',
            this.handleGamepadDisconnected,
        )
        this.attachedElement = undefined
    }

    update() {
        const {
            attachedElement,
            mouseCursor,
            mouseLastPagePos,
            mouseNormalized,
            previousMouseCursor,
            mouseWheelAccumulator,
            mouseWheelDelta,
        } = this

        if (attachedElement) {
            // TODO: ring buffer for smoothing etc.
            previousMouseCursor.x = mouseCursor.x
            previousMouseCursor.y = mouseCursor.y

            const { top, left, width, height } =
                attachedElement.getBoundingClientRect()

            // TODO: should these be clipped to the attached element? Currently they are not
            mouseCursor.x = mouseLastPagePos.x - left
            mouseCursor.y = mouseLastPagePos.y - top
            mouseNormalized.x = mouseCursor.x / width
            mouseNormalized.y = mouseCursor.y / height
        } else {
            console.warn('Input is not attached')
        }

        // TODO?: when do X and Z come into play? Gestures? Mobile?
        mouseWheelDelta.x = mouseWheelAccumulator.x
        mouseWheelDelta.y = mouseWheelAccumulator.y
        mouseWheelDelta.z = mouseWheelAccumulator.z
        mouseWheelAccumulator.x = 0
        mouseWheelAccumulator.y = 0
        mouseWheelAccumulator.z = 0
        // TODO: keys, gamepad
    }

    done() {
        // TODO: clear out values for next frame?
    }

    private handleGamepadDisconnected = (ev: GamepadEvent) => {
        if (ev.gamepad.index === this.gamepadIndex) {
            // Fall back to a previous gamepad if possible
            this.gamepadIndex =
                navigator.getGamepads().find((x) => !!x)?.index || -1
        }

        console.info(
            'Gamepad disconnected from index %d: %s. Switching to %d',
            ev.gamepad.index,
            ev.gamepad.id,
            this.gamepadIndex,
        )
    }

    private handleGamepadConnected = (ev: GamepadEvent) => {
        invariant(ev.gamepad, 'No gamepad?!')

        console.debug(
            'Gamepad connected at index %d: %s. %d buttons, %d axes.',
            ev.gamepad.index,
            ev.gamepad.id,
            ev.gamepad.buttons.length,
            ev.gamepad.axes.length,
        )

        this.gamepadIndex = ev.gamepad.index

        if (ev.gamepad.mapping !== 'standard') {
            console.warn('Unknown gamepad mapping; gamepad may act funny.')
        }
    }

    private handleMouseDown = (e: MouseEvent) => {
        // TODO: multiple buttons
        if (e.button !== 0) {
            return
        }

        const { target, pageX, pageY } = e

        invariant(target === this.attachedElement)

        // There may not have been a move event before this
        this.mouseDown = true
        this.handleMouseMove(e)
        // const { top, left, width, height } =
        // this.attachedElement.getBoundingClientRect()

        // We don't prevent default so as to let focus happen naturally
    }

    private handleMouseUp = (e: MouseEvent) => {
        // invariant(e.target === this.attachedElement)
        if (e.target === this.attachedElement) {
            console.warn('Up con canvas')
        }

        // TODO: multiple buttons
        if (e.button !== 0) {
            return
        }

        this.mouseDown = false
        this.handleMouseMove(e) // update position
    }

    private handleMouseMove = (e: MouseEvent) => {
        // Don't normalize the coordinates yet
        this.mouseLastPagePos.x = e.pageX //(pageX - left) / width
        this.mouseLastPagePos.y = e.pageY //(pageY - top) / height
    }

    private handleMouseWheel = (ev: WheelEvent) => {
        // TODO: sensitivity?
        const acc: GVec3 = this.mouseWheelAccumulator
        acc.x += ev.deltaX
        acc.y += ev.deltaY
        acc.z += ev.deltaZ
    }

    private handleDocFocusChange = (ev: FocusEvent | Event) => {
        if (ev.type === 'focusout' || document.visibilityState === 'hidden') {
            console.debug(
                'Document lost focus or was hidden: ',
                document.visibilityState,
                ev,
            )

            // Clear out any input state, as if user released all inputs
            this.mouseDown = false

            // TODO: mouse? gamepad? keys?
            // keysDown.clear()
            return
        }

        // console.debug('Other focus event:', ev)
    }
}
