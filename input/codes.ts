import keys from './keys'

export { keys }

// ---------------
//  Input codes
// ---------------

type GamepadFriendlyButtonNames = keyof (typeof gamepad)['standard']['buttons']
type GamepadFriendlyAxisNames = keyof (typeof gamepad)['standard']['axes']

export const MouseButtons = {
    1: 'MouseLeft',
    2: 'MouseRight',
    4: 'MouseMiddle',
} as const

type GamepadButtonCode =
    (typeof gamepad)['standard']['buttons'][GamepadFriendlyButtonNames]
type GamepadAxisCode =
    (typeof gamepad)['standard']['axes'][GamepadFriendlyAxisNames]
export type KeyCode = keyof typeof keys
export type MouseButtonCode = 'MouseLeft' | 'MouseRight' | 'MouseMiddle'

export type InputCode =
    | KeyCode
    | GamepadButtonCode
    | GamepadAxisCode
    | MouseButtonCode

export const mouse = {
    LeftButton: 'MouseLeft',
    RightButton: 'MouseRight',
    MiddleButton: 'MouseMiddle',
} as const

export const gamepad = {
    // https://www.w3.org/TR/gamepad/#remapping
    standard: {
        axes: {
            LeftStickX: '@GamepadLeftStickAxisX',
            LeftStickY: '@GamepadLeftStickAxisY',
            RightStickX: '@GamepadRightStickAxisX',
            RightStickY: '@GamepadRightStickAxisY',
        },
        buttons: {
            // Literal names based on pad location
            LeftTop: 'GamepadLeftTop',
            LeftBottom: 'GamepadLeftBottom',
            LeftLeft: 'GamepadLeftLeft',
            LeftRight: 'GamepadLeftRight',
            RightTop: 'GamepadRightTop',
            RightBottom: 'GamepadRightBottom',
            RightLeft: 'GamepadRightLeft',
            RightRight: 'GamepadRightRight',
            FrontTopLeft: 'GamepadFrontTopLeft',
            FrontTopRight: 'GamepadFrontTopRight',
            FrontBottomLeft: 'GamepadFrontBottomLeft',
            FrontBottomRight: 'GamepadFrontBottomRight',
            CenterLeft: 'GamepadCenterLeft',
            CenterRight: 'GamepadCenterRight',
            LeftStick: 'GamepadLeftStick',
            RightStick: 'GamepadRightStick',
            CenterCenter: 'GamepadCenterCenter',
        },
    },
    /** PlayStation-style aliases */
    ps: {
        DPadUp: 'GamepadLeftTop',
        DPadDown: 'GamepadLeftBottom',
        DPadLeft: 'GamepadLeftLeft',
        DPadRight: 'GamepadLeftRight',
        DPadX: ['GamepadLeftLeft', 'GamepadLeftRight'],
        DPadY: ['GamepadLeftTop', 'GamepadLeftBottom'],
        Triangle: 'GamepadRightTop',
        Cross: 'GamepadRightBottom',
        Square: 'GamepadRightLeft',
        Circle: 'GamepadRightRight',
        L1: 'GamepadFrontTopLeft',
        R1: 'GamepadFrontTopRight',
        L2: 'GamepadFrontBottomLeft',
        R2: 'GamepadFrontBottomRight',
        Select: 'GamepadCenterLeft',
        Start: 'GamepadCenterRight',
        L3: 'GamepadLeftStick',
        R3: 'GamepadRightStick',
        Menu: 'GamepadCenterCenter',
    },
} as const

const gamepadCodeToButtonIndex = {
    /** D-pad up */
    GamepadLeftTop: 12,
    /** D-pad down */
    GamepadLeftBottom: 13,
    /** D-pad left */
    GamepadLeftLeft: 14,
    /** D-pad right */
    GamepadLeftRight: 15,
    /** PlayStation: Triangle, Xbox: Y, Switch: X */
    GamepadRightTop: 3,
    /** PlayStation: Cross, Xbox: A, Switch: B */
    GamepadRightBottom: 0,
    /** PlayStation: Square, Xbox: X, Switch: Y */
    GamepadRightLeft: 2,
    /** PlayStation: Square, Xbox: X, Switch: Y */
    GamepadRightRight: 1,
    /** PlayStation: L1, Xbox: LB, Switch: L */
    GamepadFrontTopLeft: 4,
    /** PlayStation: R1, Xbox: RB, Switch: R */
    GamepadFrontTopRight: 5,
    /** PlayStation: L2, Xbox: LT, Switch: ZL */
    GamepadFrontBottomLeft: 6,
    /** PlayStation: R2, Xbox: RT, Switch: ZR */
    GamepadFrontBottomRight: 7,
    /** PlayStation: Select, Xbox: Back, Switch: - */
    GamepadCenterLeft: 8,
    /** PlayStation: Start, Xbox: Start, Switch: + */
    GamepadCenterRight: 9,
    /** PlayStation: L3, Xbox: LS, Switch: ? */
    GamepadLeftStick: 10,
    /** PlayStation: R3, Xbox: RS, Switch: ? */
    GamepadRightStick: 11,
    /** PlayStation: PS, Xbox: Guide, Switch: Home? */
    GamepadCenterCenter: 16,
} as const

export const gamepadButtonIdxToCode = [
    'GamepadRightBottom', // X
    'GamepadRightRight', // Circle
    'GamepadRightLeft', // Square
    'GamepadRightTop', // Triangle
    'GamepadFrontTopLeft', // L1
    'GamepadFrontTopRight', // R1
    'GamepadFrontBottomLeft', // L2
    'GamepadFrontBottomRight', // R2
    'GamepadCenterLeft', // Select
    'GamepadCenterRight', // Start
    'GamepadLeftStick', // L3
    'GamepadRightStick', // R3
    'GamepadLeftTop', // D-Pad Up
    'GamepadLeftBottom',
    'GamepadLeftLeft',
    'GamepadLeftRight',
    'GamepadCenterCenter', // guide
] as const

export const gamepadAxisToIndex = {
    standard: [
        gamepad.standard.axes.LeftStickX,
        gamepad.standard.axes.LeftStickY,
        gamepad.standard.axes.RightStickX,
        gamepad.standard.axes.RightStickY,
    ],
}

export const gamepadCodeToIndex = {
    [gamepad.standard.axes.LeftStickX]: 0,
    [gamepad.standard.axes.LeftStickY]: 1,
    [gamepad.standard.axes.RightStickX]: 2,
    [gamepad.standard.axes.RightStickY]: 3,
} as const

export function isKeyCode(code: string): code is KeyCode {
    // @ts-expect-error: uggggh make up your mind
    return !!keys[code]
}
