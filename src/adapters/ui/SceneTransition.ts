export interface SceneTransitionHandle {
  readonly overlay: HTMLDivElement
  readonly style: string
  readonly isPlaying: boolean
  playBlackout(midpointCallback: () => void): Promise<void>
  dispose(): void
}

const FADE_DURATION_MS = 350

export function createSceneTransition(): SceneTransitionHandle {
  const overlay = document.createElement('div')
  overlay.className = 'scene-transition-overlay'

  let playing = false

  const style = `
    .scene-transition-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: black;
      opacity: 0;
      pointer-events: none;
      transition: opacity ${FADE_DURATION_MS}ms ease;
    }
  `

  function playBlackout(midpointCallback: () => void): Promise<void> {
    if (playing) {
      midpointCallback()
      return Promise.resolve()
    }

    playing = true

    return new Promise<void>((resolve) => {
      // フェードアウト: opacity 0 → 1
      overlay.style.opacity = '1'

      setTimeout(() => {
        // 暗転中にモード切替
        midpointCallback()

        // フェードイン: opacity 1 → 0
        overlay.style.opacity = '0'

        setTimeout(() => {
          playing = false
          resolve()
        }, FADE_DURATION_MS)
      }, FADE_DURATION_MS)
    })
  }

  function dispose(): void {
    overlay.remove()
  }

  return {
    overlay,
    style,
    get isPlaying() { return playing },
    playBlackout,
    dispose
  }
}
