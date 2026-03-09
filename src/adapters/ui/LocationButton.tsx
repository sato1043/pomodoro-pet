import { createPortal } from 'react-dom'
import * as styles from './styles/location-button.css'

interface LocationButtonProps {
  readonly onClick: () => void
  readonly label: string
}

export function LocationButton({ onClick, label }: LocationButtonProps): JSX.Element {
  return createPortal(
    <button
      className={styles.locationButton}
      onClick={onClick}
      data-testid="location-button"
      title={`Location: ${label}`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </button>,
    document.body
  )
}
