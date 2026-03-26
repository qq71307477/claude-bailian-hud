#!/usr/bin/env node
import { spawn } from 'child_process';
import { readConfig } from './config.js';
import {
  acquireFetchLock,
  isFetchInProgress,
  readCache,
  releaseFetchLock,
} from './cache.js';
import { render } from './render.js';
import { getSessionId } from './session.js';

function shouldTriggerSessionStartFetch(
  cacheSessionId: string | undefined,
  currentSessionId: string | undefined,
): boolean {
  if (!currentSessionId) {
    return false;
  }

  return cacheSessionId !== currentSessionId;
}

function triggerSessionStartFetch(): boolean {
  if (!acquireFetchLock('background')) {
    return false;
  }

  const runtime = process.argv[1];
  const fetcherPath = runtime.replace('index.js', 'fetch-cli.js');
  const child = spawn(process.execPath, [fetcherPath], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      BAILIAN_FETCH_SOURCE: 'background',
      BAILIAN_FETCH_LOCK_HELD: '1',
    },
  });

  child.on('error', () => {
    releaseFetchLock();
  });

  child.unref();
  return true;
}

function getRenderNote(
  cacheError: string | undefined,
  sessionRefreshing: boolean,
): string | undefined {
  if (sessionRefreshing) {
    return '会话同步中';
  }

  if (!cacheError) {
    return undefined;
  }

  if (cacheError.includes('手动完成一次登录验证') || cacheError.includes('登录验证')) {
    return '需手动登录';
  }

  return '上次同步失败';
}

async function main() {
  try {
    const config = readConfig();

    if (!config) {
      // 未配置，静默返回（让 claude-hud 正常显示）
      return;
    }

    const cache = readCache();
    const currentSessionId = getSessionId();
    let sessionRefreshing = isFetchInProgress();

    if (!sessionRefreshing && shouldTriggerSessionStartFetch(cache?.sessionId, currentSessionId)) {
      sessionRefreshing = triggerSessionStartFetch();
    }

    const note = getRenderNote(cache?.error, sessionRefreshing);
    if (cache?.data) {
      console.log(render(cache.data, undefined, note));
    } else if (cache?.error) {
      console.log(render(
        null,
        cache.error,
      ));
    } else {
      console.log(render(
        null,
        sessionRefreshing ? '正在同步本会话数据...' : '未获取数据，运行 /claude-bailian-hud:fetch',
      ));
    }

  } catch (error) {
    // 出错时静默返回，不影响 claude-hud
  }
}

main();
