import { ActionList, ActionListItemProps, ActionMenu } from '@primer/react'
import { useCallback, useContext, useMemo } from 'react'
import invariant from 'tiny-invariant'

import { LiaisonContext } from './editor'
import { closeContextMenu, useDispatch, useSelector } from './store'

import { formatVec3 } from '../geometry'

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
                    dispatch(closeContextMenu())
                } else {
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
                    <LookHere />
                    {/* <ActionList.Item
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
                    </ActionList.Item> */}
                    <ActionList.Divider />
                    {DeleteObject()}
                </ActionList>
            </ActionMenu.Overlay>
        </ActionMenu>
    )
}

function LookHere() {
    const liaison = useContext(LiaisonContext)
    const selectedId = useSelector((state) => state.ui.selected)
    const clickPoint = useSelector((state) => state.ui.worldClickPoint!)
    const obj = useMemo(
        () => selectedId && liaison.getObjectById(selectedId),
        [selectedId],
    )

    const onSelect = useCallback<OnSelectCallback>(
        (ev) => {
            ev.stopPropagation()

            invariant(obj)
            invariant(clickPoint)

            liaison.pointAt(obj, clickPoint)
        },
        [clickPoint, obj, liaison],
    )

    if (!(selectedId && clickPoint)) {
        return null
    }

    return (
        <ActionList.Item onSelect={onSelect}>
            Point here
            <ActionList.Description variant="block">
                {formatVec3(clickPoint)}
            </ActionList.Description>
            <ActionList.TrailingVisual>{/*⌘*/}⬆T</ActionList.TrailingVisual>
        </ActionList.Item>
    )
}

function DeleteObject() {
    return (
        <ActionList.Item variant="danger" onSelect={() => console.warn('TODO')}>
            Delete file
            <ActionList.TrailingVisual>⌘D</ActionList.TrailingVisual>
        </ActionList.Item>
    )
}
