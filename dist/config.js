import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const CONFIG_DIR = path.join(os.homedir(), '.claude-bailian-hud');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const DEFAULT_CONFIG = {
    sessionTimeoutMs: 10 * 60 * 1000, // 10分钟会话超时
};
export function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}
export function readConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            return null;
        }
        const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const config = JSON.parse(content);
        return { ...DEFAULT_CONFIG, ...config };
    }
    catch {
        return null;
    }
}
export function writeConfig(config) {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
export function getConfigPath() {
    return CONFIG_FILE;
}
