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

## Step 2: 保存原有 statusLine 命令

读取 `~/.claude/settings.json`，检查是否存在 `statusLine.command`。

**如果存在**：保存到 `~/.claude-bailian-hud/original-statusline.json`

```json
{
  "originalCommand": "原有的 statusLine 命令"
}
```

**如果不存在**：写入空值

```json
{
  "originalCommand": null
}
```

## Step 3: 收集账号密码

使用 AskUserQuestion 询问用户：

**问题1：**
- header: "阿里云账号"
- question: "请输入您的阿里云账号（手机号）"
- 类型：自由文本输入（选择 "Other"）

**问题2：**
- header: "阿里云密码"
- question: "请输入您的阿里云密码"
- 类型：自由文本输入（选择 "Other"）

## Step 4: 保存配置

写入 `~/.claude-bailian-hud/config.json`：

```json
{
  "username": "用户输入的账号",
  "password": "用户输入的密码",
  "sessionTimeoutMs": 600000
}
```

确保目录存在：
```bash
mkdir -p ~/.claude-bailian-hud
```

## Step 5: 生成 statusLine 命令

生成一个组合命令：
1. 先输出百炼数据
2. 再执行原有的 statusLine 命令（如果存在）

**生成的命令**：

```
bash -c 'bailian_dir=$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claude-bailian-hud/claude-bailian-hud/*/ 2>/dev/null | sort -V | tail -1); if [ -n "$bailian_dir" ]; then node "${bailian_dir}dist/index.js" 2>/dev/null; fi; orig=$(cat "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/bailian-hud/original-statusline.json 2>/dev/null | grep -o "\"originalCommand\".*" | cut -d\" -f4); if [ -n "$orig" ] && [ "$orig" != "null" ]; then eval "$orig" 2>/dev/null; fi'
```

**如果运行时是 bun**，将 `node` 替换为 `bun --env-file /dev/null`。

## Step 6: 写入 settings.json

读取 `~/.claude/settings.json`，合并 statusLine 配置：

```json
{
  "statusLine": {
    "type": "command",
    "command": "{GENERATED_COMMAND}"
  }
}
```

保留所有现有配置，只更新 statusLine 部分。

## Step 7: 首次抓取数据

执行 fetch-cli.js 进行首次数据抓取：

```bash
bailian_dir=$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claude-bailian-hud/claude-bailian-hud/*/ 2>/dev/null | sort -V | tail -1)
node "${bailian_dir}dist/fetch-cli.js"
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