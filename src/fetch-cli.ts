#!/usr/bin/env node
import { readConfig } from './config.js';
import {
  acquireFetchLock,
  readCache,
  releaseFetchLock,
  writeCache,
} from './cache.js';
import { fetchUsage, ManualInterventionRequiredError } from './fetcher.js';
import { getSessionId } from './session.js';

function getFetchSource(): 'setup' | 'manual' {
  const source = process.env.BAILIAN_FETCH_SOURCE;
  if (source === 'setup' || source === 'manual') {
    return source;
  }

  return 'manual';
}

async function main() {
  const config = readConfig();

  if (!config) {
    console.error('[bailian-hud] 错误: 未配置账号密码，请先运行 /claude-bailian-hud:setup');
    process.exit(1);
  }

  const sessionId = getSessionId();
  const cache = readCache();
  const source = getFetchSource();
  const hasLock = process.env.BAILIAN_FETCH_LOCK_HELD === '1'
    ? true
    : acquireFetchLock(source);
  const headlessOnly = source === 'setup';
  const manualHeadlessFirst = source === 'manual';

  if (!hasLock) {
    console.error('[bailian-hud] 已有刷新任务在运行，跳过重复抓取');
    return;
  }

  try {
    console.error('[bailian-hud] 开始刷新数据...');

    let data;
    try {
      data = await fetchUsage(config.username, config.password, {
        headless: headlessOnly || manualHeadlessFirst,
      });
    } catch (error) {
      if (manualHeadlessFirst && error instanceof ManualInterventionRequiredError) {
        console.error('[bailian-hud] 无头刷新需要手动完成登录验证，切换到可见浏览器模式...');
        data = await fetchUsage(config.username, config.password, { headless: false });
      } else {
        throw error;
      }
    }

    writeCache(data, undefined, sessionId);
    console.error('[bailian-hud] 数据刷新完成');
    console.error(`[bailian-hud] 套餐: ${data.planName}`);
    console.error(`[bailian-hud] 5小时: ${data.fiveHour}% | 周: ${data.week}% | 月: ${data.month}%`);
  } catch (error) {
    const message = error instanceof Error ? error.message : '刷新失败';
    console.error('[bailian-hud] 刷新失败:', message);
    writeCache(cache?.data ?? null, message, sessionId);
    process.exitCode = 1;
  } finally {
    releaseFetchLock();
  }
}

main();
