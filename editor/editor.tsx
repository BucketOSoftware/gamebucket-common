// import 'preact/debug'

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
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import invariant from 'tiny-invariant'

import { ZVec2 } from '../geometry'
import type {
    SerializedNode,
    SerializedScene,
    Tup3,
    UniqueID,
} from '../scenebucket'

import { useObserve } from './hooks'
import { Panel, PanelBody } from './panel'
import {
    createStore,
    loadScene,
    selectNode,
    setVisible,
    useDispatch,
    useSelector,
} from './store'
import * as styles from './styles'

type TODO = any

// -----

const SceneUpdater = createContext<EditorLiaison>({} as EditorLiaison)

type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera

export class EditorLiaison {
    static readonly OBJECT_PICKED = 'objectPicked'

    getObjectById: (id: UniqueID) => THREE.Object3D
    onUpdate: (node?: SerializedNode) => void

    private outliner: OutlinePass

    constructor({ scene, camera, getObjectById, onUpdate }: Params) {
        this.getObjectById = getObjectById
        this.onUpdate = onUpdate

        const brite = 1 / 50
        const outliner = (this.outliner = new OutlinePass(
            ZVec2(1, 1),
            scene,
            camera,
        ))
        outliner.edgeStrength = 12
        outliner.edgeGlow = 2
        outliner.edgeThickness = 3
        outliner.visibleEdgeColor.set(0.1 * brite, 0.5 * brite, 2.5 * brite)
        outliner.hiddenEdgeColor.set(1 * brite, 1 * brite, 2.25 * brite)
        outliner.pulsePeriod = 1.4
    }

    get postProcessingPasses() {
        return [this.outliner]
    }

    /** Highlight the objects defined by these IDs in the Outline pass */
    setSelection(id: UniqueID | UniqueID[] | undefined) {
        this.outliner.selectedObjects = arrayWrap(id)
            .filter((i) => i)
            .map((id) => this.getObjectById(id as UniqueID))
        this.onUpdate()
    }

    /** Report a click on the canvas to the editor. Invoke like this:
     * 	@example liaison.clickAt(
     *              (event.clientX / window.innerWidth) * 2 - 1,
     *				-(event.clientY / window.innerHeight) * 2 + 1))
     *
     */
    clickAt(x: number, y: number) {}
}

interface Params {
    scene: THREE.Scene
    camera: Camera
    getSceneData: () => SerializedScene
    getObjectById: (id: UniqueID) => THREE.Object3D
    onUpdate: EditorLiaison['onUpdate'] //  (node?: SerializedNode) => void
}

export function start(options: Params) {
    const liaison = new EditorLiaison(options)

    const store = createStore()
    store.dispatch(loadScene(options.getSceneData()))

    const div = document.createElement('div')
    div.id = 'gbk-editor'
    document.body.append(div)

    render(
        <SceneUpdater.Provider value={liaison}>
            <ReduxProvider store={store}>
                <styles.GlobalStyles />
                <ThemeProvider theme={styles.theme}>
                    <BaseStyles>
                        <Editor />
                    </BaseStyles>
                </ThemeProvider>
            </ReduxProvider>
        </SceneUpdater.Provider>,
        div,
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
    const liaison = useContext(SceneUpdater)
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
    const dispatch = useDispatch()
    const sync = useContext(SceneUpdater)
    const node = useSelector((state) => state.scene.nodes[id])

    useObserve(() => sync.onUpdate(node), id, [node.visible])

    return (
        <IconButton
            aria-label="Visibility"
            icon={node.visible ? EyeIcon : EyeClosedIcon}
            variant="invisible"
            size="small"
            onClick={(ev: Event) => {
                ev.stopPropagation() // avoid selecting the node
                dispatch(setVisible([id, !node.visible]))
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
    const sync = useContext(SceneUpdater)
    const node = useSelector((state) => state.scene.nodes[selected])

    useObserve(() => sync.onUpdate(node), node.id, [node])

    const { id, name, position, visible } = node

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
                <Toggle id={id} value={visible} action={setVisible} />
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

function Toggle({
    id,
    value,
    action,
}: {
    id: UniqueID
    value: boolean
    action: typeof setVisible
}) {
    const dispatch = useDispatch()
    return (
        <>
            <Text
                id="node-details-panel-visbility"
                fontWeight="bold"
                fontSize={1}
            >
                Visibility
            </Text>
            <ToggleSwitch
                aria-labelledby="node-details-panel-visbility"
                checked={value}
                size="small"
                onClick={(_: MouseEvent) => dispatch(action([id, !value]))}
            />
        </>
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

/*
function ThreeObj(props: ThreeSkeleton) {
    // if (props.children.length) {
    const list = (
        <ul>
            {props.children.map((o) => (
                <ThreeObj {...o} />
            ))}
        </ul>
    )

    const updater = useContext(UpdaterContext)
    return (
        <li key={props.uuid}>
            {props.name || props.type}
            <input
                type="checkbox"
                checked={props.visible}
                onChange={(ev) => {
                    updater(props.uuid, 'visible', !ev.target.checked)
                }}
            />
            {list}
        </li>
    )
}

// function ObjectProperties(props: { uuid: string; visible: boolean }) {
    // return <input type="checkbox" checked={props.visible} />
// }

function wrappr(obj: three.Object3D): ThreeSkeleton {
    return {
        uuid: obj.uuid,
        type: obj.type,
        name: obj.name,

        visible: obj.visible,
        children: obj.children.map(wrappr),
    }
}

*/

function arrayWrap<T>(ik: unknown): T[] {
    return Array.isArray(ik) ? ik : [ik]
}
