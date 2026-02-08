import { describe, it, expect, vi } from 'vitest'
import { createEventBus } from '../../../src/domain/shared/EventBus'

describe('EventBus', () => {
  it('subscribeしたハンドラがpublish時に呼ばれる', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    bus.subscribe('test', handler)
    bus.publish('test', { value: 42 })
    expect(handler).toHaveBeenCalledWith({ value: 42 })
  })

  it('unsubscribe後はハンドラが呼ばれない', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    const unsubscribe = bus.subscribe('test', handler)
    unsubscribe()
    bus.publish('test', { value: 42 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('異なるイベントタイプは互いに影響しない', () => {
    const bus = createEventBus()
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    bus.subscribe('A', handlerA)
    bus.subscribe('B', handlerB)
    bus.publish('A', 'hello')
    expect(handlerA).toHaveBeenCalledWith('hello')
    expect(handlerB).not.toHaveBeenCalled()
  })

  it('同一イベントに複数ハンドラを登録できる', () => {
    const bus = createEventBus()
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    bus.subscribe('test', handler1)
    bus.subscribe('test', handler2)
    bus.publish('test', 'data')
    expect(handler1).toHaveBeenCalledWith('data')
    expect(handler2).toHaveBeenCalledWith('data')
  })
})
