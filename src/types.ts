// 用量数据
export interface UsageData {
  planName: string;       // 套餐名称 "Lite" / "Pro"
  fiveHour: number;       // 近5小时用量百分比
  fiveHourReset: string;  // 5小时重置时间 "14:20"
  week: number;           // 近一周用量百分比
  weekReset: string;      // 周重置时间 "03-30"
  month: number;          // 近一月用量百分比
  monthReset: string;     // 月重置时间 "04-09"
}

// 缓存数据
export interface Cache {
  data: UsageData | null;
  timestamp: number;
  sessionId?: string;     // Claude 会话ID，用于会话开启时同步一次
  error?: string;
}

export interface StatuslineState {
  lastSeenAt: number;
}

// 配置
export interface Config {
  username: string;
  password: string;
  sessionTimeoutMs: number; // 会话超时时间（毫秒），超时后视为新会话
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface StatusLineSnapshot {
  existed: boolean;
  value?: JsonObject;
}

export interface InstallState {
  version: number;
  installedAt: string;
  statusLine: StatusLineSnapshot;
}

export type SettingsFile = JsonObject & {
  statusLine?: JsonObject;
  enabledPlugins?: Record<string, boolean>;
  extraKnownMarketplaces?: Record<string, JsonValue>;
};

export type InstalledPluginsFile = JsonObject & {
  version?: number;
  plugins?: Record<string, JsonValue>;
};

export type KnownMarketplacesFile = JsonObject;
