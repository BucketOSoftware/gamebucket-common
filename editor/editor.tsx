import {
    AppsIcon,
    DeviceCameraVideoIcon,
    EyeClosedIcon,
    EyeIcon,
    FileDirectoryIcon,
    LightBulbIcon,
    WorkflowIcon,
} from '@primer/octicons-react'
import {
    BaseStyles,
    Box,
    FormControl,
    IconButton,
    Text,
    TextInput,
    ThemeProvider,
    ToggleSwitch,
    TreeView,
} from '@primer/react'
import { throttle } from 'lodash-es'
import { createContext, render } from 'preact'
import {
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'preact/hooks'
import { Provider as ReduxProvider } from 'react-redux'
import * as THREE from 'three'

import invariant from 'tiny-invariant'

import {
    hideableTypes,
    type SerializedNode,
    type SerializedScene,
    type Tup3,
    type UniqueID,
} from '../scenebucket'

import { useObserve } from './hooks'
import EditorLiaison, { Params } from './liaison'
import { Panel, PanelBody } from './panel'
import {
    createStore,
    loadScene,
    NodeTogglableProperties,
    selectNode,
    toggleProperty,
    useDispatch,
    useSelector,
} from './store'
import * as styles from './styles'

type TODO = any
type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera

const LiaisonContext = createContext<EditorLiaison>({} as EditorLiaison)

// interface Params {
//     scene: THREE.Scene
//     camera: Camera
//     getObjectById: (id: UniqueID) => THREE.Object3D
//     onUpdate: EditorLiaison['onUpdate'] //  (node?: SerializedNode) => void
// }

function createDomRoot() {
    const div = document.createElement('div')
    document.body.append(div)
}

//
export function start(
    options: Params & {
        getSceneData: () => SerializedScene

        domElement: HTMLElement
    },
) {
    const store = createStore()
    store.dispatch(loadScene(options.getSceneData()))

    const dom = options.domElement || createDomRoot()
    if (dom.id) {
        console.warn('Editor: changing id of DOM element', dom)
        dom.id = 'gbk-editor'
    }

    const liaison = new EditorLiaison(options, dom)

    render(
        <LiaisonContext.Provider value={liaison}>
            <ReduxProvider store={store}>
                <styles.GlobalStyles />
                <ThemeProvider theme={styles.theme}>
                    <BaseStyles>
                        <Editor />
                    </BaseStyles>
                </ThemeProvider>
            </ReduxProvider>
        </LiaisonContext.Provider>,
        dom,
    )

    return liaison
}

// Components
// ----------

function Editor() {
    return (
        <aside style={styles.sidebar}>
            <SceneTree />
            <NodeDetailsPanel />
        </aside>
    )
}

function SceneTree() {
    const liaison = useContext(LiaisonContext)
    const dispatch = useDispatch()

    const selection = useSelector((state) => state.ui.selected)
    const roots = useSelector((state) => state.scene.roots)

    useEffect(() => liaison.setSelection(selection), [selection])

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
                        <SceneNode id={id} />
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
                    {kids.map((id: TODO) => (
                        <SceneNode id={id} />
                    ))}
                </TreeView.SubTree>
            ) : null}
        </TreeView.Item>
    )
}

function VisibilityButton({ id }: { id: UniqueID }) {
    const node = useSelector((state) => state.scene.nodes[id])

    if (!hideableTypes[node.type]) {
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
            onClick={(ev: Event) => {
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

function NodeDetailsPanel() {
    const selected = useSelector((state) => state.ui.selected)
    if (selected === undefined) {
        return null
    }

    const dispatch = useDispatch()
    const sync = useContext(LiaisonContext)
    const node = useSelector((state) => state.scene.nodes[selected])

    useObserve(() => sync.onUpdate(node), node.id, [node])

    const { id, name, position } = node

    const [inputPosition, setInputPosition] = useState(position.join(', '))

    const positionChanged = throttle((value: Tup3) => {
        console.warn(value)
        // TODO: dispatch
    }, 0)

    function typedIt(ev: any) {
        console.warn(ev)
    }

    return (
        <Panel title={name!} onClose={() => dispatch(selectNode())}>
            <PanelBody>
                {hideableTypes[node.type] && (
                    <PropertyToggle id={id} property="visible" />
                )}
                <PropertyToggle id={id} property="castShadow" />
                <PropertyToggle id={id} property="receiveShadow" />
                <form
                    onSubmit={(ev) => {
                        ev.preventDefault()
                    }}
                >
                    <FormControl>
                        <FormControl.Label>Position</FormControl.Label>
                        <TextInput
                            monospace
                            size="small"
                            value={inputPosition}
                            onChange={(ev: TODO) =>
                                setInputPosition(ev.target!.value)
                            }
                        />
                    </FormControl>
                </form>
            </PanelBody>
        </Panel>
    )
}

function PropertyToggle({
    id,
    property,
}: {
    id: UniqueID
    property: NodeTogglableProperties
}) {
    const dispatch = useDispatch()
    const currentValue = useSelector((state) => state.scene.nodes[id][property])

    return (
        <Box style={{ display: 'flex' }}>
            <Text
                id={'node-details-panel-' + property}
                fontWeight="bold"
                fontSize={1}
                sx={{ textTransform: 'capitalize', flexGrow: 1 }}
            >
                {property}
            </Text>
            <ToggleSwitch
                aria-labelledby={'node-details-panel-' + property}
                size="small"
                checked={currentValue}
                onClick={(_: MouseEvent) =>
                    dispatch(
                        toggleProperty({
                            id,
                            property,
                            value: !currentValue,
                        }),
                    )
                }
            />
        </Box>
    )
}
function VectorInput(props: {
    value?: Tup3
    placeholder?: string
    name: string
    onChange: (value: Tup3) => void
}) {
    const val = props.value ?? [0, 0, 0]

    const inputs = val.map((_) => useRef<HTMLInputElement>(null))

    const handleChange = useCallback(() => {
        props.onChange(
            inputs.map((ref) => Number.parseFloat(ref.current!.value)) as Tup3,
        )
    }, [inputs, props.onChange])

    return (
        <div>
            {val.map((v, idx) => (
                <input
                    ref={inputs[idx]}
                    type="number"
                    step="any"
                    name={props.name + '_' + idx}
                    value={v}
                    placeholder={props.placeholder}
                    onChange={handleChange}
                ></input>
            ))}
        </div>
    )
}
