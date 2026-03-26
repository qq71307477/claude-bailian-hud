---
description: 配置百炼 HUD - 设置账号密码并启用 statusLine
allowed-tools: Bash, Read, Write, AskUserQuestion
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

**如果已存在配置**：使用 AskUserQuestion 询问用户：

- header: "已配置"
- question: "检测到已有账号配置，是否要更新账号密码？"
- options:
  - label: "保持现有配置"
    description: "不修改，直接退出"
  - label: "重新配置"
    description: "覆盖现有账号密码"

如果用户选择"保持现有配置"，直接结束，提示用户运行 `/bailian-hud:fetch` 刷新数据。

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

**如果原有 statusLine 不存在**：该部分留空

赋予执行权限：
```bash
chmod +x ~/.claude-bailian-hud/statusline.sh
```

## Step 4: 收集账号密码

**重要：** AskUserQuestion 会自动在选项列表末尾显示「Other」选项，选择 Other 才能输入自定义文本。

使用 AskUserQuestion 询问用户：

**问题1 - 手机号：**
- header: "手机号"
- question: "请选择列表最下方的「Other」选项，然后输入您的阿里云账号（手机号）"
- options:
  - label: "请选下方的 Other"
    description: "Other 在选项列表最下面"

**问题2 - 密码：**
- header: "密码"
- question: "请选择列表最下方的「Other」选项，然后输入您的阿里云密码"
- options:
  - label: "请选下方的 Other"
    description: "Other 在选项列表最下面"

**操作步骤：**
1. 用 ↓ 箭头键滚动到列表最底部
2. 找到「Other」选项，按 Enter 选择
3. 在弹出的输入框中输入手机号/密码

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
bailian_dir=$(ls -d ~/.claude/plugins/cache/claude-bailian-hud/claude-bailian-hud/*/ 2>/dev/null | sort -V | tail -1)
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