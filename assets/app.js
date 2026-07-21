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

let historyData=[]; let currentPrice=null; let plotReady=false;
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
  const now=new Date(); for(let d=new Date(start);d<=now;d=new Date(d.getTime()+stepDays*864e5)) out.push(new Date(d));
  if(out[out.length-1] < now) out.push(now); return out;
}
function buildTraces(){
  const dates=datesToNow(7), x=dates.map(d=>d.toISOString().slice(0,10)); const traces=[];
  for(let i=0;i<BANDS.length;i++){
    const lower=dates.map(d=>baseModel(d)*BAND_MULTIPLIERS[i]);
    const upper=dates.map(d=>baseModel(d)*BAND_MULTIPLIERS[i+1]);
    traces.push({x,y:lower,type:'scatter',mode:'lines',line:{width:0},hoverinfo:'skip',showlegend:false});
    traces.push({x,y:upper,type:'scatter',mode:'lines',line:{width:0},fill:'tonexty',fillcolor:BANDS[i].color+'AA',name:BANDS[i].name,hovertemplate:`${BANDS[i].name}<extra></extra>`});
  }
  if(historyData.length){traces.push({x:historyData.map(d=>d.date),y:historyData.map(d=>d.price),type:'scattergl',mode:'lines',name:'BTC 일별 종가',line:{color:'#f7f8fb',width:1.25},hovertemplate:'%{x}<br><b>$%{y:,.0f}</b><extra>BTC 종가</extra>'});}
  if(currentPrice){const now=new Date();traces.push({x:[now.toISOString()],y:[currentPrice],type:'scatter',mode:'markers+text',name:'현재가',marker:{size:11,color:'#fff',line:{color:'#111',width:2}},text:[fmtUSD(currentPrice)],textposition:'top center',hovertemplate:'현재가<br><b>$%{y:,.0f}</b><extra></extra>'});}
  return traces;
}
function renderChart(){
  const layout={margin:{l:72,r:30,t:20,b:55},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{color:'#aeb8c8',family:'Inter, Pretendard, sans-serif'},hovermode:'x unified',legend:{orientation:'h',y:-.15,font:{size:10}},xaxis:{gridcolor:'#252c38',zeroline:false,rangeslider:{visible:false}},yaxis:{type:'log',title:'BTC 가격 (USD, 로그)',gridcolor:'#252c38',zeroline:false,tickprefix:'$'},dragmode:'zoom'};
  const config={responsive:true,displaylogo:false,modeBarButtonsToRemove:['lasso2d','select2d']};
  (plotReady?Plotly.react:Plotly.newPlot)('chart',buildTraces(),layout,config); plotReady=true;
}
function updateStats(){
  if(!currentPrice)return; const now=new Date(); const b=bandAt(currentPrice,now);
  $('currentPrice').textContent=fmtUSD(currentPrice); $('priceUpdated').textContent=`갱신 ${fmtDate(now)}`;
  $('currentBand').textContent=b.name; $('currentBand').style.color=b.color; $('bandMeaning').textContent=b.meaning;
  $('modelMultiple').textContent=`${b.multiple.toFixed(2)}×`;
}
async function fetchCurrent(){
  const sources=[
    async()=>{const r=await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');if(!r.ok)throw Error();return Number((await r.json()).price)},
    async()=>{const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');if(!r.ok)throw Error();return Number((await r.json()).bitcoin.usd)}
  ];
  for(const source of sources){try{const p=await source();if(Number.isFinite(p)&&p>0){currentPrice=p;updateStats();renderChart();return}}catch(e){}}
  $('priceUpdated').textContent='실시간 시세 연결 실패';
}
async function loadHistory(){
  try{const r=await fetch(`data/bitcoin.json?v=${Date.now()}`);if(!r.ok)throw Error();const payload=await r.json();historyData=(payload.prices||[]).filter(d=>d.price>0);if(!historyData.length)throw Error();}
  catch(e){$('dataWarning').classList.remove('hidden');$('dataWarning').textContent='과거 가격 데이터가 아직 생성되지 않았습니다. GitHub Actions의 “Update Bitcoin data”를 한 번 실행하면 전체 이력이 표시됩니다.';}
  renderChart();
}
function setRange(range){
  const now=new Date();let start=null;if(range!=='all'){const years={"10y":10,"5y":5,"2y":2}[range];start=new Date(now);start.setFullYear(now.getFullYear()-years)}
  Plotly.relayout('chart',{'xaxis.autorange':range==='all','xaxis.range':start?[start,now]:undefined});
  document.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('active',b.dataset.range===range));
}
function renderLegend(){BANDS.slice().reverse().forEach((b,i)=>{const row=document.createElement('div');row.className='legend-row';row.innerHTML=`<span class="swatch" style="background:${b.color}"></span><b>${b.name}</b><span>${b.meaning}</span>`;$('legend').appendChild(row)})}
function updateHalving(){const target=new Date('2028-04-20T00:00:00Z');const days=Math.max(0,Math.ceil((target-new Date())/864e5));$('halvingCountdown').textContent=`약 ${days.toLocaleString('ko-KR')}일 남음 · 블록 속도에 따라 변동`}

document.addEventListener('DOMContentLoaded',async()=>{renderLegend();updateHalving();document.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>setRange(b.dataset.range));$('resetZoom').onclick=()=>setRange('all');await loadHistory();await fetchCurrent();setInterval(fetchCurrent,30000)});
