import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const container = style({
  display: 'inline-flex',
  flexDirection: 'row',
  gap: 6,
  pointerEvents: 'none',
  userSelect: 'none',
})

export const icon = style({
  fontSize: 18,
  color: vars.color.text,
  transition: 'opacity 0.5s ease',
  lineHeight: 1,
})
