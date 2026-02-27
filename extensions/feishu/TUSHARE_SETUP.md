# Tushare One Pager 权限配置指南

## 问题描述

当使用飞书机器人查询上市公司信息时出现错误：

```
抱歉，您没有接口访问权限，权限的具体详情访问：https://tushare.pro/document/1?doc_id=108
```

错误码：`40203` - Token 权限不足或已过期

## 根本原因

Tushare 是中国A股数据提供商，两种常见原因导致此错误：

### 1. **免费版本权限限制**

- 免费版本默认不提供 `stock_basic` 和 `daily` 接口的访问权限
- 需要在 Tushare 官网激活这些接口的免费权限

### 2. **Token 已过期或权限已禁用**

- Token 的权限可能已在 Tushare 官网被禁用
- 账户权限配置可能已过期

## 解决步骤

### 步骤 1：访问 Tushare 官网并检查账户权限

1. 访问 https://tushare.pro
2. 使用您的账户登录
3. 进入 "账户设置" 或 "权限管理" 页面
4. 确认以下接口是否已激活：
   - ✅ `stock_basic` - 股票基本信息接口
   - ✅ `daily` - 股票日线数据接口

### 步骤 2：激活免费权限（如果尚未激活）

1. 在 Tushare 官网找到 **权限管理** 或 **接口权限** 页面
2. 如果看到 "免费权限申请" 选项，点击激活：
   - 申请 `stock_basic` 接口权限
   - 申请 `daily` 接口权限
3. 权限可能需要数分钟至数小时才能生效

### 步骤 3：重新生成或确认 Token

1. 在 Tushare 官网生成新的 API Token
2. 复制新 Token（通常是一个长字符串）

### 步骤 4：更新 OpenClaw 配置

#### 方式 A：通过环境变量（推荐用于开发）

```bash
# Linux/macOS
export TUSHARE_TOKEN="your-token-here"

# Windows PowerShell
$env:TUSHARE_TOKEN = "your-token-here"
```

#### 方式 B：通过飞书频道配置（生产环境）

在 `channels.feishu.tushareOnePager` 配置中设置：

```json
{
  "feishu": {
    "tushareOnePager": {
      "enabled": true,
      "token": "your-token-here",
      "endpoint": "https://api.tushare.pro",
      "timeoutMs": 10000
    }
  }
}
```

### 步骤 5：测试连接

使用 PowerShell 或 curl 测试 Token 是否有效：

```powershell
# PowerShell 测试
$body = @{
    api_name = "stock_basic"
    token = "your-token-here"
    params = @{}
    fields = "ts_code,name"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.tushare.pro" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body | ConvertTo-Json
```

预期响应应该包含股票列表数据，而不是权限错误。

## 使用方式

配置完成后，在飞书中使用以下格式查询：

```
@机器人 贵州茅台
```

或

```
@机器人 onepager 中国平安
```

机器人将生成包含以下信息的 One Pager：

- 基本信息（行业、上市日期等）
- 最新行情（开盘价、收盘价、涨跌幅等）
- 近期走势（最近5个交易日）
- 观察要点和风险提示

## 常见问题

### Q: 我已激活权限，但仍然收到权限错误？

A:

1. 权限激活可能需要 1-2 小时才能生效
2. 在 Tushare 官网重新生成新的 Token
3. 使用新 Token 更新环境变量或配置

### Q: Tushare 支持境外用户吗？

A: Tushare 主要面向中国大陆用户，如果您在中国境外，可能需要使用 VPN 或代理访问。

### Q: 免费版本有哪些限制？

A:

- 免费版本数据延迟（通常延迟 15 分钟）
- 部分高级接口需要付费会员才能使用（如财报数据、新闻等）
- 但基础的 `stock_basic` 和 `daily` 接口应该在免费版中可用

### Q: 如何升级为付费会员以获得更多数据？

A: 访问 https://tushare.pro 的会员页面，了解各套餐详情。

## 参考文档

- Tushare 官网：https://tushare.pro
- 权限相关文档：https://tushare.pro/document/1?doc_id=108
- API 文档：https://tushare.pro/document/2
