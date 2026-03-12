import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const badge = style({
  position: 'fixed',
  bottom: 8,
  left: 8,
  fontSize: 11,
  fontFamily: vars.font.family,
  color: vars.color.textSecondary,
  opacity: 0.55,
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 100,
  letterSpacing: '0.05em',
})
