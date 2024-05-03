import classnames from 'classnames'
import {
    PropsWithChildren,
    ReactNode,
    StrictMode,
    useCallback,
    useMemo,
    useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { GestureState, useDrag } from './gestures'

import { Liaison, LiaisonProvider } from './liaison'
import { ElementID, store } from './state'

import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import 'normalize.css'

import './ui.css'

export function createApp(domElement: HTMLElement, App: ReactNode) {
    const liaison = new Liaison()
    const root = createRoot(domElement)
    root.render(
        <StrictMode>
            <Provider store={store}>
                <LiaisonProvider liaison={liaison}>{App}</LiaisonProvider>
            </Provider>
        </StrictMode>,
    )

    return [
        liaison,
        () => {
            root.unmount()
        },
    ] as const
}

export function ColumnGroup({ children }: PropsWithChildren) {
    return (
        <PanelGroup direction="horizontal" className="columns">
            {children}
        </PanelGroup>
    )
}

export function ResizeHandle() {
    return <PanelResizeHandle className="resize-handle" />
}

export function Column({ children }: PropsWithChildren) {
    return <Panel className="resizable-column">{children}</Panel>
}

export function Sidebar({ children }: PropsWithChildren) {
    return (
        <Panel
            className="resizable-column"
            style={{ overflow: 'hidden auto' }}
            defaultSize={30}
            minSize={20}
            maxSize={50}
        >
            <section className="column">{children}</section>
        </Panel>
    )
}

interface MovableElementProps {
    /** Arbitrary unique ID */
    id: ElementID<string>
    /** Pixel position */
    position: [number, number]
    /** Top-left of the part of the image to use. (size is dictated by CSS) */
    source: [number, number, ...number[]]
    /** Called when the user wants to move the element by this many viewport pixels */
    onMove?: (id: string, movement: [number, number]) => void
    /** Called when the user taps the entity */
    onSelect?: (id: string) => void
    /** @todo */
    properties: any
}

const MIN_DRAG_DISTANCE = 32
/** Represent an entity as a draggable widget */
export function MovableElement({
    id,
    position: [x, y],
    source: [sx, sy],
    onMove,
    onSelect,
}: MovableElementProps) {
    const [dragOffset, setDragOffset] = useState<[number, number]>([0, 0])

    const dragHandler = useCallback(
        (state: GestureState<'drag'>) => {
            if (onSelect && state.tap) {
                onSelect(id)
            } else if (
                onMove &&
                state.distance[0] > MIN_DRAG_DISTANCE &&
                state.distance[1] > MIN_DRAG_DISTANCE
            ) {
                if (state.last) {
                    onMove(id, state.offset)
                    setDragOffset([0, 0])
                } else {
                    setDragOffset([...state.offset])
                }
            }
        },
        [id, onSelect, onMove, setDragOffset],
    )

    const dragAttrs = useDrag(dragHandler)()
    const transform = useMemo(
        () => `translate(${dragOffset[0]}px, ${dragOffset[1]}px)`,
        [dragOffset[0], dragOffset[1]],
    )

    return (
        <div
            {...dragAttrs}
            className={classnames('gbk-viewport-entity', {
                'gbk-viewport-entity-movable': onMove,
            })}
            key={id}
            style={{
                transform,
                left: x,
                top: y,
                backgroundPositionX: -sx,
                backgroundPositionY: -sy,
            }}
        />
    )
}
