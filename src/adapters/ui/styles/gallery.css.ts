import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const entryButton = style({
  position: 'fixed',
  bottom: 280,
  left: 10,
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: vars.color.overlayBg,
  backdropFilter: 'blur(8px)',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  pointerEvents: 'auto',
  padding: 0,
  transition: 'transform 0.2s ease, background 0.2s ease',
  color: vars.color.textSubtle,
  ':hover': {
    transform: 'scale(1.1)',
    color: vars.color.text,
  },
})

export const overlayContainer = style({
  position: 'fixed',
  top: 92,
  right: 10,
  bottom: 66,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  zIndex: 1000,
  pointerEvents: 'none',
  fontFamily: vars.font.family,
  userSelect: 'none',
})

export const topBar = style({
  position: 'fixed',
  top: 52,
  left: 10,
  right: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  background: vars.color.overlayBg,
  backdropFilter: 'blur(8px)',
  borderRadius: 10,
  zIndex: 1000,
  pointerEvents: 'auto',
  userSelect: 'none',
  fontFamily: vars.font.family,
})

export const topBarTitle = style({
  fontSize: 16,
  fontWeight: 600,
  color: vars.color.textSubtle,
  marginRight: 'auto',
})

export const modeTab = style({
  fontSize: 12,
  padding: '4px 10px',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  background: 'transparent',
  color: vars.color.textMuted,
  transition: 'background 0.15s ease, color 0.15s ease',
  pointerEvents: 'auto',
  ':hover': {
    background: vars.color.surfaceHover,
    color: vars.color.text,
  },
})

export const modeTabActive = style({
  background: vars.color.surfaceActive,
  color: vars.color.text,
})

export const sideList = style({
  flex: 1,
  overflowY: 'auto',
  padding: '12px 0 4px',
  background: vars.color.overlayBg,
  backdropFilter: 'blur(8px)',
  borderRadius: 10,
  marginTop: 4,
  pointerEvents: 'auto',
  width: 110,
})

export const listItem = style({
  display: 'block',
  width: '100%',
  padding: '7px 12px',
  border: 'none',
  background: 'transparent',
  color: vars.color.textSecondary,
  fontSize: 14,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'background 0.12s ease, color 0.12s ease',
  ':hover': {
    background: vars.color.surfaceHover,
    color: vars.color.text,
  },
})

export const listItemActive = style({
  background: vars.color.surfaceActive,
  color: vars.color.text,
})

export const infoBar = style({
  position: 'fixed',
  bottom: 10,
  left: 10,
  right: 10,
  padding: '8px 14px',
  background: vars.color.overlayBg,
  backdropFilter: 'blur(8px)',
  borderRadius: 10,
  fontSize: 12,
  color: vars.color.textMuted,
  zIndex: 1000,
  pointerEvents: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
})

export const infoRow = style({
  display: 'flex',
  gap: 16,
})

export const infoLabel = style({
  color: vars.color.textSubtle,
  fontWeight: 600,
})

export const infoValue = style({
  color: vars.color.textSecondary,
})
