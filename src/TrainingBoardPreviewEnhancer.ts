export {};

type BoardObject={id:string;kind:'player'|'marker'|'coneSmall'|'coneLarge';x:number;y:number;color:string;label?:string};
type BoardLine={id:string;x1:number;y1:number;x2:number;y2:number;color:string;style:'solid'|'dashed'|'wavy'|'waveDotted';arrow:boolean;width:number};
type BoardData={version:1;pitch:'full'|'half';objects:BoardObject[];lines:BoardLine[]};

function parseBoard(editor:HTMLElement):BoardData|null{
  const raw=editor.dataset.trainingBoard;
  if(!raw)return null;
  try{const x=JSON.parse(raw);return x?.version===1?x:null}catch{return null}
}
function safeColor(v:string){return /^#[0-9a-f]{3,8}$/i.test(v)?v:'#1565c0'}
function wavePath(x1:number,y1:number,x2:number,y2:number){const dx=x2-x1,dy=y2-y1,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len,steps=Math.max(4,Math.round(len/26));let d=`M ${x1} ${y1}`;for(let i=1;i<=steps;i++){const t=i/steps,px=x1+dx*t,py=y1+dy*t,amp=i===steps?0:(i%2?7:-7);d+=` L ${px+nx*amp} ${py+ny*amp}`}return d}
function svg(data:BoardData){
 const pitch=data.pitch==='half'
  ?'<rect x="2" y="2" width="796" height="496" rx="2"/><rect x="560" y="135" width="238" height="230"/><rect x="690" y="195" width="108" height="110"/><circle cx="650" cy="250" r="3" fill="white"/>'
  :'<rect x="2" y="2" width="796" height="496" rx="2"/><line x1="400" y1="2" x2="400" y2="498"/><circle cx="400" cy="250" r="65"/><circle cx="400" cy="250" r="3" fill="white"/><rect x="2" y="135" width="120" height="230"/><rect x="2" y="195" width="45" height="110"/><circle cx="90" cy="250" r="3" fill="white"/><rect x="678" y="135" width="120" height="230"/><rect x="753" y="195" width="45" height="110"/><circle cx="710" cy="250" r="3" fill="white"/>';
 const lines=data.lines.map(l=>{const d=l.style==='wavy'||l.style==='waveDotted'?wavePath(l.x1,l.y1,l.x2,l.y2):`M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`;const dash=l.style==='dashed'?'13 9':l.style==='waveDotted'?'2 9':'';return `<path d="${d}" fill="none" stroke="${safeColor(l.color)}" stroke-width="${Math.max(2,Math.min(8,l.width||4))}"${dash?` stroke-dasharray="${dash}"`:''}/>`}).join('');
 const objects=data.objects.map(o=>{const c=safeColor(o.color);if(o.kind==='player'){const label=String(o.label||'').replace(/[<>&"']/g,'').slice(0,8);return `<g><circle cx="${o.x}" cy="${o.y}" r="16" fill="${c}" stroke="white" stroke-width="3"/><text x="${o.x}" y="${o.y+5}" text-anchor="middle" fill="white" font-size="13" font-weight="800">${label}</text></g>`}if(o.kind==='marker')return `<circle cx="${o.x}" cy="${o.y}" r="7" fill="${c}" stroke="white" stroke-width="1.5"/>`;const s=o.kind==='coneLarge'?16:11;return `<path d="M ${o.x} ${o.y-s} L ${o.x-s*.75} ${o.y+s} L ${o.x+s*.75} ${o.y+s} Z" fill="${c}" stroke="white" stroke-width="1.5"/>`}).join('');
 return `<svg viewBox="0 0 800 500" aria-label="コート図プレビュー"><rect width="800" height="500" fill="#2f8a4f"/><g stroke="white" stroke-width="2" fill="none" opacity=".95">${pitch}</g>${lines}${objects}</svg>`;
}
function render(editor:HTMLElement){
 const data=parseBoard(editor);let box=editor.querySelector<HTMLElement>('.trainingBoardPreview');
 if(!data||(!data.objects.length&&!data.lines.length)){box?.remove();return}
 const count=data.objects.length+data.lines.length;
 const signature=`${editor.dataset.trainingBoard||''}|${count}`;
 if(box?.dataset.signature===signature)return;
 if(!box){box=document.createElement('div');box.className='trainingBoardPreview';const anchor=editor.querySelector('.menuTop')||editor.firstElementChild;anchor?.insertAdjacentElement('afterend',box)}
 box.dataset.signature=signature;
 box.innerHTML=`<button type="button" class="trainingBoardPreviewButton"><span class="trainingBoardPreviewCanvas">${svg(data)}</span><span class="trainingBoardPreviewMeta"><b>コート図</b><small>${count}項目｜クリックして編集</small></span></button>`;
 box.querySelector('button')?.addEventListener('click',()=>editor.querySelector<HTMLButtonElement>('.trainingBoardButton,.trainingBoardLazyButton')?.click());
}
function scanOnce(){document.querySelectorAll<HTMLElement>('.pm .menuEditor').forEach(render)}

const observer=new MutationObserver(muts=>{
  for(const m of muts){
    if(m.type!=='attributes'||m.attributeName!=='data-training-board')continue;
    const editor=(m.target as HTMLElement).closest<HTMLElement>('.menuEditor');
    if(editor)render(editor);
  }
});
function start(){
  const pm=document.querySelector<HTMLElement>('.pm');
  if(!pm)return;
  scanOnce();
  observer.disconnect();
  observer.observe(pm,{subtree:true,attributes:true,attributeFilter:['data-training-board']});
}
start();

const style=document.createElement('style');
style.textContent=`
.trainingBoardOverlay{position:fixed!important;inset:0!important;z-index:10000!important;background:rgba(10,20,30,.58)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:3vh 3vw!important;box-sizing:border-box!important}
.trainingBoardOverlay .trainingBoardCard{width:min(94vw,1500px)!important;height:min(92vh,960px)!important;max-width:none!important;max-height:none!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;border-radius:18px!important;box-shadow:0 24px 80px rgba(0,0,0,.35)!important;background:#fff!important}
.trainingBoardOverlay .trainingBoardLayout{flex:1!important;min-height:0!important;overflow:hidden!important}
.trainingBoardOverlay .trainingBoardCanvasWrap{min-height:0!important;height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:14px!important;box-sizing:border-box!important}
.trainingBoardOverlay .trainingBoardCanvas{max-width:100%!important;max-height:100%!important;width:100%!important;height:auto!important;aspect-ratio:8/5!important}
.trainingBoardPreview{margin:10px 0 4px}.trainingBoardPreviewButton{width:100%;display:grid;grid-template-columns:minmax(180px,280px) 1fr;gap:12px;align-items:center;text-align:left;background:#f7fafc!important;color:#213547!important;border:1px solid #d9e4ee!important;border-radius:12px!important;padding:8px!important}.trainingBoardPreviewCanvas{display:block;overflow:hidden;border-radius:8px}.trainingBoardPreviewCanvas svg{display:block;width:100%;height:auto}.trainingBoardPreviewMeta{display:grid;gap:4px}.trainingBoardPreviewMeta b{font-size:14px}.trainingBoardPreviewMeta small{color:#6f8192}
@media(max-width:800px){.trainingBoardOverlay{padding:0!important}.trainingBoardOverlay .trainingBoardCard{width:100vw!important;height:100dvh!important;border-radius:0!important}.trainingBoardPreviewButton{grid-template-columns:140px 1fr}.trainingBoardOverlay .trainingBoardLayout{overflow:auto!important}}
`;
document.head.appendChild(style);
