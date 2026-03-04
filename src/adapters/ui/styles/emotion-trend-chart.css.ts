import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const section = style({
  marginTop: 16,
  paddingLeft: 30,
})

export const title = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.textMuted,
  marginBottom: 8,
})

export const svg = style({
  width: '100%',
  display: 'block',
})

export const axisLine = style({
  stroke: vars.color.textFaint,
  strokeWidth: 1,
})

export const chartLine = style({
  strokeWidth: 1.5,
  fill: 'none',
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
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
