import { createPortal } from 'react-dom'
import { FreeTimerPanel } from './FreeTimerPanel'
import * as overlayStyles from './styles/overlay.css'

interface OverlayFreeProps {
  readonly expanded?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
}

export function OverlayFree({ expanded, onExpandedChange }: OverlayFreeProps): JSX.Element {
  const className = expanded
    ? `${overlayStyles.overlay} ${overlayStyles.overlayExpanded}`
    : overlayStyles.overlay

  return createPortal(
    <div data-testid="overlay-free" className={className}>
      <div className={overlayStyles.title}>Pomodoro Pet</div>
      <FreeTimerPanel onExpandedChange={onExpandedChange} />
    </div>,
    document.body
  )
}
