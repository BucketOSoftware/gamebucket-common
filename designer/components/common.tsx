import { Section, SectionCard } from '@blueprintjs/core'
import { PropsWithChildren } from 'react'

// export function Card(props: PropsWithChildren) {
// return <div className='bg-blue-200 rounded'>{props.children}</div>
// }

interface CarteProps {
    title?: string
    lofted?: boolean
}

export function Carte(props: PropsWithChildren<CarteProps>) {
    return (
        <Section title={props.title} compact elevation={1}>
            <SectionCard>{props.children}</SectionCard>
        </Section>
    )
}
