import { GVec2, grid, rect } from 'gamebucket'
import invariant from 'tiny-invariant'
import fontImage from './font-12x12'

// https://www.seasip.info/VintagePC/cga.html
// Bit 0: Blue foreground
// Bit 1: Green foreground
// Bit 2: Red foreground
// Bit 3: Bright foreground
// Bit 4: Blue background
// Bit 5: Green background
// Bit 6: Red background
// Bit 7: Bright background; or blinking text

export const COLOR_BLUE_FG = 1 << 0
export const COLOR_GREEN_FG = 1 << 1
export const COLOR_RED_FG = 1 << 2
export const COLOR_BRIGHT_FG = 1 << 3
export const COLOR_BLUE_BG = 1 << 4
export const COLOR_GREEN_BG = 1 << 5
export const COLOR_RED_BG = 1 << 6
export const COLOR_BLINK = 1 << 7
export const COLOR_BRIGHT_BG = 1 << 7

export const COLOR_WHITE_FG = COLOR_BLUE_FG | COLOR_RED_FG | COLOR_GREEN_FG
export const COLOR_WHITE_BG = COLOR_BLUE_BG | COLOR_RED_BG | COLOR_GREEN_BG

/** If true, slightly reduce the brightness of backgrounds -- not accurate to
 *  CGA hardware but easier on the eyes  */
let TAME_BG_COLORS = true
/** If true, the BLINK/BRIGHT_BG bit makes backgroundds brighter; if false, it makes the foreground blink */
let BRIGHT_BACKGROUNDS = false

const palette = new Uint8Array(255 * 6)
{
    const intensityMed = 170
    const intensityLow = 85
    const intensityBg = TAME_BG_COLORS ? 127 : 170

    for (let colorbits = 0; colorbits <= 0xffff; colorbits++) {
        const idx = colorbits * 6

        palette[idx + 0] |= colorbits & COLOR_RED_FG ? intensityMed : 0
        palette[idx + 1] |= colorbits & COLOR_GREEN_FG ? intensityMed : 0
        palette[idx + 2] |= colorbits & COLOR_BLUE_FG ? intensityMed : 0

        palette[idx + 0] += colorbits & COLOR_BRIGHT_FG ? intensityLow : 0
        palette[idx + 1] += colorbits & COLOR_BRIGHT_FG ? intensityLow : 0
        palette[idx + 2] += colorbits & COLOR_BRIGHT_FG ? intensityLow : 0

        palette[idx + 3] = colorbits & COLOR_RED_BG ? intensityBg : 0
        palette[idx + 4] = colorbits & COLOR_GREEN_BG ? intensityBg : 0
        palette[idx + 5] = colorbits & COLOR_BLUE_BG ? intensityBg : 0

        if (BRIGHT_BACKGROUNDS) {
            palette[idx + 3] += colorbits & COLOR_BRIGHT_BG ? intensityLow : 0
            palette[idx + 4] += colorbits & COLOR_BRIGHT_BG ? intensityLow : 0
            palette[idx + 5] += colorbits & COLOR_BRIGHT_BG ? intensityLow : 0
        }
    }
}

export default class CharacterDisplay {
    blinkPeriod = 800

    private font: HTMLImageElement
    ctx: CanvasRenderingContext2D | null
    offset = { x: 0, y: 0 }

    readonly cellSize = { width: 12, height: 12 }

    private worldBounds = {
        origin: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
    }
    ready: Promise<any[]>
    booleanFont?: Uint8Array

    private pixelBuffer: ImageData

    constructor(
        public readonly canvas: HTMLCanvasElement,
        public readonly viewportSize: rect.Size = { width: 80, height: 25 },
        public readonly magnify = 1,
    ) {
        const { cellSize } = this

        document.body.style.backgroundColor = 'black'
        this.font = document.createElement('img')
        this.font.src = fontImage

        // Create display
        canvas.width = cellSize.width * viewportSize.width
        canvas.height = cellSize.height * viewportSize.height
        canvas.style.backgroundColor = 'black'
        canvas.style.width =
            cellSize.width * viewportSize.width * magnify + 'px'
        canvas.style.height =
            cellSize.height * viewportSize.height * magnify + 'px'
        canvas.style.imageRendering = 'pixelated'
        canvas.style.margin = '0 auto'
        canvas.style.position = 'inherit'
        canvas.style.display = 'block'

        this.pixelBuffer = new ImageData(canvas.width, canvas.height)
        this.pixelBuffer.data.fill(255)

        this.ctx = canvas.getContext('2d', { alpha: false })

        this.ready = Promise.all([
            extractMonoFont(this.font, {
                width: 12,
                height: 12,
            }).then((ary) => {
                this.booleanFont = ary
                return ary
            }),
        ])
    }

    render(
        chars: Readonly<Uint8Array | Uint8ClampedArray>,
        bufferSize: Readonly<rect.Size>,
        colors?: Readonly<Uint8Array | Uint8ClampedArray>,
        time?: number, // in ms
    ) {
        console.time('render')

        // TODO: modify this.offset if it would cause us to render subpixel tiles
        const {
            ctx,
            viewportSize,
            cellSize,
            worldBounds,
            booleanFont: font,
            pixelBuffer,
            blinkPeriod,
        } = this
        worldBounds.size = { ...bufferSize }
        invariant(ctx, 'No context')
        invariant(font, 'No font')

        const blink = (((time || 0) / blinkPeriod) | 0) % 2
        const sw = cellSize.width
        const sh = cellSize.height
        const dw = sw
        const dh = sh

        this.offset.x = Math.floor(this.offset.x)
        this.offset.y = Math.floor(this.offset.y)
        const { x: offsetX, y: offsetY } = this.offset

        // TODO: reimplement fractional scrolling, maybe
        // const offsetX = Math.floor(this.offset.x)
        // const offsetY = Math.floor(this.offset.y)
        // const fracX = (this.offset.x - offsetX) * dw
        // const fracY = (this.offset.y - offsetY) * dh

        const bytesPerGlyphRow = cellSize.width
        const bytesPerGlyph = rect.area(cellSize)

        let outIdx = 0
        // iterate by cell rows...
        for (let cellY = 0; cellY < viewportSize.height; cellY++) {
            // buffer index that maps onto the leftmost cell
            const rowStart = (cellY + offsetY) * bufferSize.width

            const actualStart = Math.max(rowStart + offsetX, rowStart)
            const actualEndExclu = (cellY + offsetY + 1) * bufferSize.width

            for (let localY = 0; localY < cellSize.height; localY++) {
                // Now draw all 12 pixel rows of this cell one row at a time
                for (let cellX = 0; cellX < viewportSize.width; cellX++) {
                    const contentIdx = rowStart + offsetX + cellX
                    const validIndex =
                        contentIdx >= actualStart && contentIdx < actualEndExclu
                    const asciiCode = validIndex ? chars[contentIdx] : 0

                    // Ascii code is an index into the font
                    // this assumes cells & glyphs are the same pixel size
                    const fontCharStartsAtByte = asciiCode * bytesPerGlyph
                    const offsetWithinFont = localY * bytesPerGlyphRow
                    const fontIdx = fontCharStartsAtByte + offsetWithinFont

                    const defaultPaletteEntry = COLOR_WHITE_FG | COLOR_BRIGHT_FG
                    const colorBits =
                        (validIndex && colors
                            ? colors[contentIdx]
                            : defaultPaletteEntry) * 6
                    if (colorBits === 28 * 6) {
                    }
                    const fgColorR = palette[colorBits]
                    const fgColorG = palette[colorBits + 1]
                    const fgColorB = palette[colorBits + 2]

                    const bgColorR = palette[colorBits + 3]
                    const bgColorG = palette[colorBits + 4]
                    const bgColorB = palette[colorBits + 5]

                    // Now draw the row!
                    for (let byte = 0; byte < bytesPerGlyphRow; byte++) {
                        const solidPixel = blink && !!font[fontIdx + byte]
                        if (solidPixel) {
                            pixelBuffer.data[outIdx] = fgColorR
                            pixelBuffer.data[outIdx + 1] = fgColorG
                            pixelBuffer.data[outIdx + 2] = fgColorB
                        } else {
                            pixelBuffer.data[outIdx] = bgColorR
                            pixelBuffer.data[outIdx + 1] = bgColorG
                            pixelBuffer.data[outIdx + 2] = bgColorB
                        }
                        // pixelBuffer.data[outIdx + 3] = 255
                        outIdx += 4
                    }
                }
            }
        }

        ctx.putImageData(pixelBuffer, 0, 0)

        console.timeEnd('render')
    }

    /**
     * @param x An x coordinate within the canvas
     * @param y A y coordinate within the canvas
     * @returns {GVec2} The coordinate of the buffer cell at the given pixel */
    cellAtPixel(x: number, y: number): GVec2 {
        invariant(x >= 0 && y >= 0, 'Coordinate is negative')
        const { cellSize, magnify, offset } = this

        return {
            x: Math.floor(x / cellSize.width / magnify + offset.x),
            y: Math.floor(y / cellSize.height / magnify + offset.y),
        }
    }
}

async function extractMonoFont(img: HTMLImageElement, glyphSize: rect.Size) {
    await img.decode()
    invariant(img.complete)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    invariant(ctx)

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    const rawImage = ctx.getImageData(0, 0, img.width, img.height)

    const glyphCount = {
        width: img.width / glyphSize.width,
        height: img.height / glyphSize.height,
    }

    // 1 byte per pixel, alpha value 0-255. assumes premultiplied alpha
    let output = []

    const bytesPerLine = img.width * 4

    for (let glyphIdx = 0; glyphIdx < rect.area(glyphCount); glyphIdx++) {
        const { x: glphyX, y: glyphY } = grid.toCoord(
            glyphIdx,
            glyphCount.width,
        )

        let pixelX = glphyX * glyphSize.width
        let pixelY = glyphY * glyphSize.height

        // which byte in the rawImage array starts the glyph. the next row is bytesPerLine later
        const bufferByteIdx = grid.toIdx(pixelX, pixelY, img.width) * 4

        for (let row = 0; row < glyphSize.height; row++) {
            const begin = row * bytesPerLine + bufferByteIdx
            const rowData = rawImage.data.subarray(
                begin,
                begin + 4 * glyphSize.width,
            )

            for (let px = 0; px < rowData.length; px += 4) {
                const alpha = rowData[px + 3]
                output.push(alpha)
            }
        }
    }
    invariant(output.length === rect.area(glyphCount) * rect.area(glyphSize))

    return new Uint8Array(output)
}
