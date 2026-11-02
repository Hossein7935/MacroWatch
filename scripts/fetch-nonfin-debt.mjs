import fs from 'node:fs';

/** Households & Nonprofits + Nonfinancial Business debt growth (YoY %) from FRED */

async function fredLevels(id) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=2000-01-01`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'MacroWatch/1.0' },
    signal: AbortSignal.timeout(45000),
    cache: 'no-store'
  });
  if (!r.ok) throw new Error(`FRED ${id} HTTP ${r.status}`);
  const text = await r.text();
  const levels = [];
  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    const [date, val] = line.split(',');
    if (val && val !== '.' && Number.isFinite(Number(val))) {
      levels.push({ period: date.slice(0, 10), value: Number(val) });
    }
  }
  return levels;
}

function yoyGrowth(levels) {
  const growth = [];
  for (let i = 4; i < levels.length; i++) {
    const cur = levels[i];
    const p = levels[i - 4];
    const g = ((cur.value - p.value) / p.value) * 100;
    growth.push({ period: cur.period, value: Math.round(g * 100) / 100 });
  }
  return growth.slice(-60);
}

const payload = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const histories = payload.histories || {};
const data = payload.data || {};
const errors = [];

try {
  // Households and Nonprofit Organizations debt (CMDEBT)
  const hh = yoyGrowth(await fredLevels('CMDEBT'));
  histories['USA-hhDebt'] = hh;
  const hhLast = hh.at(-1);
  if (hhLast) {
    data.USA = data.USA || {};
    data.USA.hhDebt = {
      value: hhLast.value,
      date: hhLast.period,
      source: 'FRED · CMDEBT YoY · Fed Z.1'
    };
  }
  console.log('HH debt growth:', hh.length, 'pts, last', hhLast?.period, hhLast?.value);

  // Nonfinancial Business debt (TBSDODNS)
  const biz = yoyGrowth(await fredLevels('TBSDODNS'));
  histories['USA-bizDebt'] = biz;
  const bizLast = biz.at(-1);
  if (bizLast) {
    data.USA = data.USA || {};
    data.USA.bizDebt = {
      value: bizLast.value,
      date: bizLast.period,
      source: 'FRED · TBSDODNS YoY · Fed Z.1'
    };
  }
  console.log('Biz debt growth:', biz.length, 'pts, last', bizLast?.period, bizLast?.value);

  // remove old total series if present
  delete histories['USA-nonfinDebt'];
  if (data.USA) delete data.USA.nonfinDebt;
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
