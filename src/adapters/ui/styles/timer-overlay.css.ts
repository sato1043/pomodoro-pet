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
  padding: '56px 12px 28px 14px',
  fontFamily: vars.font.family,
  textAlign: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(8px)',
  userSelect: 'none',
  pointerEvents: 'none',
  transition: 'background 0.3s ease',
})

export const title = style({
  pointerEvents: 'auto',
  position: 'absolute',
  top: 40,
  left: 16,
  transform: 'translateY(-50%)',
  fontSize: 26,
  fontWeight: 600,
  color: vars.color.textSubtle,
  textAlign: 'left',
})
