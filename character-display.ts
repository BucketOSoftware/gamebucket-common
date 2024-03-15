import { GVec2, grid, rect } from 'gamebucket'
import invariant from 'tiny-invariant'
import fontImage from './font-12x12'

export default class CharacterDisplay {
    private font: HTMLImageElement
    ctx: CanvasRenderingContext2D | null
    offset = { x: 0, y: 0 }

    readonly cellSize = { width: 12, height: 12 }

    private worldBounds = {
        origin: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
    }

    constructor(
        public readonly canvas: HTMLCanvasElement,
        public viewportSize: rect.Size = { width: 80, height: 25 },
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

        this.ctx = canvas.getContext('2d', { alpha: false })
    }

    render(
        buffer: Readonly<Uint8Array | Uint8ClampedArray>,
        bufferSize: Readonly<rect.Size>,
    ) {
        // TODO: modify this.offset if it would cause us to render subpixel tiles
        const { ctx, viewportSize, cellSize, worldBounds, font } = this
        worldBounds.size = { ...bufferSize }
        invariant(ctx, 'No context')

        ctx.imageSmoothingEnabled = false
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        const bgColors = ['hsl(240 50% 33%)', 'hsl(00 50% 25%)']

        const sw = cellSize.width
        const sh = cellSize.height
        const dw = sw
        const dh = sh

        const offsetX = Math.floor(this.offset.x)
        const offsetY = Math.floor(this.offset.y)
        const fracX = (this.offset.x - offsetX) * dw
        const fracY = (this.offset.y - offsetY) * dh

        // start drawing from offset
        for (let y = 0; y < viewportSize.height + 1; y++) {
            for (let x = 0; x < viewportSize.width + 1; x++) {
                const bufferCoord = {
                    x: x + offsetX,
                    y: y + offsetY,
                }

                if (rect.containsPoint(worldBounds, bufferCoord)) {
                    // get an index into the buffer
                    const idx = grid.toIdx(
                        bufferCoord.x,
                        bufferCoord.y,
                        bufferSize.width,
                    )
                    invariant(idx < buffer.length)
                    // look up the ASCII character in the bitmap
                    const glyphCoord = grid.toCoord(buffer[idx], 16)

                    // checkerboard the background
                    ctx.fillStyle =
                        bgColors[
                            bufferCoord.y % 2
                                ? bufferCoord.x % 2
                                : (bufferCoord.x + 1) % 2
                        ]
                    ctx.fillRect(x * dw - fracX, y * dh - fracY, dw, dh)

                    ctx.drawImage(
                        font,
                        glyphCoord.x * sw,
                        glyphCoord.y * sh,
                        sw,
                        sh,
                        x * dw - fracX,
                        y * dh - fracY,
                        dw,
                        dh,
                    )
                }
            }
        }

        // console.timeEnd('render')
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
