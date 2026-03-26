import { readJsonFile, writeJsonFileAtomic } from './fs-utils.js';
import { ensureRuntimeDir } from './runtime.js';
const DEFAULT_CONFIG = {
    sessionTimeoutMs: 10 * 60 * 1000, // 10分钟会话超时
};
export function ensureConfigDir() {
    ensureRuntimeDir();
}
export function readConfig() {
    const { configFile } = ensureRuntimeDir();
    const config = readJsonFile(configFile);
    if (!config) {
        return null;
    }
    return { ...DEFAULT_CONFIG, ...config };
}
export function writeConfig(config) {
    const { configFile } = ensureRuntimeDir();
    writeJsonFileAtomic(configFile, config, 0o600);
}
export function getConfigPath() {
    return ensureRuntimeDir().configFile;
}
