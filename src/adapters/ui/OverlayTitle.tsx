import type { KouDefinition } from '../../domain/environment/value-objects/Kou'
import * as overlayStyles from './styles/overlay.css'

function formatDate(date: Date): string {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${m}/${d} ${days[date.getDay()]}`
}

interface OverlayTitleProps {
  readonly currentKou?: KouDefinition | null
}

export function OverlayTitle({ currentKou }: OverlayTitleProps): JSX.Element {
  return (
    <div className={overlayStyles.title}>
      <span>Pomodoro Pet</span>
      <span>
        {currentKou && `${currentKou.solarTermName} ${currentKou.phaseNameJa}　`}
        {formatDate(new Date())}
      </span>
    </div>
  )
}
