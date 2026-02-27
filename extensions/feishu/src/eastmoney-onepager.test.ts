import { describe, it, expect } from "vitest";
import {
  detectEastMoneyOnePagerCompanyQuery,
  resolveEastMoneyOnePagerConfig,
} from "./eastmoney-onepager.js";
import type { FeishuConfig } from "./types.js";

describe("detectEastMoneyOnePagerCompanyQuery", () => {
  it("should detect company name in DM", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "贵州茅台",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBe("贵州茅台");
  });

  it("should detect company name in group with bot mention", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "中国平安",
      mentionedBot: true,
      chatType: "group",
      messageType: "text",
    });
    expect(result).toBe("中国平安");
  });

  it("should return null for group without bot mention", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "平安银行",
      mentionedBot: false,
      chatType: "group",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should detect explicit onepager format", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "onepager 阿里巴巴",
      mentionedBot: true,
      chatType: "group",
      messageType: "text",
    });
    expect(result).toBe("阿里巴巴");
  });

  it("should detect Chinese onepager format", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "一页纸 腾讯",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBe("腾讯");
  });

  it("should reject multiline content", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "贵州茅台\n中国平安",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject commands starting with /", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "/贵州茅台",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject questions", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "贵州茅台怎么样？",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject URLs", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "https://example.com/贵州茅台",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject too short content", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "a",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject too long content", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content:
        "这是一家非常著名的大型跨国公司它的业务涵盖许多领域包括科技制造金融等多个方面非常长的文本",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject content with spaces", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "贵州 茅台",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject English words without Chinese characters", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "hello",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should accept content with spaces when using explicit onepager format", () => {
    const result = detectEastMoneyOnePagerCompanyQuery({
      content: "onepager 贵州茅台集团",
      mentionedBot: true,
      chatType: "group",
      messageType: "text",
    });
    expect(result).toBe("贵州茅台集团");
  });
});

describe("resolveEastMoneyOnePagerConfig", () => {
  it("should use config endpoint if provided", () => {
    const config: FeishuConfig = {
      domain: "feishu",
      connectionMode: "websocket",
      webhookPath: "/feishu/events",
      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      requireMention: true,
      eastmoneyOnePager: {
        enabled: true,
        endpoint: "http://custom.example.com",
        timeoutMs: 5000,
      },
    };

    const resolved = resolveEastMoneyOnePagerConfig(config, {});

    expect(resolved.enabled).toBe(true);
    expect(resolved.endpoint).toBe("http://custom.example.com");
    expect(resolved.timeoutMs).toBe(5000);
  });

  it("should use default endpoint if not provided", () => {
    const config: FeishuConfig = {
      domain: "feishu",
      connectionMode: "websocket",
      webhookPath: "/feishu/events",
      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      requireMention: true,
      eastmoneyOnePager: {
        enabled: true,
      },
    };

    const resolved = resolveEastMoneyOnePagerConfig(config, {});

    expect(resolved.enabled).toBe(true);
    expect(resolved.endpoint).toBe("https://datacenter-web.eastmoney.com");
    expect(resolved.timeoutMs).toBe(10000);
  });

  it("should default enabled to true if not specified", () => {
    const config: FeishuConfig = {
      domain: "feishu",
      connectionMode: "websocket",
      webhookPath: "/feishu/events",
      dmPolicy: "pairing",
      groupPolicy: "allowlist",
      requireMention: true,
    };

    const resolved = resolveEastMoneyOnePagerConfig(config, {});

    expect(resolved.enabled).toBe(true);
  });
});
