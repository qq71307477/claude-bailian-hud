import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const CACHE_DIR = path.join(os.homedir(), '.claude-bailian-hud');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');
const FETCH_LOCK_FILE = path.join(CACHE_DIR, 'fetch.lock.json');
const FETCH_LOCK_MAX_AGE_MS = 15 * 60 * 1000;
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
function readFetchLock() {
    try {
        if (!fs.existsSync(FETCH_LOCK_FILE)) {
            return null;
        }
        const content = fs.readFileSync(FETCH_LOCK_FILE, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
function isProcessAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        const code = error.code;
        return code === 'EPERM';
    }
}
export function releaseFetchLock() {
    try {
        if (fs.existsSync(FETCH_LOCK_FILE)) {
            fs.unlinkSync(FETCH_LOCK_FILE);
        }
    }
    catch {
        // 忽略锁文件清理失败，避免影响主流程
    }
}
export function isFetchInProgress(maxAgeMs = FETCH_LOCK_MAX_AGE_MS) {
    const lock = readFetchLock();
    if (!lock || typeof lock.pid !== 'number' || typeof lock.startedAt !== 'number') {
        releaseFetchLock();
        return false;
    }
    const isFresh = Date.now() - lock.startedAt < maxAgeMs;
    if (isFresh && isProcessAlive(lock.pid)) {
        return true;
    }
    releaseFetchLock();
    return false;
}
export function acquireFetchLock(source, maxAgeMs = FETCH_LOCK_MAX_AGE_MS) {
    ensureCacheDir();
    if (isFetchInProgress(maxAgeMs)) {
        return false;
    }
    const payload = {
        pid: process.pid,
        startedAt: Date.now(),
        source,
    };
    const serialized = JSON.stringify(payload, null, 2);
    try {
        const fd = fs.openSync(FETCH_LOCK_FILE, 'wx');
        fs.writeFileSync(fd, serialized, 'utf-8');
        fs.closeSync(fd);
        return true;
    }
    catch (error) {
        const code = error.code;
        if (code === 'EEXIST') {
            if (!isFetchInProgress(maxAgeMs)) {
                try {
                    releaseFetchLock();
                    const fd = fs.openSync(FETCH_LOCK_FILE, 'wx');
                    fs.writeFileSync(fd, serialized, 'utf-8');
                    fs.closeSync(fd);
                    return true;
                }
                catch {
                    return false;
                }
            }
            return false;
        }
        throw error;
    }
}
