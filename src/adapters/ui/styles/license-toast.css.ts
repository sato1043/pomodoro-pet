import { style, keyframes } from '@vanilla-extract/css'
import { vars } from './theme.css'

const slideIn = keyframes({
  '0%': { transform: 'translateY(20px)', opacity: 0 },
  '100%': { transform: 'translateY(0)', opacity: 1 },
})

export const container = style({
  position: 'fixed',
  bottom: 60,
  left: 10,
  right: 10,
  background: vars.color.overlayBg,
  backdropFilter: 'blur(8px)',
  borderRadius: 10,
  padding: '12px 16px',
  color: vars.color.text,
  fontFamily: vars.font.family,
  fontSize: 13,
  lineHeight: 1.5,
  zIndex: 9000,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
  animation: `${slideIn} 0.3s ease`,
})

export const message = style({
  color: vars.color.textSecondary,
})

export const linkRow = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
})

export const linkButton = style({
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 600,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  color: '#fff',
  background: `rgba(${vars.color.work}, 0.8)`,
  transition: 'background 0.2s',
  ':hover': {
    background: `rgba(${vars.color.work}, 1)`,
  },
})

export const dismissButton = style({
  padding: '4px 12px',
  fontSize: 12,
  border: `1px solid ${vars.color.borderLight}`,
  borderRadius: 6,
  cursor: 'pointer',
  color: vars.color.textMuted,
  background: 'transparent',
  transition: 'all 0.2s',
  ':hover': {
    background: vars.color.surfaceSubtle,
  },
})
