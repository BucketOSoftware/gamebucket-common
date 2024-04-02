import invariant from 'tiny-invariant'
import { GVec2, GVec3 } from './geometry'
import {
    InputCode,
    KeyCode,
    MouseButtonCode,
    MouseButtons,
    gamepad,
    gamepadButtonIdxToCode,
    gamepadCodeToAxisIndex,
    isKeyCode,
    keys,
    mouse,
} from './input/codes'

// codes are at https://w3c.github.io/uievents-code/#code-value-tables
// https://raw.githubusercontent.com/w3c/uievents-code/gh-pages/impl-report.txt
// awk '/CODE_IMPL / && $3 =="Y" { printf "\"%s\",%s,\"%s\"\n", $2, FNR, $0 }' keys.txt > keys.csv
// awk 'BEGIN { print "export default {" } END { print "} as const" } /CODE_IMPL / && $3 =="Y" { printf "/** %s *\/\n%s: \"%s\",\n", $0, $2, $2 }' keys.txt
// curl https://raw.githubusercontent.com/w3c/uievents-code/gh-pages/impl-report.txt | awk 'BEGIN { print "export default {" } END { print "} as const" } /CODE_IMPL / && $3 == "Y" { printf "/** %s *\/\n%s: \"%s\",\n", $0, $2, $2 }'

// This recursive-readonly nightmare is necessary if we want the Intent type to be a string union instead of just 'string'
export type InputMapping<Intent extends string> = Readonly<
    Readonly<
        [
            InputCode | Readonly<[negative: InputCode, positive: InputCode]>,
            Intent,
        ]
    >[]
>

/**
 * General input handler/mapper
 */
export default class Input<Intent extends string> {
    static readonly gamepad = gamepad
    static readonly mouse = mouse
    static readonly keys = keys

    /** Mapping from input code (any device) to when it was pressed */
    private allDeviceButtonDownAt: { [Property in InputCode]+?: number } = {}
    private allDeviceButtonPressure: { [Property in InputCode]+?: number } = {}
    private allDeviceButtonJustPressed: { [Property in InputCode]+?: boolean } =
        {}

    /** Mouse position in pixels relative to the attached element */
    mouseCursor: GVec2 = { x: Infinity, y: Infinity }
    mouseNormalized: GVec2 = { x: Infinity, y: Infinity }
    previousMouseCursor: GVec2 = { x: 0, y: 0 }
    /** Wheel movement since last frame */
    mouseWheelDelta: GVec3 = { x: 0, y: 0, z: 0 }

    // -----
    // Settings
    // -----

    // TODO: maybe make "idle" into a built-in intention?
    idleThreshold = 1_000 * 60

    // ------
    // Internal state
    // ------

    private attachedElement: HTMLElement | undefined = undefined

    /** Timestamp in (ms) of last input */
    private lastInteraction = Infinity

    private lastRead: number

    /** Saving a reference to the Gamepad object seemed to result in an object
     * that never got updates, at least in Chrome. Instead, we save the index of
     * the most recent gamepad and get the object from Navigator each time,
     * which might(?) be slower but it works */
    private gamepadIndex = -1

    /** Map of intentions and their current value. @todo Privatize. @todo Multiplayer */
    // intentions: { [k in Intent]: number | undefined }
    private intentions!: {
        [k in Intent]: {
            /** Timestamp (ms) at which the intention was invoked */
            start: number | undefined
            /** Current degree of the input. [0, 1] for triggers/pressure buttons, [-1, 1] for axes */
            degree: number
            /** True if the intent was invoked since the last call to `readDevices` */
            recent: boolean
        }
    }

    // private lastFrameIntentions: { [k in Intent]: number | undefined }

    constructor(public mapping: InputMapping<Intent>) {
        // would like to set initial values this way but that's not how it works I guess
        this.resetState()
        this.lastRead = this.lastInteraction = performance.now()
    }

    /**
     * Start listening for input
     * @param element Element to attach to -- only relevant for mouse and touch inputs
     */
    attach(element: HTMLElement) {
        // TODO: don't start the game until the user clicks, which solves lots of problems with initial mouse position, user permissions, etc...

        // TODO: should this attach keyboard events to the `element`?
        invariant(this.attachedElement === undefined, 'Already attached')

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

        element.addEventListener('mousedown', this.handleMouseButton)
        // we want to know if the user releases the button outside of the canvas
        doc.addEventListener('mouseup', this.handleMouseButton)
        doc.addEventListener('mousemove', this.handleMouseMove)
        element.addEventListener('contextmenu', this.handleMouseContext)
        element.addEventListener('wheel', this.handleMouseWheel, passive)

        // element.addEventListener('touchstart', this.handleTouch, passive)

        win.addEventListener('gamepadconnected', this.handleGamepadConnected)
        win.addEventListener(
            'gamepaddisconnected',
            this.handleGamepadDisconnected,
        )
    }

    detach() {
        invariant(
            this.attachedElement,
            'detach() called, but input manager is not attached',
        )
        const element = this.attachedElement
        const doc = element.ownerDocument
        const win = doc.defaultView!

        doc.removeEventListener('keydown', this.handleKeyDown)
        doc.removeEventListener('keyup', this.handleKeyUp)

        doc.removeEventListener('focusin', this.handleDocFocusChange)
        doc.removeEventListener('focusout', this.handleDocFocusChange)
        doc.removeEventListener('visibilitychange', this.handleDocFocusChange)

        element.removeEventListener('mousedown', this.handleMouseButton)
        doc.removeEventListener('mouseup', this.handleMouseButton)
        doc.removeEventListener('mousemove', this.handleMouseMove)
        element.removeEventListener('wheel', this.handleMouseWheel)
        element.removeEventListener('contextmenu', this.handleMouseContext)

        win.removeEventListener('gamepadconnected', this.handleGamepadConnected)
        win.removeEventListener(
            'gamepaddisconnected',
            this.handleGamepadDisconnected,
        )
        this.attachedElement = undefined
    }

    get idleTime() {
        const duration = this.lastRead - this.lastInteraction
        // invariant(Number.isFinite(duration))
        // invariant(duration >= 0)
        if (duration < 0) {
            console.error('Duration ', duration)
            return 0
        }
        if (duration > this.idleThreshold) {
            return duration
        } else {
            return 0
        }
    }

    /** @param [t] Current time in miliseconds */
    readDevices(t = performance.now()) {
        // console.log(t, this.lastRead, this.lastInteraction)
        this.lastRead = Math.max(t, this.lastRead)
        this.allDeviceButtonJustPressed = {}

        const {
            allDeviceButtonJustPressed,
            attachedElement,
            intentions,
            mouseCursor,
            mouseLastPagePos,
            mouseNormalized,
            previousMouseCursor,
            mouseWheelAccumulator,
            mouseWheelDelta,
        } = this

        const lastFrameActiveIntents = new Set<Intent>()

        for (let intent in intentions) {
            const record = intentions[intent]
            invariant(
                !!record.degree === (record.start !== undefined),
                'Input state is out of sync',
            )

            if (intentions[intent].degree) {
                lastFrameActiveIntents.add(intent)
            }
            // we don't want to lose the timestamps, so we'll reset all of these
            // to 0 and figure out the status of the timestamps/recency later
            intentions[intent].degree = 0
        }

        // event-based recent pressed: the events have already updated DownAt,
        // so we just need to copy the just-pressed status
        for (let code in this.recentPresses) {
            if (this.recentPresses[code as KeyCode]) {
                allDeviceButtonJustPressed[code as KeyCode] = true
            } else {
                delete allDeviceButtonJustPressed[code as KeyCode]
            }
        }
        this.recentPresses = {}

        // GAMEPAD

        const gamepad = this.pollGamepads(t)

        // Map held keys/buttons to intents

        // TODO: we need to figure out the ordering issue. Is the mapping expected to be in priority order, or can we figure it out
        this.mapInputsToIntents(t, lastFrameActiveIntents, gamepad)

        // MOUSE
        // -----
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

        // TODO?: when does Z come into play? Gestures? Mobile?
        mouseWheelDelta.x = mouseWheelAccumulator.x
        mouseWheelDelta.y = mouseWheelAccumulator.y
        mouseWheelDelta.z = mouseWheelAccumulator.z
        mouseWheelAccumulator.x = 0
        mouseWheelAccumulator.y = 0
        mouseWheelAccumulator.z = 0

        // Cleanup: clear start timestamps for released intentions
        for (let intent in intentions) {
            const record = intentions[intent]
            if (!record.degree) {
                record.start = undefined
            }
        }

        if (Object.keys(this.allDeviceButtonDownAt).length) {
            // If anything is being held down, the user is not idle
            this.lastInteraction = Math.max(t, this.lastInteraction)
        }
    }

    /** @returns `true` if the given intent was just activated since the last read. The user will need to release *all* the buttons that map to this intent before it will return true again.  */
    recentlyActivated(intent: Intent, player = 0): boolean {
        // throw new Error('uh oh!')
        return this.intentions[intent].recent
    }

    isActivated(intent: Intent, player = 0): boolean {
        return this.intentions[intent]?.start !== undefined
    }

    /** @returns how long the intent has been held down, in miliseconds, or 0 if it isn't */
    getHeld(intent: Intent, now: number, player = 0): number {
        // throw new Error('uh oh!')
        // const pressedAt = this.keyDown[key]
        // probably not so likely that the timestamp would be 0, but...
        // return pressedAt !== undefined ? t - pressedAt > duration : falsed
        const duration = now - (this.intentions[intent]?.start ?? Infinity)
        return duration > 0 ? duration : 0
    }

    heldFor(intent: Intent, now: number, minimumDuration: number, player = 0) {
        return (
            now - (this.intentions[intent]?.start ?? Infinity) >=
            minimumDuration
        )
    }

    /** @returns the intent's analog value: 0 or 1 for digital inputs, [0, 1] for analog, [-1, 1] for an axis */
    getValue(intent: Intent, player = 0): number {
        invariant(
            !!this.intentions[intent]?.degree ===
                !!this.intentions[intent]?.start,
        )

        return this.intentions[intent]?.degree || 0
    }

    private mapInputsToIntents(
        t: number,
        lastFrameActiveIntents: Set<Intent>,
        gamepad?: Gamepad,
    ) {
        const SINGLE_AXIS_DEADZONE = 0.001

        const { mapping, intentions } = this

        const temp = {
            start: undefined,
            degree: 0,
            // recent: !lastFrameActiveIntents.has(intent),
        }

        for (let [code, intent] of mapping) {
            invariant(intent in intentions)
            const intentInfo = intentions[intent]

            // Fields we need to fill out:
            let degree = 0

            // https://github.com/microsoft/TypeScript/issues/17002
            if (code instanceof Array) {
                const [neg, pos] = code
                invariant(
                    typeof neg === 'string' &&
                        typeof pos === 'string' &&
                        neg[0] !== '@' &&
                        pos[0] !== '@',
                    "Input code pairs can't map to an axis code",
                )

                const { start: negStart = -Infinity, degree: negDegree } =
                    this.getStatusByCode(temp, neg)
                const { start: posStart = -Infinity, degree: posDegree } =
                    this.getStatusByCode(temp, pos)

                // use the more recently pressed button
                if (negStart > posStart) {
                    degree = -(negDegree || 1)
                } else if (negStart < posStart) {
                    degree = posDegree || 1
                }
            } else if (code[0] === '@') {
                // TODO: map mouse delta to an axis (?only if mouse is captured?)
                // it's an axis! those are all gamepad right
                // FIXME: if we want a circular deadzone we'll need to consider both axes & do linear algebra
                const axisValue =
                    gamepad?.axes[
                        gamepadCodeToAxisIndex[
                            code as keyof typeof gamepadCodeToAxisIndex
                        ]
                    ] || 0
                invariant(axisValue >= -1 && axisValue <= 1)

                degree =
                    Math.abs(axisValue) > SINGLE_AXIS_DEADZONE ? axisValue : 0
            } else {
                // it's a single button
                degree = this.getStatusByCode(temp, code).degree
            }

            // if the intent isn't active, and the input has a nonzero degree, mark it as starting now
            intentInfo.start = intentInfo.start ?? (degree ? t : undefined)
            // if a higher-priority binding already set the degree, don't override it
            intentInfo.degree ||= degree
            // recent if the input is nonzero AND the intent wasn't held last frame
            intentInfo.recent =
                degree !== 0 && !lastFrameActiveIntents.has(intent)
        }
    }

    private pollGamepads(t: number) {
        const {
            gamepadIndex,
            allDeviceButtonJustPressed,
            allDeviceButtonPressure,
            allDeviceButtonDownAt,
        } = this

        let anyInteractions = false

        // TODO: multiple gamepads
        const gamepad = navigator.getGamepads()[gamepadIndex]

        // poll gamepad
        if (gamepad) {
            invariant(gamepad.connected)
            for (let btn = 0; btn < gamepad?.buttons.length; btn++) {
                const code = gamepadButtonIdxToCode[btn]
                const currentValue = gamepad.buttons[btn].value

                const prevDown = Number.isFinite(allDeviceButtonDownAt[code])
                const currentlyDown = currentValue > 0
                anyInteractions ||= currentlyDown

                const justPressed = currentlyDown && !prevDown

                allDeviceButtonJustPressed[code] = justPressed
                allDeviceButtonPressure[code] = currentValue

                if (justPressed) {
                    allDeviceButtonDownAt[code] = t
                }

                if (!currentlyDown) {
                    delete allDeviceButtonDownAt[code]
                    delete allDeviceButtonPressure[code]
                }
            }
        }

        if (anyInteractions) {
            this.lastInteraction = t
        }

        return gamepad || undefined
    }

    private getStatusByCode(
        output: { start: number | undefined; degree: number },
        code: InputCode,
    ) {
        output.start = this.allDeviceButtonDownAt[code]
        output.degree =
            this.allDeviceButtonPressure[code] ||
            (output.start !== undefined ? 1 : 0)

        return output
    }

    private resetState() {
        console.debug('Releasing input state')

        this.allDeviceButtonDownAt = {}
        this.allDeviceButtonJustPressed = {}
        this.intentions = Object.fromEntries(
            this.mapping.map(([_, intent]) => [
                intent,
                { start: undefined, degree: 0, recent: false },
            ]),
        ) as Input<Intent>['intentions']

        this.recentPresses = {}

        this.mouseLastPagePos.x = Infinity
        this.mouseLastPagePos.y = Infinity
    }

    // ------
    //  Keys
    // ------

    private recentPresses: {
        [Property in KeyCode | MouseButtonCode]+?: boolean
    } = {}
    /** @todo This is not a 1-to-1 mapping, since e.g. shift-A and A are different keys */
    private keysLocale: { [Property in KeyCode]+?: string } = {}

    private handleKeyDown = (e: KeyboardEvent) => {
        this.lastInteraction = e.timeStamp

        // TODO: might want to handle this another way. What if we want to bind keys that have modifiers, etc.
        const modifier = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
        if (e.repeat) {
            return
        }

        invariant(isKeyCode(e.code), 'Not a valid key code?')

        if (false) {
            if (!(e.code in this.keysLocale)) {
                console.log('[!] %s => %s', e.code, e.key)
                // this.keysLocale[e.code] = e.key
            }
        }

        this.allDeviceButtonDownAt[e.code] ??= e.timeStamp

        this.recentPresses[e.code] = true

        // TODO: only prevent default if this key maps to something (?)
        // we probably don't want to block stuff like reloading the page, right
        // e.preventDefault()
    }

    private handleKeyUp = (e: KeyboardEvent) => {
        this.lastInteraction = e.timeStamp

        invariant(isKeyCode(e.code), 'Not a valid key code??')
        delete this.allDeviceButtonDownAt[e.code]

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
        this.lastInteraction = ev.timeStamp
        invariant(ev.gamepad, 'No gamepad?!')

        // TODO: haptic

        console.debug(
            'Gamepad connected at index %d: "%s". %d buttons, %d axes.',
            ev.gamepad.index,
            ev.gamepad.id,
            ev.gamepad.buttons.length,
            ev.gamepad.axes.length,
            ev.gamepad.hapticActuators,
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

    // -------
    //  Mouse
    // -------

    /** Last known mouse position, in page coordinates */
    private mouseLastPagePos: GVec2 = { x: Infinity, y: Infinity } // is this wise
    /** Cumulative wheel deltas since last read */
    private mouseWheelAccumulator: GVec3 = { x: 0, y: 0, z: 0 }

    private handleMouseButton = (e: MouseEvent) => {
        this.lastInteraction = e.timeStamp
        const { allDeviceButtonDownAt, recentPresses } = this

        for (let i = 0; i < 3; i++) {
            const bitmask = 1 << i
            const pressed = e.buttons & bitmask
            const code = MouseButtons[bitmask as keyof typeof MouseButtons]

            if (pressed) {
                invariant(code)

                allDeviceButtonDownAt[code] ??= e.timeStamp
                recentPresses[code] = true
            } else {
                delete allDeviceButtonDownAt[code]
            }
        }

        invariant(e.type === 'mouseup' || e.target === this.attachedElement)

        // There may not have been a move event before this
        this.handleMouseMove(e)

        // We don't prevent default so as to let focus happen naturally
    }

    private handleMouseContext = (e: MouseEvent) => {
        // If the context menu opens we'll get a mousedown event for the right button but not a mouseup!
        e.preventDefault()
    }
    private handleMouseMove = (e: MouseEvent) => {
        this.lastInteraction = e.timeStamp

        // Don't normalize the coordinates yet
        this.mouseLastPagePos.x = e.pageX //(pageX - left) / width
        this.mouseLastPagePos.y = e.pageY //(pageY - top) / height
    }

    private handleMouseWheel = (ev: WheelEvent) => {
        this.lastInteraction = ev.timeStamp

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
        console.warn('FOK', ev.type, ev.target)

        if (ev.type === 'focusin') {
            this.lastInteraction = ev.timeStamp
        }
        if (ev.type === 'focusout' || document.visibilityState === 'hidden') {
            // Clear out any input state, as if user released all inputs
            this.resetState()
            return
        }
    }
}
