# Claude Bailian HUD

百炼 Coding Plan 用量监控插件，用于 Claude Code statusLine。

## 安装

**方式1：Marketplace 安装（推荐）**

```
/plugin marketplace add qq71307477/claude-bailian-hud
/plugin install claude-bailian-hud
```

**方式2：直接安装**

```
/plugin install github:qq71307477/claude-bailian-hud
```

## 配置

```
/claude-bailian-hud:setup
```

按命令提示，在当前 Claude 对话输入框里直接发送固定格式的阿里云手机号和密码后，自动配置 statusLine。不是单独弹出一个输入框。回复时不要只发纯手机号数字，请使用：

```text
手机号: 13800138000
密码: your-password
```

## 显示效果

百炼用量显示在最上方，与其他 HUD 并存：

```
[Lite] 5h: 26% │ 周: 48% │ 月: 39%          ← 百炼（上方）
[Haiku] ████░░░░░ 32% | pro git:(main*)     ← 其他 HUD（下方）
```

## 手动刷新数据

```
/claude-bailian-hud:fetch
```

状态栏不会自动弹浏览器刷新数据；只有执行上面的手动刷新命令，或首次 `setup` 时，才会打开浏览器登录百炼。

## 功能

- 显示近5小时、近一周、近一月用量百分比
- 显示重置时间
- 会话级缓存，减少刷新频率
- 与其他 statusLine 插件并存（百炼显示在最上方）

## 说明

本插件需要 Playwright 依赖，首次运行会自动安装浏览器。配置文件存储在 `~/.claude-bailian-hud/` 目录。
