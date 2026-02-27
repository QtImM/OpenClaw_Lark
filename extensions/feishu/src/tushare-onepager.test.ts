import { describe, expect, it } from "vitest";
import {
  detectTushareOnePagerCompanyQuery,
  resolveTushareOnePagerConfig,
} from "./tushare-onepager.js";

describe("detectTushareOnePagerCompanyQuery", () => {
  it("accepts short company names in mentioned group messages", () => {
    const result = detectTushareOnePagerCompanyQuery({
      content: "贵州茅台",
      mentionedBot: true,
      chatType: "group",
      messageType: "text",
    });
    expect(result).toBe("贵州茅台");
  });

  it("rejects non-mentioned group messages", () => {
    const result = detectTushareOnePagerCompanyQuery({
      content: "贵州茅台",
      mentionedBot: false,
      chatType: "group",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("rejects long question style text", () => {
    const result = detectTushareOnePagerCompanyQuery({
      content: "请帮我分析一下贵州茅台的未来增长潜力？",
      mentionedBot: true,
      chatType: "group",
      messageType: "text",
    });
    expect(result).toBeNull();
  });
});

describe("resolveTushareOnePagerConfig", () => {
  it("prefers config token over env token", () => {
    const resolved = resolveTushareOnePagerConfig(
      {
        domain: "feishu",
        connectionMode: "websocket",
        webhookPath: "/feishu/events",
        dmPolicy: "pairing",
        groupPolicy: "allowlist",
        requireMention: true,
        tushareOnePager: {
          enabled: true,
          token: "cfg-token",
          timeoutMs: 1234,
        },
      },
      {
        TUSHARE_TOKEN: "env-token",
      } as NodeJS.ProcessEnv,
    );

    expect(resolved.enabled).toBe(true);
    expect(resolved.token).toBe("cfg-token");
    expect(resolved.timeoutMs).toBe(1234);
    expect(resolved.endpoint).toBe("https://api.tushare.pro");
  });
});
