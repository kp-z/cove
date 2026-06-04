import path from 'path';

/**
 * Device start command builder.
 *
 * The `@cove/local-device` package is NOT published to npm, so the old
 * `npx @cove/local-device ...` form fails with:
 *   sh: cove-local-device: command not found
 * (npx cannot fetch the package, then falls back to running its bin name
 *  from PATH, which does not exist).
 *
 * Instead we generate a command that runs the local source checkout directly.
 *
 * Environment:
 * - SERVER_URL: backend base URL (http/https). Default `http://localhost:3002`.
 *   Converted to `ws(s)://` and suffixed with `/trpc` because the local agent's
 *   `--server` flag is consumed directly as a WebSocket URL (see
 *   code/local/src/websocket-client.ts -> `new URL(server.url)`).
 * - LOCAL_DEVICE_DIR: absolute path to the `code/local` package. Defaults to
 *   `../../local` relative to the backend process working directory (which is
 *   `code/cloud/backend` in dev), i.e. the repo's `code/local`.
 */

const DEFAULT_SERVER_URL = 'http://localhost:3002';

export interface DeviceStartParams {
  readonly deviceId: string;
  readonly apiKey: string;
  readonly realmId: string;
}

/**
 * Resolve the WebSocket URL the local device agent should connect to.
 * `http://host:3002` -> `ws://host:3002/trpc`
 */
export function resolveDeviceWsUrl(): string {
  const serverUrl = process.env.SERVER_URL || DEFAULT_SERVER_URL;
  return `${serverUrl.replace(/^http/, 'ws')}/trpc`;
}

/**
 * Resolve the absolute path to the local device package (`code/local`).
 */
export function resolveLocalDeviceDir(): string {
  return process.env.LOCAL_DEVICE_DIR || path.resolve(process.cwd(), '../../local');
}

/**
 * Build the shell command a user runs to start the local device agent.
 *
 * Uses `npm --prefix <dir> run dev -- ...` so it works without a separate
 * build step (the dev script runs the TypeScript source via tsx) and without
 * the user needing to `cd` into the package directory.
 */
export function buildDeviceStartCommand({ deviceId, apiKey, realmId }: DeviceStartParams): string {
  const wsUrl = resolveDeviceWsUrl();
  const dir = resolveLocalDeviceDir();
  const args = `--server ${wsUrl} --device-id ${deviceId} --api-key ${apiKey} --realm-id ${realmId}`;
  return `npm --prefix "${dir}" run dev -- ${args}`;
}
