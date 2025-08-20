import assert from 'tiny-invariant'
import {
    Next,
    normalizeStage,
    type ProceduralStage,
    type Stage,
    type StageStatus,
} from './stage'

type Duration = number

export type Track = Sequence

// ─── Sequence ────────────────────────────────────────────────────────────────

export class Sequence {
    /** Label to identify the sequence to user code */
    name?: string
    /** If true, sequence will not advance */
    paused = false

    public readonly script: ProceduralStage[]

    /** Local time since this sequence was started.  */
    protected clock: Duration = 0
    protected stageIdx: number = -1
    protected stageStarted: Duration = 0
    protected info: StageStatus = {
        t: NaN as Duration,
        progress: undefined,
        remainingStages: 0,
        track: this,
    }

    constructor(script: Readonly<Stage[]>) {
        this.script = script.map(normalizeStage)
    }

    get atEnd(): boolean {
        return this.stageIdx >= this.script.length
    }

    get started(): boolean {
        return this.stageIdx >= 0
    }

    get running(): boolean {
        return !this.paused && this.stageIdx >= 0
    }

    get localTime(): Duration {
        return this.clock
    }

    start() {
        this.advance(0)
        return this
    }

    advance(dt: Duration) {
        if (this.paused) {
            return
        }

        if (!this.started) {
            this.nextStage()
            if (this.paused) return this
        }

        this.clock = dt + this.clock
        this.runInterval()

        return this
    }

    /**
     * Add stages to run after the current one.
     * Resumes the track if it had been paused
     */
    push(...stages: Stage[]) {
        let resume = this.atEnd

        // console.debug('Adding', stages.length, 'stages at', this.script.length)
        this.script.push(...stages.map(normalizeStage))
        this.info.remainingStages = this.script.length - this.stageIdx - 1
        if (resume) {
            this.paused = false
            this.runInit()
        }

        return this
    }

    /** End the current stage, clear all subsequent stages, and pause */
    cancel() {
        this.script.length = this.stageIdx + 1

        // Advancing to next stage will hit the end of the sequence
        this.nextStage()
        assert(this.paused)
        assert(this.atEnd)
        return this
    }

    protected runInterval(): undefined {
        let stage = this.script[this.stageIdx]
        assert(stage, 'Track index out of sync')
        const info = this.updateStatus(stage)

        let hasNoInterval = !stage.interval

        // TODO: clarify that a 0 duration also means instant
        let doneTime =
            stage.duration === 0 || (stage.duration && stage.duration < info.t)
        let doneSignal = stage.interval && stage.interval(info)

        if (hasNoInterval || doneTime || doneSignal === Next) {
            return this.nextStage()
        }
    }

    protected nextStage() {
        this.stageIdx += 1
        this.info.remainingStages = this.script.length - this.stageIdx - 1
        return this.runInit()
    }

    protected runInit(): undefined {
        let stage = this.script[this.stageIdx]
        this.info.duration = stage?.duration
        if (!stage) {
            // Out of keyframes
            this.paused = true
            return
        }

        this.stageStarted = this.clock

        const info = this.updateStatus(stage)
        if (stage.init) {
            stage.init(info)
        }

        return this.runInterval()
    }

    protected updateStatus(stage: ProceduralStage): StageStatus {
        const { info, clock, stageStarted } = this
        info.t = (clock - stageStarted) as Duration
        info.progress = stage.duration ? info.t / stage.duration : undefined
        return info
    }
}
