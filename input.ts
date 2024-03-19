// TODO: provide a way to get the current state of all [relevant] inputs

// import { Key } from 'w3c-keys'
import invariant from 'tiny-invariant'
import { GVec2, GVec3 } from './geometry'

// codes are at https://w3c.github.io/uievents-code/#code-value-tables
// https://raw.githubusercontent.com/w3c/uievents-code/gh-pages/impl-report.txt
// awk '/CODE_IMPL / && $3 =="Y" { printf "\"%s\",%s,\"%s\"\n", $2, FNR, $0 }' keys.txt > keys.csv
// awk 'BEGIN { print "export default {" } END { print "} as const" } /CODE_IMPL / && $3 =="Y" { printf "/** %s *\/\n%s: \"%s\",\n", $0, $2, $2 }' keys.txt
// curl https://raw.githubusercontent.com/w3c/uievents-code/gh-pages/impl-report.txt | awk 'BEGIN { print "export default {" } END { print "} as const" } /CODE_IMPL / && $3 == "Y" { printf "/** %s *\/\n%s: \"%s\",\n", $0, $2, $2 }'
import keys from './keys'

// ---------------
//  Key code type
// ---------------
export type KeyCode = keyof typeof keys

function isKeyCode(code: string): code is KeyCode {
    // @ts-expect-error: uggggh make up your mind
    return !!keys[code]
}

/**
 * General input handler/mapper
 */
export default class Input {
    /** Mouse position in pixels relative to the attached element */
    mouseCursor: GVec2 = { x: Infinity, y: Infinity }
    mouseNormalized: GVec2 = { x: Infinity, y: Infinity }
    previousMouseCursor: GVec2 = { x: 0, y: 0 }
    /** Wheel movement since last frame */
    mouseWheelDelta: GVec3 = { x: 0, y: 0, z: 0 }

    mouseDown = false

    // ------
    // Internal state
    // ------

    private attachedElement: HTMLElement | undefined = undefined
    /** Saving a reference to the Gamepad object seemed to result in an object that
     * never got updates, at least in Chrome. This method saves the index and gets
     * the gamepads from Navigator each time, which might be slower but it works */
    private gamepadIndex = -1

    // TODO: accept a mapping or something
    constructor() {
        // would like to set initial values this way but that's not how it works I guess
        this.resetState()
    }

    /**
     * Start listening for input
     * @param element Element to attach to -- only relevant for mouse and touch inputs
     */
    attach(element: HTMLElement) {
        // TODO: don't start the game until the user clicks, which solves lots of problems with initial mouse position, user permissions, etc...

        // TODO: should this attach keyboard events to the `element`?
        invariant(this.attachedElement === undefined, 'Already attached')
        // this.attachedElement, ow.undefined)

        this.attachedElement = element
        const doc = element.ownerDocument
        const win = doc.defaultView
        invariant(win instanceof Window)
        invariant(win === window, 'Multiple windows?')

        const passive = { passive: true }

        doc.addEventListener('keydown', this.handleKeyDown)
        doc.addEventListener('keyup', this.handleKeyUp)

        doc.addEventListener('focusin', this.handleDocFocusChange)
        doc.addEventListener('focusout', this.handleDocFocusChange)
        doc.addEventListener('visibilitychange', this.handleDocFocusChange)

        element.addEventListener('mousedown', this.handleMouseDown)
        // we want to know if the user releases the button outside of the canvas
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

    private lastUpdateTime = -Infinity
    readDevices(t = performance.now()) {
        performance.now()
        const {
            attachedElement,
            mouseCursor,
            mouseLastPagePos,
            mouseNormalized,
            previousMouseCursor,
            mouseWheelAccumulator,
            mouseWheelDelta,
        } = this

        this.keyJustPressed = this.recentKeys
        this.recentKeys = {}

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

    /** Treat the two keycodes as representing opposite sides of an axis
     * @returns -1 if `negative` is held down, 1 if `positive` is held down,
     * 0 if both or neither are held
     */
    getAxis(negative: KeyCode, positive: KeyCode) {
        // TODO: support gamepads
        const { keyDown } = this

        // TODO: it might be better to use the most recently pressed key
        return (
            (keyDown[negative] === undefined ? 0 : -1) +
            (keyDown[positive] === undefined ? 0 : 1)
        )
    }

    done() {
        // TODO: clear out values for next frame?
    }

    /**
     *
     * @param key
     * @param duration How long the key should be held to return true
     * @param t Time in miliseconds
     */
    wasHeldFor(key: KeyCode, duration: number, t: number) {
        const pressedAt = this.keyDown[key]
        // probably not so likely that the timestamp would be 0, but...
        return pressedAt !== undefined ? t - pressedAt > duration : false
    }

    private resetState() {
        console.debug('Releasing input state')
        this.mouseLastPagePos.x = Infinity
        this.mouseLastPagePos.y = Infinity

        this.mouseDown = false
        this.keyDown = {}
        this.keyJustPressed = {}

        // TODO: mouse? gamepad? keys?
    }

    // ------
    //  Keys
    // ------
    keyDown: Partial<{ [Property in KeyCode]: number }> = {}
    keyJustPressed: Partial<{ [Property in KeyCode]: boolean }> = {}
    private recentKeys: Partial<{ [Property in KeyCode]: boolean }> = {}
    /** @todo This is not a 1-to-1 mapping, since e.g. shift-A and A are different keys */
    private keysLocale: Partial<{ [Property in KeyCode]: string }> = {}

    private handleKeyDown = (e: KeyboardEvent) => {
        // TODO: might want to handle this another way. What if we want to bind keys that have modifiers, etc.
        const modifier = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
        if (e.repeat) {
            return
        }

        invariant(isKeyCode(e.code), 'Not a valid key code?')

        if (true) {
            if (!(e.code in this.keysLocale)) {
                console.warn('[!] %s => %s', e.code, e.key)
            }
        }

        this.keyDown[e.code] ||= e.timeStamp

        this.keysLocale[e.code] = e.key
        this.recentKeys[e.code] = true

        // TODO: only prevent default if this key maps to something (?)
        // e.preventDefault()
    }

    private handleKeyUp = (e: KeyboardEvent) => {
        invariant(isKeyCode(e.code), 'Not a valid key code??')
        delete this.keyDown[e.code]

        // Do we need to prevent default?
    }

    // ---------
    //  Gamepad
    // ---------

    private gamepadDeadZoneSq = 0.1

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

        // TODO: haptic

        console.debug(
            'Gamepad connected at index %d: %s. %d buttons, %d axes.',
            ev.gamepad.index,
            ev.gamepad.id,
            ev.gamepad.buttons.length,
            ev.gamepad.axes.length,
        )

        if (this.gamepadIndex !== -1) {
            console.warn(
                "Adding another gamepad; this use case isn't well-tested",
            )
        }

        this.gamepadIndex = ev.gamepad.index

        if (ev.gamepad.mapping !== 'standard') {
            console.warn('Unknown gamepad mapping; gamepad may act funny.')
        }
    }

    gamepadAxes(index: number): GVec2 | undefined {
        // TODO: maybe we need to check whether this function exists
        const gp = navigator.getGamepads()[this.gamepadIndex]
        if (!gp) {
            return
        }

        const x = gp.axes[index]
        const y = gp.axes[index + 1]
        const lengthSq = x * x + y * y
        return lengthSq >= this.gamepadDeadZoneSq ? { x, y } : { x: 0, y: 0 }
    }

    gamepadButtonHeld(index: number) {
        const gp = navigator.getGamepads()[this.gamepadIndex]
        if (!gp) {
            return
        }

        // TODO: need a way to specify where we care about the first press or held down
        return gp.buttons[index].pressed
    }

    // -------
    //  Mouse
    // -------

    /** Last known mouse position, in page coordinates */
    private mouseLastPagePos: GVec2 = { x: Infinity, y: Infinity } // is this wise
    /** Cumulative wheel deltas since last read */
    private mouseWheelAccumulator: GVec3 = { x: 0, y: 0, z: 0 }

    private handleMouseDown = (e: MouseEvent) => {
        // TODO: multiple buttons
        if (e.button !== 0) {
            return
        }

        const { target, pageX, pageY } = e

        invariant(target === this.attachedElement)

        this.mouseDown = true
        // There may not have been a move event before this
        this.handleMouseMove(e)

        // We don't prevent default so as to let focus happen naturally
    }

    private handleMouseUp = (e: MouseEvent) => {
        // invariant(e.target === this.attachedElement)
        if (e.target === this.attachedElement) {
            // console.warn('Up con canvas')
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

    // -------
    //  Focus
    // -------

    private handleDocFocusChange = (ev: FocusEvent | Event) => {
        if (ev.type === 'focusout' || document.visibilityState === 'hidden') {
            console.debug(
                'Document lost focus or was hidden: ',
                document.visibilityState,
                ev,
            )

            // Clear out any input state, as if user released all inputs
            this.resetState()
            return
        }

        // console.debug('Other focus event:', ev)
    }
}
