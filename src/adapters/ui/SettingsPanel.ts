import type { EventBus } from '../../domain/shared/EventBus'
import type { AppSceneEvent } from '../../application/app-scene/AppScene'

export interface SettingsPanelElements {
  trigger: HTMLButtonElement
  container: HTMLDivElement
  dispose: () => void
}

export function createSettingsPanel(
  bus: EventBus
): SettingsPanelElements {
  // ギアアイコンボタン
  const trigger = document.createElement('button')
  trigger.id = 'settings-trigger'
  trigger.innerHTML = '&#9881;'
  trigger.title = 'Settings'

  // モーダルオーバーレイ
  const container = document.createElement('div')
  container.id = 'settings-overlay'
  container.style.display = 'none'

  function buildModal(): void {
    container.innerHTML = `
      <div class="settings-panel">
        <div class="settings-header">
          <span class="settings-title">Settings</span>
          <button class="settings-close" id="settings-close">&times;</button>
        </div>
        <div class="settings-body">
          <div class="settings-section">
            <div class="settings-section-title">Environment</div>
            <div class="settings-stub">調整中</div>
          </div>
        </div>
      </div>
    `
  }

  function open(): void {
    buildModal()
    container.style.display = ''

    const closeBtn = container.querySelector('#settings-close') as HTMLButtonElement
    closeBtn.addEventListener('click', close)
    container.addEventListener('click', (e) => {
      if (e.target === container) close()
    })
  }

  function close(): void {
    container.style.display = 'none'
  }

  trigger.addEventListener('click', open)

  // pomodoroモード中はtrigger非表示
  const unsubScene = bus.subscribe<AppSceneEvent>('AppSceneChanged', (event) => {
    if (event.type === 'AppSceneChanged') {
      trigger.style.display = event.scene === 'pomodoro' ? 'none' : ''
    }
  })

  const style = document.createElement('style')
  style.textContent = `
    #settings-trigger {
      position: absolute;
      top: 8px;
      right: 64px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.35);
      font-size: 36px;
      cursor: pointer;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
      padding: 0;
    }
    #settings-trigger:hover {
      color: rgba(255, 255, 255, 0.8);
    }
    #settings-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
    }
    .settings-panel {
      background: rgba(30, 30, 30, 0.95);
      color: #fff;
      border-radius: 12px;
      width: calc(100vw - 40px);
      max-width: 100%;
      font-family: 'Segoe UI', system-ui, sans-serif;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .settings-title {
      font-size: 26px;
      font-weight: 600;
    }
    .settings-close {
      background: none;
      border: none;
      color: #888;
      font-size: 44px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    }
    .settings-close:hover {
      color: #fff;
    }
    .settings-body {
      padding: 16px 20px;
    }
    .settings-section {
      margin-bottom: 32px;
      padding-bottom: 32px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .settings-section:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
    .settings-section-title {
      font-size: 24px;
      color: #888;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .settings-stub {
      font-size: 26px;
      color: #555;
      font-style: italic;
      padding: 8px 0;
    }
  `
  document.head.appendChild(style)

  return {
    trigger,
    container,
    dispose() {
      unsubScene()
      style.remove()
      trigger.remove()
      container.remove()
    }
  }
}
