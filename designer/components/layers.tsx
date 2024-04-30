import { Card, CardList, Section, SectionCard } from '@blueprintjs/core'
import { TSchema } from '@sinclair/typebox'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import invariant from 'tiny-invariant'

// import { LayerID } from '../resource'
import { RootState, selectLayer } from '../state'
import { Container } from '../../formats'

export function Layers() {
    const dispatch = useDispatch()

    const resource = useSelector((state: RootState) => state.loaded[0])

    const selectedLayer = useSelector((state: RootState) => state.layer)

    useEffect(() => {
        if (resource) {
            dispatch(selectLayer(resource.itemOrder[0] as Container.ItemID))
        }
    }, [resource])

    if (!resource) {
        return null
    }

    function selectTheLayer<S extends TSchema>(seek: Container.ItemID) {
        // Confirm the layer is loaded
        const found = resource.itemOrder.find((id) => id === seek)
        invariant(found, 'Layer not found or no resource')
        dispatch(selectLayer(seek))
    }
    return (
        <Section compact elevation={1} title="Layers" className="sidebar-panel">
            <SectionCard padded={false}>
                <CardList compact bordered={false}>
                    {resource.itemOrder.map((id) => {
                        invariant(Container.isItemID(id, resource))
                        const label = resource.items[id].displayName || id
                        return (
                            <Card
                                key={id}
                                compact
                                interactive
                                selected={id === selectedLayer}
                                onClick={() => selectTheLayer(id)}
                            >
                                {label}
                            </Card>
                        )
                    })}
                </CardList>
            </SectionCard>
        </Section>
    )
}
