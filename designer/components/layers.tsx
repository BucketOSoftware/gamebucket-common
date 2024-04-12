import { Card, CardList, Section, SectionCard } from '@blueprintjs/core'
import { forwardRef, useEffect } from 'react'

import { useStore, useUpdate } from '../state'
import { ResourceLayer } from '../types'

export function Layers(props: unknown) {
    const update = useUpdate()
    const { openResources, activeResource, activeLayer } = useStore()

    if (!activeResource) {
        return null
    }

    useEffect(() => {
        update((draft) => {
            // if (activeResource && openResources.includes(activeResource)) {
            //     // TODO: test that this works to keep the same selection
            // } else {
            //     draft.activeResource = openResources[0]
            // }
            draft.activeLayer = activeResource.layers[0]
        })
    }, [activeResource])

    function selectLayer(seek: ResourceLayer<any>) {
        return () => {
            update((draft) => {
                draft.activeLayer = activeResource?.layers.find(
                    (res) => res === seek,
                )
            })
        }
    }

    return (
        <Section compact elevation={1} title="Layers" className="sidebar-panel">
            <SectionCard padded={false}>
                <CardList compact bordered={false}>
                    {activeResource.layers.map((layer) => {
                        return (
                            <Card
                                key={layer.displayName}
                                compact
                                interactive
                                selected={layer === activeLayer}
                                onClick={selectLayer(layer)}
                            >
                                {layer.displayName}
                            </Card>
                        )
                    })}
                </CardList>
            </SectionCard>
        </Section>
    )
}
