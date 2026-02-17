import { useState, useRef, useImperativeHandle, forwardRef } from 'react'

const FADE_DURATION_MS = 350

export interface SceneTransitionRef {
  readonly isPlaying: boolean
  playBlackout(midpointCallback: () => void): Promise<void>
}

export const SceneTransition = forwardRef<SceneTransitionRef>(
  function SceneTransition(_, ref) {
    const [opacity, setOpacity] = useState(0)
    const playingRef = useRef(false)

    useImperativeHandle(ref, () => ({
      get isPlaying() { return playingRef.current },
      playBlackout(midpointCallback: () => void): Promise<void> {
        if (playingRef.current) {
          midpointCallback()
          return Promise.resolve()
        }
        playingRef.current = true
        setOpacity(1)
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            midpointCallback()
            setOpacity(0)
            setTimeout(() => {
              playingRef.current = false
              resolve()
            }, FADE_DURATION_MS)
          }, FADE_DURATION_MS)
        })
      }
    }))

    return <div className="scene-transition-overlay" style={{ opacity }} />
  }
)
