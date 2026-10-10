import {supabase} from './supabase';

export {};

type SavedItem={block:any;plan:any;categoryName:string;favorite:boolean};
type SaveReuse={sourceBlockId:number;ordinal:number};

let currentItems:SavedItem[]=[];
let currentCategories:any[]=[];
let currentFavorites=new Set<number>();
let pickerTarget:HTMLElement|null=null;
const sourceByEditor=new WeakMap<HTMLElement,number>();

function nativeSet(el:HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement,value:string){
 const proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
 const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
 if(setter)setter.call(el,value);else el.value=value;
 el.dispatchEvent(new Event('input',{bubbles:true}));
 el.dispatchEvent(new Event('change',{bubbles:true}));
}

function fieldByLabel(text:string){
 const label=Array.from(document.querySelectorAll<HTMLLabelElement>('.pm label')).find(x=>(x.textContent||'').includes(text));
 return label?.querySelector('input,select,textarea') as HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|null;
}

function meaningfulEditor(editor:HTMLElement){
 const values=Array.from(editor.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea')).map(x=>x.value.trim());
 return values.some(Boolean);
}

function ensureReuseButtons(){
 const pm=document.querySelector<HTMLElement>('.pm');if(!pm)return;
 const sectionHead=Array.from(pm.querySelectorAll<HTMLElement>('.sectionTitle')).find(x=>(x.querySelector('h3')?.textContent||'').includes('TRメニュー構成'));
 if(sectionHead&&!sectionHead.querySelector('.reuseLibraryButton')){
  const b=document.createElement('button');b.type='button';b.className='reuseLibraryButton soft';b.textContent='保存済みメニューから追加';b.addEventListener('click',()=>openPicker(null));sectionHead.appendChild(b)
 }
 Array.from(pm.querySelectorAll<HTMLElement>('.menuEditor')).forEach(editor=>{
  if(editor.querySelector('.reuseIntoButton'))return;
  const top=editor.querySelector<HTMLElement>('.menuTop');if(!top)return;
  const b=document.createElement('button');b.type='button';b.className='reuseIntoButton soft';b.textContent='保存済みから選択';b.addEventListener('click',()=>openPicker(editor));top.appendChild(b)
 })
}

function scheduleEnsure(){[0,80,180,360].forEach(ms=>window.setTimeout(ensureReuseButtons,ms))}

async function loadSavedItems(){
 const [{data:{user}},{data:cats},{data:plans}]=await Promise.all([
  supabase.auth.getUser(),
  supabase.from('schedule_entry_categories').select('id,name').eq('is_active',true).order('sort_order').order('name'),
  supabase.from('training_plans').select('id,plan_date,title,category_id').order('plan_date',{ascending:false}).limit(250)
 ]);
 currentCategories=cats||[];
 const planIds=(plans||[]).map((p:any)=>p.id);
 if(!planIds.length){currentItems=[];currentFavorites=new Set();return}
 const [{data:blocks},{data:favs}]=await Promise.all([
  supabase.from('training_plan_blocks').select('id,training_plan_id,tr_category,block_label,menu_name,theme,duration_minutes,objective,organization,content,coaching_points,load_notes,sort_order').in('training_plan_id',planIds).eq('is_visible',true).order('sort_order'),
  user?supabase.from('training_menu_favorites').select('training_plan_block_id').eq('user_id',user.id):Promise.resolve({data:[]} as any)
 ]);
 currentFavorites=new Set((favs||[]).map((x:any)=>Number(x.training_plan_block_id)));
 const planMap=new Map((plans||[]).map((p:any)=>[p.id,p]));
 const catMap=new Map((cats||[]).map((c:any)=>[Number(c.id),c.name]));
 currentItems=(blocks||[]).map((block:any)=>{const plan:any=planMap.get(block.training_plan_id);return{block,plan,categoryName:catMap.get(Number(plan?.category_id))||'未設定',favorite:currentFavorites.has(Number(block.id))}}).filter((x:any)=>x.plan).sort((a,b)=>Number(b.favorite)-Number(a.favorite)||String(b.plan.plan_date).localeCompare(String(a.plan.plan_date)))
}

function makeModal(){
 let overlay=document.querySelector<HTMLElement>('.reusePickerOverlay');if(overlay)return overlay;
 overlay=document.createElement('div');overlay.className='reusePickerOverlay';overlay.innerHTML=`<div class="reusePickerCard"><div class="reusePickerHead"><div><small>SAVED TRAINING MENU</small><h2>保存済みメニューから選択</h2></div><button type="button" class="reuseClose">閉じる</button></div><div class="reuseFilters"><select class="reuseCat"><option value="">全Team Category</option></select><select class="reuseTr"><option value="">全TRカテゴリー</option></select><input class="reuseSearch" placeholder="メニュー名称・テーマを検索"><label><input type="checkbox" class="reuseFavOnly"> ★お気に入りのみ</label></div><div class="reuseCount"></div><div class="reuseList"></div></div>`;
 overlay.addEventListener('click',e=>{if(e.target===overlay)closePicker()});overlay.querySelector('.reuseClose')?.addEventListener('click',closePicker);
 for(const sel of ['.reuseCat','.reuseTr','.reuseFavOnly'])overlay.querySelector(sel)?.addEventListener('change',renderPicker);
 overlay.querySelector('.reuseSearch')?.addEventListener('input',renderPicker);
 document.body.appendChild(overlay);return overlay
}

function closePicker(){document.querySelector('.reusePickerOverlay')?.remove();pickerTarget=null}

function currentCategoryId(){const el=fieldByLabel('Team Category') as HTMLSelectElement|null;return el?.value||''}

async function openPicker(target:HTMLElement|null){
 pickerTarget=target;await loadSavedItems();const overlay=makeModal();
 const cat=overlay.querySelector<HTMLSelectElement>('.reuseCat')!;cat.innerHTML='<option value="">全Team Category</option>'+currentCategories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
 const current=currentCategoryId();if(current)cat.value=current;
 const tr=overlay.querySelector<HTMLSelectElement>('.reuseTr')!;const trs=Array.from(new Set(currentItems.map(x=>x.block.tr_category||x.block.block_label||'TR'))).sort();tr.innerHTML='<option value="">全TRカテゴリー</option>'+trs.map(x=>`<option>${escapeHtml(String(x))}</option>`).join('');
 renderPicker()
}

function escapeHtml(s:string){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c))}

function renderPicker(){
 const overlay=document.querySelector<HTMLElement>('.reusePickerOverlay');if(!overlay)return;
 const cat=(overlay.querySelector<HTMLSelectElement>('.reuseCat')?.value||'');const tr=(overlay.querySelector<HTMLSelectElement>('.reuseTr')?.value||'');const q=(overlay.querySelector<HTMLInputElement>('.reuseSearch')?.value||'').trim().toLowerCase();const fav=!!overlay.querySelector<HTMLInputElement>('.reuseFavOnly')?.checked;
 const items=currentItems.filter(x=>(!cat||String(x.plan.category_id)===cat)&&(!tr||(x.block.tr_category||x.block.block_label||'TR')===tr)&&(!fav||x.favorite)&&(!q||`${x.block.menu_name||x.block.content||''} ${x.block.theme||''} ${x.block.objective||''}`.toLowerCase().includes(q)));
 const count=overlay.querySelector<HTMLElement>('.reuseCount');if(count)count.textContent=`${items.length}件`;
 const list=overlay.querySelector<HTMLElement>('.reuseList');if(!list)return;list.innerHTML='';
 if(!items.length){list.innerHTML='<div class="reuseEmpty">条件に一致する保存済みメニューはありません。</div>';return}
 for(const item of items){const b=item.block;const card=document.createElement('article');card.className='reuseItem';card.innerHTML=`<div class="reuseItemTop"><span class="reuseTag">${escapeHtml(b.tr_category||b.block_label||'TR')}</span><button type="button" class="reuseStar ${item.favorite?'on':''}" title="お気に入り">★</button></div><h3>${escapeHtml(b.menu_name||b.content||'名称未設定')}</h3><p>${escapeHtml(b.theme||'テーマ未設定')}</p><small>${escapeHtml(item.categoryName)} / ${escapeHtml(item.plan.plan_date||'-')}${b.duration_minutes!=null?` / ${b.duration_minutes}分`:''}</small><div class="reuseActions"><button type="button" class="reuseAdopt">そのまま採用</button><button type="button" class="reuseEdit">編集して採用</button></div>`;
 card.querySelector('.reuseStar')?.addEventListener('click',()=>toggleFavorite(item));card.querySelector('.reuseAdopt')?.addEventListener('click',()=>adoptItem(item,false));card.querySelector('.reuseEdit')?.addEventListener('click',()=>adoptItem(item,true));list.appendChild(card)}
}

async function toggleFavorite(item:SavedItem){
 const {data:{user}}=await supabase.auth.getUser();if(!user)return;
 if(item.favorite){await supabase.from('training_menu_favorites').delete().eq('training_plan_block_id',item.block.id).eq('user_id',user.id);item.favorite=false;currentFavorites.delete(Number(item.block.id))}
 else{await supabase.from('training_menu_favorites').insert({training_plan_block_id:item.block.id,user_id:user.id});item.favorite=true;currentFavorites.add(Number(item.block.id))}
 currentItems.sort((a,b)=>Number(b.favorite)-Number(a.favorite)||String(b.plan.plan_date).localeCompare(String(a.plan.plan_date)));renderPicker()
}

function newTargetEditor(){
 const pm=document.querySelector<HTMLElement>('.pm');const section=Array.from(pm?.querySelectorAll<HTMLElement>('.sectionTitle')||[]).find(x=>(x.querySelector('h3')?.textContent||'').includes('TRメニュー構成'));const add=Array.from(section?.querySelectorAll<HTMLButtonElement>('button')||[]).find(x=>(x.textContent||'').includes('メニュー追加'));add?.click();return new Promise<HTMLElement|null>(resolve=>window.setTimeout(()=>{scheduleEnsure();const list=Array.from(document.querySelectorAll<HTMLElement>('.pm .menuEditor'));resolve(list[list.length-1]||null)},60))
}

async function adoptItem(item:SavedItem,editAfter:boolean){
 const editor=pickerTarget||await newTargetEditor();if(!editor)return;const b=item.block;
 const sel=editor.querySelector<HTMLSelectElement>('.menuTop select');if(sel)nativeSet(sel,b.tr_category||b.block_label||'TR');
 const input=(ph:string)=>editor.querySelector<HTMLInputElement>(`input[placeholder="${ph}"]`);const area=(ph:string)=>editor.querySelector<HTMLTextAreaElement>(`textarea[placeholder="${ph}"]`);
 const vals:[[HTMLInputElement|HTMLTextAreaElement|null,string]]|any=[
  [input('メニュー名称'),b.menu_name||b.content||''],[input('テーマ'),b.theme||''],[input('分'),b.duration_minutes==null?'':String(b.duration_minutes)],
  [area('目的'),b.objective||''],[area('オーガナイズ'),b.organization||''],[area('メニュー詳細'),b.content||''],[area('コーチングポイント'),b.coaching_points||''],[area('負荷・回数・セット・レスト'),b.load_notes||'']
 ];for(const [el,v] of vals)if(el)nativeSet(el,v);
 sourceByEditor.set(editor,Number(b.id));editor.dataset.reuseSourceBlockId=String(b.id);
 let note=editor.querySelector<HTMLElement>('.reuseSourceNote');if(!note){note=document.createElement('div');note.className='reuseSourceNote';editor.appendChild(note)}note.textContent=`保存済みメニューから採用：${item.categoryName} / ${item.plan.plan_date}`;
 closePicker();scheduleEnsure();if(editAfter){window.setTimeout(()=>{editor.scrollIntoView({behavior:'smooth',block:'center'});input('メニュー名称')?.focus()},80)}
}

function snapshotReuse():SaveReuse[]{
 const editors=Array.from(document.querySelectorAll<HTMLElement>('.pm .menuEditor')).filter(meaningfulEditor);const out:SaveReuse[]=[];editors.forEach((e,ordinal)=>{const id=sourceByEditor.get(e)||Number(e.dataset.reuseSourceBlockId||0);if(id)out.push({sourceBlockId:id,ordinal})});return out
}

function localDateValue(v:string){const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

async function cloneSourceAttachments(snapshot:SaveReuse[],attempt=0):Promise<void>{
 if(!snapshot.length||attempt>5)return;const cat=Number((fieldByLabel('Team Category') as HTMLSelectElement|null)?.value||0);const title=String((fieldByLabel('タイトル') as HTMLInputElement|null)?.value||'').trim();const starts=String((fieldByLabel('開始') as HTMLInputElement|null)?.value||'');const date=localDateValue(starts);if(!cat||!title||!date)return;
 const {data:plan}=await supabase.from('training_plans').select('id').eq('category_id',cat).eq('title',title).eq('plan_date',date).order('id',{ascending:false}).limit(1).maybeSingle();if(!plan){window.setTimeout(()=>void cloneSourceAttachments(snapshot,attempt+1),450);return}
 const {data:targets}=await supabase.from('training_plan_blocks').select('id,sort_order').eq('training_plan_id',plan.id).order('sort_order');if(!targets||targets.length<=Math.max(...snapshot.map(x=>x.ordinal))){window.setTimeout(()=>void cloneSourceAttachments(snapshot,attempt+1),450);return}
 const {data:{user}}=await supabase.auth.getUser();if(!user)return;
 for(const s of snapshot){const target=targets[s.ordinal];if(!target)continue;const [{data:src},{data:existing}]=await Promise.all([supabase.from('training_plan_attachments').select('*').eq('training_plan_block_id',s.sourceBlockId),supabase.from('training_plan_attachments').select('file_name,file_size').eq('training_plan_block_id',target.id)]);for(const a of src||[]){if((existing||[]).some((x:any)=>x.file_name===a.file_name&&Number(x.file_size||0)===Number(a.file_size||0)))continue;const dl=await supabase.storage.from('training-plan-files').download(a.storage_path);if(dl.error||!dl.data)continue;const safe=String(a.file_name).replace(/[^A-Za-z0-9._-]/g,'_');const path=`${plan.id}/block-${target.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-copy-${safe}`;const up=await supabase.storage.from('training-plan-files').upload(path,dl.data,{contentType:a.mime_type||undefined,upsert:false});if(up.error)continue;await supabase.from('training_plan_attachments').insert({training_plan_id:plan.id,training_plan_block_id:target.id,storage_path:path,file_name:a.file_name,mime_type:a.mime_type,file_size:a.file_size,uploaded_by:user.id})}}
}

document.addEventListener('click',e=>{
 const btn=(e.target as HTMLElement|null)?.closest<HTMLButtonElement>('button');if(!btn)return;const txt=(btn.textContent||'').trim();
 if(txt.includes('Training/Gameを作成')||txt.includes('新規作成')||btn.closest('.eventGrid'))scheduleEnsure();
 if(btn.closest('.saveBar')&&(txt==='保存'||txt.includes('変更を保存')||txt.includes('保存中'))){const snap=snapshotReuse();if(snap.length)window.setTimeout(()=>void cloneSourceAttachments(snap),500)}
},true);

window.addEventListener('ktrs-schedule-category',scheduleEnsure);
window.addEventListener('load',()=>window.setTimeout(scheduleEnsure,350),{once:true});

const style=document.createElement('style');style.textContent=`
.reuseLibraryButton,.reuseIntoButton{white-space:nowrap}.reuseIntoButton{font-size:11px!important;padding:6px 8px!important}.reuseSourceNote{margin-top:7px;padding:6px 8px;border-radius:7px;background:#eef7ff;color:#2b6595;font-size:10px;font-weight:700}.reusePickerOverlay{position:fixed;inset:0;z-index:12000;background:rgba(10,26,40,.48);display:grid;place-items:center;padding:18px}.reusePickerCard{width:min(980px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;padding:18px;box-shadow:0 18px 55px rgba(20,43,65,.2)}.reusePickerHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.reusePickerHead small{font-size:9px;letter-spacing:.15em;color:#8191a2;font-weight:800}.reusePickerHead h2{margin:3px 0 12px}.reuseClose{border:1px solid #d5e3ef!important;background:#f5f8fb!important;color:#425d75!important}.reuseFilters{display:grid;grid-template-columns:180px 160px minmax(180px,1fr) auto;gap:8px;align-items:center;margin:8px 0}.reuseFilters select,.reuseFilters input{width:100%;box-sizing:border-box}.reuseFilters label{display:flex;align-items:center;gap:5px;font-size:11px;white-space:nowrap}.reuseCount{font-size:11px;color:#75879a;margin:8px 0}.reuseList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.reuseItem{border:1px solid #dfe8f0;border-radius:12px;padding:11px;background:#fff}.reuseItemTop{display:flex;justify-content:space-between;align-items:center}.reuseTag{display:inline-flex;background:#edf5fc;color:#23699f;border-radius:999px;padding:4px 7px;font-size:10px;font-weight:800}.reuseStar{border:0!important;background:transparent!important;color:#b8c2cc!important;font-size:18px!important;padding:0!important}.reuseStar.on{color:#e4a800!important}.reuseItem h3{margin:7px 0 3px;font-size:14px}.reuseItem p{margin:0 0 5px;font-size:12px;color:#53697d}.reuseItem small{font-size:10px;color:#83909c}.reuseActions{display:flex;gap:6px;margin-top:9px}.reuseActions button{flex:1;font-size:11px;padding:7px 8px}.reuseAdopt{background:#1769aa!important;color:#fff!important;border-color:#1769aa!important}.reuseEmpty{grid-column:1/-1;padding:28px;text-align:center;color:#81909e}@media(max-width:760px){.reuseFilters{grid-template-columns:1fr}.reuseList{grid-template-columns:1fr}}
`;document.head.appendChild(style);
