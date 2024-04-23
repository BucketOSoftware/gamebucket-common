import { GVec2, ZVec2, clamp, grid, rect, roundBy, ZMatrix3 } from 'gamebucket'
import invariant from 'tiny-invariant'
import fontImage from './font-12x12'

/*
// WebGL renderer

1. pass in:
    * background tiles
    * background colors,
    * scroll (which tile is in the top left corner)
    * sprite attributes: which palette to use (for 1-bit, each color is a palette?)
    * palettes (as a LUT texture?)
    * font cell size in (pixels? % of texture?)
2. render the whole background into a texture (?, if it's big enough?) by blitting from the font texture
3. render that texture to the screen using scroll and clipping info
4. and then I guess the individual glyphs, but should they be done as a big screen again?
*/

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
    const intensityBg = intensityMed

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

interface Options {
    viewportSize: rect.Size
    backgroundSize: rect.Size
    magnify: number
    tryGL: boolean
    // font: string | HTMLImageElement
    // glyphSize:
}

/**
 * We end up dealing with different coordinate systems when dealing with this,
 * so let's get the terminology straight:
 *  - NORMALIZED coordinates represent a point in the viewport, [0..1) in both
 *    directions.
 *  - CELL coordinates represent a point on the screen in fractional cells. [0...viewportSize)
 *    Not affected by scroll.
 *  - SCREEN coordinates are pixel coordinates on the canvas, used for drawing.
 *  - WORLD coordinates represent a point in the world in fractional cells.
 *    The coordinates of the top-left cell is anything from [0,1). If we want to
 *    be clear that we're referring to the entire cell, make a
 *    rect out of the Math.floor() of the coordinates and a width/height of 1.
 *    These coordinates are the only ones that are relative to the world, not
 *    the screen!
 *
 */
export default class CharacterDisplay {
    // TODO?: Is this accurate?
    readonly blinkPeriod = 800
    readonly cellSize = { width: 12, height: 12 }

    private font: HTMLImageElement

    private drawTarget!: HTMLCanvasElement
    private ctx!: CanvasRenderingContext2D
    private pixelBuffer!: ImageData

    /** Tile coordinate to display in the top-left. Not limited to the bounds of the board */
    scroll = { x: 0, y: 0 }

    private worldBounds = rect.build(0, 0, 0, 0)
    ready: Promise<any[]>
    booleanFont?: Uint8Array

    private bytesPerGlyph: number

    public readonly viewportSize: rect.Size
    private bgSize!: rect.Size
    public readonly magnify: number

    tiles!: Uint8Array
    colors!: Uint8Array
    sprites: Sprite[] = []

    constructor(
        canvas: HTMLCanvasElement,
        public readonly options: Partial<Options>,
    ) {
        this.viewportSize = options.viewportSize ?? { width: 80, height: 25 }
        this.resizeBackground(
            options.backgroundSize ?? {
                width: 80,
                height: 25,
            },
        )

        this.magnify = options.magnify ?? 1

        const tryGL = options.tryGL ?? true

        const { cellSize } = this

        this.font = document.createElement('img')
        this.font.src = fontImage
        this.bytesPerGlyph = rect.area(cellSize)

        // Create display
        this.canvas = canvas
        // TODO: support resizing the canvas to fit smaller screens, while
        // keeping aspect ratio
        // this.setCanvas(canvas)

        this.ready = Promise.all([
            extractMonoFont(this.font, {
                width: 12,
                height: 12,
            }).then((ary) => {
                this.booleanFont = ary
                return ary
            }),
            // TODO: switch to GL
            // getDrawContext(tryGL).then(() => {
            // })
        ])
    }

    get canvas() {
        return this.drawTarget
    }

    set canvas(canvas: HTMLCanvasElement) {
        invariant(canvas)

        this.drawTarget = canvas
        // this.cellSize = cellSize
        const w = this.cellSize.width * this.viewportSize.width
        const h = this.cellSize.height * this.viewportSize.height
        canvas.width = w
        canvas.height = h
        canvas.style.backgroundColor = 'black'
        if (false) {
            // TODO
            canvas.style.width = w * this.magnify + 'px'
            canvas.style.height = h * this.magnify + 'px'
        }
        canvas.style.imageRendering = 'pixelated'
        canvas.style.margin = '0 auto'
        canvas.style.position = 'inherit'
        canvas.style.display = 'block'

        this.pixelBuffer = new ImageData(canvas.width, canvas.height)
        this.pixelBuffer.data.fill(255)

        this.ctx = canvas.getContext('2d', { alpha: false })!
        invariant(this.ctx, "Couldn't get a drawing context")
    }

    get backgroundSize() {
        return { ...this.worldBounds }
    }

    resizeBackground(size: rect.Size) {
        this.worldBounds.width = size.width
        this.worldBounds.height = size.height

        const bytesPerArray = rect.area(size)
        const buffer = new ArrayBuffer(bytesPerArray * 2)
        this.tiles = new Uint8Array(buffer, 0, bytesPerArray)
        this.colors = new Uint8Array(buffer, bytesPerArray, bytesPerArray)
        this.colors.fill(COLOR_WHITE)
    }

    normalizedToCell(norm: GVec2, out: GVec2 = { x: 0, y: 0 }) {
        out.x = norm.x * this.viewportSize.width
        out.y = norm.y * this.viewportSize.height
        return out
    }

    normalizedToScreen(norm: GVec2, out: GVec2 = { x: 0, y: 0 }) {
        out.x = norm.x * this.viewportSize.width * this.cellSize.width
        out.y = norm.y * this.viewportSize.height * this.cellSize.height
        return out
    }

    normalizedToWorld(norm: GVec2, out: GVec2 = { x: 0, y: 0 }) {
        out.x = norm.x * this.viewportSize.width + this.scroll.x
        out.y = norm.y * this.viewportSize.height + this.scroll.y
        return out
    }

    /** given two points, return the smallest rect in aligned world coordinates
     * that contains both points. If both points are the same return a rect of
     * size 1,1 */
    normalizedCornersToWorld(
        a_norm: GVec2,
        b_norm: GVec2,
        out: rect.Rect = { x: 0, y: 0, width: 0, height: 0 },
    ): rect.Rect {
        const { x: ax, y: ay } = this.normalizedToWorld({
            x: clamp(a_norm.x, 0, 1),
            y: clamp(a_norm.y, 0, 1),
        })
        const { x: bx, y: by } = this.normalizedToWorld({
            x: clamp(b_norm.x, 0, 1),
            y: clamp(b_norm.y, 0, 1),
        })

        rect.fromCorners(
            Math.floor(Math.min(ax, bx)),
            Math.floor(Math.min(ay, by)),
            Math.ceil(Math.max(ax, bx)),
            Math.ceil(Math.max(ay, by)),
            out,
        )
        return out
    }

    cellToScreen(cell: GVec2, out: GVec2 = { x: 0, y: 0 }) {
        out.x = cell.x * this.cellSize.width
        out.y = cell.y * this.cellSize.height
        return out
    }

    cellToWorld(cell: GVec2, out: GVec2 = { x: 0, y: 0 }) {
        out.x = cell.x + this.scroll.x
        out.y = cell.y + this.scroll.y
        return out
    }

    /** Turn a tile coordinate in world space into a pixel coordinate */
    worldToScreen(world: GVec2, out: GVec2 = { x: 0, y: 0 }) {
        out.x = (world.x - this.scroll.x) * this.cellSize.width
        out.y = (world.y - this.scroll.y) * this.cellSize.height

        return out
    }

    setMagnify(magnify: number) {
        const canvas = this.drawTarget
        canvas.style.width = canvas.width * this.magnify + 'px'
        canvas.style.height = canvas.height * this.magnify + 'px'
    }

    /** Scroll the given point into the center of the screen, clipped against renderable area */
    centerView(target: GVec2) {
        const { scroll, viewportSize, worldBounds } = this
        let { x, y } = scroll

        x = target.x - viewportSize.width / 2
        y = target.y - viewportSize.height / 2

        x = clamp(x, worldBounds.x, worldBounds.width - viewportSize.width)
        y = clamp(y, worldBounds.y, worldBounds.height - viewportSize.height)

        scroll.x = x
        scroll.y = y
    }

    scrollIntoView(p: GVec2, margin: GVec2 = { x: 0, y: 0 }) {
        const { scroll, viewportSize, worldBounds } = this

        let { x, y } = scroll
        // if point is too far to the left
        x = Math.min(x, p.x - margin.x)
        // if point is too far to the right
        // we need the x coordinate rather than one beyond it, so add 1
        x = Math.max(x, p.x + margin.x + 1 - viewportSize.width)

        // and again, with the y coordinate
        y = Math.min(y, p.y - margin.y)
        y = Math.max(y, p.y + margin.y + 1 - viewportSize.height)

        // don't go outside the renderable area
        x = clamp(x, worldBounds.x, worldBounds.width - viewportSize.width)
        y = clamp(y, worldBounds.y, worldBounds.height - viewportSize.height)

        // TODO: fractional scrolling
        scroll.x = x
        scroll.y = y
    }

    render(
        time?: number, // in ms
        border = COLOR_BG_BLACK,
    ) {
        // console.time('render')

        // TODO: modify this.scroll if it would cause us to render subpixel tiles
        const {
            ctx,
            worldBounds,
            viewportSize: { width: viewportWidth, height: viewportHeight },
            cellSize: { height: cellHeight },
            booleanFont: font,
            pixelBuffer,
            blinkPeriod,
            tiles,
            colors,
            sprites,
        } = this
        invariant(ctx, 'No context')
        invariant(font, 'No font')

        const blinkCycle = BRIGHT_BACKGROUNDS
            ? false
            : !((((time || 0) / blinkPeriod) | 0) % 2)

        // TODO: reimplement fractional scrolling, maybe
        this.scroll.x = roundBy(this.scroll.x, 1 / 12)
        this.scroll.y = roundBy(this.scroll.y, 1 / 12)
        const { x: scrollX, y: scrollY } = this.scroll

        // const offsetX = roundBy(this.offset.x)
        // const offsetY = Math.floor(this.offset.y)
        // const fracX = (this.offset.x - offsetX) * dw
        // const fracY = (this.offset.y - offsetY) * dh

        const charBuffer = new Uint8Array(viewportWidth)
        const colorBuffer = new Uint8Array(viewportWidth)

        let outIdx = 0
        let cellY = 0
        for (cellY = 0; cellY < viewportHeight; cellY++) {
            const backgroundRowIdx = (cellY + scrollY) * worldBounds.width
            const validRow =
                cellY + scrollY >= 0 && cellY + scrollY < worldBounds.height

            const firstValid = -scrollX
            const lastValidExcl = Math.min(
                -scrollX + worldBounds.width,
                worldBounds.width,
            )

            // first, grab the whole array
            for (let x = 0; x < viewportWidth; x++) {
                const idx = backgroundRowIdx + scrollX + x
                const validIndex =
                    validRow && x >= firstValid && x < lastValidExcl

                charBuffer[x] = validIndex ? tiles[idx] : 0
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

        const viewport = rect.build(0, 0, viewportWidth, viewportHeight)

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
}

// Stuff that doesn't need to be in the class

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
