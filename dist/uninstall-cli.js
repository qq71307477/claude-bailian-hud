#!/usr/bin/env node
import { spawn } from 'child_process';
import * as fs from 'fs';
import { readJsonFile, writeJsonFileAtomic } from './fs-utils.js';
import { ensureRuntimeDir, getRuntimePaths, isManagedStatusLineCommand, quoteShell } from './runtime.js';
const PLUGIN_KEY = 'claude-bailian-hud@claude-bailian-hud';
const MARKETPLACE_KEY = 'claude-bailian-hud';
function readSettings(settingsFile) {
    return readJsonFile(settingsFile) ?? {};
}
function cleanupSettings(settings, state) {
    const nextSettings = { ...settings };
    const currentCommand = typeof nextSettings.statusLine?.command === 'string'
        ? nextSettings.statusLine.command
        : undefined;
    if (state?.statusLine.existed && state.statusLine.value) {
        nextSettings.statusLine = state.statusLine.value;
    }
    else if (isManagedStatusLineCommand(currentCommand)) {
        delete nextSettings.statusLine;
    }
    if (nextSettings.enabledPlugins) {
        delete nextSettings.enabledPlugins[PLUGIN_KEY];
        if (Object.keys(nextSettings.enabledPlugins).length === 0) {
            delete nextSettings.enabledPlugins;
        }
    }
    if (nextSettings.extraKnownMarketplaces) {
        delete nextSettings.extraKnownMarketplaces[MARKETPLACE_KEY];
        if (Object.keys(nextSettings.extraKnownMarketplaces).length === 0) {
            delete nextSettings.extraKnownMarketplaces;
        }
    }
    return nextSettings;
}
function cleanupInstalledPlugins(installedPluginsFile) {
    const installed = readJsonFile(installedPluginsFile);
    if (!installed?.plugins) {
        return;
    }
    delete installed.plugins[PLUGIN_KEY];
    writeJsonFileAtomic(installedPluginsFile, installed);
}
function cleanupKnownMarketplaces(knownMarketplacesFile) {
    const known = readJsonFile(knownMarketplacesFile);
    if (!known) {
        return;
    }
    delete known[MARKETPLACE_KEY];
    writeJsonFileAtomic(knownMarketplacesFile, known);
}
function removePathIfExists(filePath) {
    if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { recursive: true, force: true });
    }
}
function schedulePluginPackageCleanup() {
    if (process.env.BAILIAN_PURGE_PLUGIN_PACKAGE === '0') {
        return;
    }
    const paths = getRuntimePaths();
    const targets = [paths.pluginCacheDir, paths.pluginMarketplaceDir]
        .filter((target) => fs.existsSync(target));
    if (targets.length === 0) {
        return;
    }
    const quotedTargets = targets.map((target) => quoteShell(target)).join(' ');
    const cleanupScript = `sleep 2\nrm -rf ${quotedTargets}\n`;
    const child = spawn('/bin/sh', ['-lc', cleanupScript], {
        detached: true,
        stdio: 'ignore',
    });
    child.unref();
}
async function main() {
    const paths = ensureRuntimeDir();
    const installState = readJsonFile(paths.installStateFile);
    const settings = readSettings(paths.settingsFile);
    writeJsonFileAtomic(paths.settingsFile, cleanupSettings(settings, installState));
    cleanupInstalledPlugins(paths.installedPluginsFile);
    cleanupKnownMarketplaces(paths.knownMarketplacesFile);
    removePathIfExists(paths.runtimeDir);
    removePathIfExists(paths.legacyRuntimeDir);
    schedulePluginPackageCleanup();
    console.error('[bailian-hud] 已恢复 statusLine 并清理运行时目录');
    console.error('[bailian-hud] 如仍显示已安装，请执行 /reload-plugins 或重启 Claude');
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : '卸载失败';
    console.error('[bailian-hud] 卸载失败:', message);
    process.exit(1);
});
