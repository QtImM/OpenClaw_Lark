/**
 * EastMoney (东方财富) One Pager Generator
 * 使用东方财富 API 生成公司结构化财报报告
 * 覆盖业务、财务、亮点、风险的完整 One Pager
 */

import type { FeishuConfig } from "./types.js";

type EastMoneyTableResponse = {
  code?: number;
  msg?: string;
  result?: Array<Record<string, unknown>>;
  data?: {
    fields?: string[];
    items?: Array<Array<string | number | null>>;
  };
};

type EastMoneyBasicsRow = {
  code?: string;
  name?: string;
  area?: string;
  industry?: string;
  market?: string;
  list_date?: string;
};

type EastMoneyDetailRow = {
  pe?: number;
  pb?: number;
  ps?: number;
  price?: number;
  volume?: number;
  amount?: number;
  market_value?: number;
};

type EastMoneyFinanceRow = {
  revenue?: number;
  profit?: number;
  roe?: number;
  asset_debt_ratio?: number;
  current_ratio?: number;
  quick_ratio?: number;
};

export type EastMoneyOnePagerConfig = {
  enabled: boolean;
  endpoint: string;
  timeoutMs: number;
};

export type EastMoneyOnePagerResult =
  | {
      ok: true;
      markdown: string;
      structured: EastMoneyOnePagerStructured;
      companyName: string;
      stockCode?: string;
    }
  | {
      ok: false;
      error: string;
    };

export type EastMoneyOnePagerStructured = {
  companyName: string;
  stockCode?: string;
  business: string[];
  financialSummary: string[];
  highlights: string[];
  risks: string[];
  basics: string[];
  dataSource: string;
  updatedAt: string;
};

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function formatNumber(value: number | undefined, decimal = 2): string {
  if (value === undefined || !Number.isFinite(value)) return "暂无";
  if (Math.abs(value) >= 1e8) {
    return `${(value / 1e8).toFixed(decimal)}亿`;
  }
  if (Math.abs(value) >= 1e4) {
    return `${(value / 1e4).toFixed(decimal)}万`;
  }
  return value.toFixed(decimal);
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "暂无";
  return `${value.toFixed(2)}%`;
}

/**
 * 检测用户消息是否是 One Pager 请求
 */
export function detectEastMoneyOnePagerCompanyQuery(params: {
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

  // 长度限制：2-24 字符（与 Tushare 保持一致）
  if (normalized.length < 2 || normalized.length > 24) return null;

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

  // 隐式格式：只接受不含空格的文本且包含中文的文本（最保守的approach）
  if (/\s/.test(normalized)) return null;

  // 要求至少包含一个中文字符，以过滤出实际的公司名称
  if (!/[\u4e00-\u9fa5]/.test(normalized)) return null;

  // 隐式格式：直接输入公司名（需要包含中文）
  return normalized;
}

/**
 * 解析 EastMoney One Pager 配置
 */
export function resolveEastMoneyOnePagerConfig(
  feishuCfg: FeishuConfig,
  env: NodeJS.ProcessEnv,
): EastMoneyOnePagerConfig {
  const fromConfig = feishuCfg.eastmoneyOnePager;

  const enabled = fromConfig?.enabled ?? true;
  const endpoint = fromConfig?.endpoint ?? "http://datacenter.eastmoney.com";
  const timeoutMs = fromConfig?.timeoutMs ?? 10_000;

  return { enabled, endpoint, timeoutMs };
}

/**
 * 从东方财富查询股票代码 (使用网易财经作为备选)
 */
async function lookupEastMoneyStockCode(
  companyName: string,
  config: EastMoneyOnePagerConfig,
): Promise<{ code?: string; name?: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    // 首先尝试东方财富搜索接口
    try {
      const response = await fetch(
        `${config.endpoint}/SecuritiesSearch/api/data?type=stock&query=${encodeURIComponent(companyName)}&pageIndex=0&pageSize=5`,
        { signal: controller.signal },
      );

      if (response.ok) {
        const payload = (await response.json()) as EastMoneyTableResponse;
        if (payload.result && payload.result.length > 0) {
          const first = payload.result[0] as Record<string, unknown>;
          return {
            code: String(first.code ?? ""),
            name: String(first.name ?? ""),
          };
        }
      }
    } catch (_eastmoneyErr) {
      // EastMoney API 失败，继续尝试网易财经
    }

    // 备选：网易财经搜索接口
    const neteaseUrl = `https://api.money.163.com/fundswap/do_search?input=${encodeURIComponent(companyName)}&type=stock`;
    const neteaseRes = await fetch(neteaseUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (neteaseRes.ok) {
      const neteaseData = await neteaseRes.json();
      if (neteaseData.gp && Array.isArray(neteaseData.gp) && neteaseData.gp.length > 0) {
        const first = neteaseData.gp[0];
        return {
          code: String(first.code ?? first.symbol ?? ""),
          name: String(first.name ?? ""),
        };
      }
    }

    return null;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Stock search timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 从东方财富查询股票基本信息
 */
async function queryEastMoneyBasics(
  code: string,
  config: EastMoneyOnePagerConfig,
): Promise<EastMoneyBasicsRow | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    // 标准化代码：ABC123 → sh600000 or sz000000
    let normalizedCode = code.toUpperCase();
    if (!normalizedCode.startsWith("sh") && !normalizedCode.startsWith("sz")) {
      // 假设 6 开头是沪市，0/3 开头是深市
      const numPart = normalizedCode.replace(/[A-Z]/g, "");
      if (numPart.startsWith("6")) {
        normalizedCode = `sh${numPart}`;
      } else if (numPart.startsWith("0") || numPart.startsWith("3")) {
        normalizedCode = `sz${numPart}`;
      }
    }

    const response = await fetch(
      `${config.endpoint}/Securities/api/data?` +
        `namespace=Ths_BasicData&pageIndex=0&pageSize=100&` +
        `sortTypes=1&sortFields=code&code=${normalizedCode}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as EastMoneyTableResponse;
    if (payload.result && payload.result.length > 0) {
      return payload.result[0] as EastMoneyBasicsRow;
    }

    return null;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("EastMoney basics query timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 从东方财富查询股票详细数据
 */
async function queryEastMoneyDetail(
  code: string,
  config: EastMoneyOnePagerConfig,
): Promise<EastMoneyDetailRow | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(
      `${config.endpoint}/Securities/api/data?` +
        `namespace=Ths_StockDetail&pageIndex=0&pageSize=100&` +
        `sortTypes=1&sortFields=code&code=${code}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as EastMoneyTableResponse;
    if (payload.result && payload.result.length > 0) {
      return payload.result[0] as EastMoneyDetailRow;
    }

    return null;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("EastMoney detail query timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 从 EastMoney 查询财务数据（目前仅保留占位，避免不稳定接口导致失败）
 */
async function queryEastMoneyFinance(
  _code: string,
  _config: EastMoneyOnePagerConfig,
): Promise<EastMoneyFinanceRow | null> {
  return null;
}

/**
 * 从 Tushare 查询财务数据（如果有 token）
 */
async function queryTushareFinance(
  code: string,
  companyName: string,
  timeoutMs: number,
): Promise<EastMoneyFinanceRow | null> {
  const token = process.env.TUSHARE_TOKEN;
  if (!token) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 第一次：获取 TS 代码
    const basicRes = await fetch("https://api.tushare.pro", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_name: "stock_basic",
        token: token,
        params: { name: companyName },
        fields: "ts_code,symbol,name",
      }),
    });

    if (!basicRes.ok) {
      return null;
    }

    const basicData = await basicRes.json();
    if (basicData.code !== 0 || !basicData.data || basicData.data.length === 0) {
      return null;
    }

    const tsCode = basicData.data[0].ts_code;
    if (!tsCode) {
      return null;
    }

    // 第二次：获取财务数据
    const finRes = await fetch("https://api.tushare.pro", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_name: "fina_mainbz",
        token: token,
        params: { ts_code: tsCode, period: "20251231" },
        fields:
          "ts_code,end_date,revenue,profit,assets,liab,debt_to_assets,current_ratio,quick_ratio,roe",
      }),
    });

    if (!finRes.ok) {
      return null;
    }

    const finData = await finRes.json();
    if (finData.code !== 0 || !finData.data || finData.data.length === 0) {
      return null;
    }

    const record = finData.data[0];
    return {
      revenue: record.revenue ? Number(record.revenue) : undefined,
      profit: record.profit ? Number(record.profit) : undefined,
      roe: record.roe ? Number(record.roe) : undefined,
      asset_debt_ratio: record.debt_to_assets ? Number(record.debt_to_assets) : undefined,
      current_ratio: record.current_ratio ? Number(record.current_ratio) : undefined,
      quick_ratio: record.quick_ratio ? Number(record.quick_ratio) : undefined,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Tushare query timeout");
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 生成亮点（基于财务数据）
 */
function generateHighlights(params: {
  name?: string;
  industry?: string;
  roe?: number;
  assetDebtRatio?: number;
  pe?: number;
  list_date?: string;
}): string[] {
  const { name, industry, roe, assetDebtRatio, pe, list_date } = params;
  const highlights: string[] = [];

  // 基于行业的信息
  if (industry) {
    highlights.push(`所属行业：${industry}`);
  }

  // 基于 ROE 的分析
  if (roe !== undefined) {
    if (roe > 20) {
      highlights.push(`ROE ${roe.toFixed(1)}%，盈利能力较强`);
    } else if (roe > 15) {
      highlights.push(`ROE ${roe.toFixed(1)}%，盈利能力稳定`);
    } else if (roe > 10) {
      highlights.push(`ROE ${roe.toFixed(1)}%，盈利能力尚可`);
    }
  }

  // 基于负债率的分析
  if (assetDebtRatio !== undefined) {
    if (assetDebtRatio < 30) {
      highlights.push(`资产负债率 ${assetDebtRatio.toFixed(1)}%，财务杠杆低，偿债能力强`);
    } else if (assetDebtRatio < 50) {
      highlights.push(`资产负债率 ${assetDebtRatio.toFixed(1)}%，财务结构均衡`);
    } else {
      highlights.push(`资产负债率 ${assetDebtRatio.toFixed(1)}%，需关注财务风险`);
    }
  }

  // 基于上市时间的信息
  if (list_date && list_date.length >= 4) {
    const listYear = parseInt(list_date.substring(0, 4), 10);
    const yearsSinceListing = new Date().getFullYear() - listYear;
    if (yearsSinceListing >= 20) {
      highlights.push(`已上市 ${yearsSinceListing} 年，市场经验成熟，抗风险能力较强`);
    } else if (yearsSinceListing >= 10) {
      highlights.push(`已上市 ${yearsSinceListing} 年，公司发展相对稳定`);
    }
  }

  // 基于 PE 的估值信息
  if (pe !== undefined && pe > 0) {
    if (pe < 15) {
      highlights.push(`PE 倍数 ${pe.toFixed(1)}，估值处于低位区间`);
    } else if (pe < 25) {
      highlights.push(`PE 倍数 ${pe.toFixed(1)}，估值水平合理`);
    } else {
      highlights.push(`PE 倍数 ${pe.toFixed(1)}，估值处于高位，需要关注`);
    }
  }

  return highlights.slice(0, 3); // 限制在 3 个以内
}

/**
 * 生成风险提示
 */
function generateRisks(params: {
  pe?: number;
  assetDebtRatio?: number;
  currentRatio?: number;
  quickRatio?: number;
}): string[] {
  const { pe, assetDebtRatio, currentRatio, quickRatio } = params;
  const risks: string[] = [];

  // 市场风险
  risks.push("股票价格受市场波动影响，存在系统性风险");

  // 基于 PE 的警示
  if (pe !== undefined && pe > 0) {
    if (pe > 50) {
      risks.push(`PE 倍数 ${pe.toFixed(1)}，估值风险较大，需警惕回调风险`);
    } else if (pe > 30) {
      risks.push(`PE 倍数 ${pe.toFixed(1)}，估值处于高位，存在下行风险`);
    }
  }

  // 基于负债率的风险
  if (assetDebtRatio !== undefined) {
    if (assetDebtRatio > 70) {
      risks.push(`资产负债率 ${assetDebtRatio.toFixed(1)}%，财务杠杆较高，偿债压力较大`);
    } else if (assetDebtRatio > 50) {
      risks.push(`资产负债率 ${assetDebtRatio.toFixed(1)}%，需关注债务风险`);
    }
  }

  // 基于流动比率的风险
  if (currentRatio !== undefined && currentRatio < 1) {
    risks.push(`流动比率 ${currentRatio.toFixed(2)}，短期流动性存在压力`);
  }

  // 基本提示
  risks.push("本报告仅供参考，不构成投资建议");

  return risks.slice(0, 3); // 限制在 3 个以内
}

function buildOnePagerMarkdown(structured: EastMoneyOnePagerStructured): string {
  return [
    `# ${structured.companyName} One Pager`,
    "",
    "## 业务",
    ...(structured.business.length > 0
      ? structured.business.map((item) => `- ${item}`)
      : ["- 暂无公开业务信息"]),
    "",
    "## 基本信息",
    ...(structured.basics.length > 0 ? structured.basics.map((item) => `- ${item}`) : ["- 暂无"]),
    "",
    "## 财务摘要",
    ...(structured.financialSummary.length > 0
      ? structured.financialSummary.map((item) => `- ${item}`)
      : ["- 暂无"]),
    "",
    "## 亮点",
    ...(structured.highlights.length > 0
      ? structured.highlights.map((item) => `- ${item}`)
      : ["- 暂无明显亮点"]),
    "",
    "## 风险提示",
    ...(structured.risks.length > 0
      ? structured.risks.map((item) => `- ${item}`)
      : ["- 本报告仅供参考，不构成投资建议"]),
    "",
    "---",
    "",
    `*数据来源：${structured.dataSource} | 更新时间：${structured.updatedAt}*`,
    "*本报告仅供参考，不构成投资建议*",
  ].join("\n");
}

export async function generateEastMoneyOnePagerStructured(params: {
  companyName: string;
  config: EastMoneyOnePagerConfig;
}): Promise<EastMoneyOnePagerResult> {
  const { companyName, config } = params;

  try {
    // 第 1 步：查询股票代码
    let lookupResult = await lookupEastMoneyStockCode(companyName, config).catch(() => null);

    if (!lookupResult) {
      // 尝试直接作为股票代码查询
      const basicResult = await queryEastMoneyBasics(companyName, config).catch(() => null);
      if (!basicResult) {
        return {
          ok: false,
          error: `未找到 "${companyName}" 的股票信息，请检查公司名称或股票代码是否正确。`,
        };
      }
      lookupResult = { code: String(basicResult.code), name: String(basicResult.name) };
    }

    const code = lookupResult.code as string;
    const displayName = lookupResult.name as string;

    if (!code) {
      return {
        ok: false,
        error: `未找到 "${companyName}" 的股票代码`,
      };
    }

    // 第 2 步：并行查询基本信息、详情、财务数据
    // 财务数据优先尝试 Tushare，然后回退到 EastMoney
    const [basics, detail, financeFromTushare, financeFromEastMoney] = await Promise.all([
      queryEastMoneyBasics(code, config).catch(() => null),
      queryEastMoneyDetail(code, config).catch(() => null),
      queryTushareFinance(code, displayName, config.timeoutMs).catch(() => null),
      queryEastMoneyFinance(code, config).catch(() => null),
    ]);

    // 选择财务数据来源（优先 Tushare）
    const finance = financeFromTushare || financeFromEastMoney;

    const basicsLines: string[] = [];
    basicsLines.push(`公司名称：${displayName}`);
    basicsLines.push(`股票代码：${code}`);
    if (basics?.industry) {
      basicsLines.push(`所属行业：${basics.industry}`);
    }
    if (basics?.area) {
      basicsLines.push(`所在地区：${basics.area}`);
    }
    if (basics?.list_date) {
      const formattedDate = `${basics.list_date.toString().slice(0, 4)}-${basics.list_date
        .toString()
        .slice(4, 6)}-${basics.list_date.toString().slice(6, 8)}`;
      basicsLines.push(`上市日期：${formattedDate}`);
    }

    const businessLines: string[] = [];
    if (basics?.industry) {
      businessLines.push(`主营方向：${basics.industry}`);
    }
    if (basics?.area) {
      businessLines.push(`主要经营地区：${basics.area}`);
    }

    const financialLines: string[] = [];
    if (detail?.price !== undefined) {
      financialLines.push(`最新价格：${formatNumber(Number(detail.price), 2)} 元`);
    }
    if (detail?.pe !== undefined) {
      financialLines.push(`PE 倍数：${formatPercent(Number(detail.pe))}`);
    }
    if (detail?.pb !== undefined) {
      financialLines.push(`PB 倍数：${formatNumber(Number(detail.pb), 2)}`);
    }
    if (detail?.market_value !== undefined) {
      financialLines.push(`市值：${formatNumber(Number(detail.market_value), 0)}`);
    }
    if (finance?.roe !== undefined) {
      financialLines.push(`ROE：${formatPercent(Number(finance.roe))}`);
    }
    if (finance?.asset_debt_ratio !== undefined) {
      financialLines.push(`资产负债率：${formatPercent(Number(finance.asset_debt_ratio))}`);
    }

    // 亮点分析
    const highlights = generateHighlights({
      name: displayName,
      industry: basics?.industry ? String(basics.industry) : undefined,
      roe: finance?.roe ? Number(finance.roe) : undefined,
      assetDebtRatio: finance?.asset_debt_ratio ? Number(finance.asset_debt_ratio) : undefined,
      pe: detail?.pe ? Number(detail.pe) : undefined,
      list_date: basics?.list_date ? String(basics.list_date) : undefined,
    });

    // 风险提示
    const risks = generateRisks({
      pe: detail?.pe ? Number(detail.pe) : undefined,
      assetDebtRatio: finance?.asset_debt_ratio ? Number(finance.asset_debt_ratio) : undefined,
      currentRatio: finance?.current_ratio ? Number(finance.current_ratio) : undefined,
      quickRatio: finance?.quick_ratio ? Number(finance.quick_ratio) : undefined,
    });

    // 数据来源说明
    const dataSource = financeFromTushare
      ? "Tushare"
      : financeFromEastMoney
        ? "EastMoney"
        : "混合数据源";
    const updatedAt = new Date().toLocaleDateString("zh-CN");

    const structured: EastMoneyOnePagerStructured = {
      companyName: displayName,
      stockCode: code,
      business: businessLines,
      financialSummary: financialLines,
      highlights,
      risks,
      basics: basicsLines,
      dataSource,
      updatedAt,
    };

    const markdown = buildOnePagerMarkdown(structured);

    return {
      ok: true,
      markdown,
      structured,
      companyName: displayName,
      stockCode: code,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `查询失败：${errorMsg}`,
    };
  }
}

/**
 * 生成 Markdown 版本的 One Pager
 */
export async function generateEastMoneyOnePagerMarkdown(params: {
  companyName: string;
  config: EastMoneyOnePagerConfig;
}): Promise<EastMoneyOnePagerResult> {
  return generateEastMoneyOnePagerStructured(params);
}
