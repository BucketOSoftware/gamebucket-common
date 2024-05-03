import classnames from 'classnames'
import {
    PropsWithChildren,
    ReactNode,
    StrictMode,
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

import { type Rect } from '../rect'
import { GestureState, useGesture } from './gestures'
import { Liaison, LiaisonProvider } from './liaison'
import { ElementID, store } from './state'

import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import 'normalize.css'

import './ui.css'
import { Clone } from '@sinclair/typebox'
import { DragConfig } from '@use-gesture/react'

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

const movableElementConfig: DragConfig = {
    preventDefault: true,
    from: [0, 0], // for .offset
}
/** Represent an entity as a draggable widget */
export function MovableElement({
    id,
    position: [x, y],
    source: [sx, sy],
    onMove,
    onSelect,
}: MovableElementProps) {
    const ref = useRef<HTMLDivElement>(null)

    const [dx, setDx] = useState(0)
    const [dy, setDy] = useState(0)

    const isDragging = dx || dy

    const onDrag = useCallback(
        (state: GestureState<'drag'>) => {
            // prevent the marquee box or whatever
            state.event.stopPropagation()

            if (onSelect && state.tap) {
                onSelect(id)
            } else if (onMove && state.intentional) {
                const offset = state.movement
                if (
                    true
                ) {
                    if (state.last) {
                        onMove(id, [offset[0], offset[1]])
                        setDx(0)
                        setDy(0)
                        // setDragOffset([0, 0])
                    } else {
                        setDx(offset[0])
                        setDy(offset[1])
                    }
                }
            }
        },
        [id, onSelect, onMove, setDx, setDy],
    )

    useGesture(
        { onDrag },
        {
            target: ref,
            eventOptions: { passive: false, capture: false },

            drag: movableElementConfig,
        },
    )

    const transform = useMemo(
        () => `translate(${dx + x}px, ${dy + y}px)`,
        [x, y, dx, dy],
    )
    return (
        <div
            ref={ref}
            className={classnames('gbk-viewport-entity', {
                'gbk-viewport-entity-movable': onMove,
                'gbk-viewport-entity-moving': isDragging,
            })}
            style={{
                transform,
                left: 0,
                top: 0,
                backgroundPositionX: -sx,
                backgroundPositionY: -sy,
            }}
        />
    )
}
