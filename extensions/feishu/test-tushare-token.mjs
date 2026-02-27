#!/usr/bin/env node
/**
 * Test Tushare API token validity and permissions
 * Usage: node test-tushare-token.mjs [token]
 */

const token = process.argv[2] || process.env.TUSHARE_TOKEN;

if (!token) {
  console.error("❌ 错误：未提供 Token。请使用以下方式之一：");
  console.error("  1. 设置环境变量：export TUSHARE_TOKEN='your-token'");
  console.error("  2. 传参：node test-tushare-token.mjs 'your-token'");
  process.exit(1);
}

console.log("🔍 正在测试 Tushare Token 连接...");
console.log(`Token: ${token.substring(0, 8)}...\n`);

async function testAPI(apiName, params, fields) {
  try {
    const response = await fetch("https://api.tushare.pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_name: apiName,
        token,
        params,
        fields: fields.join(","),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    throw new Error(`网络错误: ${err.message}`);
  }
}

async function main() {
  // Test 1: stock_basic API
  console.log("📊 测试 1: stock_basic 接口");
  try {
    const result1 = await testAPI("stock_basic", {}, ["ts_code", "name"]);

    if (result1.code === 0) {
      const itemCount = result1.data?.items?.length || 0;
      console.log(`✅ stock_basic 接口正常（返回 ${itemCount} 条股票数据）\n`);
    } else {
      console.log(`❌ stock_basic 接口错误 (code: ${result1.code})`);
      console.log(`   错误信息: ${result1.msg}\n`);

      if (result1.code === 40203) {
        console.log("💡 这是权限错误。解决步骤：");
        console.log("   1. 访问 https://tushare.pro 并登录您的账户");
        console.log("   2. 进入权限管理页面，激活 stock_basic 和 daily 接口的免费权限");
        console.log("   3. 权限激活可能需要 1-2 小时");
        console.log("   4. 如果仍未解决，重新生成 Token 后再试\n");
      }
      process.exit(1);
    }
  } catch (err) {
    console.log(`❌ 测试失败: ${err.message}\n`);
    process.exit(1);
  }

  // Test 2: daily API
  console.log("📈 测试 2: daily 接口");
  try {
    const today = new Date();
    const endDate = today.toISOString().slice(0, 10).replace(/-/g, "");
    const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const result2 = await testAPI(
      "daily",
      {
        ts_code: "000001.SZ", // 平安银行
        start_date: startDate,
        end_date: endDate,
      },
      ["trade_date", "close", "pct_chg"],
    );

    if (result2.code === 0) {
      const itemCount = result2.data?.items?.length || 0;
      console.log(`✅ daily 接口正常（返回 ${itemCount} 条日线数据）\n`);
    } else {
      console.log(`❌ daily 接口错误 (code: ${result2.code})`);
      console.log(`   错误信息: ${result2.msg}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.log(`❌ 测试失败: ${err.message}\n`);
    process.exit(1);
  }

  // Success
  console.log("✨ 所有测试通过！Token 配置正确。\n");
  console.log("现在可以在飞书中使用以下格式查询上市公司：");
  console.log("  @机器人 贵州茅台");
  console.log("  @机器人 中国平安\n");
}

main().catch((err) => {
  console.error(`❌ 意外错误: ${err.message}`);
  process.exit(1);
});
