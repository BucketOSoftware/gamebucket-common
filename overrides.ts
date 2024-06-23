import merge from 'lodash-es/merge'

/**
 * Takes a nested object and returns a version that tracks all modifications as
 * overrides, optionally using LocalStorage to load and save any overrides.
 *
 * @todo Turn the original object into compile-time constants for a production build
 *
 * @param defaults a (potentially nested) object we want to track
 * @param options.mutationCallback if provided, will be called immediately after any changes
 * @param options.localStorageKey if provided, overrides will be saved to localStorage under this key
 * @param options.strict Only set overrides for properties that exist in the defaults
 */
export function persistentOverrides<T extends object>(
    defaults: T,
    options: {
        mutationCallback?: () => void
        localStorageKey?: string
        strict?: boolean
    } = {}
): T {
    const mutationCallback = options.mutationCallback ?? (() => undefined)
    const { strict, localStorageKey } = options

    const constantsHandler: ProxyHandler<{
        [k: string | number | symbol]: any
    }> = {
        get(target, key) {
            if (target.hasOwnProperty(key)) {
                // this has been set
                return target[key]
            }

            // we don't have it, but maybe it's in the prototype
            if (key in target) {
                const protoValue = target[key]
                if (typeof protoValue === 'object') {
                    // Don't just return the object because we don't want the user to overwrite defaults!
                    target[key] = new Proxy(
                        Object.create(protoValue),
                        constantsHandler
                    )
                    return target[key]
                }
                return protoValue
            }

            return undefined
        },
        set(target, key, value) {
            // console.debug('Setting', target, `.${String(key)} to equal`, value);
            // TODO: should this fail?
            if (!(key in target)) {
                if (strict) {
                    console.error(
                        "Setting a key that doesn't exist on the defaults: ",
                        key
                    )
                    return false
                }

                console.warn(
                    "Setting a key that doesn't exist on the defaults: ",
                    key
                )
            }
            target[key] = value
            saveToLocalStorage()
            mutationCallback()

            return true
        },
        // Deleting a property effectively resets it to default (along with everything beneath it if it's an object)
        deleteProperty(target, key) {
            if (target.hasOwnProperty(key)) {
                delete target[key]
                saveToLocalStorage()
                mutationCallback()
                return true
            }
            return false
        },
        ownKeys(target) {
            return Object.keys(target)
        },
    } as const

    // TODO: the idle-callback approach means that if the user changes something
    // and immediately reloads the page it may not be saved. Is that a problem?
    // Can we work around it?
    let saveCallbackHandle: number | undefined
    const saveToLocalStorage = () => {
        if (saveCallbackHandle || !localStorageKey) {
            // if there's a handle, there's no need to request another callback
            // if there's no storage key, don't save anything
            return
        }

        // console.time('saveWait')
        saveCallbackHandle = requestIdleCallback(
            () => {
                // console.timeEnd('saveWait')
                saveCallbackHandle = undefined

                const serialized = JSON.stringify(cvars)
                // TODO: is it bad if we save the constants we just loaded?
                console.debug('Saving cvar overrides:', serialized)
                localStorage.setItem(localStorageKey, serialized)
            },
            { timeout: 1000 }
        )
    }

    function loadConstantOverrides(obj: T, key?: string) {
        if (!key) {
            return
        }

        const serialized = localStorage.getItem(key)!
        let parsed
        try {
            parsed = JSON.parse(serialized)
        } catch (e) {
            console.warn("Couldn't parse serialized overrides:", serialized, e)
            // bail
            return
        }

        console.debug('Loading overrides:', parsed)

        merge(obj, parsed)
    }

    // TODO: maybe load before we add the proxy
    let cvars: T = new Proxy(Object.create(defaults), constantsHandler)
    loadConstantOverrides(cvars, localStorageKey)

    return cvars
}
