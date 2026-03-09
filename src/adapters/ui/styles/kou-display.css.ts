import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const container = style({
  position: 'fixed',
  right: 12,
  bottom: 48,
  textAlign: 'right',
  pointerEvents: 'none',
  userSelect: 'none',
  transition: 'opacity 1.5s ease-in-out',
  zIndex: 10,
  fontFamily: vars.font.family,
})

export const solarTerm = style({
  fontSize: 11,
  color: 'rgba(255, 255, 255, 0.6)',
  lineHeight: '1.4',
})

export const kouName = style({
  fontSize: 16,
  fontWeight: 'bold',
  color: 'rgba(255, 255, 255, 0.7)',
  lineHeight: '1.3',
})

export const reading = style({
  fontSize: 10,
  color: 'rgba(255, 255, 255, 0.4)',
  lineHeight: '1.4',
})
