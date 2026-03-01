import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const backdrop = style({
  position: 'fixed',
  inset: 0,
  zIndex: 8000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.4)',
  pointerEvents: 'auto',
})

export const panel = style({
  background: vars.color.overlayBg,
  backdropFilter: 'blur(12px)',
  borderRadius: 12,
  padding: '24px 28px',
  maxWidth: 320,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
  textAlign: 'center',
})

export const title = style({
  fontSize: 26,
  fontWeight: 600,
  fontFamily: vars.font.family,
  color: vars.color.text,
  margin: 0,
})

export const screenshot = style({
  width: '100%',
  maxHeight: 240,
  borderRadius: 8,
  objectFit: 'contain',
})

export const message = style({
  fontSize: 13,
  fontFamily: vars.font.family,
  color: vars.color.textSecondary,
  lineHeight: 1.6,
  margin: 0,
})

export const buttonColumn = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  marginTop: 4,
})

export const storeButton = style({
  padding: '12px 28px',
  fontSize: 15,
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

export const closeButton = style({
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: `1px solid ${vars.color.borderLight}`,
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  color: vars.color.textMuted,
  transition: 'all 0.2s',
  padding: 0,
  ':hover': {
    background: vars.color.surfaceSubtle,
    color: vars.color.text,
  },
})
