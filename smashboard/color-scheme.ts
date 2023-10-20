import Color from 'color';
import { clone } from 'lodash-es';
import ow from 'ow';

const byHue = (a: Color, b: Color) => a.hue() - b.hue();
const byLuminosity = (a: Color, b: Color) => a.luminosity() - b.luminosity();
export function colorsFromHexFile(file: string): Color[] {
    const colors = file.split('\n')
        .map(hxstr => Array.from(hxstr.matchAll(/[0-9A-Fa-f]{2}/g)))
        .filter(matches => matches.length === 3)
        .map(matches => matches.map((hx) => Number.parseInt(hx[0], 16)))
        .map(tuple => Color(tuple).hsl());
    colors.sort(byHue);
    return colors;
}
/** All the colors that can be customized */
interface SchemeColors {
    graphBackground?: Color;
    consoleText?: Color;
    consoleBackground?: Color;
    shadow?: Color;
    graphSeries?: Color[];
}
type ColorSpec<T = number> = {
    [Property in keyof SchemeColors]: T;
};
interface SetColorsParams extends ColorSpec<number | number[]> {
    opacity?: ColorSpec<number>;
    /** @todo */
    lightness?: ColorSpec<number>;
}

export class ColorScheme implements SchemeColors {
    readonly colors: Color[];

    graphSeries?: Color[];
    graphBackground?: Color;
    consoleText?: Color;
    consoleBackground?: Color;
    shadow?: Color;

    constructor(hexfileOrColors: string | Color[]) {
        if (Array.isArray(hexfileOrColors)) {
            this.colors = clone(hexfileOrColors);
        } else {
            this.colors = colorsFromHexFile(hexfileOrColors);
        }

        // Assume the first color is the background and the rest are main until we hear otherwise
        this.graphSeries = this.colors.slice(1);
        this.graphBackground = this.colors[0].fade(1 - (2 / 3));
    }


    pickColors(param: SetColorsParams) {
        const opacity = param.opacity;
        delete param.opacity;

        this.walkParams(param, (name, existing, idx) => {
            // Pick the numbered index from the palette
            ow(idx, ow.number.inRange(0, this.colors.length - 1));
            return this.colors[idx];
        });

        this.walkParams(opacity, (_, color, opac) => {
            ow(opac, ow.number.inRange(0, 1));
            ow(color, ow.object.instanceOf(Color));

            // @ts-expect-error: why doesn't object.instanceOf work?
            return color.fade(1 - opac);
        });

        return this;
    }

    /** For each key in params, set that color to whatever's returns from the callback */
    walkParams(param: SetColorsParams | undefined, doSomething: (key: string, existing: Color | Color[], value: number) => Color) {
        if (!param) {
            return;
        }

        for (let name in param) {
            const typed = name as keyof SchemeColors;
            const idxOrArray = param[typed];
            const existing = this[typed];

            if (Array.isArray(idxOrArray)) {
                // @ts-expect-error: yeah, we don't know if it's an array or not, go screw
                this[typed] = idxOrArray.map(idx => doSomething(name, existing, idx));
            } else if (typeof idxOrArray === 'number') {
                // @ts-expect-error
                this[typed] = doSomething(name, existing, idxOrArray);
            } else {
                console.warn("No parameter given for", name);
            }
        }

    }

    makeSwatches(colors = this.colors) {
        return colors.map((c, idx) => {
            const swatch = document.createElement('span');
            swatch.className = 'swatch';
            swatch.style.backgroundColor = c.string();
            swatch.innerText = `${idx}`;

            return swatch;
        });
    }
}
