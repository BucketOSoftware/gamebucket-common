import invariant from 'tiny-invariant'

type OptionallyAsync<T> = T | Promise<T>

/** A synchronous or asynchronous function that defines the setup and teardown
 * for a mode of operation. The function should do any initialization work for
 * the mode, and when ready to switch, call the previous mode's teardown
 * function and (optionally) return the new mode's teardown function.
 *
 * @param [teardown] A function that cleans up the previous mode. Call it when ready to start the new mode (i.e. after any asynchronous setup functions have run). If the mode function does not call `teardown`, an error will be thrown.
 * @returns A teardown function to be called when switching to the next mode, or nothing if no teardown is necessary. The teardown function can be asynchronous if the next mode can start before the cleanup is finished.
 */
export type Mode = (
    teardown: TeardownFn,
) => OptionallyAsync<TeardownFn | void | undefined>

type TeardownFn = () => OptionallyAsync<undefined | void>

// -----

async function switchMode(nextMode: Mode, teardown?: TeardownFn | void) {
    let teardownRun = false

    // Wrap the teardown function so we can confirm it was run
    const wrappedTeardown: TeardownFn = teardown
        ? async () => {
              await teardown()
              teardownRun = true
          }
        : async () => {
              teardownRun = true
          }

    // Run the setup function for the new mode, which will resolve when it's
    // ready to return a teardown function to be run later...
    const nextTeardown = await nextMode(wrappedTeardown)

    invariant(
        teardownRun,
        "Mode init function did not run last mode's teardown function",
    )

    // Return a function that will switch to the next mode, calling the teardown
    // function as needed
    return async (laterMode: Mode) => {
        return switchMode(laterMode, nextTeardown)
    }
}

export async function create() {
    return await switchMode(halt, undefined)
}

/**
 *
 * @param mode A function that performs some setup
 * @returns
 */
export async function start(mode: Mode) {
    return await switchMode(mode, undefined)
}

/** A no-op mode */
export const halt: Mode = (teardown) => teardown()
