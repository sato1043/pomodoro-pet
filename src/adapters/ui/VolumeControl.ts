/**
 * ボリュームコントロール コンポーネント。
 * サウンドプリセット選択、ボリュームインジケーター、ミュートボタンを提供する。
 * ボリューム変更・ミュート解除時にSfxPlayerでテストサウンドを再生する。
 */

import type { AudioAdapter } from '../../infrastructure/audio/AudioAdapter'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'
import { SOUND_PRESETS } from '../../infrastructure/audio/ProceduralSounds'
import type { SoundPreset } from '../../infrastructure/audio/ProceduralSounds'

const SVG_SPEAKER_ON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`
const SVG_SPEAKER_OFF = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`

const DEFAULT_TEST_SOUND_URL = '/audio/test.mp3'

export interface VolumeControlConfig {
  readonly audio: AudioAdapter
  readonly sfx: SfxPlayer | null
  readonly testSoundUrl?: string
  readonly onSoundChange?: () => void
}

export interface VolumeControlHandle {
  readonly container: HTMLDivElement
  showPresets(): void
  hidePresets(): void
  updateAll(): void
  readonly style: string
}

export function createVolumeControl(config: VolumeControlConfig): VolumeControlHandle {
  const { audio, sfx, onSoundChange } = config
  const testSoundUrl = config.testSoundUrl ?? DEFAULT_TEST_SOUND_URL

  let volumeBeforeMute = audio.volume

  function buildSoundPresets(): string {
    return SOUND_PRESETS.map(p => {
      const active = p.name === audio.currentPreset ? ' active' : ''
      return `<button class="timer-sound-preset${active}" data-preset="${p.name}">${p.label}</button>`
    }).join('')
  }

  function buildVolumeSegments(): string {
    const volLevel = Math.round(audio.volume * 10)
    return Array.from({ length: 10 }, (_, i) =>
      `<span class="timer-vol-seg${i < volLevel ? ' on' : ''}" data-seg="${i}"></span>`
    ).join('')
  }

  const container = document.createElement('div')
  container.className = 'timer-sound-section'
  container.innerHTML = `
    <div class="timer-sound-presets" style="display:none">${buildSoundPresets()}</div>
    <div class="timer-volume-row">
      <button class="timer-mute-btn" data-role="mute">${audio.isMuted ? SVG_SPEAKER_OFF : SVG_SPEAKER_ON}</button>
      <button class="timer-vol-btn" data-role="vol-down">◀</button>
      ${buildVolumeSegments()}
      <button class="timer-vol-btn" data-role="vol-up">▶</button>
    </div>
  `

  // --- UI更新関数 ---

  function updateSoundPresetUI(): void {
    container.querySelectorAll('.timer-sound-preset').forEach(btn => {
      const el = btn as HTMLElement
      el.classList.toggle('active', el.dataset.preset === audio.currentPreset)
    })
  }

  function updateMuteUI(): void {
    const muteBtn = container.querySelector('[data-role="mute"]') as HTMLButtonElement | null
    if (muteBtn) muteBtn.innerHTML = audio.isMuted ? SVG_SPEAKER_OFF : SVG_SPEAKER_ON
  }

  function syncMuteWithVolume(): void {
    if (audio.volume <= 0 && !audio.isMuted) {
      volumeBeforeMute = 0.1
      audio.toggleMute()
      updateMuteUI()
    } else if (audio.volume > 0 && audio.isMuted) {
      audio.toggleMute()
      updateMuteUI()
    }
  }

  function updateVolumeUI(): void {
    const level = Math.round(audio.volume * 10)
    container.querySelectorAll('.timer-vol-seg').forEach(seg => {
      const idx = Number((seg as HTMLElement).dataset.seg)
      seg.classList.toggle('on', idx < level)
    })
    syncMuteWithVolume()
  }

  function playTestSound(): void {
    if (sfx && !audio.isMuted) {
      sfx.play(testSoundUrl).catch(() => {})
    }
  }

  function notifySoundChange(): void {
    if (onSoundChange) onSoundChange()
  }

  // --- イベントハンドラ ---

  container.querySelectorAll('.timer-sound-preset').forEach(btn => {
    btn.addEventListener('click', async () => {
      await audio.resume()
      const preset = (btn as HTMLElement).dataset.preset as SoundPreset
      if (preset) {
        audio.switchPreset(preset)
        updateSoundPresetUI()
        notifySoundChange()
      }
    })
  })

  const muteBtn = container.querySelector('[data-role="mute"]') as HTMLButtonElement
  muteBtn.addEventListener('click', () => {
    if (!audio.isMuted) {
      volumeBeforeMute = audio.volume
      audio.setVolume(0)
      audio.toggleMute()
    } else {
      audio.toggleMute()
      audio.setVolume(volumeBeforeMute)
      playTestSound()
    }
    updateMuteUI()
    updateVolumeUI()
    notifySoundChange()
  })

  const volDown = container.querySelector('[data-role="vol-down"]') as HTMLButtonElement
  const volUp = container.querySelector('[data-role="vol-up"]') as HTMLButtonElement

  volDown.addEventListener('click', () => {
    audio.setVolume(Math.max(0, audio.volume - 0.1))
    updateVolumeUI()
    playTestSound()
    notifySoundChange()
  })

  volUp.addEventListener('click', () => {
    audio.setVolume(Math.min(1, audio.volume + 0.1))
    updateVolumeUI()
    playTestSound()
    notifySoundChange()
  })

  container.querySelectorAll('.timer-vol-seg').forEach(seg => {
    seg.addEventListener('click', () => {
      const idx = Number((seg as HTMLElement).dataset.seg)
      audio.setVolume((idx + 1) / 10)
      updateVolumeUI()
      playTestSound()
      notifySoundChange()
    })
  })

  // --- CSS（TimerOverlayから移動） ---

  const style = `
    .timer-sound-section {
      margin-top: 16px;
      margin-bottom: 24px;
    }
    .timer-sound-presets {
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-bottom: 8px;
    }
    .timer-sound-preset {
      background: rgba(255, 255, 255, 0.1);
      color: #ccc;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 22px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .timer-sound-preset:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .timer-sound-preset.active {
      background: rgba(76, 175, 80, 0.6);
      border-color: rgba(76, 175, 80, 0.8);
      color: #fff;
    }
    .timer-volume-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .timer-mute-btn {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #fff;
      border-radius: 4px;
      width: 48px;
      height: 34px;
      cursor: pointer;
      font-size: 18px;
      transition: background 0.2s;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .timer-mute-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .timer-vol-btn {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #aaa;
      border-radius: 4px;
      width: 36px;
      height: 34px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .timer-vol-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
    .timer-vol-seg {
      flex: 1;
      height: 34px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: background 0.15s;
      cursor: pointer;
    }
    .timer-vol-seg.on {
      background: rgba(76, 175, 80, 0.5);
      border-color: rgba(76, 175, 80, 0.7);
    }
  `

  return {
    container,
    showPresets(): void {
      const presetsEl = container.querySelector('.timer-sound-presets') as HTMLElement | null
      if (presetsEl) presetsEl.style.display = ''
    },
    hidePresets(): void {
      const presetsEl = container.querySelector('.timer-sound-presets') as HTMLElement | null
      if (presetsEl) presetsEl.style.display = 'none'
    },
    updateAll(): void {
      updateSoundPresetUI()
      updateMuteUI()
      updateVolumeUI()
    },
    style
  }
}
