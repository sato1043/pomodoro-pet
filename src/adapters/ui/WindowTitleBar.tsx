import { createPortal } from 'react-dom'
import * as css from './styles/window-title-bar.css'

function MinimizeIcon(): JSX.Element {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1">
      <rect fill="currentColor" width="10" height="1" />
    </svg>
  )
}

function CloseIcon(): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path
        fill="currentColor"
        d="M1.41 0L5 3.59 8.59 0 10 1.41 6.41 5 10 8.59 8.59 10 5 6.41 1.41 10 0 8.59 3.59 5 0 1.41z"
      />
    </svg>
  )
}

export function WindowTitleBar(): JSX.Element {
  const handleMinimize = (): void => {
    window.electronAPI?.windowMinimize()
  }

  const handleClose = (): void => {
    window.electronAPI?.windowClose()
  }

  return createPortal(
    <div
      className={css.titleBar}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <button
        className={css.buttonBase}
        onClick={handleMinimize}
        aria-label="Minimize"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <MinimizeIcon />
      </button>
      <button
        className={`${css.buttonBase} ${css.closeButton}`}
        onClick={handleClose}
        aria-label="Close"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <CloseIcon />
      </button>
    </div>,
    document.body,
  )
}
