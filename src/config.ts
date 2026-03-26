import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Config } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.claude-bailian-hud');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: Partial<Config> = {
  sessionTimeoutMs: 10 * 60 * 1000, // 10分钟会话超时
};

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function readConfig(): Config | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...config } as Config;
  } catch {
    return null;
  }
}

export function writeConfig(config: Config): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}