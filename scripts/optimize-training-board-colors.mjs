import {readFile,writeFile} from 'node:fs/promises';

const file=new URL('../src/TrainingBoardEnhancer.tsx',import.meta.url);
let source=await readFile(file,'utf8');
if(source.includes('KTRS_BOARD_COLOR_PRESETS'))process.exit(0);

const helper=`\n/* KTRS_BOARD_COLOR_PRESETS */\nconst boardPresetColors=['#1565c0','#e53935','#43a047','#fdd835','#fb8c00','#8e24aa','#00acc1','#212121','#ffffff'];\nfunction hexToRgbValue(hex:string){const v=hex.replace('#','');const full=v.length===3?v.split('').map(x=>x+x).join(''):v.padEnd(6,'0').slice(0,6);return{r:parseInt(full.slice(0,2),16)||0,g:parseInt(full.slice(2,4),16)||0,b:parseInt(full.slice(4,6),16)||0}}\nfunction rgbToHexValue(r:number,g:number,b:number){const f=(n:number)=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0');return '#'+f(r)+f(g)+f(b)}\n`;
const helperAnchor='function wavePath(x1:number,y1:number,x2:number,y2:number)';
if(!source.includes(helperAnchor))throw new Error('Board helper anchor not found');
source=source.replace(helperAnchor,helper+'\n'+helperAnchor);

const colorPattern=/<label>色<input type="color" value=\{selectedObject\?\.color\|\|selectedLine\?\.color\|\|color\} onChange=\{e=>applyColor\(e\.target\.value\)\}\/><\/label>/;
if(!colorPattern.test(source))throw new Error('Board color control not found');
const replacement=`<div className="boardColorPanel"><span className="boardColorTitle">色</span><div className="boardColorPresets">{boardPresetColors.map(c=><button key={c} type="button" className="boardColorSwatch" aria-label={\`色 ${'${c}'}\`} title={c} onClick={()=>applyColor(c)} style={{background:c}}/>)}</div><label className="boardColorFree">自由色<input type="color" value={selectedObject?.color||selectedLine?.color||color} onChange={e=>applyColor(e.target.value)}/></label><div className="boardRgbInputs">{(['r','g','b'] as const).map(ch=>{const current=selectedObject?.color||selectedLine?.color||color;const rgb=hexToRgbValue(current);return <label key={ch}>{ch.toUpperCase()}<input type="number" min="0" max="255" value={rgb[ch]} onChange={e=>{const next={...rgb,[ch]:Number(e.target.value)};applyColor(rgbToHexValue(next.r,next.g,next.b))}}/></label>})}</div></div>`;
source=source.replace(colorPattern,replacement);

const cssAnchor='.trainingBoardButton{';
if(!source.includes(cssAnchor))throw new Error('Board CSS anchor not found');
source=source.replace(cssAnchor,'.boardColorPanel{display:grid;gap:7px}.boardColorTitle{font-size:11px;font-weight:800;color:#506578}.boardColorPresets{display:grid;grid-template-columns:repeat(5,28px);gap:6px}.boardColorSwatch{width:28px!important;height:28px!important;min-width:28px!important;padding:0!important;border-radius:50%!important;border:2px solid #fff!important;box-shadow:0 0 0 1px #c8d4df!important}.boardColorSwatch[style*="ffffff"]{box-shadow:0 0 0 1px #8999a8!important}.boardColorFree{display:grid!important;grid-template-columns:auto 1fr!important;align-items:center!important;gap:8px!important}.boardColorFree input[type="color"]{height:34px!important}.boardRgbInputs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.boardRgbInputs label{display:grid;gap:3px;font-size:10px;font-weight:800}.boardRgbInputs input{padding:6px!important;text-align:center!important}.trainingBoardButton{');

await writeFile(file,source,'utf8');
console.log('Applied board preset colors and RGB inputs');
