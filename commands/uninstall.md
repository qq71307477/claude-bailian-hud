---
description: 卸载百炼 HUD 并恢复安装前的 Claude 状态
allowed-tools: Bash, Read
---

# /claude-bailian-hud:uninstall

卸载百炼 HUD 并清理所有相关文件。

## 清理内容

1. 恢复安装前的 `statusLine`
2. 从 `settings.json` 里移除 `claude-bailian-hud` 的启用配置
3. 清理 `installed_plugins.json` 和 `known_marketplaces.json` 中的插件记录
4. 删除新的运行时目录 `~/.claude/plugins/claude-bailian-hud/`
5. 删除旧版本遗留目录 `~/.claude-bailian-hud/`
6. 尝试延迟删除插件 marketplace/cache 目录本身

## 执行清理

```bash
runtime=$(command -v bun 2>/dev/null || command -v node 2>/dev/null)
[ -n "$runtime" ] || { echo "未找到 bun 或 node"; exit 1; }

plugin_dir=$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claude-bailian-hud/claude-bailian-hud/*/ 2>/dev/null | sort -V | tail -1)
[ -n "$plugin_dir" ] || { echo "未找到 claude-bailian-hud 插件安装目录"; exit 1; }

"$runtime" "$plugin_dir/dist/uninstall-cli.js"
```

## 卸载后的提示

提示用户：

- 卸载脚本已经尽量把 Claude 状态恢复到安装前
- 如果 Claude 里还显示旧插件，请执行 `/reload-plugins`
- 如果列表没有及时刷新，直接重启 Claude Code
- 如果用户之后还想删掉 GitHub 安装记录，可以再执行 `/plugin uninstall claude-bailian-hud`
