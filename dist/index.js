#!/usr/bin/env node
import { spawn } from 'child_process';
import { readConfig } from './config.js';
import { readCache, isCacheValidForSession } from './cache.js';
import { render } from './render.js';
// 获取或生成会话ID
function getSessionId() {
    const claudeSessionId = process.env.SESSION_ID;
    if (claudeSessionId) {
        return claudeSessionId;
    }
    const sessionInterval = 10 * 60 * 1000;
    return Math.floor(Date.now() / sessionInterval).toString();
}
// 后台刷新数据（异步，不阻塞）
function triggerBackgroundFetch() {
    const runtime = process.argv[1]; // 当前脚本路径
    const fetcherPath = runtime.replace('index.js', 'fetch-cli.js');
    spawn(process.execPath, [fetcherPath], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, BAILIAN_FETCH: '1' }
    });
}
async function main() {
    try {
        const config = readConfig();
        if (!config) {
            // 未配置，静默返回（让 claude-hud 正常显示）
            return;
        }
        const currentSessionId = getSessionId();
        const cache = readCache();
        // 检查缓存是否有效
        if (cache && cache.data && isCacheValidForSession(cache, currentSessionId, config.sessionTimeoutMs)) {
            console.log(render(cache.data, cache.error));
            return;
        }
        // 缓存过期或无数据，显示提示
        if (cache?.data) {
            console.log(render(cache.data));
        }
        else if (cache?.error) {
            console.log(render(null, '数据获取失败，运行 /claude-bailian-hud:fetch 重试'));
        }
        else {
            console.log(render(null, '正在获取数据...'));
        }
        // 触发后台刷新
        triggerBackgroundFetch();
    }
    catch (error) {
        // 出错时静默返回，不影响 claude-hud
    }
}
main();
