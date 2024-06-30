import invariant from 'tiny-invariant'
import { Teardown } from './machine'

const PAUSE = Symbol()
type LoopStatus = typeof PAUSE | void

const timestep_ms = 1000 / 60
const MAXIMUM_DELTA_MS = timestep_ms * 6

/** Render loop callback.
 * @param renderDelta_ms Time in miliseconds since last render
 * @param isPaused True if this function returned PAUSE last time
 * @param frameProgress How much of the next frame has been processed (0 to 1 exclusive), for render interpolation
 * @param gameTime_t Sum of time this loop has processed in the update callback
 *
 * @returns `fixedLoop.PAUSE` if the update loop should continue running until the next call to the render function
 */
export type RenderFn = (
    renderDelta_ms: number,
    isPaused: boolean,
    frameProgress: number,
    gameTime_t: number,
) => LoopStatus

/**
 *
 * @param fixedUpdate Update function that will be called every `timestep_ms` miliseconds
 * @param render Render function that gets the time in miliseconds since the last time render was called, and the current time. (TODO: is t monotonic?)
 * @returns
 */
export function fixedLoop(
    fixedUpdate: (dt: number) => void,
    render: RenderFn,
    // options: { timestep?: number; speed?: number}
): Teardown {
    let lastLoop = performance.now()
    let lastRender_ms = lastLoop
    let updateAccumulator_ms = 0
    let gameTime_ms = 0

    let loopStatus: LoopStatus
    let rafId: number | undefined = requestAnimationFrame(
        loop as FrameRequestCallback,
    )

    function loop(t: number) {
        // TODO: can we use the param? If not, why do we accept one?
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
        updateAccumulator_ms += dt
        gameTime_ms += dt

        lastLoop = t

        while (updateAccumulator_ms >= timestep_ms) {
            updateAccumulator_ms -= timestep_ms

            fixedUpdate(timestep_ms)
        }

        // TODO: explain why this happens here
        const afterUpdates_t = performance.now()

        const frameProgress = updateAccumulator_ms / timestep_ms

        const renderDelta_ms = afterUpdates_t - lastRender_ms
        lastRender_ms = afterUpdates_t

        lastRender_ms = performance.now()
        loopStatus = render(
            renderDelta_ms,
            loopStatus === PAUSE,
            frameProgress,
            gameTime_ms,
        )

        rafId = requestAnimationFrame(loop)
    }

    return () => {
        cancelAnimationFrame(rafId!) // doesn't matter if it's undefined
        rafId = undefined
    }
}

fixedLoop.PAUSE = PAUSE
