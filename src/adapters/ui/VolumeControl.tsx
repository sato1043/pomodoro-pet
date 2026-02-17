import { useCallback, useRef } from 'react'
import type { AudioAdapter } from '../../infrastructure/audio/AudioAdapter'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'
import { SOUND_PRESETS, type SoundPreset } from '../../infrastructure/audio/ProceduralSounds'

const SVG_SPEAKER_ON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`
const SVG_SPEAKER_OFF = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`

const DEFAULT_TEST_SOUND_URL = './audio/test.mp3'

interface VolumeControlProps {
  readonly audio: AudioAdapter
  readonly sfx: SfxPlayer | null
  readonly showPresets: boolean
  readonly onSoundChange?: () => void
  readonly forceUpdateKey?: number
}

export function VolumeControl({ audio, sfx, showPresets, onSoundChange, forceUpdateKey: _forceUpdateKey }: VolumeControlProps): JSX.Element {
  const volumeBeforeMuteRef = useRef(audio.volume)

  const playTestSound = useCallback(() => {
    if (sfx && !audio.isMuted) {
      sfx.play(DEFAULT_TEST_SOUND_URL).catch(() => {})
    }
  }, [sfx, audio])

  const notifySoundChange = useCallback(() => {
    if (onSoundChange) onSoundChange()
  }, [onSoundChange])

  const handlePresetClick = useCallback(async (preset: SoundPreset) => {
    await audio.resume()
    audio.switchPreset(preset)
    notifySoundChange()
  }, [audio, notifySoundChange])

  const handleMuteClick = useCallback(() => {
    if (!audio.isMuted) {
      volumeBeforeMuteRef.current = audio.volume
      audio.setVolume(0)
      audio.toggleMute()
    } else {
      audio.toggleMute()
      audio.setVolume(volumeBeforeMuteRef.current)
      playTestSound()
    }
    notifySoundChange()
  }, [audio, playTestSound, notifySoundChange])

  const handleVolDown = useCallback(() => {
    audio.setVolume(Math.max(0, audio.volume - 0.1))
    syncMuteWithVolume()
    playTestSound()
    notifySoundChange()
  }, [audio, playTestSound, notifySoundChange])

  const handleVolUp = useCallback(() => {
    audio.setVolume(Math.min(1, audio.volume + 0.1))
    syncMuteWithVolume()
    playTestSound()
    notifySoundChange()
  }, [audio, playTestSound, notifySoundChange])

  const handleSegClick = useCallback((idx: number) => {
    audio.setVolume((idx + 1) / 10)
    syncMuteWithVolume()
    playTestSound()
    notifySoundChange()
  }, [audio, playTestSound, notifySoundChange])

  function syncMuteWithVolume(): void {
    if (audio.volume <= 0 && !audio.isMuted) {
      volumeBeforeMuteRef.current = 0.1
      audio.toggleMute()
    } else if (audio.volume > 0 && audio.isMuted) {
      audio.toggleMute()
    }
  }

  const volLevel = Math.round(audio.volume * 10)

  return (
    <div className="timer-sound-section">
      {showPresets && (
        <div className="timer-sound-presets">
          {SOUND_PRESETS.map(p => (
            <button
              key={p.name}
              className={`timer-sound-preset${p.name === audio.currentPreset ? ' active' : ''}`}
              onClick={() => handlePresetClick(p.name)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className="timer-volume-row">
        <button
          className="timer-mute-btn"
          onClick={handleMuteClick}
          dangerouslySetInnerHTML={{ __html: audio.isMuted ? SVG_SPEAKER_OFF : SVG_SPEAKER_ON }}
        />
        <button className="timer-vol-btn" onClick={handleVolDown}>&#9664;</button>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`timer-vol-seg${i < volLevel ? ' on' : ''}`}
            onClick={() => handleSegClick(i)}
          />
        ))}
        <button className="timer-vol-btn" onClick={handleVolUp}>&#9654;</button>
      </div>
    </div>
  )
}
