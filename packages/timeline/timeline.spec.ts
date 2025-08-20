import { describe, expect, it } from 'vitest'

import * as timeline from './src/index'

describe('Timeline', () => {
    it('overrides', () => {
        const tl = new timeline.Timeline()
        let main = tl.track([timeline.delay(10)])
        let interruption = tl.track([timeline.delay(3)], {
            delayStart: 5,
            override: true,
        })

        expect(main.started).toBe(true)
        expect(interruption.started).toBe(false)

        // Main runs unopposed:
        for (let i = 0; i < 4; i++) tl.advance()
        expect(main.localTime).toEqual(4)
        expect(tl.currentTime).toEqual(main.localTime)
        expect(interruption.started).toBe(false)
        expect(interruption.localTime).toEqual(0)

        // Interruption begins:
        tl.advance()
        expect(tl.currentTime).toEqual(5)
        expect(main.localTime).toEqual(4)
        expect(interruption.started).toBe(true)
        expect(interruption.localTime).toEqual(0)

        // Interruption ends and main resumes accruing time
        for (let i = 0; i < 5; i++) {
            tl.advance()
            expect(tl.currentTime).not.toEqual(main.localTime)
        }

        expect(main.atEnd).toBe(false)
        expect(main.localTime).toBeGreaterThan(5)
        expect(main.localTime).toBeLessThan(tl.currentTime)
        expect(interruption.atEnd).toBe(true)
        expect(interruption.localTime).toEqual(3)
    })
})

describe('Sequence', () => {
    it('dynamically adds stages', () => {
        const addLimited = (status: timeline.StageStatus) => {
            if (status.remainingStages > 0) {
                track.push(timeline.delay(2), addLimited)
                // .remainingStages has incremented
                expect(status.remainingStages).toBeGreaterThan(2)
            }
        }

        let track = new timeline.Sequence([
            timeline.delay(5),
            addLimited,
            timeline.standby,
        ]).start()

        for (let i = 0; i < 256; i++) {
            expect(track.paused).toBe(false)
            track.advance(1)
            if (track.atEnd) {
                expect(track.localTime).toEqual(7)
                break
            }
        }
        expect(track.atEnd).toBe(true)
        expect(track.script).toHaveLength(5)
    })

    describe('function stage', () => {
        it('performs instant side-effects', () => {
            let accumulator = 0

            // Stages can be reused
            const increment = () => accumulator++
            const waitFive = timeline.delay(5)
            let track = new timeline.Sequence([
                increment,
                waitFive,
                increment,
                waitFive,
                increment,
            ]).start()

            let results: number[] = []
            for (let i = 0; i < 256; i++) {
                results.push(accumulator)
                if (track.paused) break
                track.advance(1)
            }

            expect(track.paused).toBe(true)
            expect(results).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3])
        })
    })
})
