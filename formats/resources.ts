import { Opaque } from 'ts-essentials'

import { GenericResource, Metadata, ResourceType } from './common'
export { Spatial } from './spatial'

/** "File" formats as they'd exist in memory. */

// type Iff<P> = P extends void ? {} : P

/** Resource that contains other resources.
 * @todo Make specific container types so we can have a Spatial2D container that only contains 2D maps? */
export namespace Container {
    export type ItemID = Opaque<string, 'CONTAINER_ITEM_ID'>

    export function isItemID(
        id: string | ItemID,
        c: Serialized<any>,
    ): id is ItemID {
        return id in c.items
    }

    type Properties = Record<keyof any, any> | void

    export interface Serialized<
        L extends GenericResource.Serialized<ResourceType>[],
        P extends Properties = Properties,
        K extends ItemID = ItemID,
    > extends GenericResource.Serialized<ResourceType.Container> {
        type: ResourceType.Container
        items: Record<K, L[number]>
        properties?: P
    }

    export interface Editable<
        L extends GenericResource.Editable<ResourceType>[],
        P extends Properties = Properties,
        K extends ItemID = ItemID,
    > extends Serialized<L, P> {
        itemOrder: K[]
    }

    /** @todo */
    // export interface Packed<L extends Items, P extends Properties>
    // extends Serialized<L, P> {}
    // }
}
