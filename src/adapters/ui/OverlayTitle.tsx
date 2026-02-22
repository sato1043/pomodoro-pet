import * as overlayStyles from './styles/overlay.css'

function formatDate(date: Date): string {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${m}/${d} ${days[date.getDay()]}`
}

export function OverlayTitle(): JSX.Element {
  return (
    <div className={overlayStyles.title}>
      <span>Pomodoro Pet</span>
      <span>{formatDate(new Date())}</span>
    </div>
  )
}
