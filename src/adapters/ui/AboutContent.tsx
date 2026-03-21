import { useState, useEffect } from 'react'
import * as styles from './styles/about.css'
import { reflowParagraphs } from './reflowParagraphs'

interface AboutData {
  version: string
  licenseText: string
}

type UpdateCheckState = 'idle' | 'checking' | 'up-to-date' | 'available' | 'error'

interface AboutContentProps {
  readonly onBack: () => void
}

export function AboutContent({ onBack }: AboutContentProps): JSX.Element {
  const [data, setData] = useState<AboutData | null>(null)
  const [updateState, setUpdateState] = useState<UpdateCheckState>('idle')

  useEffect(() => {
    window.electronAPI.loadAbout().then(d => {
      setData({ version: d.version, licenseText: d.licenseText })
    }).catch(() => {
      setData({ version: 'unknown', licenseText: '' })
    })
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return
    const unsubscribe = window.electronAPI.onUpdateStatus((s) => {
      const status = s as UpdateStatus
      if (status.state === 'checking') setUpdateState('checking')
      else if (status.state === 'available') setUpdateState('available')
      else if (status.state === 'not-available') setUpdateState('up-to-date')
      else if (status.state === 'error') setUpdateState('error')
    })
    return unsubscribe
  }, [])

  const handleCheckUpdate = async (): Promise<void> => {
    setUpdateState('checking')
    const result = await window.electronAPI?.checkForUpdate?.()
    if (result === 'not-available') {
      setUpdateState('up-to-date')
    }
    // result === 'ok' の場合はautoUpdaterのイベントでonUpdateStatusが発火する
  }

  if (!data) {
    return (
      <div data-testid="about-content" className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div data-testid="about-content" className={styles.container}>
      <div className={styles.scrollContent}>
        <h2 className={styles.heading}>About</h2>

        <div className={styles.section}>
          <div className={styles.versionText}>Version {data.version}</div>
          <div className={styles.copyrightText}>&copy; 2026 sato1043</div>
          <div style={{ marginTop: 8 }}>
            <button
              className={styles.aboutLinkButton}
              onClick={handleCheckUpdate}
              disabled={updateState === 'checking'}
              data-testid="check-update-btn"
              style={{ fontSize: 12 }}
            >
              {updateState === 'checking' ? 'Checking...'
                : updateState === 'up-to-date' ? 'Up to date'
                : updateState === 'available' ? 'Update available!'
                : updateState === 'error' ? 'Check failed'
                : 'Check for Update'}
            </button>
          </div>
        </div>

        {data.licenseText && (
          <div className={styles.expandSection}>
            <div className={styles.sectionTitle}>License</div>
            <pre className={styles.licensePre}>{reflowParagraphs(data.licenseText)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
