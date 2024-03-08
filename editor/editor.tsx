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
import {
    StrictMode,
    createContext,
    // render,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import { Provider as ReduxProvider } from 'react-redux'

import { type SerializedScene, type Tup3, type UniqueID } from '../scenebucket'

import { useObserve } from './hooks'
import EditorLiaison, { Params } from './liaison'
import { Panel, PanelBody } from './panel'
import { SceneTree } from './scene-tree'
import {
    NodeTogglableProperties,
    createStore,
    loadScene,
    openContextMenu,
    selectNode,
    toggleProperty,
    useDispatch,
    useSelector,
} from './store'
import * as styles from './styles'
import { Toolbar } from './toolbox'
import { Vector3 } from 'three'
import { ContextMenu } from './context-menu'

type TODO = any
// type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera

export const LiaisonContext = createContext<EditorLiaison>({} as EditorLiaison)

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

    const root = createRoot(dom)
    root.render(
        <StrictMode>
            <LiaisonContext.Provider value={liaison}>
                <ReduxProvider store={store}>
                    <Editor />
                </ReduxProvider>
            </LiaisonContext.Provider>
        </StrictMode>,
    )

    return liaison
}

// Components
// ----------

function Editor() {
    const selection = useSelector((state) => state.ui.selected)
    const liaison = useContext(LiaisonContext)

    useEffect(() => liaison.setSelection(selection), [selection])

    return (
        <>
            <styles.GlobalStyles />
            <ThemeProvider theme={styles.theme}>
                <BaseStyles>
                    <ContextMenu />
                    <aside
                        style={{
                            position: 'absolute',
                            display: 'flex',
                            flexDirection: 'column',
                            flexWrap: 'wrap',

                            top: styles.theme.space[1],
                            bottom: styles.theme.space[1],
                            left: styles.theme.space[1],
                            gap: styles.theme.space[1],

                            transform:
                                'perspective(1000px) rotate3d(0, 1, 0, 10deg)',
                            transformOrigin: 'left',

                            zIndex: 10,
                        }}
                    >
                        <SceneTree />
                        {selection && <NodeDetailsPanel />}
                    </aside>
                    <Toolbar />
                </BaseStyles>
            </ThemeProvider>
        </>
    )
}

function NodeDetailsPanel() {
    const selected = useSelector((state) => state.ui.selected)

    const dispatch = useDispatch()
    const sync = useContext(LiaisonContext)
    const node = useSelector(
        (state) => state.ui.selected && state.scene.nodes[state.ui.selected],
    )!

    useObserve(() => sync.onUpdate(node), node.id, [node])

    const { id, name, position } = node

    const [inputPosition, setInputPosition] = useState(position.join(', '))

    if (selected === undefined) {
        return null
    }

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
                <PropertyToggle id={id} property="visible" />
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
    const domId = 'node-details-panel-' + property

    // If null, the property doesn't apply to this object
    if (currentValue === null) {
        return null
    }

    return (
        <Box style={{ display: 'flex' }}>
            <Text
                id={domId}
                fontWeight="bold"
                fontSize={1}
                sx={{ textTransform: 'capitalize', flexGrow: 1 }}
            >
                {property}
            </Text>
            <ToggleSwitch
                aria-labelledby={domId}
                size="small"
                checked={currentValue}
                onClick={(ev) =>
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
