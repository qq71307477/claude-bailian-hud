import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const CACHE_DIR = path.join(os.homedir(), '.claude-bailian-hud');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');
export function ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}
export function readCache() {
    try {
        if (!fs.existsSync(CACHE_FILE)) {
            return null;
        }
        const content = fs.readFileSync(CACHE_FILE, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
export function writeCache(data, error, sessionId) {
    ensureCacheDir();
    const cache = {
        data,
        timestamp: Date.now(),
        sessionId,
        error,
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}
// 检查是否是同一会话且缓存有效
export function isCacheValidForSession(cache, currentSessionId, sessionTimeoutMs) {
    // 如果有会话ID且匹配，直接有效
    if (cache.sessionId && cache.sessionId === currentSessionId) {
        return true;
    }
    // 如果没有会话ID或会话ID不匹配，检查是否在超时时间内
    return Date.now() - cache.timestamp < sessionTimeoutMs;
}
// 检查会话是否超时（用于判断是否需要刷新）
export function isSessionTimeout(cache, sessionTimeoutMs) {
    return Date.now() - cache.timestamp >= sessionTimeoutMs;
}
