import { afterAll, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const CONFIG_ENV_KEYS = [
  "CONNPASS_DEFAULT_USER_ID",
  "CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT",
  "CONNPASS_ENABLE_APPS_SDK_OUTPUT",
  "CONNPASS_RATE_LIMIT_ENABLED",
  "CONNPASS_RATE_LIMIT_DELAY_MS",
  "MCP_BASE_PATH",
];

async function importConfigWithEnv(
  overrides: Record<string, string | undefined>,
) {
  process.env = { ...ORIGINAL_ENV };
  for (const key of CONFIG_ENV_KEYS) {
    delete process.env[key];
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  vi.resetModules();
  return import("../src/config");
}

describe("config", () => {
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns defaults when configuration env vars are not provided", async () => {
    const config = await importConfigWithEnv({});

    expect(config.getDefaultUserId()).toBeUndefined();
    expect(config.getDefaultIncludePresentations()).toBeUndefined();
    expect(config.isAppsSdkOutputEnabled()).toBe(false);
    expect(config.getRateLimitEnabled()).toBeUndefined();
    expect(config.getRateLimitDelayMs()).toBeUndefined();
    expect(config.getMcpBasePath()).toBe("/mcp");
  });

  it("parses valid configuration overrides", async () => {
    const config = await importConfigWithEnv({
      CONNPASS_DEFAULT_USER_ID: "42",
      CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT: "yes",
      CONNPASS_ENABLE_APPS_SDK_OUTPUT: "true",
      CONNPASS_RATE_LIMIT_ENABLED: "off",
      CONNPASS_RATE_LIMIT_DELAY_MS: "1500",
      MCP_BASE_PATH: "api",
    });

    expect(config.getDefaultUserId()).toBe(42);
    expect(config.getDefaultIncludePresentations()).toBe(true);
    expect(config.isAppsSdkOutputEnabled()).toBe(true);
    expect(config.getRateLimitEnabled()).toBe(false);
    expect(config.getRateLimitDelayMs()).toBe(1500);
    expect(config.getMcpBasePath()).toBe("/api");
  });

  it("ignores invalid numeric configuration and logs a warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = await importConfigWithEnv({
      CONNPASS_DEFAULT_USER_ID: "-3",
      CONNPASS_RATE_LIMIT_DELAY_MS: "-10",
    });

    expect(config.getDefaultUserId()).toBeUndefined();
    expect(config.getRateLimitDelayMs()).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it("ignores unrecognised boolean configuration and logs a warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = await importConfigWithEnv({
      CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT: "maybe",
      CONNPASS_RATE_LIMIT_ENABLED: "sometimes",
    });

    expect(config.getDefaultIncludePresentations()).toBeUndefined();
    expect(config.getRateLimitEnabled()).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it("normalises the MCP base path", async () => {
    const config = await importConfigWithEnv({
      MCP_BASE_PATH: "custom/path//",
    });

    expect(config.getMcpBasePath()).toBe("/custom/path");
  });
});
