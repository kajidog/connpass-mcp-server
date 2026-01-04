const BOOLEAN_TRUE_VALUES = new Set(["1", "true", "yes", "y", "on"]);
const BOOLEAN_FALSE_VALUES = new Set(["0", "false", "no", "n", "off"]);

function parseOptionalBooleanEnv(
  raw: string | undefined,
  envName: string,
): boolean | undefined {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();

  if (BOOLEAN_TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (BOOLEAN_FALSE_VALUES.has(normalized)) {
    return false;
  }

  console.warn(
    `[mcp-server] ${envName} is set but not a recognizable boolean. It will be ignored.`,
  );
  return undefined;
}

const RAW_DEFAULT_USER_ID = process.env.CONNPASS_DEFAULT_USER_ID;
const RAW_INCLUDE_PRESENTATIONS_DEFAULT =
  process.env.CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT;
const RAW_ENABLE_APPS_SDK_OUTPUT = process.env.CONNPASS_ENABLE_APPS_SDK_OUTPUT;
const RAW_RATE_LIMIT_ENABLED = process.env.CONNPASS_RATE_LIMIT_ENABLED;
const RAW_RATE_LIMIT_DELAY_MS = process.env.CONNPASS_RATE_LIMIT_DELAY_MS;

const parsedDefaultUserId = (() => {
  if (!RAW_DEFAULT_USER_ID) {
    return undefined;
  }

  const numeric = Number(RAW_DEFAULT_USER_ID);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    console.warn(
      "[mcp-server] CONNPASS_DEFAULT_USER_ID is set but not a positive number. It will be ignored.",
    );
    return undefined;
  }

  return Math.trunc(numeric);
})();

const parsedIncludePresentationsDefault = parseOptionalBooleanEnv(
  RAW_INCLUDE_PRESENTATIONS_DEFAULT,
  "CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT",
);

const parsedEnableAppsSdkOutput = parseOptionalBooleanEnv(
  RAW_ENABLE_APPS_SDK_OUTPUT,
  "CONNPASS_ENABLE_APPS_SDK_OUTPUT",
);

const parsedRateLimitEnabled = parseOptionalBooleanEnv(
  RAW_RATE_LIMIT_ENABLED,
  "CONNPASS_RATE_LIMIT_ENABLED",
);

const parsedRateLimitDelayMs = (() => {
  if (!RAW_RATE_LIMIT_DELAY_MS) {
    return undefined;
  }

  const numeric = Number(RAW_RATE_LIMIT_DELAY_MS);
  if (!Number.isFinite(numeric) || numeric < 0) {
    console.warn(
      "[mcp-server] CONNPASS_RATE_LIMIT_DELAY_MS is set but not a non-negative number. It will be ignored.",
    );
    return undefined;
  }

  return Math.trunc(numeric);
})();

export function getDefaultUserId(): number | undefined {
  return parsedDefaultUserId;
}

export function getDefaultIncludePresentations(): boolean | undefined {
  return parsedIncludePresentationsDefault;
}

export function isAppsSdkOutputEnabled(): boolean {
  return parsedEnableAppsSdkOutput ?? false;
}

export function getRateLimitEnabled(): boolean | undefined {
  return parsedRateLimitEnabled;
}

export function getRateLimitDelayMs(): number | undefined {
  return parsedRateLimitDelayMs;
}
