import {
    Alignment,
    BlueprintProvider,
    Button,
    ButtonGroup,
    Card,
    CardList,
    CardProps,
    ControlGroup,
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
import {
    TNumber,
    TObject,
    TSchema,
    TTuple,
    ValueGuard,
    type Static,
} from '@sinclair/typebox'
import { TypeGuard } from '@sinclair/typebox/type'
import {
    MouseEventHandler,
    PropsWithChildren,
    ReactNode,
    StrictMode,
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import invariant from 'tiny-invariant'

import { recognizeGestures } from './gestures'
import {
    DesignerContext,
    StateStore,
    selectors,
    useMouse,
    useSelector,
    useStore,
    useUpdate,
} from './state'
import { Palette, PaletteID, ResourceLayer, type ToolID } from './types'

// include blueprint-icons.css for icon font support
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import { Cast, Check, Convert } from '@sinclair/typebox/value'
import 'normalize.css'
import './frontend.css'

export function create(domElement: HTMLElement, App: ReactNode) {
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

    return [
        store,
        () => {
            root.unmount()
        },
    ] as const
}

function LeaveMeAlone(p: PropsWithChildren) {
    useEffect(() => {}, [])

    return <>{p.children}</>
}

export function Viewport() {
    const update = useUpdate()
    const resource = useSelector((state) => state.activeResource)
    const mouse = useMouse()

    const display = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = display.current
        invariant(canvas)

        // const type = resource && resource.type
        // TODO: set cursors via CSS
        // let regCursor = ''
        // if (type === 'tile_map') {
        //     regCursor = 'crosshair'
        // }

        // canvas.style.cursor = regCursor

        update((draft) => {
            draft.canvas = canvas
            draft.overlay = document.createElement('canvas')
        })

        const detachGestures = recognizeGestures(canvas, mouse)
        return () => {
            detachGestures()
            update((draft) => {
                draft.canvas = null
                draft.overlay = null
            })
        }
    }, [display.current, resource])

    return (
        <Section compact title="Viewport">
            <SectionCard>
                {/* <div className="viewport"> */}
                <Canvy ref={display} />
                {/* </div> */}
            </SectionCard>
        </Section>
    )
}

export function LayerBox(props: unknown) {
    const update = useUpdate()
    const { openResources, activeResource, activeLayer } = useStore()

    if (!activeResource) {
        return null
    }

    useEffect(() => {
        update((draft) => {
            // if (activeResource && openResources.includes(activeResource)) {
            //     // TODO: test that this works to keep the same selection
            // } else {
            //     draft.activeResource = openResources[0]
            // }
            draft.activeLayer = activeResource.layers[0]
        })
    }, [activeResource])

    function selectLayer(seek: ResourceLayer<any>) {
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
                    {activeResource.layers.map((layer) => {
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

/** Display a selection of possible  */
export function PaletteBox(props: unknown) {
    const palette: Palette<any> | undefined = selectors.activeLayer.palette()
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

const Canvy = forwardRef<HTMLCanvasElement>(
    (props: { className?: string }, ref) => {
        return (
            <LeaveMeAlone>
                <canvas
                    ref={ref}
                    className={props.className}
                    style={{
                        position: 'fixed',
                        margin: '5px',
                        width: '100%',
                        // borderRadius: '3px',
                        touchAction: 'none',
                    }}
                />
            </LeaveMeAlone>
        )
    },
)

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
    const update = useUpdate()
    const layerType = useSelector((st) => st.activeLayer?.type)
    const tool = useSelector((st) => layerType && st.currentTool[layerType])

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
                disabled={!layerType}
                intent={tool === props.id ? 'primary' : 'none'}
                onClick={() => {
                    update((draft) => {
                        draft.currentTool[layerType!] = props.id
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
            disabled={
                !selectors.activeLayer.is('resource/spatial2d/entity_list')
            }
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
            disabled={
                !selectors.activeLayer.is('resource/spatial2d/entity_list')
            }
        >
            Select
        </ToolButton>
    )
}

export function DrawTool(props: unknown) {
    const enabled = selectors.activeLayer.is('resource/spatial2d/tile_map')

    return (
        <ToolButton id="draw" icon="draw" disabled={!enabled}>
            Draw
        </ToolButton>
    )
}

export function PropertiesBox(props: unknown) {
    const layer = useSelector(
        (st) =>
            st.activeLayer?.type === 'resource/spatial2d/entity_list' &&
            st.activeLayer,
    )

    const selection = useSelector((st) => st.selection)
    if (!(layer && selection.length)) {
        return null
    }

    // TODO: would be very nice to have the real type on this
    const schema = layer.element

    if (selection.length > 1) {
        return (
            <Section compact elevation={1} title="Entity">
                <SectionCard>
                    [!] {selection.length} entities selected
                </SectionCard>
            </Section>
        )
    } else {
        const obj = selection[0]
        if (!Check(schema, obj)) {
            console.warn('Not what we wanted:', selection)
            return null
        }

        // TODO: let the user specify this somehow. We shouldn't know anything about the semantics of the object we're editing
        const title =
            ValueGuard.IsObject(obj) && ValueGuard.IsString(obj.type)
                ? obj.type
                : 'Entity'
        return (
            <Section compact elevation={1} title={title}>
                <SectionCard>
                    <form>
                        <FormControl path={[]} schema={schema} value={obj} />
                    </form>
                </SectionCard>
            </Section>
        )
    }
}

interface FormControlProps<T extends TSchema> {
    path: (string | number)[]
    schema: T
    value: Static<T>
}

function FormControl<T extends TSchema>(
    props: FormControlProps<T> & {
        readonly?: boolean
    },
) {
    const { schema, value, path = [] } = props
    invariant(ValueGuard.IsString(schema.type))
    invariant(Check(schema, value), "Value doesn't match schema")

    if (TypeGuard.IsTuple(schema)) {
        invariant(ValueGuard.IsArray(value))
        invariant(schema.items, 'No items in schema?')

        return (
            <FormControlTuple
                schema={schema}
                // name={name}
                path={path}
                value={value as []}
            />
        )
    }

    switch (schema.type) {
        case 'object': {
            const data = value as { [k: string]: any }
            return Object.entries(
                (schema as unknown as TObject).properties,
            ).map(([name, subschema]: [string, TSchema]) => {
                return (
                    <FormControl
                        key={name}
                        path={path.concat(name)}
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
            // TODO: exclude versions?

            if (TypeGuard.IsTuple(schema)) {
                // TODO: the actual types
                // TODO: max, min
                // const ary = schema as unknown as TArray
                // invariant()
                // invariant(Check(schema, value))
                // invariant(value.length === 2)

                return <></>
            }
            break
        }
        case 'string': {
            const data = props.value
            invariant(typeof data === 'string')
            return (
                <FormGroup inline label={schema.title}>
                    <InputGroup value={data} disabled={props.readonly} />
                </FormGroup>
            )
        }
    }

    throw new Error("Can't do it")
}
function FormControlTuple<T extends TTuple>(props: FormControlProps<T>) {
    const { schema, value, path } = props

    return (
        <FormGroup label={schema.title ?? path.at(-1)}>
            <ControlGroup fill>
                {schema.items?.map((subschema, idx) => (
                    <FormControlTupleElement
                        schema={subschema as TNumber}
                        key={idx}
                        path={path!.concat(idx)}
                        value={value[idx]}
                    />
                ))}
            </ControlGroup>
        </FormGroup>
    )
}

function FormControlTupleElement(props: FormControlProps<TNumber>) {
    const placeholder = '0'

    const { schema, value, path } = props

    const [isValid, setValid] = useState(true)
    const intent = isValid ? 'none' : 'danger'

    const label = useMemo(
        () =>
            schema.title ? (
                <Tag minimal intent={intent}>
                    {schema.title}
                </Tag>
            ) : undefined,
        [schema.title, intent],
    )

    const handler = useCallback(
        (text: string, target: HTMLInputElement | null) => {
            invariant(target)
            const castValue = Convert(schema, text || placeholder)
            const validity = Check(schema, castValue)
            setValid(validity)
            if (validity) {
                console.log(path, castValue)
            }
        },
        [schema, path],
    )

    return (
        // TODO: non-numeric
        <InputGroup
            small
            data-path={JSON.stringify(path)}
            intent={intent}
            type="numeric"
            leftElement={label}
            fill={false}
            placeholder={placeholder}
            defaultValue={String(value)}
            onValueChange={handler}
            onBlur={(ev) => {
                console.log('I blur:', ev)
            }}
        />
    )
}
