import { createPortal } from 'react-dom'
import * as styles from './styles/feature-locked.css'
import screenImg from '../../assets/images/screen04_pet.png'

interface FeatureLockedOverlayProps {
  readonly onDismiss: () => void
}

export function FeatureLockedOverlay({ onDismiss }: FeatureLockedOverlayProps): JSX.Element {
  const handleOpenStore = (): void => {
    window.electronAPI?.openExternal?.('https://www.updater.cc')
  }

  return createPortal(
    <div className={styles.backdrop} onClick={onDismiss} data-testid="feature-locked-overlay">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <p className={styles.title}>Premium Feature</p>
        <img className={styles.screenshot} src={screenImg} alt="Fureai Mode" />
        <p className={styles.message}>
          Feed your pet tasty treats,<br />
          give it cuddles,<br />
          and discover every adorable animation!
        </p>
        <div className={styles.buttonColumn}>
          <button
            className={styles.storeButton}
            data-testid="feature-locked-store"
            onClick={handleOpenStore}
          >
            Unlock Full Version!
          </button>
          <button
            className={styles.closeButton}
            onClick={onDismiss}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
