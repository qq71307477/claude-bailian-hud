import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import type { UsageData } from './types.js';

const LOGIN_URL = 'https://bailian.console.aliyun.com/';
const CODING_PLAN_URL = 'https://bailian.console.aliyun.com/cn-beijing/?tab=coding-plan#/efm/coding-plan-detail';

// 获取浏览器状态存储路径
function getBrowserStatePath(): string {
  const configDir = path.join(os.homedir(), '.claude-bailian-hud');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'browser-state');
}

// 登录弹窗处理函数
async function doLoginInDialog(page: Page, username: string, password: string): Promise<void> {
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

async function doLogin(page: Page, username: string, password: string): Promise<void> {
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

export async function fetchUsage(username: string, password: string): Promise<UsageData> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    const statePath = getBrowserStatePath();

    // 启动浏览器，使用持久化上下文
    browser = await chromium.launch({
      headless: false,  // 使用有界面的浏览器以便调试
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',  // 隐藏自动化特征
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
    } catch {
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

    // 导航到控制台页面
    console.error('[bailian-hud] 导航到控制台...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // 检查是否已登录
    const isLoggedIn = await checkIsLoggedIn(page);

    if (!isLoggedIn) {
      console.error('[bailian-hud] 需要登录...');
      await doLogin(page, username, password);
    } else {
      console.error('[bailian-hud] 已登录');
    }

    // 导航到 Coding Plan 页面
    console.error('[bailian-hud] 导航到 Coding Plan 页面...');
    await page.goto(CODING_PLAN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // 截图调试（生产环境可移除）
    // const screenshotPath = path.join(getBrowserStatePath(), 'debug.png');
    // await page.screenshot({ path: screenshotPath, fullPage: true });
    // console.error('[bailian-hud] 截图已保存:', screenshotPath);

    // 再次检查是否需要登录（Coding Plan 页面可能需要单独登录）
    const needLoginAgain = await page.$('text=登录以使用');
    if (needLoginAgain) {
      console.error('[bailian-hud] Coding Plan 页面需要重新登录...');

      // 点击"立即登录"按钮
      const loginNowButton = await page.$('button:has-text("立即登录")');
      if (loginNowButton) {
        await loginNowButton.click();
        await page.waitForTimeout(2000);
        await doLoginInDialog(page, username, password);
      } else {
        // 点击顶部的登录按钮
        const topLoginButton = await page.$('text=登录');
        if (topLoginButton) {
          await topLoginButton.click();
          await page.waitForTimeout(2000);
          await doLoginInDialog(page, username, password);
        }
      }

      await page.waitForTimeout(5000);

      // 再次截图
      const screenshotPath2 = path.join(getBrowserStatePath(), 'debug-after-login.png');
      await page.screenshot({ path: screenshotPath2, fullPage: true });
      console.error('[bailian-hud] 登录后截图已保存:', screenshotPath2);
    }

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
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function checkIsLoggedIn(page: Page): Promise<boolean> {
  try {
    // 检查是否有"登录"按钮，如果没有则已登录
    const loginButton = await page.$('text=登录');
    return !loginButton;
  } catch {
    return false;
  }
}

async function parseUsageData(page: Page): Promise<UsageData> {
  // 等待数据加载 - 增加等待时间
  await page.waitForTimeout(5000);

  try {
    // 获取整个页面的文本内容
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.error('[bailian-hud] 页面文本长度:', bodyText.length);
    console.error('[bailian-hud] 页面文本前500字符:', bodyText.substring(0, 500));

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
    const usagePercents: number[] = [];

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

    const data: UsageData = {
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
  } catch (error) {
    console.error('[bailian-hud] 解析错误:', error);
    return {
      planName: 'Lite',
      fiveHour: 0,
      fiveHourReset: '',
      week: 0,
      weekReset: '',
      month: 0,
      monthReset: '',
    };
  }
}