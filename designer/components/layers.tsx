import { Card, CardList } from '@blueprintjs/core'

import { Container, ResourceType } from '../../formats'
import { selectLayer, useDispatch, useSelector } from '../store'
import { Carte, NavGroup, NavGroupItem } from './common'

const iconForLayer = {
    [ResourceType.SpatialDense2D]: <span className={'icon icon-map'} />,
    [ResourceType.SpatialSparse2D]: <span className={'icon icon-location'} />,
}

export function Layers() {
    const dispatch = useDispatch()

    const layerList = useSelector((state) =>
        state.loaded[0]?.itemOrder.map((id) => ({
            id: id as Container.ItemID,
            label:
                state.loaded[0].items[id as Container.ItemID].displayName || id,
            icon:
                iconForLayer[
                    state.loaded[0].items[id as Container.ItemID].type
                ] ?? null,
        })),
    )
    const selectedLayer = useSelector((state) => state.selected.layer)

    if (!layerList?.length) return null

    return (
        <NavGroup title="Layers">
            {layerList.map(({ id, label, icon }) => (
                <NavGroupItem
                    key={id}
                    active={id === selectedLayer}
                    onClick={() => dispatch(selectLayer(id))}
                >
                    {icon}
                    {label}
                </NavGroupItem>
            ))}
        </NavGroup>
    )
}
