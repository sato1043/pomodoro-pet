import { useEffect, useRef, useState } from 'react'
import type { EventBus } from '../../../domain/shared/EventBus'

/**
 * EventBusの指定イベントを購読し、最新イベントをReact stateとして返す。
 * アンマウント時に自動で購読解除する。
 */
export function useEventBus<T>(bus: EventBus, eventType: string): T | null {
  const [event, setEvent] = useState<T | null>(null)
  useEffect(() => {
    return bus.subscribe<T>(eventType, setEvent)
  }, [bus, eventType])
  return event
}

/**
 * EventBusの指定イベントでコールバックを実行する。
 * コールバック関数はrefで保持するため、依存配列への追加不要。
 */
export function useEventBusCallback<T>(
  bus: EventBus,
  eventType: string,
  callback: (event: T) => void
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  useEffect(() => {
    return bus.subscribe<T>(eventType, (e) => callbackRef.current(e))
  }, [bus, eventType])
}

/**
 * EventBusの指定イベント群を購読し、いずれかが発火するたびに再レンダリングをトリガーする。
 * タイマーtickなど、イベントデータ自体は不要だが再描画が必要なケースで使う。
 */
export function useEventBusTrigger(bus: EventBus, ...eventTypes: string[]): void {
  const [, setTick] = useState(0)
  useEffect(() => {
    const unsubs = eventTypes.map(type =>
      bus.subscribe(type, () => setTick(t => t + 1))
    )
    return () => unsubs.forEach(unsub => unsub())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus, ...eventTypes])
}
