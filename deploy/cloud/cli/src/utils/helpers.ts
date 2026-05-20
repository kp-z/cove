export async function waitForHealth(url: string, timeoutSeconds: number): Promise<boolean> {
  const start = Date.now();
  const timeoutMs = timeoutSeconds * 1000;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }

    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return false;
}

export function replaceEnvVars(text: string, env: Record<string, string>): string {
  return text.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return env[varName] || match;
  });
}

export function parseMemoryLimit(memory: string): number {
  const match = memory.match(/^(\d+)(M|G)$/);
  if (!match) {
    throw new Error(`Invalid memory format: ${memory}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  return unit === 'G' ? value * 1024 : value;
}
