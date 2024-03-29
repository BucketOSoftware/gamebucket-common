import { produce } from 'immer'
import debounce from 'lodash-es/debounce'
import {
    ChangeEvent,
    JSXElementConstructor,
    MutableRefObject,
    PropsWithChildren,
    ReactNode,
    StrictMode,
    // StyleHTMLAttributes,
    createContext,
    forwardRef,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Matrix3 } from 'three'
import invariant from 'tiny-invariant'
import { DragGesture, HoverGesture, MoveGesture } from '@use-gesture/vanilla'

import { rect, roundToPlaces } from 'gamebucket'

type Resource = MapResource

/** Metadata for resources that can be edited as map layers */
type MapResource = TileMapResource | ContinuousMapResource | ObjectListResource

type ResourceType = Resource['type']

/** Specifies what values are valid for a property, allowing us to build a UI around it */
type TypeSpec = IntegerSpec

interface IntegerSpec {
    type: 'Integer'
    // if not specified as `true`, this value is required
    optional?: boolean

    // if type is Integer, the value of each element is an index into an array
    indexInto?: (string | number)[]
    range?: [
        min: number | undefined,
        max: number | undefined,
        step?: number | undefined,
    ]
    default?: number
}

type TODO = any

interface ResourceCommon {
    /** Label shown in the editor. Must be unique.
     * @todo Make one up if it's not given?
     */
    label: string

    /** Matrix to transform the map's local coordinates into world coordinates, suitable for arranging maps in a larger space*/
    worldTransform?: Matrix3

    /** Size of the map in local coordinates */
    size: rect.Size
}

interface TileMapResource extends ResourceCommon {
    type: 'tile_map'
    elementType: TypeSpec

    /** called by the editor when this resource is selected and there's a click in the viewport with the pencil tool active, or perhaps a line drawn by a line tool. Params will be the normalized viewport coordinate [0..1)?, which layer is selected, and the value that's been plotted.
     * @todo what could the return value mean?
     */
    plot: (viewport_x: number, viewport_y: number, value: number) => void
}

interface ContinuousMapResource extends ResourceCommon {
    type: 'continuous_map'

    /** Matrix to transform the map's local coordinates into world coordinates, suitable for arranging maps in a larger space*/
    worldTransform?: Matrix3

    /** @todo Mostly same as tilemap. But does it apply? */
    plot: (viewport_x: number, viewport_y: number, value: number) => void
}

// TODO: ugh. this wants to be a unique value that identifies an object

/** A list of object properties  */
interface ObjectListResource<
    Key extends string = string,
    Rec extends object = { [k: string]: any },
> extends ResourceCommon {
    type: 'object_list'

    /** property name that identifies an object */
    key: TODO
    properties: ObjectPropertyDict<Rec>

    create: (
        viewport_x: number,
        viewport_y: number,
        object_type: string,
    ) => void

    /** Called when the user wants to remove an object from the dataset */
    delete: (id: Key) => void

    get: (id: Key) => Rec

    /**
     * Callback when the user modified an object property.
     * @todo better types
     * @param id Which object has been modified by the user
     * @param property Which property has been changed
     * @param value The new value for the property
     */
    set: (id: Key, property: string, value: any) => void
}

// TODO: mapped type
type ObjectPropertyDict<Rec> = { [name: string]: ObjectProperty<Rec> }

/** A string is the title of a group of related properties */
type ObjectProperty<Rec> =
    | TypeSpec
    | [condition: (record: Rec) => boolean, properties: ObjectPropertyDict<Rec>]
interface DesignerState {
    openResources: MapResource[]
    currentLayer: MapResource | undefined
    selectedLayer: string | undefined
    selectLayer: (label: string) => void
    viewportCanvas: MutableRefObject<HTMLCanvasElement | null>
}

function defaultState() {
    return {
        openResources: [] as Resource[],
        activeResource: undefined as Resource | undefined,

        // currentLayer: '',
        // currentTool: {} as Record<ResourceType, ToolID>,
        currentTool: {
            object_list: 'select',
            tile_map: 'draw',
        } as Record<ResourceType, ToolID>,

        canvas: null as HTMLCanvasElement | null,
    }
}
type DesignerStateType = ReturnType<typeof defaultState>

export class StateStore {
    private state = produce(defaultState(), () => {})

    get canvas() {
        return this.state.canvas
    }

    subscribers = new Set<() => void>()

    subscribe = (onStoreChange: () => void) => {
        this.subscribers.add(onStoreChange)
        console.warn('Adding subscriber', onStoreChange)

        return () => {
            this.subscribers.delete(onStoreChange)
        }
    }

    getSnapshot = () => this.state

    createSelector<T = unknown>(selector: (st: DesignerStateType) => T) {
        // const defaultedSelector = selector ?? ((i: DesignerStateType) => i)
        return () => selector(this.state)
    }

    update = (
        callback: (draft: DesignerStateType) => void | DesignerStateType,
    ) => {
        // TODO?: rollback to old state if the validation fails
        // const oldState = this.state
        this.state = produce(this.state, callback)
        validate(this.state)
        this.notify()
    }

    private notify = debounce(() => {
        for (let s of this.subscribers) {
            s()
        }
    }, 1000 / 60)
}

export const DesignerState = createContext(new StateStore())
// const getAll = (st: DesignerStateType) => st

export function useAll() {
    return useDesignerState((x) => x)
}

export function useDesignerState<T>(selector: (st: DesignerStateType) => T) {
    const store = useContext(DesignerState)
    return useSyncExternalStore(
        store.subscribe,
        store.createSelector(selector),
        // selector ? store.createSelector(selector) : store.getSnapshot,
    )
}

export function useDesignerUpdate() {
    return useContext(DesignerState).update
}

const defaultPanelProps: React.CSSProperties = {
    border: '3px double black',
    borderRadius: '3px',

    backgroundColor: 'rgba(255,255,255,0.5)',
    backdropFilter: 'blur(3px)',

    width: '100%',
    height: '100%',

    overflow: 'scroll',
}

export function Panel(
    props: PropsWithChildren<{
        style?: React.CSSProperties
        title?: ReactNode
        draggable?: boolean
        windowshade?: boolean
        innerRef?: MutableRefObject<HTMLElement | null>
    }>,
) {
    const [open, setOpen] = useState(true)

    const onWindowshade = useCallback(() => {
        if (props.windowshade) {
            setOpen((currentValue) => !currentValue)
        }
    }, [props.windowshade])

    return (
        <section
            style={{ ...defaultPanelProps, ...(props.style ?? {}) }}
            ref={props.innerRef}
        >
            {props.title && (
                <Panel.TitleBar
                    draggable={props.draggable}
                    // windowshade={props.windowshade ? onWindowshade : undefined}
                >
                    {props.title}
                </Panel.TitleBar>
            )}
            {open && props.children}
        </section>
    )
}

export function PanelTitleBar(props: {
    draggable?: boolean
    children: ReactNode
}) {
    return (
        <header
            className={props.draggable ? 'drag-handle' : ''}
            style={{
                backgroundColor: 'black',
                color: 'white',
                cursor: 'pointer',
                userSelect: 'none',
            }}
        >
            <h1 style={{ margin: '0', padding: '0.333rem' }}>
                {props.children}
            </h1>
        </header>
    )
}
Panel.TitleBar = PanelTitleBar

export function Toolbar(props: PropsWithChildren) {
    // TODO: selected tool is specific to layer type:
    // 1. user selects a tile layer
    // 2. user selects the Draw tool
    // 3. user selects an Object layer
    // 4. user selects the Create tool
    // 5. user selects a tile layer again
    // 6. Draw tool is automatically selected
    return (
        <Panel draggable title="Tools">
            {props.children}
        </Panel>
    )
}

export function LayerBox(props: unknown) {
    const update = useDesignerUpdate()
    const { openResources, activeResource } = useAll()

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
    const update = useDesignerUpdate()
    const resource = useDesignerState((state) => state.activeResource)
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
            return useDesignerState((st) => st.activeResource?.type) === type
        },
    },

    // activeResourceType: () => {},
    // (st: DesignerStateType) =>
}

type ToolID = 'select' | 'marquee' | 'draw' | 'line'

function ToolButton(
    props: PropsWithChildren<{ id: ToolID; disabled?: boolean }>,
) {
    const tool = useDesignerState(
        // @ts-expect-error: maybe we make NONE a key?
        (st) => st.currentTool[st.activeResource?.type],
    )
    const update = useDesignerUpdate()

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
    // const currentLayerType = useDesignerState((d) => d.currentLayer?.type)
    // const currentLayer = useDesignerState((d) => d.currentLayer)
    return <ToolButton id="marquee">Marquee</ToolButton>
}

export function DrawTool(props: unknown) {
    // const currentLayer } = useDesignerState()

    // const currentLayerType = useDesignerState((d) => d.currentLayer?.type)
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

function validate(state: DesignerStateType) {
    const labels = state.openResources.map((n) => n.label)
    const uniqLabels = new Set(labels)
    invariant(
        labels.length === uniqLabels.size,
        "Isn't it time we came up with a unique ID system",
    )
}
