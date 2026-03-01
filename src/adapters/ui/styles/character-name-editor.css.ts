import { style, globalStyle } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const container = style({
  position: 'fixed',
  top: 96,
  left: 10,
  right: 10,
  display: 'flex',
  justifyContent: 'center',
  zIndex: 1000,
  pointerEvents: 'none',
})

export const nameWrapper = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
})

export const nameDisplay = style({
  fontSize: 28,
  fontWeight: 500,
  color: vars.color.textSecondary,
  fontFamily: vars.font.family,
  textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
  userSelect: 'none',
})

export const editButton = style({
  pointerEvents: 'auto',
  position: 'absolute',
  left: '100%',
  marginLeft: 8,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: 4,
  borderRadius: 4,
  color: vars.color.textSubtle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.2s ease, background 0.2s ease',
  ':hover': {
    color: vars.color.text,
    background: vars.color.surfaceSubtle,
  },
})

export const nameInput = style({
  pointerEvents: 'auto',
  background: vars.color.overlayBg,
  color: vars.color.text,
  border: `1px solid ${vars.color.borderMedium}`,
  borderRadius: 6,
  padding: '4px 12px',
  fontSize: 28,
  fontWeight: 500,
  fontFamily: vars.font.family,
  textAlign: 'center',
  width: 300,
  outline: 'none',
  backdropFilter: 'blur(8px)',
})

globalStyle(`${nameInput}:focus`, {
  borderColor: vars.color.borderStrong,
  boxShadow: `0 0 0 2px ${vars.color.surfaceSubtle}`,
})
