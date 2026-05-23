/**
 * Get the full URL for an avatar
 * @param avatarUrl - Avatar URL from backend (relative path like "storage/avatars/...")
 * @returns Full URL or undefined if no avatar
 */
export function getAvatarUrl(avatarUrl?: string | null | any): string | undefined {
  if (!avatarUrl) return undefined;

  // Handle case where avatarUrl is an object (e.g., { url: "..." })
  if (typeof avatarUrl === 'object' && avatarUrl.url) {
    avatarUrl = avatarUrl.url;
  }

  // Ensure avatarUrl is a string
  if (typeof avatarUrl !== 'string') {
    console.warn('Invalid avatar URL type:', typeof avatarUrl, avatarUrl);
    return undefined;
  }

  // If it's already a full URL (starts with http:// or https://), return as-is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  // Otherwise, prepend the API URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
  return `${apiUrl}/${avatarUrl}`;
}
