#!/usr/bin/env node
import { readConfig } from './config.js';
import { readCache } from './cache.js';
import { render } from './render.js';
async function main() {
    try {
        const config = readConfig();
        if (!config) {
            // 未配置，静默返回（让 claude-hud 正常显示）
            return;
        }
        const cache = readCache();
        // statusLine 会被 Claude 高频调用，不能在这里自动拉起浏览器抓取。
        if (cache?.data) {
            console.log(render(cache.data));
        }
        else if (cache?.error) {
            console.log(render(null, '数据获取失败，运行 /claude-bailian-hud:fetch 重试'));
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
