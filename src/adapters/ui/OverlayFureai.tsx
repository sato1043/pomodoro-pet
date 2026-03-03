import { createPortal } from 'react-dom'
import { useAppDeps } from './AppContext'
import { useLicenseMode } from './LicenseContext'
import { CompactHeader } from './CompactHeader'
import BiorhythmChart from './BiorhythmChart'
import { EmotionIndicator } from './EmotionIndicator'
import { CharacterNameEditor } from './CharacterNameEditor'

export function OverlayFureai(): JSX.Element {
  const { bus } = useAppDeps()
  const { canUse } = useLicenseMode()

  return createPortal(
    <div data-testid="overlay-fureai">
      <CompactHeader>
        {canUse('biorhythm') && <BiorhythmChart />}
        {canUse('emotionAccumulation') && <EmotionIndicator bus={bus} />}
        <CharacterNameEditor />
      </CompactHeader>
    </div>,
    document.body
  )
}
