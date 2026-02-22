import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'


export const overlay = style({
  position: 'fixed',
  top: 20,
  left: 10,
  right: 10,
  background: vars.color.overlayBg,
  color: vars.color.text,
  borderRadius: 12,
  padding: '56px 12px 24px 14px',
  fontFamily: vars.font.family,
  textAlign: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(8px)',
  userSelect: 'none',
  pointerEvents: 'none',
  transition: 'background 0.3s ease',
})

export const overlayExpanded = style({
  bottom: 112,
})

export const title = style({
  pointerEvents: 'auto',
  position: 'absolute',
  top: 32,
  left: 16,
  right: 16,
  transform: 'translateY(-50%)',
  fontWeight: 600,
  color: vars.color.textSubtle,
  textAlign: 'left',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
})

export const overlayCompact = style({
  position: 'fixed',
  top: 12,
  left: 10,
  right: 10,
  background: vars.color.overlayBg,
  color: vars.color.text,
  borderRadius: 10,
  padding: '8px 14px',
  fontFamily: vars.font.family,
  textAlign: 'left',
  zIndex: 1000,
  backdropFilter: 'blur(8px)',
  userSelect: 'none',
  pointerEvents: 'none',
  transition: 'background 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
})

export const compactTitle = style({
  fontSize: 18,
  fontWeight: 600,
  color: vars.color.textSubtle,
})

export const compactClock = style({
  fontSize: 13,
  color: vars.color.textMuted,
  fontVariantNumeric: 'tabular-nums',
})

export const compactCloseButton = style({
  pointerEvents: 'auto',
  background: 'none',
  border: 'none',
  color: vars.color.textSubtle,
  cursor: 'pointer',
  padding: 4,
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  transition: 'color 0.2s ease',
  ':hover': {
    color: vars.color.text,
  },
})
