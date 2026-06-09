import type { RealmInfo } from '@/features/realm/components';

interface RealmListItem {
  realm_id: string;
  name: string;
  display_name: string;
  description?: string;
  logo_url?: string;
  status: string;
  deviceStatus: RealmInfo['deviceStatus'];
  isDefault?: boolean;
  last_accessed_at?: string | Date;
  owner_id?: string;
}

export function normalizeRealmListResponse(realms: RealmListItem[]): RealmInfo[] {
  return realms.map((realm) => ({
    realmId: realm.realm_id,
    name: realm.name,
    displayName: realm.display_name,
    description: realm.description,
    logoUrl: realm.logo_url,
    status: realm.status,
    deviceStatus: realm.deviceStatus,
    isDefault: realm.isDefault,
    lastAccessedAt: realm.last_accessed_at ? new Date(realm.last_accessed_at) : undefined,
    ownerId: realm.owner_id,
  }));
}

export function mergeRealmSnapshotPreserveStatus(
  previousRealms: RealmInfo[],
  incomingRealms: RealmInfo[]
): RealmInfo[] {
  const previousStatusMap = new Map(
    previousRealms.map((realm) => [realm.realmId, realm.deviceStatus] as const)
  );

  return incomingRealms.map((realm) => ({
    ...realm,
    deviceStatus: previousStatusMap.get(realm.realmId) ?? realm.deviceStatus,
  }));
}

export function replaceRealmSnapshot(incomingRealms: RealmInfo[]): RealmInfo[] {
  return incomingRealms;
}

export function applyDeviceStatusEvent(
  previousRealms: RealmInfo[],
  realmId: string,
  deviceStatus: RealmInfo['deviceStatus']
): RealmInfo[] {
  return previousRealms.map((realm) =>
    realm.realmId === realmId ? { ...realm, deviceStatus } : realm
  );
}
