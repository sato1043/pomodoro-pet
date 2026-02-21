import { useState } from 'react'
import { OverlayFree } from './OverlayFree'
import { FureaiEntryButton } from './FureaiEntryButton'
import { StartPomodoroButton } from './StartPomodoroButton'
import { StatsButton } from './StatsButton'
import { StatsDrawer } from './StatsDrawer'

export function SceneFree(): JSX.Element {
  const [showStats, setShowStats] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const hideStartButton = showStats || settingsExpanded

  return (
    <>
      {!showStats && <OverlayFree expanded={settingsExpanded} onExpandedChange={setSettingsExpanded} />}
      {showStats && <StatsDrawer onClose={() => setShowStats(false)} />}
      {!hideStartButton && <StartPomodoroButton />}
      {!hideStartButton && <StatsButton onClick={() => setShowStats(true)} />}
      {!hideStartButton && <FureaiEntryButton />}
    </>
  )
}
