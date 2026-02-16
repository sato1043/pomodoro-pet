export interface CongratsPanelHandle {
  readonly container: HTMLDivElement
  readonly style: string
  spawnConfetti(): void
}

export function createCongratsPanel(): CongratsPanelHandle {
  const container = document.createElement('div')
  container.className = 'timer-congrats-mode'
  container.id = 'timer-congrats-mode'
  container.style.display = 'none'
  container.innerHTML = `
    <div class="congrats-confetti" id="congrats-confetti"></div>
    <div class="congrats-message">Congratulations!</div>
    <div class="congrats-sub">Pomodoro cycle completed</div>
    <div class="congrats-hint"></div>
  `

  const confettiEl = container.querySelector('#congrats-confetti') as HTMLDivElement

  function spawnConfetti(): void {
    confettiEl.innerHTML = ''
    const colors = ['#ffd54f', '#ff7043', '#42a5f5', '#66bb6a', '#ab47bc', '#ef5350']
    const count = 30
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span')
      piece.className = 'confetti-piece'
      piece.style.left = `${Math.random() * 100}%`
      piece.style.background = colors[i % colors.length]
      piece.style.animationDuration = `${1.5 + Math.random() * 1.5}s`
      piece.style.animationDelay = `${Math.random() * 0.8}s`
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
      piece.style.width = `${6 + Math.random() * 6}px`
      piece.style.height = `${6 + Math.random() * 6}px`
      confettiEl.appendChild(piece)
    }
  }

  const style = `
    .timer-congrats-mode {
      position: relative;
      overflow: hidden;
      padding: 40px 0;
    }
    .congrats-message {
      font-size: 42px;
      font-weight: 700;
      color: #ffd54f;
      text-shadow: 0 0 20px rgba(255, 213, 79, 0.4);
      margin-bottom: 8px;
      animation: congrats-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .congrats-sub {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 16px;
    }
    .congrats-hint {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.35);
      animation: congrats-blink 2s ease-in-out infinite;
    }
    @keyframes congrats-pop {
      0% { transform: scale(0.3); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes congrats-blink {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 0.7; }
    }
    .congrats-confetti {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .confetti-piece {
      position: absolute;
      width: 8px;
      height: 8px;
      top: -10px;
      animation: confetti-fall linear forwards;
    }
    @keyframes confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      80% { opacity: 1; }
      100% { transform: translateY(250px) rotate(720deg); opacity: 0; }
    }
  `

  return { container, style, spawnConfetti }
}
