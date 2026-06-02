import { z } from 'zod';
import { router, procedure } from '../trpc';
import type { RealmService } from '../../../application/services/realm/realm.service';

export function createConfigurationRouter(realmService: RealmService) {
  return router({
    // Get configuration version for a realm
    getVersion: procedure
      .input(z.object({
        realmId: z.string(),
      }))
      .query(async () => {
        // Return current timestamp as version for now
        // TODO: Implement proper versioning in RealmService
        return Date.now();
      }),

    // Fetch realm configuration
    fetch: procedure
      .input(z.object({
        realmId: z.string(),
      }))
      .query(async ({ input }) => {
        const realm = await realmService.getRealmById(input.realmId);

        if (!realm) {
          throw new Error(`Realm not found: ${input.realmId}`);
        }

        return {
          realmId: realm.realm_id,
          name: realm.name,
          settings: realm.settings || {},
          version: Date.now(),
          checksum: '', // TODO: Implement checksum
          createdAt: realm.created_at,
          updatedAt: realm.updated_at,
        };
      }),
  });
}
