import { createPortal } from 'react-dom'
import { CompactHeader } from './CompactHeader'

export function OverlayFureai(): JSX.Element {
  return createPortal(
    <div data-testid="overlay-fureai">
      <CompactHeader />
    </div>,
    document.body
  )
}
