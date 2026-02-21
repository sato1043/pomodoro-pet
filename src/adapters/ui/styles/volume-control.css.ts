import { style, globalStyle } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const soundSection = style({
  marginTop: 16,
  marginBottom: 0,
})

export const soundPresets = style({
  display: 'flex',
  gap: 6,
  justifyContent: 'center',
  marginBottom: 8,
})

export const soundPreset = style({
  background: vars.color.surfaceSubtle,
  color: vars.color.textOnSurface,
  border: `1px solid ${vars.color.borderLight}`,
  borderRadius: 6,
  padding: '6px 14px',
  fontSize: 22,
  cursor: 'pointer',
  transition: 'all 0.2s',
  selectors: {
    '&:hover': {
      background: vars.color.surfaceHover,
    },
  },
})

globalStyle(`${soundPreset}.active`, {
  background: `rgba(${vars.color.work}, 0.6)`,
  borderColor: `rgba(${vars.color.work}, 0.8)`,
  color: vars.color.text,
})

export const volumeRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
})

export const muteBtn = style({
  background: 'none',
  border: `1px solid ${vars.color.borderMedium}`,
  color: vars.color.text,
  borderRadius: 4,
  width: 48,
  height: 34,
  cursor: 'pointer',
  fontSize: 18,
  transition: 'background 0.2s',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  selectors: {
    '&:hover': {
      background: vars.color.surfaceLighter,
    },
  },
})

export const volBtn = style({
  background: 'none',
  border: `1px solid ${vars.color.borderMedium}`,
  color: vars.color.textMuted,
  borderRadius: 4,
  width: 36,
  height: 34,
  cursor: 'pointer',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s, color 0.15s',
  flexShrink: 0,
  selectors: {
    '&:hover': {
      background: vars.color.surfaceLighter,
      color: vars.color.text,
    },
  },
})

export const volSeg = style({
  flex: 1,
  height: 34,
  borderRadius: 3,
  background: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.surfaceSubtle}`,
  transition: 'background 0.15s',
  cursor: 'pointer',
})

globalStyle(`${volSeg}.on`, {
  background: `rgba(${vars.color.work}, 0.5)`,
  borderColor: `rgba(${vars.color.work}, 0.7)`,
})
