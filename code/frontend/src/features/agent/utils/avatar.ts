/**
 * Get agent avatar URL from backend or return undefined for fallback
 * @param avatarUrl - Avatar URL from backend (optional)
 * @returns Full avatar URL or undefined
 */
export function getAgentAvatarUrl(avatarUrl?: string | null): string | undefined {
  if (!avatarUrl) return undefined;

  // If already a full URL, return as-is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  // Build full URL from relative path
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return `${apiUrl}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
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
