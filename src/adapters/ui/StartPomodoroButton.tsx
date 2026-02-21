import { createPortal } from 'react-dom'
import { useAppDeps } from './AppContext'
import * as styles from './styles/free-timer-panel.css'

export function StartPomodoroButton(): JSX.Element {
  const { orchestrator } = useAppDeps()

  return createPortal(
    <div className={styles.startButtonContainer}>
      <button
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => orchestrator.startPomodoro()}
        data-testid="start-pomodoro"
      >
        Start Pomodoro
      </button>
    </div>,
    document.body
  )
}
