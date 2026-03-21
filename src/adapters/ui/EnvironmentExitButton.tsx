import { createPortal } from 'react-dom'
import { useAppDeps } from './AppContext'
import * as styles from './styles/weather-button.css'

export function EnvironmentExitButton(): JSX.Element {
  const { environmentCoordinator } = useAppDeps()

  return createPortal(
    <button
      className={styles.weatherCloseButton}
      onClick={() => environmentCoordinator.exitEnvironment()}
      data-testid="environment-exit"
      title="Back to Free Mode"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>,
    document.body
  )
}
