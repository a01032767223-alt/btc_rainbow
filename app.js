// Bitcoin Rainbow Wave App
// Main application logic

(function() {
  'use strict';

  // ============ CONFIG ============
  const CONFIG = {
    svgW: 1100,
    svgH: 480,
    margin: { top: 30, right: 50, bottom: 50, left: 70 },
    minPrice: 1000,
    maxPrice: 600000,
    animDuration: 800
  };

  // ============ STATE ============
  let state = {
    range: 'all',
    scale: 'log',
    showRainbow: true,
    showPredicted: true,
    showAth: true,
    showBuyzone: true,
    filteredData: [],
    predictedPoints: [],
    hoverIndex: -1
  };

  // ============ DOM ============
  const svg = document.getElementById('main-chart');
  const container = document.getElementById('chart-container');
  const tooltip = document.getElementById('chart-tooltip');

  // ============ UTILS ============
  function parseDate(d) { return new Date(d + 'T00:00:00'); }

  function formatPrice(p) {
    if (p >= 1000) return '$' + (p/1000).toFixed(p >= 10000 ? 0 : 1) + 'k';
    return '$' + p.toFixed(0);
  }

  function formatFullPrice(p) {
    return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function getPriceRange(data) {
    let min = Infinity, max = -Infinity;
    data.forEach(d => {
      if (d.close < min) min = d.close;
      if (d.close > max) max = d.close;
      if (d.low && d.low < min) min = d.low;
      if (d.high && d.high > max) max = d.high;
    });
    // Add padding
    const pad = (max - min) * 0.1;
    return { min: Math.max(min - pad, CONFIG.minPrice), max: max + pad };
  }

  function scaleX(dateStr, rangeData) {
    const d = parseDate(dateStr).getTime();
    const minT = parseDate(rangeData[0].date).getTime();
    const maxT = parseDate(rangeData[rangeData.length - 1].date).getTime();
    const t = (d - minT) / (maxT - minT);
    return CONFIG.margin.left + t * (CONFIG.svgW - CONFIG.margin.left - CONFIG.margin.right);
  }

  function scaleY(price, range) {
    const { min, max } = range;
    if (state.scale === 'log') {
      const logMin = Math.log10(min);
      const logMax = Math.log10(max);
      const t = (Math.log10(price) - logMin) / (logMax - logMin);
      return CONFIG.margin.top + (1 - t) * (CONFIG.svgH - CONFIG.margin.top - CONFIG.margin.bottom);
    } else {
      const t = (price - min) / (max - min);
      return CONFIG.margin.top + (1 - t) * (CONFIG.svgH - CONFIG.margin.top - CONFIG.margin.bottom);
    }
  }

  function getPredictedPrice(dateStr) {
    const d = parseDate(dateStr).getTime();
    for (let i = 0; i < PREDICTED_ANCHORS.length - 1; i++) {
      const a = PREDICTED_ANCHORS[i], b = PREDICTED_ANCHORS[i+1];
      const at = parseDate(a.date).getTime(), bt = parseDate(b.date).getTime();
      if (d >= at && d <= bt) {
        const r = (d - at) / (bt - at);
        const la = Math.log10(a.price), lb = Math.log10(b.price);
        return Math.pow(10, la + r * (lb - la));
      }
    }
    return PREDICTED_ANCHORS[PREDICTED_ANCHORS.length - 1].price;
  }

  function getZone(price) {
    for (let b of RAINBOW_BANDS) {
      if (price >= b.min && price < b.max) return b.label;
    }
    if (price >= 600000) return "Maximum bubble territory";
    if (price < 5000) return "Fire sale!";
    return "Unknown";
  }

  // ============ FILTER DATA ============
  function filterData() {
    const now = new Date();
    let cutoff;
    switch(state.range) {
      case '6m': cutoff = new Date(now.getTime() - 180*24*60*60*1000); break;
      case '1y': cutoff = new Date(now.getTime() - 365*24*60*60*1000); break;
      case '3y': cutoff = new Date(now.getTime() - 3*365*24*60*60*1000); break;
      case '5y': cutoff = new Date(now.getTime() - 5*365*24*60*60*1000); break;
      default: cutoff = new Date('2017-01-01'); break;
    }
    state.filteredData = BTC_DATA.filter(d => parseDate(d.date) >= cutoff);
  }

  // ============ RENDER ============
  function render() {
    filterData();
    const range = getPriceRange(state.filteredData);
    const data = state.filteredData;

    // Clear groups
    document.getElementById('grid-group').innerHTML = '';
    document.getElementById('rainbow-group').innerHTML = '';
    document.getElementById('predicted-group').innerHTML = '';
    document.getElementById('actual-group').innerHTML = '';
    document.getElementById('markers-group').innerHTML = '';
    document.getElementById('current-dot-group').innerHTML = '';
    document.getElementById('axes-group').innerHTML = '';

    const chartW = CONFIG.svgW - CONFIG.margin.left - CONFIG.margin.right;
    const chartH = CONFIG.svgH - CONFIG.margin.top - CONFIG.margin.bottom;

    // --- Grid lines ---
    const gridG = document.getElementById('grid-group');
    // Horizontal grid
    const gridPrices = state.scale === 'log'
      ? [1000, 3000, 10000, 30000, 100000, 300000, 600000]
      : [0, 50000, 100000, 200000, 300000, 400000, 500000, 600000];
    gridPrices.forEach(p => {
      if (p < range.min || p > range.max) return;
      const y = scaleY(p, range);
      const line = createSVG('line', {
        x1: CONFIG.margin.left, x2: CONFIG.svgW - CONFIG.margin.right,
        y1: y, y2: y,
        stroke: 'var(--border)', 'stroke-width': 0.5, 'stroke-dasharray': '3,3'
      });
      gridG.appendChild(line);
      const text = createSVG('text', {
        x: CONFIG.svgW - CONFIG.margin.right + 6, y: y + 4,
        fill: 'var(--tertiary)', 'font-size': '10',
        'font-family': 'var(--kimi-font-sans, sans-serif)',
        'font-variant-numeric': 'tabular-nums'
      });
      text.textContent = formatPrice(p);
      gridG.appendChild(text);
    });

    // --- Rainbow bands ---
    if (state.showRainbow) {
      const rainbowG = document.getElementById('rainbow-group');
      RAINBOW_BANDS.forEach(b => {
        if (b.max < range.min || b.min > range.max) return;
        const y1 = scaleY(Math.min(b.max, range.max), range);
        const y2 = scaleY(Math.max(b.min, range.min), range);
        const rect = createSVG('rect', {
          x: CONFIG.margin.left, y: y1,
          width: chartW, height: Math.max(1, y2 - y1),
          fill: b.color, opacity: 0.08
        });
        rainbowG.appendChild(rect);
      });
    }

    // --- Predicted path ---
    if (state.showPredicted) {
      const predG = document.getElementById('predicted-group');
      let predPath = '';
      const predData = [];
      const startT = parseDate(data[0].date).getTime();
      const endT = parseDate(data[data.length-1].date).getTime();
      for (let t = startT; t <= endT; t += 7*24*60*60*1000) {
        const ds = new Date(t).toISOString().slice(0,10);
        const p = getPredictedPrice(ds);
        const x = scaleX(ds, data);
        const y = scaleY(p, range);
        predData.push({x, y, p, date: ds});
        predPath += (predPath ? ' L' : 'M') + x + ',' + y;
      }
      state.predictedPoints = predData;
      const path = createSVG('path', {
        d: predPath, fill: 'none', stroke: 'var(--chart2)',
        'stroke-width': 1.5, 'stroke-dasharray': '6,4', opacity: 0.6
      });
      predG.appendChild(path);
    }

    // --- Actual price path ---
    const actualG = document.getElementById('actual-group');
    let actPath = '';
    data.forEach((pt, i) => {
      const x = scaleX(pt.date, data);
      const y = scaleY(pt.close, range);
      actPath += (i === 0 ? 'M' : 'L') + x + ',' + y;
    });
    const actPathEl = createSVG('path', {
      d: actPath, fill: 'none', stroke: 'var(--chart1)',
      'stroke-width': 2.5, 'stroke-linejoin': 'round'
    });
    actualG.appendChild(actPathEl);

    // Area under actual path
    const lastPt = data[data.length-1];
    const firstX = scaleX(data[0].date, data);
    const lastX = scaleX(lastPt.date, data);
    const baseY = scaleY(range.min, range);
    const areaPath = actPath + ' L' + lastX + ',' + baseY + ' L' + firstX + ',' + baseY + ' Z';
    const area = createSVG('path', {
      d: areaPath, fill: 'var(--chart1)', opacity: 0.06
    });
    actualG.insertBefore(area, actPathEl);

    // --- Current price dot ---
    const dotG = document.getElementById('current-dot-group');
    const lastX = scaleX(lastPt.date, data);
    const lastY = scaleY(lastPt.close, range);
    const dot = createSVG('circle', {
      cx: lastX, cy: lastY, r: 6,
      fill: 'var(--chart1)', stroke: 'white', 'stroke-width': 2,
      filter: 'url(#glow)'
    });
    dotG.appendChild(dot);
    // Pulse ring
    const ring = createSVG('circle', {
      cx: lastX, cy: lastY, r: 10,
      fill: 'none', stroke: 'var(--chart1)', 'stroke-width': 1.5, opacity: 0.4
    });
    dotG.appendChild(ring);

    // --- ATH markers ---
    if (state.showAth) {
      const markG = document.getElementById('markers-group');
      CYCLE_ATHS.forEach(a => {
        const ad = parseDate(a.date);
        const fd0 = parseDate(data[0].date);
        const fd1 = parseDate(data[data.length-1].date);
        if (ad < fd0 || ad > fd1) return;
        const x = scaleX(a.date, data);
        const y = scaleY(a.price, range);
        // Arrow down
        const arrow = createSVG('path', {
          d: `M${x},${y-18} L${x-5},${y-28} L${x+5},${y-28} Z`,
          fill: 'var(--positive)'
        });
        markG.appendChild(arrow);
        const t1 = createSVG('text', {
          x, y: y - 32, 'text-anchor': 'middle',
          fill: 'var(--secondary)', 'font-size': '11', 'font-weight': '500',
          'font-family': 'var(--kimi-font-sans, sans-serif)'
        });
        t1.textContent = a.label;
        markG.appendChild(t1);
        const t2 = createSVG('text', {
          x, y: y - 20, 'text-anchor': 'middle',
          fill: 'var(--positive)', 'font-size': '10',
          'font-family': 'var(--kimi-font-sans, sans-serif)'
        });
        t2.textContent = a.athLabel;
        markG.appendChild(t2);
      });
    }

    // --- Buy zone markers ---
    if (state.showBuyzone) {
      const markG = document.getElementById('markers-group');
      BUY_ZONES.forEach(bz => {
        const bzd = parseDate(bz.date);
        const fd0 = parseDate(data[0].date);
        const fd1 = parseDate(data[data.length-1].date);
        if (bzd < fd0 || bzd > fd1) return;
        const x = scaleX(bz.date, data);
        const y = scaleY(bz.price, range);
        const arrow = createSVG('path', {
          d: `M${x},${y+18} L${x-5},${y+28} L${x+5},${y+28} Z`,
          fill: 'var(--chart4)'
        });
        markG.appendChild(arrow);
        const t = createSVG('text', {
          x, y: y + 42, 'text-anchor': 'middle',
          fill: 'var(--chart4)', 'font-size': '10', 'font-weight': '500',
          'font-family': 'var(--kimi-font-sans, sans-serif)'
        });
        t.textContent = bz.label;
        markG.appendChild(t);
      });
    }

    // --- X-axis ---
    const axesG = document.getElementById('axes-group');
    const years = [];
    const startYear = parseDate(data[0].date).getFullYear();
    const endYear = parseDate(data[data.length-1].date).getFullYear();
    for (let y = startYear; y <= endYear; y++) years.push(y);
    years.forEach(y => {
      const x = scaleX(y + '-01-01', data);
      if (x < CONFIG.margin.left || x > CONFIG.svgW - CONFIG.margin.right) return;
      const text = createSVG('text', {
        x, y: CONFIG.svgH - 12, 'text-anchor': 'middle',
        fill: 'var(--tertiary)', 'font-size': '11',
        'font-family': 'var(--kimi-font-sans, sans-serif)'
      });
      text.textContent = y;
      axesG.appendChild(text);
    });

    // Axis lines
    const xAxis = createSVG('line', {
      x1: CONFIG.margin.left, x2: CONFIG.svgW - CONFIG.margin.right,
      y1: CONFIG.svgH - CONFIG.margin.bottom, y2: CONFIG.svgH - CONFIG.margin.bottom,
      stroke: 'var(--border)', 'stroke-width': 1
    });
    axesG.appendChild(xAxis);
    const yAxis = createSVG('line', {
      x1: CONFIG.margin.left, x2: CONFIG.margin.left,
      y1: CONFIG.margin.top, y2: CONFIG.svgH - CONFIG.margin.bottom,
      stroke: 'var(--border)', 'stroke-width': 1
    });
    axesG.appendChild(yAxis);
  }

  // ============ TOOLTIP ============
  function setupTooltip() {
    container.addEventListener('mousemove', function(e) {
      const rect = svg.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (CONFIG.svgW / rect.width);
      const my = (e.clientY - rect.top) * (CONFIG.svgH / rect.height);

      if (mx < CONFIG.margin.left || mx > CONFIG.svgW - CONFIG.margin.right ||
          my < CONFIG.margin.top || my > CONFIG.svgH - CONFIG.margin.bottom) {
        tooltip.classList.remove('show');
        return;
      }

      // Find nearest data point
      let nearest = null, minDist = Infinity;
      state.filteredData.forEach(pt => {
        const x = scaleX(pt.date, state.filteredData);
        const dist = Math.abs(x - mx);
        if (dist < minDist) { minDist = dist; nearest = pt; }
      });

      if (nearest && minDist < 30) {
        const pred = getPredictedPrice(nearest.date);
        const diff = nearest.close - pred;
        const diffPct = ((diff / pred) * 100).toFixed(1);
        const zone = getZone(nearest.close);

        document.getElementById('tt-header').textContent = nearest.date;
        document.getElementById('tt-actual').textContent = formatFullPrice(nearest.close);
        document.getElementById('tt-predicted').textContent = formatFullPrice(pred);
        const diffEl = document.getElementById('tt-diff');
        diffEl.textContent = (diff >= 0 ? '+' : '') + formatFullPrice(diff) + ' (' + diffPct + '%)';
        diffEl.style.color = diff >= 0 ? 'var(--positive)' : 'var(--danger)';
        document.getElementById('tt-zone').textContent = zone;
        document.getElementById('tt-zone').style.color = getZoneColor(zone);

        const px = (e.clientX - rect.left);
        const py = (e.clientY - rect.top);
        tooltip.style.left = (px + 15) + 'px';
        tooltip.style.top = (py - 10) + 'px';
        tooltip.classList.add('show');
      } else {
        tooltip.classList.remove('show');
      }
    });

    container.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
  }

  function getZoneColor(zone) {
    const map = {
      "Maximum bubble territory": "#ef4444",
      "Sell. Seriously, sell": "#f97316",
      "FOMO intensifies": "#eab308",
      "Is this a bubble?": "#84cc16",
      "Still cheap": "#22c55e",
      "Accumulate": "#3b82f6",
      "Buy!": "#a855f7",
      "Fire sale!": "#7c3aed"
    };
    return map[zone] || 'var(--secondary)';
  }

  // ============ CONTROLS ============
  function setupControls() {
    // Range buttons
    document.querySelectorAll('#range-btns button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#range-btns button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.range = btn.dataset.range;
        render();
      });
    });

    // Scale buttons
    document.querySelectorAll('#scale-btns button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#scale-btns button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.scale = btn.dataset.scale;
        render();
      });
    });

    // Toggles
    document.getElementById('show-rainbow').addEventListener('change', e => {
      state.showRainbow = e.target.checked; render();
    });
    document.getElementById('show-predicted').addEventListener('change', e => {
      state.showPredicted = e.target.checked; render();
    });
    document.getElementById('show-ath').addEventListener('change', e => {
      state.showAth = e.target.checked; render();
    });
    document.getElementById('show-buyzone').addEventListener('change', e => {
      state.showBuyzone = e.target.checked; render();
    });

    // Export
    document.getElementById('export-btn').addEventListener('click', e => {
      e.preventDefault();
      exportCSV();
    });

    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', e => {
      e.preventDefault();
      location.reload();
    });
  }

  function exportCSV() {
    let csv = 'date,close,high,low,open,volume,source,predicted,diff,diff_pct,zone\n';
    BTC_DATA.forEach(d => {
      const pred = getPredictedPrice(d.date);
      const diff = d.close - pred;
      const diffPct = ((diff / pred) * 100).toFixed(2);
      const zone = getZone(d.close);
      csv += `${d.date},${d.close},${d.high||''},${d.low||''},${d.open||''},${d.volume||''},${d.source},${pred.toFixed(2)},${diff.toFixed(2)},${diffPct}%,"${zone}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'btc_rainbow_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============ SVG HELPER ============
  function createSVG(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (let k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // ============ INIT ============
  function init() {
    render();
    setupTooltip();
    setupControls();

    // Responsive
    window.addEventListener('resize', () => {
      // SVG viewBox handles scaling automatically
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
