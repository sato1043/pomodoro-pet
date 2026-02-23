import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  textAlign: 'left',
  marginTop: 8,
  height: 'calc(100vh - 220px)',
})

export const scrollContent = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
})

export const heading = style({
  fontSize: 18,
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: 16,
  marginTop: 8,
})

export const section = style({
  marginBottom: 16,
})

export const expandSection = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
})

export const sectionTitle = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.textMuted,
  marginBottom: 4,
})

export const versionText = style({
  fontSize: 14,
  color: vars.color.text,
})

export const copyrightText = style({
  fontSize: 13,
  color: vars.color.textMuted,
  marginTop: 4,
})

export const licenseText = style({
  fontSize: 13,
  color: vars.color.textSecondary,
})

export const licensePre = style({
  fontFamily: 'monospace',
  fontSize: 11,
  lineHeight: 1.4,
  color: vars.color.textSecondary,
  background: vars.color.surfaceLight,
  borderRadius: 6,
  padding: '8px 10px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  border: `1px solid ${vars.color.borderLight}`,
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,
})

export const closeRow = style({
  display: 'flex',
  justifyContent: 'center',
  paddingTop: 16,
  flexShrink: 0,
})

export const closeButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.borderLight}`,
  color: vars.color.textMuted,
  cursor: 'pointer',
  padding: 0,
  transition: 'all 0.2s',
  ':hover': {
    background: vars.color.surfaceHover,
    color: vars.color.text,
  },
})

export const aboutLink = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 16,
})

export const aboutLinkButton = style({
  background: 'none',
  border: 'none',
  color: vars.color.textMuted,
  fontSize: 13,
  cursor: 'pointer',
  padding: '4px 8px',
  textDecoration: 'underline',
  transition: 'color 0.2s',
  ':hover': {
    color: vars.color.text,
  },
})

export const loading = style({
  fontSize: 13,
  color: vars.color.textMuted,
  textAlign: 'center',
  padding: '24px 0',
})
