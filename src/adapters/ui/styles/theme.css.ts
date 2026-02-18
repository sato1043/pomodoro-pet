import { createThemeContract, createTheme, globalStyle } from '@vanilla-extract/css'

// --- テーマコントラクト（ライト/ダーク共通の構造定義） ---

export const vars = createThemeContract({
  color: {
    // フェーズカラー（RGBトリプレット。rgba()で可変alphaに使用）
    work: null,
    break: null,
    longBreak: null,
    congrats: null,
    danger: null,

    // テキスト階層（視認性の高い順）
    text: null,
    textOnSurface: null,
    textSecondary: null,
    textMuted: null,
    textDim: null,
    textSubtle: null,
    textCaption: null,
    textFaint: null,

    // 背景・サーフェス（不透明度の高い順）
    overlayBg: null,
    surfaceActive: null,
    surfaceHover: null,
    surfaceLighter: null,
    surfaceSubtle: null,
    surfaceLight: null,

    // ボーダー・セパレータ
    borderStrong: null,
    separator: null,
    borderMedium: null,
    borderLight: null,
  },
  font: {
    family: null,
  },
})

// --- ダークテーマ ---

export const darkThemeClass = createTheme(vars, {
  color: {
    work: '76, 175, 80',
    break: '66, 165, 245',
    longBreak: '171, 71, 188',
    congrats: '255, 213, 79',
    danger: '244, 67, 54',

    text: '#fff',
    textOnSurface: 'rgba(255, 255, 255, 0.8)',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: '#aaa',
    textDim: '#999',
    textSubtle: 'rgba(255, 255, 255, 0.5)',
    textCaption: 'rgba(255, 255, 255, 0.45)',
    textFaint: 'rgba(255, 255, 255, 0.35)',

    overlayBg: 'rgba(0, 0, 0, 0.75)',
    surfaceActive: 'rgba(255, 255, 255, 0.25)',
    surfaceHover: 'rgba(255, 255, 255, 0.2)',
    surfaceLighter: 'rgba(255, 255, 255, 0.15)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.1)',
    surfaceLight: 'rgba(255, 255, 255, 0.08)',

    borderStrong: 'rgba(255, 255, 255, 0.5)',
    separator: 'rgba(255, 255, 255, 0.3)',
    borderMedium: 'rgba(255, 255, 255, 0.25)',
    borderLight: 'rgba(255, 255, 255, 0.15)',
  },
  font: {
    family: "'Segoe UI', system-ui, sans-serif",
  },
})

// --- ライトテーマ ---

export const lightThemeClass = createTheme(vars, {
  color: {
    work: '46, 125, 50',
    break: '21, 101, 192',
    longBreak: '106, 27, 154',
    congrats: '230, 160, 0',
    danger: '198, 40, 40',

    text: '#1a1a1a',
    textOnSurface: 'rgba(0, 0, 0, 0.75)',
    textSecondary: 'rgba(0, 0, 0, 0.6)',
    textMuted: '#555',
    textDim: '#777',
    textSubtle: 'rgba(0, 0, 0, 0.45)',
    textCaption: 'rgba(0, 0, 0, 0.38)',
    textFaint: 'rgba(0, 0, 0, 0.35)',

    overlayBg: 'rgba(255, 255, 255, 0.88)',
    surfaceActive: 'rgba(0, 0, 0, 0.16)',
    surfaceHover: 'rgba(0, 0, 0, 0.12)',
    surfaceLighter: 'rgba(0, 0, 0, 0.1)',
    surfaceSubtle: 'rgba(0, 0, 0, 0.06)',
    surfaceLight: 'rgba(0, 0, 0, 0.05)',

    borderStrong: 'rgba(0, 0, 0, 0.4)',
    separator: 'rgba(0, 0, 0, 0.15)',
    borderMedium: 'rgba(0, 0, 0, 0.2)',
    borderLight: 'rgba(0, 0, 0, 0.1)',
  },
  font: {
    family: "'Segoe UI', system-ui, sans-serif",
  },
})

// テーマクラスが適用された要素の基本スタイル
globalStyle(`.${darkThemeClass}`, {
  colorScheme: 'dark',
})

globalStyle(`.${lightThemeClass}`, {
  colorScheme: 'light',
})
