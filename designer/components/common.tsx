import { PropsWithChildren } from 'react'
import classnames from 'classnames'

import * as rect from '../../rect'

export function Window({ children }: PropsWithChildren) {
    return <div className="window gbk-columns">{children}</div>
}

Window.Panes = ({ children }: PropsWithChildren) => {
    return (
        <div className="window-content">
            <div className="pane-group">{children}</div>
        </div>
    )
}

Window.Header = ({
    children,
    title,
}: PropsWithChildren<{ title?: string }>) => (
    <header className="toolbar toolbar-header">
        {title && <h1 className="title">{title}</h1>}
        {children && <div className="toolbar-actions">{children}</div>}
    </header>
)

export function MainColumn({ children }: PropsWithChildren) {
    return (
        <main className="pane">
            <section className="padded" style={{ height: '100%' }}>
                {children}
            </section>
        </main>
    )
}

export function Sidebar({ children }: PropsWithChildren) {
    return <aside className="pane pane-sm sidebar padded">{children}</aside>
}

export function NavGroup({
    children,
    title,
}: PropsWithChildren<{ title: string }>) {
    return (
        <nav className="nav-group">
            <h5
                className="nav-group-title"
                style={{ textTransform: 'capitalize' }}
            >
                {title}
            </h5>
            {children}
        </nav>
    )
}

export function NavGroupItem({
    active,
    children,
    onClick,
}: PropsWithChildren<{ active?: boolean; onClick: () => void }>) {
    return (
        <a
            onClick={onClick}
            className={classnames('nav-group-item', { active: active })}
        >
            {children}
        </a>
    )
}

export function ButtonGroup({ children }: PropsWithChildren) {
    return <div className="btn-group">{children}</div>
}

export function MarchingAnts(props: rect.Rect) {
    return (
        <svg
            style={{
                left: props.x,
                top: props.y,
                width: props.width,
                height: props.height,
            }}
            className="marching-ants"
            viewBox="0 0 40 40"
            // prevents the scaling from applying to the rect
            preserveAspectRatio="none"
        >
            <rect width="40" height="40" />
        </svg>
    )
}

export function Highlight(props: rect.Rect & { padding?: number }) {
    const padding = props.padding ?? 3

    return (
        <div
            className="gbk-hover-target"
            style={{
                left: props.x - padding,
                top: props.y - padding,
                width: props.width + padding * 2,
                height: props.height + padding * 2,
            }}
        />
    )
}

type ButtonProps = React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
>

export function Button(props: {
    label?: string
    icon?: string
    disabled?: boolean
    active?: boolean
    onClick: ButtonProps['onClick']
}) {
    const { label, icon, disabled, active, onClick } = props

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            type="button"
            className={classnames('btn', 'btn-default', {
                active,
                ['btn-disabled']: props.disabled,
            })}
        >
            <span className={'icon ' + icon} />
            &nbsp;
            {label}
        </button>
    )
}
