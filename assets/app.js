const MODEL_START = new Date('2009-01-09T00:00:00Z');
const BAND_MULTIPLIERS = [0.45,0.63,0.88,1.23,1.72,2.41,3.37,4.72,6.61,9.25];
const BANDS = [
  {name:'Fire Sale', meaning:'역사적 극저평가 구간', color:'#3157c8'},
  {name:'BUY!', meaning:'강한 저평가 구간', color:'#3186e4'},
  {name:'Accumulate', meaning:'장기 분할매수 관심 구간', color:'#31b9d0'},
  {name:'Still Cheap', meaning:'장기 추세 대비 낮은 구간', color:'#35c985'},
  {name:'HODL', meaning:'중립·보유 관찰 구간', color:'#8fcf45'},
  {name:'Is this a bubble?', meaning:'낙관이 커지는 구간', color:'#e0d43c'},
  {name:'FOMO intensifies', meaning:'과열 주의 구간', color:'#f0a43b'},
  {name:'Sell. Seriously.', meaning:'강한 고평가 구간', color:'#ed6b35'},
  {name:'Maximum Bubble', meaning:'역사적 극과열 구간', color:'#d93b3b'}
];

// 외부 API가 모두 막힌 환경에서도 빈 차트가 되지 않도록 제공하는 최소 기준점.
// 실제 배포에서는 data/bitcoin.json 또는 CoinGecko 일봉 데이터가 우선 사용됩니다.
const FALLBACK_HISTORY = [
  ['2010-07-18',0.09],['2010-12-31',0.30],['2011-02-09',1],['2011-06-08',29.6],['2011-12-31',4.72],
  ['2012-06-30',6.69],['2012-12-31',13.51],['2013-04-10',230],['2013-07-06',68],['2013-11-29',1132],['2013-12-31',754],
  ['2014-06-30',635],['2014-12-31',320],['2015-01-14',178],['2015-06-30',263],['2015-12-31',430],
  ['2016-06-30',673],['2016-12-31',963],['2017-03-31',1079],['2017-06-30',2480],['2017-09-15',3637],['2017-12-17',19666],['2017-12-31',14156],
  ['2018-03-31',6973],['2018-06-30',6385],['2018-12-15',3236],['2018-12-31',3742],
  ['2019-03-31',4105],['2019-06-26',12907],['2019-12-31',7193],
  ['2020-03-13',4970],['2020-06-30',9134],['2020-12-31',28949],
  ['2021-04-14',64805],['2021-07-20',29796],['2021-11-10',68789],['2021-12-31',46306],
  ['2022-03-31',45538],['2022-06-18',18949],['2022-11-21',15787],['2022-12-31',16547],
  ['2023-03-31',28478],['2023-06-30',30477],['2023-10-31',34667],['2023-12-31',42265],
  ['2024-03-14',73738],['2024-04-30',60636],['2024-06-30',62678],['2024-09-06',53991],['2024-12-31',93429],
  ['2025-01-20',109000]
].map(([date,price])=>({date,price}));

let historyData=[];
let currentPrice=null;
let currentPriceSource='';
let plotReady=false;
const $=id=>document.getElementById(id);
const fmtUSD=v=>new Intl.NumberFormat('ko-KR',{style:'currency',currency:'USD',maximumFractionDigits:v<100?2:0}).format(v);
const fmtDate=d=>new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(d);

function baseModel(date){
  const weeks=Math.max(1,(date-MODEL_START)/(7*864e5));
  return 10**(3.109106*Math.log(weeks)-8.164198);
}
function bandAt(price,date){
  const base=baseModel(date); const multiple=price/base;
  let idx=BANDS.length-1;
  for(let i=0;i<BANDS.length;i++){if(multiple<BAND_MULTIPLIERS[i+1]){idx=i;break;}}
  return {idx,base,multiple,...BANDS[idx]};
}
function datesToNow(stepDays=7){
  const out=[]; const start=historyData.length?new Date(historyData[0].date):new Date('2010-07-18T00:00:00Z');
  const now=new Date();
  for(let d=new Date(start);d<=now;d=new Date(d.getTime()+stepDays*864e5)) out.push(new Date(d));
  if(!out.length || out[out.length-1] < now) out.push(now);
  return out;
}
function buildTraces(){
  const dates=datesToNow(7), x=dates.map(d=>d.toISOString().slice(0,10)); const traces=[];
  for(let i=0;i<BANDS.length;i++){
    const lower=dates.map(d=>baseModel(d)*BAND_MULTIPLIERS[i]);
    const upper=dates.map(d=>baseModel(d)*BAND_MULTIPLIERS[i+1]);
    traces.push({x,y:lower,type:'scatter',mode:'lines',line:{width:0},hoverinfo:'skip',showlegend:false});
    traces.push({x,y:upper,type:'scatter',mode:'lines',line:{width:0},fill:'tonexty',fillcolor:BANDS[i].color+'AA',name:BANDS[i].name,hovertemplate:`${BANDS[i].name}<extra></extra>`});
  }
  if(historyData.length){
    traces.push({x:historyData.map(d=>d.date),y:historyData.map(d=>d.price),type:'scattergl',mode:'lines',name:'BTC 가격',line:{color:'#ffffff',width:1.6},hovertemplate:'%{x}<br><b>$%{y:,.2f}</b><extra>BTC</extra>'});
  }
  if(currentPrice){
    const now=new Date();
    traces.push({x:[now.toISOString()],y:[currentPrice],type:'scatter',mode:'markers+text',name:'현재가',marker:{size:13,color:'#ffffff',line:{color:'#111827',width:3}},text:[fmtUSD(currentPrice)],textposition:'top center',cliponaxis:false,hovertemplate:`현재가 (${currentPriceSource})<br><b>$%{y:,.2f}</b><extra></extra>`});
  }
  return traces;
}
function renderChart(){
  if(typeof Plotly==='undefined'){
    $('dataWarning').classList.remove('hidden');
    $('dataWarning').textContent='차트 라이브러리를 불러오지 못했습니다. 인터넷 연결 또는 콘텐츠 차단 설정을 확인해 주세요.';
    return;
  }
  const layout={margin:{l:72,r:35,t:25,b:60},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{color:'#aeb8c8',family:'Inter, Pretendard, sans-serif'},hovermode:'x unified',legend:{orientation:'h',y:-.15,font:{size:10}},xaxis:{gridcolor:'#252c38',zeroline:false,rangeslider:{visible:false}},yaxis:{type:'log',title:'BTC 가격 (USD, 로그)',gridcolor:'#252c38',zeroline:false,tickprefix:'$'},dragmode:'zoom'};
  const config={responsive:true,displaylogo:false,modeBarButtonsToRemove:['lasso2d','select2d']};
  const draw=plotReady?Plotly.react:Plotly.newPlot;
  draw('chart',buildTraces(),layout,config);
  plotReady=true;
}
function updateStats(timestamp=new Date()){
  if(!currentPrice)return;
  const b=bandAt(currentPrice,timestamp);
  $('currentPrice').textContent=fmtUSD(currentPrice);
  $('priceUpdated').textContent=`${currentPriceSource} · ${fmtDate(timestamp)}`;
  $('currentBand').textContent=b.name; $('currentBand').style.color=b.color; $('bandMeaning').textContent=b.meaning;
  $('modelMultiple').textContent=`${b.multiple.toFixed(2)}×`;
}
async function fetchJSON(url,timeout=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const r=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}
async function fetchCurrent(){
  const sources=[
    ['Coinbase',async()=>Number((await fetchJSON('https://api.coinbase.com/v2/prices/BTC-USD/spot')).data.amount)],
    ['Kraken',async()=>Number((await fetchJSON('https://api.kraken.com/0/public/Ticker?pair=XBTUSD')).result.XXBTZUSD.c[0])],
    ['Binance',async()=>Number((await fetchJSON('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')).price)],
    ['CoinGecko',async()=>Number((await fetchJSON('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')).bitcoin.usd)]
  ];
  for(const [name,source] of sources){
    try{
      const p=await source();
      if(Number.isFinite(p)&&p>0){currentPrice=p;currentPriceSource=name;updateStats();renderChart();return true;}
    }catch(e){console.warn(`${name} 시세 실패`,e.message)}
  }
  if(historyData.length){
    const last=historyData[historyData.length-1];
    currentPrice=last.price; currentPriceSource='최신 일봉(실시간 연결 실패)';
    updateStats(new Date(last.date)); renderChart();
  }else{
    $('priceUpdated').textContent='모든 실시간 시세 연결 실패';
  }
  return false;
}
function normalizePrices(prices){
  return prices.map(p=>Array.isArray(p)?{date:new Date(p[0]).toISOString().slice(0,10),price:Number(p[1])}:{date:String(p.date).slice(0,10),price:Number(p.price)})
    .filter(d=>d.date&&Number.isFinite(d.price)&&d.price>0)
    .sort((a,b)=>a.date.localeCompare(b.date))
    .filter((d,i,a)=>i===0||d.date!==a[i-1].date);
}
async function loadHistory(){
  const attempts=[
    ['저장된 일봉 데이터',async()=>normalizePrices((await fetchJSON(`data/bitcoin.json?v=${Date.now()}`)).prices||[])],
    ['CoinGecko 전체 일봉',async()=>normalizePrices((await fetchJSON('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily',20000)).prices||[])],
    ['CryptoCompare 최근 일봉',async()=>{
      const j=await fetchJSON('https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=2000',20000);
      return normalizePrices((j.Data?.Data||[]).map(d=>[d.time*1000,d.close]));
    }]
  ];
  for(const [name,loader] of attempts){
    try{
      const rows=await loader();
      if(rows.length>30){historyData=rows;$('dataWarning').classList.add('hidden');console.info(`과거 데이터: ${name}, ${rows.length}개`);renderChart();return;}
    }catch(e){console.warn(`${name} 실패`,e.message)}
  }
  historyData=FALLBACK_HISTORY;
  $('dataWarning').classList.remove('hidden');
  $('dataWarning').textContent='전체 일봉 API에 연결하지 못해 내장된 주요 역사 기준점을 표시합니다. GitHub Pages에서 Update Bitcoin data 워크플로를 실행하면 전체 일봉으로 교체됩니다.';
  renderChart();
}
function setRange(range){
  const now=new Date();let start=null;
  if(range!=='all'){const years={"10y":10,"5y":5,"2y":2}[range];start=new Date(now);start.setFullYear(now.getFullYear()-years)}
  Plotly.relayout('chart',range==='all'?{'xaxis.autorange':true}:{'xaxis.autorange':false,'xaxis.range':[start,now]});
  document.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('active',b.dataset.range===range));
}
function renderLegend(){
  BANDS.slice().reverse().forEach(b=>{const row=document.createElement('div');row.className='legend-row';row.innerHTML=`<span class="swatch" style="background:${b.color}"></span><b>${b.name}</b><span>${b.meaning}</span>`;$('legend').appendChild(row)});
}
function updateHalving(){
  const target=new Date('2028-04-20T00:00:00Z');const days=Math.max(0,Math.ceil((target-new Date())/864e5));
  $('halvingCountdown').textContent=`약 ${days.toLocaleString('ko-KR')}일 남음 · 블록 속도에 따라 변동`;
}

document.addEventListener('DOMContentLoaded',async()=>{
  renderLegend();updateHalving();renderChart();
  document.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>setRange(b.dataset.range));
  $('resetZoom').onclick=()=>setRange('all');
  await loadHistory();
  await fetchCurrent();
  setInterval(fetchCurrent,30000);
});
