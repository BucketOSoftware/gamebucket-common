import ow from 'ow'
import lipsum from './lipsum.txt?raw'
import type Smashboard from '../smashboard'

export type CommandHandler<S, CV extends object> =
    (console: ConsoleController<S, CV>, ...args: string[]) => HTMLElement | string | void

export const MethodMissing: symbol = Symbol.for('METHOD_MISSING')

export class ConsoleController<S, CV extends object> {

    // Bookmarks
    private input: HTMLInputElement
    private momentary: HTMLElement
    private appendLog: HTMLElement

    /** @todo figure out how fast this needs to be to feel responsive */
    private typeHandlerTimeout: IdleRequestOptions = { timeout: 250 }
    private typeHandlerPending = false
    private inputLastEvent?: InputEvent = undefined
    private commandHandlers: Record<string | typeof MethodMissing, CommandHandler<S, CV>> = {
        [MethodMissing]: (c, cmd) => c.error("Unrecognized command", cmd),
    }
    // TODO: types
    private typeHandlers: Record<string | typeof MethodMissing, CommandHandler<S, CV>> = {
        [MethodMissing]: () => { }
    }


    constructor(
        public readonly domElement: HTMLElement,
        public readonly dashboard: Smashboard<S, CV>
    ) {
        this.input = domElement.querySelector<HTMLInputElement>('.console-section input[type=text]')!

        this.momentary = domElement.querySelector<HTMLElement>('.console-momentary')!
        this.appendLog = domElement.querySelector<HTMLElement>('.console-append-log')!

    }

    init() {
        this.addBuiltinCommands()
        this.attachEvents()
    }

    private attachEvents() {
        const { domElement, input } = this

        // Listen for clicks within the console display
        domElement.addEventListener('click', (ev: MouseEvent) => {
            const a = ev.target! as HTMLElement
            const cmd = a.dataset.clickCommand

            if (cmd) {
                console.debug("Clicked:", cmd)
                this.handleCommand(cmd)
                ev.preventDefault()
                return
            }

            // Must be a regular link?
        })

        const form = domElement.querySelector('form')!
        // User hits "enter" in the console
        form.addEventListener('submit', (ev: any) => {
            ev.preventDefault()
            ow(this.input === ev.target.elements[0], ow.boolean.true)

            const inputString = this.input.value.trim()
            this.echo(inputString)
            this.handleCommand(inputString)
            this.input.value = ''
        })

        // User types something in the console
        input.addEventListener('input', (ev) => {
            this.inputLastEvent = (ev as InputEvent)
            if (!this.typeHandlerPending) {
                // console.time('typeHandlerWait')
                // TODO: maybe use ev.data to check for actual changes and skip if nothing has changed
                this.typeHandlerPending = true
                requestIdleCallback(this.handleConsoleInput, this.typeHandlerTimeout)
            }
            ev.preventDefault()
        }, { capture: true })

    }

    refresh() {
        this.updateMomentaryConsole()
    }

    focusInput() {
        this.input.focus()
    }

    /**
     * 
     * @param html HTML to show in the momentary console, or undefined to switch back to the append log
     * @returns 
     */
    private setConsoleMomentary(html?: string | HTMLElement | void) {
        const { momentary, appendLog } = this

        if (!html) {
            momentary.classList.add('hidden')
            appendLog.classList.remove('hidden')
            return
        }

        momentary.classList.remove('hidden')
        appendLog.classList.add('hidden')
        if (typeof html === 'string') {
            momentary.innerHTML = html
        }
    }


    private log(items: { toString: () => string }[], level = 'loglevel-info') {
        const node = document.createElement('div')
        node.innerText = items.join(' ')
        node.className = level
        this.appendLog?.appendChild(node)

        return node
    }

    private echo(cmdline: string) {
        return this.log([cmdline], 'loglevel-echo')
    }

    info(...items: { toString: () => string }[]) {
        console.log(...items)
        return this.log(items)
    }

    warn(...items: { toString: () => string }[]) {
        console.warn(...items)
        return this.log(items, 'loglevel-warning')
    }

    error(...items: { toString: () => string }[]) {
        console.error(...items)
        return this.log(items, 'loglevel-error')
    }


    /////
    // Command handling
    /////

    addCommandHandler(command: string, submitHandler?: CommandHandler<S, CV>, typeHandler?: CommandHandler<S, CV>) {
        const { commandHandlers } = this
        if (command in commandHandlers) {
            this.warn("Overriding command", command)
        }

        if (submitHandler) {
            commandHandlers[command] = submitHandler
        }

        if (typeHandler) {
            this.typeHandlers[command] = typeHandler
        }
    }

    setDefaultHandler(methodMissing: CommandHandler<S, CV>) { }

    private addBuiltinCommands() {
        // this.addCommandHandler('color', this.cmdColors)
        this.addCommandHandler('lipsum', (c) => c.info(lipsum))
    }

    private handleCommand(inputString: string) {
        const argv = parseCommand(inputString)
        const cmd = this.guessCommand(argv[0])

        let output: HTMLElement | string | void

        const handler = this.commandHandlers[cmd] ?? this.commandHandlers[MethodMissing]
        ow(handler, ow.function)

        try {
            output = handler(this, ...argv)
        } catch (e: any) {
            output = this.error(e as any)
        }

        if (typeof output === 'string') {
            output = this.info(output)
        }

        output ??= this.error('No output from command')

        // since it's a direct response to user input, make sure they can see the output
        this.setConsoleMomentary()
        output.scrollIntoView({
            behavior: 'smooth',
            block: "start",
            inline: "nearest"
        })
    }

    private handleConsoleInput = (_deadline: IdleDeadline) => {
        // console.timeEnd('typeHandlerWait')
        ow(this.typeHandlerPending, ow.boolean.true)
        this.typeHandlerPending = false

        // ow(this.consoleInput === this.inputLastEvent?.target, ow.boolean.true)
        // console.time('updateConsole')
        this.updateMomentaryConsole()
        // console.timeEnd('updateConsole')
    }

    private updateMomentaryConsole() {
        const { input } = this
        const argv = parseCommand(input.value)
        const cmd = this.guessCommand(argv[0])

        const handler = this.typeHandlers[cmd] ?? this.typeHandlers[MethodMissing]
        ow(handler, ow.function)
        this.setConsoleMomentary(handler(this, ...argv))
    }


    private guessCommand(cmd: string) {
        // TODO: maybe memoize
        const commands = Object.keys(this.commandHandlers)
        cmd = cmd.toLowerCase()
        if (cmd in commands) {
            return cmd
        }

        // Find out if this string uniquely identifies a command
        const matches = commands.filter(potentialCmd => potentialCmd.startsWith(cmd))
        if (matches.length === 1) {
            return matches[0]
        }

        // nothing found
        return cmd
    }

}

function parseCommand(input: string = '') {
    return input.trim().split(/\s+/)
}
