#!/usr/bin/env node
import { readConfig } from './config.js';
import { readCache } from './cache.js';
import { render } from './render.js';
function getRenderNote(cacheError) {
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
        const note = getRenderNote(cache?.error);
        if (cache?.data) {
            console.log(render(cache.data, undefined, note));
        }
        else if (cache?.error) {
            console.log(render(null, cache.error));
        }
        else {
            console.log(render(null, '未获取数据，运行 /claude-bailian-hud:fetch'));
        }
    }
    catch (error) {
        // 出错时静默返回，不影响 claude-hud
    }
}
main();
