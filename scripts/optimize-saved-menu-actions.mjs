import {readFile,writeFile} from 'node:fs/promises';

const file=new URL('../src/TrainingMenuReuseEnhancer.ts',import.meta.url);
let source=await readFile(file,'utf8');
if(source.includes('KTRS_SAVED_MENU_ACTIONS_V1'))process.exit(0);

const oldCard=`<div class="reuseActions"><button type="button" class="reuseAdopt">そのまま採用</button><button type="button" class="reuseEdit">編集して採用</button></div>`;
const newCard=`<div class="reuseActions"><button type="button" class="reuseAdopt">そのまま採用</button><button type="button" class="reuseEdit">編集して採用</button><button type="button" class="reuseSavedEdit">編集</button><button type="button" class="reuseDelete">削除</button></div>`;
if(!source.includes(oldCard))throw new Error('Saved menu action block not found');
source=source.replace(oldCard,newCard);

const oldListeners=`card.querySelector('.reuseStar')?.addEventListener('click',()=>toggleFavorite(item));card.querySelector('.reuseAdopt')?.addEventListener('click',()=>adoptItem(item,false));card.querySelector('.reuseEdit')?.addEventListener('click',()=>adoptItem(item,true));list.appendChild(card)`;
const newListeners=`card.querySelector('.reuseStar')?.addEventListener('click',()=>toggleFavorite(item));card.querySelector('.reuseAdopt')?.addEventListener('click',()=>adoptItem(item,false));card.querySelector('.reuseEdit')?.addEventListener('click',()=>adoptItem(item,true));card.querySelector('.reuseSavedEdit')?.addEventListener('click',()=>openSavedMenuEdit(item));card.querySelector('.reuseDelete')?.addEventListener('click',()=>void deleteSavedMenu(item));list.appendChild(card)`;
if(!source.includes(oldListeners))throw new Error('Saved menu listener block not found');
source=source.replace(oldListeners,newListeners);

const anchor='function newTargetEditor(){';
const idx=source.indexOf(anchor);
if(idx<0)throw new Error('newTargetEditor anchor not found');
const helpers=`/* KTRS_SAVED_MENU_ACTIONS_V1 */
function openSavedMenuEdit(item:SavedItem){
 const existing=document.querySelector('.reuseSavedEditOverlay');if(existing)existing.remove();
 const b=item.block;const overlay=document.createElement('div');overlay.className='reuseSavedEditOverlay';
 overlay.innerHTML=\`<div class="reuseSavedEditCard"><div class="reusePickerHead"><div><small>EDIT SAVED MENU</small><h2>保存済みメニューを編集</h2></div><button type="button" class="reuseSavedEditClose">閉じる</button></div><div class="reuseSavedEditGrid"><label>TRカテゴリー<input class="seTr" value="\${escapeHtml(String(b.tr_category||b.block_label||'TR'))}"></label><label>メニュー名称<input class="seName" value="\${escapeHtml(String(b.menu_name||''))}"></label><label>テーマ<input class="seTheme" value="\${escapeHtml(String(b.theme||''))}"></label><label>時間（分）<input class="seMinutes" type="number" min="0" value="\${b.duration_minutes??''}"></label><label class="wide">目的<textarea class="seObjective">\${escapeHtml(String(b.objective||''))}</textarea></label><label class="wide">オーガナイズ<textarea class="seOrg">\${escapeHtml(String(b.organization||''))}</textarea></label><label class="wide">メニュー詳細<textarea class="seContent">\${escapeHtml(String(b.content||''))}</textarea></label><label class="wide">コーチングポイント<textarea class="seCoach">\${escapeHtml(String(b.coaching_points||''))}</textarea></label><label class="wide">負荷・回数・セット・レスト<textarea class="seLoad">\${escapeHtml(String(b.load_notes||''))}</textarea></label></div><div class="reuseSavedEditMsg"></div><div class="reuseSavedEditActions"><button type="button" class="reuseSavedEditSave">保存</button><button type="button" class="reuseSavedEditCancel soft">キャンセル</button></div></div>\`;
 const close=()=>overlay.remove();overlay.addEventListener('click',e=>{if(e.target===overlay)close()});overlay.querySelector('.reuseSavedEditClose')?.addEventListener('click',close);overlay.querySelector('.reuseSavedEditCancel')?.addEventListener('click',close);
 overlay.querySelector('.reuseSavedEditSave')?.addEventListener('click',async()=>{
   const get=(s:string)=>(overlay.querySelector<HTMLInputElement|HTMLTextAreaElement>(s)?.value||'').trim();
   const name=get('.seName');if(!name){const m=overlay.querySelector<HTMLElement>('.reuseSavedEditMsg');if(m)m.textContent='メニュー名称を入力してください。';return}
   const minutesRaw=get('.seMinutes');const payload={tr_category:get('.seTr')||'TR',menu_name:name,theme:get('.seTheme')||null,duration_minutes:minutesRaw===''?null:Math.max(0,Number(minutesRaw)||0),objective:get('.seObjective')||null,organization:get('.seOrg')||null,content:get('.seContent')||null,coaching_points:get('.seCoach')||null,load_notes:get('.seLoad')||null,updated_at:new Date().toISOString()};
   const save=overlay.querySelector<HTMLButtonElement>('.reuseSavedEditSave');if(save){save.disabled=true;save.textContent='保存中...'}
   const {error}=await supabase.from('training_plan_blocks').update(payload).eq('id',b.id);
   if(error){const m=overlay.querySelector<HTMLElement>('.reuseSavedEditMsg');if(m)m.textContent='保存できませんでした：'+error.message;if(save){save.disabled=false;save.textContent='保存'};return}
   Object.assign(item.block,payload);close();renderPicker();
 });
 document.body.appendChild(overlay)
}

async function deleteSavedMenu(item:SavedItem){
 const b=item.block;const name=String(b.menu_name||b.content||'名称未設定');
 if(!window.confirm(\`「\${name}」を削除します。\nこの操作は元に戻せません。よろしいですか？\`))return;
 const {data:attachments,error:attachmentError}=await supabase.from('training_plan_attachments').select('storage_path').eq('training_plan_block_id',b.id);
 if(attachmentError){window.alert('添付ファイル情報を確認できないため削除を中止しました：'+attachmentError.message);return}
 const paths=(attachments||[]).map((x:any)=>String(x.storage_path||'')).filter(Boolean);
 if(paths.length){const removed=await supabase.storage.from('training-plan-files').remove(paths);if(removed.error){window.alert('添付ファイルを削除できないため処理を中止しました：'+removed.error.message);return}}
 const {error}=await supabase.from('training_plan_blocks').delete().eq('id',b.id);
 if(error){window.alert('保存済みメニューを削除できませんでした：'+error.message);return}
 currentItems=currentItems.filter(x=>Number(x.block.id)!==Number(b.id));currentFavorites.delete(Number(b.id));renderPicker();
}

`;
source=source.slice(0,idx)+helpers+source.slice(idx);

source += `\nconst savedMenuActionStyle=document.createElement('style');savedMenuActionStyle.textContent=\`\n.reuseActions{display:flex;flex-wrap:wrap;gap:7px}.reuseSavedEdit{background:#eef7ff!important;color:#245d8d!important}.reuseDelete{background:#fff1f1!important;color:#b3261e!important;border:1px solid #efc6c2!important}.reuseSavedEditOverlay{position:fixed;inset:0;z-index:13000;background:rgba(10,26,40,.52);display:grid;place-items:center;padding:18px}.reuseSavedEditCard{width:min(760px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.22)}.reuseSavedEditGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.reuseSavedEditGrid label{display:grid;gap:5px;font-size:12px;font-weight:700;color:#334}.reuseSavedEditGrid .wide{grid-column:1/-1}.reuseSavedEditGrid input,.reuseSavedEditGrid textarea{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #ccd6df;border-radius:8px;font:inherit}.reuseSavedEditGrid textarea{min-height:72px;resize:vertical}.reuseSavedEditActions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.reuseSavedEditMsg{color:#b3261e;font-size:12px;font-weight:700;margin-top:10px}@media(max-width:640px){.reuseSavedEditGrid{grid-template-columns:1fr}.reuseSavedEditGrid .wide{grid-column:auto}.reuseSavedEditCard{padding:14px}}\`;document.head.appendChild(savedMenuActionStyle);\n`;

await writeFile(file,source,'utf8');
console.log('Applied saved menu edit/delete actions');
