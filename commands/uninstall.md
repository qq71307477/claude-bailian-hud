# /claude-bailian-hud:uninstall

卸载百炼 HUD 并清理所有相关文件。

## 清理内容

1. 恢复原始 statusLine 配置
2. 删除 `~/.claude-bailian-hud/` 目录
3. 清理当前插件相关缓存

## 执行清理

```bash
# 1. 恢复原始 statusLine（如果有备份）
backup_file="$HOME/.claude-bailian-hud/original-statusline.json"
settings_file="$HOME/.claude/settings.json"

if [ -f "$backup_file" ]; then
  # 读取备份的原始命令
  original_command=$(cat "$backup_file" | grep -o '"originalCommand": *"[^"]*"' | sed 's/"originalCommand": *"\(.*\)"/\1/' | sed 's/\\n/\n/g')
  echo "找到原始 statusLine 备份，将恢复..."
fi

# 2. 删除百炼 HUD 配置目录
rm -rf "$HOME/.claude-bailian-hud/"
echo "已删除 ~/.claude-bailian-hud/"

# 3. 删除插件缓存
rm -rf "$HOME/.claude/plugins/cache/claude-bailian-hud/"
echo "已删除插件缓存"

echo ""
echo "卸载完成！"
echo "请运行 /reload-plugins 或重启 Claude Code"
```

## 如果需要手动恢复 statusLine

如果上述脚本没有找到备份，你可以手动编辑 `~/.claude/settings.json`：

对于 claude-hud：
```json
"statusLine": {
  "type": "command",
  "command": "bash -c 'plugin_dir=$(ls -d \"${CLAUDE_CONFIG_DIR:-$HOME/.claude}\"/plugins/cache/claude-hud/claude-hud/*/ 2>/dev/null | awk -F/ '\"'\"'{ print $(NF-1) \"\\t\" $(0) }'\"'\"' | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n | tail -1 | cut -f2-); exec \"$(which bun)\" --env-file /dev/null \"${plugin_dir}src/index.ts\"'"
}
```

或者完全移除 statusLine 配置恢复默认。

## 提醒

卸载后记得运行：
- `/reload-plugins` - 重新加载插件
- 或完全重启 Claude Code
