import { Section, SectionCard } from '@blueprintjs/core'
import { CSSProperties, PropsWithChildren } from 'react'

// export function Card(props: PropsWithChildren) {
// return <div className='bg-blue-200 rounded'>{props.children}</div>
// }

interface CarteProps {
    title?: string
    lofted?: boolean
    wholeHeight?: boolean
    // style?: CSSProperties
}

export function Carte(props: PropsWithChildren<CarteProps>) {
    // const extraStyle = props.wholeHeight ? {
    //     "100%"
    // } : {}
    return (
        <Section
            title={props.title}
            compact
            elevation={1}
            className={props.wholeHeight ? 'card-whole-height' : ''}
            style={{

                // height: props.wholeHeight ? '100%' : undefined,
            }}
        >
            <SectionCard
                style={{
                    // flexGrow: props.wholeHeight ? 1 : undefined,
                    // overflow: props.wholeHeight ? 'hidden' : 'hidden scroll',
                }}
            >
                {props.children}
            </SectionCard>
        </Section>
    )
}
