import { Static, TSchema } from '@sinclair/typebox'
import { Edit } from '@sinclair/typebox/value'

import { LayerType } from '../formats'
import { GestureFn } from './gestures'
import { ToolContext } from './state'
import { Palette, PaletteID } from './types'

// export interface Adapter<E extends TSchema, ID extends PaletteID>
//     extends Record<ToolID, Function> {
//     // callbacks: ToolCallbacks<E, ID>
//     displayName?: string
// }

export class ResourceAdapter<
    E extends TSchema,
    ID extends PaletteID = PaletteID,
> {
    displayName?: string

    constructor(
        public readonly type: LayerType,
        public elementSchema: E,
        public palette: Palette<ID>,
    ) {}

    title(t: string) {
        this.displayName = t
        return this
    }

    toolCallbacks: {
        select?: GestureFn<'move' | 'drag'>
        create?: GestureFn<'move' | 'drag'>
        draw?: GestureFn<'move' | 'drag'>
        update?: (element: Static<E>, patch: Edit[], ctx: ToolContext) => void
    } = {}

    select(handler: typeof this.toolCallbacks.select) {
        this.toolCallbacks.select = handler

        return this
    }

    create(handler: typeof this.toolCallbacks.create) {
        this.toolCallbacks.create = handler

        return this
    }

    draw(handler: typeof this.toolCallbacks.draw) {
        this.toolCallbacks.draw = handler

        return this
    }

    update(handler: typeof this.toolCallbacks.update) {
        this.toolCallbacks.update = handler

        return this
    }
}
