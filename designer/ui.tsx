import {
    ChangeEvent,
    JSXElementConstructor,
    MutableRefObject,
    PropsWithChildren,
    StrictMode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Matrix3 } from 'three'

import { rect } from 'gamebucket'
import invariant from 'tiny-invariant'

/** Metadata for resources that can be edited as map layers */
type MapResource = TileMapResource | ContinuousMapResource | ObjectListResource

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

export default class DesignerUI {
    createdAt = performance.now()
    resourcesToOpen: MapResource[] = []

    openResources = (res: MapResource[]) => {
        this.resourcesToOpen = res
    }
    viewportCanvas: MutableRefObject<HTMLCanvasElement | null> = {
        current: null,
    }

    private root: Root | undefined

    constructor(
        public readonly domElement: HTMLElement,
        private readonly app: JSXElementConstructor<{}>,
    ) {
        this.root = this.mount()
    }

    mount() {
        invariant(!this.root, 'Already mounted')
        const root = createRoot(this.domElement)
        console.warn('Here we go!', root)
        root.render(
            <StrictMode>
                <AppWrapper liaison={this}>
                    <this.app />
                </AppWrapper>
            </StrictMode>,
        )
        return root
    }

    unmount() {
        invariant(this.root, 'App not mounted')

        this.root.unmount()
        this.root = undefined
    }
}
export function useDesignerState() {
    return useContext(DesignerContext)
}

interface DesignerState {
    openResources: MapResource[]
    currentLayer: MapResource | undefined
    selectedLayer: string | undefined
    selectLayer: (label: string) => void
    viewportCanvas: MutableRefObject<HTMLCanvasElement | null>
}

const DesignerContext = createContext<DesignerState>({} as DesignerState)

function AppWrapper(props: PropsWithChildren<{ liaison: DesignerUI }>) {
    const { liaison, children } = props
    const [openResources, setOpenResources] = useState<MapResource[]>(
        liaison.resourcesToOpen,
    )
    const [selectedLayer, selectLayer] = useState<string>(
        openResources[0]?.label,
    )
    const viewportCanvas = useRef<HTMLCanvasElement | null>(null)
    liaison.viewportCanvas = viewportCanvas

    useEffect(() => {
        console.warn('We are done I guess!', liaison)
        return () => {
            console.warn('tearin down', liaison)
        }
    }, [liaison])

    liaison.openResources = (r: MapResource[]) => {
        setOpenResources(r)
    }

    const context = {
        openResources,
        selectedLayer,
        selectLayer,
        currentLayer: openResources.find((res) => res.label === selectedLayer),
        viewportCanvas,
    }

    return (
        <DesignerContext.Provider value={context}>
            {children}
        </DesignerContext.Provider>
    )
}

/*
function Viewport(props: unknown) {
    return (
        <section>
            <h1>Viewport</h1>
            <canvas style={{ background: 'black' }}></canvas>
        </section>
    )
}
*/

const defaultPanelProps: React.CSSProperties = {
    border: '1px dashed black',
}

export function Panel(
    props: PropsWithChildren<{ style?: React.CSSProperties }>,
) {
    return (
        <section style={{ ...defaultPanelProps, ...(props.style ?? {}) }}>
            {props.children}
        </section>
    )
}

export function Toolbar(props: PropsWithChildren) {
    // TODO: selected tool is specific to layer type:
    // 1. user selects a tile layer
    // 2. user selects the Draw tool
    // 3. user selects an Object layer
    // 4. user selects the Create tool
    // 5. user selects a tile layer again
    // 6. Draw tool is automatically selected
    return (
        <Panel>
            <header>
                <h1>Tools</h1>
            </header>
            {props.children}
        </Panel>
    )
}

export function LayerBox(props: unknown) {
    const { openResources } = useDesignerState()

    const { selectLayer, selectedLayer } = useDesignerState()

    const onOptionChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
        // console.log('eeebo!', ev)
        selectLayer(ev.target.value)
    }, [])

    return (
        <Panel>
            <h1>Layers</h1>
            {openResources.map((res) => (
                <div key={res.label}>
                    <input
                        type="radio"
                        name="layer"
                        value={res.label}
                        id={`layer-box-${res.label}`}
                        checked={selectedLayer === res.label}
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
    icon: undefined
    // src for an image of the thing, intended to be displayed as large as reasonable
    img: string
    // name of the thing, for tooltip
    label?: string
}

interface PaletteEntryIcon {
    // src for an icon used to represent the thing
    icon: string
    img: undefined
    // name of the thing, for tooltip
    label?: string
}

interface PaletteEntryText {
    icon: undefined
    img: undefined
    label: string
}

/** Display a selection of possible  */
export function PaletteBox(props: {
    choices: PaletteEntryImage[] | PaletteEntryIcon[] | PaletteEntryText[]
}) {
    // TODO: real keys
    return (
        <Panel>
            <header>
                <h1>Palette</h1>
            </header>
            {props.choices.map((res, idx) => (
                <div key={idx}>
                    <input
                        type="radio"
                        name="palette"
                        value={res.label}
                        id={`palette-box-${res.label}`}
                        // checked={selectedLayer === res.label}
                        // checked={topping === 'Regular'}
                        // onChange={onOptionChange}
                    />
                    <label htmlFor={`palette-box-${res.label}`}>
                        {res.label}
                    </label>
                </div>
            ))}
        </Panel>
    )
}

export function SelectTool(props: unknown) {
    const { currentLayer } = useDesignerState()
    const enabled = currentLayer?.type === 'object_list'
    return <button disabled={!enabled}>Select</button>
}

export function MarqueeTool() {
    const { currentLayer } = useDesignerState()
    return <button>Marquee</button>
}

export function DrawTool(props: unknown) {
    const { currentLayer } = useDesignerState()

    const enabled = currentLayer?.type === 'tile_map'
    return <button disabled={!enabled}>Draw</button>
}

export function LineTool(props: unknown) {
    return <button>Line</button>
}

export function FileMenu(props: unknown) {
    return <button>File...</button>
}
