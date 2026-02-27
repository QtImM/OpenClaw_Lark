# 从 Tushare 迁移到 LLM One Pager

## 为什么迁移？

如果您遇到以下问题，建议迁移到 LLM One Pager：

- ❌ Tushare 免费版权限不足（错误码 40203）
- ❌ 无法访问 `stock_basic` 或 `daily` 接口
- ❌ 不想升级到 Tushare 付费版
- ✅ 需要更全面的公司分析（业务、亮点、风险）

## LLM One Pager 优势

1. **无需外部 API**：不需要 Tushare Token
2. **开箱即用**：默认启用，零配置
3. **更全面的分析**：包含业务摘要、财务分析、投资亮点、风险提示
4. **灵活定制**：可自定义分析风格和提示词

## 迁移步骤

### 步骤 1：禁用 Tushare（可选）

如果您不再需要 Tushare，可以禁用它：

```yaml
channels:
  feishu:
    tushareOnePager:
      enabled: false
```

### 步骤 2：启用 LLM One Pager（默认已启用）

LLM One Pager 默认启用，无需配置。

如果您之前禁用过，可以显式启用：

```yaml
channels:
  feishu:
    llmOnePager:
      enabled: true
```

### 步骤 3：测试新功能

在飞书中测试：

```
@机器人 贵州茅台
```

您应该会收到一份完整的 One Pager 报告。

## 配置对比

### Tushare 配置（旧）

```yaml
channels:
  feishu:
    tushareOnePager:
      enabled: true
      token: "your-tushare-token"
      endpoint: "https://api.tushare.pro"
      timeoutMs: 10000
```

### LLM 配置（新）

```yaml
channels:
  feishu:
    llmOnePager:
      enabled: true # 默认值，可省略
      systemPrompt: "自定义提示词" # 可选
```

## 功能对比

| 特性         | Tushare       | LLM One Pager |
| ------------ | ------------- | ------------- |
| **数据来源** | Tushare API   | AI 知识库     |
| **配置要求** | Token + 权限  | 无            |
| **实时行情** | ✅            | ❌            |
| **业务分析** | ❌            | ✅            |
| **财务摘要** | ⚠️ 仅基础指标 | ✅ 全面分析   |
| **投资亮点** | ⚠️ 简单推断   | ✅ 深度分析   |
| **风险提示** | ⚠️ 简单推断   | ✅ 全面评估   |
| **响应速度** | 快            | 中等          |
| **成本**     | 免费版有限    | 免费          |

## 使用场景建议

### 适合使用 LLM One Pager

- ✅ 公司研究和尽职调查
- ✅ 投资想法生成
- ✅ 行业对比分析
- ✅ 风险评估
- ✅ 不需要实时行情

### 仍建议使用 Tushare

- ✅ 日内交易和短线操作
- ✅ 需要实时行情数据
- ✅ 技术分析和图表
- ✅ 已有 Tushare 付费会员

## 常见问题

### Q: 我可以同时使用两者吗？

A: 可以！您可以同时启用 Tushare 和 LLM One Pager：

```yaml
channels:
  feishu:
    tushareOnePager:
      enabled: true # 用于实时行情
    llmOnePager:
      enabled: true # 用于深度分析
```

**注意**：当前实现只会使用 LLM One Pager。如果需要同时支持，需要自定义触发词。

### Q: LLM One Pager 的数据有多新？

A: 数据基于 AI 的训练知识库，通常比实时数据延迟几个月。不适合需要最新财报的场景。

### Q: 如何获得更准确的数据？

A: 建议：

1. 使用 LLM One Pager 进行初步研究
2. 前往公司官网或交易所查看最新财报
3. 使用专业金融终端（如 Wind、Bloomberg）

### Q: 迁移后原来的 Tushare Token 怎么办？

A: 保留即可，或从配置中删除：

```yaml
channels:
  feishu:
    # 删除或注释掉
    # tushareOnePager:
    #   token: "..."
```

### Q: 我遇到权限错误（40203），迁移后会解决吗？

A: 是的！LLM One Pager 不使用 Tushare API，完全避免权限问题。

### Q: LLM One Pager 支持哪些公司？

A: 优先支持：

- ✅ A 股主要上市公司
- ✅ 知名港股、美股公司
- ✅ 行业龙头企业

小型或新上市公司可能信息有限。

## 回退方案

如果您不满意 LLM One Pager，可以随时回退到 Tushare：

1. 禁用 LLM：

   ```yaml
   channels:
     feishu:
       llmOnePager:
         enabled: false
   ```

2. 启用 Tushare：

   ```yaml
   channels:
     feishu:
       tushareOnePager:
         enabled: true
         token: "your-token"
   ```

3. 重启 OpenClaw 网关

## 进一步帮助

- 📖 [LLM One Pager 使用指南](./LLM-ONEPAGER-GUIDE.md)
- 📖 [Tushare 配置指南](./TUSHARE_SETUP.md)（如需继续使用）
- 🐛 [问题反馈](https://github.com/openclaw/openclaw/issues)

---

**迁移完成？** 开始体验更智能的公司分析！🚀
