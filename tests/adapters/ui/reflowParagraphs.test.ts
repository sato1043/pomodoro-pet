import { describe, it, expect } from 'vitest'
import { reflowParagraphs } from '../../../src/adapters/ui/reflowParagraphs'

describe('reflowParagraphs', () => {
  it('段落区切り（空行）を保持する', () => {
    const input = 'First paragraph.\n\nSecond paragraph.'
    expect(reflowParagraphs(input)).toBe('First paragraph.\n\nSecond paragraph.')
  })

  it('段落内のハードラップをスペースに置換する', () => {
    const input = 'The software is provided\nwithout warranty.'
    expect(reflowParagraphs(input)).toBe('The software is provided without warranty.')
  })

  it('インデント付き継続行を結合する', () => {
    const input = '(a) Copy, redistribute, sell\n    or any part of it.'
    expect(reflowParagraphs(input)).toBe('(a) Copy, redistribute, sell or any part of it.')
  })

  it('(a)で始まるリスト項目の前の改行を保持する', () => {
    const input = 'You may NOT:\n\n(a) Copy the Software.\n\n(b) Reverse engineer.'
    expect(reflowParagraphs(input)).toBe('You may NOT:\n\n(a) Copy the Software.\n\n(b) Reverse engineer.')
  })

  it('-で始まるリスト項目の前の改行を保持する', () => {
    const input = '- Personal information\n- Account credentials\n- Location data'
    expect(reflowParagraphs(input)).toBe('- Personal information\n- Account credentials\n- Location data')
  })

  it('数字.で始まるセクション見出しの前の改行を保持する', () => {
    const input = '1. DEFINITIONS\n\n2. LICENSE GRANT'
    expect(reflowParagraphs(input)).toBe('1. DEFINITIONS\n\n2. LICENSE GRANT')
  })

  it('複数行の段落をまとめて結合する', () => {
    const input = 'THE SOFTWARE IS PROVIDED "AS IS"\nWITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED.'
    expect(reflowParagraphs(input)).toBe('THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.')
  })

  it('空文字列を返す', () => {
    expect(reflowParagraphs('')).toBe('')
  })

  it('改行のない単一行をそのまま返す', () => {
    const input = 'Single line text.'
    expect(reflowParagraphs(input)).toBe('Single line text.')
  })

  it('段落区切りとハードラップが混在するテキストを処理する', () => {
    const input = [
      'First line of',
      'first paragraph.',
      '',
      'Second line of',
      'second paragraph.',
    ].join('\n')

    const expected = [
      'First line of first paragraph.',
      '',
      'Second line of second paragraph.',
    ].join('\n')

    expect(reflowParagraphs(input)).toBe(expected)
  })
})
