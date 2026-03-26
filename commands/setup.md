---
description: 配置百炼 HUD - 设置账号密码并启用 statusLine
allowed-tools: Bash, Read, Write
---

# 配置百炼 HUD

## Step 1: 检测运行环境

检测 bun 或 node：

```bash
command -v bun 2>/dev/null || command -v node 2>/dev/null
```

如果都没有，提示用户安装 Node.js 或 Bun。

保存运行时路径为 `{RUNTIME_PATH}`。

## Step 2: 检查现有配置

读取 `~/.claude-bailian-hud/config.json`：

```bash
cat ~/.claude-bailian-hud/config.json 2>/dev/null
```

**如果已存在配置**：不要使用 AskUserQuestion，也不要显示数字选项。

直接告诉用户：

> 检测到已有账号配置。本次 `/claude-bailian-hud:setup` 会覆盖旧的手机号和密码。
> 如果您不想修改，停止继续回复即可；如果要更新，请按后面的固定格式发送。

## Step 3: 创建 statusLine 脚本

创建目录：
```bash
mkdir -p ~/.claude-bailian-hud
```

检测原有的 statusLine 命令并生成脚本文件 `~/.claude-bailian-hud/statusline.sh`：

```bash
#!/bin/bash
# 百炼 HUD statusLine 脚本

# 输出百炼数据
bailian_dir=$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claude-bailian-hud/claude-bailian-hud/*/ 2>/dev/null | sort -V | tail -1)
if [ -n "$bailian_dir" ]; then
  {RUNTIME_PATH} --env-file /dev/null "${bailian_dir}dist/index.js" 2>/dev/null
fi

# 输出原有 HUD（如果存在）
{ORIGINAL_HUD_COMMAND}
```

**如果原有 statusLine 存在**：提取其中的 HUD 命令（去掉 `exec`），放入脚本

**如果原有 statusLine 存在**：同时备份到 `~/.claude-bailian-hud/original-statusline.json`，格式如下：

```json
{
  "originalCommand": "原始 statusLine command"
}
```

**如果原有 statusLine 不存在**：该部分留空

赋予执行权限：
```bash
chmod +x ~/.claude-bailian-hud/statusline.sh
```

## Step 4: 收集账号密码

**直接在对话中收集账号密码，但必须要求用户按固定格式回复，不能只发手机号数字。**

输出提示：

> 脚本已创建。现在需要您的阿里云账号信息。
>
> 请直接复制下面的模板并填写后整段发送：
>
> ```text
> 手机号: 13800138000
> 密码: your-password
> ```
>
> 注意：
> - 不要只发送手机号数字，否则在 Claude 中可能被当成选项输入
> - 第一行必须以 `手机号:` 开头
> - 第二行必须以 `密码:` 开头
> - 如果密码里有空格或特殊字符，保持原样放在 `密码:` 后面即可

等待用户回复，然后解析手机号和密码。

解析规则：

- 只从 `手机号:` 这一行提取账号
- 只从 `密码:` 这一行提取密码
- 手机号必须匹配 `^1\d{10}$`
- 密码不能为空

如果格式不对或校验失败：

- 不要猜测
- 不要使用 AskUserQuestion
- 直接提示用户重新按同一模板发送

## Step 5: 保存配置

写入 `~/.claude-bailian-hud/config.json`：

```json
{
  "username": "用户输入的账号",
  "password": "用户输入的密码",
  "sessionTimeoutMs": 600000
}
```

## Step 6: 更新 settings.json

读取 `~/.claude/settings.json`，更新 statusLine：

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude-bailian-hud/statusline.sh"
  }
}
```

保留所有现有配置，只更新 statusLine 部分。

## Step 7: 首次抓取数据

执行 fetch-cli.js 进行首次数据抓取：

```bash
bailian_dir=$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claude-bailian-hud/claude-bailian-hud/*/ 2>/dev/null | sort -V | tail -1)
{RUNTIME_PATH} "${bailian_dir}dist/fetch-cli.js"
```

提示用户可能需要在弹出的浏览器窗口中完成滑块验证。

## Step 8: 完成提示

告知用户：

> ✅ 配置完成！
>
> 请重启 Claude Code 使 statusLine 生效。
>
> 显示效果（百炼在最上方）：
> ```
> [Lite] 5h: 26% │ 周: 48% │ 月: 39%          ← 百炼（上方）
> [Haiku] ████░░░░░ 32% | pro git:(main*)     ← 原有 HUD（下方）
> ```
>
> 手动刷新数据：`/claude-bailian-hud:fetch`
