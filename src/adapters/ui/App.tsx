import { AppProvider, type AppDeps } from './AppContext'
import { ThemeProvider } from './ThemeContext'
import { SceneRouter } from './SceneRouter'

interface AppProps {
  readonly deps: AppDeps
}

export function App({ deps }: AppProps): JSX.Element {
  return (
    <AppProvider value={deps}>
      <ThemeProvider>
        <SceneRouter />
      </ThemeProvider>
    </AppProvider>
  )
}
