import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import * as styles from './styles/license-toast.css'

interface LicenseToastProps {
  readonly licenseMode: LicenseMode | null
  readonly serverMessage?: string
}

export function LicenseToast({ licenseMode, serverMessage }: LicenseToastProps): JSX.Element | null {
  const [dismissed, setDismissed] = useState(false)
  const [prevMode, setPrevMode] = useState<LicenseMode | null>(null)

  // モード変更時にdismissをリセット
  useEffect(() => {
    if (licenseMode !== prevMode) {
      setDismissed(false)
      setPrevMode(licenseMode)
    }
  }, [licenseMode, prevMode])

  if (dismissed) return null

  // registered + サーバーメッセージ（オフライン通知）
  const showOfflineNotice = licenseMode === 'registered' && serverMessage
  // expired の場合
  const showExpiredNotice = licenseMode === 'expired'
  // restricted の場合
  const showRestrictedNotice = licenseMode === 'restricted'

  if (!showOfflineNotice && !showExpiredNotice && !showRestrictedNotice) return null

  const handleOpenStore = (): void => {
    window.electronAPI?.openExternal?.('https://www.updater.cc')
  }

  let message = ''
  let showStoreLink = false

  if (showOfflineNotice) {
    message = serverMessage ?? 'Could not verify registration status. Please connect to the internet.'
  } else if (showExpiredNotice) {
    message = 'Your trial period has ended. Register to unlock all features.'
    showStoreLink = true
  } else if (showRestrictedNotice) {
    message = 'Some features are limited. Register to unlock all features.'
    showStoreLink = true
  }

  return createPortal(
    <div className={styles.container} data-testid="license-toast">
      <div className={styles.message}>{message}</div>
      <div className={styles.linkRow}>
        {showStoreLink && (
          <button
            className={styles.linkButton}
            data-testid="license-toast-link"
            onClick={handleOpenStore}
          >
            Get Pomodoro Pet
          </button>
        )}
        <button
          className={styles.dismissButton}
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>
    </div>,
    document.body
  )
}
