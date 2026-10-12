import {supabase} from './supabase';

export {};

function pm(){return document.querySelector<HTMLElement>('.pm')}
function typeSelect(){
 const labels=Array.from(document.querySelectorAll<HTMLLabelElement>('.pm label'));
 const label=labels.find(x=>(x.textContent||'').trim().startsWith('種別'));
 return label?.querySelector('select') as HTMLSelectElement|null;
}
function ensureOption(){
 const sel=typeSelect();if(!sel)return;
 if(!Array.from(sel.options).some(o=>o.value==='tr_menu')){
  const o=document.createElement('option');o.value='tr_menu';o.textContent='TR Menu';sel.appendChild(o)
 }
}
function markLayout(){
 const root=pm();const sel=typeSelect();if(!root||!sel)return;
 const typeLabel=sel.closest('label');const basic=typeLabel?.closest<HTMLElement>('.panel');
 if(typeLabel)typeLabel.classList.add('trMenuTypeLabel');if(basic)basic.classList.add('trMenuBasicPanel');
 Array.from(root.querySelectorAll<HTMLElement>('.panel')).forEach(p=>{const h=p.querySelector('h3');if((h?.textContent||'').includes('参加選手'))p.classList.add('trMenuParticipants')});
 Array.from(root.querySelectorAll<HTMLElement>('.sectionTitle')).forEach(s=>{if((s.querySelector('h3')?.textContent||'').includes('保存済みTraining/Game'))s.classList.add('trMenuScheduledListTitle')});
}
function setNotice(on:boolean){
 const root=pm();if(!root)return;let n=root.querySelector<HTMLElement>('.trMenuModeNote');
 if(on&&!n){n=document.createElement('div');n.className='trMenuModeNote';n.innerHTML='<b>TR Menu</b><span>日程・Team Categoryの指定なしで、TRメニューだけをライブラリへ保存します。カレンダーには表示されません。</span>';const basic=root.querySelector('.trMenuBasicPanel');basic?.insertAdjacentElement('afterend',n)}
 if(!on)n?.remove()
}
function applyMode(){
 ensureOption();markLayout();const root=pm(),sel=typeSelect();if(!root||!sel)return;
 const on=sel.value==='tr_menu';root.classList.toggle('trMenuMode',on);setNotice(on);
 const save=root.querySelector<HTMLButtonElement>('.saveBar button:first-child');
 if(save&&!save.disabled)save.textContent=on?'TR Menuを保存':save.dataset.originalText||'保存';
 if(save&&!save.dataset.originalText)save.dataset.originalText='保存';
}
function scheduleApply(){[0,60,150,300].forEach(ms=>window.setTimeout(()=>{ensureOption();applyMode()},ms))}

function value<T extends HTMLInputElement|HTMLTextAreaElement>(root:HTMLElement,selector:string){return (root.querySelector<T>(selector)?.value||'').trim()}
function editorData(editor:HTMLElement){
 const top=editor.querySelector<HTMLElement>('.menuTop');const sel=top?.querySelector('select') as HTMLSelectElement|null;
 return {
  tr_category:sel?.value||'TR',menu_name:value<HTMLInputElement>(editor,'input[placeholder="メニュー名称"]'),theme:value<HTMLInputElement>(editor,'input[placeholder="テーマ"]'),duration:value<HTMLInputElement>(editor,'input[placeholder="分"]'),
  objective:value<HTMLTextAreaElement>(editor,'textarea[placeholder="目的"]'),organization:value<HTMLTextAreaElement>(editor,'textarea[placeholder="オーガナイズ"]'),content:value<HTMLTextAreaElement>(editor,'textarea[placeholder="メニュー詳細"]'),coaching:value<HTMLTextAreaElement>(editor,'textarea[placeholder="コーチングポイント"]'),load:value<HTMLTextAreaElement>(editor,'textarea[placeholder="負荷・回数・セット・レスト"]'),files:Array.from(editor.querySelector<HTMLInputElement>('input[type="file"]')?.files||[])
 }
}
function nativeSet(el:HTMLInputElement|HTMLTextAreaElement,value:string){
 const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(setter)setter.call(el,value);else el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))
}
function clearEditors(){
 document.querySelectorAll<HTMLElement>('.pm .menuEditor').forEach(editor=>{editor.querySelectorAll<HTMLInputElement>('input:not([type="file"])').forEach(i=>nativeSet(i,''));editor.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(t=>nativeSet(t,''));const f=editor.querySelector<HTMLInputElement>('input[type="file"]');if(f)f.value=''});scheduleApply()
}
function flash(text:string,error=false){
 const root=pm();if(!root)return;root.querySelector('.trMenuSaveResult')?.remove();const n=document.createElement('div');n.className='trMenuSaveResult'+(error?' error':'');n.textContent=text;root.querySelector('.trMenuModeNote')?.insertAdjacentElement('afterend',n);window.setTimeout(()=>n.remove(),5000)
}
async function saveTRMenu(){
 const root=pm();if(!root)return;const save=root.querySelector<HTMLButtonElement>('.saveBar button:first-child');if(save)save.disabled=true;
 try{
  const menus=Array.from(root.querySelectorAll<HTMLElement>('.menuEditor')).map(editorData).filter(m=>m.menu_name||m.theme||m.objective||m.content||m.organization||m.coaching||m.load||m.files.length);
  if(!menus.length){flash('保存するTRメニューを入力してください。',true);return}
  const {data:{user}}=await supabase.auth.getUser();if(!user){flash('ログイン情報を確認できません。',true);return}
  const title=menus[0].menu_name||`TR Menu (${menus.length}メニュー)`;const total=menus.reduce((n,m)=>n+(Number(m.duration)||0),0)||null;const themes=menus.map(m=>m.theme).filter(Boolean).join(' / ')||null;
  const plan=await supabase.from('training_plans').insert({schedule_event_id:null,plan_date:null,title,category_id:null,venue:null,start_time:null,total_minutes:total,theme:themes,objective:null,notes:'TR_MENU_LIBRARY',created_by:user.id,updated_at:new Date().toISOString()}).select('id').single();
  if(plan.error||!plan.data){flash(plan.error?.message||'TR Menuを保存できませんでした。',true);return}
  const planId=plan.data.id;
  const rows=menus.map((m,i)=>({training_plan_id:planId,block_key:`tr-menu-${i+1}`,block_label:m.tr_category||'TR',tr_category:m.tr_category||'TR',menu_name:m.menu_name||null,theme:m.theme||null,sort_order:i,is_visible:true,duration_minutes:m.duration===''?null:Number(m.duration),objective:m.objective||null,organization:m.organization||null,content:m.content||m.menu_name||null,coaching_points:m.coaching||null,load_notes:m.load||null}));
  const ins=await supabase.from('training_plan_blocks').insert(rows).select('id');if(ins.error){await supabase.from('training_plans').delete().eq('id',planId);flash(ins.error.message,true);return}
  for(let i=0;i<menus.length;i++){
   const blockId=ins.data?.[i]?.id;if(!blockId)continue;
   for(const file of menus[i].files){
    if(file.size>20*1024*1024){flash(`${file.name} は20MBを超えているため添付できませんでした。`,true);continue}
    const safe=file.name.replace(/[^A-Za-z0-9._-]/g,'_');const path=`${planId}/block-${blockId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
    const up=await supabase.storage.from('training-plan-files').upload(path,file,{contentType:file.type||'application/octet-stream'});if(up.error)continue;
    await supabase.from('training_plan_attachments').insert({training_plan_id:planId,training_plan_block_id:blockId,storage_path:path,file_name:file.name,mime_type:file.type||null,file_size:file.size,uploaded_by:user.id})
   }
  }
  flash(`${menus.length}件のTR Menuを保存しました。カレンダーには反映されません。`);clearEditors();window.dispatchEvent(new CustomEvent('ktrs-tr-menu-saved'))
 }finally{if(save){save.disabled=false;save.textContent='TR Menuを保存'}scheduleApply()}
}

document.addEventListener('change',e=>{const target=e.target as HTMLElement|null;if(target===typeSelect())window.setTimeout(applyMode,0);else if(target?.closest('.pm'))scheduleApply()},true);
document.addEventListener('click',e=>{
 const btn=(e.target as HTMLElement|null)?.closest<HTMLButtonElement>('button');if(!btn)return;
 if(btn.closest('.scheduleCategoryItem')||(btn.textContent||'').includes('Training/Gameを作成'))scheduleApply();
 const root=pm();if(!root?.classList.contains('trMenuMode'))return;const save=root.querySelector<HTMLButtonElement>('.saveBar button:first-child');if(btn===save){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void saveTRMenu()}
},true);
window.addEventListener('ktrs-schedule-category',scheduleApply);window.addEventListener('load',scheduleApply,{once:true});

const style=document.createElement('style');style.textContent=`
.trMenuMode .trMenuBasicPanel .grid2 label:not(.trMenuTypeLabel),.trMenuMode .trMenuBasicPanel>textarea,.trMenuMode .trMenuBasicPanel>.check,.trMenuMode .trMenuParticipants,.trMenuMode .trMenuScheduledListTitle,.trMenuMode .eventGrid{display:none!important}.trMenuMode .trMenuBasicPanel .grid2{grid-template-columns:minmax(220px,360px)!important}.trMenuModeNote{display:flex;gap:10px;align-items:center;padding:11px 13px;border:1px solid #cfe1f2;background:#eef7ff;border-radius:10px;color:#315d82}.trMenuModeNote b{white-space:nowrap;color:#1769aa}.trMenuModeNote span{font-size:12px}.trMenuSaveResult{padding:10px 12px;border-radius:9px;background:#edf8f0;color:#287342;font-weight:700}.trMenuSaveResult.error{background:#fff0f0;color:#9b3535}@media(max-width:760px){.trMenuModeNote{align-items:flex-start;flex-direction:column}}
`;document.head.appendChild(style);
