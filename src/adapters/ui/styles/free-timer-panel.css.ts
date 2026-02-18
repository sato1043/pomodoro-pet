import { style, globalStyle, keyframes } from '@vanilla-extract/css'
import { vars } from './theme.css'

// === Free mode container ===

export const freeMode = style({
  pointerEvents: 'auto',
})

// === Settings toggle button ===

export const settingsToggle = style({
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
  padding: '14px 0',
  lineHeight: '0',
  pointerEvents: 'auto',
  selectors: {
    '&:hover': {
      color: vars.color.textOnSurface,
    },
  },
})

// === Settings summary ===

export const settingsSummary = style({
  marginTop: 16,
  marginBottom: 16,
})

// === Settings grid ===

export const settings = style({
  display: 'inline-grid',
  gridTemplateColumns: 'auto auto',
  gap: '16px 16px',
  alignItems: 'center',
  marginTop: 24,
  marginBottom: 24,
  paddingRight: 20,
  textAlign: 'left',
})

export const settingsField = style({
  display: 'contents',
})

// Label base style
export const label = style({
  fontSize: 26,
  color: vars.color.textMuted,
  textAlign: 'right',
})

// Phase label variants (override color)
export const labelWork = style({
  color: `rgb(${vars.color.work})`,
})

export const labelBreak = style({
  color: `rgb(${vars.color.break})`,
})

export const labelLongBreak = style({
  color: `rgb(${vars.color.longBreak})`,
})

// === Config button group ===

export const cfgGroup = style({
  display: 'flex',
  gap: 6,
  width: 210,
})

export const cfgBtn = style({
  background: vars.color.surfaceLight,
  border: `1px solid ${vars.color.borderLight}`,
  borderRadius: 6,
  color: vars.color.textDim,
  fontSize: 26,
  fontWeight: 700,
  flex: 1,
  padding: '6px 0',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  fontVariantNumeric: 'tabular-nums',
  selectors: {
    '&:hover': {
      background: vars.color.surfaceLighter,
      color: vars.color.textOnSurface,
    },
    '&.active': {
      background: vars.color.surfaceHover,
      borderColor: vars.color.borderStrong,
      color: vars.color.text,
    },
  },
})

// Phase-specific config button variants
globalStyle(`${cfgBtn}[data-cfg="work"]`, {
  background: `rgba(${vars.color.work}, 0.15)`,
  borderColor: `rgba(${vars.color.work}, 0.3)`,
})
globalStyle(`${cfgBtn}[data-cfg="work"]:hover`, {
  background: `rgba(${vars.color.work}, 0.25)`,
})
globalStyle(`${cfgBtn}[data-cfg="work"].active`, {
  background: `rgba(${vars.color.work}, 0.35)`,
  borderColor: `rgba(${vars.color.work}, 0.6)`,
})

globalStyle(`${cfgBtn}[data-cfg="break"]`, {
  background: `rgba(${vars.color.break}, 0.15)`,
  borderColor: `rgba(${vars.color.break}, 0.3)`,
})
globalStyle(`${cfgBtn}[data-cfg="break"]:hover`, {
  background: `rgba(${vars.color.break}, 0.25)`,
})
globalStyle(`${cfgBtn}[data-cfg="break"].active`, {
  background: `rgba(${vars.color.break}, 0.35)`,
  borderColor: `rgba(${vars.color.break}, 0.6)`,
})

globalStyle(`${cfgBtn}[data-cfg="long-break"]`, {
  background: `rgba(${vars.color.longBreak}, 0.15)`,
  borderColor: `rgba(${vars.color.longBreak}, 0.3)`,
})
globalStyle(`${cfgBtn}[data-cfg="long-break"]:hover`, {
  background: `rgba(${vars.color.longBreak}, 0.25)`,
})
globalStyle(`${cfgBtn}[data-cfg="long-break"].active`, {
  background: `rgba(${vars.color.longBreak}, 0.35)`,
  borderColor: `rgba(${vars.color.longBreak}, 0.6)`,
})

// === Timeline ===

export const tlContainer = style({
  textAlign: 'center',
  margin: '16px 0 24px',
})

export const tlClock = style({
  fontSize: 80,
  color: vars.color.text,
  textAlign: 'center',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  transform: 'scaleY(1.2)',
})

export const tlAmpm = style({
  fontSize: '0.8em',
  color: vars.color.textCaption,
  marginLeft: 1,
})

export const tlDateSub = style({
  fontSize: '0.6em',
  color: vars.color.textSubtle,
  fontWeight: 400,
})

const tlBlinkAnimation = keyframes({
  '0%, 49%': { opacity: 1 },
  '50%, 100%': { opacity: 0 },
})

export const tlBlink = style({
  animation: `${tlBlinkAnimation} 1s step-end infinite`,
})

export const tlConfig = style({
  fontSize: 16,
  color: vars.color.textSecondary,
  marginBottom: 12,
  fontVariantNumeric: 'tabular-nums',
  background: vars.color.surfaceLight,
  borderRadius: 6,
  padding: '6px 12px',
})

export const tlConfigWork = style({
  color: `rgb(${vars.color.work})`,
  fontWeight: 600,
})

export const tlConfigBreak = style({
  color: `rgb(${vars.color.break})`,
  fontWeight: 600,
})

export const tlConfigLb = style({
  color: `rgb(${vars.color.longBreak})`,
  fontWeight: 600,
})

export const tlConfigTotal = style({
  color: vars.color.text,
  fontWeight: 700,
})

export const tlRow = style({
  marginBottom: 8,
})

export const tlLabels = style({
  display: 'flex',
  fontSize: 11,
  color: vars.color.textSubtle,
  marginBottom: 2,
})

export const tlSetLabel = style({
  flex: 1,
  textAlign: 'center',
})

export const tlBar = style({
  display: 'flex',
  height: 20,
  borderRadius: 4,
  overflow: 'hidden',
  gap: 1,
})

export const tlSeg = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  fontWeight: 700,
  color: vars.color.textOnSurface,
  minWidth: 0,
  overflow: 'hidden',
})

export const tlSegWork = style({
  background: `rgba(${vars.color.work}, 0.6)`,
})

export const tlSegBreak = style({
  background: `rgba(${vars.color.break}, 0.6)`,
})

export const tlSegLongBreak = style({
  background: `rgba(${vars.color.longBreak}, 0.6)`,
})

export const tlSetSep = style({
  width: 2,
  background: vars.color.separator,
  flexShrink: 0,
})

export const tlTimes = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 11,
  color: vars.color.textCaption,
  marginTop: 2,
  fontVariantNumeric: 'tabular-nums',
})

export const tlTimeMid = style({
  flex: 1,
  textAlign: 'center',
})

// === Buttons ===

export const btn = style({
  background: vars.color.surfaceLighter,
  color: vars.color.text,
  border: `1px solid ${vars.color.borderMedium}`,
  borderRadius: 6,
  padding: '6px 16px',
  fontSize: 13,
  cursor: 'pointer',
  transition: 'background 0.2s',
  selectors: {
    '&:hover:not(:disabled)': {
      background: vars.color.surfaceActive,
    },
    '&:disabled': {
      opacity: 0.4,
      cursor: 'default',
    },
  },
})

export const btnConfirm = style({
  background: vars.color.surfaceSubtle,
  borderColor: vars.color.separator,
  fontSize: 26,
  padding: '14px 24px',
  width: '100%',
  selectors: {
    '&:hover': {
      background: vars.color.surfaceHover,
    },
  },
})

export const btnPrimary = style({
  background: `rgba(${vars.color.work}, 0.3)`,
  borderColor: `rgba(${vars.color.work}, 0.5)`,
  fontSize: 33,
  padding: '20px 24px',
  marginTop: 0,
  width: '100%',
  selectors: {
    '&:hover': {
      background: `rgba(${vars.color.work}, 0.5)`,
    },
  },
})
