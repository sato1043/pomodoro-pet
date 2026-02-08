import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { ThreeCharacterHandle } from '../../adapters/three/ThreeCharacterAdapter'
import { interpretPrompt } from '../../application/character/InterpretPromptUseCase'

export interface PromptInputElements {
  container: HTMLDivElement
  dispose: () => void
}

export function createPromptInput(
  character: Character,
  stateMachine: BehaviorStateMachine,
  charHandle: ThreeCharacterHandle
): PromptInputElements {
  const container = document.createElement('div')
  container.id = 'prompt-input'
  container.innerHTML = `
    <input type="text" id="prompt-field" placeholder="指示を入力... (例: walk, 座れ, dance)" />
    <button id="prompt-submit">Send</button>
  `

  const style = document.createElement('style')
  style.textContent = `
    #prompt-input {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      z-index: 1000;
    }
    #prompt-field {
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      width: 320px;
      outline: none;
      backdrop-filter: blur(8px);
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    #prompt-field::placeholder {
      color: #888;
    }
    #prompt-field:focus {
      border-color: rgba(255, 255, 255, 0.5);
    }
    #prompt-submit {
      background: rgba(76, 175, 80, 0.8);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 20px;
      font-size: 14px;
      cursor: pointer;
      font-family: 'Segoe UI', system-ui, sans-serif;
      transition: background 0.2s;
    }
    #prompt-submit:hover {
      background: rgba(76, 175, 80, 1);
    }
  `
  document.head.appendChild(style)

  const field = container.querySelector('#prompt-field') as HTMLInputElement
  const submitBtn = container.querySelector('#prompt-submit') as HTMLButtonElement

  function handleSubmit(): void {
    const text = field.value.trim()
    if (!text) return

    const action = interpretPrompt(text)
    stateMachine.transition({ type: 'prompt', action })
    character.setState(action)
    charHandle.playState(action)
    stateMachine.start()
    field.value = ''
  }

  submitBtn.addEventListener('click', handleSubmit)
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit()
  })

  return {
    container,
    dispose() {
      style.remove()
      container.remove()
    }
  }
}
