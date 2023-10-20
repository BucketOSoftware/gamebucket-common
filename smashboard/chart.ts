import Color from 'color';
import { get } from 'lodash-es';
import {
    SmoothieChart,
    TimeSeries,
    IChartOptions,
    IGridOptions,
    ILabelOptions,
    ITimeSeriesPresentationOptions
} from 'smoothie';
import { MapStateToInstrument, RuntimeWatch, ChartOptions } from '../smashboard';

export class Chart<State> {
    static readonly DELAY_FR = 1;
    static readonly SIZE = [192, 64];
    static lastSerial = 0;

    static defaultChartOptions: IChartOptions = {
        responsive: false,
        tooltip: false,
        interpolation: 'bezier',
        limitFPS: 30,
    };

    static defaultGridOptions: IGridOptions = {
        lineWidth: 1,
        borderVisible: false,
        millisPerLine: 1000,
    };

    static defaultLabelOptions: ILabelOptions = {
        fontFamily: 'Overpass, system-ui',
    };
    static defaultSeriesOptions: ITimeSeriesPresentationOptions = {
        lineWidth: 2
    };

    domElement: HTMLCanvasElement;
    chart: SmoothieChart;
    series: TimeSeries[];

    dataSources: (MapStateToInstrument<State> | string[] | 'manual')[] = [];

    private positiveOnly = false;

    /** Used to re-create a runtime chart. Not needed for callback-based or manual charts */
    runtimeWatchConfig?: RuntimeWatch;

    private serial = Chart.lastSerial++;

    constructor(
        public readonly label: string,
        options: ChartOptions,
        private _chartColors: Color[] = [Color('red')],
        private _backgroundColor: Color = Color('black')
    ) {
        // obvs
        this.positiveOnly = options.min === 0;
        // Reset bounds if we didn't provide both
        const resetBounds = options.min === undefined && options.max === undefined;

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
            maxValueScale: this.positiveOnly ? 1.05 : 1
        });
        this.setNoData(true);

        const canvas = this.domElement = document.createElement('canvas');
        canvas.width = Chart.SIZE[0];
        canvas.height = Chart.SIZE[1];
        canvas.classList.add('shadow');

        const series = new TimeSeries({ resetBounds });

        if (options.min !== undefined) { series.minValue = options.min; }
        if (options.max !== undefined) { series.maxValue = options.max; }

        this.series = [series];

        const seriesColor = _chartColors[this.serial % _chartColors.length];

        this.chart.addTimeSeries(series, {
            ...Chart.defaultSeriesOptions,
            strokeStyle: seriesColor.string(),
            fillStyle: this.positiveOnly ? seriesColor.fade(2 / 3).string() : undefined,
            tooltipLabel: label,
        });
        this.chart.streamTo(canvas, Chart.DELAY_FR * 1 / 60 * 1000);
    }

    get backgroundColor() {
        return this._backgroundColor;
    }

    set backgroundColor(color: Color) {
        this._backgroundColor = color;
        this.setNoData(false);
    }

    get seriesColors() {
        return this._chartColors;
    }

    set seriesColors(colors: Color[]) {
        this._chartColors = colors;

        const seriesColor = this.seriesColors[this.serial % this._chartColors.length];

        const seriesOpts = this.chart.getTimeSeriesOptions(this.series[0]);
        seriesOpts.strokeStyle = seriesColor.string();
        seriesOpts.fillStyle = this.positiveOnly ? seriesColor.fade(2 / 3).string() : undefined;
    }

    setNoData(noData: boolean) {
        /** @todo Is it okay to do all this on every update? */
        let lineColor = this.backgroundColor.darken(1 / 2).opaquer(1 / 4);
        this.chart.options.grid!.fillStyle =
            (noData ? this.backgroundColor.desaturate(1) : this.backgroundColor).string();
        this.chart.options.grid!.strokeStyle =
            (noData ? lineColor.desaturate(1) : lineColor).string();
    }

    retrieveData(state: State): number | undefined {
        const { dataSources } = this;

        // TODO: multiple series/datasources
        if (typeof dataSources[0] === 'function') {
            // Data source is a callback
            return dataSources[0](state);
        } else if (Array.isArray(dataSources[0])) {
            // Data source is a path
            return get(state, dataSources[0]);
        } else if (dataSources[0] === 'manual') {
            // It's already been done, we hope?
            return;
        } else {
            throw new Error("Don't know how to retrieve value for chart: " + this.label);
        }
    }
}
