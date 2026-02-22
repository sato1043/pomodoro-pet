import { createPortal } from 'react-dom'
import * as styles from './styles/weather-button.css'

interface WeatherCloseButtonProps {
  readonly onClick: () => void
}

export function WeatherCloseButton({ onClick }: WeatherCloseButtonProps): JSX.Element {
  return createPortal(
    <button
      className={styles.weatherCloseButton}
      onClick={onClick}
      data-testid="weather-close"
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
