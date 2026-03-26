#!/usr/bin/env node
import { readConfig } from './config.js';
import { readCache, writeCache } from './cache.js';
import { fetchUsage } from './fetcher.js';

function getSessionId(): string {
  const claudeSessionId = process.env.SESSION_ID;
  if (claudeSessionId) {
    return claudeSessionId;
  }
  const sessionInterval = 10 * 60 * 1000;
  return Math.floor(Date.now() / sessionInterval).toString();
}

async function main() {
  const config = readConfig();

  if (!config) {
    console.error('[bailian-hud] 错误: 未配置账号密码，请先运行 /bailian-hud:setup');
    process.exit(1);
  }

  const sessionId = getSessionId();
  const cache = readCache();

  // 如果是后台触发且缓存仍然有效，跳过
  if (process.env.BAILIAN_FETCH === '1' && cache) {
    const now = Date.now();
    const cacheAge = now - cache.timestamp;
    if (cacheAge < 5 * 60 * 1000) { // 5分钟内不重复刷新
      return;
    }
  }

  console.error('[bailian-hud] 开始刷新数据...');

  try {
    const data = await fetchUsage(config.username, config.password);
    writeCache(data, undefined, sessionId);
    console.error('[bailian-hud] 数据刷新完成');
    console.error(`[bailian-hud] 套餐: ${data.planName}`);
    console.error(`[bailian-hud] 5小时: ${data.fiveHour}% | 周: ${data.week}% | 月: ${data.month}%`);
  } catch (error) {
    const message = error instanceof Error ? error.message : '刷新失败';
    console.error('[bailian-hud] 刷新失败:', message);
    writeCache(null, message, sessionId);
  }
}

main();