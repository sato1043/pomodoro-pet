import { useState, useCallback, type KeyboardEvent } from 'react'
import { useAppDeps } from './AppContext'
import { interpretPrompt } from '../../application/character/InterpretPromptUseCase'
import * as styles from './styles/prompt-input.css'

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
    <div className={styles.container}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="指示を入力... (例: walk, 座れ, dance)"
        className={styles.field}
      />
      <button onClick={handleSubmit} className={styles.submit}>
        Send
      </button>
    </div>
  )
}
