import { createPortal } from 'react-dom'
import type { ReleaseChannel } from '../../application/license/LicenseState'
import * as styles from './styles/channel-badge.css'

interface ChannelBadgeProps {
  readonly channel: ReleaseChannel
}

export function ChannelBadge({ channel }: ChannelBadgeProps): JSX.Element | null {
  if (channel === 'stable') return null

  const label = channel === 'alpha' ? 'Alpha' : 'Beta'

  return createPortal(
    <span className={styles.badge} data-testid="channel-badge">{label}</span>,
    document.body
  )
}
