---
description: 手动刷新百炼用量数据（优先无头，必要时打开浏览器）
allowed-tools: Bash, Read
---

# 刷新百炼用量数据

## Step 1: 检查配置

读取 `~/.claude/plugins/claude-bailian-hud/config.json` 确认账号密码已配置。

如果新目录没有配置，也可以提示用户旧版目录会在 setup 时自动迁移：

```bash
cat "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/claude-bailian-hud/config.json" 2>/dev/null || cat "$HOME/.claude-bailian-hud/config.json" 2>/dev/null
```

如果未配置，提示用户先运行 `/claude-bailian-hud:setup`。

## Step 2: 执行抓取

获取插件安装路径并执行 fetch：

```bash
bailian_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claude-bailian-hud/claude-bailian-hud/*
bailian_dir=$(ls -d $bailian_dir 2>/dev/null | sort -V | tail -1)
runtime=$(command -v bun 2>/dev/null || command -v node 2>/dev/null)
"$runtime" "$bailian_dir/dist/fetch-cli.js"
```

## Step 3: 提示用户

- 默认先尝试无头抓取，只有遇到登录验证时才会打开浏览器窗口
- 如遇到滑块验证，请手动完成
- 插件会直接打开百炼控制台的 `Coding Plan` 详情页抓取，不再先跳首页
- 抓取完成后数据会缓存，statusLine 下次刷新时显示
- statusLine 本身不会自动刷新；只有 setup 首抓和这个手动刷新命令会更新缓存

## 注意事项

- 浏览器会自动处理登录
- 登录状态会保存在 `~/.claude/plugins/claude-bailian-hud/browser-state/`
- 数据缓存在 `~/.claude/plugins/claude-bailian-hud/cache.json`
- 老版本遗留的 `~/.claude-bailian-hud/` 会在 setup 时自动迁移
