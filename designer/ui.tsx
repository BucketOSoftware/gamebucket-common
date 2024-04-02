import {
    Alignment,
    BlueprintProvider,
    Button,
    ButtonGroup,
    Card,
    CardList,
    CardProps,
    FormGroup,
    InputGroup,
    NumericInput,
    Section,
    SectionCard,
    Slider,
    Switch,
    Tag,
    Tooltip,
} from '@blueprintjs/core'
import { BlueprintIcons_16Id } from '@blueprintjs/icons/lib/esm/generated/16px/blueprint-icons-16'
import { TArray, TObject, TSchema, Type, type Static } from '@sinclair/typebox'
import {
    MouseEventHandler,
    PropsWithChildren,
    ReactNode,
    StrictMode,
    forwardRef,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import { Root, createRoot } from 'react-dom/client'
import invariant from 'tiny-invariant'

import '@blueprintjs/core/lib/css/blueprint.css'
import 'normalize.css'
import {
    DesignerContext,
    StateStore,
    selectors,
    useMouse,
    useSelector,
    useStore,
    useUpdate,
} from './state'
import { Palette, PaletteID, TVec2, type Resource, type ToolID } from './types'
// include blueprint-icons.css for icon font support
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import { recognizeGestures } from './gestures'

export function create(
    domElement: HTMLElement,
    App: ReactNode,
): [StateStore, Root] {
    const store = new StateStore()

    const root = createRoot(domElement)
    root.render(
        <StrictMode>
            <BlueprintProvider>
                <DesignerContext.Provider value={store}>
                    {App}
                </DesignerContext.Provider>
            </BlueprintProvider>
        </StrictMode>,
    )

    return [store, root]
}

function LeaveMeAlone(p: PropsWithChildren) {
    useEffect(() => {}, [])

    return <>{p.children}</>
}

export function Viewport() {
    const update = useUpdate()
    const resource = useSelector((state) => state.activeResource)
    const mouse = useMouse()

    const ref = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = ref.current
        invariant(canvas)

        const type = resource && resource.type
        let regCursor = ''
        if (type === 'tile_map') {
            regCursor = 'crosshair'
        }

        canvas.style.cursor = regCursor

        update((draft) => {
            draft.canvas = canvas
        })

        const detachGestures = recognizeGestures(canvas, mouse)
        return () => {
            detachGestures()
            update((draft) => {
                draft.canvas = null
            })
        }
    }, [ref.current, resource])

    return (
        <Section compact title="Viewport">
            <SectionCard>
                <Canvy ref={ref} />
            </SectionCard>
        </Section>
    )
}

export function LayerBox(props: unknown) {
    const update = useUpdate()
    const { openResources, activeResource } = useStore()

    useEffect(() => {
        update((draft) => {
            if (activeResource && openResources.includes(activeResource)) {
                // TODO: test that this works
            } else {
                draft.activeResource = openResources[0]
            }
        })
    }, [openResources])

    function selectLayer(seek: Resource<any>) {
        return () => {
            update((draft) => {
                draft.activeResource = openResources.find((res) => res === seek)
            })
        }
    }

    return (
        <Section compact elevation={1} title="Layers" className="sidebar-panel">
            <SectionCard padded={false}>
                <CardList compact bordered={false}>
                    {openResources.map((res) => {
                        return (
                            <Card
                                key={res.label}
                                compact
                                interactive
                                selected={res === activeResource}
                                onClick={selectLayer(res)}
                            >
                                {res.label}
                            </Card>
                        )
                    })}
                </CardList>
            </SectionCard>
        </Section>
    )
}

/** Display a selection of possible  */
export function PaletteBox(props: unknown) {
    const palette: Palette<any> | undefined = selectors.activeResource.palette()
    if (!palette) return null

    let klass = ''
    if (palette.length) {
        if (palette[0].icon || palette[0].img) {
            klass = 'palette-grid'
        } else if (palette[0].label) {
            klass = 'palette-tags'
        }
    }
    // TODO: real keys
    return (
        <Section title="Palette" compact elevation={1}>
            <SectionCard padded className={klass}>
                {Object.entries(palette).map(([id, entry], idx) => (
                    <PaletteButton id={id} item={entry} key={id} />
                    // <Button key={idx} icon={getIcon(choice)} />
                ))}
            </SectionCard>
        </Section>
    )
}

function PaletteButton(props: { id: PaletteID; item: Palette[number] }) {
    const update = useUpdate()
    const selected = useSelector((st) => st.activePaletteItem === props.id)

    const { id, item } = props

    const onClick: MouseEventHandler<HTMLElement> = useCallback(
        (ev) => {
            update((draft) => {
                draft.activePaletteItem = id
            })
        },
        [id],
    )

    if (item.icon) {
        return (
            <Button active={selected} minimal onClick={onClick}>
                <img
                    src={item.icon}
                    width={24}
                    height={24}
                    title={item.label}
                />
            </Button>
        )
    }

    if (item.img) {
        throw new Error('TODO')
    }

    invariant(item.label, 'Invalid palette entry')
    if (item.label) {
        return (
            <Tag
                round
                intent={selected ? 'primary' : 'none'}
                interactive
                onClick={onClick}
            >
                {item.label}
            </Tag>
        )
    }
}

const Canvy = forwardRef<HTMLCanvasElement>((_props, ref) => {
    return (
        <LeaveMeAlone>
            <canvas
                style={{
                    margin: '5px',
                    width: '100%',
                    backgroundColor: 'black',
                    // borderRadius: '3px',
                    touchAction: 'none',
                }}
                ref={ref}
            />
        </LeaveMeAlone>
    )
})

export function Toolbar(
    props: PropsWithChildren<{ className: CardProps['className'] }>,
) {
    return (
        <Card compact elevation={3} className={props.className}>
            <ButtonGroup>{props.children}</ButtonGroup>
        </Card>
    )
}

function ToolButton(
    props: PropsWithChildren<{
        id: ToolID
        icon: BlueprintIcons_16Id
        disabled?: boolean
        children: string | JSX.Element
    }>,
) {
    const tool = useSelector(
        // @ts-expect-error: maybe we make NONE a key?
        (st) => st.currentTool[st.activeResource?.type],
    )
    const update = useUpdate()

    if (props.disabled) return null

    return (
        <Tooltip
            openOnTargetFocus={true}
            placement="bottom"
            usePortal={false}
            content={props.id}
            className="flex-shrink" // For some reason the tooltip enlarges the button area in the stock CSS
        >
            <Button
                icon={props.icon}
                large
                intent={tool === props.id ? 'primary' : 'none'}
                onClick={() => {
                    update((draft) => {
                        //@ts-expect-error
                        draft.currentTool[draft.activeResource?.type] = props.id
                    })
                }}
            />
        </Tooltip>
    )
}

export function CreateTool(props: unknown) {
    return (
        <ToolButton
            id="create"
            icon="new-object"
            disabled={!selectors.activeResource.is('object_list')}
        >
            New Entity
        </ToolButton>
    )
}
export function SelectTool(props: unknown) {
    return (
        <ToolButton
            id="select"
            icon="hand-up"
            disabled={!selectors.activeResource.is('object_list')}
        >
            Select
        </ToolButton>
    )
}

export function DrawTool(props: unknown) {
    const enabled = selectors.activeResource.is('tile_map')

    return (
        <ToolButton id="draw" icon="draw" disabled={!enabled}>
            Draw
        </ToolButton>
    )
}

export function SpawnPointBox(props: unknown) {
    const res = useSelector(
        (st) => st.activeResource?.type === 'object_list' && st.activeResource,
    )

    if (!res) {
        return null
    }

    const formData = { position: [1, 1], type: 'player' }

    // TODO: would be very nice to have the real type on this
    const schema = res.element as TSchema

    return (
        <Section compact elevation={1} title="Entity">
            <SectionCard>
                <form>
                    <FormControl
                        name="Entity?"
                        schema={schema}
                        value={formData}
                    />
                </form>
            </SectionCard>
        </Section>
    )
}

function FormControl<T extends TSchema>(props: {
    schema: T
    name: string
    value: Static<T>
    readonly?: boolean
}) {
    const { schema, name, value } = props
    invariant(typeof schema.type === 'string', schema.type)
    console.warn('schema', schema.type, schema)

    switch (schema.type) {
        case 'object': {
            const data = value as { [k: string]: any }
            return Object.entries(
                (schema as unknown as TObject).properties,
            ).map(([name, subschema]: [string, TSchema]) => {
                return (
                    <FormControl
                        key={name}
                        name={name}
                        schema={subschema}
                        readonly={schema.required.includes(name)}
                        value={data[name]}
                    />
                )
            })
        }
        case 'boolean':
            invariant(
                typeof value === 'boolean' || typeof value === 'undefined',
            )
            return (
                <Switch
                    label={schema.title}
                    alignIndicator={Alignment.RIGHT}
                    checked={false}
                    onChange={(e) => console.warn('TODO', name, e)}
                />
            )
        case 'number':
        case 'integer':
            if ('minimum' in schema && 'maximum' in schema) {
                return (
                    <FormGroup label={schema.title}>
                        <Slider
                            min={schema.minimum}
                            max={schema.maximum}
                            stepSize={schema.multipleOf}
                            value={0}
                            onChange={(e) => console.warn('TODO', e)}
                            // TODO: these aren't the same thing, esp. if min isn't a multiple of multipleOf
                            labelStepSize={schema.multipleOf * 4}
                        />
                    </FormGroup>
                )
            }
            throw new Error("Can't do it")
        case 'array': {
            const ary = schema as unknown as TArray
            const isTuple = ary.minItems === ary.maxItems

            if (isTuple) {
                // TODO: the actual types
                // TODO: max, min
                return (
                    <FormGroup inline label={schema.title}>
                        <NumericInput selectAllOnFocus placeholder="0" small />
                        <NumericInput selectAllOnFocus placeholder="0" small />
                    </FormGroup>
                )
            }
            break
        }
        case 'string': {
            const data = props.value
            invariant(typeof data === 'string')
            return (
                <FormGroup inline label={schema.title}>
                    <InputGroup
                        key={props.name}
                        value={data}
                        disabled={props.readonly}
                    ></InputGroup>
                </FormGroup>
            )
        }
    }

    throw new Error("Can't do it")
}
