import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const settingsButton = style({
  position: 'fixed',
  bottom: 112,
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
  zIndex: 1001,
  pointerEvents: 'auto',
  padding: 0,
  transition: 'transform 0.2s ease, background 0.2s ease',
  color: vars.color.textSubtle,
  ':hover': {
    transform: 'scale(1.1)',
    color: vars.color.text,
  },
})
