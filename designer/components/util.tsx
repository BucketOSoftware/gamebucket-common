import { PropsWithChildren, useEffect } from 'react'

export function LeaveMeAlone(p: PropsWithChildren) {
    useEffect(() => {}, [])

    return <>{p.children}</>
}
