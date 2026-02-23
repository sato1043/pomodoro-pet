import { createPortal } from 'react-dom'
import * as styles from './styles/free-timer-panel.css'

interface CloseButtonProps {
  readonly onClick: () => void
}

export function CloseButton({ onClick }: CloseButtonProps): JSX.Element {
  return createPortal(
    <div className={styles.startButtonContainer}>
      <button
        className={`${styles.btn} ${styles.btnConfirm}`}
        onClick={onClick}
        data-testid="doc-close-button"
      >
        Close
      </button>
    </div>,
    document.body
  )
}
