import {
    BlueprintProvider,
    Button,
    ButtonGroup,
    Card,
    CardList,
    Section,
    SectionCard,
    Tooltip,
} from '@blueprintjs/core'
import {
    PropsWithChildren,
    ReactNode,
    StrictMode,
    forwardRef,
    useEffect,
    useRef,
} from 'react'
import { Root, createRoot } from 'react-dom/client'
import invariant from 'tiny-invariant'

import {
    DesignerContext,
    StateStore,
    useSelector,
    useStore,
    useUpdate,
} from './state'
import { Resource, ToolID } from './types'

import '@blueprintjs/core/lib/css/blueprint.css'
import 'normalize.css'
// include blueprint-icons.css for icon font support
import '@blueprintjs/icons/lib/css/blueprint-icons.css'

////// SCHEMING

// export const playerSchema = z
//     .object({
//         id: z.number().int().min(1).max(10).readonly(),
//         respawn: z.boolean().default(false).describe('Should respawn?'),
//         facing: z.array(z.number().optional()).length(2),
//         // myUnion: z.union([z.number(), z.boolean()]),
//     })
//     .describe('My neat object schema')

// const jsonSchema = zodToJsonSchema(playerSchema, 'mySchema')
// console.log('HI!', jsonSchema)
const jsonSchema = {
    $ref: '#/definitions/player',
    definitions: {
        player: {
            type: 'object',
            properties: {
                id: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                },
                respawn: {
                    type: 'boolean',
                    default: false,
                    title: 'Should respawn?',
                },
                facing: {
                    type: 'array',
                    items: {
                        type: 'number',
                    },
                    minItems: 2,
                    maxItems: 2,
                },
            },
            required: ['id', 'facing'],
            additionalProperties: false,
            title: 'Player',
            description: 'Just some player',
        },
    },
    $schema: 'http://json-schema.org/draft-07/schema#',
}
/*
['id', Integer.primary.readonly],
// position will be a GVec2 object, or else maybe _x? and can be changed via the translation tool
['respawn', Boolean.default(false).label("Should respawn")],
['position', Vector(2).for(WORLD_POSITION)],

// mark this property as being affected by the rotate tool? since it's a unit vector we can work with it as just an angle of rotation away from whatever reference vector
['facing', Vector(2).unit.for(WORLD_ORIENTATION)],
// show a code editor with JS highlighting, maybe. could be in the panel or a separate panel / popout?
['script', Text.code('javascript').multiline],
// Show a numbers-only input box and a slider with stops on 0,5,10,...
['health', Integer.range(0, 100).step(5).default(100)],

['type', String.of('pickup', 'enemy', 'player')],

// these properties only apply (i.e. will only be shown/edited) if the function that takes the whole record returns true
[(record => record.type === 'enemy'),
    ['behavior', String.of('lion', 'tiger', 'ruffian')],

]
*/

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

export function Toolbar(props: PropsWithChildren) {
    return <ButtonGroup>{props.children}</ButtonGroup>
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

    function handleClick(seek: Resource) {
        return () => {
            update((draft) => {
                draft.activeResource = openResources.find((res) => res === seek)
            })
        }
    }

    return (
        <Section compact elevation={1} title="Layers" className="sidebar-panel">
            <SectionCard padded={false} className="scroll-it">
                <CardList compact bordered={false}>
                    {openResources.map((res) => {
                        return (
                            <Card
                                key={res.label}
                                compact
                                interactive
                                selected={res === activeResource}
                                onClick={handleClick(res)}
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

interface PaletteEntryImage {
    icon?: undefined
    // src for an image of the thing, intended to be displayed as large as reasonable
    img: string
    // name of the thing, for tooltip
    label?: string
}

interface PaletteEntryIcon {
    // src for an icon used to represent the thing
    icon: string
    img?: undefined
    // name of the thing, for tooltip
    label?: string
}

interface PaletteEntryText {
    icon?: undefined
    img?: undefined
    label: string
}

/** Display a selection of possible  */
export function PaletteBox(props: {
    choices: PaletteEntryImage[] | PaletteEntryIcon[] | PaletteEntryText[]
}) {
    function getIcon(
        choice: PaletteEntryImage | PaletteEntryIcon | PaletteEntryText,
    ) {
        if (choice.icon) {
            return (
                <img
                    src={choice.icon}
                    width={24}
                    height={24}
                    title={choice.label}
                />
            )
        }
        return <div>Hi</div>
    }

    // TODO: real keys
    return (
        <Section compact elevation={1} style={{ overflowY: 'scroll' }}>
            <SectionCard padded className="docs-section-card-limited-height">
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '5px',
                        justifyContent: 'space-between',
                    }}
                >
                    {props.choices.map((choice, idx) => (
                        <Button
                            icon={getIcon(choice)}
                            style={{ padding: '3px' }}
                        />
                    ))}
                </div>
            </SectionCard>
        </Section>
    )
}

export function Viewport() {
    const update = useUpdate()
    const resource = useSelector((state) => state.activeResource)
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

        const onMouseMove = (ev: MouseEvent) => {
            console.log(ev.offsetX, ev.offsetY)
        }
        canvas.addEventListener('mousemove', onMouseMove, { passive: true })

        /*
        const drag = new DragGesture(
            canvas,
            (sass) => {
                const { left, top, width, height } = (
                    sass.target as HTMLElement
                ).getBoundingClientRect()
                const x = roundToPlaces((sass.values[0] - left) / width, 2)
                const y = roundToPlaces((sass.values[1] - top) / height, 2)
                if (resource && 'plot' in resource) {
                    // console.log(x, y)
                    resource.plot(x, y, 97)
                }

                if (sass.last) {
                    console.log(sass.tap, sass.swipe, sass.axis)
                }
                // console.log(sass.active, sass.last, sass.tap, sass.swipe, sass.axis)
            },
            { threshold: 0 },
        )

        const move = new MoveGesture(
            canvas,
            (sus) => {
                console.log(sus.xy)
                if (sus.xy[0] > 100 && sus.xy[0] < 200) {
                    canvas.style.cursor = 'help'
                } else {
                    canvas.style.cursor = regCursor
                }
            },
            {},
        )
*/

        return () => {
            canvas.removeEventListener('mousemove', onMouseMove)

            // drag.destroy()
            // move.destroy()
            update((draft) => {
                draft.canvas = null
            })
        }
    }, [ref.current, resource])

    return (
        <Section compact title="Viewport">
            <Canvy ref={ref} />
        </Section>
    )
}

function LeaveMeAlone(p: PropsWithChildren) {
    useEffect(() => {}, [])

    return <>{p.children}</>
}

const Canvy = forwardRef<HTMLCanvasElement>((_props, ref) => {
    return (
        <LeaveMeAlone>
            <canvas
                style={{
                    margin: '5px',
                    width: '100%',
                    backgroundColor: 'black',
                    borderRadius: '3px',
                    touchAction: 'none',
                }}
                ref={ref}
            />
        </LeaveMeAlone>
    )
})

const selectors = {
    activeResource: {
        is: (type: string) => {
            return useSelector((st) => st.activeResource?.type) === type
        },
    },

    // activeResourceType: () => {},
    // (st: DesignerStateType) =>
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
            openOnTargetFocus={false}
            placement="right"
            usePortal={false}
            content={<span>{props.id}</span>}
        >
            <Button
                icon={props.icon}
                large
                intent={tool === props.id ? 'primary' : 'none'}
                // disabled={props.disabled}
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

export function MarqueeTool() {
    // const currentLayerType = useSelector((d) => d.currentLayer?.type)
    // const currentLayer = useSelector((d) => d.currentLayer)
    return <ToolButton id="marquee">Marquee</ToolButton>
}

export function DrawTool(props: unknown) {
    // const currentLayer } = useSelector()

    // const currentLayerType = useSelector((d) => d.currentLayer?.type)
    const enabled = selectors.activeResource.is('tile_map')
    return (
        <ToolButton id="draw" disabled={!enabled}>
            Draw
        </ToolButton>
    )
}

export function LineTool(props: unknown) {
    return <ToolButton id="line">Line</ToolButton>
}

export function FileMenu(props: unknown) {
    return <button>File...</button>
}
