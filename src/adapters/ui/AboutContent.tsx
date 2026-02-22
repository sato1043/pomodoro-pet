import { useState, useEffect } from 'react'
import * as styles from './styles/about.css'

interface AboutData {
  version: string
  licensesText: string
}

interface AboutContentProps {
  readonly onBack: () => void
}

export function AboutContent({ onBack }: AboutContentProps): JSX.Element {
  const [data, setData] = useState<AboutData | null>(null)

  useEffect(() => {
    window.electronAPI.loadAbout().then(setData).catch(() => {
      setData({ version: 'unknown', licensesText: '' })
    })
  }, [])

  if (!data) {
    return (
      <div data-testid="about-content" className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div data-testid="about-content" className={styles.container}>
      <h2 className={styles.heading}>About</h2>

      <div className={styles.section}>
        <div className={styles.versionText}>Version {data.version}</div>
        <div className={styles.copyrightText}>&copy; 2026 sato1043</div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>License</div>
        <div className={styles.licenseText}>PolyForm Noncommercial 1.0.0</div>
      </div>

      {data.licensesText && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Third-party Licenses</div>
          <pre className={styles.licensePre}>{data.licensesText}</pre>
        </div>
      )}

      <div className={styles.closeRow}>
        <button className={styles.closeButton} onClick={onBack} data-testid="about-back" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
