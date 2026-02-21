import { createPortal } from 'react-dom'
import * as styles from './styles/stats-button.css'

interface StatsButtonProps {
  readonly onClick: () => void
}

function ChartIcon(): JSX.Element {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

export function StatsButton({ onClick }: StatsButtonProps): JSX.Element {
  return createPortal(
    <button
      className={styles.statsButton}
      onClick={onClick}
      data-testid="stats-toggle"
      title="Statistics"
    >
      <ChartIcon />
    </button>,
    document.body
  )
}
