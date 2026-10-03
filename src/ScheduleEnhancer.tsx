import React,{useEffect,useMemo,useState} from 'react';
import {createRoot,Root} from 'react-dom/client';
import {supabase} from './supabase';

type Mode='training'|'game';
const pad=(n:number)=>String(n).padStart(2,'0');
const isoDate=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const monthTitle=(d:Date)=>`${d.getFullYear()}年 ${d.getMonth()+1}月`;
const timeOf=(v?:string|null)=>v?new Date(v).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',hour12:false}):'';
const monthCells=(month:Date)=>{const first=new Date(month.getFullYear(),month.getMonth(),1);const start=new Date(first);start.setDate(1-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})};

function Calendar({mode}:{mode:Mode}){
 const now=new Date();
 const [month,setMonth]=useState(new Date(now.getFullYear(),now.getMonth(),1));
 const [rows,setRows]=useState<any[]>([]);
 const [msg,setMsg]=useState('');
 const [editing,setEditing]=useState<any|null>(null);
 const trainingBlank={title:'',starts_at:'',ends_at:'',venue:'',training_theme:'',details:'',gps_enabled:false};
 const gameBlank={schedule_date:isoDate(now),start_time:'',opponent:'',competition_name:'',location:'',notes:''};
 const [form,setForm]=useState<any>(mode==='training'?trainingBlank:gameBlank);
 const cells=useMemo(()=>monthCells(month),[month]);

 async function load(){
   if(mode==='training'){
     const {data,error}=await supabase.from('schedule_events').select('*').eq('event_type','training').order('starts_at');
     if(error)setMsg(error.message);else setRows(data||[]);
   }else{
     const {data,error}=await supabase.from('player_schedule').select('id,schedule_date,starts_at,event_type,opponent,competition_name,location,notes,title,entry_label').is('player_id',null).eq('event_type','Game').order('schedule_date').order('starts_at');
     if(error)setMsg(error.message);else setRows(data||[]);
   }
 }
 useEffect(()=>{load()},[mode]);

 function reset(){setEditing(null);setForm(mode==='training'?{...trainingBlank}:{...gameBlank,schedule_date:isoDate(new Date())})}
 function editRow(r:any){
   setEditing(r);
   if(mode==='training')setForm({title:r.title||'',starts_at:r.starts_at?new Date(r.starts_at).toISOString().slice(0,16):'',ends_at:r.ends_at?new Date(r.ends_at).toISOString().slice(0,16):'',venue:r.venue||'',training_theme:r.training_theme||'',details:r.details||'',gps_enabled:!!r.gps_enabled});
   else setForm({schedule_date:r.schedule_date||'',start_time:r.starts_at?timeOf(r.starts_at):'',opponent:r.opponent||'',competition_name:r.competition_name||'',location:r.location||'',notes:r.notes||''});
   requestAnimationFrame(()=>{const el=document.querySelector(mode==='training'?'#ktrsTrainingAdd':'#ktrsGameAdd') as HTMLDetailsElement|null;if(el)el.open=true});
 }
 async function save(){
   const {data:{user}}=await supabase.auth.getUser();if(!user)return;
   if(mode==='training'){
     if(!form.title||!form.starts_at){setMsg('タイトルと開始日時を入力してください。');return}
     const payload={event_type:'training',title:form.title,starts_at:new Date(form.starts_at).toISOString(),ends_at:form.ends_at?new Date(form.ends_at).toISOString():null,venue:form.venue||null,opponent:null,competition_name:null,training_theme:form.training_theme||null,details:form.details||null,gps_enabled:!!form.gps_enabled,created_by:user.id};
     const {error}=editing?await supabase.from('schedule_events').update(payload).eq('id',editing.id):await supabase.from('schedule_events').insert(payload);
     setMsg(error?error.message:(editing?'予定を更新しました。':'予定を追加しました。'));if(!error){reset();await load()}
   }else{
     if(!form.schedule_date){setMsg('日付を入力してください。');return}
     const startsAt=form.start_time?new Date(`${form.schedule_date}T${form.start_time}:00+09:00`).toISOString():null;
     const payload={schedule_date:form.schedule_date,starts_at:startsAt,event_type:'Game',entry_label:'Game',category:'Game',title:form.opponent?`vs ${form.opponent}`:'Game',opponent:form.opponent||null,competition_name:form.competition_name||null,location:form.location||null,notes:form.notes||null,created_by:user.id};
     const {error}=editing?await supabase.from('player_schedule').update(payload).eq('id',editing.id):await supabase.from('player_schedule').insert(payload);
     setMsg(error?error.message:(editing?'Game予定を更新しました。':'Game予定を追加しました。'));if(!error){reset();await load()}
   }
 }
 async function remove(){
   if(!editing||!confirm('この予定を削除しますか？'))return;
   const table=mode==='training'?'schedule_events':'player_schedule';
   const {error}=await supabase.from(table).delete().eq('id',editing.id);
   setMsg(error?error.message:'削除しました。');if(!error){reset();await load()}
 }
 function dayKey(r:any){return mode==='training'?String(r.starts_at||'').slice(0,10):String(r.schedule_date||'')}
 function openAnalysis(r:any){
   if(mode!=='game')return;
   const cards=Array.from(document.querySelectorAll<HTMLButtonElement>('.gameAnalysisCard'));
   const target=cards.find(b=>b.textContent?.includes(r.schedule_date)&&(!r.opponent||b.textContent?.includes(r.opponent)));
   target?.click();
 }
 const inMonth=(d:Date)=>d.getMonth()===month.getMonth();
 return <div className="ktrsCalendarWrap">
   <style>{css}</style>
   <details id={mode==='training'?'ktrsTrainingAdd':'ktrsGameAdd'} className="ktrsAddFold" onToggle={e=>{if(!(e.currentTarget as HTMLDetailsElement).open&&!editing)reset()}}>
     <summary><b>{editing?'予定を編集':'予定を追加'}</b><span>クリックで展開</span></summary>
     <div className="ktrsAddBody">
       {mode==='training'?<><div className="ktrsGrid2"><input placeholder="タイトル" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/><input type="datetime-local" value={form.ends_at||''} onChange={e=>setForm({...form,ends_at:e.target.value})}/><input placeholder="場所" value={form.venue||''} onChange={e=>setForm({...form,venue:e.target.value})}/><input placeholder="練習テーマ" value={form.training_theme||''} onChange={e=>setForm({...form,training_theme:e.target.value})}/></div><textarea placeholder="詳細" value={form.details||''} onChange={e=>setForm({...form,details:e.target.value})}/><label className="ktrsCheck"><input type="checkbox" checked={!!form.gps_enabled} onChange={e=>setForm({...form,gps_enabled:e.target.checked})}/> GPS測定あり</label></>:<><div className="ktrsGrid2"><input type="date" value={form.schedule_date} onChange={e=>setForm({...form,schedule_date:e.target.value})}/><input type="time" value={form.start_time||''} onChange={e=>setForm({...form,start_time:e.target.value})}/><input placeholder="対戦相手" value={form.opponent||''} onChange={e=>setForm({...form,opponent:e.target.value})}/><input placeholder="大会名" value={form.competition_name||''} onChange={e=>setForm({...form,competition_name:e.target.value})}/><input placeholder="会場" value={form.location||''} onChange={e=>setForm({...form,location:e.target.value})}/></div><textarea placeholder="備考" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></>}
       <div className="ktrsActions"><button onClick={save}>{editing?'変更を保存':'追加'}</button>{editing&&<><button className="soft" onClick={reset}>キャンセル</button><button className="delete" onClick={remove}>削除</button></>}</div>
     </div>
   </details>
   {msg&&<div className="ktrsNotice">{msg}</div>}
   <div className="ktrsMonthHead"><button className="soft" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹ 前月</button><h2>{monthTitle(month)}</h2><div><button className="soft" onClick={()=>setMonth(new Date(now.getFullYear(),now.getMonth(),1))}>今月</button><button className="soft" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>翌月 ›</button></div></div>
   <div className="ktrsWeek"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div>
   <div className="ktrsMonthGrid">{cells.map(d=>{const key=isoDate(d);const events=rows.filter(r=>dayKey(r)===key);const today=key===isoDate(now);return <div className={'ktrsDay '+(!inMonth(d)?'outside ':'')+(today?'today':'')} key={key}><div className="ktrsDayNum">{d.getDate()}</div><div className="ktrsDayEvents">{events.map(r=><button key={r.id} className={'ktrsEvent '+mode} onClick={()=>mode==='game'?openAnalysis(r):editRow(r)} onDoubleClick={()=>editRow(r)} title={mode==='game'?'クリック：試合分析 / ダブルクリック：予定編集':'クリック：予定編集'}><b>{mode==='training'?(timeOf(r.starts_at)||'TR'):(r.starts_at?timeOf(r.starts_at):'Game')}</b><span>{mode==='training'?(r.title||'Training'):(r.opponent?'vs '+r.opponent:(r.competition_name||'Game'))}</span></button>)}</div></div>})}</div>
   {mode==='game'&&<p className="ktrsHint">Game予定をクリックすると試合分析を開きます。予定自体を編集する場合はダブルクリックしてください。</p>}
 </div>;
}

const css=`
.ktrsCalendarWrap{display:grid;gap:12px;margin-bottom:16px}.ktrsAddFold{border:1px solid #e1e9f1;border-radius:14px;background:#fff;overflow:hidden}.ktrsAddFold>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer}.ktrsAddFold>summary::-webkit-details-marker{display:none}.ktrsAddFold>summary span{font-size:12px;color:#748698}.ktrsAddFold>summary:after{content:'＋';margin-left:10px;color:#7890a7}.ktrsAddFold[open]>summary:after{content:'−'}.ktrsAddBody{border-top:1px solid #edf1f5;padding:14px 16px;display:grid;gap:10px}.ktrsGrid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ktrsAddBody input,.ktrsAddBody textarea{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid #d9e3ec;border-radius:9px;font:inherit}.ktrsAddBody textarea{min-height:84px;resize:vertical}.ktrsCheck{display:flex;align-items:center;gap:7px}.ktrsCheck input{width:auto}.ktrsActions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.ktrsActions button,.ktrsMonthHead button{border:1px solid #c9dff2;background:#dcecff;color:#245985;border-radius:9px;padding:8px 12px;cursor:pointer}.ktrsActions .soft,.ktrsMonthHead .soft{background:#f2f6fa;border-color:#dce5ed;color:#546b80}.ktrsActions .delete{background:#f8dddd;border-color:#efc4c4;color:#9b3b3b}.ktrsNotice{padding:10px 12px;border-radius:10px;background:#eef6ff;color:#335f87}.ktrsMonthHead{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}.ktrsMonthHead h2{text-align:center;margin:0;font-size:20px}.ktrsMonthHead>div{display:flex;gap:6px}.ktrsWeek,.ktrsMonthGrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}.ktrsWeek{background:#f5f8fb;border:1px solid #e1e8ef;border-bottom:0;border-radius:12px 12px 0 0}.ktrsWeek span{text-align:center;padding:8px;font-size:12px;font-weight:700;color:#667b8e}.ktrsMonthGrid{border-left:1px solid #e1e8ef;border-top:1px solid #e1e8ef}.ktrsDay{min-height:112px;background:#fff;border-right:1px solid #e1e8ef;border-bottom:1px solid #e1e8ef;padding:7px;overflow:hidden}.ktrsDay.outside{background:#f8fafc;color:#9caab7}.ktrsDay.today{box-shadow:inset 0 0 0 2px #9ec9ee}.ktrsDayNum{font-size:12px;font-weight:800;margin-bottom:5px}.ktrsDayEvents{display:grid;gap:4px}.ktrsEvent{border:0;border-radius:7px;padding:5px 6px;text-align:left;display:grid;gap:1px;cursor:pointer;min-width:0}.ktrsEvent.training{background:#e7f2ff;color:#245985}.ktrsEvent.game{background:#eaf6ee;color:#287248}.ktrsEvent b{font-size:10px}.ktrsEvent span{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ktrsHint{font-size:11px;color:#748698;margin:0}.ktrsScheduleLegacyHidden{display:none!important}@media(max-width:760px){.ktrsGrid2{grid-template-columns:1fr}.ktrsMonthHead{grid-template-columns:1fr}.ktrsMonthHead h2{order:-1}.ktrsMonthHead>div{justify-content:flex-end}.ktrsDay{min-height:86px;padding:4px}.ktrsEvent b{font-size:9px}.ktrsEvent span{font-size:9px}}
`;

const roots=new Map<HTMLElement,Root>();
function mount(){
 const headings=Array.from(document.querySelectorAll<HTMLElement>('.title h1'));
 headings.forEach(h=>{
   const text=(h.textContent||'').trim();
   const mode:Mode|null=text==='SCHEDULE / Training'?'training':text==='SCHEDULE / Games'?'game':null;
   if(!mode)return;
   const section=h.closest('section') as HTMLElement|null;if(!section)return;
   let host=section.querySelector<HTMLElement>(`:scope > .ktrsScheduleEnhancer[data-mode="${mode}"]`);
   if(!host){host=document.createElement('div');host.className='ktrsScheduleEnhancer';host.dataset.mode=mode;const title=h.closest('.title');title?.insertAdjacentElement('afterend',host);roots.set(host,createRoot(host));roots.get(host)!.render(<Calendar mode={mode}/>)}
   if(mode==='training'){
     const direct=Array.from(section.children).find(el=>el!==host&&el.tagName==='DIV'&&el.querySelector('.eventGrid')) as HTMLElement|undefined;
     if(direct){const form=direct.querySelector<HTMLElement>(':scope > .panel.form');const grid=direct.querySelector<HTMLElement>(':scope > .eventGrid');if(form)form.classList.add('ktrsScheduleLegacyHidden');if(grid)grid.classList.add('ktrsScheduleLegacyHidden')}
   }else{
     const list=section.querySelector<HTMLElement>('.gameAnalysisList');if(list)list.classList.add('ktrsScheduleLegacyHidden');
   }
 });
}
const observer=new MutationObserver(()=>mount());observer.observe(document.body,{childList:true,subtree:true});mount();
