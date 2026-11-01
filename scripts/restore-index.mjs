import { execSync } from 'node:child_process';
import fs from 'node:fs';

const GOOD = 'b9d928f1168a1077691008e344d5968c636056a6';
let cur = fs.existsSync('index.html') ? fs.readFileSync('index.html', 'utf8') : '';
const broken = cur.length < 15000 || !cur.includes('defs.map') || !cur.includes('usa-face-a');
console.log('index size=', cur.length, 'broken=', broken);

if (broken) {
  try {
    execSync(`git show ${GOOD}:index.html > index.html`, { stdio: 'pipe' });
  } catch {
    execSync(`curl -sL "https://raw.githubusercontent.com/Hossein7935/Hossein7935.github.io/${GOOD}/index.html" -o index.html`, { stdio: 'inherit' });
  }
  console.log('restored size=', fs.readFileSync('index.html', 'utf8').length);
}

let html = fs.readFileSync('index.html', 'utf8');

if (!html.includes('chart-hover')) {
  html = html.replace('r="${opts.big?12:9}" data-period', 'r="${opts.big?14:11}" data-period');
  html = html.replace('class="${cls}" viewBox', 'class="${cls} chart-hover" viewBox');
  html = html.replace(
    '<circle cx="${xy.at(-1)[0].toFixed(1)}" cy="${xy.at(-1)[1].toFixed(1)}"',
    '<circle class="chart-dot" cx="${xy.at(-1)[0].toFixed(1)}" cy="${xy.at(-1)[1].toFixed(1)}"'
  );
  const oldMouse = "const tip=document.querySelector('#chartTip');document.addEventListener('mousemove',e=>{const hit=e.target.closest('.hit');if(!hit){tip.classList.remove('show');return}tip.textContent=hit.dataset.period+' · '+hit.dataset.value;tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY+12)+'px';tip.classList.add('show')});document.addEventListener('mouseleave',()=>tip.classList.remove('show'));";
  const newMouse = `const tip=document.querySelector('#chartTip');
function showTip(e,period,value){tip.textContent=period+' · '+value;tip.style.left=Math.min(e.clientX+12,window.innerWidth-160)+'px';tip.style.top=Math.min(e.clientY+12,window.innerHeight-40)+'px';tip.classList.add('show')}
document.addEventListener('mousemove',e=>{
  const hit=e.target.closest('.hit');
  if(hit){showTip(e,hit.dataset.period,hit.dataset.value);return}
  const svg=e.target.closest('svg.chart-hover');
  if(!svg||svg.closest('#chartDlg')){if(!hit)tip.classList.remove('show');return}
  const hits=[...svg.querySelectorAll('.hit')];
  if(!hits.length){tip.classList.remove('show');return}
  const rect=svg.getBoundingClientRect();
  const vb=svg.viewBox.baseVal;const sx=vb.width/(rect.width||1);
  const mx=(e.clientX-rect.left)*sx;
  let best=hits[0],bestD=1e9;
  for(const h of hits){const d=Math.abs(Number(h.getAttribute('cx'))-mx);if(d<bestD){bestD=d;best=h}}
  showTip(e,best.dataset.period,best.dataset.value);
  const dot=svg.querySelector('.chart-dot');
  if(dot){dot.setAttribute('cx',best.getAttribute('cx'));dot.setAttribute('cy',best.getAttribute('cy'))}
});
document.addEventListener('mouseleave',()=>tip.classList.remove('show'));`;
  if (html.includes(oldMouse)) html = html.replace(oldMouse, newMouse);
}

if (!html.includes('chart-crosshair-v')) {
  const cssAdd = 'svg.chart-hover{cursor:crosshair}.chart-crosshair-v,.chart-crosshair-h{stroke:var(--muted);stroke-width:1;stroke-dasharray:4 3;opacity:.7;pointer-events:none}.chart-crosshair-dot{fill:var(--accent);stroke:var(--panel);stroke-width:2;pointer-events:none}#chartDlg .chart-big{min-height:260px}#chartDlg .chart-tip-inline{position:absolute;z-index:5;background:var(--panel);border:1px solid var(--line);color:var(--text);padding:8px 12px;border-radius:10px;font-size:13px;line-height:1.4;box-shadow:0 8px 24px #0005;pointer-events:none;opacity:0;transition:opacity .1s;white-space:nowrap}#chartDlg .chart-tip-inline.show{opacity:1}#chartDlg #chartBody{position:relative}';
  if (html.includes('svg.chart-hover{cursor:crosshair}')) {
    html = html.replace('svg.chart-hover{cursor:crosshair}', cssAdd);
  } else {
    html = html.replace(
      '.yield-chart .hit,.chart-big .hit{fill:transparent;stroke:none;cursor:crosshair}',
      '.yield-chart .hit,.chart-big .hit{fill:transparent;stroke:none;cursor:crosshair}' + cssAdd
    );
  }
}

if (!html.includes('bindBigChartHover')) {
  const oldPaint = "function paintChartDlg(){if(!chartCtx)return;const full=histories[chartCtx.country+'-'+chartCtx.key]||[];let arr=filterByRange(full,chartCtx.range);if(!arr.length)arr=full;const pts=arr.map(x=>({period:String(x.period),value:Number(x.value)})).filter(x=>Number.isFinite(x.value));const body=document.querySelector('#chartBody');if(!pts.length){body.innerHTML='<div class=\"sparkempty\">Keine Daten für diesen Zeitraum</div>';document.querySelector('#chartMeta').textContent='';return}body.innerHTML=renderLineChart(pts,{w:640,h:180,big:true});const rLabel={'6m':'6 Monate','1y':'1 Jahr','3y':'3 Jahre'}[chartCtx.range]||chartCtx.range;document.querySelector('#chartMeta').textContent=`${pts.length} Punkte · ${rLabel} · ${esc(String(pts[0].period))} → ${esc(String(pts.at(-1).period))}`}";
  const newPaint = `function paintChartDlg(){if(!chartCtx)return;const full=histories[chartCtx.country+'-'+chartCtx.key]||[];let arr=filterByRange(full,chartCtx.range);if(!arr.length)arr=full;const pts=arr.map(x=>({period:String(x.period),value:Number(x.value)})).filter(x=>Number.isFinite(x.value));const body=document.querySelector('#chartBody');if(!pts.length){body.innerHTML='<div class="sparkempty">Keine Daten für diesen Zeitraum</div>';document.querySelector('#chartMeta').textContent='';return}body.innerHTML=renderLineChart(pts,{w:720,h:280,big:true})+'<div class="chart-tip-inline" id="chartDlgTip"></div>';const rLabel={'6m':'6 Monate','1y':'1 Jahr','3y':'3 Jahre'}[chartCtx.range]||chartCtx.range;document.querySelector('#chartMeta').textContent=\`\${pts.length} Punkte · \${rLabel} · \${esc(String(pts[0].period))} → \${esc(String(pts.at(-1).period))}\`;bindBigChartHover(body)}
function bindBigChartHover(body){
  const svg=body.querySelector('svg.chart-hover');
  const tip=body.querySelector('#chartDlgTip');
  if(!svg||!tip)return;
  let vLine=svg.querySelector('.chart-crosshair-v');
  let hLine=svg.querySelector('.chart-crosshair-h');
  let cDot=svg.querySelector('.chart-crosshair-dot');
  if(!vLine){
    const ns='http://www.w3.org/2000/svg';
    vLine=document.createElementNS(ns,'line');vLine.setAttribute('class','chart-crosshair-v');
    hLine=document.createElementNS(ns,'line');hLine.setAttribute('class','chart-crosshair-h');
    cDot=document.createElementNS(ns,'circle');cDot.setAttribute('class','chart-crosshair-dot');cDot.setAttribute('r','5');
    svg.appendChild(vLine);svg.appendChild(hLine);svg.appendChild(cDot);
  }
  const hits=[...svg.querySelectorAll('.hit')];
  const vb=svg.viewBox.baseVal;
  const onMove=(e)=>{
    if(!hits.length)return;
    const rect=svg.getBoundingClientRect();
    const sx=vb.width/(rect.width||1);
    const mx=(e.clientX-rect.left)*sx;
    let best=hits[0],bestD=1e9;
    for(const h of hits){const d=Math.abs(Number(h.getAttribute('cx'))-mx);if(d<bestD){bestD=d;best=h}}
    const cx=Number(best.getAttribute('cx')), cy=Number(best.getAttribute('cy'));
    vLine.setAttribute('x1',cx);vLine.setAttribute('x2',cx);vLine.setAttribute('y1',0);vLine.setAttribute('y2',vb.height);
    hLine.setAttribute('y1',cy);hLine.setAttribute('y2',cy);hLine.setAttribute('x1',0);hLine.setAttribute('x2',vb.width);
    cDot.setAttribute('cx',cx);cDot.setAttribute('cy',cy);
    tip.innerHTML='<b>'+best.dataset.period+'</b><br>'+best.dataset.value;
    tip.classList.add('show');
    const br=body.getBoundingClientRect();
    let left=e.clientX-br.left+14, top=e.clientY-br.top-10;
    if(left+140>br.width)left=e.clientX-br.left-150;
    if(top<0)top=8;
    tip.style.left=left+'px';tip.style.top=top+'px';
  };
  const onLeave=()=>{tip.classList.remove('show');vLine.setAttribute('x1',-10);vLine.setAttribute('x2',-10);hLine.setAttribute('y1',-10);hLine.setAttribute('y2',-10);cDot.setAttribute('cx',-10);cDot.setAttribute('cy',-10)};
  svg.onmousemove=onMove;svg.onmouseleave=onLeave;
}`;
  if (html.includes("function paintChartDlg()")) {
    // replace by finding start and next function or end pattern
    const start = html.indexOf('function paintChartDlg()');
    const end = html.indexOf('function historyHTML', start);
    if (start >= 0 && end > start) {
      html = html.slice(0, start) + newPaint + '\n' + html.slice(end);
      console.log('TV big-chart hover applied');
    } else {
      console.log('could not locate paintChartDlg block');
    }
  }
}

fs.writeFileSync('index.html', html);
console.log('final index size', html.length, 'has TV', html.includes('bindBigChartHover'), 'has hover', html.includes('chart-hover'));
