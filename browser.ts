import invariant from 'tiny-invariant'
import { Teardown } from './machine'

const PAUSE = Symbol()
type LoopStatus = typeof PAUSE | void

/** Render loop callback.
 * @param updatePaused True if the update loop is paused (this function returned PAUSE last time)
 * @param renderDelta_s Time in seconds since the last time the render function was called
 * @param extrapolation How much of the next frame has been processed (0 to 1 exclusive), for render interpolation
 * @param gameTime_s Sum of time updated in the update callback
 *
 * @returns `fixedLoop.PAUSE` if the update loop should continue running until the next call to the render function
 */
export type RenderFn = (
    /** True if the update loop is paused (i.e. the render function returned fixedLoop.PAUSE */
    updatePaused: boolean,
    /** Time in seconds since the last time the render function was called */
    renderDelta_s: number,
    /** Leftover time in the fixed loop accumulator, in terms of partial updates (i.e., in the range [0..1) )*/
    extrapolation: number,
    /** total amount of simulated time */
    gameTime_s: number,
) => LoopStatus

/**
 *
 * @param fixedUpdate Update function that will be called every `timestep_ms` miliseconds
 * @param render Render function that gets the time in miliseconds since the last time render was called, and the current time. (TODO: is t monotonic?)
 * @returns
 */
export function fixedLoop(
    updatesPerSecond: number,
    fixedUpdate: (dt: number) => void,
    render: RenderFn,
): Teardown {
    const timestep_ms = 1000 / updatesPerSecond
    const maximumDelta = timestep_ms * 6

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

        if (dt > maximumDelta) {
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

        const now = performance.now()
        const renderDelta_ms = now - lastRender_ms
        lastRender_ms = now

        loopStatus = render(
            loopStatus === PAUSE,
            renderDelta_ms / 1000,
            updateAccumulator_ms / timestep_ms,
            gameTime_ms / 1000,
        )

        rafId = requestAnimationFrame(loop)
    }

    return () => {
        cancelAnimationFrame(rafId!) // doesn't matter if it's undefined
        rafId = undefined
    }
}

fixedLoop.PAUSE = PAUSE

export function quickDebugDisplay() {
    const div = document.createElement('pre')
    div.style.position = 'absolute'
    div.style.top = '5px'
    div.style.left = '5px'
    div.style.padding = '5px'
    div.style.margin = '0'
    div.style.textWrap = 'wrap'
    div.style.overflow = 'scroll'

    div.style.backgroundColor = 'hsla(200, 50%, 75%, 20%)'

    div.style.border = '1px dashed black'
    div.style.color = 'hsla(200, 33%, 90%, 100%)'
    div.style.textShadow = '2px 2px black'
    div.style.fontFamily =
        "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace"

    let shrunk = false

    function updateSize() {
        div.style.maxHeight = shrunk ? '0.5rem' : '10rem'
        div.style.maxWidth = shrunk ? '0.5rem' : '66%'
    }
    updateSize()

    div.addEventListener('dblclick', (ev) => {
        shrunk = !shrunk
        updateSize()
    })

    document.body.appendChild(div)
    return div
}
