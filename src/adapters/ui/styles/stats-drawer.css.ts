import { style, keyframes } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const drawer = style({
  position: 'fixed',
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
  overflowY: 'auto',
  background: vars.color.overlayBg,
  color: vars.color.text,
  borderRadius: 12,
  padding: '56px 12px 24px 14px',
  fontFamily: vars.font.family,
  textAlign: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(8px)',
  userSelect: 'none',
  pointerEvents: 'auto',
  transition: 'background 0.3s ease',
})


export const heading = style({
  fontSize: 18,
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: 16,
  marginTop: 8,
})

export const summaryGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 8,
  marginBottom: 20,
})

export const summaryCard = style({
  background: vars.color.surfaceLight,
  borderRadius: 8,
  padding: '10px 8px',
  textAlign: 'center',
})

export const summaryLabel = style({
  fontSize: 11,
  color: vars.color.textSubtle,
  marginBottom: 4,
})

export const summaryValue = style({
  fontSize: 20,
  fontWeight: 700,
  color: vars.color.text,
  fontVariantNumeric: 'tabular-nums',
})

export const summarySub = style({
  fontSize: 11,
  color: vars.color.textCaption,
  marginTop: 2,
  fontVariantNumeric: 'tabular-nums',
})

export const heatmapSection = style({
  marginTop: 8,
})

export const heatmapTitle = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.textMuted,
  marginBottom: 8,
})

export const heatmapSvg = style({
  width: '100%',
  display: 'block',
})

export const heatmapMonthLabel = style({
  fontSize: 10,
  fill: vars.color.textCaption,
})

export const heatmapDayLabel = style({
  fontSize: 9,
  fill: vars.color.textCaption,
})

export const legend = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  marginTop: 8,
  fontSize: 10,
  color: vars.color.textCaption,
})

export const legendCell = style({
  width: 10,
  height: 10,
  borderRadius: 2,
})

// === Cumulative chart ===

export const chartSection = style({
  marginTop: 16,
  paddingLeft: 30,
})

export const chartTitle = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.textMuted,
  marginBottom: 8,
})

export const chartSvg = style({
  width: '100%',
  display: 'block',
})

export const chartAxis = style({
  stroke: vars.color.textFaint,
  strokeWidth: 1,
})

export const chartLine = style({
  stroke: vars.color.textFaint,
  strokeWidth: 1.5,
  fill: 'none',
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
})

export const chartLabel = style({
  fontSize: 11,
  fill: vars.color.textSecondary,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
})

const heartbeatGlow = keyframes({
  '0%': { transform: 'scale(1)', opacity: '0.35' },
  '25%': { transform: 'scale(1.6)', opacity: '0.8' },
  '50%': { transform: 'scale(1)', opacity: '0.35' },
  '65%': { transform: 'scale(1.3)', opacity: '0.6' },
  '80%': { transform: 'scale(1)', opacity: '0.35' },
  '100%': { transform: 'scale(1)', opacity: '0.35' },
})

export const chartGlow = style({
  animation: `${heartbeatGlow} 7s ease-in-out infinite`,
})

// === Biorhythm chart ===

export const bioSection = style({
  marginTop: 20,
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
