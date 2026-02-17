import { useState, useCallback, type KeyboardEvent } from 'react'
import { useAppDeps } from './AppContext'
import { interpretPrompt } from '../../application/character/InterpretPromptUseCase'

const styles = {
  container: {
    position: 'fixed' as const,
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 8,
    zIndex: 1000,
  },
  field: {
    background: 'rgba(0, 0, 0, 0.75)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 14,
    width: 320,
    outline: 'none',
    backdropFilter: 'blur(8px)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  submit: {
    background: 'rgba(76, 175, 80, 0.8)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 20px',
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    transition: 'background 0.2s',
  },
} as const

export function PromptInput(): JSX.Element {
  const { character, behaviorSM, charHandle } = useAppDeps()
  const [text, setText] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return

    const action = interpretPrompt(trimmed)
    behaviorSM.transition({ type: 'prompt', action })
    character.setState(action)
    charHandle.playState(action)
    behaviorSM.start()
    setText('')
  }, [text, behaviorSM, character, charHandle])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }, [handleSubmit])

  return (
    <div style={styles.container}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="指示を入力... (例: walk, 座れ, dance)"
        style={styles.field}
      />
      <button onClick={handleSubmit} style={styles.submit}>
        Send
      </button>
    </div>
  )
}
