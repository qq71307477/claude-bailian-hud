---
description: 手动刷新百炼用量数据（启动浏览器抓取）
allowed-tools: Bash, Read
---

# 刷新百炼用量数据

## Step 1: 检查配置

读取 `~/.claude-bailian-hud/config.json` 确认账号密码已配置。

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

- 抓取过程中会打开浏览器窗口
- 如遇到滑块验证，请手动完成
- 抓取完成后数据会缓存，statusLine 下次刷新时显示

## 注意事项

- 浏览器会自动处理登录
- 登录状态会保存在 `~/.claude-bailian-hud/browser-state/`
- 数据缓存在 `~/.claude-bailian-hud/cache.json`
