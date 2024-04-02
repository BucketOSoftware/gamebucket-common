import { expect, test, vi } from 'vitest'

import * as machine from './machine'

test('exists', async () => {
    const prom = machine.create()
    const goTo = await prom

    expect(prom).toBeInstanceOf(Promise)
    expect(goTo).toBeInstanceOf(Function)
})

test('initializes a mode', async () => {
    const mode = nullMode()

    expect(await machine.start(mode)).toBeInstanceOf(Function)
    expect(mode).toHaveBeenCalled()
})

test('checks that the teardown function is run', async () => {
    const callsTeardown: machine.Mode = nullMode()

    const doesNotCall = async () =>
        await machine.start(() => {
            "I'm not running a thing!"
        })

    expect(machine.start(callsTeardown)).resolves
    expect(callsTeardown).toHaveBeenCalled()
    expect(doesNotCall).toThrow
})

test('switches between modes', async () => {
    const exitModeA = vi.fn()

    const modeA: machine.Mode = vi.fn((teardown) => {
        teardown()
        return exitModeA
    })

    const modeB: machine.Mode = nullMode()

    let goTo = await machine.start(modeA)
    await goTo(modeB)

    expect(modeA).toHaveBeenCalled()
    expect(modeB).toHaveBeenCalled()
    expect(exitModeA).toHaveBeenCalled()
})

test('handles asynchronous setups', async () => {
    const teardown = vi.fn(async () => wait())

    const mode: machine.Mode = vi.fn(async (prevTeardown) => {
        await wait()
        prevTeardown()

        return teardown
    })

    let goTo = await machine.start(mode)
    return goTo(machine.halt)
})

test('can be shut down', async () => {
    const teardown = vi.fn()
    const mode: machine.Mode = vi.fn((prev) => {
        prev()
        return teardown
    })

    let goTo = await machine.start(mode)
    await goTo(machine.halt)

    expect(mode).toHaveBeenCalled()
    expect(teardown).toHaveBeenCalled()
})

// -----

function nullMode(): machine.Mode {
    return vi.fn((teardown) => teardown())
}

function wait(n: number = 50) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, n)
    })
}
