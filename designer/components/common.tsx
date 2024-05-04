import { Section, SectionCard } from '@blueprintjs/core'
import { PropsWithChildren } from 'react'

interface CarteProps {
    className?: string
    title?: string
    lofted?: boolean
    wholeHeight?: boolean
    stacking?: boolean
}

import classes from 'classnames'

export function Carte(props: PropsWithChildren<CarteProps>) {
    const klass = classes(props.className, {
        'card-whole-height': props.wholeHeight,
        'card-stacking-context': props.stacking,
    })

    return (
        <Section title={props.title} compact elevation={1} className={klass}>
            <SectionCard>{props.children}</SectionCard>
        </Section>
    )
}
