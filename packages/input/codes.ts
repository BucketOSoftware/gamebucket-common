/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { keys } from './keys'
import { codes as gamepad } from './gamepad'

export {
    /**
     * @category Input codes
     */
    keys,
    gamepad,
}

// ---------------
//  Input codes
// ---------------

// ─── Mouse ───────────────────────────────────────────────────────────────────

export type MouseButtonCode = 'MouseLeft' | 'MouseRight' | 'MouseMiddle'

/** @internal */
export const mouseButtons = {
    1: 'MouseLeft',
    2: 'MouseRight',
    4: 'MouseMiddle',
} as const satisfies Record<number, InputCode>

/**
 * @category Input codes
 */
export const mouse = {
    LeftButton: 'MouseLeft',
    RightButton: 'MouseRight',
    MiddleButton: 'MouseMiddle',
} as const satisfies Record<string, InputCode>

// ─── Keyboard ────────────────────────────────────────────────────────────────

export type KeyCode = keyof typeof keys

// ─── Gamepad ─────────────────────────────────────────────────────────────────

type GamepadCodes = typeof gamepad
type GamepadButtonCode =
    GamepadCodes['standard']['buttons'][keyof GamepadCodes['standard']['buttons']]
type GamepadAxisCode =
    GamepadCodes['standard']['axes'][keyof GamepadCodes['standard']['axes']]

/** Codes for devices buttons and axes */
export type InputCode =
    | KeyCode
    | GamepadButtonCode
    | GamepadAxisCode
    | MouseButtonCode

export function isKeyCode(code: string): code is KeyCode {
    return code in keys
}
