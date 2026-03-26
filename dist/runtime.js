import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
let migrationChecked = false;
export function getClaudeConfigDir() {
    return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}
export function getRuntimePaths() {
    const claudeConfigDir = getClaudeConfigDir();
    const pluginsDir = path.join(claudeConfigDir, 'plugins');
    const runtimeDir = path.join(pluginsDir, 'claude-bailian-hud');
    return {
        claudeConfigDir,
        pluginsDir,
        runtimeDir,
        legacyRuntimeDir: path.join(os.homedir(), '.claude-bailian-hud'),
        configFile: path.join(runtimeDir, 'config.json'),
        cacheFile: path.join(runtimeDir, 'cache.json'),
        statuslineStateFile: path.join(runtimeDir, 'statusline-state.json'),
        fetchLockFile: path.join(runtimeDir, 'fetch.lock.json'),
        browserStateDir: path.join(runtimeDir, 'browser-state'),
        installStateFile: path.join(runtimeDir, 'install-state.json'),
        statuslineScriptFile: path.join(runtimeDir, 'statusline.sh'),
        settingsFile: path.join(claudeConfigDir, 'settings.json'),
        installedPluginsFile: path.join(pluginsDir, 'installed_plugins.json'),
        knownMarketplacesFile: path.join(pluginsDir, 'known_marketplaces.json'),
        pluginCacheDir: path.join(pluginsDir, 'cache', 'claude-bailian-hud'),
        pluginMarketplaceDir: path.join(pluginsDir, 'marketplaces', 'claude-bailian-hud'),
    };
}
function copyEntryIfMissing(sourcePath, targetPath) {
    if (fs.existsSync(targetPath)) {
        return;
    }
    fs.cpSync(sourcePath, targetPath, {
        recursive: true,
        force: false,
        errorOnExist: false,
    });
}
export function migrateLegacyRuntime() {
    const paths = getRuntimePaths();
    if (!fs.existsSync(paths.legacyRuntimeDir)) {
        return false;
    }
    fs.mkdirSync(paths.runtimeDir, { recursive: true });
    for (const entry of fs.readdirSync(paths.legacyRuntimeDir)) {
        copyEntryIfMissing(path.join(paths.legacyRuntimeDir, entry), path.join(paths.runtimeDir, entry));
    }
    return true;
}
export function ensureRuntimeDir() {
    const paths = getRuntimePaths();
    if (!migrationChecked) {
        migrateLegacyRuntime();
        migrationChecked = true;
    }
    fs.mkdirSync(paths.runtimeDir, { recursive: true });
    return paths;
}
export function isManagedStatusLineCommand(command) {
    if (!command) {
        return false;
    }
    return command.includes('.claude-bailian-hud/statusline.sh')
        || command.includes('/plugins/claude-bailian-hud/statusline.sh');
}
export function quoteShell(value) {
    return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}
