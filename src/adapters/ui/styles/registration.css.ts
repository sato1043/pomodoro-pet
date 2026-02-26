import { style, keyframes } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const inputField = style({
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'monospace',
  background: vars.color.surfaceLight,
  border: `1px solid ${vars.color.borderMedium}`,
  borderRadius: 8,
  color: vars.color.text,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  marginTop: 4,
  ':focus': {
    borderColor: vars.color.borderStrong,
  },
  '::placeholder': {
    color: vars.color.textFaint,
  },
})

export const buttonRow = style({
  display: 'flex',
  gap: 8,
  marginTop: 0,
})

export const primaryButton = style({
  flex: 1,
  padding: '10px 0',
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  color: '#fff',
  background: `rgba(${vars.color.work}, 0.8)`,
  transition: 'background 0.2s',
  ':hover': {
    background: `rgba(${vars.color.work}, 1)`,
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'default',
  },
})

export const errorRow = style({
  height: 20,
  marginTop: 8,
  marginLeft: 8,
  paddingTop: 4,
})

export const errorText = style({
  fontSize: 12,
  color: `rgba(${vars.color.danger}, 1)`,
})

export const changeKeyLink = style({
  fontSize: 12,
  color: vars.color.textDim,
  textDecoration: 'underline',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  fontFamily: vars.font.family,
  padding: 0,
  marginTop: 4,
  transition: 'color 0.2s',
  ':hover': {
    color: vars.color.text,
  },
})

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
})

export const spinner = style({
  display: 'inline-block',
  width: 16,
  height: 16,
  border: `2px solid ${vars.color.textFaint}`,
  borderTopColor: '#fff',
  borderRadius: '50%',
  animation: `${spin} 0.6s linear infinite`,
  verticalAlign: 'middle',
  marginRight: 6,
})
