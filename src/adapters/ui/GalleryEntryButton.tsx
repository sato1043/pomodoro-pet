import { createPortal } from 'react-dom'
import * as styles from './styles/gallery.css'

interface GalleryEntryButtonProps {
  readonly onClick: () => void
}

export function GalleryEntryButton({ onClick }: GalleryEntryButtonProps): JSX.Element {
  return createPortal(
    <button
      className={styles.entryButton}
      onClick={onClick}
      data-testid="gallery-entry"
      title="Animation Gallery"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </button>,
    document.body
  )
}
