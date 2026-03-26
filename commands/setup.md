---
description: 配置百炼 HUD - 设置账号密码并启用 statusLine
allowed-tools: Bash, Read
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

优先读取新的运行时目录；如果新目录没有，再看看旧目录：

```bash
cat "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/claude-bailian-hud/config.json" 2>/dev/null || cat "$HOME/.claude-bailian-hud/config.json" 2>/dev/null
```

**如果已存在配置**：不要使用 AskUserQuestion，也不要显示数字选项。

直接告诉用户：

> 检测到已有账号配置。本次 `/claude-bailian-hud:setup` 会覆盖旧的手机号和密码。
> 如果您不想修改，停止继续回复即可；如果要更新，请按后面的固定格式发送。

## Step 3: 收集账号密码

**请让用户在当前 Claude 对话输入框里直接发送账号密码，不要使用单独输入框或 AskUserQuestion。必须要求用户按固定格式回复，不能只发手机号数字。**

输出提示：

> 脚本已创建。现在需要您的阿里云账号信息。
>
> 请在当前对话底部的输入框里，直接复制下面两行，填写后整段发送。
> 不是在下方找单独的输入框，也不是点按钮，就是在你平时发消息的那个输入框里发送：
>
> ```text
> 手机号: 13800138000
> 密码: your-password
> ```
>
> 注意：
> - 不要只发送手机号数字，否则在 Claude 中可能被当成选项输入
> - 要把 `手机号:` 和 `密码:` 这两个前缀一起发出去
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

## Step 4: 执行 setup-cli

通过 here-doc 把用户刚刚发来的两行原样传给 `setup-cli.js`。**不要把手机号或密码直接拼到命令参数里。**

```bash
plugin_dir=$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claude-bailian-hud/claude-bailian-hud/*/ 2>/dev/null | sort -V | tail -1)
[ -n "$plugin_dir" ] || { echo "未找到 claude-bailian-hud 插件安装目录"; exit 1; }

cat <<'EOF' | "{RUNTIME_PATH}" "$plugin_dir/dist/setup-cli.js"
手机号: 用户输入的账号
密码: 用户输入的密码
EOF
```

`setup-cli.js` 会自动完成这些事情：

- 自动迁移旧的 `~/.claude-bailian-hud/` 到新的 `~/.claude/plugins/claude-bailian-hud/`
- 原子写入 `config.json`，避免把 `settings.json` 写坏
- 备份安装前的 `statusLine`
- 生成 `statusline.sh`
- 更新 `~/.claude/settings.json`

**如果这一步失败，立即停止，不要继续首次抓取。**

## Step 5: 首次抓取数据

执行 fetch-cli.js 进行首次数据抓取，**首次抓取优先走无头模式**：

```bash
bailian_dir=$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claude-bailian-hud/claude-bailian-hud/*/ 2>/dev/null | sort -V | tail -1)
BAILIAN_FETCH_SOURCE=setup "{RUNTIME_PATH}" "${bailian_dir}dist/fetch-cli.js"
```

**如果 Step 4 写入失败，不要继续这一步。**

如果这一步成功，就继续完成提示。

如果这一步输出“需要手动完成一次登录验证”，不要自动再拉起可见浏览器；直接告诉用户：

> 首次无头抓取已完成尝试，但当前账号需要手动完成一次登录验证。
> 请运行 `/claude-bailian-hud:fetch`，按提示在浏览器里完成一次登录或滑块验证。
> 完成后，statusLine 会显示最新一次手动同步到的结果。

## Step 6: 完成提示

告知用户：

> ✅ 配置完成！
>
> 请重启 Claude Code 使 statusLine 生效。
> 运行时文件现在会统一放在 `~/.claude/plugins/claude-bailian-hud/`。
>
> 显示效果（百炼在最上方）：
> ```
> [Lite] 5h: 26% │ 周: 48% │ 月: 39%          ← 百炼（上方）
> [Haiku] ████░░░░░ 32% | pro git:(main*)     ← 原有 HUD（下方）
> ```
>
> setup 会先尝试一次无头抓取；后续每次新会话开始时会再无头同步一次，手动同步请运行：`/claude-bailian-hud:fetch`
>
> 如果以后要彻底恢复安装前状态，请先运行：`/claude-bailian-hud:uninstall`
