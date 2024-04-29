import { Section, SectionCard } from '@blueprintjs/core'
import { CSSProperties, PropsWithChildren } from 'react'

// export function Card(props: PropsWithChildren) {
// return <div className='bg-blue-200 rounded'>{props.children}</div>
// }

interface CarteProps {
    title?: string
    lofted?: boolean
    wholeHeight?: boolean
    stacking?: boolean
    // style?: CSSProperties
}
import classes from 'classnames'

export function Carte(props: PropsWithChildren<CarteProps>) {
    const klass = classes({
        'card-whole-height': props.wholeHeight,
        'card-stacking-context': props.stacking,
    })

    return (
        <Section title={props.title} compact elevation={1} className={klass}>
            <SectionCard>{props.children}</SectionCard>
        </Section>
    )
}
