import { AppProvider, type AppDeps } from './AppContext'
import { ThemeProvider } from './ThemeContext'
import { PromptInput } from './PromptInput'
import { TimerOverlay } from './TimerOverlay'

interface AppProps {
  readonly deps: AppDeps
}

export function App({ deps }: AppProps): JSX.Element {
  return (
    <AppProvider value={deps}>
      <ThemeProvider>
        <TimerOverlay />
        <PromptInput />
      </ThemeProvider>
    </AppProvider>
  )
}
