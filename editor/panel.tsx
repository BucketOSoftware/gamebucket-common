import {
    ChevronDownIcon,
    ChevronUpIcon,
    ScreenFullIcon,
    ScreenNormalIcon,
    SidebarCollapseIcon,
    SidebarExpandIcon,
    XIcon,
} from '@primer/octicons-react'
import { Box, ButtonGroup, Heading, IconButton } from '@primer/react'
import { PropsWithChildren } from 'preact/compat'
import { useState } from 'preact/hooks'

/*
  color: ${get('colors.fg.muted')};
  padding: ${get('space.2')};
  */
// const CloseButton: React.FC<React.PropsWithChildren<{onClose: () => void}>> = ({onClose}) => {
//   return (
//   )
// }
export function Panel(
    props: {
        title: string
        manspread?: boolean
        basis?: number | string
        expandable?: boolean
        onClose?: () => void
    } & PropsWithChildren,
) {
    const { manspread, expandable, title, children, basis, onClose } = props
    const [expanded, setExpanded] = useState(false)

    return (
        <Box
            as="section"
            sx={{
                backgroundColor: 'neutral.subtle', //'hsla(177, 33%, 90%, 0.9)',
                backdropFilter: 'contrast(25%) brightness(175%) blur(2px)',
                borderRadius: 2,

                minWidth: '256px',
                flexGrow: manspread || expanded ? 1 : 0,
                flexShrink: manspread ? (expanded ? 0 : 1) : 0,
                flexBasis: expanded ? '100%' : basis,
                overflowY: 'scroll',

                // children layout
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <PanelHeader
                expanded={expanded}
                title={title}
                onSetExpanded={expandable ? setExpanded : undefined}
                onClose={onClose}
            />

            {children}
        </Box>
    )
}

function PanelHeader(props: {
    expanded: boolean
    onSetExpanded?: (expanded: boolean) => void
    title: string
    onClose?: () => void
}) {
    const { expanded, onSetExpanded, title, onClose } = props

    return (
        <Box
            display="flex"
            alignItems="center"
            px={2}
            py={1}
            flexShrink={0}
            boxShadow="panelSection"
            backgroundColor="neutral.subtle"
        >
            <Heading
                sx={{ px: 1, fontSize: 3, color: 'accent.fg', flexGrow: 1 }}
            >
                {title}
            </Heading>
            <ButtonGroup>
                {/* TODO: don't show this button if it wouldn't do anything */}
                {onSetExpanded && (
                    <IconButton
                        icon={expanded ? ScreenFullIcon : ScreenNormalIcon}
                        aria-label="Expand"
                        variant="invisible"
                        size="small"
                        sx={{ transform: 'rotate(90deg)' }}
                        onClick={() => onSetExpanded(!expanded)}
                    />
                )}
                {onClose && <PanelCloseButton onClick={onClose} />}
            </ButtonGroup>
        </Box>
    )
}
export function PanelBody({ children }: PropsWithChildren) {
    return (
        <Box my={2} px={3} overflowY="scroll">
            {children}
        </Box>
    )
}
function PanelCloseButton({ onClick }: { onClick: () => void }) {
    return (
        <IconButton
            icon={XIcon}
            aria-label="Close"
            variant="invisible"
            size="small"
            onClick={onClick}
        />
    )
}
