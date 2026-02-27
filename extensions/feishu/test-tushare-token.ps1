#!/usr/bin/env pwsh

<#
.SYNOPSIS
Test Tushare API token validity and permissions

.PARAMETER Token
The Tushare API token to test

.EXAMPLE
./test-tushare-token.ps1 -Token "your-token-here"
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$Token = $env:TUSHARE_TOKEN
)

if (-not $Token) {
    Write-Host "❌ 错误：未提供 Token。请使用以下方式之一：" -ForegroundColor Red
    Write-Host "  1. 设置环境变量：`$env:TUSHARE_TOKEN = 'your-token'"
    Write-Host "  2. 传参：./test-tushare-token.ps1 -Token 'your-token'"
    exit 1
}

Write-Host "🔍 正在测试 Tushare Token 连接..." -ForegroundColor Cyan
Write-Host "Token: $($Token.Substring(0, 8))..." -ForegroundColor Gray

# Test stock_basic API
Write-Host ""
Write-Host "📊 测试 1: stock_basic 接口" -ForegroundColor Yellow

try {
    $body = @{
        api_name = "stock_basic"
        token = $Token
        params = @{}
        fields = "ts_code,name"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "https://api.tushare.pro" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 10

    if ($response.code -eq 0) {
        Write-Host "✅ stock_basic 接口正常" -ForegroundColor Green
        $itemCount = $response.data.items.Count
        Write-Host "   返回 $itemCount 条股票数据" -ForegroundColor Green
    } else {
        Write-Host "❌ stock_basic 接口错误 (code: $($response.code))" -ForegroundColor Red
        Write-Host "   错误信息: $($response.msg)" -ForegroundColor Red
        
        if ($response.code -eq 40203) {
            Write-Host ""
            Write-Host "💡 这是权限错误。解决步骤：" -ForegroundColor Yellow
            Write-Host "   1. 访问 https://tushare.pro 并登录您的账户"
            Write-Host "   2. 进入权限管理页面，激活 stock_basic 和 daily 接口的免费权限"
            Write-Host "   3. 权限激活可能需要 1-2 小时"
            Write-Host "   4. 如果仍未解决，重新生成 Token 后再试"
        }
        exit 1
    }
}
catch {
    Write-Host "❌ 网络错误或连接超时" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test daily API with a sample stock code
Write-Host ""
Write-Host "📈 测试 2: daily 接口" -ForegroundColor Yellow

try {
    $today = Get-Date
    $endDate = $today.ToString("yyyyMMdd")
    $startDate = $today.AddDays(-30).ToString("yyyyMMdd")

    $body = @{
        api_name = "daily"
        token = $Token
        params = @{
            ts_code = "000001.SZ"  # 平安银行的例子
            start_date = $startDate
            end_date = $endDate
        }
        fields = "trade_date,close,pct_chg"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "https://api.tushare.pro" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 10

    if ($response.code -eq 0) {
        Write-Host "✅ daily 接口正常" -ForegroundColor Green
        $itemCount = $response.data.items.Count
        Write-Host "   返回 $itemCount 条日线数据" -ForegroundColor Green
    } else {
        Write-Host "❌ daily 接口错误 (code: $($response.code))" -ForegroundColor Red
        Write-Host "   错误信息: $($response.msg)" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ 网络错误或连接超时" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✨ 所有测试通过！Token 配置正确。" -ForegroundColor Green
Write-Host ""
Write-Host "现在可以在飞书中使用以下格式查询上市公司：" -ForegroundColor Cyan
Write-Host "  @机器人 贵州茅台" -ForegroundColor Gray
Write-Host "  @机器人 中国平安" -ForegroundColor Gray
