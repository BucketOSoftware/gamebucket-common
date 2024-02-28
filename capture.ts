import { downloadWithMime, CanvasRecorderOpts } from '@thi.ng/dl-asset'

// Depending on the browser, the video produced may not be seekable or in a widely available format. You can transcode it with ffmpeg:
//
// `ffmpeg -i 'input_video.webm' -vcodec libx264 -crf 20 'output_video.mp4' `


// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter
// https://stackoverflow.com/a/42307926/72141
const videoTypes = ['webm', 'mp4', 'ogg', 'mpeg']
// const audioTypes = ['webm', 'ogg', 'mp3', 'mpeg']
const codecs = [
    'vp9',
    'vp8',
    'avc1.4d002a',
    'avc1',
    'av1',
    // Not well supported?
    // 'h265',
    // 'h.265',
    'h264',
    'h.264',
    'opus',
    'pcm',
    'aac',
    'mpeg',
    'mp4a',
    '',
]

// https://stackoverflow.com/a/43053803/72141
type MapCartesian<T extends any[][]> = {
    [P in keyof T]: T[P] extends Array<infer U> ? U : never
}
const cartesianProduct =
    <T extends any[][]>(...collections: T): MapCartesian<T>[] =>
        collections.reduce(
            (a, b) => a.flatMap(
                d => b.map(
                    e => [d, e].flat()
                )
            )
        )


function determineBestCodec() {
    // TODO: "vp8, ogg" or whatever audio and video codec?
    const mimeTypesWithVariations = cartesianProduct(
        videoTypes,
        codecs /*.flatMap((codec) => [codec, codec.toUpperCase()]) */,
    )

    return mimeTypesWithVariations
        .map(([mime, codecs]) => `video/${mime};codecs=${codecs}`)
        .find((mime) => MediaRecorder.isTypeSupported(mime))
}

function extension(mimeType: string | undefined) {
    if (!mimeType) {
        // TODO: if we can't figure out a mime type, what file extension should we use?
        return '.bin'
    }
    return mimeType.split(';')[0].split('/')[1]
}

/// Convert minutes to miliseconds
function toMiliseconds(minutes: number) {
    return minutes * 60 * 1000
}

/** Takes a canvas, captures video from it, and downloads the resulting video
 * in the best video format supported by the browser when done.
 *
 * @todo Does this need to be a class? */
export default class Capture {
    private recorder: MediaRecorder | undefined
    private canvas: HTMLCanvasElement | undefined
    private startTime: Date | undefined
    private bestCodec: string | undefined

    get isRecording() {
        return this.recorder?.state === 'recording'
    }

    /** How long the capture has been going on so far, in seconds */
    get duration() {
        if (this.startTime) {
            const ms = +new Date() - +this.startTime!
            return Math.floor(ms / 1000)
        } else {
            return 0
        }
    }

    /**
     * Start the recording or stop and save the recording. The arguments are
     * required but have no effect when stopping.
     * @param canvas The canvas to capture from
     * @param filePrefix A string to form the beginning of the video filename
     */
    toggleRecording(canvas: HTMLCanvasElement, filePrefix = 'capture') {
        const { recorder } = this
        if (!recorder) {
            if (!this.bestCodec) {
                this.bestCodec = determineBestCodec()
            }

            this.startTime = new Date()

            const localDate = new Date(
                this.startTime.getTime() -
                    toMiliseconds(this.startTime.getTimezoneOffset()),
            )

            const mimeType = this.bestCodec || '' // we think/hope `unassigned` will mean "dealer's choice"
            const fileName = `${filePrefix}_${localDate.toISOString()}.${extension(
                mimeType,
            )}`

            // We don't specify a frame rate, which seems to result in the best quality
            const stream = canvas.captureStream()

            // TODO: optimize bitrate
            // https://www.reddit.com/r/gfycat/comments/3pm7cn/optimizing_webm_bitrate_questions/
            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 10_000_000,
            })

            let blobs: Blob[] = []
            // TODO: Based on what this function does, we should only get a single blob, but the MediaRecorder could deliver more than one if we specify a 'timeslice' so we should support >1 blob
            // https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    blobs.push(e.data)
                    downloadWithMime(
                        fileName,
                        new Blob(blobs, { type: mimeType }),
                        { mime: mimeType },
                    )
                    blobs = []
                }
            }

            console.log(
                'Recording started [%s, %d bps]',
                mimeType,
                recorder.videoBitsPerSecond + recorder.audioBitsPerSecond,
            )

            this.recorder = recorder

            requestIdleCallback(() => this.showTimeDisplay())
            recorder.start()
        } else {
            recorder.stop()
            // TODO: reuse recorder
            this.recorder = undefined
            console.log('Recording stopped')
        }
    }

    formattedDuration() {
        const dur = this.duration
        const min = (dur / 60) | 0
        const sec = dur % 60

        return ('' + min) + ':' + ('' + sec).padStart(2, '0')
    }

    showTimeDisplay() {
        const ele = document.createElement('div')
        ele.className = 'capture-readout'
        ele.style.color = 'hsl(0, 90%, 60%)'
        ele.style.backgroundColor = 'hsla(0, 0%, 0%, 66%)'
        ele.style.position = 'absolute'
        ele.style.zIndex = '1000000'
        ele.style.right = '1rem'
        ele.style.top = '1rem'
        ele.style.padding = '0.5rem'
        ele.style.borderRadius = '0.5rem'
        ele.style.fontSize = '1.2rem'
        ele.style.fontFamily = '"Overpass Mono", Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, monospace'
        ele.style.fontWeight = 'bold'

        ele.innerText = "⏺ 0:00"// + this.formattedDuration()
        document.body.appendChild(ele)

        const update = () => {
            if (this.recorder) {
                ele.innerText = "⏺ " + this.formattedDuration()
                requestIdleCallback(update)
            } else {
                ele.remove()
            }
        }
        requestIdleCallback(update)
    }
}
