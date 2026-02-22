import { createPortal } from 'react-dom'
import * as styles from './styles/weather-button.css'

interface WeatherButtonProps {
  readonly onClick: () => void
}

function CloudIcon(): JSX.Element {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  )
}

export function WeatherButton({ onClick }: WeatherButtonProps): JSX.Element {
  return createPortal(
    <button
      className={styles.weatherButton}
      onClick={onClick}
      data-testid="weather-toggle"
      title="Weather"
    >
      <CloudIcon />
    </button>,
    document.body
  )
}
