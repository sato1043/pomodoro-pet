import { style, globalStyle } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const panel = style({
  position: 'fixed',
  bottom: 110,
  left: 66,
  borderRadius: 12,
  background: vars.color.overlayBg,
  backdropFilter: 'blur(8px)',
  color: vars.color.text,
  padding: '12px 14px',
  fontFamily: vars.font.family,
  zIndex: 1000,
  pointerEvents: 'auto',
  userSelect: 'none',
  transition: 'background 0.3s ease',
})

export const row = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 8,
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
})

export const rowLabel = style({
  fontSize: 12,
  color: vars.color.textMuted,
  width: 48,
  textAlign: 'right',
  marginRight: 4,
  flexShrink: 0,
})

export const iconBtn = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  background: vars.color.surfaceSubtle,
  color: vars.color.textMuted,
  border: `1px solid ${vars.color.borderLight}`,
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'all 0.2s',
  padding: 0,
  selectors: {
    '&:hover': {
      background: vars.color.surfaceHover,
    },
  },
})

globalStyle(`${iconBtn}.active`, {
  background: vars.color.surfaceHover,
  borderColor: vars.color.borderStrong,
  color: vars.color.text,
})

export const iconBtnDisabled = style({
  opacity: 0.3,
  cursor: 'not-allowed',
  selectors: {
    '&:hover': {
      background: vars.color.surfaceSubtle,
    },
  },
})

export const resetBtn = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  background: 'transparent',
  color: vars.color.textMuted,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
  transition: 'color 0.2s',
  selectors: {
    '&:hover': {
      color: vars.color.text,
    },
  },
})

export const cloudSeg = style({
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.surfaceSubtle}`,
  transition: 'background 0.15s',
  cursor: 'pointer',
  flexShrink: 0,
})

globalStyle(`${cloudSeg}.on`, {
  background: vars.color.surfaceHover,
  borderColor: vars.color.borderStrong,
})

