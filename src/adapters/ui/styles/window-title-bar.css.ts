import { style } from '@vanilla-extract/css'

export const titleBar = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: 32,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  userSelect: 'none',
  pointerEvents: 'none',
})

export const buttonBase = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 46,
  height: 32,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 0,
  color: 'rgba(255, 255, 255, 0.7)',
  transition: 'background 0.15s ease',
  pointerEvents: 'auto',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.15)',
  },
})

export const closeButton = style({
  ':hover': {
    background: '#e81123',
    color: '#fff',
  },
})
