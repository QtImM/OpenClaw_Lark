/**
 * LLM-based Company One Pager Generator
 * 使用 LLM 的知识生成公司结构化报告（业务、财务、亮点、风险）
 * 无需外部 API，立即可用
 */

import type { FeishuConfig } from "./types.js";

export type LlmOnePagerConfig = {
  enabled: boolean;
  systemPrompt?: string;
};

export type LlmOnePagerRequest = {
  companyName: string;
  requestedBy: string;
  timestamp: number;
};

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * 检测用户消息是否是 One Pager 请求
 */
export function detectLlmOnePagerCompanyQuery(params: {
  content: string;
  mentionedBot: boolean;
  chatType: "p2p" | "group";
  messageType: string;
}): string | null {
  const { content, mentionedBot, chatType, messageType } = params;

  // 只处理文本消息
  if (messageType !== "text" && messageType !== "post") return null;

  // 群聊必须 @ 机器人
  if (chatType === "group" && !mentionedBot) return null;

  const normalized = normalizeText(content);
  if (!normalized) return null;

  // 长度限制：2-50 字符
  if (normalized.length < 2 || normalized.length > 50) return null;

  // 排除多行文本
  if (/\n|\r/.test(content)) return null;

  // 排除以命令符号开头的
  if (/^[/!]/.test(normalized)) return null;

  // 排除问句和感叹句
  if (/[?？!！]/.test(normalized)) return null;

  // 排除包含 URL 的
  if (/https?:\/\//i.test(normalized)) return null;

  // 显式格式：onepager 公司名 或 一页纸 公司名
  if (normalized.startsWith("onepager ") || normalized.startsWith("一页纸 ")) {
    const explicit = normalizeText(normalized.split(" ").slice(1).join(" "));
    return explicit || null;
  }

  // 隐式格式：直接输入公司名（适合已建立对话上下文的场景）
  return normalized;
}

/**
 * 解析 One Pager 配置
 */
export function resolveLlmOnePagerConfig(
  feishuCfg: FeishuConfig,
  env: NodeJS.ProcessEnv,
): LlmOnePagerConfig {
  const fromConfig = feishuCfg.llmOnePager;

  // 默认启用
  const enabled = fromConfig?.enabled ?? true;

  // 系统提示词可通过配置自定义，或使用环境变量
  const systemPrompt =
    fromConfig?.systemPrompt || env.LLM_ONEPAGER_SYSTEM_PROMPT || getDefaultSystemPrompt();

  return { enabled, systemPrompt };
}

/**
 * 默认的系统提示词，指导 LLM 生成结构化的公司报告（简洁版）
 */
function getDefaultSystemPrompt(): string {
  return `你是投资分析师。用户提供公司名称，生成简洁的 One Pager（限200字以内）。

格式：
**[公司名] ([股票代码])**

**业务**：[1-2句话核心业务]

**财务**：[营收/利润关键数据]

**亮点**：[2-3个要点]

**风险**：[2-3个要点]

要求：
- 简洁精炼，每部分控制在50字内
- 不了解的公司直接说明
- 不做买卖建议`;
}

/**
 * 构建发送给 LLM 的完整提示
 */
export function buildOnePagerPrompt(companyName: string, systemPrompt: string): string {
  return `${systemPrompt}

请为公司生成报告：${companyName}`;
}

/**
 * 生成一个简单的占位符响应（用于测试或 LLM 不可用时）
 */
export function generateFallbackOnePager(companyName: string): string {
  return `**${companyName}**

暂时无法获取该公司信息，请查询公司官网或证券交易所公告。`;
}
