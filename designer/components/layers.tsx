import { Card, CardList, Section, SectionCard } from '@blueprintjs/core'
import { forwardRef, useEffect } from 'react'

import { useStore, useUpdate } from '../state'
import invariant from 'tiny-invariant'
import { ResourceAdapter } from '../types'
import { TSchema } from '@sinclair/typebox'

export function Layers(props: unknown) {
    const update = useUpdate()
    const { activeResource, activeLayer } = useStore()

    useEffect(() => {
        update((draft) => {
            // if (activeResource && openResources.includes(activeResource)) {
            //     // TODO: test that this works to keep the same selection
            // } else {
            //     draft.activeResource = openResources[0]
            // }
            draft.activeLayer = activeResource?.layers[0]
        })
    }, [activeResource])

    function selectLayer<S extends TSchema>(seek: ResourceAdapter<S>) {
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
                    {activeResource?.layers.map((layer) => {
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
