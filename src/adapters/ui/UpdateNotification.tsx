import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import * as styles from './styles/update-notification.css'

interface UpdateNotificationProps {
  readonly pomodoroActive: boolean
}

export function UpdateNotification({ pomodoroActive }: UpdateNotificationProps): JSX.Element | null {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return
    const unsubscribe = window.electronAPI.onUpdateStatus((s) => {
      setStatus(s as UpdateStatus)
      setDismissed(false)
    })
    return unsubscribe
  }, [])

  if (!status) return null
  if (dismissed) return null
  if (pomodoroActive) return null
  if (status.state !== 'available' && status.state !== 'downloaded') return null

  const handleDownload = (): void => {
    window.electronAPI?.downloadUpdate?.()
  }

  const handleInstall = (): void => {
    window.electronAPI?.installUpdate?.()
  }

  const handleLater = (): void => {
    setDismissed(true)
  }

  return createPortal(
    <div className={styles.container} data-testid="update-notification">
      {status.state === 'available' && (
        <>
          <span>
            Update <span className={styles.versionText}>{status.version}</span> available
          </span>
          <button
            className={styles.actionButton}
            data-testid="update-download-btn"
            onClick={handleDownload}
          >
            Download
          </button>
          <button
            className={styles.laterButton}
            data-testid="update-later-btn"
            onClick={handleLater}
          >
            Later
          </button>
        </>
      )}
      {status.state === 'downloaded' && (
        <>
          <span>
            Update <span className={styles.versionText}>{status.version}</span> ready
          </span>
          <button
            className={styles.actionButton}
            data-testid="update-restart-btn"
            onClick={handleInstall}
          >
            Restart Now
          </button>
          <button
            className={styles.laterButton}
            data-testid="update-later-btn"
            onClick={handleLater}
          >
            Later
          </button>
        </>
      )}
    </div>,
    document.body
  )
}
