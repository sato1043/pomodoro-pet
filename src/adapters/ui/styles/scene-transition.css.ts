import { style } from '@vanilla-extract/css'

export const overlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  background: 'black',
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 350ms ease',
})
