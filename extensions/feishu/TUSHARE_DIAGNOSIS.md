# Tushare Token 权限诊断报告

## ⚠️ 诊断结果

**状态：❌ Token 权限不足**

您的 Tushare Token (`4efa031de812494899f7cd7645fd3122b971c573c15e820406081006`) 存在权限问题：

- **错误码**: `40203`
- **错误信息**: 抱歉，您没有接口访问权限
- **受影响的接口**: `stock_basic` 和 `daily`

## 🔍 问题分析

根据诊断，您的 Token 虽然本身有效，但**缺少对关键 API 接口的访问权限**。Tushare 的权限管理机制要求用户在官网明确激活各个接口的使用权限。

### 可能的原因

1. **未激活免费权限** ← 最可能
   - Tushare 免费版默认关闭所有接口权限
   - 需要在官网主动申请并激活免费权限

2. **权限已过期或被禁用**
   - 如果长期未使用，权限可能被系统自动禁用
   - 或者账户因其他原因被限制

3. **账户状态异常**
   - 账户可能被风控或其他安全措施限制

## ✅ 解决方案

### 方案 A：激活免费权限（推荐）

#### 第 1 步：登录 Tushare 官网

访问 https://tushare.pro，使用您的账户登录。

#### 第 2 步：进入权限管理页面

1. 找到 **个人中心** 或 **账户设置** 菜单
2. 进入 **权限管理** 或 **接口权限** 页面
3. 查看以下两个接口的状态：
   - `stock_basic` - 股票基本信息接口
   - `daily` - 股票日线数据接口

#### 第 3 步：激活权限

如果看到"申请免费权限"按钮：

1. 点击 `stock_basic` 的"申请"按钮
2. 点击 `daily` 的"申请"按钮
3. 填写任何必需的申请表格（通常只需确认）
4. 提交申请

**重要：权限激活通常需要 1-2 小时才能生效。**

#### 第 4 步：重新生成 Token（可选但推荐）

1. 在权限管理页面找到 **API Token** 或 **Developer Token** 部分
2. 删除旧 Token
3. 点击"生成新 Token"
4. 复制新生成的 Token

#### 第 5 步：更新 OpenClaw 配置

将新 Token 设置为环境变量：

**Linux/macOS:**

```bash
export TUSHARE_TOKEN="your-new-token-here"
```

**Windows PowerShell:**

```powershell
$env:TUSHARE_TOKEN = "your-new-token-here"
```

### 方案 B：如果免费权限已被激活

如果您已确认权限已在 Tushare 官网激活，但仍收到权限错误，请：

1. **清除缓存并重试**
   - 重启 OpenClaw 应用
   - 等待 5-10 分钟后重试

2. **重新生成 Token**
   - 在 Tushare 官网生成全新的 Token（删除旧的）
   - 更新 OpenClaw 配置

3. **检查 IP 限制**
   - 某些 Tushare 账户可能有 IP 白名单限制
   - 如遇网络变化（如切换 WiFi），可能需要更新白名单

## 🧪 验证修复

完成上述步骤后，运行以下命令验证 Token 是否已修复：

```bash
# 方式 1：使用测试脚本（Linux/macOS）
node test-tushare-token.mjs "your-new-token-here"

# 方式 2：手动测试（任何平台）
curl -X POST https://api.tushare.pro \
  -H "Content-Type: application/json" \
  -d '{
    "api_name": "stock_basic",
    "token": "your-new-token-here",
    "params": {},
    "fields": "ts_code,name"
  }' | jq '.code'
```

如果返回 `"code": 0`，则权限已修复。

## 📝 Reference Docs

- Tushare 官网：https://tushare.pro
- 权限相关文档：https://tushare.pro/document/1?doc_id=108
- API 完整文档：https://tushare.pro/document/2

## 💬 获取帮助

如果按照以上步骤操作仍未解决问题，请：

1. 在 Tushare 官网提交工单或联系客服
2. 确保：
   - Token 已正确复制（无空格或特殊字符）
   - 权限确实已激活（不要假设）
   - 已等待足够的时间（至少 2 小时）进行权限生效
3. 如需 OpenClaw 侧的协助，请提供：
   - 错误信息的完整截图
   - Token 的前 8 个字符（用于日志查询）
   - Tushare 官网上的权限管理页面截图

---

**生成时间**: 2026年2月27日
