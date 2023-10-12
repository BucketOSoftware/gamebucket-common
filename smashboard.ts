import Color from 'color'
import { at, capitalize, cloneDeep, get, isEmpty, throttle, debounce, trim, set } from 'lodash-es'
import ow from 'ow'
import {
    SmoothieChart,
    TimeSeries,
    IChartOptions,
    IGridOptions,
    ILabelOptions,
    ITimeSeriesPresentationOptions,
} from 'smoothie'

import './dashboard.css'
import html from './smashboard.html?raw'
import lipsum from './lipsum.txt?raw'

declare global {
    interface Window {
        watch?: (path: string, options?: ChartOptions) => Chart<any>
    }
}

// VK: valid keys
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
    // console.log("Okay...",acc)
    return acc
}

const idleTimeout = { timeout: 1000 }


type WatchCallback<GS> = (state: GS) => number

interface ChartOptions {
    min?: number;
    max?: number;
    verticalSections?: number;
}

interface RuntimeWatch {
    path: string
}

////////


const INITIAL_SETTINGS = {
    visible: false,
    runtimeWatches: [] as RuntimeWatch[]
}


export default class Smashboard<GS, C extends Object = {}> {
    chartColors = [
        Color.rgb([0, 255, 0]),
        Color.rgb([255, 0, 0]),
        Color.rgb([0, 0, 255]),
    ]
    chartBackground = Color.rgb([128, 128, 192]).fade(0.25)

    /** When hiding the dashboard, focus this element */
    focusOnHide?: HTMLElement

    private readonly settings = INITIAL_SETTINGS
    private readonly charts: Record<string, Chart<GS>> = {}

    // TODO: can't we just clear display: 'none' locally
    private readonly containerOriginalDisplay: string = this.container.style.display;

    private readonly originalConstants

    /** Calling it "console" is asking for autocomplete trouble */
    private sole: HTMLElement | null
    private consoleInput?: HTMLInputElement = undefined

    // textEntry: HTMLInputElement | null

    /**
     * @param container The DOM element to display the dashboard in
     * @param constants Reference to an object holding the game's global "constants", i.e. settings that would be inlined in a shipping build but could be changed at runtime during development. @todo We should warn if any of the keys have a . in them because we/lodash assume they don't
     * @param storagePrefix 
     */
    constructor(
        private container: HTMLElement,
        private readonly constants: C,
        private readonly storagePrefix = 'smashboard'
    ) {
        // So we can check for presence of keys, see if there have been changes, etc.
        this.originalConstants = cloneDeep(constants)

        // Set up the markup
        container.innerHTML = html
        this.sole = container.querySelector<HTMLElement>('.console')

        this.attachEvents(container)


        // Copy settings from localStorage
        // Disabled until we get the ordering right
        // this.restoreSettings()
        this.updateSettings()
        this.updateConsole()
        if (window.watch) {
            console.warn('Smashboard: watch() already exists globally, overwriting', window.watch)
        }
        window.watch = this.watch.bind(this)
    }


    private attachEvents(container: HTMLElement) {
        this.consoleInput = container!.querySelector<HTMLInputElement>('.console-section input[type=text]')!
        const { consoleInput, sole } = this

        // Listen for clicks in the console display
        sole!.addEventListener('click', (ev: MouseEvent) => {
            const a = ev.target! as HTMLElement
            if (!('action' in a.dataset)) {
                return
            }

            switch (a.dataset['action']) {
                case 'toggle':
                    this.toggleConstant(a.dataset['path']!)
                    ev.preventDefault()
                    break
                default:
            }
        })

        // User hits "enter" in the console
        container.querySelector('form')!.addEventListener('submit', (ev: SubmitEvent) => {
            ev.preventDefault()
            this.handleCommand(consoleInput.value)
        })

        // User types something in the console
        consoleInput.addEventListener('input', (ev) => {
            this.handleConsoleInput(consoleInput.value)
            ev.preventDefault()
        }, { capture: true })


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
                    // const inputs = this.container.getElementsByTagName('input')
                    this.consoleInput?.focus()
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

    private updateSettings() {
        const { visible, runtimeWatches = [] } = this.settings
        const klasses = this.container.classList
        if (visible) {
            klasses.add('visible')
            klasses.remove('hidden')
        } else {
            klasses.add('hidden')
            klasses.remove('visible')
        }

        // TODO: only if the visibility has actually changed
        if (this.settings.visible) {
            // Start console updates
            this.updateConsole()
        } else {
            // TODO: focus the game again
            this.focusOnHide?.focus()
        }

        runtimeWatches.forEach((watchConfig) => {
            this.watch(watchConfig.path)
        })
    }

    private saveSettings() {
        /** @todo debounce maybe */

        const t = this.constants
        localStorage.setItem(this.storagePrefix + '-settings', JSON.stringify(this.settings))
    }

    update(state: GS) {
        const timestamp = Date.now()

        this.updateCharts(timestamp, state)
    }

    refreshConsoleVars() {
        console.debug('Smashboard: refreshing constants')
        this.updateConsole()
    }

    private updateCharts(timestamp: number, state: GS) {
        const { charts } = this

        // Add data to charts
        for (let id in charts) {
            const chart = charts[id]
            const { series } = chart

            let value: number | undefined
            try {
                value = chart.getData(state)
            } catch (e) {
                console.warn("Couldn't get data for chart, disabling:", id, value, e)
            }

            switch (typeof value) {
                case 'undefined':
                    // Ignore. Might be nice to surface this in some way
                    // Maybe gray out the chart BG?
                    chart.setNoData(true)
                    break
                case 'number':
                    chart.setNoData(false)
                    series[0].append(timestamp, value)
                    break
                default:
                    console.warn('Chart returned a non-number, disabling:', id, value)
                    this.removeChart(id)
            }
        }

    }

    /** 
     * #region Command line
     */

    private idleTimeout: IdleRequestOptions = { timeout: 1000 }
    private consoleAwaitingUpdate = false
    private updateConsole() {
        /*
        if (this.consoleAwaitingUpdate) {
            console.warn('HOLD YOUR HORSES')
            return
        } else {
            console.warn('Horses up!')
        }
        */
        this.consoleAwaitingUpdate = true

        requestIdleCallback((deadline) => {
            if (!this.consoleAwaitingUpdate) {
                return
            }
            this.consoleAwaitingUpdate = false

            // console.debug('Idle deadline: ', deadline.didTimeout ? 'timed out' : deadline.timeRemaining())
            // console.time('idleWork')

            const searchTerm = trim(this.consoleInput?.value ?? '')
            if (searchTerm === 'lipsum') {
                this.sole!.innerText = lipsum
                return
            }

            // TODO: more sophisticated search with fuzzy matching, etc.
            const results = searchNested(this.constants, (k, _) => k.includes(searchTerm))

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

            this.sole!.innerHTML = results.map(([keypath, value]) => {
                const path = keypath.join('.')
                if (typeof value === 'boolean') {
                    return `<a href="#" data-action="toggle" data-path="${path}">${path}: ${value ? "[✓]" : "[ ]"}`
                }
                return keypath.join('.') + ': ' + value
            }
            ).join("\n")
            // console.timeEnd('idleWork')
        }, this.idleTimeout)
    }

    private handleCommand(rawCommand: string) {
        console.warn('TODO:', rawCommand)
    }

    private handleConsoleInput(value: string) {
        this.updateConsole()
    }


    private toggleConstant(path: string) {
        const existingValue = get(this.constants, path)
        if (typeof existingValue === 'boolean') {
            set(this.constants, path, !existingValue)
        } else {
            console.warn("Can't toggle because it's not a boolean:", path)
        }
        // don't need to update the console because modifying the constants should notify us
    }

    /*
     * #region Charts
     */

    /** Set the color scheme for charts
     * @todo and...?
     */
    setColors(scheme: ColorScheme) {
        const { container: root } = this
        this.chartBackground = scheme.graphBackground ?? this.chartBackground
        this.chartColors = scheme.graphSeries ?? this.chartColors

        const sole = root.querySelector<HTMLElement>('.console-section')!
        const charts = root.querySelector<HTMLElement>('.charts-section')!
        charts.style.setProperty('--smashboard-shadow-color', this.chartBackground.darken(0.5).opaquer(0.5).round().string())

        if (scheme.consoleText) {
            root.style.setProperty('--smashboard-console-text-color', scheme.consoleText?.string())
        }

        if (scheme.consoleBackground) {
            root.style.setProperty('--smashboard-console-background', scheme.consoleBackground.darken(1 / 2).round().string())
            sole.style.setProperty('--smashboard-shadow-color', scheme.consoleBackground.darken(1 / 2).opaquer(0.5).round().string())
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
     * @todo Allow the path to reference arrays and chart one series for each array element
     * 
     * @param path 
     * @returns 
     */
    private watch(path: string, options?: ChartOptions) {
        const existing = this.charts[path]
        if (existing) {
            console.warn("Already a watch for this path, ignoring. But what if there's a new config?", path)
            return existing
        }

        // Technically any string can be a key in a JS object, so we don't
        // validate the path at all (although I guess we don't allow . in keys)
        const keys = path.split('.')
        // TODO: what about options that can only be set when creating the chart? Are there any? How do we change them later
        const chart = new Chart<GS>(capitalize(keys.at(-1)!), { verticalSections: 2 }, this.chartColors, this.chartBackground)
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
        return chart
    }

    /*
     * @todo Allow watching strings etc. Need to figure out how to usefully display them. Do we include any history? Lowpass filter?
     */
    private watchWithCallback(label: string, callback: WatchCallback<GS>, dataOptions: ChartOptions = {}) {
        if (this.charts[label]) {
            console.warn("Overriding chart for", label)
            this.removeChart(label)
        }

        // TODO: call the callback right now and note the return type

        const chart = new Chart<GS>(label, dataOptions, this.chartColors, this.chartBackground)
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
            chart = new Chart(label, options, this.chartColors, this.chartBackground)
            chart.dataSources = ['manual']
            this.appendChart(label, chart)
        }

        chart.setNoData(value === undefined)
        chart.series[0].append(timestamp, value);
        return chart
    }

    // watch one path
    chart(path: string, options?: ChartOptions): Chart<GS>;
    // watch result of a callback
    chart(label: string, callback: WatchCallback<GS>, options?: ChartOptions): Chart<GS>;
    // manually add data
    chart(label: string, value: number, timestamp: number, options?: ChartOptions): Chart<GS>;
    chart(labelOrPath: string,
        b?: ChartOptions | number | WatchCallback<GS>,
        c?: ChartOptions | number,
        d?: ChartOptions
    ): Chart<GS> {

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

    private appendChart(id: string, chart: Chart<GS>) {
        const { charts, container } = this

        this.charts[id] = chart
        this.container.querySelector('.charts-section')!.appendChild(chart.domElement)
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
}

class Chart<T> {
    static readonly DELAY_FR = 1
    static readonly SIZE = [192, 64]
    static serial = 0

    static defaultChartOptions: IChartOptions = {
        responsive: false,
        tooltip: false,
        interpolation: 'bezier',
        limitFPS: 30,
    }

    static defaultGridOptions: IGridOptions = {
        lineWidth: 1,
        borderVisible: false,
        millisPerLine: 1000,
    }

    static defaultLabelOptions: ILabelOptions = {
        fontFamily: 'Overpass, system-ui',
    }
    static defaultSeriesOptions: ITimeSeriesPresentationOptions = {
        lineWidth: 2
    }

    domElement: HTMLCanvasElement
    chart: SmoothieChart
    series: TimeSeries[]

    dataSources: (WatchCallback<T> | string[] | 'manual')[] = []


    /** Used to re-create a runtime chart. Not needed for callback-based or manual charts */
    runtimeWatchConfig?: RuntimeWatch

    constructor(
        public readonly label: string,
        options: ChartOptions,
        private readonly chartColors: Color[] = [Color('red')],
        private readonly backgroundColor: Color = Color('black')
    ) {
        // obvs
        const positiveOnly = options.min === 0
        // Reset bounds if we didn't provide both
        const resetBounds = options.min === undefined && options.max === undefined

        this.chart = new SmoothieChart({
            ...Chart.defaultChartOptions,
            grid: {
                ...Chart.defaultGridOptions,
                verticalSections: options.verticalSections ?? 2,
            },
            title: {
                ...Chart.defaultLabelOptions,
                text: label,
            },
            maxValueScale: positiveOnly ? 1.05 : 1

        });
        this.setNoData(true)

        const canvas = this.domElement = document.createElement('canvas');
        canvas.width = Chart.SIZE[0]
        canvas.height = Chart.SIZE[1]
        canvas.classList.add('shadow')

        const series = new TimeSeries({ resetBounds });

        if (options.min !== undefined) { series.minValue = options.min; }
        if (options.max !== undefined) { series.maxValue = options.max; }

        this.series = [series]

        const seriesColor = Color.rgb(chartColors[Chart.serial++ % chartColors.length])
        this.chart.addTimeSeries(series, {
            ...Chart.defaultSeriesOptions,
            strokeStyle: seriesColor.string(),
            fillStyle: positiveOnly ? seriesColor.fade(2 / 3).string() : undefined,
            tooltipLabel: label,

        });
        this.chart.streamTo(canvas, Chart.DELAY_FR * 1 / 60 * 1000);
    }

    setNoData(noData: boolean) {
        /** @todo Is it okay to do all this on every update? */
        let bgColor = this.backgroundColor
        let lineColor = bgColor.darken(1 / 2).opaquer(1 / 4)
        this.chart.options.grid!.fillStyle = (noData ? bgColor.desaturate(1) : bgColor).string()
        this.chart.options.grid!.strokeStyle = (noData ? lineColor.desaturate(1) : lineColor).string()
    }

    getData(state: T) {
        const { dataSources } = this

        // TODO: multiple series/datasources
        if (typeof dataSources[0] === 'function') {
            // Data source is a callback
            return dataSources[0](state)
        } else if (Array.isArray(dataSources[0])) {
            // Data source is a path
            return get(state, dataSources[0])
        } else if (dataSources[0] === 'manual') {
            // It's already been done, we hope?
            return
        } else {
            throw new Error("Don't know how to retrieve value for chart: " + this.label)
        }
    }
}

function dropEmptiesReplacer(_: string, value: any) {
    if (typeof value === 'object' && isEmpty(value)) {
        return
    }
    return value
}



const byHue = (a: Color, b: Color) => a.hue() - b.hue()
const byLuminosity = (a: Color, b: Color) => a.luminosity() - b.luminosity()
export function colorsFromHexFile(file: string): Color[] {
    const colors = file.split('\n')
        .map(hxstr => Array.from(hxstr.matchAll(/[0-9A-Fa-f]{2}/g)))
        .filter(matches => matches.length === 3)
        .map(matches => matches.map((hx) => Number.parseInt(hx[0], 16)))
        .map(tuple => Color(tuple).hsl())
    colors.sort(byHue)
    return colors
}




export class ColorScheme {
    readonly colors: Color[]
    graphSeries?: Color[]
    graphBackground?: Color
    consoleText?: Color
    consoleBackground?: Color

    constructor(hexfile: string) {
        this.colors = colorsFromHexFile(hexfile)
        // Assume the first color is the background and the rest are main until we hear otherwise

        this.graphSeries = this.colors.slice(1)
        this.graphBackground = this.colors[0].fade(1 - (2 / 3))
    }

    pickMainColors(...indices: number[]) {
        this.graphSeries = at(this.colors, indices)

        return this
    }

    pickBackgroundColor(index: number, opacity = 2 / 3) {
        ow(index, ow.number.inRange(0, this.colors.length - 1))
        ow(opacity, ow.number.inRange(0, 1))

        this.graphBackground = this.colors[index].fade(1 - opacity)

        return this
    }

    pickConsoleColors(foreground: number, background: number, opacity = 2 / 3) {
        this.consoleText = this.colors[foreground]
        this.consoleBackground = this.colors[background].fade(1 - opacity)

        return this
    }

    makeSwatches(colors = this.colors) {
        return colors.map((c, idx) => {
            const swatch = document.createElement('span')
            swatch.className = 'swatch'
            swatch.style.backgroundColor = c.string()
            swatch.innerText = `${idx}`

            return swatch
        })
    }
}
