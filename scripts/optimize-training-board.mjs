import {readFile,writeFile} from 'node:fs/promises';

const file=new URL('../src/TrainingBoardEnhancer.tsx',import.meta.url);
let source=await readFile(file,'utf8');
if(source.includes('KTRS_BOARD_FAST_RUNTIME'))process.exit(0);

const oldEnsure=`function ensureButtons(){const pm=document.querySelector<HTMLElement>('.pm');if(!pm)return;Array.from(pm.querySelectorAll<HTMLElement>('.menuEditor')).forEach(editor=>{if(!editor.querySelector('.trainingBoardButton')){const top=editor.querySelector<HTMLElement>('.menuTop')||editor;const b=document.createElement('button');b.type='button';b.className='trainingBoardButton soft';b.textContent='コート図を作成';b.addEventListener('click',async()=>{await hydrateEditor(editor);openBoard(editor)});top.appendChild(b)}updateBadge(editor);void hydrateEditor(editor)})}\nfunction scheduleEnsure(){[0,80,180,360].forEach(ms=>window.setTimeout(ensureButtons,ms))}`;
const newEnsure=`/* KTRS_BOARD_FAST_RUNTIME */\nfunction ensureButtons(){const pm=document.querySelector<HTMLElement>('.pm');if(!pm)return;Array.from(pm.querySelectorAll<HTMLElement>('.menuEditor')).forEach(editor=>{if(!editor.querySelector('.trainingBoardButton')){const top=editor.querySelector<HTMLElement>('.menuTop')||editor;const b=document.createElement('button');b.type='button';b.className='trainingBoardButton soft';b.textContent='コート図を作成';b.addEventListener('click',async()=>{b.disabled=true;try{await hydrateEditor(editor);openBoard(editor)}finally{b.disabled=false}});top.appendChild(b)}updateBadge(editor)})}\nfunction scheduleEnsure(){window.setTimeout(ensureButtons,0);window.setTimeout(ensureButtons,120)}`;
if(!source.includes(oldEnsure))throw new Error('Training board ensureButtons block not found');
source=source.replace(oldEnsure,newEnsure);

const oldObserver=`window.addEventListener('ktrs-schedule-category',scheduleEnsure);window.addEventListener('load',()=>window.setTimeout(scheduleEnsure,350),{once:true});\nif(!initialized){initialized=true;const ob=new MutationObserver(()=>ensureButtons());ob.observe(document.documentElement,{childList:true,subtree:true});window.setTimeout(()=>ob.disconnect(),120000)}scheduleEnsure();`;
const newObserver=`window.addEventListener('ktrs-schedule-category',scheduleEnsure);window.addEventListener('load',()=>window.setTimeout(scheduleEnsure,250),{once:true});\nif(!initialized){initialized=true}scheduleEnsure();`;
if(!source.includes(oldObserver))throw new Error('Training board observer block not found');
source=source.replace(oldObserver,newObserver);

const oldPersist=`for(let i=0;i<editors.length;i++){const board=getEditorBoard(editors[i]);await supabase.from('training_plan_blocks').update({board_data:board.objects.length||board.lines.length?board:null,updated_at:new Date().toISOString()}).eq('id',(blocks as any[])[i].id)}}`;
const newPersist=`for(let i=0;i<editors.length;i++){const editor=editors[i];const stored=editorBoard.get(editor)||safeParse(editor.dataset.trainingBoard);if(!stored)continue;await supabase.from('training_plan_blocks').update({board_data:stored.objects.length||stored.lines.length?stored:null,updated_at:new Date().toISOString()}).eq('id',(blocks as any[])[i].id)}}`;
if(!source.includes(oldPersist))throw new Error('Training board persist block not found');
source=source.replace(oldPersist,newPersist);

await writeFile(file,source,'utf8');
console.log('Applied fast runtime optimization to TrainingBoardEnhancer.tsx');
