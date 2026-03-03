import { style, keyframes } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const bioSection = style({
  paddingLeft: 30,
  position: 'relative',
})

export const bioSvg = style({
  width: '100%',
  display: 'block',
})

export const bioGrid = style({
  stroke: 'var(--bio-grid)',
  strokeWidth: 0.5,
})

export const bioCenterLine = style({
  stroke: 'var(--bio-grid)',
  strokeWidth: 1,
})

export const bioToday = style({
  stroke: 'var(--bio-today)',
  strokeWidth: 1,
  strokeDasharray: '3 3',
})

export const bioCurveActivity = style({
  stroke: 'var(--bio-activity)',
  strokeWidth: 0.5,
  fill: 'none',
  opacity: 0.4,
  filter: 'url(#bio-glow)',
})

export const bioCurveSociability = style({
  stroke: 'var(--bio-sociability)',
  strokeWidth: 0.5,
  fill: 'none',
  opacity: 0.4,
  filter: 'url(#bio-glow)',
})

export const bioCurveFocus = style({
  stroke: 'var(--bio-focus)',
  strokeWidth: 0.5,
  fill: 'none',
  opacity: 0.4,
  filter: 'url(#bio-glow)',
})

export const bioLegend = style({
  position: 'absolute',
  top: 24,
  left: 36,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 10,
  color: vars.color.textCaption,
})

export const bioLegendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
})

export const bioLegendDot = style({
  width: 8,
  height: 8,
  borderRadius: '50%',
  filter: 'blur(1.5px)',
  opacity: 0.7,
})

const bioGlow = keyframes({
  '0%': { transform: 'scale(1)', opacity: '0.08' },
  '25%': { transform: 'scale(1.4)', opacity: '0.2' },
  '50%': { transform: 'scale(1)', opacity: '0.08' },
  '65%': { transform: 'scale(1.2)', opacity: '0.15' },
  '80%': { transform: 'scale(1)', opacity: '0.08' },
  '100%': { transform: 'scale(1)', opacity: '0.08' },
})

export const bioTodayDot = style({
  animation: `${bioGlow} 7s ease-in-out infinite`,
})

export const chartTitle = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.textMuted,
  marginBottom: 8,
})
