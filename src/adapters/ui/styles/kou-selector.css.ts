import { style, globalStyle } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const container = style({
  position: 'fixed',
  top: 36,
  left: '50%',
  transform: 'translateX(calc(-50% + 7px))',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  pointerEvents: 'auto',
  userSelect: 'none',
  zIndex: 10,
  fontFamily: vars.font.family,
})

export const row = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
})

export const detail = style({
  fontSize: 11,
  color: vars.color.textMuted,
  lineHeight: '1.4',
  pointerEvents: 'none',
})

export const detailLarge = style({
  fontSize: 22,
  color: vars.color.textMuted,
  lineHeight: '1.4',
  pointerEvents: 'none',
})

export const label = style({
  fontSize: 11,
  color: vars.color.textMuted,
  textTransform: 'lowercase',
  fontFamily: vars.font.family,
})

export const select = style({
  background: 'transparent',
  border: 'none',
  color: vars.color.textSecondary,
  fontSize: 16,
  outline: 'none',
  cursor: 'pointer',
  padding: '2px 4px',
  fontFamily: "'Consolas', 'Courier New', monospace",
})

export const autoBtn = style({
  display: 'flex',
  alignItems: 'center',
  background: 'transparent',
  border: 'none',
  color: vars.color.textMuted,
  fontSize: 22,
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: 4,
  transition: 'color 0.2s',
  fontFamily: vars.font.family,
  selectors: {
    '&:hover': {
      color: vars.color.textMuted,
    },
  },
})

globalStyle(`${autoBtn}.active`, {
  color: vars.color.textSecondary,
})
