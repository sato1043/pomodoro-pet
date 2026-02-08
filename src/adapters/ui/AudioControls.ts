import type { AudioAdapter } from '../../infrastructure/audio/AudioAdapter'
import { SOUND_PRESETS } from '../../infrastructure/audio/ProceduralSounds'

export interface AudioControlsElements {
  container: HTMLDivElement
  dispose: () => void
}

export function createAudioControls(audio: AudioAdapter): AudioControlsElements {
  const container = document.createElement('div')
  container.id = 'audio-controls'

  const presetButtons = SOUND_PRESETS.map(p =>
    `<button class="audio-preset-btn" data-preset="${p.name}">${p.label}</button>`
  ).join('')

  container.innerHTML = `
    <div class="audio-header">
      <span class="audio-label">Sound</span>
      <button id="audio-mute" class="audio-mute-btn" title="Mute">♪</button>
    </div>
    <div class="audio-presets">${presetButtons}</div>
    <div class="audio-volume-row">
      <input type="range" id="audio-volume" min="0" max="100" value="50" class="audio-slider" />
    </div>
  `

  const style = document.createElement('style')
  style.textContent = `
    #audio-controls {
      position: fixed;
      bottom: 70px;
      right: 20px;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      border-radius: 12px;
      padding: 12px 16px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      z-index: 1000;
      backdrop-filter: blur(8px);
      min-width: 180px;
      user-select: none;
    }
    .audio-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .audio-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      color: #aaa;
    }
    .audio-mute-btn {
      background: none;
      border: 1px solid rgba(255,255,255,0.25);
      color: #fff;
      border-radius: 4px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .audio-mute-btn:hover {
      background: rgba(255,255,255,0.15);
    }
    .audio-mute-btn.muted {
      color: #666;
      text-decoration: line-through;
    }
    .audio-presets {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .audio-preset-btn {
      background: rgba(255,255,255,0.1);
      color: #ccc;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .audio-preset-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    .audio-preset-btn.active {
      background: rgba(76, 175, 80, 0.6);
      border-color: rgba(76, 175, 80, 0.8);
      color: #fff;
    }
    .audio-volume-row {
      display: flex;
      align-items: center;
    }
    .audio-slider {
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      outline: none;
    }
    .audio-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      cursor: pointer;
    }
  `
  document.head.appendChild(style)

  const muteBtn = container.querySelector('#audio-mute') as HTMLButtonElement
  const volumeSlider = container.querySelector('#audio-volume') as HTMLInputElement
  const presetBtns = container.querySelectorAll('.audio-preset-btn')

  function updatePresetUI(): void {
    presetBtns.forEach(btn => {
      const preset = (btn as HTMLElement).dataset.preset
      btn.classList.toggle('active', preset === audio.currentPreset)
    })
  }

  function updateMuteUI(): void {
    muteBtn.classList.toggle('muted', audio.isMuted)
    muteBtn.textContent = audio.isMuted ? '♪' : '♪'
    muteBtn.style.opacity = audio.isMuted ? '0.5' : '1'
  }

  // ユーザーインタラクションでAudioContextをresume
  async function handleUserInteraction(): Promise<void> {
    await audio.resume()
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      await handleUserInteraction()
      const preset = (btn as HTMLElement).dataset.preset
      if (preset) {
        audio.switchPreset(preset as 'rain' | 'forest' | 'wind' | 'silence')
        updatePresetUI()
      }
    })
  })

  muteBtn.addEventListener('click', () => {
    audio.toggleMute()
    updateMuteUI()
  })

  volumeSlider.addEventListener('input', () => {
    audio.setVolume(parseInt(volumeSlider.value) / 100)
  })

  updatePresetUI()
  updateMuteUI()

  return {
    container,
    dispose() {
      style.remove()
      container.remove()
    }
  }
}
