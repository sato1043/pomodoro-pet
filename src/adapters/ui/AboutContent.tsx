import { useState, useEffect } from 'react'
import * as styles from './styles/about.css'
import { reflowParagraphs } from './reflowParagraphs'

interface AboutData {
  version: string
  licenseText: string
}

interface AboutContentProps {
  readonly onBack: () => void
}

export function AboutContent({ onBack }: AboutContentProps): JSX.Element {
  const [data, setData] = useState<AboutData | null>(null)

  useEffect(() => {
    window.electronAPI.loadAbout().then(d => {
      setData({ version: d.version, licenseText: d.licenseText })
    }).catch(() => {
      setData({ version: 'unknown', licenseText: '' })
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
      <div className={styles.scrollContent}>
        <h2 className={styles.heading}>About</h2>

        <div className={styles.section}>
          <div className={styles.versionText}>Version {data.version}</div>
          <div className={styles.copyrightText}>&copy; 2026 sato1043</div>
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
