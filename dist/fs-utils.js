import * as fs from 'fs';
import * as path from 'path';
function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
function getExistingMode(filePath) {
    try {
        return fs.statSync(filePath).mode & 0o777;
    }
    catch {
        return undefined;
    }
}
export function readTextFileIfExists(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        return fs.readFileSync(filePath, 'utf-8');
    }
    catch {
        return null;
    }
}
export function readJsonFile(filePath) {
    const content = readTextFileIfExists(filePath);
    if (!content) {
        return null;
    }
    try {
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
export function writeTextFileAtomic(filePath, content, mode) {
    ensureParentDir(filePath);
    const tempFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const fileMode = mode ?? getExistingMode(filePath);
    try {
        fs.writeFileSync(tempFile, content, {
            encoding: 'utf-8',
            mode: fileMode,
        });
        fs.renameSync(tempFile, filePath);
        if (fileMode !== undefined) {
            fs.chmodSync(filePath, fileMode);
        }
    }
    finally {
        if (fs.existsSync(tempFile)) {
            fs.rmSync(tempFile, { force: true });
        }
    }
}
export function writeJsonFileAtomic(filePath, value, mode) {
    writeTextFileAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`, mode);
}
