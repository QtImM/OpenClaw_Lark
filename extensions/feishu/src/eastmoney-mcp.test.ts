import { describe, it, expect } from "vitest";
import { resolveEastMoneyMcpConfig } from "./eastmoney-mcp.js";
import type { FeishuConfig } from "./types.js";

describe("resolveEastMoneyMcpConfig", () => {
  it("uses defaults when not configured", () => {
    const config = resolveEastMoneyMcpConfig({} as FeishuConfig, {});
    expect(config.enabled).toBe(false);
    expect(config.command).toBe("bun");
    expect(config.args).toEqual(["extensions/feishu/mcp/eastmoney-mcp-server.ts"]);
    expect(config.timeoutMs).toBe(15000);
    expect(config.fallbackToDirect).toBe(false);
  });

  it("allows overrides from config", () => {
    const feishuCfg: FeishuConfig = {
      domain: "feishu",
      connectionMode: "websocket",
      webhookPath: "/feishu/events",
      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      requireMention: true,
      eastmoneyMcp: {
        enabled: true,
        command: "node",
        args: ["--import", "tsx", "scripts/eastmoney-mcp-server.ts"],
        timeoutMs: 5000,
        fallbackToDirect: true,
      },
    };
    const resolved = resolveEastMoneyMcpConfig(feishuCfg, {});
    expect(resolved.enabled).toBe(true);
    expect(resolved.command).toBe("node");
    expect(resolved.args).toEqual(["--import", "tsx", "scripts/eastmoney-mcp-server.ts"]);
    expect(resolved.timeoutMs).toBe(5000);
    expect(resolved.fallbackToDirect).toBe(true);
  });
});
