import { style, keyframes } from '@vanilla-extract/css'
import { vars } from './theme.css'

const fadeIn = keyframes({
  '0%': { opacity: 0 },
  '100%': { opacity: 1 },
})

export const overlay = style({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  animation: `${fadeIn} 0.2s ease`,
})

export const modal = style({
  backgroundColor: '#1a2a3a',
  borderRadius: 0,
  padding: 16,
  width: '100vw',
  height: '100vh',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
})

export const backButton = style({
  position: 'fixed',
  bottom: 168,
  right: 10,
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
  zIndex: 2001,
  padding: 0,
  transition: 'transform 0.2s ease, background 0.2s ease',
  color: vars.color.textSubtle,
  ':hover': {
    transform: 'scale(1.1)',
    color: vars.color.text,
  },
})

export const mapContainer = style({
  flex: 1,
  minHeight: 0,
  position: 'relative',
})

export const scrollButtonGroup = style({
  position: 'absolute',
  bottom: 8,
  right: 8,
  display: 'flex',
  gap: 4,
  zIndex: 1,
})

export const scrollButton = style({
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: vars.color.overlayBg,
  backdropFilter: 'blur(8px)',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  color: vars.color.textSubtle,
  transition: 'transform 0.2s ease, color 0.2s ease',
  ':hover': {
    transform: 'scale(1.15)',
    color: vars.color.text,
  },
})

export const presetBar = style({
  display: 'flex',
  gap: 8,
  marginTop: 8,
  flexWrap: 'wrap',
})

export const presetButton = style({
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 4,
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: 22,
  padding: '8px 16px',
  cursor: 'pointer',
  fontFamily: vars.font.family,
  ':hover': {
    background: 'rgba(255, 255, 255, 0.2)',
  },
})

export const presetButtonActive = style({
  background: 'rgba(255, 100, 68, 0.3)',
  borderColor: '#ff6644',
  color: '#ff6644',
})

export const coordInfo = style({
  fontSize: 22,
  color: 'rgba(255, 255, 255, 0.5)',
  marginTop: 8,
  fontFamily: vars.font.family,
  textAlign: 'center',
})

