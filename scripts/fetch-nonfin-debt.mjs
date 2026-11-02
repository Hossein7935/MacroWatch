import fs from 'node:fs';

/**
 * Households & Nonprofits + Nonfinancial Business debt growth
 * Official Fed Z.1 SAAR % rates from the visualization table
 * (same as chart #units:growth — NOT simple YoY from levels)
 */

const payload = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const histories = payload.histories || {};
const data = payload.data || {};
const errors = [];

try {
  const url = 'https://www.federalreserve.gov/releases/z1/dataviz/z1/nonfinancial_debt/table/';
  const r = await fetch(url, {
    headers: { 'User-Agent': 'MacroWatch/1.0 (debt growth)' },
    signal: AbortSignal.timeout(60000),
    cache: 'no-store'
  });
  if (!r.ok) throw new Error(`Fed table HTTP ${r.status}`);
  const text = await r.text();

  // Split by quarter headers e.g. 2026:Q2
  const parts = text.split(/(20\d{2}:Q[1-4])/);
  const hh = [];
  const biz = [];

  for (let i = 1; i < parts.length - 1; i += 2) {
    const q = parts[i]; // e.g. 2026:Q2
    const chunk = parts[i + 1].slice(0, 1200);
    // Numbers after quarter: HH level, Biz level, Fed, S&L, Total growth, HH growth, Biz growth, ...
    const nums = [...chunk.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+\.[0-9]+)/g)].map(m => m[1].replace(/,/g, ''));
    if (nums.length < 7) continue;
    const hhG = Number(nums[5]);
    const bizG = Number(nums[6]);
    if (!Number.isFinite(hhG) || !Number.isFinite(bizG)) continue;
    // period as YYYY-MM for chart (Q1=01, Q2=04, Q3=07, Q4=10)
    const [y, qn] = q.split(':Q');
    const month = { '1': '01', '2': '04', '3': '07', '4': '10' }[qn] || '01';
    const period = `${y}-${month}-01`;
    hh.push({ period, value: Math.round(hhG * 1000) / 1000 });
    biz.push({ period, value: Math.round(bizG * 1000) / 1000 });
  }

  // Table is newest-first; reverse for chronological chart
  hh.reverse();
  biz.reverse();

  if (hh.length < 4) throw new Error(`Parsed only ${hh.length} HH growth rows`);

  histories['USA-hhDebt'] = hh.slice(-60);
  histories['USA-bizDebt'] = biz.slice(-60);

  const hhLast = histories['USA-hhDebt'].at(-1);
  const bizLast = histories['USA-bizDebt'].at(-1);

  data.USA = data.USA || {};
  if (hhLast) {
    data.USA.hhDebt = {
      value: hhLast.value,
      date: hhLast.period,
      source: 'Fed Z.1 · SAAR · Households & Nonprofits'
    };
  }
  if (bizLast) {
    data.USA.bizDebt = {
      value: bizLast.value,
      date: bizLast.period,
      source: 'Fed Z.1 · SAAR · Nonfinancial Business'
    };
  }

  delete histories['USA-nonfinDebt'];
  if (data.USA) delete data.USA.nonfinDebt;

  console.log('HH SAAR:', histories['USA-hhDebt'].length, 'last', hhLast?.period, hhLast?.value);
  console.log('Biz SAAR:', histories['USA-bizDebt'].length, 'last', bizLast?.period, bizLast?.value);
} catch (e) {
  errors.push(`USA debt growth: ${e.message}`);
  console.error(e.message);
}

payload.histories = histories;
payload.data = data;
payload.updatedAt = new Date().toISOString();
payload.errors = [
  ...(payload.errors || []).filter(e => !/nonfinDebt|hhDebt|bizDebt|debt growth/i.test(e)),
  ...errors
];
fs.writeFileSync('data.json', JSON.stringify(payload, null, 2) + '\n');
