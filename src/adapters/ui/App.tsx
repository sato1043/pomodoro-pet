import { AppProvider, type AppDeps } from './AppContext'
import { EnvironmentProvider } from './EnvironmentContext'
import { ThemeProvider } from './ThemeContext'
import { LicenseProvider } from './LicenseContext'
import { SceneRouter } from './SceneRouter'

interface AppProps {
  readonly deps: AppDeps
}

export function App({ deps }: AppProps): JSX.Element {
  return (
    <AppProvider value={deps}>
      <EnvironmentProvider>
        <ThemeProvider>
          <LicenseProvider>
            <SceneRouter />
          </LicenseProvider>
        </ThemeProvider>
      </EnvironmentProvider>
    </AppProvider>
  )
}
