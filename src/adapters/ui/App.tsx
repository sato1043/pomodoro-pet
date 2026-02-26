import { AppProvider, type AppDeps } from './AppContext'
import { ThemeProvider } from './ThemeContext'
import { LicenseProvider } from './LicenseContext'
import { SceneRouter } from './SceneRouter'

interface AppProps {
  readonly deps: AppDeps
}

export function App({ deps }: AppProps): JSX.Element {
  return (
    <AppProvider value={deps}>
      <ThemeProvider>
        <LicenseProvider>
          <SceneRouter />
        </LicenseProvider>
      </ThemeProvider>
    </AppProvider>
  )
}
