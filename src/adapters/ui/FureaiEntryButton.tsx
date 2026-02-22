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
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        {/* リンゴアイコン（イラスト風） */}
        {/* 実 — ハート型の上部くぼみ */}
        <path d="M12 21C7.5 21 4 17.5 4 13C4 9.5 6 7 8.5 6.5C10 6.2 11 7 11.5 7.5C11.8 6 12 5 12 5C12 5 12.2 6 12.5 7.5C13 7 14 6.2 15.5 6.5C18 7 20 9.5 20 13C20 17.5 16.5 21 12 21Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        {/* 茎 */}
        <path d="M12 5C12 5 12.3 3.5 12.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        {/* 葉っぱ */}
        <path d="M13 3.5C14 2.8 16 2.5 17 3C16.5 4 15 5 13 4.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.5 3.5C14.5 3.8 15.5 3.8 16 3.5" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" opacity="0.6" />
        {/* ハイライト */}
        <ellipse cx="8" cy="12" rx="1.5" ry="2.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.4" transform="rotate(10 8 12)" />
      </svg>
    </button>,
    document.body
  )
}
