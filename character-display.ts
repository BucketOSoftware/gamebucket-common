import { GVec2, grid, rect } from 'gamebucket'
import invariant from 'tiny-invariant'
import fontImage from './font-12x12'

export interface Sprite {
    x: number
    y: number
    char: number // 0-255
    color?: number // bitmask, treated as COLOR_WHITE if not specified
}

// https://www.seasip.info/VintagePC/cga.html
// Bit 0: Blue foreground
// Bit 1: Green foreground
// Bit 2: Red foreground
// Bit 3: Bright foreground
// Bit 4: Blue background
// Bit 5: Green background
// Bit 6: Red background
// Bit 7: Bright background; or blinking text

export const COLOR_BLUE = 1 << 0 // 1
export const COLOR_GREEN = 1 << 1 // 2
export const COLOR_RED = 1 << 2 // 4
export const COLOR_BRIGHT = 1 << 3 // 8
export const COLOR_BG_BLUE = 1 << 4 // 16
export const COLOR_BG_GREEN = 1 << 5 // 32
export const COLOR_BG_RED = 1 << 6 // 64
export const COLOR_BLINK = 1 << 7 // 128
export const COLOR_BRIGHT_BG = 1 << 7

export const COLOR_CYAN = COLOR_BLUE | COLOR_GREEN // 3
export const COLOR_PURPLE = COLOR_BLUE | COLOR_RED // 5
export const COLOR_YELLOW = COLOR_GREEN | COLOR_RED // 6
export const COLOR_WHITE = COLOR_BLUE | COLOR_RED | COLOR_GREEN // 7

export const COLOR_BG_WHITE = COLOR_BG_BLUE | COLOR_BG_RED | COLOR_BG_GREEN

export const COLOR_BG_BLACK = 0

/** If true, slightly reduce the brightness of backgrounds -- not accurate to
 *  CGA hardware but easier on the eyes  */
let TAME_BG_COLORS = false
/** If true, the BLINK/BRIGHT_BG bit makes backgroundds brighter; if false, it makes the foreground blink */
let BRIGHT_BACKGROUNDS = false

const palette = new Uint8Array(256 * 6)
{
    const intensityMed = 0xaa
    const intensityLow = 0x55

    for (let colorbits = 0; colorbits <= 0xffff; colorbits++) {
        const idx = colorbits * 6

        palette[idx + 0] |= colorbits & COLOR_RED ? intensityMed : 0
        palette[idx + 1] |= colorbits & COLOR_GREEN ? intensityMed : 0
        palette[idx + 2] |= colorbits & COLOR_BLUE ? intensityMed : 0

        palette[idx + 0] += colorbits & COLOR_BRIGHT ? intensityLow : 0
        palette[idx + 1] += colorbits & COLOR_BRIGHT ? intensityLow : 0
        palette[idx + 2] += colorbits & COLOR_BRIGHT ? intensityLow : 0

        palette[idx + 3] = colorbits & COLOR_BG_RED ? intensityBg : 0
        palette[idx + 4] = colorbits & COLOR_BG_GREEN ? intensityBg : 0
        palette[idx + 5] = colorbits & COLOR_BG_BLUE ? intensityBg : 0

        if (BRIGHT_BACKGROUNDS) {
            palette[idx + 3] += colorbits & COLOR_BRIGHT_BG ? intensityLow : 0
            palette[idx + 4] += colorbits & COLOR_BRIGHT_BG ? intensityLow : 0
            palette[idx + 5] += colorbits & COLOR_BRIGHT_BG ? intensityLow : 0
        }
    }
}

export default class CharacterDisplay {
    // TODO?: Is this accurate?
    readonly blinkPeriod = 800
    readonly cellSize = { width: 12, height: 12 }

    private font: HTMLImageElement
    private ctx: CanvasRenderingContext2D | null

    /** Tile coordinate to display in the top-left. Not limited to the bounds of the board */
    scroll = { x: 0, y: 0 }

    private worldBounds = {
        origin: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
    }
    ready: Promise<any[]>
    booleanFont?: Uint8Array

    private pixelBuffer: ImageData
    private bytesPerGlyph: number

    constructor(
        public readonly canvas: HTMLCanvasElement,
        public readonly viewportSize: rect.Size = { width: 80, height: 25 },
        public readonly magnify = 1,
    ) {
        const { cellSize } = this

        document.body.style.backgroundColor = 'black'
        this.font = document.createElement('img')
        this.font.src = fontImage
        this.bytesPerGlyph = rect.area(cellSize)

        // Create display
        // TODO: support resizing the canvas to fit smaller screens, while
        // keeping aspect ratio
        canvas.width = cellSize.width * viewportSize.width
        canvas.height = cellSize.height * viewportSize.height
        canvas.style.backgroundColor = 'black'
        canvas.style.width = canvas.width * magnify + 'px'
        canvas.style.height = canvas.height * magnify + 'px'
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
        {
            width: backgroundWidth,
            height: backgroundHeight,
        }: Readonly<rect.Size>,
        background: Readonly<Uint8Array | Uint8ClampedArray>,
        sprites: Readonly<Sprite[]> = [],
        colors?: Readonly<Uint8Array | Uint8ClampedArray>,
        time?: number, // in ms
        border = COLOR_BG_BLACK,
    ) {
        // console.time('render')

        // TODO: modify this.offset if it would cause us to render subpixel tiles
        const {
            ctx,
            viewportSize: { width: viewportWidth, height: viewportHeight },
            cellSize: { height: cellHeight },
            worldBounds,
            booleanFont: font,
            pixelBuffer,
            blinkPeriod,
        } = this
        // worldBounds.size = { ...backgroundSize }
        worldBounds.size.width = backgroundWidth
        worldBounds.size.height = backgroundHeight
        invariant(ctx, 'No context')
        invariant(font, 'No font')

        const blinkCycle = BRIGHT_BACKGROUNDS
            ? false
            : !((((time || 0) / blinkPeriod) | 0) % 2)

        // const defaultPaletteEntry =

        // TODO: reimplement fractional scrolling, maybe
        this.scroll.x = Math.floor(this.scroll.x)
        this.scroll.y = Math.floor(this.scroll.y)
        const { x: scrollX, y: scrollY } = this.scroll

        // const offsetX = Math.floor(this.offset.x)
        // const offsetY = Math.floor(this.offset.y)
        // const fracX = (this.offset.x - offsetX) * dw
        // const fracY = (this.offset.y - offsetY) * dh

        const charBuffer = new Uint8Array(viewportWidth)
        const colorBuffer = new Uint8Array(viewportWidth)

        let outIdx = 0
        for (let cellY = 0; cellY < viewportHeight; cellY++) {
            const backgroundRowIdx = (cellY + scrollY) * backgroundWidth
            const validRow =
                cellY + scrollY >= 0 && cellY + scrollY < backgroundHeight

            const firstValid = -scrollX
            const lastValidExcl = Math.min(
                -scrollX + backgroundWidth,
                backgroundWidth,
            )

            // first, grab the whole array
            for (let x = 0; x < viewportWidth; x++) {
                const idx = backgroundRowIdx + scrollX + x
                const validIndex =
                    validRow && x >= firstValid && x < lastValidExcl

                charBuffer[x] = validIndex ? background[idx] : 0
                if (colors) {
                    colorBuffer[x] = validIndex ? colors[idx] : border
                }
            }

            // Get the whole row of
            for (let localY = 0; localY < cellHeight; localY++) {
                // Now draw all 12 pixel rows of this cell one row at a time
                for (let cellX = 0; cellX < viewportWidth; cellX++) {
                    outIdx = this.bltRow(
                        pixelBuffer.data,
                        outIdx,
                        charBuffer[cellX],
                        localY,
                        colorBuffer[cellX],
                        blinkCycle,
                    )
                }
            }
        }

        invariant(outIdx === pixelBuffer.data.length)

        const viewport = {
            origin: { x: 0, y: 0 },
            size: { width: viewportWidth, height: viewportHeight },
        }

        // Draw sprites
        let cellPos = { x: 0, y: 0 }
        for (let { x, y, char, color } of sprites) {
            cellPos.x = x - scrollX
            cellPos.y = y - scrollY

            if (rect.containsPoint(viewport, cellPos)) {
                this.bltChar(pixelBuffer.data, cellPos, char, color, blinkCycle)
            }
        }

        ctx.putImageData(pixelBuffer, 0, 0)

        // console.timeEnd('render')
    }

    private bltChar(
        outputBuffer: Uint8ClampedArray,
        { x: cellX, y: cellY }: GVec2,
        asciiCode: number,
        colorBits: number = COLOR_WHITE,
        blinkCycle: boolean = false,
    ) {
        // DONTYET: this causes overdraw
        const {
            canvas,
            bytesPerGlyph: fontBytesPerGlyph,
            booleanFont: font,
            viewportSize: { width: viewportWidth },
            cellSize,
        } = this

        let outIdx =
            Math.round(cellY * cellSize.height) * canvas.width * 4 +
            Math.round(cellX * cellSize.width) * 4

        for (let localY = 0; localY < cellSize.height; localY++) {
            this.bltRow(
                outputBuffer,
                outIdx,
                asciiCode,
                localY,
                colorBits,
                blinkCycle,
            )
            // move down by a Y
            outIdx += canvas.width * 4
        }
    }

    private bltRow(
        outputBuffer: Uint8ClampedArray,
        outputIdx: number,
        asciiCode: number,
        srcRow: number,
        colorBits: number = COLOR_WHITE,
        blinkCycle = false,
    ) {
        const {
            bytesPerGlyph: fontBytesPerGlyph,
            booleanFont: font,
            cellSize: { width: cellWidth },
        } = this
        // Assumption is that there is one byte per pixel
        const fontIdx = asciiCode * fontBytesPerGlyph + srcRow * cellWidth

        // Default to medium white on black
        const paletteIdx = colorBits * 6
        const hide = blinkCycle && colorBits & COLOR_BLINK

        // Now draw the row!
        for (let byte = 0; byte < cellWidth; byte++) {
            const solidPixel = !hide && !!font![fontIdx + byte]
            outputBuffer[outputIdx] = palette[paletteIdx + (solidPixel ? 0 : 3)]
            outputBuffer[outputIdx + 1] =
                palette[paletteIdx + (solidPixel ? 1 : 4)]
            outputBuffer[outputIdx + 2] =
                palette[paletteIdx + (solidPixel ? 2 : 5)]
            outputIdx += 4
        }
        return outputIdx
    }

    /**
     *
     * @param x An x coordinate within the canvas
     * @param y A y coordinate within the canvas
     * @returns {GVec2} The fractional background coordinate at the given pixel,
     * which may not be on the actual background */
    cellAtPixel(x: number, y: number): GVec2 {
        const {
            cellSize: { width, height },
            magnify,
            scroll,
        } = this

        return {
            x: (x - width) / width / magnify + scroll.x,
            y: (y - height) / height / magnify + scroll.y,
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
