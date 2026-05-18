/**
 * Secret Manager Interface
 *
 * Resolves secret references to actual values.
 * Supports multiple secret backends (environment variables, vault, etc.)
 */

export interface ISecretManager {
  /**
   * Resolve a secret reference to its actual value
   *
   * @param ref - Secret reference in format "type:path"
   *              Examples: "env:ANTHROPIC_API_KEY", "vault:prod/anthropic"
   * @returns The resolved secret value
   * @throws Error if the secret cannot be resolved
   */
  resolve(ref: string): Promise<string>;
}

/**
 * Secret reference format validation
 */
export const SECRET_REF_REGEX = /^(env|vault):.+$/;

/**
 * Validate if a string is a valid secret reference
 */
export function isValidSecretRef(ref: string): boolean {
  return SECRET_REF_REGEX.test(ref);
}
