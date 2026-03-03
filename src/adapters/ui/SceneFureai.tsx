import { useState } from 'react'
import { useAppDeps } from './AppContext'
import { OverlayFureai } from './OverlayFureai'
import { FureaiExitButton } from './FureaiExitButton'
import { PromptInput } from './PromptInput'
import { HeartEffect } from './HeartEffect'
import { useEventBusCallback } from './hooks/useEventBus'
import type { FeedingSuccessEvent } from '../three/FeedingInteractionAdapter'

export function SceneFureai(): JSX.Element {
  const { bus } = useAppDeps()
  const [heartKey, setHeartKey] = useState(0)

  useEventBusCallback<FeedingSuccessEvent>(bus, 'FeedingSuccess', () => {
    setHeartKey((k) => k + 1)
  })

  return (
    <>
      <OverlayFureai />
      <FureaiExitButton />
      <PromptInput />
      <HeartEffect triggerKey={heartKey} />
    </>
  )
}
