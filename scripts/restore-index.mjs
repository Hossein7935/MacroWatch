import { execSync } from 'node:child_process';
import fs from 'node:fs';

const GOOD = 'b9d928f1168a1077691008e344d5968c636056a6';
const cur = fs.existsSync('index.html') ? fs.readFileSync('index.html', 'utf8') : '';
const broken = cur.length < 15000 || !cur.includes('defs.map') || !cur.includes('usa-face-a');
console.log('index.html size=', cur.length, 'broken=', broken);

if (broken) {
  try {
    execSync(`git show ${GOOD}:index.html > index.html`, { stdio: 'pipe' });
    console.log('restored via git show, size=', fs.readFileSync('index.html', 'utf8').length);
  } catch (e) {
    console.error('git show failed:', e.message);
    try {
      execSync(`curl -sL "https://raw.githubusercontent.com/Hossein7935/Hossein7935.github.io/${GOOD}/index.html" -o index.html`, { stdio: 'inherit' });
      console.log('curl restore size=', fs.readFileSync('index.html', 'utf8').length);
    } catch (e2) {
      console.error('curl restore also failed', e2.message);
    }
  }
}

let html = fs.readFileSync('index.html', 'utf8');
if (html.length > 15000 && !html.includes('chart-hover')) {
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
  if(!svg){tip.classList.remove('show');return}
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
  if (html.includes(oldMouse)) {
    html = html.replace(oldMouse, newMouse);
    console.log('hover mousemove upgraded');
  }
  if (!html.includes('svg.chart-hover{cursor:crosshair}')) {
    html = html.replace(
      '.yield-chart .hit,.chart-big .hit{fill:transparent;stroke:none;cursor:crosshair}',
      '.yield-chart .hit,.chart-big .hit{fill:transparent;stroke:none;cursor:crosshair}svg.chart-hover{cursor:crosshair}'
    );
  }
  fs.writeFileSync('index.html', html);
  console.log('hover applied, final size', html.length);
} else {
  console.log('no hover patch needed or file still broken, size', html.length, 'has hover', html.includes('chart-hover'));
}
