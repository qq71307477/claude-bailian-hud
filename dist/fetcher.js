import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { ensureRuntimeDir } from './runtime.js';
const FREE_QUOTA_URL = 'https://bailian.console.aliyun.com/cn-beijing/?tab=model#/model-usage/free-quota';
const USAGE_MARKERS = ['近5小时用量', '近一周用量', '近一月用量'];
// 获取浏览器状态存储路径
function getBrowserStatePath() {
    const { browserStateDir } = ensureRuntimeDir();
    if (!fs.existsSync(browserStateDir)) {
        fs.mkdirSync(browserStateDir, { recursive: true });
    }
    return browserStateDir;
}
async function maybeSaveDebugScreenshot(page, filename) {
    if (process.env.BAILIAN_DEBUG !== '1') {
        return;
    }
    const screenshotPath = path.join(getBrowserStatePath(), filename);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('[bailian-hud] 调试截图已保存:', screenshotPath);
}
async function waitForPageSettled(page, delayMs = 3000) {
    try {
        await page.waitForLoadState('networkidle', { timeout: 15000 });
    }
    catch {
        // 百炼控制台是 SPA，networkidle 不稳定时退回固定等待
    }
    await page.waitForTimeout(delayMs);
}
async function getBodyText(page) {
    return page.evaluate(() => document.body.innerText);
}
function hasUsageMarkers(bodyText) {
    return USAGE_MARKERS.every((marker) => bodyText.includes(marker));
}
async function isUsagePageReady(page) {
    try {
        const bodyText = await getBodyText(page);
        return hasUsageMarkers(bodyText);
    }
    catch {
        return false;
    }
}
async function needsLogin(page) {
    if (await page.locator('iframe[title="login"]').count() > 0) {
        return true;
    }
    const bodyText = await getBodyText(page).catch(() => '');
    if (bodyText.includes('登录以使用')) {
        return true;
    }
    if (hasUsageMarkers(bodyText)) {
        return false;
    }
    return bodyText.includes('立即登录') || bodyText.includes('阿里云账号');
}
async function openUsagePage(page, reason) {
    console.error(`[bailian-hud] ${reason}...`);
    await page.goto(FREE_QUOTA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForPageSettled(page);
}
// 登录弹窗处理函数
async function doLoginInDialog(page, username, password) {
    console.error('[bailian-hud] 处理登录弹窗...');
    // 使用 frameLocator 链式定位到登录表单
    // 结构: iframe[title="login"] -> #alibaba-login-iframe #alibaba-login-box (嵌套iframe)
    const loginFrame = page.frameLocator('iframe[title="login"]')
        .frameLocator('#alibaba-login-iframe #alibaba-login-box');
    // 填写账号 - 使用 pressSequentially 逐字符输入避免自动完成问题
    const usernameInput = loginFrame.locator('#fm-login-id');
    await usernameInput.click();
    await usernameInput.clear();
    await page.waitForTimeout(300);
    await usernameInput.pressSequentially(username, { delay: 50 }); // 50ms 延迟模拟人工输入
    await page.waitForTimeout(500);
    // 填写密码 - 使用 pressSequentially 逐字符输入
    const passwordInput = loginFrame.locator('#fm-login-password');
    await passwordInput.click();
    await passwordInput.clear();
    await page.waitForTimeout(300);
    await passwordInput.pressSequentially(password, { delay: 50 });
    await page.waitForTimeout(500);
    // 点击登录按钮
    const submitButton = loginFrame.getByRole('button', { name: '立即登录' });
    await submitButton.click();
    // 等待登录完成 - 增加等待时间用于滑动验证
    console.error('[bailian-hud] 如果有滑动验证码，请在浏览器中手动完成...');
    await page.waitForTimeout(15000);
    // 检查是否登录成功
    const loginDialog = await page.$('dialog iframe');
    if (loginDialog) {
        console.error('[bailian-hud] 登录弹窗仍存在，继续等待...');
        await page.waitForTimeout(10000);
    }
    console.error('[bailian-hud] 登录完成');
}
async function doLogin(page, username, password) {
    console.error('[bailian-hud] 正在登录...');
    // 1. 点击登录按钮
    const loginButton = await page.$('text=登录');
    if (loginButton) {
        await loginButton.click();
        await page.waitForTimeout(2000);
    }
    // 调用通用的弹窗登录函数
    await doLoginInDialog(page, username, password);
}
async function ensureUsagePage(page, username, password) {
    await openUsagePage(page, '直接打开免费额度页面');
    if (await isUsagePageReady(page)) {
        console.error('[bailian-hud] 免费额度页面已就绪');
        return;
    }
    if (!(await needsLogin(page))) {
        await maybeSaveDebugScreenshot(page, 'free-quota-not-ready.png');
        throw new Error('已打开 free-quota 页面，但未识别到用量数据');
    }
    console.error('[bailian-hud] 免费额度页面需要登录...');
    const loginNowButton = await page.$('button:has-text("立即登录")');
    if (loginNowButton) {
        await loginNowButton.click();
        await page.waitForTimeout(2000);
        await doLoginInDialog(page, username, password);
    }
    else {
        await doLogin(page, username, password);
    }
    await openUsagePage(page, '登录后重新打开免费额度页面');
    if (await isUsagePageReady(page)) {
        console.error('[bailian-hud] 登录后已进入免费额度页面');
        return;
    }
    await maybeSaveDebugScreenshot(page, 'free-quota-not-ready-after-login.png');
    throw new Error('登录后仍未进入 free-quota 页面');
}
export async function fetchUsage(username, password) {
    let browser = null;
    let context = null;
    try {
        const statePath = getBrowserStatePath();
        // 启动浏览器，使用持久化上下文
        browser = await chromium.launch({
            headless: false, // 使用有界面的浏览器以便调试
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled', // 隐藏自动化特征
                '--disable-infobars',
                '--window-size=1280,800',
            ],
        });
        // 尝试加载保存的状态
        try {
            context = await browser.newContext({
                storageState: path.join(statePath, 'state.json'),
                viewport: { width: 1280, height: 800 },
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            });
            // 隐藏 webdriver 特征
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });
            console.error('[bailian-hud] 加载已保存的浏览器状态');
        }
        catch {
            context = await browser.newContext({
                viewport: { width: 1280, height: 800 },
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            });
            // 隐藏 webdriver 特征
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });
            console.error('[bailian-hud] 创建新的浏览器上下文');
        }
        const page = await context.newPage();
        await ensureUsagePage(page, username, password);
        // 解析用量数据
        console.error('[bailian-hud] 解析用量数据...');
        const usageData = await parseUsageData(page);
        // 保存浏览器状态
        const storagePath = getBrowserStatePath();
        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath, { recursive: true });
        }
        await context.storageState({ path: path.join(storagePath, 'state.json') });
        console.error('[bailian-hud] 已保存浏览器状态');
        return usageData;
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
}
async function parseUsageData(page) {
    await waitForPageSettled(page, 5000);
    try {
        const bodyText = await getBodyText(page);
        console.error('[bailian-hud] 页面文本长度:', bodyText.length);
        console.error('[bailian-hud] 页面文本前500字符:', bodyText.substring(0, 500));
        if (!hasUsageMarkers(bodyText)) {
            throw new Error('free-quota 页面未出现近5小时/周/月用量区块');
        }
        // 调试：打印包含关键词的行
        const lines = bodyText.split('\n');
        for (const line of lines) {
            if (line.includes('近5小时') || line.includes('近一周') || line.includes('近一月') || line.includes('%') || line.includes('重置')) {
                console.error('[bailian-hud] 相关行:', line.trim());
            }
        }
        // 查找套餐名称
        const planNameMatch = bodyText.match(/(Lite|Pro)(基础|高级)?套餐/);
        const planName = planNameMatch ? planNameMatch[1] : 'Lite';
        // 解析百分比 - 按位置查找每个用量区域的百分比
        // 页面结构：近5小时用量 -> 百分比 -> 近一周用量 -> 百分比 -> 近一月用量 -> 百分比
        const sections = bodyText.split(/近(?:5小时|一周|一月)用量/);
        const usagePercents = [];
        for (let i = 1; i < sections.length && usagePercents.length < 3; i++) {
            const section = sections[i];
            // 在每个区域找第一个百分比数字（跳过进度条刻度 0%）
            const percents = section.match(/(\d+)%/g) || [];
            for (const p of percents) {
                const val = parseInt(p, 10);
                // 跳过进度条刻度 0%，其他都可能是实际用量
                if (val > 0) {
                    usagePercents.push(val);
                    break;
                }
            }
        }
        console.error('[bailian-hud] 解析用量百分比:', usagePercents);
        const fiveHour = usagePercents[0] || 0;
        const week = usagePercents[1] || 0;
        const month = usagePercents[2] || 0;
        // 解析重置时间
        const resetTimes = bodyText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*重置/g) || [];
        console.error('[bailian-hud] 重置时间:', resetTimes);
        // 5小时重置时间
        let fiveHourReset = '';
        if (resetTimes[0]) {
            const match = resetTimes[0].match(/(\d{2}:\d{2}):\d{2}/);
            fiveHourReset = match && match[1] ? match[1] : '';
        }
        // 周和月重置时间 (00:00:00 格式)
        const midNightResets = bodyText.match(/(\d{4}-\d{2}-\d{2})\s+00:00:00\s*重置/g) || [];
        let weekReset = '';
        let monthReset = '';
        if (midNightResets[0]) {
            const match = midNightResets[0].match(/(\d{4}-\d{2}-\d{2})/);
            weekReset = match && match[1] ? match[1].substring(5) : '';
        }
        if (midNightResets[1]) {
            const match = midNightResets[1].match(/(\d{4}-\d{2}-\d{2})/);
            monthReset = match && match[1] ? match[1].substring(5) : '';
        }
        const data = {
            planName,
            fiveHour,
            fiveHourReset,
            week,
            weekReset,
            month,
            monthReset,
        };
        console.error('[bailian-hud] 解析结果:', JSON.stringify(data));
        return data;
    }
    catch (error) {
        console.error('[bailian-hud] 解析错误:', error);
        await maybeSaveDebugScreenshot(page, 'parse-error.png');
        throw error;
    }
}
