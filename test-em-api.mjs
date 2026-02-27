// 测试 EastMoney API
async function testEastMoneyAPI() {
  const companyName = "贵州茅台";
  
  // 测试 1: SecuritiesSearch/api/data
  console.log("Testing API 1: SecuritiesSearch/api/data");
  try {
    const response = await fetch(
      `http://datacenter.eastmoney.com/SecuritiesSearch/api/data?type=stock&query=${encodeURIComponent(companyName)}&pageIndex=0&pageSize=5`
    );
    const data = await response.json();
    console.log("Result 1:", JSON.stringify(data, null, 2).slice(0, 500));
  } catch (err) {
    console.log("Error 1:", err.message);
  }
  
  // 测试 2: 直接使用代码
  console.log("\nTesting API 2: Direct code lookup");
  try {
    const response = await fetch(
      `http://datacenter.eastmoney.com/Securities/api/data?namespace=Ths_BasicData&pageIndex=0&pageSize=100&sortTypes=1&sortFields=code&code=sh600519`
    );
    const data = await response.json();
    console.log("Result 2:", JSON.stringify(data, null, 2).slice(0, 500));
  } catch (err) {
    console.log("Error 2:", err.message);
  }

  // 测试 3: 使用新浪财经接口
  console.log("\nTesting API 3: sina.com.cn");
  try {
    const response = await fetch(
      `http://hq.sinajs.cn/?list=sh600519`
    );
    const data = await response.text();
    console.log("Result 3:", data.slice(0, 300));
  } catch (err) {
    console.log("Error 3:", err.message);
  }

  // 测试 4: 网易行情接口
  console.log("\nTesting API 4: 163.com");
  try {
    const response = await fetch(
      `http://quotes.money.163.com/service/chddata.html?code=0600519&start=20260101&end=20260228`
    );
    const data = await response.text();
    console.log("Result 4:", data.slice(0, 300));
  } catch (err) {
    console.log("Error 4:", err.message);
  }
}

testEastMoneyAPI().catch(console.error);
