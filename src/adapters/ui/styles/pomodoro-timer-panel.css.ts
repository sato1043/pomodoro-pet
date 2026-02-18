import { style, globalStyle, styleVariants } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const setDots = style({
  position: 'absolute',
  top: 40,
  left: 16,
  transform: 'translateY(-50%)',
  fontSize: 14,
  letterSpacing: 4,
  lineHeight: '1',
  pointerEvents: 'none',
})

export const ringContainer = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 200,
  height: 200,
  margin: '8px auto 24px',
})

export const ringSvg = style({
  position: 'absolute',
  top: 0,
  left: 0,
})

export const ringProgress = style({
  transition: 'stroke 0.3s ease',
})

export const ringInner = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1,
})

export const phaseLabel = style({
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 2,
})

export const phaseLabelVariant = styleVariants({
  work: { color: `rgb(${vars.color.work})` },
  break: { color: `rgb(${vars.color.break})` },
  'long-break': { color: `rgb(${vars.color.longBreak})` },
  congrats: { color: `rgb(${vars.color.congrats})` },
})

export const timerDisplay = style({
  fontSize: 48,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: '1.1',
})

export const pomodoroMode = style({
  position: 'relative',
})

export const cornerIcon = style({
  position: 'absolute',
  top: 40,
  right: 34,
  transform: 'translateY(-50%)',
  color: vars.color.textFaint,
  cursor: 'pointer',
  transition: 'color 0.2s',
  lineHeight: '1',
  display: 'inline-flex',
  alignItems: 'center',
  padding: 4,
  pointerEvents: 'auto',
  background: 'none',
  border: 'none',
  font: 'inherit',
  selectors: {
    '&:hover': {
      color: vars.color.textSecondary,
    },
  },
})

export const exitLink = style({
  position: 'absolute',
  top: 40,
  right: 14,
  transform: 'translateY(-50%)',
  color: vars.color.textFaint,
  cursor: 'pointer',
  transition: 'color 0.2s',
  padding: 4,
  pointerEvents: 'auto',
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: '1',
  background: 'none',
  border: 'none',
  font: 'inherit',
  selectors: {
    '&:hover': {
      color: `rgba(${vars.color.danger}, 0.6)`,
    },
  },
})
