# 飞书机器人财报 MCP 服务器 - 完整配置指南

## ✅ 已完成的配置

### 1. 飞书机器人已接入

- ✅ 飞书插件已安装并启用
- ✅ App ID 和 App Secret 已配置
- ✅ Webhook 连接模式已配置
- ✅ 网关正在运行在端口 18789

### 2. Tushare 财报 MCP 已配置

- ✅ Tushare Token 已配置：`4efa031de8...0406081006`
- ✅ Tushare API 连接测试成功（已检索 5485 只股票）
- ✅ tushareOnePager 功能已启用
- ✅ LLM OnePager 作为 fallback 已配置

### 3. 代码集成已完成

- ✅ 在 `bot.ts` 中已添加 Tushare One Pager 导入
- ✅ 添加了智能 fallback 逻辑：
  - 优先使用 Tushare 实时数据
  - 失败时自动切换到 AI 分析

---

## 📋 配置文件 (~/.openclaw/openclaw.json)

已添加的配置：

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_a92ae32d47b8de1a",
      "appSecret": "jyQkPGCvfJMsIb4xpZVaQdsIHwTlPgTg",
      "domain": "lark",
      "connectionMode": "webhook",

      "tushareOnePager": {
        "enabled": true,
        "token": "4efa031de812494899f7cd7645fd3122b971c573c15e820406081006",
        "endpoint": "https://api.tushare.pro",
        "timeoutMs": 10000
      },

      "llmOnePager": {
        "enabled": true,
        "systemPrompt": "你是一位专业的投资分析师..."
      }
    }
  }
}
```

---

## 🚀 使用方法

### 在飞书私聊中

直接发送公司名称：

```
贵州茅台
中国平安
平安银行
```

### 在飞书群聊中

需要 @ 机器人：

```
@机器人 贵州茅台
@机器人 onepager 中国平安
@机器人 一页纸 阿里巴巴
```

### 智能 Fallback 机制

1. **首选：Tushare 实时数据**
   - 如果 Tushare 可用，返回包含最新行情的结构化报告
   - 包含：基本信息、最新行情、近期走势、观察要点

2. **备选：AI 知识库分析**
   - 如果 Tushare 失败或公司未找到，自动切换到 AI 分析
   - 包含：业务摘要、财务分析、投资亮点、风险提示

---

## 📊 生成的 Tushare 报告格式

```markdown
# 贵州茅台 One Pager

## 基本信息

- 股票代码：600519.SH
- 公司名称：贵州茅台
- 所属行业：白酒
- 上市日期：2001-08-27

## 最新行情

- 交易日期：2026-02-26
- 开盘价：1,580.00
- 收盘价：1,595.50
- 涨跌幅：+1.25%
- 成交量：125.8 万股

## 近期走势（最近5日）

| 日期 | 开盘 | 收盘 | 涨跌幅 | 成交量 |
| ---- | ---- | ---- | ------ | ------ |
| ...  | ...  | ...  | ...    | ...    |

## 观察要点

- 已上市 25 年，市场经验较为成熟
- 所属行业：白酒

## 风险提示

- 请关注市场波动风险
- 本报告仅供参考，不构成投资建议
```

---

## 🔧 部署代码更改（重要）

**当前状态：** 代码已修改但尚未编译部署

### 方法 1：使用预编译版本（推荐生产环境）

```bash
# 1. 安装依赖（如果还没有）
cd C:\Users\Tim\Documents\GitHub\openclaw
pnpm install

# 2. 构建项目（需要 WSL 或 Git Bash）
# Windows 上可能需要先安装 Git for Windows
pnpm build

# 3. 重启网关
pnpm openclaw gateway restart
```

### 方法 2：使用开发模式（推荐开发/测试）

由于 Windows 上构建脚本需要 bash，可以使用开发模式直接运行 TypeScript：

```bash
# 停止当前网关
pnpm openclaw gateway stop

# 强制清理端口
Get-NetTCPConnection -LocalPort 18789 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# 使用开发模式启动（自动使用 tsx 运行 TS）
pnpm dev gateway run --port 18789 --bind loopback
```

### 方法 3：安装 Git Bash（Windows 推荐）

```bash
# 1. 安装 Git for Windows
# 下载：https://git-scm.com/download/win

# 2. 使用 Git Bash 运行构建
# 在 Git Bash 中：
cd /c/Users/Tim/Documents/GitHub/openclaw
pnpm build
pnpm openclaw gateway restart
```

---

## 🧪 测试 Tushare 配置

使用提供的测试脚本：

```bash
cd C:\Users\Tim\Documents\GitHub\openclaw
node test-tushare-config.mjs
```

预期输出：

```
✅ API connection successful!
📊 Retrieved 5485 stocks
📝 Sample: 平安银行 (000001.SZ)
```

---

## 📝 完整功能对比

| 功能         | Tushare One Pager | LLM One Pager  |
| ------------ | ----------------- | -------------- |
| **数据来源** | Tushare API       | AI 知识库      |
| **实时行情** | ✅ 是             | ❌ 否          |
| **历史数据** | ✅ 近30天         | ❌ 否          |
| **业务分析** | ❌ 基础           | ✅ 深度        |
| **财务摘要** | ⚠️ 行情数据       | ✅ 全面        |
| **投资亮点** | ⚠️ 简单推断       | ✅ 深度分析    |
| **风险提示** | ⚠️ 通用提示       | ✅ 针对性强    |
| **配置要求** | Token + 权限      | 无             |
| **响应速度** | 快（直接API）     | 中等（AI生成） |
| **适用场景** | 实时行情跟踪      | 公司研究分析   |

---

## ⚠️ 故障排查

### 问题 1：Tushare 返回权限错误（40203）

**原因：** Token 缺少 `stock_basic` 或 `daily` 接口权限

**解决方法：**

1. 访问 https://tushare.pro
2. 登录账户
3. 进入 "权限管理"
4. 申请免费权限：`stock_basic`、`daily`
5. 等待 1-2 小时权限生效

### 问题 2：机器人没有响应

**检查清单：**

- ✅ 网关是否运行：`pnpm openclaw gateway status`
- ✅ 飞书 Webhook 是否配置正确
- ✅ 在群聊中是否 @ 了机器人
- ✅ 公司名称是否准确（2-24字符）

### 问题 3：找不到公司

**可能原因：**

- 公司名称拼写错误
- 公司未上市或已退市
- 使用了英文名或简称

**建议：**

- 使用完整的中文公司名
- 尝试使用股票简称
- 查询 Tushare 官网确认公司名称

### 问题 4：代码未生效

**当前状态：** 代码已修改但可能未编译部署

**解决方法：** 参见上文"部署代码更改"部分

---

## 📚 相关文档

- [飞书机器人完整文档](c:/Users/Tim/Documents/GitHub/openclaw/docs/channels/feishu.md)
- [LLM One Pager 使用指南](c:/Users/Tim/Documents/GitHub/openclaw/extensions/feishu/LLM-ONEPAGER-GUIDE.md)
- [Tushare 配置指南](c:/Users/Tim/Documents/GitHub/openclaw/extensions/feishu/TUSHARE_SETUP.md)
- [迁移指南](c:/Users/Tim/Documents/GitHub/openclaw/extensions/feishu/MIGRATE-FROM-TUSHARE.md)

---

## 🎯 下一步

1. **编译并部署代码**（重要）
   - 使用 Git Bash 或 WSL 运行 `pnpm build`
   - 或使用开发模式 `pnpm dev gateway run`

2. **重启网关**

   ```bash
   pnpm openclaw gateway restart
   ```

3. **在飞书中测试**

   ```
   @机器人 贵州茅台
   ```

4. **查看日志**（如果有问题）
   ```bash
   pnpm openclaw logs --follow
   ```

---

**配置完成时间：** 2026年2月27日  
**版本：** OpenClaw 2026.2.26  
**集成功能：** Tushare MCP + LLM Fallback
