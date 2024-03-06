import {
    AppsIcon,
    DeviceCameraVideoIcon,
    EyeClosedIcon,
    EyeIcon,
    FileDirectoryIcon,
    LightBulbIcon,
    WorkflowIcon,
} from '@primer/octicons-react'
import { IconButton, TreeView } from '@primer/react'
import { useCallback, useContext, useEffect, useRef } from 'react'
import invariant from 'tiny-invariant'

import { type SerializedNode, type UniqueID } from '../scenebucket'

import { LiaisonContext } from './editor'
import { useObserve } from './hooks'
import EditorLiaison from './liaison'
import { Panel, PanelBody } from './panel'
import { selectNode, toggleProperty, useDispatch, useSelector } from './store'

export function SceneTree() {
    const dispatch = useDispatch()

    const roots = useSelector((state) => state.scene.roots)

    useEffect(() => {
        function select(ev: Event) {
            invariant('detail' in ev)
            const id = (ev.detail || undefined) as UniqueID | undefined
            dispatch(selectNode(id))
        }

        document.body.addEventListener(EditorLiaison.OBJECT_PICKED, select)

        return () => {
            document.body.removeEventListener(
                EditorLiaison.OBJECT_PICKED,
                select,
            )
        }
    }, [dispatch])

    return (
        <Panel title="Objects" manspread expandable basis="33%">
            <PanelBody>
                <TreeView>
                    {roots.map((id) => (
                        <SceneNode id={id} key={id} />
                    ))}
                </TreeView>
            </PanelBody>
        </Panel>
    )
}
function SceneNode(props: { id: UniqueID }) {
    const dispatch = useDispatch()
    const isSelected = useSelector((state) => state.ui.selected) === props.id
    const node = useSelector((state) => state.scene.nodes[props.id])
    const { name, children: kids, type } = node

    const ref = useRef<HTMLElement>(null)
    useEffect(() => {
        if (isSelected) {
            ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        }
    }, [ref, isSelected])

    return (
        <TreeView.Item
            ref={ref}
            id={props.id}
            defaultExpanded={!!kids.length}
            current={isSelected}
            onSelect={useCallback(
                () => dispatch(selectNode(props.id)),
                [dispatch, props.id],
            )}
        >
            <TreeView.LeadingVisual label={type}>
                <NodeIcon type={type} />
            </TreeView.LeadingVisual>
            {name}
            <TreeView.TrailingVisual>
                <VisibilityButton id={props.id} />
            </TreeView.TrailingVisual>
            {kids.length ? (
                <TreeView.SubTree>
                    {kids.map((id: UniqueID) => (
                        <SceneNode id={id} key={id} />
                    ))}
                </TreeView.SubTree>
            ) : null}
        </TreeView.Item>
    )
}
function VisibilityButton({ id }: { id: UniqueID }) {
    const node = useSelector((state) => state.scene.nodes[id])

    if (node.visible === null) {
        return null
    }

    const dispatch = useDispatch()
    const sync = useContext(LiaisonContext)

    useObserve(() => sync.onUpdate(node), id, [node.visible])

    return (
        <IconButton
            aria-label="Visibility"
            icon={node.visible ? EyeIcon : EyeClosedIcon}
            variant="invisible"
            size="small"
            onClick={(ev) => {
                ev.stopPropagation() // avoid selecting the node
                dispatch(
                    toggleProperty({
                        id,
                        property: 'visible',
                        value: !node.visible,
                    }),
                )
            }}
        />
    )
}
function NodeIcon(props: { type: SerializedNode['type'] }) {
    switch (props.type) {
        case 'camera':
            return <DeviceCameraVideoIcon />
        case 'light':
            return <LightBulbIcon />
        case 'group':
            return <FileDirectoryIcon />
        case 'mesh':
            return <AppsIcon />
        default:
            return <WorkflowIcon />
    }
}
