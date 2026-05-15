import { ExternalServiceError, InternalError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class LlmProviderError extends ExternalServiceError {
  readonly code = ERROR_CODES.LLM_PROVIDER_ERROR;

  constructor(provider: string, originalError: Error) {
    super(
      `LLM provider ${provider} failed: ${originalError.message}`,
      { provider, originalError: originalError.message }
    );
  }
}

export class LlmInvalidResponseError extends InternalError {
  readonly code = ERROR_CODES.LLM_INVALID_RESPONSE;

  constructor(provider: string, reason: string) {
    super(
      `Invalid response from LLM provider ${provider}: ${reason}`,
      { provider, reason }
    );
  }
}
