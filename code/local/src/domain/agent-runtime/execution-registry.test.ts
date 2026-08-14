import { describe, it, expect } from 'vitest'
import { ExecutionRegistry } from './execution-registry'

describe('ExecutionRegistry', () => {
  it('register then abort triggers signal and returns true', () => {
    const reg = new ExecutionRegistry()
    const { controller } = reg.register('msg-1')
    expect(controller.signal.aborted).toBe(false)
    expect(reg.abort('msg-1')).toBe(true)
    expect(controller.signal.aborted).toBe(true)
  })

  it('abort unknown id is idempotent no-op', () => {
    const reg = new ExecutionRegistry()
    expect(reg.abort('missing')).toBe(false)
    expect(reg.abort('missing')).toBe(false)
  })

  it('double abort is idempotent', () => {
    const reg = new ExecutionRegistry()
    reg.register('msg-1')
    expect(reg.abort('msg-1')).toBe(true)
    expect(reg.abort('msg-1')).toBe(false)
  })

  it('unregister removes handle', () => {
    const reg = new ExecutionRegistry()
    const handle = reg.register('msg-1')
    reg.unregister(handle)
    expect(reg.has('msg-1')).toBe(false)
    expect(reg.abort('msg-1')).toBe(false)
  })

  it('unregistering a superseded handle keeps its replacement abortable', () => {
    const reg = new ExecutionRegistry()
    const first = reg.register('msg-1')
    const second = reg.register('msg-1')

    reg.unregister(first)

    expect(reg.has('msg-1')).toBe(true)
    expect(reg.abort('msg-1')).toBe(true)
    expect(second.controller.signal.aborted).toBe(true)
  })
})
