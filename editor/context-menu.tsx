import {
    ActionList,
    ActionListItemProps,
    ActionMenu,
    Text,
} from '@primer/react'
import { useCallback, useContext, useMemo } from 'react'
import invariant from 'tiny-invariant'

import { LiaisonContext } from './editor'
import { closeContextMenu, useDispatch, useSelector } from './store'
import { Object3D } from 'three'

type OnSelectCallback = Exclude<ActionListItemProps['onSelect'], undefined>

export function ContextMenu() {
    const dispatch = useDispatch()

    const isOpen = useSelector(
        (state) => state.ui.contextMenu?.origin !== undefined,
    )

    const origin = useSelector((state) => state.ui.contextMenu?.origin)

    // console.log('CMenu: ', isOpen, origin)
    // const x = useSelector((state) => state.ui.contextMenu?.origin.x || 0)
    // const y = useSelector((state) => state.ui.contextMenu?.origin.y || 0)
    // console.warn(x, y, isOpen)
    return (
        <ActionMenu
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    // console.warn('Closing menu')
                    dispatch(closeContextMenu())
                } else {
                    // console.error('OPening menu?!')
                }
            }}
        >
            <ActionMenu.Anchor>
                <div />
            </ActionMenu.Anchor>
            <ActionMenu.Overlay
                side="inside-top"
                top={origin?.y}
                left={origin?.x}
            >
                <ActionList>
                    <ActionList.Heading>{}</ActionList.Heading>
                    <LookHere />
                    <ActionList.Item
                        onSelect={() => alert('Quote reply clicked')}
                    >
                        Quote reply
                        <ActionList.TrailingVisual>
                            ⌘Q
                        </ActionList.TrailingVisual>
                    </ActionList.Item>
                    <ActionList.Item
                        onSelect={() => alert('Edit comment clicked')}
                    >
                        Edit comment
                        <ActionList.TrailingVisual>
                            ⌘E
                        </ActionList.TrailingVisual>
                    </ActionList.Item>
                    <ActionList.Divider />
                    <ActionList.Item
                        variant="danger"
                        onSelect={() => alert('Delete file clicked')}
                    >
                        Delete file
                        <ActionList.TrailingVisual>
                            ⌘D
                        </ActionList.TrailingVisual>
                    </ActionList.Item>
                </ActionList>
            </ActionMenu.Overlay>
        </ActionMenu>
    )
}

function LookHere() {
    const liaison = useContext(LiaisonContext)
    const selectedId = useSelector((state) => state.ui.selected)
    const clickPoint = useSelector((state) => state.ui.worldClickPoint)
    const obj = useMemo(
        () => selectedId && liaison.getObjectById(selectedId),
        [selectedId],
    )
    const hasTarget = obj && 'target' in obj
    // invariant(clickPoint)

    const onSelect = useCallback<OnSelectCallback>(
        (ev) => {
            invariant(obj)
            ev.stopPropagation()
            if (hasTarget) {
                // TODO: think on how targets work
                const tgt = obj.target as Object3D
                invariant(tgt.parent === null)
                invariant(clickPoint)
                tgt.position.copy(clickPoint)
                // If the target isn't added to the scene, this needs to be done manually?
                tgt.updateMatrix()
                tgt.updateMatrixWorld()
                // tgt.worldToLocal(tgt.position)

                console.warn('TGT:', tgt.position)
                liaison.onUpdate()
                // const obj = invariant(obj)
                console.log('okay', obj, obj.target)

                // obj.lookAt(clickPoint.x, clickPoint.y, clickPoint.z)
            }
            // console.log('Look at', clickPoint, obj.rotation, obj.quaternion)
        },
        [clickPoint, obj, liaison],
    )

    if (!(selectedId && clickPoint)) {
        return null
    }

    return (
        <ActionList.Item onSelect={onSelect}>
            {hasTarget ? 'Face here' : 'Look here'}
            <ActionList.TrailingVisual>⌘T</ActionList.TrailingVisual>
        </ActionList.Item>
    )
}
