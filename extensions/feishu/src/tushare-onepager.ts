import type { FeishuConfig } from "./types.js";

type TushareTableResponse = {
  code?: number;
  msg?: string;
  data?: {
    fields?: string[];
    items?: Array<Array<string | number | null>>;
  };
};

type StockBasicRow = {
  ts_code?: string;
  name?: string;
  area?: string;
  industry?: string;
  list_date?: string;
};

type DailyRow = {
  trade_date?: string;
  open?: number | string;
  high?: number | string;
  low?: number | string;
  close?: number | string;
  vol?: number | string;
  amount?: number | string;
  pct_chg?: number | string;
};

export type TushareOnePagerConfig = {
  enabled: boolean;
  token?: string;
  endpoint: string;
  timeoutMs: number;
};

export type TushareOnePagerResult =
  | {
      ok: true;
      markdown: string;
      companyName: string;
      tsCode: string;
    }
  | {
      ok: false;
      error: string;
    };

function formatDateCompact(value?: string): string {
  if (!value || value.length !== 8) return value || "未知";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function toNumber(value: number | string | null | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatMetric(value: number | undefined, suffix = ""): string {
  if (value === undefined) return "暂无";
  return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}${suffix}`;
}

function formatLargeNumber(value: number | undefined): string {
  if (value === undefined) return "暂无";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function detectTushareOnePagerCompanyQuery(params: {
  content: string;
  mentionedBot: boolean;
  chatType: "p2p" | "group";
  messageType: string;
}): string | null {
  const { content, mentionedBot, chatType, messageType } = params;
  if (messageType !== "text" && messageType !== "post") return null;
  if (chatType === "group" && !mentionedBot) return null;

  const normalized = normalizeText(content);
  if (!normalized) return null;
  if (normalized.length < 2 || normalized.length > 24) return null;
  if (/\n|\r/.test(content)) return null;
  if (/^[/!]/.test(normalized)) return null;
  if (/[?？!！]/.test(normalized)) return null;
  if (/https?:\/\//i.test(normalized)) return null;

  if (normalized.startsWith("onepager ") || normalized.startsWith("一页纸 ")) {
    const explicit = normalizeText(normalized.split(" ").slice(1).join(" "));
    return explicit || null;
  }

  return normalized;
}

export function resolveTushareOnePagerConfig(
  feishuCfg: FeishuConfig,
  env: NodeJS.ProcessEnv,
): TushareOnePagerConfig {
  const fromConfig = feishuCfg.tushareOnePager;
  const enabled = fromConfig?.enabled ?? true;
  const token = fromConfig?.token || env.TUSHARE_TOKEN;
  const endpoint = fromConfig?.endpoint ?? "https://api.tushare.pro";
  const timeoutMs = fromConfig?.timeoutMs ?? 10_000;
  return { enabled, token, endpoint, timeoutMs };
}

async function queryTushareRows<T extends Record<string, unknown>>(params: {
  apiName: string;
  token: string;
  endpoint: string;
  timeoutMs: number;
  fields: string[];
  query?: Record<string, string | number>;
}): Promise<T[]> {
  const { apiName, token, endpoint, timeoutMs, fields, query } = params;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_name: apiName,
        token,
        params: query ?? {},
        fields: fields.join(","),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as TushareTableResponse;
    if (payload.code !== 0) {
      // Map common Tushare error codes to user-friendly messages
      const errorMsg = payload.msg || `Tushare error code ${String(payload.code)}`;

      if (payload.code === 40203) {
        // Permission denied - provide specific guidance
        throw new Error(
          `Tushare Token 权限不足或已过期（错误码 40203）。\n` +
            `建议：\n` +
            `1. 访问 https://tushare.pro 确认账户是否仍有有效权限\n` +
            `2. 检查是否需要升级为付费版以获得 stock_basic 和 daily 接口权限\n` +
            `3. 重新生成 Token 并更新环境变量 TUSHARE_TOKEN`,
        );
      }

      throw new Error(errorMsg);
    }

    const fieldList = payload.data?.fields ?? [];
    const items = payload.data?.items ?? [];
    return items.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (let index = 0; index < fieldList.length; index += 1) {
        mapped[fieldList[index] as string] = row[index];
      }
      return mapped as T;
    });
  } finally {
    clearTimeout(timer);
  }
}

function buildHighlightsAndRisks(input: { basic: StockBasicRow; dailyRows: DailyRow[] }): {
  highlights: string[];
  risks: string[];
} {
  const { basic, dailyRows } = input;
  const highlights: string[] = [];
  const risks: string[] = [];

  // 基于行业和上市时间的基础判断
  if (basic.industry) {
    highlights.push(`所属行业：${basic.industry}。`);
  }

  const listDate = basic.list_date;
  if (listDate && listDate.length === 8) {
    const yearsSinceListing = new Date().getFullYear() - parseInt(listDate.slice(0, 4), 10);
    if (yearsSinceListing >= 10) {
      highlights.push(`已上市 ${yearsSinceListing} 年，市场经验较为成熟。`);
    }
  }

  // 基于近期价格走势的简单分析
  if (dailyRows.length >= 5) {
    const recent = dailyRows.slice(0, 5);
    const avgPctChg =
      recent
        .map((d) => toNumber(d.pct_chg))
        .filter((v) => v !== undefined)
        .reduce((sum, v) => sum + (v || 0), 0) / recent.length;

    if (avgPctChg > 2) {
      highlights.push(`近 5 日平均涨幅约 ${avgPctChg.toFixed(2)}%，短期走势较强。`);
    } else if (avgPctChg < -2) {
      risks.push(`近 5 日平均跌幅约 ${Math.abs(avgPctChg).toFixed(2)}%，短期波动较大。`);
    }
  }

  if (highlights.length === 0) {
    highlights.push("基础信息正常，建议结合深度研究与行业分析进一步判断。");
  }
  if (risks.length === 0) {
    risks.push("基于免费数据暂无显著风险信号，建议关注公司公告与财报披露。");
  }

  return { highlights, risks };
}

function buildOnePagerMarkdown(input: { basic: StockBasicRow; dailyRows: DailyRow[] }): string {
  const { basic, dailyRows } = input;
  const companyName = basic.name || "未知公司";
  const tsCode = basic.ts_code || "未知代码";

  const latest = dailyRows[0];
  const close = toNumber(latest?.close);
  const open = toNumber(latest?.open);
  const high = toNumber(latest?.high);
  const low = toNumber(latest?.low);
  const vol = toNumber(latest?.vol);
  const amount = toNumber(latest?.amount);
  const pctChg = toNumber(latest?.pct_chg);

  const { highlights, risks } = buildHighlightsAndRisks({ basic, dailyRows });

  return [
    `# ${companyName}（${tsCode}）One Pager`,
    "",
    "## 基本信息",
    `- 股票代码：${tsCode}`,
    `- 公司名称：${companyName}`,
    `- 所属行业：${basic.industry || "暂无"}`,
    `- 所在地域：${basic.area || "暂无"}`,
    `- 上市日期：${formatDateCompact(basic.list_date)}`,
    "",
    "## 最新行情",
    `- 交易日期：${formatDateCompact(latest?.trade_date)}`,
    `- 收盘价：${formatMetric(close, " 元")}`,
    `- 开盘价：${formatMetric(open, " 元")}`,
    `- 最高价：${formatMetric(high, " 元")}`,
    `- 最低价：${formatMetric(low, " 元")}`,
    `- 成交量：${formatLargeNumber(vol)} 手`,
    `- 成交额：${formatLargeNumber(amount)} 千元`,
    `- 涨跌幅：${formatMetric(pctChg, "%")}`,
    "",
    "## 近期走势",
    ...(dailyRows.length >= 5
      ? dailyRows.slice(0, 5).map((d) => {
          const date = formatDateCompact(d.trade_date);
          const closeVal = formatMetric(toNumber(d.close), " 元");
          const chg = formatMetric(toNumber(d.pct_chg), "%");
          return `- ${date}：${closeVal}（${chg}）`;
        })
      : ["- 近期数据不足"]),
    "",
    "## 观察要点",
    ...highlights.map((item) => `- ${item}`),
    "",
    "## 风险提示",
    ...risks.map((item) => `- ${item}`),
    "",
    "_数据来源：Tushare（免费接口，仅供参考，不构成投资建议）_",
    "_提示：本报告基于免费数据生成，如需完整财务分析请升级 Tushare 会员或查阅公司财报。_",
  ].join("\n");
}

export async function generateTushareOnePagerMarkdown(params: {
  companyName: string;
  config: TushareOnePagerConfig;
}): Promise<TushareOnePagerResult> {
  const { companyName, config } = params;
  const cleanName = normalizeText(companyName);
  if (!cleanName) {
    return { ok: false, error: "请输入上市公司名称。" };
  }
  if (!config.token) {
    return {
      ok: false,
      error:
        "未配置 Tushare Token。请在环境变量设置 TUSHARE_TOKEN，或在 channels.feishu.tushareOnePager.token 中配置。",
    };
  }

  try {
    const basics = await queryTushareRows<StockBasicRow>({
      apiName: "stock_basic",
      token: config.token,
      endpoint: config.endpoint,
      timeoutMs: config.timeoutMs,
      query: { exchange: "", list_status: "L", name: cleanName },
      fields: ["ts_code", "name", "area", "industry", "list_date"],
    });

    const exact = basics.find((item) => normalizeText(item.name || "") === cleanName) ?? basics[0];
    if (!exact?.ts_code) {
      return { ok: false, error: `未找到“${cleanName}”对应的上市公司。` };
    }

    const tsCode = exact.ts_code;

    // 获取最近 30 天的数据（免费接口需要指定日期范围）
    const today = new Date();
    const endDate = today.toISOString().slice(0, 10).replace(/-/g, "");
    const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const dailyRows = await queryTushareRows<DailyRow>({
      apiName: "daily",
      token: config.token,
      endpoint: config.endpoint,
      timeoutMs: config.timeoutMs,
      query: {
        ts_code: tsCode,
        start_date: startDate,
        end_date: endDate,
      },
      fields: ["trade_date", "open", "high", "low", "close", "vol", "amount", "pct_chg"],
    }).catch((err) => {
      // Re-throw permission errors to bubble up to the caller
      if (String(err).includes("40203") || String(err).includes("权限不足")) {
        throw err;
      }
      // Log other errors but allow graceful degradation
      console.log(`Tushare daily failed: ${String(err)}`);
      return [];
    });

    if (dailyRows.length === 0) {
      return {
        ok: false,
        error: "无法获取行情数据，该股票可能已停牌或退市。",
      };
    }

    // 按日期降序排序
    dailyRows.sort((a, b) => {
      const dateA = a.trade_date || "";
      const dateB = b.trade_date || "";
      return dateB.localeCompare(dateA);
    });

    const markdown = buildOnePagerMarkdown({
      basic: exact,
      dailyRows: dailyRows.slice(0, 20),
    });

    return {
      ok: true,
      markdown,
      companyName: exact.name || cleanName,
      tsCode,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Tushare 查询失败：${String(err)}`,
    };
  }
}
