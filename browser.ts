import invariant from 'tiny-invariant'
import { Teardown } from './machine'

const PAUSE = Symbol()
type LoopStatus = typeof PAUSE | void

const MAXIMUM_DELTA_MS = 1000 / 10
const timestep_ms = 1000 / 60

/**
 *
 * @param fixedUpdate Update function that will be called every `timestep_ms` miliseconds
 * @param render Render function that gets the time in miliseconds since the last time render was called, and the current time. (TODO: is t monotonic?)
 * @param timestep_ms
 * @returns
 */
export function fixedLoop(
    fixedUpdate: (dt: number) => void,
    render: (
        renderDelta_ms: number,
        updatePause: boolean,
        frameProgress: number,
        gameTime_t: number,
    ) => LoopStatus,
    // options: { timestep?: number; speed?: number}
): Teardown {
    let lastLoop = performance.now()
    let lastRender_t = lastLoop
    let updateAccumulator = 0
    let gameTime_t = 0

    let loopStatus: LoopStatus

    let rafId: number | undefined = requestAnimationFrame(l)
    function l(t: number) {
        t = performance.now()

        // t is wall-clock time

        invariant(rafId !== undefined, 'Loop kept going?')
        rafId = undefined

        const speedFactor = 1
        const isPaused = loopStatus === PAUSE

        // dt is game time
        // if the last render paused the loop, we don't contribute the time
        let dt = isPaused ? 0 : (t - lastLoop) * speedFactor
        if (dt > MAXIMUM_DELTA_MS) {
            // Slow down the game
            // TODO: does this work? Test with slow updates
            dt = timestep_ms
        }
        updateAccumulator += dt
        gameTime_t += dt

        lastLoop = t

        while (updateAccumulator >= timestep_ms) {
            updateAccumulator -= timestep_ms

            fixedUpdate(timestep_ms)
        }

        const afterUpdates_t = performance.now()

        const frameProgress = updateAccumulator / timestep_ms
        // A delta of 0 indicates that the update loop is paused; the render function can render or not based on its preference
        const renderDelta_ms = afterUpdates_t - lastRender_t

        lastRender_t = afterUpdates_t

        lastRender_t = performance.now()
        loopStatus = render(
            renderDelta_ms,
            loopStatus === PAUSE,
            frameProgress,
            gameTime_t,
        )

        rafId = requestAnimationFrame(l)
    }

    return () => {
        cancelAnimationFrame(rafId!) // doesn't matter if it's undefined
        rafId = undefined
    }
}

fixedLoop.PAUSE = PAUSE
