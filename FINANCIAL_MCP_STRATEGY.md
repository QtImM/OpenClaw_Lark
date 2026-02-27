# 财报 MCP 多数据源集成战略

## 📊 执行摘要

当前飞书机器人已支持 **Tushare 实时行情 One Pager** 功能。本文档列举除 Tushare 外的财报数据源及实现路线图。

---

## 🔌 财报数据源对比表

### 第一梯队（API + 免费 + 稳定）

#### 1. **东方财富（EastMoney）** ⭐⭐⭐⭐⭐

- **覆盖范围**：所有 A 股 + HK + US 股票
- **关键数据**：
  - 财务摘要（TTM 营收、利润、ROE、负债率）
  - 估值指标（PE、PB、PS）
  - 行业对标排名
  - 分红历史
- **API 端点**：
  ```
  GET http://datacenter.eastmoney.com/securities/api/data
  ?namespace=Ths_BasicData&pageIndex=0&pageSize=100&sortTypes=1&sortFields=code
  ?code=601988  # 中国银行
  ```
- **实现难度**：⭐⭐
- **响应速度**：快（无认证，JSON 格式）
- **失败成本**：极低，无碍交互
- **推荐度**：✅ 立即实现

---

#### 2. **网易行情（163.com Finance）** ⭐⭐⭐⭐

- **覆盖范围**：A 股 + HK + US 股票
- **关键数据**：
  - 最新行情（开盘、收盘、涨跌幅）
  - 基本面数据（市值、PE、PB）
  - 财务概览（营收、利润 TTM）
- **API 端点**（无认证）：
  ```
  GET http://quotes.money.163.com/service/chddata.html
  ?code=0601988&start=20200101&end=20260228&fields=TCLOSE,HIGH,LOW,TVOLUME
  ```
- **实现难度**：⭐
- **失败政策**：可选增强，不影响核心
- **推荐度**：✅ 轻量级补充

---

#### 3. **新浪财经（Sina Finance）** ⭐⭐⭐

- **覆盖范围**：A 股 + HK + US 股票 + 基金
- **关键数据**：
  - 实时行情
  - 热点新闻
  - 舆情评分
  - 基金持仓
- **API 端点**：

  ```
  GET http://hq.sinajs.cn/?list=sh601988
  // 实时行情（需解析响应格式）

  GET http://finance.sina.com.cn/realstock/company/sh601988/nc.shtml
  // 用 cheerio 爬取企业模块
  ```

- **实现难度**：⭐⭐
- **失败政策**：有速率限制（500 milli-seconds），需加重试
- **推荐度**：⚠️ 可选，但需防反爬

---

### 第二梯队（官方数据 + 权威 + 需初始化）

#### 4. **巨潮资讯（CNINFO）- 上市公司公告** ⭐⭐⭐⭐⭐

- **覆盖范围**：所有中国上市公司官方资料
- **关键数据**：
  - 最新公告（并购、融资、重大事项）
  - 定期报告（年报、中报、季报）📑
  - 高管变动
  - 股权结构
- **API 端点**（通过非官方 JSON 接口）：

  ```
  GET https://www.cninfo.com.cn/new/disclosure
  ?plate=sse&pageNum=1&pageSize=30
  &contentType=jsondata&sortName=code

  或使用 cheerio 爬取：
  GET http://query.cninfo.com.cn/query/annSearch
  ?stockCode=601988&searchkey=stock_code
  ```

- **实现难度**：⭐⭐
- **权威性**：最高（官方交易所）
- **更新频率**：实时
- **推荐度**：✅ 强烈推荐，内容独特

---

#### 5. **天天基金（Fund.Eastmoney）** ⭐⭐⭐⭐

- **覆盖范围**：所有公开基金 + 基金持仓
- **关键数据**：
  - 基金产品信息
  - 净值走势
  - 持仓明细（股票权重）
  - 基金评级
- **API 端点**：

  ```
  GET http://api.fund.eastmoney.com/GetFundBasics/handler
  ?action=GetFundBasics&PageIndex=0&PageSize=1000

  GET http://f10.eastmoney.com/ManagerData.aspx?code=110022
  // 基金持仓股票
  ```

- **实现难度**：⭐⭐
- **使用场景**：当查询对象是基金产品时，优先这个源
- **推荐度**：⚠️ 补充功能

---

### 第三梯队（需认证 / 爬虫 / 不稳定）

#### 6. **同花顺（10jqka）- 行情 + 研报** ⭐⭐⭐

- **覆盖范围**：A 股 + 港股 + 研报
- **关键数据**：
  - 财务分析（十年报表）
  - 研报评论量
  - 机构评分
  - 股东变动
- **API 端点**（部分需登录）：
  ```
  GET https://api.10jqka.com.cn/yj/list
  ?code=600519&start=0&length=20
  // 研报列表
  ```
- **实现难度**：⭐⭐⭐
- **稳定性**：中等（防反爬，常改 API）
- **推荐度**：⚠️ 可选，需防反爬头

---

#### 7. **雪球（Xueqiu）- 社区舆情** ⭐⭐

- **覆盖范围**：用户讨论 + 情绪分析
- **关键数据**：
  - 评论情绪（看多/看空）
  - 话题热度
  - 专业人士评论
- **API 端点**（需伪装 headers）：

  ```
  GET https://stock.xueqiu.com/v5/stock/detail
  ?symbol=SH601988

  GET https://stock.xueqiu.com/v5/stock/comment
  ?symbol=SH601988&count=20
  ```

- **实现难度**：⭐⭐⭐
- **稳定性**：低（爬虫对抗）
- **推荐度**：❌ 不建议（非官方数据，维护成本高）

---

#### 8. **富途牛牛（Futu）- 港美股** ⭐⭐⭐⭐

- **覆盖范围**：港股 + 美股 + 期权
- **关键数据**：
  - 香港上市公司财务
  - 美股行情 + 期权链
  - 实时新闻
- **实现难度**：⭐⭐⭐
- **需要**：企业认证 + SDK 集成
- **推荐度**：⚠️ 针对国际投资者

---

## 🎯 推荐实现路线图

### 🚀 **Phase 1：核心补充（即时可用）**

优先级：**高** | 工作量：**2-3 小时**

1. **新增 `eastmoney-onepager.ts`**

   ```typescript
   // 复用 Tushare 的检测逻辑
   // 添加 EastMoney API 查询
   // 输出格式：补充财务指标（PE、ROE、负债率）

   async function queryEastMoneyBasics(code: string) {
     // 返回：
     // {
     //   peRatio: 12.5,
     //   pbRatio: 1.8,
     //   dividend: "4%",
     //   roe: "18.5%",
     //   debtRatio: "25%"
     // }
   }
   ```

2. **修改 `bot.ts` 集成逻辑**

   ```typescript
   // 在Tushare-LLM fallback 之间插入 EastMoney
   // 序列化优先级：
   // function handleOnePager(company):
   //   1. Tushare(行情) ← 已有
   //   2. EastMoney(财务) ← 新增
   //   3. LLM(分析) ← 已有
   ```

3. **输出格式更新**

   ```markdown
   **公司 One Pager**

   **基本信息**：[Tushare]
   **财务摘要**：[Tushare + EastMoney 补充]
   • PE 倍数：12.5x（行业 15.3x）
   • ROE：18.5%（行业平均 12%)
   • 负债率：25%（安全区间）

   **亮点**：[LLM 分析]
   **风险**：[LLM 警示]
   ```

---

### 📅 **Phase 2：官方数据集成**

优先级：**高** | 工作量：**4-6 小时**

1. **新增 `cninfo-onepager.ts`**

   ```typescript
   // 上市公司公告抓取
   // 获取最新 3-5 条公告摘要
   // 插入 One Pager 的"风险提示"部分

   async function queryCNInfoAnnouncements(code: string, count = 5) {
     // 返回：[ { title, date, url, type: "融资"|"并购"|"分红" } ]
   }
   ```

2. **赋能"风险提示"部分**
   - 自动拉取公告关键词（融资、诉讼、减持）
   - 自动提示近期重大事项

---

### 🌟 **Phase 3：多维度分析（可选）**

优先级：**中** | 工作量：**8-12 小时**

1. **集成新浪财经新闻**

   ```typescript
   // 拉取该公司最近 2 周的热点新闻
   // 情绪分析：利好/利空/中性
   // 展示在"市场关注"部分
   ```

2. **同花顺研报整合**

   ```typescript
   // 拉取最新研报评级
   // 显示买入/持有/减持 比例
   ```

3. **持仓基金展示**
   ```typescript
   // 该股票被哪些热门基金持仓
   // 基金持仓占流通股比例
   ```

---

## 📝 代码框架示例

### 东方财富实现框架

```typescript
// extensions/feishu/src/eastmoney-onepager.ts

import type { FeishuConfig } from "./types.js";

export type EastMoneyConfig = {
  enabled: boolean;
  endpoint: string;
  timeoutMs: number;
};

export type EastMoneyBasics = {
  peRatio?: number;
  pbRatio?: number;
  psRatio?: number;
  roe?: number;
  debtRatio?: number;
  dividendYield?: number;
  industryRank?: string;
};

export async function queryEastMoneyBasics(
  code: string,
  config: EastMoneyConfig,
): Promise<EastMoneyBasics | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    // 转换代码格式：600519 → sh600519
    const emCode = code.startsWith("sh") || code.startsWith("sz") ? code : `sh${code}`;

    const response = await fetch(
      `${config.endpoint}/Securities/api/data?` +
        `namespace=Ths_BasicData&pageIndex=0&pageSize=100&` +
        `sortTypes=1&sortFields=code&code=${emCode}`,
      { signal: controller.signal },
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.result) return null;

    const row = data.result[0];
    return {
      peRatio: row.pe,
      pbRatio: row.pb,
      psRatio: row.ps,
      roe: row.roe,
      debtRatio: row.debtRatio,
      dividendYield: row.div,
      industryRank: row.industryRank,
    };
  } catch (err) {
    console.error("EastMoney query failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function buildEastMoneyMarkdown(basics: EastMoneyBasics): string {
  let md = "### 财务指标\n\n";
  if (basics.peRatio) md += `• PE 倍数：${basics.peRatio.toFixed(1)}x\n`;
  if (basics.pbRatio) md += `• PB 倍数：${basics.pbRatio.toFixed(2)}\n`;
  if (basics.roe) md += `• ROE：${basics.roe.toFixed(1)}%\n`;
  if (basics.debtRatio) md += `• 负债率：${basics.debtRatio.toFixed(1)}%\n`;

  return md;
}

export function resolveEastMoneyConfig(feishuCfg: FeishuConfig): EastMoneyConfig {
  const fromConfig = feishuCfg.eastmoneyOnePager;
  return {
    enabled: fromConfig?.enabled ?? true,
    endpoint: fromConfig?.endpoint ?? "http://datacenter.eastmoney.com",
    timeoutMs: fromConfig?.timeoutMs ?? 8000,
  };
}
```

### 在 bot.ts 中集成

```typescript
// 在 tushare-onepager 检查之后添加

const eastmoneyConfig = resolveEastMoneyConfig(feishuCfg);
if (eastmoneyConfig.enabled && companyQuery) {
  const emBasics = await queryEastMoneyBasics(companyQuery, eastmoneyConfig).catch(() => null);

  if (emBasics) {
    tushareMarkdown += buildEastMoneyMarkdown(emBasics);
  }
}
```

---

## 🧪 测试验证命令

```bash
# 1. 验证 Tushare 连接
node test-tushare-config.mjs

# 2. 验证 EastMoney 端点（未来）
curl -s "http://datacenter.eastmoney.com/Securities/api/data?namespace=Ths_BasicData&code=sh600519&pageSize=1" | jq .

# 3. 验证飞书集成
pnpm test extensions/feishu/src/llm-onepager.test.ts
pnpm test extensions/feishu/src/tushare-onepager.test.ts
```

---

## 📚 类型定义更新

在 `types.ts` 中添加：

```typescript
export type FeishuConfig = {
  // ... 现有配置

  tushareOnePager?: {
    enabled?: boolean;
    token?: string;
    endpoint?: string;
    timeoutMs?: number;
  };

  llmOnePager?: {
    enabled?: boolean;
    systemPrompt?: string;
  };

  // 新增：
  eastmoneyOnePager?: {
    enabled?: boolean;
    endpoint?: string;
    timeoutMs?: number;
  };

  cninfOnePager?: {
    enabled?: boolean;
    endpoint?: string;
    timeoutMs?: number;
  };
};
```

---

## ✅ 实现检查清单

- [ ] Phase 1：EastMoney 集成
  - [ ] `eastmoney-onepager.ts` 核心实现
  - [ ] `eastmoney-onepager.test.ts` 单元测试
  - [ ] 修改 `bot.ts` 集成逻辑
  - [ ] 修改 `types.ts` 配置类型
  - [ ] 飞书中测试： `@机器人 贵州茅台`
- [ ] Phase 2：CNINFO 公告集成
  - [ ] `cninfo-onepager.ts` 实现
  - [ ] 集成到 One Pager 输出中
- [ ] Phase 3：多维度增强（可选）
  - [ ] 新浪财经新闻
  - [ ] 雪球情绪分析
  - [ ] 基金持仓查询

---

## 🔗 参考资源

- [Tushare 官方文档](https://tushare.pro)
- [东方财富数据中心](http://data.eastmoney.com)
- [巨潮资讯查询系统](http://www.cninfo.com.cn)
- [天天基金数据接口](http://funddata.eastmoney.com)

---

**建议优先实现顺序**：

1. **立即**：EastMoney（补充财务数据）
2. **然后**：CNINFO（官方公告）
3. **可选**：新浪财经（新闻热度）
4. **不建议**：雪球（爬虫风险高）

**预期收益**：One Pager 从"实时行情+AI分析"升级到"多维度财报+官方数据+AI分析"。
