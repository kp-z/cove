/**
 * Get agent avatar URL from backend or return undefined for fallback
 * @param avatarUrl - Avatar URL from backend (optional)
 * @returns Avatar URL or undefined
 */
export function getAgentAvatarUrl(avatarUrl?: string | null): string | undefined {
  return avatarUrl || undefined;
}

/**
 * Get agent initials for fallback avatar display
 * @param name - Agent name
 * @returns Two-letter initials
 */
export function getAgentInitials(name: string): string {
  const parts = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s-_]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
