declare global {
    interface Window {
        watch?: (path: string, options?: ChartOptions) => Chart<any>
    }
}

import Color from 'color'
import { capitalize, get, set } from 'lodash-es'
import ow from 'ow'

import './smashboard/smashboard.css'
import html from './smashboard/smashboard.html?raw'
import { CommandHandler, ConsoleController } from './smashboard/console-controller'

import { Chart } from './smashboard/chart'
import { ColorScheme } from './smashboard/color-scheme'

export type InstrumentationTypes = number
export type MapStateToInstrument<GS> = (state: GS) => InstrumentationTypes

export interface ChartOptions {
    min?: number;
    max?: number;
    verticalSections?: number;
}

export interface RuntimeWatch {
    path: string
}


////////

const INITIAL_SETTINGS = {
    visible: false,
    colorScheme: 'default',
    runtimeWatches: [] as RuntimeWatch[]
}


export default class Smashboard<STATE, CVARS extends Object = {}> {
    colorSchemes: Record<string, ColorScheme> = {
        default: new ColorScheme([
            Color.rgb(0, 0, 192),
            Color.rgb(0, 255, 0),
            Color.rgb(255, 0, 0),
            Color.rgb(0, 0, 255)
        ])
    }

    /** When hiding the dashboard, focus this element */
    focusOnHide?: HTMLElement

    private readonly settings = INITIAL_SETTINGS
    private readonly charts: Record<string, Chart<STATE>> = {}

    /// DOM bookmarks
    /** Calling it "console" is asking for autocomplete trouble */
    private sole: ConsoleController<STATE, CVARS>

    /**
     * @param container The DOM element to display the dashboard in
     * @param constants Reference to an object holding the game's global "constants", i.e. settings that would be inlined in a shipping build but could be changed at runtime during development. @todo We should warn if any of the keys have a . in them because we/lodash assume they don't
     * @param storagePrefix 
     */
    constructor(
        private container: HTMLElement,
        public readonly constants: CVARS,
        private readonly storagePrefix = 'smashboard'
    ) {
        // Set up the markup
        container.classList.add('smashboard')
        container.innerHTML = html


        this.sole = new ConsoleController(
            container.querySelector<HTMLElement>('section.console-section')!,
            this
        )
        if (window.watch) {
            console.warn('Smashboard: watch() already exists globally, overwriting', window.watch)
        }
        window.watch = this.watch.bind(this)


    }

    init() {
        const { container } = this


        this.restoreSettings()
        this.updateSettings()

        this.sole.init()
        this.addDefaultHandlers()

        this.attachEvents(container)
    }

    private attachEvents(container: HTMLElement) {
        // Listen for the keys to open the panel
        // TODO: probably just let the user figure this out and call a function on us
        let held: Record<string, boolean> = {}
        document.addEventListener('keydown', (ev: KeyboardEvent) => {
            if (!['ShiftLeft', 'ShiftRight', 'Backquote'].includes(ev.code)) {
                return
            }

            // console.log("Document got", ev.code)
            held[ev.code] = true
            if (held.ShiftLeft && held.ShiftRight) {
                // Show or hide all developer stuff
                ev.preventDefault()

                if (!this.settings.visible) {
                    // Going to show the console, so focus the input field
                    this.sole.focusInput()
                }
                this.setVisible(!this.settings.visible)
                held = {}
            }
        })

        document.addEventListener('focusout', (ev: FocusEvent) => {
            console.debug("Smashboard: lost focus, releasing keys")
            held = {}
        })

        // TODO: detect loss of focus, but also, maybe find a library for this
        document.addEventListener('keyup', (ev: KeyboardEvent) => {
            held[ev.code] = false
        })
    }

    setVisible(visible: boolean) {
        this.settings.visible = visible
        this.updateSettings()
        this.saveSettings()
    }


    /** 
     * #region Color scheme/theme
     */

    setColorSchemeByName(scheme: string) {
        if (scheme in this.colorSchemes) {
            this.settings.colorScheme = scheme
            this.updateSettings()
            this.saveSettings()
            return
        }

        throw new Error("No color scheme named " + scheme)
    }

    get colors() {
        return this.colorSchemes[this.settings.colorScheme ?? 'default']
    }

    /** Set the dashboard's CSS variables from a color scheme
     * @todo Might as well have fallbacks / a true default for undefined colors
     */
    private setColorScheme(scheme: ColorScheme) {
        const { container: root } = this

        for (let [id, chart] of Object.entries(this.charts)) {
            if (scheme.graphBackground) {
                chart.backgroundColor = scheme.graphBackground
            }

            if (scheme.graphSeries) {
                chart.seriesColors = scheme.graphSeries
            }
        }

        if (scheme.consoleText) {
            root.style.setProperty('--smashboard-console-text-color', scheme.consoleText.string())

            // will this work? we may have to play with this threshold
            root.classList.remove('color-crt', 'mono-crt')
            if (scheme.consoleText.saturationv() < 10) {
                root.classList.add('mono-crt')
            } else {
                root.classList.add('color-crt')
            }
        }

        if (scheme.consoleBackground) {
            root.style.setProperty('--smashboard-console-background', scheme.consoleBackground.string())
        }

        if (scheme.shadow) {
            root.style.setProperty('--smashboard-shadow-color', scheme.shadow.string())
        }
    }

    showSwatches(scheme: ColorScheme, which?: keyof ColorScheme) {
        const swatchBox = document.createElement('span')
        swatchBox.className = 'swatches'

        let colorsMaybe = which ? scheme[which] : scheme.colors
        const colors = (Array.isArray(colorsMaybe) ? colorsMaybe : [colorsMaybe]) as Color[]

        scheme.makeSwatches(colors).forEach(c => {
            swatchBox.appendChild(c)
        })
        this.container.appendChild(swatchBox)
    }

    /**
     * #region settings
     */
    restoreSettings() {
        const serialized = localStorage.getItem(this.storagePrefix + '-settings')

        if (!serialized) {
            return // nothing to load
        }

        try {
            const savedSettings = JSON.parse(serialized)
            console.debug('Smashboard: loading settings', serialized)
            /** @todo find a way to filter this object so when the code changes, old/unused settings get culled from localStorage */
            /** @todo do a full/recursive merge if we end up nesting things */
            Object.assign(this.settings, savedSettings)
        } catch (e) {
            console.warn("Smashboard: Couldn't restore settings: ", serialized, e)
            localStorage.removeItem(this.storagePrefix + '-settings')
            return
        }

        this.updateSettings()
    }

    /**
     * Set the dashboard as per the current settings 
     * @todo check what's actually changed
     */
    private updateSettings(): void {
        const { visible, colorScheme, runtimeWatches = [] } = this.settings

        const klasses = this.container.classList
        // TODO: only do the non-idempotent stuff if the visibility has actually changed
        klasses.remove('hidden', 'visible')
        if (visible) {
            klasses.add('visible')
        } else {
            klasses.add('hidden')
            this.focusOnHide?.focus()
        }

        if (colorScheme) {
            const schemeFetched = this.colorSchemes[colorScheme]
            if (schemeFetched) {
                this.setColorScheme(schemeFetched)
            } else {
                console.warn("No color scheme named", colorScheme)
                return
            }
        }

        runtimeWatches.forEach((watchConfig) => {
            this.watch(watchConfig.path)
        })
    }

    private saveSettings() {
        /** @todo debounce maybe */

        localStorage.setItem(this.storagePrefix + '-settings', JSON.stringify(this.settings))
    }


    /** 
     * Update instruments etc.
     * @todo Throttle this
     * 
     * @param state State that will be used to update instruments
     */
    update(state: STATE) {
        const timestamp = Date.now()

        this.updateCharts(timestamp, state)
    }

    refreshConsoleVars() {
        console.debug('Smashboard: refreshing constants')
        this.sole.refresh()
    }

    private updateCharts(timestamp: number, state: STATE) {
        const { charts } = this

        // Add data to charts
        for (let id in charts) {
            const chart = charts[id]
            const { series } = chart

            if (chart.dataSources[0] === 'manual') {
                // TODO: kind of silly
                continue;
            }

            let value: number | undefined
            try {
                value = chart.retrieveData(state)
            } catch (e) {
                console.warn("Couldn't get data for chart, disabling:", id, value, e)
            }

            switch (typeof value) {
                case 'undefined':
                    // gray out the chart BG?
                    chart.setNoData(true)
                    break
                case 'number':
                    chart.setNoData(false)
                    series[0].append(timestamp, value)
                    break
                default:
                    // TODO: display error state but keep chart
                    console.warn('Chart returned a non-number, disabling:', id, value)
                    this.removeChart(id)
            }
        }

    }

    /**
     * #region Console
     */

    private addDefaultHandlers() {
        const { sole } = this

        this.consoleCommands.forEach(([aliases, submitHandler, typeHandler]) => {
            if (typeof aliases === 'string') {
                aliases = [aliases]
            }
            ow(aliases, ow.array.minLength(1))
            aliases.forEach(a => sole.addCommandHandler(a, submitHandler, typeHandler))
        })
    }


    /** 
     * #region Cvars
    */


    /*
     * #region Charts
     */

    /**
     * @todo Allow the path to reference arrays and chart one series for each array element
     * 
     * @param path 
     * @returns 
     */
    private watch(path: string) {
        const existing = this.charts[path]
        if (existing) {
            console.warn("Already a watch for this path, ignoring. But what if there's a new config?", path)
            return existing
        }

        // Technically any string can be a key in a JS object, so we don't
        // validate the path at all (although I guess we don't allow . in keys)
        const keys = path.split('.')
        // TODO: what about options that can only be set when creating the chart? Are there any? How do we change them later
        const chart = new Chart<STATE>(
            capitalize(keys.at(-1)!),
            { verticalSections: 2 },
            this.colors.graphSeries,
            this.colors.graphBackground,
        )
        chart.dataSources = [keys]
        chart.runtimeWatchConfig = { path }

        // Add or update the record in the serializable settings
        this.settings.runtimeWatches ||= []
        let watchRecord = this.settings.runtimeWatches.find(w => w.path === path)
        if (watchRecord) {
            // console.warn("TODO: update?")
        } else {
            console.debug("Saving watch:", chart.runtimeWatchConfig)
            this.settings.runtimeWatches.push(chart.runtimeWatchConfig)
            this.saveSettings()
        }
        this.appendChart(path, chart)
        // TODO: add methods on chart so a console user can customize
        return chart
    }

    /*
     * @todo Allow watching strings etc. Need to figure out how to usefully display them. Do we include any history? Lowpass filter?
     */
    private watchWithCallback(label: string, callback: MapStateToInstrument<STATE>, dataOptions: ChartOptions = {}) {
        if (this.charts[label]) {
            console.warn("Overriding chart for", label)
            this.removeChart(label)
        }

        // TODO: call the callback right now and note the return type

        // TODO: this breaks if the color scheme isn't valid
        const chart = new Chart<STATE>(
            label,
            dataOptions,
            this.colors.graphSeries,
            this.colors.graphBackground
        )
        chart.dataSources = [callback]

        return this.appendChart(label, chart)
    }


    /**
     * Create and/or update a chart
     * @todo Support placing fixed horizontal lines
     *
     * @param timestamp
     * @param label
     * @param value
     * @param options
     * @returns
     */
    chartManual(timestamp: number, label: string, value: number, options: ChartOptions = {}) {
        let chart = this.charts[label]

        if (!chart) {
            chart = new Chart(
                label,
                options,
                this.colors.graphSeries,
                this.colors.graphBackground
            )
            chart.dataSources = ['manual']
            this.appendChart(label, chart)
        }

        chart.setNoData(value === undefined)
        chart.series[0].append(timestamp, value);
        return chart
    }

    // watch one path
    chart(path: string, options?: ChartOptions): Chart<STATE>;
    // watch result of a callback
    chart(label: string, callback: MapStateToInstrument<STATE>, options?: ChartOptions): Chart<STATE>;
    // manually add data
    chart(label: string, value: number, timestamp: number, options?: ChartOptions): Chart<STATE>;
    chart(labelOrPath: string,
        b?: ChartOptions | number | MapStateToInstrument<STATE>,
        c?: ChartOptions | number,
        d?: ChartOptions
    ): Chart<STATE> {

        switch (typeof b) {
            case 'undefined':
            case 'object': {
                // TODO: accept options
                return this.watch(labelOrPath)//, valueOrCallbackOrOptions)
            }
            case 'function': {
                if (typeof c === 'number') {
                    break
                }
                const label = labelOrPath
                const callback = b
                const options = c
                return this.watchWithCallback(label, callback, options)
            }
            case 'number': {
                const label = labelOrPath
                const value = b
                const timestamp = c as number
                const options = d
                // return this.chartManual(optionsOrTimestamp as number, labelOrPath, valueOrCallbackOrOptions, manualOptions)
                return this.chartManual(timestamp, label, value, options)
            }

        }
        throw new Error("WHAT?!")
    }

    private appendChart(id: string, chart: Chart<STATE>) {
        const { charts, container } = this

        charts[id] = chart
        container.querySelector('.charts-section')!.appendChild(chart.domElement)
        chart.domElement.addEventListener('click', this.handleChartClick)
        chart.domElement.addEventListener('contextmenu', this.handleChartClick)

        return chart
    }

    private removeChart(id: string) {
        if (this.charts[id]) {
            const ch = this.charts[id]
            ch.domElement.remove()
            ch.chart.stop()
            delete this.charts[id]

            ch.domElement.removeEventListener('click', this.handleChartClick)
            ch.domElement.removeEventListener('dblclick', this.handleChartClick)
            ch.domElement.removeEventListener('contextmenu', this.handleChartClick)

            console.debug("Removing chart:", id)
        } else {
            console.warn("No chart to remove:", id)
        }

        // Filter it out of the saved watches if needed
        this.settings.runtimeWatches = (this.settings.runtimeWatches || []).filter(w => w.path !== id)
        this.saveSettings()
    }

    private handleChartClick = (ev: PointerEvent | MouseEvent) => {
        ow(ev.target, ow.object.instanceOf(HTMLCanvasElement))
        const canvas = ev.target

        // TODO: fuck. find a way to resize the chart if we want. Smoothie seems to stomp on it

        if (ev.type === 'contextmenu') {
            const [id, chart] = Object.entries(this.charts).find(([_, chart]) => chart.domElement === canvas)!
            ow(chart, ow.object)

            // We don't want to remove 
            if (chart.runtimeWatchConfig) {
                this.removeChart(id)
                ev.preventDefault()
            }
        }
    }


    private readonly consoleCommands: [
        aliasese: string | string[],
        onCommit?: CommandHandler<STATE, CVARS>,
        onType?: CommandHandler<STATE, CVARS>
    ][] =
        [
            // Set color scheme
            [
                ['color', 'theme'],
                (c, cmd, scheme = '') => {
                    c.dashboard.setColorSchemeByName(scheme.toLowerCase())
                    return c.info(`Color scheme set to ${scheme}`)
                },
                (c) => {
                    return "Available color schemes: " + Object.keys(c.dashboard.colorSchemes).join(', ')
                }
            ],
            // Set a cvar
            [
                ['set', 'cv'],
                (c, _cmd, path, value) => {
                    let newValue: string | number = value
                    // TODO: more types
                    const existingType = typeof get(c.cvars, path)
                    switch (existingType) {
                        case 'number':
                            newValue = Number.parseFloat(newValue)
                            if (Number.isNaN(newValue)) {
                                return c.error("Couldn't parse number:", value)
                            }
                            break
                        case 'string':
                            break
                        default:
                            return c.error("Can't set a value of type", existingType)
                    }
                    set(c.cvars, path, newValue)
                },
                (c, _cmd, name, _value) => {
                    return findCvars(c.cvars, name)
                }
            ],
            // Toggle a boolean cvar
            ['toggle', (c, _, path) => {
                // TODO: error on extra params
                const existingValue = get(c.cvars, path)
                if (typeof existingValue === 'boolean') {
                    set(c.cvars, path, !existingValue)
                    return c.info(`Set ${path} to ${!existingValue}`)
                } else {
                    return c.warn("Can't toggle because it's not a boolean:", path)
                }
                // don't need to update the console because modifying the constants should notify us

            }, (c, _cmd, name) => {
                // TODO: find only booleans
                return findCvars(c.cvars, name)
            }],
        ]
}




// can't restrict to primitives, so this gets annoying as shit 
// type Traversable<AV> = { [k: string | number]: Traversable<AV> | AV }
type Traversable = { [k: string | number]: any }

// TODO: look up the Extract<> type
type TraverseFilter = (key: string, value: any) => boolean

// TODO: ensure (somehow?) that these come out in the same order as the prototype. Object.keys()?
function searchNested(obj: Traversable, filter: TraverseFilter, prefix: string[] = []): [string[], any][] {
    let acc: [string[], unknown][] = []
    for (let key in obj) {
        const fullPath = prefix.concat(key)
        // console.log(fullPath)
        const val = obj[key]

        if (val && typeof val === 'object') {
            // Traverse further
            acc.push(...searchNested(val, filter, fullPath))
        } else {
            // it's a primitive (we hope?)
            if (filter(fullPath.join('.'), val)) {
                acc.push([[...prefix, key], val])
            }
        }
    }

    return acc
}


function findCvars<CV extends object>(constants: CV, searchTerm: string = '') {
    // TODO: more sophisticated search with fuzzy matching, etc.
    const results = searchNested(constants, (k, _) => k.includes(searchTerm))

    results.sort((a, b) => {
        let astr = a[0].join('.')
        let bstr = b[0].join('.')
        if (astr < bstr) {
            return -1
        }
        if (astr > bstr) {
            return 1
        }
        return 0
    })

    return results.map(([keypath, value]) => {
        const path = keypath.join('.')
        if (typeof value === 'boolean') {
            return `<a href="#" data-click-command="toggle ${path}">${path}: ${value ? "[✓]" : "[ ]"}</a>`
        }
        return keypath.join('.') + ': ' + value
    }
    ).join("\n")
}