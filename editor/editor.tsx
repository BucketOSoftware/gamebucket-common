import {
    BaseStyles,
    Box,
    FormControl,
    Text,
    TextInput,
    ThemeProvider,
    ToggleSwitch,
} from '@primer/react'
import { throttle } from 'lodash-es'
import { createContext, render } from 'preact'
import { useCallback, useContext, useRef, useState } from 'preact/hooks'
import { Provider as ReduxProvider } from 'react-redux'
import * as THREE from 'three'

import {
    hideableTypes,
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
import { SceneTree } from './scene-tree'

export type TODO = any
type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera

export const LiaisonContext = createContext<EditorLiaison>({} as EditorLiaison)

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
