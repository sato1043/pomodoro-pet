import { AppProvider, type AppDeps } from './AppContext'
import { PromptInput } from './PromptInput'
import { TimerOverlay } from './TimerOverlay'

interface AppProps {
  readonly deps: AppDeps
}

export function App({ deps }: AppProps): JSX.Element {
  return (
    <AppProvider value={deps}>
      <TimerOverlay />
      <PromptInput />
    </AppProvider>
  )
}
