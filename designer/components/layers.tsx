import { Card, CardList } from '@blueprintjs/core'

import { Container } from '../../formats'
import { selectLayer, useDispatch, useSelector } from '../store'
import { Carte } from './common'

export function Layers() {
    const dispatch = useDispatch()

    const layerList = useSelector((state) =>
        state.loaded[0]?.itemOrder.map((id) => ({
            id: id as Container.ItemID,
            label:
                state.loaded[0].items[id as Container.ItemID].displayName || id,
        })),
    )
    const selectedLayer = useSelector((state) => state.selected.layer)

    if (!layerList?.length) return null

    return (
        <Carte title="Layers">
            <CardList compact bordered={false}>
                {layerList.map(({ id, label }) => (
                    <Card
                        key={id}
                        compact
                        interactive
                        selected={id === selectedLayer}
                        onClick={() => dispatch(selectLayer(id))}
                    >
                        {label}
                    </Card>
                ))}
            </CardList>
        </Carte>
    )
}
