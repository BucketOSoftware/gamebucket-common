import { useEffect, useRef } from 'react'

export function useObserve<T>(callback: () => void, key: T, observed: any[]) {
    const oldKey = useRef<T>()

    useEffect(() => {
        if (oldKey.current !== key) {
            oldKey.current = key
            return
        }

        callback()
    }, observed)
}
