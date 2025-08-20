import { pull } from 'lodash-es'

import { type Stage } from './stage'
import { type Track, Sequence } from './track'

type Duration = number

// ─── Timeline ────────────────────────────────────────────────────────────────

export interface TrackOptions {
    /** Don't start the track until this many (more) units of time have elapsed */
    delayStart?: number
    /** If true, tracks with a lower priority than this one will not run when this track is running */
    override?: boolean
}

/** Manages one or more tracks */
export class Timeline {
    /** Length of 1 time unit, in seconds. Not used by the class itself */
    timeUnit: Duration = 1

    readonly trackOrder: Track[] = []

    protected readonly trackMeta = new WeakMap<
        Track,
        { startAt: Duration | undefined; override: boolean }
    >()

    protected clock: Duration = 0

    /** Position of the "playhead" in units */
    get currentTime() {
        return this.clock
    }

    advance(dt: number = 1) {
        this.clock += dt
        const { trackOrder, trackMeta } = this

        let culled: Track[] = []

        for (let track of trackOrder) {
            // Paused tracks with a start time set will not start until they're unpaused
            if (track.paused) continue
            const meta = trackMeta.get(track)!

            if (meta.startAt !== undefined) {
                if (meta.startAt > this.clock) continue
                meta.startAt = undefined

                // Time to start
                track.start()
            } else {
                track.advance(dt)
            }

            if (track.atEnd) {
                // TODO: currently, the workaround to keeping a track after it's
                // finished is to add a "standby" stage at the end, which will
                // automatically complete when more stages are added. Is that
                // good enough as a workaround?
                culled.push(track)
                continue
            }

            if (meta.override) {
                break
            }
        }

        pull(trackOrder, ...culled)
    }

    track(
        script: Stage[],
        { delayStart: delay, override }: TrackOptions = {}
    ): Track {
        const { clock, trackOrder, trackMeta } = this

        let track = new Sequence(script)
        let meta = {
            startAt: undefined as undefined | number,
            override: override || false,
        }

        if ((delay || 0) > 0) {
            meta.startAt = clock + delay!
        } else {
            // New tracks are placed on top of the run order, so running the
            // first frame now (presumably after others have run) fits with that
            // order
            track.start()
        }

        trackOrder.unshift(track)
        trackMeta.set(track, meta)
        return track
    }
}
