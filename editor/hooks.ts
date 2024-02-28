import { useEffect, useRef } from 'preact/hooks'

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
