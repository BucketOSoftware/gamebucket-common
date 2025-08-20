import assert from 'tiny-invariant'
import type { Track } from './track'

type Duration = number

/** Return this symbol from an interval function to immediately start the next stage */
export const Next = Symbol()

// ─── Stages ──────────────────────────────────────────────────────────────────

/** The definition of a stage. */
export type Stage = ProceduralStage | InitFunction

/**
 * Woo!
 */
export interface ProceduralStage {
    /** Function called once to set up the upcoming stage. t may not be 0 when it runs. */
    init?: InitFunction
    /** Called when the clock advances. Returning 'Next' ends the stage. */
    interval?: IntervalFunction
    /** How long the stage lasts, or undefined if it runs indefinitely */
    duration?: Duration
}

/**
 * A stage that runs a function and immediately moves to the next stage.
 * Useful for side effects
 */
export type InitFunction = (info: Readonly<StageStatus>) => void

export type IntervalFunction = (
    info: Readonly<StageStatus>
) => typeof Next | unknown

export interface StageStatus {
    /** local time: how long since the current stage began */
    t: Duration

    duration?: Duration

    /** if the current stage has a fixed duration, this will move from 0 to 1 over that time */
    progress?: number

    /** Reference to the track on which the stage is running */
    track: Track

    /** Number of stages after the current one */
    remainingStages: number
}

export function normalizeStage(stage: ProceduralStage | InitFunction) {
    if (typeof stage === 'function') {
        return { init: stage } as ProceduralStage
    }

    assert(
        stage.duration !== undefined || stage.interval !== undefined,
        "Stage doesn't know how to end"
    )

    return stage
}

// ─── Stock Actions ───────────────────────────────────────────────────────────

const StandbyAction: ProceduralStage = Object.freeze({
    interval({ remainingStages }: StageStatus) {
        return remainingStages && Next
    },
})

class DelayAction implements ProceduralStage {
    constructor(public readonly duration: number) {}

    interval({ progress }: StageStatus) {
        return progress! >= 1 && Next
    }
}

export const standby = StandbyAction as Stage
export const delay = (duration: number) => new DelayAction(duration) as Stage
