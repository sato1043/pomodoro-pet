import { style, keyframes } from '@vanilla-extract/css'
import { vars } from './theme.css'

const popAnimation = keyframes({
  '0%': { transform: 'scale(0.3)', opacity: 0 },
  '100%': { transform: 'scale(1)', opacity: 1 },
})

const blinkAnimation = keyframes({
  '0%, 100%': { opacity: 0.35 },
  '50%': { opacity: 0.7 },
})

const fallAnimation = keyframes({
  '0%': { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
  '80%': { opacity: 1 },
  '100%': { transform: 'translateY(250px) rotate(720deg)', opacity: 0 },
})

export const congratsMode = style({
  position: 'relative',
  overflow: 'hidden',
  padding: '40px 0',
})

export const message = style({
  fontSize: 42,
  fontWeight: 700,
  color: `rgb(${vars.color.congrats})`,
  textShadow: `0 0 20px rgba(${vars.color.congrats}, 0.4)`,
  marginBottom: 8,
  animation: `${popAnimation} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`,
})

export const sub = style({
  fontSize: 16,
  color: vars.color.textSecondary,
  marginBottom: 16,
})

export const hint = style({
  fontSize: 12,
  color: vars.color.textFaint,
  animation: `${blinkAnimation} 2s ease-in-out infinite`,
})

export const confettiContainer = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
})

export const confettiPiece = style({
  position: 'absolute',
  width: 8,
  height: 8,
  top: -10,
  animation: `${fallAnimation} linear forwards`,
})
