import * as fs from 'fs';
import type { Cache, UsageData } from './types.js';
import { readJsonFile, writeJsonFileAtomic } from './fs-utils.js';
import { ensureRuntimeDir } from './runtime.js';

const FETCH_LOCK_MAX_AGE_MS = 15 * 60 * 1000;

interface FetchLock {
  pid: number;
  startedAt: number;
  source?: string;
}

export function ensureCacheDir(): void {
  ensureRuntimeDir();
}

export function readCache(): Cache | null {
  return readJsonFile<Cache>(ensureRuntimeDir().cacheFile);
}

export function writeCache(data: UsageData | null, error?: string, sessionId?: string): void {
  const { cacheFile } = ensureRuntimeDir();
  const cache: Cache = {
    data,
    timestamp: Date.now(),
    sessionId,
    error,
  };
  writeJsonFileAtomic(cacheFile, cache, 0o600);
}

// 检查是否是同一会话且缓存有效
export function isCacheValidForSession(cache: Cache, currentSessionId: string, sessionTimeoutMs: number): boolean {
  // 如果有会话ID且匹配，直接有效
  if (cache.sessionId && cache.sessionId === currentSessionId) {
    return true;
  }
  // 如果没有会话ID或会话ID不匹配，检查是否在超时时间内
  return Date.now() - cache.timestamp < sessionTimeoutMs;
}

// 检查会话是否超时（用于判断是否需要刷新）
export function isSessionTimeout(cache: Cache, sessionTimeoutMs: number): boolean {
  return Date.now() - cache.timestamp >= sessionTimeoutMs;
}

function readFetchLock(): FetchLock | null {
  try {
    const { fetchLockFile } = ensureRuntimeDir();
    if (!fs.existsSync(fetchLockFile)) {
      return null;
    }
    const content = fs.readFileSync(fetchLockFile, 'utf-8');
    return JSON.parse(content) as FetchLock;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'EPERM';
  }
}

export function releaseFetchLock(): void {
  try {
    const { fetchLockFile } = ensureRuntimeDir();
    if (fs.existsSync(fetchLockFile)) {
      fs.unlinkSync(fetchLockFile);
    }
  } catch {
    // 忽略锁文件清理失败，避免影响主流程
  }
}

export function isFetchInProgress(maxAgeMs: number = FETCH_LOCK_MAX_AGE_MS): boolean {
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

export function acquireFetchLock(source?: string, maxAgeMs: number = FETCH_LOCK_MAX_AGE_MS): boolean {
  const { fetchLockFile } = ensureRuntimeDir();

  if (isFetchInProgress(maxAgeMs)) {
    return false;
  }

  const payload: FetchLock = {
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
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EEXIST') {
      if (!isFetchInProgress(maxAgeMs)) {
        try {
          releaseFetchLock();
          const fd = fs.openSync(fetchLockFile, 'wx');
          fs.writeFileSync(fd, serialized, 'utf-8');
          fs.closeSync(fd);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
    throw error;
  }
}
