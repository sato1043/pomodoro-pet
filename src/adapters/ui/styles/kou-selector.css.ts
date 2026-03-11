import { style, globalStyle, keyframes } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const container = style({
  position: 'fixed',
  top: 36,
  left: '50%',
  transform: 'translateX(calc(-50% + 7px))',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  pointerEvents: 'auto',
  userSelect: 'none',
  zIndex: 10,
  fontFamily: vars.font.family,
})

export const row = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
})

export const detail = style({
  fontSize: 11,
  color: vars.color.textMuted,
  lineHeight: '1.4',
  pointerEvents: 'none',
})

export const detailLarge = style({
  fontSize: 22,
  color: vars.color.textMuted,
  lineHeight: '1.4',
  pointerEvents: 'none',
})

export const label = style({
  fontSize: 11,
  color: vars.color.textMuted,
  textTransform: 'lowercase',
  fontFamily: vars.font.family,
})

export const autoBtn = style({
  display: 'flex',
  alignItems: 'center',
  background: 'transparent',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: 22,
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: 4,
  transition: 'color 0.2s',
  fontFamily: vars.font.family,
  selectors: {
    '&:hover': {
      color: vars.color.textSecondary,
    },
  },
})

globalStyle(`${autoBtn}.active`, {
  color: vars.color.textMuted,
})

export const listBtn = style({
  display: 'flex',
  alignItems: 'center',
  background: 'transparent',
  border: 'none',
  color: vars.color.textMuted,
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: 4,
  transition: 'color 0.2s',
  selectors: {
    '&:hover': {
      color: vars.color.textSecondary,
    },
  },
})

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
})

export const listOverlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
  animation: `${fadeIn} 200ms ease`,
})

export const listBody = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  paddingTop: 12,
})

export const listHeader = style({
  flexShrink: 0,
  padding: '0 16px',
  fontFamily: "'Consolas', 'Courier New', monospace",
})

export const listContainer = style({
  flex: '3 1 0',
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'auto',
  padding: '0 16px 12px',
  fontFamily: "'Consolas', 'Courier New', monospace",
  scrollbarWidth: 'auto',
  scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
})

globalStyle(`${listContainer}::-webkit-scrollbar`, {
  width: 24,
})

globalStyle(`${listContainer}::-webkit-scrollbar-track`, {
  background: 'transparent',
})

globalStyle(`${listContainer}::-webkit-scrollbar-thumb`, {
  background: 'rgba(255, 255, 255, 0.2)',
  borderRadius: 6,
})

globalStyle(`${listContainer}::-webkit-scrollbar-thumb:hover`, {
  background: 'rgba(255, 255, 255, 0.35)',
})

export const listDetailPanel = style({
  flex: '1 1 0',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  padding: '12px 24px',
  borderTop: '1px solid rgba(255, 255, 255, 0.15)',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'rgba(255, 255, 255, 0.85)',
  fontFamily: "'Consolas', 'Courier New', monospace",
  textAlign: 'center',
})

export const listDetailLarge = style({
  fontSize: 22,
  lineHeight: '1.3',
})

export const listDetailMedium = style({
  fontSize: 15,
  lineHeight: '1.3',
})

export const listDetailSmall = style({
  fontSize: 12,
  lineHeight: '1.4',
  color: 'rgba(255, 255, 255, 0.6)',
})

export const listTable = style({
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: 15,
  color: 'rgba(255, 255, 255, 0.7)',
  whiteSpace: 'nowrap',
})

globalStyle(`${listTable} th`, {
  padding: '3px 8px',
  textAlign: 'left',
  fontWeight: 'normal',
  color: 'rgba(255, 255, 255, 0.9)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
})

globalStyle(`${listTable} td`, {
  padding: '2px 8px',
  cursor: 'pointer',
})

globalStyle(`${listTable} tbody tr:hover`, {
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
})

export const listRowCurrent = style({
  color: '#ffffff',
  fontWeight: 'bold',
})

export const listCloseBtn = style({
  position: 'fixed',
  bottom: 168,
  left: 10,
  zIndex: 2001,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: vars.color.overlayBg,
  backdropFilter: 'blur(8px)',
  border: 'none',
  color: vars.color.textSubtle,
  cursor: 'pointer',
  fontSize: 20,
  padding: 0,
  transition: 'transform 0.2s ease, background 0.2s ease',
  selectors: {
    '&:hover': {
      transform: 'scale(1.1)',
      color: vars.color.text,
    },
  },
})
