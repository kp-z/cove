import { readFile } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';

const ConfigSchema = z.object({
  server: z.object({
    url: z.string().url(),
    token: z.string().optional(),
  }),
  device: z.object({
    id: z.string(),
    name: z.string(),
    apiKey: z.string(),
    realmId: z.string(),
  }),
  local: z.object({
    dataDir: z.string().default('.cove'),
    heartbeatInterval: z.number().default(30000),
    reconnectDelay: z.number().default(5000),
    maxConcurrentTasks: z.number().default(3),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

interface CliArgs {
  server?: string;
  deviceId?: string;
  apiKey?: string;
  realmId?: string;
  config?: string;
}

function parseCliArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--server' && args[i + 1]) {
      parsed.server = args[i + 1];
      i++;
    } else if (args[i] === '--device-id' && args[i + 1]) {
      parsed.deviceId = args[i + 1];
      i++;
    } else if (args[i] === '--api-key' && args[i + 1]) {
      parsed.apiKey = args[i + 1];
      i++;
    } else if (args[i] === '--realm-id' && args[i + 1]) {
      parsed.realmId = args[i + 1];
      i++;
    } else if (args[i] === '--config' && args[i + 1]) {
      parsed.config = args[i + 1];
      i++;
    }
  }

  return parsed;
}

export async function loadConfig(): Promise<Config> {
  const cliArgs = parseCliArgs();

  // Priority 1: Complete command-line arguments
  if (cliArgs.server && cliArgs.deviceId && cliArgs.apiKey && cliArgs.realmId) {
    console.log('📋 Using configuration from command-line arguments');
    return {
      server: {
        url: cliArgs.server,
        token: '',
      },
      device: {
        id: cliArgs.deviceId,
        name: cliArgs.deviceId,
        apiKey: cliArgs.apiKey,
        realmId: cliArgs.realmId,
      },
      local: {
        dataDir: '~/.cove',
        heartbeatInterval: 30000,
        reconnectDelay: 5000,
        maxConcurrentTasks: 3,
      },
    };
  }

  // Priority 2: Config file (--config flag, CONFIG_PATH env, or default paths)
  const configPath = cliArgs.config || process.env.CONFIG_PATH || join(process.cwd(), 'config.json');

  console.log(`📋 Loading configuration from: ${configPath}`);

  try {
    const content = await readFile(configPath, 'utf-8');
    const data = JSON.parse(content);
    return ConfigSchema.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Try fallback to ~/.cove/config.json
      const fallbackPath = join(process.env.HOME || '~', '.cove', 'config.json');
      try {
        const content = await readFile(fallbackPath, 'utf-8');
        const data = JSON.parse(content);
        console.log(`📋 Using fallback config: ${fallbackPath}`);
        return ConfigSchema.parse(data);
      } catch {
        throw new Error(
          `Config file not found. Please either:\n` +
            `  1. Provide CLI arguments: --server <url> --device-id <id> --api-key <key> --realm-id <id>\n` +
            `  2. Create config.json in current directory\n` +
            `  3. Create ~/.cove/config.json\n` +
            `  4. Set CONFIG_PATH environment variable`
        );
      }
    }
    throw error;
  }
}
