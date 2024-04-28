import { Card, CardList, Section, SectionCard } from '@blueprintjs/core'
import { TSchema } from '@sinclair/typebox'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import invariant from 'tiny-invariant'

import { LayerID } from '../resource'
import { RootState, selectLayer } from '../state'

export function Layers(props: unknown) {
    const dispatch = useDispatch()

    const resource = useSelector((state: RootState) => state.edited.loaded[0])

    const selectedLayer = useSelector((state: RootState) => state.ui.layer)

    useEffect(() => {
        if (resource) {
            console.log('Conna select', resource && resource.itemOrder[0])
            dispatch(selectLayer(resource.itemOrder[0]))
        }
    }, [resource])

    if (!resource) {
        return null
    }

    function selectTheLayer<S extends TSchema>(seek: LayerID) {
        // Confirm the layer is loaded
        const found = resource.itemOrder.find((id) => id === seek)
        invariant(found, 'Layer not found or no resource')
        dispatch(selectLayer(found))
    }
    return (
        <Section compact elevation={1} title="Layers" className="sidebar-panel">
            <SectionCard padded={false}>
                <CardList compact bordered={false}>
                    {resource.itemOrder.map((id) => {
                        return (
                            <Card
                                key={id.toString()}
                                compact
                                interactive
                                selected={id === selectedLayer}
                                onClick={() => selectTheLayer(id)}
                            >
                                {resource.items[id].displayName ||
                                    id.toString()}
                            </Card>
                        )
                    })}
                </CardList>
            </SectionCard>
        </Section>
    )
}
