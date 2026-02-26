import { useState, useEffect } from 'react'
import * as styles from './styles/about.css'
import * as regStyles from './styles/registration.css'

interface RegistrationContentProps {
  readonly onBack: () => void
  readonly onRegistered: () => void
  readonly keyHint?: string
}

export function RegistrationContent({ onBack, onRegistered, keyHint }: RegistrationContentProps): JSX.Element {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guideText, setGuideText] = useState<string | null>(null)
  const [showKeyInput, setShowKeyInput] = useState(!keyHint)

  useEffect(() => {
    if (window.electronAPI?.loadRegistrationGuide) {
      window.electronAPI.loadRegistrationGuide().then(text => {
        setGuideText(text || null)
      })
    }
  }, [])

  const handleRegister = async (): Promise<void> => {
    const trimmed = key.trim()
    if (!trimmed) {
      setError('Please enter a download key.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (!window.electronAPI?.registerLicense) {
        setError('Registration is not available in this environment.')
        return
      }
      const result = await window.electronAPI.registerLicense(trimmed)
      if (result.success) {
        onRegistered()
        onBack()
      } else {
        setError(result.error ?? 'Registration failed.')
      }
    } catch {
      setError('Network error. Please check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="registration-content" className={styles.container}>
      <div className={styles.scrollContent}>
        <h2 className={styles.heading}>Register</h2>

        {keyHint && (
          <div className={styles.section}>
            <div className={styles.versionText}>Registered ({keyHint})</div>
            <button className={regStyles.changeKeyLink} onClick={() => setShowKeyInput(!showKeyInput)}>
              {showKeyInput ? 'Cancel change key' : 'Change key'}
            </button>
          </div>
        )}

        {showKeyInput && (
          <>
            <div className={styles.section} style={{ marginBottom: 8 }}>
              <div className={styles.sectionTitle}>Download Key</div>
              <input
                className={regStyles.inputField}
                data-testid="registration-input"
                type="text"
                placeholder="Enter download key..."
                value={key}
                onChange={e => { setKey(e.target.value); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter' && !loading) handleRegister() }}
                disabled={loading}
              />
            </div>

            <div className={regStyles.buttonRow}>
              <button
                className={regStyles.primaryButton}
                data-testid="registration-submit"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? <><span className={regStyles.spinner} />Registering...</> : 'Register'}
              </button>
            </div>
            <div className={regStyles.errorRow}>
              {error && <div className={regStyles.errorText}>{error}</div>}
            </div>
          </>
        )}

        {guideText && (
          <div className={styles.expandSection}>
            <div className={styles.sectionTitle} style={{ marginTop: 32 }}>Registration Guide</div>
            <pre className={styles.licensePre}>{guideText}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
