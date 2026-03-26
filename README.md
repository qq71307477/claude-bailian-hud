# Claude Bailian HUD

百炼 Coding Plan 用量监控插件，用于 Claude Code statusLine。

## 安装

```
/plugin install github:qq71307477/claude-bailian-hud
```

## 配置

```
/claude-bailian-hud:setup
```

输入阿里云账号密码后，自动配置 statusLine。

## 显示效果

百炼用量显示在最上方，与其他 HUD 并存：

```
[Lite] 5h: 26% │ 周: 48% │ 月: 39%          ← 百炼
[Haiku] ████░░░░░ 32% | pro git:(main*)     ← 其他 HUD
```

## 手动刷新数据

```
/claude-bailian-hud:fetch
```

## 功能

- 显示近5小时、近一周、近一月用量百分比
- 显示重置时间
- 会话级缓存，减少刷新频率
- 与其他 statusLine 插件并存