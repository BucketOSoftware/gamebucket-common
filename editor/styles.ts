import { theme as defaultTheme } from '@primer/react'
import deepmerge from 'deepmerge'
import { createGlobalStyle } from 'styled-components'
import * as styles from './styles'

export const GlobalStyles = createGlobalStyle`
  #gbk-editor {
  }
`

export const theme = deepmerge(defaultTheme, {
    fonts: {
        normal: "'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif",
        mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
    },
    // sizes: {
    // sidebar: '256px',
    // },
    colorSchemes: {
        light: {
            colors: {
                actionListItem: {
                    default: {
                        // same as the light theme default values with the opacity dialed up. could probably do that programmatically
                        hoverBg: 'rgba(208, 215, 222, 1)',
                        selectedBg: 'rgba(208, 215, 222, 0.72)',
                    },
                },
                overlay: {
                    backdrop: 'red',
                },
            },
            shadows: {
                panelSection:
                    '0 1px 0 ' +
                    defaultTheme.colorSchemes.light.colors.fg!.muted, //rgb(101 109 118, 0.5)',
            },
        },
    },
})
console.debug('theme', theme)

export const sidebar = {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',

    top: styles.theme.space[1],
    bottom: styles.theme.space[1],
    left: styles.theme.space[1],
    gap: styles.theme.space[1],

    transform: 'perspective(1000px) rotate3d(0, 1, 0, 10deg)',
    transformOrigin: 'left',
}
/*
export const panel = {
    backgroundColor: 'neutral.subtle', //'hsla(177, 33%, 90%, 0.9)',
    backdropFilter: 'contrast(25%) brightness(175%) blur(2px)',
    borderRadius: 2,
    overflowY: 'scroll',

    minWidth: '256px',
    // pl: 3,
    // pr: 2,
    // py: 2,
}
*/