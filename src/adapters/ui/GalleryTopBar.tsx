import { createPortal } from 'react-dom'
import * as styles from './styles/gallery.css'

export type GalleryMode = 'clips' | 'states' | 'rules'

interface GalleryTopBarProps {
  mode: GalleryMode
  onModeChange: (mode: GalleryMode) => void
}

export function GalleryTopBar({ mode, onModeChange }: GalleryTopBarProps): JSX.Element {
  return createPortal(
    <div className={styles.topBar} data-testid="gallery-top-bar">
      <span className={styles.topBarTitle}>Gallery</span>
      <button
        className={`${styles.modeTab} ${mode === 'clips' ? styles.modeTabActive : ''}`}
        onClick={() => onModeChange('clips')}
        data-testid="gallery-mode-clips"
      >
        Clips
      </button>
      <button
        className={`${styles.modeTab} ${mode === 'states' ? styles.modeTabActive : ''}`}
        onClick={() => onModeChange('states')}
        data-testid="gallery-mode-states"
      >
        States
      </button>
      <button
        className={`${styles.modeTab} ${mode === 'rules' ? styles.modeTabActive : ''}`}
        onClick={() => onModeChange('rules')}
        data-testid="gallery-mode-rules"
      >
        Rules
      </button>
    </div>,
    document.body
  )
}
