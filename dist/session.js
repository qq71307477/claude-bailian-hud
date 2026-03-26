const SESSION_INTERVAL_MS = 10 * 60 * 1000;
export function getSessionId() {
    const claudeSessionId = process.env.SESSION_ID;
    if (claudeSessionId) {
        return claudeSessionId;
    }
    return Math.floor(Date.now() / SESSION_INTERVAL_MS).toString();
}
