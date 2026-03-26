#!/usr/bin/env node
import { writeConfig } from './config.js';
import { readJsonFile, writeJsonFileAtomic, writeTextFileAtomic } from './fs-utils.js';
import { ensureRuntimeDir, isManagedStatusLineCommand, quoteShell } from './runtime.js';
function readStdin() {
    return new Promise((resolve, reject) => {
        const chunks = [];
        process.stdin.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        process.stdin.on('error', reject);
    });
}
function parseCredentials(input) {
    const lines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const usernameLine = lines.find((line) => line.startsWith('手机号:'));
    const passwordLine = lines.find((line) => line.startsWith('密码:'));
    const username = usernameLine?.slice('手机号:'.length).trim() ?? '';
    const password = passwordLine?.slice('密码:'.length).trim() ?? '';
    if (!/^1\d{10}$/.test(username)) {
        throw new Error('手机号格式不正确，必须是 1 开头的 11 位手机号');
    }
    if (!password) {
        throw new Error('密码不能为空');
    }
    return { username, password };
}
function readSettings(settingsFile) {
    const settings = readJsonFile(settingsFile);
    return settings ?? {};
}
function readLegacyStatusLineSnapshot() {
    const paths = ensureRuntimeDir();
    const legacyFiles = [
        `${paths.runtimeDir}/original-statusline.json`,
        `${paths.legacyRuntimeDir}/original-statusline.json`,
    ];
    for (const filePath of legacyFiles) {
        const legacy = readJsonFile(filePath);
        if (legacy?.originalCommand) {
            return {
                existed: true,
                value: {
                    type: 'command',
                    command: legacy.originalCommand,
                },
            };
        }
    }
    return null;
}
function snapshotCurrentStatusLine(settings) {
    const current = settings.statusLine;
    const command = typeof current?.command === 'string' ? current.command : undefined;
    if (isManagedStatusLineCommand(command)) {
        return readLegacyStatusLineSnapshot() ?? { existed: false };
    }
    if (current && typeof current === 'object' && !Array.isArray(current)) {
        return {
            existed: true,
            value: current,
        };
    }
    return { existed: false };
}
function buildStatuslineScript(runtimePath, originalCommand) {
    const escapedRuntime = quoteShell(runtimePath);
    const original = originalCommand ?? '';
    return `#!/bin/bash
set -u

bailian_dir=$(ls -d "\${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claude-bailian-hud/claude-bailian-hud/*/ 2>/dev/null | sort -V | tail -1 || true)
if [ -n "$bailian_dir" ]; then
  ${escapedRuntime} --env-file /dev/null "\${bailian_dir}dist/index.js" 2>/dev/null || true
fi

original_command=$(cat <<'EOF'
${original}
EOF
)

if [ -n "$original_command" ]; then
  /bin/sh -lc "$original_command"
fi
`;
}
async function main() {
    const input = await readStdin();
    const { username, password } = parseCredentials(input);
    const paths = ensureRuntimeDir();
    const settings = readSettings(paths.settingsFile);
    const existingState = readJsonFile(paths.installStateFile);
    const statusLineSnapshot = existingState?.statusLine ?? snapshotCurrentStatusLine(settings);
    const originalCommand = typeof statusLineSnapshot.value?.command === 'string'
        ? statusLineSnapshot.value.command
        : undefined;
    writeConfig({
        username,
        password,
        sessionTimeoutMs: 10 * 60 * 1000,
    });
    writeTextFileAtomic(paths.statuslineScriptFile, buildStatuslineScript(process.execPath, originalCommand), 0o755);
    const installState = {
        version: 1,
        installedAt: existingState?.installedAt ?? new Date().toISOString(),
        statusLine: statusLineSnapshot,
    };
    writeJsonFileAtomic(paths.installStateFile, installState, 0o600);
    settings.statusLine = {
        type: 'command',
        command: `bash ${paths.statuslineScriptFile}`,
    };
    writeJsonFileAtomic(paths.settingsFile, settings);
    console.error('[bailian-hud] 已写入配置和 statusLine 包装脚本');
    console.error(`[bailian-hud] 运行时目录: ${paths.runtimeDir}`);
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : '配置失败';
    console.error('[bailian-hud] 配置失败:', message);
    process.exit(1);
});
