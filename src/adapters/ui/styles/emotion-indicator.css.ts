import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const container = style({
  display: 'inline-flex',
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 6,
  width: '100%',
  pointerEvents: 'none',
  userSelect: 'none',
})

export const icon = style({
  fontSize: 18,
  color: vars.color.text,
  transition: 'opacity 0.5s ease',
  lineHeight: 1,
})
