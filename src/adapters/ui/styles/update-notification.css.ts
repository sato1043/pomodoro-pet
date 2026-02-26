import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const container = style({
  position: 'fixed',
  top: 8,
  left: '50%',
  transform: 'translateX(-50%)',
  background: vars.color.overlayBg,
  backdropFilter: 'blur(8px)',
  borderRadius: 10,
  padding: '10px 16px',
  color: vars.color.text,
  fontFamily: vars.font.family,
  fontSize: 13,
  zIndex: 9500,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
  userSelect: 'none',
})

export const versionText = style({
  fontWeight: 600,
  color: vars.color.textSecondary,
})

export const actionButton = style({
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

export const laterButton = style({
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
