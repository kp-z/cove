const DICEBEAR_STYLES = [
  'avataaars-neutral',
  'big-ears-neutral',
  'lorelei-neutral',
  'notionists-neutral',
  'open-peeps',
  'personas',
] as const;

const BACKGROUND_COLORS = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getAgentAvatarUrl(id: string, name: string): string {
  const styleIndex = hashString(id) % DICEBEAR_STYLES.length;
  const style = DICEBEAR_STYLES[styleIndex];
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=${BACKGROUND_COLORS}&radius=50`;
}

export function getAgentInitials(name: string): string {
  const parts = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s-_]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
