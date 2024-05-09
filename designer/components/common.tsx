import { PropsWithChildren } from 'react'
import classnames from 'classnames'

interface CarteProps {
    className?: string
    title?: string
    lofted?: boolean
    wholeHeight?: boolean
    stacking?: boolean
}

export function Carte(props: PropsWithChildren<CarteProps>) {
    return props.children
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


export function ButtonGroup({children}:PropsWithChildren) {
    return <div className="btn-group">{children}</div>
}