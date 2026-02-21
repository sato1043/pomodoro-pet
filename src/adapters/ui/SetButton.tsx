import { createPortal } from 'react-dom'
import * as styles from './styles/free-timer-panel.css'

interface SetButtonProps {
  readonly onClick: () => void
}

export function SetButton({ onClick }: SetButtonProps): JSX.Element {
  return createPortal(
    <div className={styles.startButtonContainer}>
      <button
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={onClick}
        data-testid="set-button"
      >
        Set
      </button>
    </div>,
    document.body
  )
}
