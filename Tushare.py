import tushare as ts
import sys
import json

token = '4efa031de812494899f7cd7645fd3122b971c573c15e820406081006'
ts.set_token(token)
pro = ts.pro_api()

def get_onepager(company_name):
    # 1. 查找公司代码
    df = pro.stock_basic(exchange='', list_status='L', fields='ts_code,symbol,name,area,industry,list_date')
    row = df[df['name'] == company_name]
    if row.empty:
        return {'error': '未找到公司'}
    ts_code = row.iloc[0]['ts_code']

    # 2. 获取公司财务摘要
    income = pro.income(ts_code=ts_code, limit=1)
    main_biz = pro.fina_mainbz(ts_code=ts_code, type='1')
    # 3. 拼接结构化摘要
    result = {
        '公司名称': company_name,
        '公司代码': ts_code,
        '主营业务': main_biz['biz_type'].tolist() if not main_biz.empty else '无数据',
        '财务摘要': income[['end_date','revenue','n_income']].to_dict(orient='records') if not income.empty else '无数据'
    }
    return result

if __name__ == '__main__':
    company = sys.argv[1]
    print(json.dumps(get_onepager(company), ensure_ascii=False))
