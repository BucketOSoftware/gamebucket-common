import invariant from 'tiny-invariant'
import { Teardown } from './machine'

const IDLE = Symbol()
type FixedUpdateReturnCode = typeof IDLE | void

const TOO_LONG_DELTA_MS = 1000 / 10
const timestep_ms = 1000 / 60

/**
 *
 * @param fixedUpdate Update function that will be called every `timestep_ms` miliseconds
 * @param render Render function that gets the time in miliseconds since the last time render was called, and the current time. (TODO: is t monotonic?)
 * @param timestep_ms
 * @returns
 */
export function fixedLoop(
    fixedUpdate: (dt: number) => FixedUpdateReturnCode,
    render: (dt: number, t: number) => void,
    // options: { timestep?: number; speed?: number}
): Teardown {
    let lastLoop = performance.now()
    let lastRender = lastLoop
    let updateAccumulator = 0

    let updateStatus: FixedUpdateReturnCode

    let rafId: number | undefined = requestAnimationFrame(l)
    function l(t: number) {
        invariant(rafId !== undefined, 'Loop kept going?')
        rafId = undefined

        let dt = t - lastLoop
        lastLoop = t

        if (dt > TOO_LONG_DELTA_MS) {
            // TODO: does this work? Test with slow updates
            dt = 0
        }

        updateAccumulator += dt

        while (updateAccumulator >= timestep_ms) {
            updateAccumulator -= timestep_ms

            const lastUpdateStatus = updateStatus
            updateStatus = fixedUpdate(timestep_ms)
            const statusChanged = updateStatus !== lastUpdateStatus

            if (updateStatus === IDLE) {
                // Drain any extra update time
                updateAccumulator %= timestep_ms
                lastRender = t
                if (statusChanged) {
                    console.debug('Became idle')
                    render(0, lastRender)
                }
            }
        }

        if (updateStatus !== IDLE) {
            const timeAfterUpdates = performance.now()
            const renderDelta = timeAfterUpdates - lastRender
            lastRender = timeAfterUpdates

            // FIXME: the second param should be time in game terms...  or can
            // we derive that some other way
            render(renderDelta, timeAfterUpdates)
        }
        rafId = requestAnimationFrame(l)
    }

    return () => {
        cancelAnimationFrame(rafId!)
        rafId = undefined
    }
}

fixedLoop.IDLE = IDLE
