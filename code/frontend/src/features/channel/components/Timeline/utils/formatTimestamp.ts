/**
 * Format timestamp for timeline display
 * - Recent events: "19m ago", "2h ago"
 * - Yesterday: "Yesterday"
 * - Recent days: "3d ago"
 * - Older events: "May 16" or "Apr 3, 2026"
 */
export function formatTimestamp(date: Date | string): string {
  const timestamp = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  // Format as "May 16" or "Apr 3, 2026"
  const isCurrentYear = timestamp.getFullYear() === now.getFullYear();
  return timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  });
}
