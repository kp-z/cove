/**
 * LLM Adapter Errors
 */

export class LlmAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'LLM_ADAPTER_ERROR'
  ) {
    super(message)
    this.name = 'LlmAdapterError'
  }
}

export class LlmProviderError extends LlmAdapterError {
  constructor(provider: string, originalError: Error) {
    super(
      `LLM provider ${provider} failed: ${originalError.message}`,
      'LLM_PROVIDER_ERROR'
    )
    this.name = 'LlmProviderError'
  }
}

export class LlmInvalidResponseError extends LlmAdapterError {
  constructor(provider: string, reason: string) {
    super(
      `Invalid response from LLM provider ${provider}: ${reason}`,
      'LLM_INVALID_RESPONSE'
    )
    this.name = 'LlmInvalidResponseError'
  }
}

export class LlmRateLimitError extends LlmAdapterError {
  constructor(message: string) {
    super(message, 'LLM_RATE_LIMIT_ERROR')
    this.name = 'LlmRateLimitError'
  }
}

export class LlmAuthenticationError extends LlmAdapterError {
  constructor(message: string) {
    super(message, 'LLM_AUTHENTICATION_ERROR')
    this.name = 'LlmAuthenticationError'
  }
}

export class LlmTimeoutError extends LlmAdapterError {
  constructor(message: string) {
    super(message, 'LLM_TIMEOUT_ERROR')
    this.name = 'LlmTimeoutError'
  }
}

