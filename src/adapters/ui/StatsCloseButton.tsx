import { createPortal } from 'react-dom'
import * as styles from './styles/stats-button.css'

interface StatsCloseButtonProps {
  readonly onClick: () => void
}

export function StatsCloseButton({ onClick }: StatsCloseButtonProps): JSX.Element {
  return createPortal(
    <button
      className={styles.statsButton}
      onClick={onClick}
      data-testid="stats-close"
      title="Back"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>,
    document.body
  )
}
