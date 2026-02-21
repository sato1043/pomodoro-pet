import { style, keyframes } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const drawer = style({
  position: 'fixed',
  top: 20,
  left: 10,
  right: 10,
  background: vars.color.overlayBg,
  color: vars.color.text,
  borderRadius: 12,
  padding: '16px 14px 28px 14px',
  fontFamily: vars.font.family,
  textAlign: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(8px)',
  userSelect: 'none',
  pointerEvents: 'auto',
  transition: 'background 0.3s ease',
})

export const closeBtn = style({
  position: 'absolute',
  top: 8,
  right: 8,
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  appearance: 'none',
  color: vars.color.textFaint,
  cursor: 'pointer',
  zIndex: 1001,
  transition: 'color 0.2s',
  padding: '6px 0',
  lineHeight: '0',
  pointerEvents: 'auto',
  selectors: {
    '&:hover': {
      color: vars.color.textOnSurface,
    },
  },
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
