import {
    ChangeEvent,
    MutableRefObject,
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
import {
    DesignerContext,
    StateStore,
    useSelector,
    useStore,
    useUpdate,
} from './state'
import { ToolID } from './types'

const defaultPanelProps: React.CSSProperties = {
    border: '3px double black',
    borderRadius: '3px',

    backgroundColor: 'rgba(255,255,255,0.5)',
    backdropFilter: 'blur(3px)',

    width: '100%',
    height: '100%',

    overflow: 'scroll',
}

export function create(
    domElement: HTMLElement,
    App: ReactNode,
): [StateStore, Root] {
    const store = new StateStore()

    const root = createRoot(domElement)
    root.render(
        <StrictMode>
            <DesignerContext.Provider value={store}>
                {App}
            </DesignerContext.Provider>
        </StrictMode>,
    )

    return [store, root]
}

export function Panel(
    props: PropsWithChildren<{
        style?: React.CSSProperties
        title?: ReactNode
        draggable?: boolean
        innerRef?: MutableRefObject<HTMLElement | null>
    }>,
) {
    return (
        <section
            style={{ ...defaultPanelProps, ...(props.style ?? {}) }}
            ref={props.innerRef}
        >
            {props.title && (
                <Panel.TitleBar draggable={props.draggable}>
                    {props.title}
                </Panel.TitleBar>
            )}
            {props.children}
        </section>
    )
}

Panel.TitleBar = (props: { draggable?: boolean; children: ReactNode }) => (
    <header
        className={props.draggable ? 'drag-handle' : ''}
        style={{
            backgroundColor: 'black',
            color: 'white',
            cursor: 'pointer',
            userSelect: 'none',
        }}
    >
        <h1 style={{ margin: '0', padding: '0.333rem' }}>{props.children}</h1>
    </header>
)

export function Toolbar(props: PropsWithChildren) {
    return (
        <Panel draggable title="Tools">
            {props.children}
        </Panel>
    )
}

export function LayerBox(props: unknown) {
    const update = useUpdate()
    const { openResources, activeResource } = useStore()

    useEffect(() => {
        console.debug('Got new  resources!!')
        update((draft) => {
            if (activeResource && openResources.includes(activeResource)) {
                // TODO: test that this works
            } else {
                draft.activeResource = openResources[0]
            }
        })
    }, [openResources])

    const onOptionChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
        update((draft) => {
            // TODO: label isn't going to be unique very long
            const next = draft.openResources.find(
                (r) => r.label === ev.target.value,
            )
            invariant(next, 'Oh no!')
            draft.activeResource = next
        })
    }, [])

    return (
        <Panel draggable title="Layers">
            {openResources.map((res) => (
                <div key={res.label}>
                    <input
                        type="radio"
                        name="layer"
                        value={res.label}
                        id={`layer-box-${res.label}`}
                        checked={activeResource?.label === res.label}
                        onChange={onOptionChange}
                    />
                    <label htmlFor={`layer-box-${res.label}`}>
                        {res.label}
                    </label>
                </div>
            ))}
        </Panel>
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
    // TODO: real keys
    return (
        <Panel>
            <Panel.TitleBar draggable>Palette</Panel.TitleBar>
            {props.choices.map((res, idx) => (
                <div key={idx}>
                    <input
                        type="radio"
                        name="palette"
                        value={res.label}
                        id={`palette-box-${res.label}`}
                    />
                    <label htmlFor={`palette-box-${res.label}`}>
                        {res.label}
                    </label>
                </div>
            ))}
        </Panel>
    )
}

export function Viewport() {
    const update = useUpdate()
    const resource = useSelector((state) => state.activeResource)
    const ref = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = ref.current
        invariant(canvas)
        // canvas.style.touchAction = 'none'

        const type = resource && resource.type
        let regCursor = ''
        if (type === 'tile_map') {
            regCursor = 'crosshair'
        }

        canvas.style.cursor = regCursor

        update((draft) => {
            draft.canvas = canvas
        })

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
            // drag.destroy()
            // move.destroy()
            update((draft) => {
                draft.canvas = null
            })
        }
    }, [ref.current, resource])

    return (
        <Panel draggable title="Viewport">
            <Canvy ref={ref} />
        </Panel>
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
                    width: '100%',
                    backgroundColor: 'black',
                    borderRadius: '5px',
                    touchAction: 'none',
                }}
                ref={ref}
            />
        </LeaveMeAlone>
    )
})

// const Canvy = forwardRef<HTMLCanvasElement>((_props, ref) => {
//     useEffect(() => {}, [])

//     return (
//         <canvas
//             style={{
//                 width: '100%',
//                 backgroundColor: 'black',
//                 borderRadius: '5px',
//             }}
//             ref={ref}
//         />
//     )
// })

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
    props: PropsWithChildren<{ id: ToolID; disabled?: boolean }>,
) {
    const tool = useSelector(
        // @ts-expect-error: maybe we make NONE a key?
        (st) => st.currentTool[st.activeResource?.type],
    )
    const update = useUpdate()

    if (props.disabled) return null

    const prefix = tool === props.id ? '!!' : ''
    return (
        <button
            disabled={props.disabled}
            onClick={() => {
                update((draft) => {
                    //@ts-expect-error
                    draft.currentTool[draft.activeResource?.type] = props.id
                })
            }}
        >
            {prefix} {props.children}
        </button>
    )
}
export function SelectTool(props: unknown) {
    return (
        <ToolButton
            id="select"
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
