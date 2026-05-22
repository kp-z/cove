export type RealmRole = 'owner' | 'admin' | 'member' | 'visitor';

export function canEditRealm(role: RealmRole | null | undefined): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'admin';
}

export function canDeleteRealm(role: RealmRole | null | undefined): boolean {
  if (!role) return false;
  return role === 'owner';
}

export function canInviteMembers(role: RealmRole | null | undefined): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'admin';
}

export function canManageChannels(role: RealmRole | null | undefined): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'admin';
}

export function canPostMessages(role: RealmRole | null | undefined): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'admin' || role === 'member';
}

export function canViewRealm(role: RealmRole | null | undefined): boolean {
  return !!role;
}
