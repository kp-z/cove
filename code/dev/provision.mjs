#!/usr/bin/env node
/**
 * 为 dev stack 准备固定复用的 Local 设备凭证。
 *
 * 约定：
 * - 默认只准备 Nexus（官方 Realm）一台 Device。
 * - 设置 COVE_DUAL=1 时额外准备固定名 cove-dev-custom 的第二台。
 *
 * 输出目录（默认 ~/.cove/dev-stack）：
 *   nexus.config.json / custom.config.json  —— Local 启动用
 *   state.json                             —— 用户/realm 元信息
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BACKEND = process.env.COVE_BACKEND_URL || 'http://localhost:3002';
const DEV_HOME = process.env.COVE_DEV_HOME || join(homedir(), '.cove', 'dev-stack');
const DEV_USER = process.env.COVE_DEV_USER || 'cove_dev_stack';
const DEV_PASS = process.env.COVE_DEV_PASS || 'CoveDev123!';
const DEV_EMAIL = process.env.COVE_DEV_EMAIL || 'cove-dev-stack@example.com';
const CUSTOM_REALM_NAME = process.env.COVE_CUSTOM_REALM_NAME || 'cove-dev-custom';
const NEXUS_REALM_ID = 'realm-nexus';
const WS_URL = (process.env.COVE_WS_URL || BACKEND.replace(/^http/, 'ws')) + '/trpc';

function unwrapTrpc(payload) {
  if (payload?.error) {
    const err = payload.error?.json || payload.error;
    const msg =
      err?.message ||
      (Array.isArray(err?.data?.zodError?.fieldErrors)
        ? JSON.stringify(err.data.zodError)
        : null) ||
      (err?.data?.zodError ? JSON.stringify(err.data.zodError) : null) ||
      JSON.stringify(payload.error);
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  const data = payload?.result?.data;
  // 有 transformer 时是 { json: T }；本项目无 transformer，data 即业务对象
  if (data && typeof data === 'object' && 'json' in data && Object.keys(data).length <= 2) {
    return data.json;
  }
  return data;
}

/**
 * 调用本仓库 tRPC HTTP 接口。
 *
 * 注意：backend 未配置 superjson transformer，createHTTPHandler 对非 batch
 * POST 期望的 body 是「裸 input」，而不是 httpBatchLink 用的 `{ json: input }`。
 * 用错包装时 Zod 会报 username/password Required（收到 undefined）。
 */
async function trpc(path, input, { token, realmId } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (realmId) headers['x-realm-id'] = realmId;

  const res = await fetch(`${BACKEND}/trpc/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input ?? null),
  });

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`tRPC ${path} 返回非 JSON（HTTP ${res.status}）: ${text.slice(0, 200)}`);
  }

  try {
    return unwrapTrpc(payload);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`tRPC ${path} 失败: ${detail}`);
  }
}

async function waitHealth(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BACKEND}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Backend 未在 ${timeoutMs}ms 内就绪: ${BACKEND}/health`);
}

async function ensureUser() {
  try {
    const login = await trpc('auth.login', {
      username: DEV_USER,
      password: DEV_PASS,
    });
    return {
      token: login.token,
      userId: login.user.user_id,
    };
  } catch (loginErr) {
    console.log(`[provision] 登录失败，尝试注册: ${loginErr instanceof Error ? loginErr.message : loginErr}`);
  }

  try {
    const reg = await trpc('auth.register', {
      username: DEV_USER,
      email: DEV_EMAIL,
      password: DEV_PASS,
      displayName: 'Cove Dev Stack',
    });
    return {
      token: reg.token,
      userId: reg.user.user_id,
    };
  } catch (regErr) {
    // 可能已注册成功，再登录一次
    console.log(`[provision] 注册未成功，重试登录: ${regErr instanceof Error ? regErr.message : regErr}`);
    const login = await trpc('auth.login', {
      username: DEV_USER,
      password: DEV_PASS,
    });
    return {
      token: login.token,
      userId: login.user.user_id,
    };
  }
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function buildLocalConfig({ deviceId, apiKey, realmId, name, dataDir }) {
  return {
    server: {
      url: WS_URL,
      token: '',
    },
    device: {
      id: deviceId,
      name,
      apiKey,
      realmId,
    },
    local: {
      dataDir,
      heartbeatInterval: 30000,
      reconnectDelay: 5000,
      maxConcurrentTasks: 3,
    },
  };
}

async function parseDeviceCredentials(cmd, fallbackRealmId) {
  const apiKey = cmd?.apiKey;
  let deviceId = cmd?.deviceId;
  if (!deviceId && typeof cmd?.startCommand === 'string') {
    const m = cmd.startCommand.match(/--device-id\s+(\S+)/);
    deviceId = m?.[1];
  }
  let realmId = fallbackRealmId;
  if (!realmId && typeof cmd?.startCommand === 'string') {
    const m = cmd.startCommand.match(/--realm-id\s+(\S+)/);
    realmId = m?.[1];
  }
  if (!apiKey || !deviceId || !realmId) {
    throw new Error('generateDeviceStartCommand 返回不完整（需要 deviceId/apiKey/realmId）');
  }
  return { deviceId, apiKey, realmId };
}

async function issueRealmDeviceCredentials(token, realmId) {
  const cmd = await trpc(
    'realm.generateDeviceStartCommand',
    { realmId },
    { token, realmId }
  );
  return parseDeviceCredentials(cmd, realmId);
}

async function ensureNexusDevice(token) {
  const configPath = join(DEV_HOME, 'nexus.config.json');
  const existing = await readJson(configPath);
  if (existing?.device?.id && existing?.device?.apiKey && existing?.device?.realmId) {
    console.log(`[provision] 复用 Nexus 设备: ${existing.device.id}`);
    return existing;
  }

  // Nexus 启动时通常已种好唯一 Device（realmId 唯一约束），不能再 registerLocalDevice。
  // 优先对已有设备签发/轮换 apiKey；仅当确认没有设备时才注册。
  try {
    console.log('[provision] 为已有 Nexus 设备签发 apiKey…');
    const creds = await issueRealmDeviceCredentials(token, NEXUS_REALM_ID);
    const config = buildLocalConfig({
      deviceId: creds.deviceId,
      apiKey: creds.apiKey,
      realmId: creds.realmId,
      name: 'cove-dev-nexus',
      dataDir: join(DEV_HOME, 'data-nexus'),
    });
    await writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`[provision] Nexus 设备凭证已落盘: ${config.device.id}`);
    return config;
  } catch (issueErr) {
    console.log(
      `[provision] 签发失败，尝试注册新设备: ${issueErr instanceof Error ? issueErr.message : issueErr}`
    );
  }

  try {
    const created = await trpc(
      'device.registerLocalDevice',
      { name: 'cove-dev-nexus', type: 'local' },
      { realmId: NEXUS_REALM_ID }
    );
    const config = buildLocalConfig({
      deviceId: created.deviceId,
      apiKey: created.apiKey,
      realmId: created.realmId || NEXUS_REALM_ID,
      name: created.name || 'cove-dev-nexus',
      dataDir: join(DEV_HOME, 'data-nexus'),
    });
    await writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`[provision] Nexus 设备已创建并落盘: ${config.device.id}`);
    return config;
  } catch (regErr) {
    const msg = regErr instanceof Error ? regErr.message : String(regErr);
    if (/Unique constraint|realmId/i.test(msg)) {
      // 设备已存在但刚才签发失败：再试一次签发（backend 重启后开发权限生效）
      console.log('[provision] Nexus 设备已存在，重新签发 apiKey…');
      const creds = await issueRealmDeviceCredentials(token, NEXUS_REALM_ID);
      const config = buildLocalConfig({
        deviceId: creds.deviceId,
        apiKey: creds.apiKey,
        realmId: creds.realmId,
        name: 'cove-dev-nexus',
        dataDir: join(DEV_HOME, 'data-nexus'),
      });
      await writeFile(configPath, JSON.stringify(config, null, 2));
      console.log(`[provision] Nexus 设备凭证已落盘: ${config.device.id}`);
      return config;
    }
    throw regErr;
  }
}

async function findCustomRealm(token) {
  const listed = await trpc('realm.list', undefined, { token });
  const realms = listed?.realms || listed || [];
  return realms.find((r) => r.name === CUSTOM_REALM_NAME) || null;
}

async function ensureCustomDevice(token, userId) {
  const configPath = join(DEV_HOME, 'custom.config.json');
  const existing = await readJson(configPath);
  if (existing?.device?.id && existing?.device?.apiKey && existing?.device?.realmId) {
    console.log(`[provision] 复用 Custom 设备: ${existing.device.id} @ ${existing.device.realmId}`);
    return existing;
  }

  let realm = await findCustomRealm(token);
  let deviceId;
  let apiKey;
  let realmId;

  if (!realm) {
    console.log(`[provision] 创建固定自定义 Realm: ${CUSTOM_REALM_NAME}…`);
    const created = await trpc(
      'realm.createWithDevice',
      {
        name: CUSTOM_REALM_NAME,
        displayName: 'Cove Dev Custom',
        description: 'Fixed realm for local dual-device development stack',
        ownerId: userId,
        visibility: 'private',
      },
      { token }
    );

    if (!created?.device?.deviceId || !created?.device?.apiKey) {
      throw new Error('realm.createWithDevice 未返回 device/apiKey');
    }

    deviceId = created.device.deviceId;
    apiKey = created.device.apiKey;
    realmId = created.realm?.realm_id || created.realm?.id;
    if (!realmId) {
      realm = await findCustomRealm(token);
      realmId = realm?.realm_id;
    }
  } else {
    realmId = realm.realm_id;
    console.log(`[provision] 自定义 Realm 已存在 (${realmId})，签发/轮换启动密钥…`);
    const creds = await issueRealmDeviceCredentials(token, realmId);
    deviceId = creds.deviceId;
    apiKey = creds.apiKey;
    realmId = creds.realmId;
  }

  const config = buildLocalConfig({
    deviceId,
    apiKey,
    realmId,
    name: 'cove-dev-custom',
    dataDir: join(DEV_HOME, 'data-custom'),
  });
  await writeFile(configPath, JSON.stringify(config, null, 2));
  console.log(`[provision] Custom 设备已落盘: ${config.device.id} @ ${config.device.realmId}`);
  return config;
}

async function main() {
  await mkdir(DEV_HOME, { recursive: true });
  console.log(`[provision] DEV_HOME=${DEV_HOME}`);
  console.log(`[provision] Backend=${BACKEND}`);

  await waitHealth();
  console.log('[provision] Backend health OK');

  const { token, userId } = await ensureUser();
  console.log(`[provision] Dev 用户就绪: ${DEV_USER} (${userId})`);

  const dual = process.env.COVE_DUAL === '1';
  const nexus = await ensureNexusDevice(token);
  const custom = dual ? await ensureCustomDevice(token, userId) : null;

  const state = {
    updatedAt: new Date().toISOString(),
    backend: BACKEND,
    dual,
    user: { username: DEV_USER, userId },
    nexus: {
      realmId: nexus.device.realmId,
      deviceId: nexus.device.id,
      configPath: join(DEV_HOME, 'nexus.config.json'),
    },
  };
  if (custom) {
    state.custom = {
      realmId: custom.device.realmId,
      deviceId: custom.device.id,
      realmName: CUSTOM_REALM_NAME,
      configPath: join(DEV_HOME, 'custom.config.json'),
    };
  }
  await writeFile(join(DEV_HOME, 'state.json'), JSON.stringify(state, null, 2));

  // 给 shell 用的简易导出
  console.log(`NEXUS_CONFIG=${join(DEV_HOME, 'nexus.config.json')}`);
  if (custom) {
    console.log(`CUSTOM_CONFIG=${join(DEV_HOME, 'custom.config.json')}`);
  }
  console.log('[provision] 完成');
}

main().catch((err) => {
  console.error('[provision] 失败:', err.message || err);
  process.exit(1);
});
