#!/usr/bin/env python3
"""Fetch daily BTC/USD history and write a compact JSON file.
Uses Yahoo Finance first (no key), then CoinGecko when COINGECKO_API_KEY exists.
"""
from __future__ import annotations
import datetime as dt, json, os, time, urllib.parse, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data'/'bitcoin.json'
START=int(dt.datetime(2010,7,17,tzinfo=dt.timezone.utc).timestamp())
END=int(time.time())
UA={'User-Agent':'bitcoin-rainbow-live/1.0'}

def get_json(url,headers=None):
    req=urllib.request.Request(url,headers={**UA,**(headers or {})})
    with urllib.request.urlopen(req,timeout=40) as r:return json.load(r)

def yahoo():
    q=urllib.parse.urlencode({'period1':START,'period2':END,'interval':'1d','events':'history'})
    data=get_json('https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?'+q)
    result=data['chart']['result'][0];ts=result['timestamp'];close=result['indicators']['quote'][0]['close']
    return [{'date':dt.datetime.fromtimestamp(t,dt.timezone.utc).date().isoformat(),'price':round(float(p),4)} for t,p in zip(ts,close) if p]

def coingecko():
    key=os.getenv('COINGECKO_API_KEY','').strip()
    if not key: raise RuntimeError('COINGECKO_API_KEY not configured')
    url=f'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from={START}&to={END}'
    data=get_json(url,{'x-cg-demo-api-key':key})
    by_day={}
    for ms,p in data['prices']:
        day=dt.datetime.fromtimestamp(ms/1000,dt.timezone.utc).date().isoformat();by_day[day]=round(float(p),4)
    return [{'date':d,'price':p} for d,p in sorted(by_day.items())]

def main():
    errors=[]
    for name,fn in [('Yahoo Finance',yahoo),('CoinGecko',coingecko)]:
        try:
            prices=fn()
            if len(prices)<1000: raise RuntimeError(f'only {len(prices)} rows')
            payload={'source':name,'updated_at':dt.datetime.now(dt.timezone.utc).isoformat(),'prices':prices}
            OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(payload,separators=(',',':')),encoding='utf-8')
            print(f'wrote {len(prices)} rows from {name}');return
        except Exception as e:errors.append(f'{name}: {e}')
    raise SystemExit('All providers failed: '+' | '.join(errors))
if __name__=='__main__':main()
