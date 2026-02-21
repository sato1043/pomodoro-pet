import { style, keyframes } from '@vanilla-extract/css'

const floatUp = keyframes({
  '0%': {
    transform: 'translateY(0) scale(0.5)',
    opacity: 1,
  },
  '60%': {
    opacity: 0.8,
  },
  '100%': {
    transform: 'translateY(-120px) scale(1.2)',
    opacity: 0,
  },
})

export const container = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  zIndex: 9999,
  overflow: 'hidden',
})

export const heart = style({
  position: 'absolute',
  fontSize: 24,
  animation: `${floatUp} 1.5s ease-out forwards`,
  userSelect: 'none',
})
