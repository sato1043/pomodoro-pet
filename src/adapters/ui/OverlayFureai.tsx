import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppDeps } from './AppContext'
import * as overlayStyles from './styles/overlay.css'

function formatClock(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[date.getDay()]
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${d} ${day} ${h}:${min}`
}

export function OverlayFureai(): JSX.Element {
  const { fureaiCoordinator } = useAppDeps()
  const [clock, setClock] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const id = setInterval(() => {
      setClock(formatClock(new Date()))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return createPortal(
    <div data-testid="overlay-fureai" className={overlayStyles.overlayCompact}>
      <span className={overlayStyles.compactTitle}>Pomodoro Pet</span>
      <span className={overlayStyles.compactClock}>{clock}</span>
      <button
        className={overlayStyles.compactCloseButton}
        onClick={() => fureaiCoordinator.exitFureai()}
        data-testid="fureai-close"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>,
    document.body
  )
}
