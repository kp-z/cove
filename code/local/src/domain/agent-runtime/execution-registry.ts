export interface ExecutionHandle {
  agentMessageId: string
  controller: AbortController
  startedAt: number
}

export class ExecutionRegistry {
  private readonly running = new Map<string, ExecutionHandle>()

  register(agentMessageId: string): ExecutionHandle {
    this.abort(agentMessageId)
    const controller = new AbortController()
    const handle = { agentMessageId, controller, startedAt: Date.now() }
    this.running.set(agentMessageId, handle)
    return handle
  }

  getSignal(agentMessageId: string): AbortSignal | undefined {
    return this.running.get(agentMessageId)?.controller.signal
  }

  has(agentMessageId: string): boolean {
    return this.running.has(agentMessageId)
  }

  abort(agentMessageId: string): boolean {
    const handle = this.running.get(agentMessageId)
    if (!handle) return false
    if (!handle.controller.signal.aborted) {
      handle.controller.abort()
    }
    this.running.delete(agentMessageId)
    return true
  }

  unregister(handle: ExecutionHandle): void {
    if (this.running.get(handle.agentMessageId) === handle) {
      this.running.delete(handle.agentMessageId)
    }
  }
}
