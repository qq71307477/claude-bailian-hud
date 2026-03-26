import type { Config } from './types.js';
import { readJsonFile, writeJsonFileAtomic } from './fs-utils.js';
import { ensureRuntimeDir } from './runtime.js';

const DEFAULT_CONFIG: Partial<Config> = {
  sessionTimeoutMs: 10 * 60 * 1000, // 10分钟会话超时
};

export function ensureConfigDir(): void {
  ensureRuntimeDir();
}

export function readConfig(): Config | null {
  const { configFile } = ensureRuntimeDir();
  const config = readJsonFile<Config>(configFile);

  if (!config) {
    return null;
  }

  return { ...DEFAULT_CONFIG, ...config } as Config;
}

export function writeConfig(config: Config): void {
  const { configFile } = ensureRuntimeDir();
  writeJsonFileAtomic(configFile, config, 0o600);
}

export function getConfigPath(): string {
  return ensureRuntimeDir().configFile;
}
