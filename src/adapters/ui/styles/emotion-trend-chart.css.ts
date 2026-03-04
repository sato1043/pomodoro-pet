import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const section = style({
  marginTop: 16,
  paddingLeft: 30,
})

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
})

export const title = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.textMuted,
})

export const periodButtons = style({
  display: 'flex',
  gap: 4,
})

export const periodBtn = style({
  fontSize: 10,
  padding: '2px 6px',
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
  background: vars.color.surfaceLight,
  color: vars.color.textCaption,
  transition: 'background 0.15s, color 0.15s',
})

export const periodBtnActive = style({
  background: vars.color.surfaceLighter,
  color: vars.color.textSecondary,
  fontWeight: 600,
})

export const svg = style({
  width: '100%',
  display: 'block',
})

export const axisLine = style({
  stroke: vars.color.textFaint,
  strokeWidth: 1,
})

export const gridLine = style({
  stroke: vars.color.textFaint,
  strokeWidth: 0.5,
  strokeDasharray: '2 3',
  opacity: 0.5,
})

export const axisLabel = style({
  fontSize: 9,
  fill: vars.color.textCaption,
})

export const dateLabel = style({
  fontSize: 8,
  fill: vars.color.textCaption,
})

export const curveSatisfaction = style({
  stroke: 'var(--emo-satisfaction)',
  strokeWidth: 1.5,
  fill: 'none',
  filter: 'url(#emo-glow)',
})

export const curveFatigue = style({
  stroke: 'var(--emo-fatigue)',
  strokeWidth: 1.5,
  fill: 'none',
  filter: 'url(#emo-glow)',
})

export const curveAffinity = style({
  stroke: 'var(--emo-affinity)',
  strokeWidth: 1.5,
  fill: 'none',
  filter: 'url(#emo-glow)',
})

export const legend = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  marginTop: 6,
  fontSize: 10,
  color: vars.color.textCaption,
})

export const legendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 3,
})

export const legendDot = style({
  width: 8,
  height: 8,
  borderRadius: '50%',
  opacity: 0.8,
})

export const noData = style({
  fontSize: 11,
  color: vars.color.textCaption,
  textAlign: 'center',
  padding: '12px 0',
})
