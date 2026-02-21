import { createPortal } from 'react-dom'
import { FreeTimerPanel } from './FreeTimerPanel'
import * as overlayStyles from './styles/overlay.css'

export function OverlayFree(): JSX.Element {
  return createPortal(
    <div data-testid="overlay-free" className={overlayStyles.overlay}>
      <div className={overlayStyles.title}>Pomodoro Pet</div>
      <FreeTimerPanel />
    </div>,
    document.body
  )
}
