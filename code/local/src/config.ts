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

export async function loadConfig(): Promise<Config> {
  const configPath = process.env.CONFIG_PATH || join(process.cwd(), 'config.json');

  try {
    const content = await readFile(configPath, 'utf-8');
    const data = JSON.parse(content);
    return ConfigSchema.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Config file not found at ${configPath}. Please create config.json based on config.example.json`
      );
    }
    throw error;
  }
}
