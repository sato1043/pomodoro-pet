import type { PomodoroStateMachine } from '../../domain/timer/entities/PomodoroStateMachine'
import type { EventBus } from '../../domain/shared/EventBus'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'

function publishEvents(bus: EventBus, events: TimerEvent[]): void {
  for (const event of events) {
    bus.publish(event.type, event)
  }
}

export function startTimer(session: PomodoroStateMachine, bus: EventBus): void {
  const events = session.start()
  publishEvents(bus, events)
}

export function pauseTimer(session: PomodoroStateMachine, bus: EventBus): void {
  const events = session.pause()
  publishEvents(bus, events)
}

export function resetTimer(session: PomodoroStateMachine, bus: EventBus): void {
  const events = session.reset()
  publishEvents(bus, events)
}

export function tickTimer(session: PomodoroStateMachine, bus: EventBus, deltaMs: number): void {
  const events = session.tick(deltaMs)
  publishEvents(bus, events)
}
