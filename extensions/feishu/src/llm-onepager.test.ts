import { describe, it, expect } from "vitest";
import {
  detectLlmOnePagerCompanyQuery,
  resolveLlmOnePagerConfig,
  buildOnePagerPrompt,
} from "./llm-onepager.js";
import type { FeishuConfig } from "./types.js";

describe("detectLlmOnePagerCompanyQuery", () => {
  it("should detect company name in DM", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "贵州茅台",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBe("贵州茅台");
  });

  it("should detect company name in group with bot mention", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "中国平安",
      mentionedBot: true,
      chatType: "group",
      messageType: "text",
    });
    expect(result).toBe("中国平安");
  });

  it("should return null for group without bot mention", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "平安银行",
      mentionedBot: false,
      chatType: "group",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should detect explicit onepager format", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "onepager 阿里巴巴",
      mentionedBot: true,
      chatType: "group",
      messageType: "text",
    });
    expect(result).toBe("阿里巴巴");
  });

  it("should detect Chinese onepager format", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "一页纸 腾讯",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBe("腾讯");
  });

  it("should reject multiline content", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "贵州茅台\n中国平安",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject commands starting with /", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "/贵州茅台",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject questions", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "贵州茅台怎么样？",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject URLs", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "https://example.com/贵州茅台",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject too short content", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "A",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should reject too long content", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "A".repeat(51),
      mentionedBot: false,
      chatType: "p2p",
      messageType: "text",
    });
    expect(result).toBeNull();
  });

  it("should work for post type messages", () => {
    const result = detectLlmOnePagerCompanyQuery({
      content: "京东",
      mentionedBot: false,
      chatType: "p2p",
      messageType: "post",
    });
    expect(result).toBe("京东");
  });
});

describe("resolveLlmOnePagerConfig", () => {
  it("should use default enabled=true", () => {
    const config = resolveLlmOnePagerConfig({} as FeishuConfig, {});
    expect(config.enabled).toBe(true);
  });

  it("should respect explicit enabled=false", () => {
    const config = resolveLlmOnePagerConfig(
      { llmOnePager: { enabled: false } } as FeishuConfig,
      {},
    );
    expect(config.enabled).toBe(false);
  });

  it("should use custom system prompt from config", () => {
    const customPrompt = "Custom analyst prompt";
    const config = resolveLlmOnePagerConfig(
      { llmOnePager: { systemPrompt: customPrompt } } as FeishuConfig,
      {},
    );
    expect(config.systemPrompt).toBe(customPrompt);
  });

  it("should use system prompt from env variable", () => {
    const envPrompt = "Env analyst prompt";
    const config = resolveLlmOnePagerConfig({} as FeishuConfig, {
      LLM_ONEPAGER_SYSTEM_PROMPT: envPrompt,
    });
    expect(config.systemPrompt).toBe(envPrompt);
  });

  it("should prefer config over env", () => {
    const configPrompt = "Config prompt";
    const envPrompt = "Env prompt";
    const config = resolveLlmOnePagerConfig(
      { llmOnePager: { systemPrompt: configPrompt } } as FeishuConfig,
      { LLM_ONEPAGER_SYSTEM_PROMPT: envPrompt },
    );
    expect(config.systemPrompt).toBe(configPrompt);
  });
});

describe("buildOnePagerPrompt", () => {
  it("should include company name and system prompt", () => {
    const systemPrompt = "You are an analyst";
    const prompt = buildOnePagerPrompt("贵州茅台", systemPrompt);

    expect(prompt).toContain(systemPrompt);
    expect(prompt).toContain("贵州茅台");
  });

  it("should include company name in generated prompt", () => {
    const prompt = buildOnePagerPrompt("腾讯", "Analyst prompt");

    expect(prompt).toContain("腾讯");
    expect(prompt).toContain("Analyst prompt");
  });
});
