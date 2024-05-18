import { useEffect } from 'react'

import { ResourceType } from '../../formats'
import { selectLayer, useDispatch, useSelector } from '../store'
import { NavGroup, NavGroupItem } from './common'
import invariant from 'tiny-invariant'

const iconForLayer = {
    [ResourceType.Container]: null,
    [ResourceType.SpatialDense2D]: <span className={'icon icon-map'} />,
    [ResourceType.SpatialSparse2D]: <span className={'icon icon-location'} />,
}

function useLayerList() {
    return useSelector((state) => {
        if (!state.root) {
            return
        }

        const res = state.resources[state.root]

        if (!('items' in res)) {
            console.warn(
                "root resource isn't a container? this isn't well tested",
            )
            return [
                {
                    id: state.root,
                    label: res.displayName,
                    icon: iconForLayer[res.type],
                },
            ]
        }

        return res.items.map((subid) => ({
            id: subid,
            label: state.resources[subid].displayName || subid,
            icon: iconForLayer[state.resources[subid].type] ?? null,
        }))
    })
}

export function Layers() {
    const dispatch = useDispatch()

    // the container and the layers are both resources -- currently, containers are just nodes on a graph and layers are the leaves
    const layerList = useLayerList() ?? []
    const selectedLayer = useSelector((state) => state.selected.layer)

    useEffect(() => {
        if (!selectedLayer && layerList.length) {
            // default to the first layer
            console.log('Selecting layer: ', layerList[0].id)
            dispatch(selectLayer(layerList[0].id))
        }
    }, [selectedLayer, layerList.length])

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
