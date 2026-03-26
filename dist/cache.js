import * as fs from 'fs';
import { readJsonFile, writeJsonFileAtomic } from './fs-utils.js';
import { ensureRuntimeDir } from './runtime.js';
const FETCH_LOCK_MAX_AGE_MS = 15 * 60 * 1000;
export function ensureCacheDir() {
    ensureRuntimeDir();
}
export function readCache() {
    return readJsonFile(ensureRuntimeDir().cacheFile);
}
export function writeCache(data, error, sessionId) {
    const { cacheFile } = ensureRuntimeDir();
    const cache = {
        data,
        timestamp: Date.now(),
        sessionId,
        error,
    };
    writeJsonFileAtomic(cacheFile, cache, 0o600);
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
        const { fetchLockFile } = ensureRuntimeDir();
        if (!fs.existsSync(fetchLockFile)) {
            return null;
        }
        const content = fs.readFileSync(fetchLockFile, 'utf-8');
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
        const { fetchLockFile } = ensureRuntimeDir();
        if (fs.existsSync(fetchLockFile)) {
            fs.unlinkSync(fetchLockFile);
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
    const { fetchLockFile } = ensureRuntimeDir();
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
        const fd = fs.openSync(fetchLockFile, 'wx');
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
                    const fd = fs.openSync(fetchLockFile, 'wx');
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
