import { describe, it, test } from 'vitest'

import { damp, grid, random, type SVec } from './index'

describe('grid', () => {
    describe('neighbors', () => {
        it('lists adjacent coordinates', ({ expect }) => {
            expect(
                grid.neighbors({ w: 10, h: 10 }, { x: 5, y: 0 }, grid.cardinal)
            ).toEqual([
                { x: 4, y: 0 },
                { x: 6, y: 0 },
                { x: 5, y: 1 },
            ])
        })

        it('lists remote coordinates', ({ expect }) => {
            expect(
                grid.neighbors(
                    { w: 10, h: 10 },
                    { x: 0, y: 0 },
                    grid.ordinal.map(({ x, y }) => ({ x: x * 2, y: y * 2 }))
                )
            ).toEqual([
                { x: 2, y: 0 },
                { x: 2, y: 2 },
                { x: 0, y: 2 },
            ])
        })

        it('appends results', ({ expect }) => {
            let results: SVec<2>[] = []

            grid.neighbors(
                { w: 10, h: 10 },
                { x: 5, y: 0 },
                grid.cardinal,
                results
            )

            expect(results).toHaveLength(3)

            grid.neighbors(
                { w: 10, h: 10 },
                { x: 7, y: 7 },
                grid.cardinal,
                results
            )

            expect(results).toHaveLength(7)
        })
    })
})

describe('damping', () => {
    test.for([
        [0.25, 1250],
        [0.5, 1500],
        [0.75, 1750],
    ])('smoothing %d + 1 second = %d', ([smoothing, expected], { expect }) => {
        let start = 1000
        const target = 2000

        for (let dt of [0.2, 0.1, 0.4, 0.3]) {
            start = damp(start, target, smoothing, dt)
        }
        expect(start).toEqual(expected)
    })
})

describe('random number generator', () => {
    it('is deterministic', ({ expect }) => {
        let rand = random.seededGenerator('\u6815\u80dc\u82fa\u89ca')

        expect([rand(), rand(), rand(), rand()]).toEqual([
            0.727447206620127, 0.970530616119504, 0.6302836125250906,
            0.83309540245682,
        ])
    })
})
