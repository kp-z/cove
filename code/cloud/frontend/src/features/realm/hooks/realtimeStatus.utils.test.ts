import { describe, expect, it } from 'vitest';
import type { RealmInfo } from '@/features/realm/components';
import {
  applyDeviceStatusEvent,
  mergeRealmSnapshotPreserveStatus,
  normalizeRealmListResponse,
  replaceRealmSnapshot,
} from './realtimeStatus.utils';

const offlineRealm: RealmInfo = {
  realmId: 'realm-a',
  name: 'realm-a',
  displayName: 'Realm A',
  status: 'active',
  deviceStatus: 'offline',
};

const onlineRealm: RealmInfo = {
  realmId: 'realm-a',
  name: 'realm-a',
  displayName: 'Realm A',
  status: 'active',
  deviceStatus: 'online',
};

describe('realtimeStatus.utils', () => {
  it('merges snapshot without overriding fresher device status', () => {
    const merged = mergeRealmSnapshotPreserveStatus(
      [onlineRealm],
      [offlineRealm]
    );

    expect(merged[0].deviceStatus).toBe('online');
  });

  it('applies subscription event to target realm only', () => {
    const secondRealm: RealmInfo = {
      realmId: 'realm-b',
      name: 'realm-b',
      displayName: 'Realm B',
      status: 'active',
      deviceStatus: 'offline',
    };

    const updated = applyDeviceStatusEvent(
      [offlineRealm, secondRealm],
      'realm-b',
      'online'
    );

    expect(updated[0].deviceStatus).toBe('offline');
    expect(updated[1].deviceStatus).toBe('online');
  });

  it('normalizes realm.list response to RealmInfo shape', () => {
    const normalized = normalizeRealmListResponse([
      {
        realm_id: 'realm-x',
        name: 'realm-x',
        display_name: 'Realm X',
        status: 'active',
        deviceStatus: 'online',
        owner_id: 'owner-1',
      },
    ]);

    expect(normalized[0]).toMatchObject({
      realmId: 'realm-x',
      displayName: 'Realm X',
      deviceStatus: 'online',
      ownerId: 'owner-1',
    });
  });

  it('replaces snapshot during reconnect resync', () => {
    const replaced = replaceRealmSnapshot([offlineRealm]);
    expect(replaced[0].deviceStatus).toBe('offline');
  });
});
