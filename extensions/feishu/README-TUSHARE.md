# Tushare 集成 - 快速参考

## ⚡ 推荐方案：使用 LLM One Pager（无需 Token）

**遇到 Tushare 权限问题？** 我们推荐使用新的 **LLM One Pager** 功能：

✅ **无需外部 API**：不需要 Tushare Token  
✅ **开箱即用**：默认启用，零配置  
✅ **更全面的分析**：业务、财务、亮点、风险一应俱全

### 快速开始

在飞书中直接使用：

```
@机器人 贵州茅台
@机器人 中国平安
```

📖 **详细指南**：[LLM-ONEPAGER-GUIDE.md](./LLM-ONEPAGER-GUIDE.md)  
🔄 **迁移指南**：[MIGRATE-FROM-TUSHARE.md](./MIGRATE-FROM-TUSHARE.md)

---

## Tushare 权限问题（仅供参考）

如果您仍想使用 Tushare，以下是权限问题的解决方案。

### 问题现象

```
未能生成 One Pager：Tushare 查询失败：Error: Tushare Token 权限不足或已过期（错误码 40203）。
建议：
1. 访问 https://tushare.pro 确认账户是否仍有有效权限
2. 检查是否需要升级为付费版以获得 stock_basic 和 daily 接口权限
3. 重新生成 Token 并更新环境变量 TUSHARE_TOKEN
```

### 问题根因

您的 Tushare Token (`4efa031de812494899f7cd7645fd3122b971c573c15e820406081006`) 缺少对 `stock_basic` 和 `daily` 接口的访问权限。

## 3 步快速修复

### 1️⃣ 访问 Tushare 官网

打开 https://tushare.pro，登录您的账户。

### 2️⃣ 激活免费接口权限

1. 进入 **账户设置** → **权限管理**
2. 找到 `stock_basic` 和 `daily` 接口
3. 点击 **申请免费权限**
4. ⏱️ **等待 1-2 小时** 权限生效

### 3️⃣ 更新 Token（可选）

如果权限激活后仍不工作：

1. 在 Tushare 官网生成新 Token
2. 更新环境变量或配置文件

```bash
# 设置新 Token
export TUSHARE_TOKEN="new-token-here"

# 验证修复
node test-tushare-token.mjs "new-token-here"
```

## 文件参考

### LLM One Pager（推荐）

- 📖 **[LLM-ONEPAGER-GUIDE.md](./LLM-ONEPAGER-GUIDE.md)** - 完整使用指南
- 🔄 **[MIGRATE-FROM-TUSHARE.md](./MIGRATE-FROM-TUSHARE.md)** - 迁移指南

### Tushare（可选）

- 📄 **[TUSHARE_SETUP.md](./TUSHARE_SETUP.md)** - 完整配置指南
- 📄 **[TUSHARE_DIAGNOSIS.md](./TUSHARE_DIAGNOSIS.md)** - 诊断和故障排查
- 🧪 **[test-tushare-token.mjs](./test-tushare-token.mjs)** - Token 验证工具

## ✨ 修复后的用法

编辑完成后，在飞书中使用以下格式查询：

```
@机器人 贵州茅台      ← 精确公司名称
@机器人 中国平安      ← 标准股票简称
@机器人 onepager 平安银行  ← 带 onepager 前缀
```

机器人将生成包含以下内容的 One Pager：

- ✓ 基本信息（代码、行业、上市日期）
- ✓ 最新行情（开盘、收盘、涨跌幅等）
- ✓ 近期走势（5-20 天的行情）
- ✓ 观察要点和风险提示

---

**更新时间**: 2026年2月27日
**改进**: 增强了错误诊断提示，提供更清晰的权限问题指导
