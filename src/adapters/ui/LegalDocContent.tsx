import { useState, useEffect } from 'react'
import * as styles from './styles/about.css'
import { reflowParagraphs } from './reflowParagraphs'

interface LegalDocContentProps {
  readonly title: string
  readonly field: 'eulaText' | 'privacyPolicyText' | 'licensesText'
  readonly onBack: () => void
}

export function LegalDocContent({ title, field, onBack }: LegalDocContentProps): JSX.Element {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.loadAbout().then(data => {
      setText(data[field])
    }).catch(() => {
      setText('')
    })
  }, [field])

  if (text === null) {
    return (
      <div data-testid="legal-doc-content" className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div data-testid="legal-doc-content" className={styles.container}>
      <div className={styles.scrollContent}>
        <h2 className={styles.heading}>{title}</h2>

        {text && (
          <div className={styles.expandSection}>
            <pre className={styles.licensePre}>{reflowParagraphs(text)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
