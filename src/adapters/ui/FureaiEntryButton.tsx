import { createPortal } from 'react-dom'
import { useAppDeps } from './AppContext'
import * as styles from './styles/fureai-entry.css'

export function FureaiEntryButton(): JSX.Element {
  const { fureaiCoordinator } = useAppDeps()

  return createPortal(
    <button
      className={styles.entryButton}
      onClick={() => fureaiCoordinator.enterFureai()}
      data-testid="fureai-entry"
      title="Fureai Mode"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {/* キャベツアイコン */}
        <ellipse cx="12" cy="14" rx="8" ry="7" fill="currentColor" opacity="0.3" />
        <path d="M12 3C10 3 8.5 5 9 7C7 6 5 7.5 5.5 9.5C4 10 3 12 4 14C3 15.5 3.5 17.5 5 18.5C6 20 8 21 10 21H14C16 21 18 20 19 18.5C20.5 17.5 21 15.5 20 14C21 12 20 10 18.5 9.5C19 7.5 17 6 15 7C15.5 5 14 3 12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" opacity="0.6" />
        <path d="M12 7V15M9 10C10 12 11 14 12 15M15 10C14 12 13 14 12 15" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      </svg>
    </button>,
    document.body
  )
}
