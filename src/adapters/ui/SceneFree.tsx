import { useState, useRef, useCallback } from 'react'
import { OverlayFree } from './OverlayFree'
import { FureaiEntryButton } from './FureaiEntryButton'
import { StartPomodoroButton } from './StartPomodoroButton'
import { StatsButton } from './StatsButton'
import { SettingsButton } from './SettingsButton'
import { SettingsCloseButton } from './SettingsCloseButton'
import { StatsCloseButton } from './StatsCloseButton'
import { StatsDrawer } from './StatsDrawer'

export function SceneFree(): JSX.Element {
  const [showStats, setShowStats] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const toggleSettingsRef = useRef<() => void>(() => {})
  const hideButtons = showStats || settingsExpanded

  const handleToggleRef = useCallback((toggle: () => void) => {
    toggleSettingsRef.current = toggle
  }, [])

  return (
    <>
      {!showStats && (
        <OverlayFree
          expanded={settingsExpanded}
          onExpandedChange={setSettingsExpanded}
          onToggleRef={handleToggleRef}
        />
      )}
      {showStats && <StatsDrawer onClose={() => setShowStats(false)} />}
      {showStats && <StatsCloseButton onClick={() => setShowStats(false)} />}
      {!hideButtons && <StartPomodoroButton />}
      {!hideButtons && <StatsButton onClick={() => setShowStats(true)} />}
      {!hideButtons && <SettingsButton onClick={() => toggleSettingsRef.current()} />}
      {settingsExpanded && <SettingsCloseButton onClick={() => toggleSettingsRef.current()} />}
      {!hideButtons && <FureaiEntryButton />}
    </>
  )
}
