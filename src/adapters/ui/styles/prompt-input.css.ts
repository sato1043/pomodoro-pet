import { style, globalStyle } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const container = style({
  position: 'fixed',
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 8,
  zIndex: 1000,
})

export const field = style({
  background: vars.color.overlayBg,
  color: vars.color.text,
  border: `1px solid ${vars.color.borderMedium}`,
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 14,
  width: 320,
  outline: 'none',
  backdropFilter: 'blur(8px)',
  fontFamily: vars.font.family,
})

globalStyle(`${field}::placeholder`, {
  color: vars.color.textDim,
})

globalStyle(`${field}:focus`, {
  borderColor: `rgba(${vars.color.work}, 0.5)`,
  boxShadow: `0 0 0 2px rgba(${vars.color.work}, 0.2)`,
})

export const submit = style({
  background: `rgba(${vars.color.work}, 0.8)`,
  color: vars.color.text,
  border: 'none',
  borderRadius: 8,
  padding: '8px 20px',
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: vars.font.family,
  transition: 'background 0.2s',
  selectors: {
    '&:hover': {
      background: `rgba(${vars.color.work}, 1)`,
    },
  },
})
