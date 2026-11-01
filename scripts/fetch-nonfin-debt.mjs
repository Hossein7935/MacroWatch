import fs from 'node:fs';

/** Nonfinancial debt growth (YoY %) from FRED TCMDODNS — Fed Z.1 #units:growth */

const payload = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const histories = payload.histories || {};
const data = payload.data || {};
const errors = [];

try {
  const url = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=TCMDODNS&cosd=2000-01-01';
  const r = await fetch(url, {
    headers: { 'User-Agent': 'MacroWatch/1.0' },
    signal: AbortSignal.timeout(45000),
    cache: 'no-store'
  });
  if (!r.ok) throw new Error(`FRED TCMDODNS HTTP ${r.status}`);
  const text = await r.text();
  const levels = [];
  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    const [date, val] = line.split(',');
    if (val && val !== '.' && Number.isFinite(Number(val))) {
      levels.push({ period: date.slice(0, 10), value: Number(val) });
    }
  }
  const growth = [];
  for (let i = 4; i < levels.length; i++) {
    const cur = levels[i];
    const p = levels[i - 4];
    const g = ((cur.value - p.value) / p.value) * 100;
    growth.push({ period: cur.period, value: Math.round(g * 100) / 100 });
  }
  histories['USA-nonfinDebt'] = growth.slice(-60);
  const last = histories['USA-nonfinDebt'].at(-1);
  if (last) {
    data.USA = data.USA || {};
    data.USA.nonfinDebt = {
      value: last.value,
      date: last.period,
      source: 'FRED · TCMDODNS YoY · Fed Z.1'
    };
  }
  console.log('Nonfin debt growth:', histories['USA-nonfinDebt'].length, 'pts, last', last?.period, last?.value);
} catch (e) {
  errors.push(`USA nonfinDebt: ${e.message}`);
  console.error(e.message);
}

payload.histories = histories;
payload.data = data;
payload.updatedAt = new Date().toISOString();
payload.errors = [
  ...(payload.errors || []).filter(e => !/nonfinDebt/i.test(e)),
  ...errors
];
fs.writeFileSync('data.json', JSON.stringify(payload, null, 2) + '\n');
