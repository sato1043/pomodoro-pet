import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react'
import { useAppDeps } from './AppContext'
import * as styles from './styles/character-name-editor.css'

const MAX_NAME_LENGTH = 20
const DEFAULT_NAME = 'Wildboar'

export function CharacterNameEditor(): JSX.Element {
  const { settingsService } = useAppDeps()
  const [name, setName] = useState(() => settingsService.characterConfig.name)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const startEditing = useCallback(() => {
    setDraft(name)
    setEditing(true)
  }, [name])

  const confirmEdit = useCallback(() => {
    const trimmed = draft.trim()
    const finalName = trimmed.length > 0 ? trimmed : DEFAULT_NAME
    setName(finalName)
    settingsService.updateCharacterConfig({ name: finalName })
    setEditing(false)
  }, [draft, settingsService])

  const cancelEdit = useCallback(() => {
    setEditing(false)
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      confirmEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }, [confirmEdit, cancelEdit])

  if (editing) {
    return (
      <div className={styles.container} data-testid="character-name-editor">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_NAME_LENGTH))}
          onKeyDown={handleKeyDown}
          onBlur={confirmEdit}
          className={styles.nameInput}
          data-testid="character-name-input"
          maxLength={MAX_NAME_LENGTH}
        />
      </div>
    )
  }

  return (
    <div className={styles.container} data-testid="character-name-editor">
      <div className={styles.nameWrapper}>
        <span className={styles.nameDisplay} data-testid="character-name-display">
          {name}
        </span>
        <button
          onClick={startEditing}
          className={styles.editButton}
          data-testid="character-name-edit-button"
          aria-label="Edit character name"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
