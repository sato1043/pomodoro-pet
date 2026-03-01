import { createPortal } from 'react-dom'
import * as styles from './styles/trial-badge.css'

interface TrialBadgeProps {
  readonly licenseMode: LicenseMode | null
}

export function TrialBadge({ licenseMode }: TrialBadgeProps): JSX.Element | null {
  if (licenseMode !== 'trial') return null

  return createPortal(
    <span className={styles.badge} data-testid="trial-badge">Trial</span>,
    document.body
  )
}
