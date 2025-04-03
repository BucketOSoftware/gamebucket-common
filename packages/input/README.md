# @gamebucket/input

Input handling for games and interactive apps.

<span style="color:red"><b>Note:</b> this is a work in progress!</span> The API is likely to have breaking changes between versions. Please give it a try and leave a GitHub issue if you find something that needs work.

## Getting Started

### Install

```console
npm install @gamebucket/input
```

### Usage

```js
import { Input, keys, gamepad } from '@gamebucket/input'

// Create the input manager and pass in the mapping, which is an array of 2-
// tuples that map inputs to app-specific intents. You can change the mapping
// at any time by assigning to input.mapping, but TypeScript can infer the
// list of valid intents from what you pass in here.
const input = new Input([
    [Input.keys.Space, 'Jump'],
    [[Input.keys.ArrowUp, Input.keys.ArrowDown], 'WalkY'],
    [[Input.keys.ArrowLeft, Input.keys.ArrowRight], 'WalkX'],
    [Input.gamepad.standard.buttons.RightBottom, 'Jump'],
    [Input.gamepad.standard.axes.LeftStickX, 'WalkX'],
    [Input.gamepad.standard.axes.LeftStickY, 'WalkY'],
])

// Attach event listeners to the given element, typically a canvas. The element
// is mostly relevant to pointer events, as keyboard and gamepad inputs will be
// captured regardless of what element has focus.
input.attach(document.getElementsByTagName('canvas')[0])

// In your update loop:
requestAnimationFrame(loop)
function loop(t) {
    requestAnimationFrame(loop)

    // Poll devices and handle events received since the last call to readDevices()
    input.readDevices()

    // jump will be true if the player pressed the space bar or the "A" button
    // since the last call to readDevices()
    let jump = input.recentlyActivated('Jump')

    // jumpDuration will be the length of time the player has been holding
    // "Jump" if it is at least 30 milliseconds, otherwise 0.
    let jumpDuration = input.heldDuration('Jump', t, 30)

    // dx will be the value of the "WalkX" axis, normalized to the range [-1,1].
    let dx = input.getValue('WalkX')

    // The same APIs can be used for axes and buttons
    if (input.heldDuration('WalkX', t, 10_000)) {
        console.log('Time to take a break')
    }

    // Mouse inputs are current directly attached to the input object. They are
    // updated on each call to readDevices()
    scroll += input.mouseWheelDelta.y
}
```

### Compatibility

The library uses [PointerEvents](https://caniuse.com/pointer) and the
[code property of KeyboardEvent](https://caniuse.com/keyboardevent-code), so it
should work fully on most desktop browsers since 2020; mobile support is iffy.

## License

Mozilla Public License 2.0
