#!/usr/bin/env node
/**
 * Test Tushare configuration and token validity
 */

import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

async function testTushareConfig() {
  console.log("🔍 Testing Tushare Configuration...\n");

  // 1. Check environment variable
  const envToken = process.env.TUSHARE_TOKEN;
  console.log("1️⃣ Environment Variable:");
  if (envToken) {
    console.log(`   ✅ TUSHARE_TOKEN is set`);
    console.log(`   📝 Value: ${envToken.slice(0, 10)}...${envToken.slice(-10)}`);
  } else {
    console.log(`   ❌ TUSHARE_TOKEN is NOT set`);
  }
  console.log("");

  // 2. Check OpenClaw config
  const configPath = join(homedir(), ".openclaw", "openclaw.json");
  console.log("2️⃣ OpenClaw Config:");
  let configToken = null;
  try {
    const configContent = await readFile(configPath, "utf-8");
    const config = JSON.parse(configContent);

    const tushareConfig = config.channels?.feishu?.tushareOnePager;
    if (tushareConfig) {
      console.log(`   ✅ tushareOnePager config found`);
      console.log(`   📝 Enabled: ${tushareConfig.enabled}`);
      configToken = tushareConfig.token;
      if (configToken && configToken.startsWith("${")) {
        console.log(`   📝 Token: (using env variable placeholder)`);
      } else if (configToken) {
        console.log(`   📝 Token: ${configToken.slice(0, 10)}...${configToken.slice(-10)}`);
      } else {
        console.log(`   📝 Token: NOT set`);
      }
      console.log(`   📝 Endpoint: ${tushareConfig.endpoint || "https://api.tushare.pro"}`);
    } else {
      console.log(`   ❌ tushareOnePager config NOT found`);
    }
  } catch (err) {
    console.log(`   ❌ Failed to read config: ${err.message}`);
  }
  console.log("");

  // 3. Test API connection
  const token = configToken?.startsWith("${") ? envToken : configToken || envToken || "";
  if (!token) {
    console.log("3️⃣ API Connection Test:");
    console.log(`   ⚠️  Skipped - no token available\n`);
    return;
  }

  console.log("3️⃣ API Connection Test:");
  try {
    const response = await fetch("https://api.tushare.pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_name: "stock_basic",
        token: token,
        params: { list_status: "L" },
        fields: "ts_code,name",
      }),
    });

    const data = await response.json();

    if (data.code === 0) {
      const stockCount = data.data?.items?.length || 0;
      console.log(`   ✅ API connection successful!`);
      console.log(`   📊 Retrieved ${stockCount} stocks`);
      if (stockCount > 0) {
        console.log(`   📝 Sample: ${data.data.items[0][1]} (${data.data.items[0][0]})`);
      }
    } else {
      console.log(`   ❌ API returned error`);
      console.log(`   📝 Code: ${data.code}`);
      console.log(`   📝 Message: ${data.msg}`);

      if (data.code === 40203) {
        console.log(`\n   ⚠️  Permission Error (40203):`);
        console.log(`   💡 Your token lacks permission for 'stock_basic' API`);
        console.log(`   💡 Visit https://tushare.pro to activate free API permissions`);
        console.log(`   💡 Or consider upgrading your account`);
      }
    }
  } catch (err) {
    console.log(`   ❌ API test failed: ${err.message}`);
  }
  console.log("");

  console.log("✨ Test Complete!\n");
  console.log("📚 Next Steps:");
  console.log("   1. Restart OpenClaw gateway: openclaw gateway restart");
  console.log("   2. Test in Feishu: @机器人 贵州茅台");
  console.log("");
}

testTushareConfig().catch(console.error);
