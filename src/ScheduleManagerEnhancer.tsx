import React,{useEffect,useMemo,useState} from 'react';
import {createRoot,Root} from 'react-dom/client';
import {supabase} from './supabase';

type Player={player_id:string;full_name:string;school_grade:number|null;position:string|null};
const blank:any={event_type:'training',title:'',starts_at:'',ends_at:'',venue:'',opponent:'',competition_name:'',training_theme:'',details:'',gps_enabled:false};

function ScheduleManager(){
 const [rows,setRows]=useState<any[]>([]),[players,setPlayers]=useState<Player[]>([]),[counts,setCounts]=useState<Record<number,number>>({});
 const [form,setForm]=useState<any>(blank),[edit,setEdit]=useState<any|null>(null),[selected,setSelected]=useState<string[]>([]),[search,setSearch]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{loadBase()},[]);
 async function loadBase(){
   const [{data:r,error:re},{data:p,error:pe},{data:x,error:xe}]=await Promise.all([
     supabase.from('schedule_events').select('*').order('starts_at',{ascending:true}),
     supabase.from('player_directory').select('player_id,full_name,school_grade,position').eq('is_hidden',false).order('school_grade',{ascending:false}).order('full_name'),
     supabase.from('schedule_event_participants').select('event_id,player_id')
   ]);
   if(re||pe||xe){setMsg(re?.message||pe?.message||xe?.message||'読み込みに失敗しました。');return}
   setRows(r||[]);setPlayers((p||[]) as Player[]);const map:Record<number,number>={};(x||[]).forEach((v:any)=>map[v.event_id]=(map[v.event_id]||0)+1);setCounts(map)
 }
 const filtered=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return players;return players.filter(p=>`${p.full_name} ${p.school_grade??''} ${p.position??''}`.toLowerCase().includes(q))},[players,search]);
 function toggle(id:string){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
 async function pick(r:any){setEdit(r);setForm({...r,starts_at:r.starts_at?new Date(r.starts_at).toISOString().slice(0,16):'',ends_at:r.ends_at?new Date(r.ends_at).toISOString().slice(0,16):''});setSearch('');const {data,error}=await supabase.from('schedule_event_participants').select('player_id').eq('event_id',r.id);if(error)setMsg(error.message);else setSelected((data||[]).map((x:any)=>x.player_id))}
 function reset(){setEdit(null);setForm(blank);setSelected([]);setSearch('');setMsg('')}
 async function save(){
   if(!form.title||!form.starts_at){setMsg('タイトルと開始日時を入力してください。');return}
   setBusy(true);setMsg('');const {data:{user}}=await supabase.auth.getUser();if(!user){setBusy(false);return}
   const payload:any={event_type:form.event_type,title:form.title,starts_at:new Date(form.starts_at).toISOString(),ends_at:form.ends_at?new Date(form.ends_at).toISOString():null,venue:form.venue||null,opponent:form.opponent||null,competition_name:form.competition_name||null,training_theme:form.training_theme||null,details:form.details||null,gps_enabled:!!form.gps_enabled,created_by:user.id,updated_at:new Date().toISOString()};
   let eventId=edit?.id as number|undefined;let error:any=null;
   if(edit){({error}=await supabase.from('schedule_events').update(payload).eq('id',edit.id))}
   else{const res=await supabase.from('schedule_events').insert(payload).select('id').single();error=res.error;eventId=res.data?.id}
   if(error||!eventId){setMsg(error?.message||'予定を保存できませんでした。');setBusy(false);return}
   const del=await supabase.from('schedule_event_participants').delete().eq('event_id',eventId);if(del.error){setMsg(del.error.message);setBusy(false);return}
   if(selected.length){const ins=await supabase.from('schedule_event_participants').insert(selected.map(player_id=>({event_id:eventId,player_id})));if(ins.error){setMsg(ins.error.message);setBusy(false);return}}
   setMsg(edit?'予定を更新しました。':'予定を追加しました。');reset();await loadBase();setBusy(false)
 }
 async function remove(){if(!edit||!confirm('この予定を削除しますか？'))return;setBusy(true);const {error}=await supabase.from('schedule_events').delete().eq('id',edit.id);setMsg(error?error.message:'予定を削除しました。');if(!error){reset();await loadBase()}setBusy(false)}
 return <div className="ktrsScheduleManager">
   <div className="panel form scheduleEditor"><div className="scheduleEditorHead"><div><small>SCHEDULE</small><h3>{edit?'予定を編集':'予定を作成'}</h3></div>{edit&&<button className="secondary" onClick={reset}>新規作成へ</button>}</div>
   <div className="grid2"><label>種別<select value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})}><option value="training">Training</option><option value="friendly_match">Training Match</option><option value="official_match">Game</option><option value="measurement">測定</option><option value="medical_check">メディカルチェック</option><option value="prevention">傷害予防</option><option value="other">その他</option></select></label><label>タイトル<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="例：放課後TR / vs ○○高校"/></label><label>開始<input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></label><label>終了<input type="datetime-local" value={form.ends_at||''} onChange={e=>setForm({...form,ends_at:e.target.value})}/></label><label>場所<input value={form.venue||''} onChange={e=>setForm({...form,venue:e.target.value})}/></label><label>対戦相手<input value={form.opponent||''} onChange={e=>setForm({...form,opponent:e.target.value})}/></label><label>大会名<input value={form.competition_name||''} onChange={e=>setForm({...form,competition_name:e.target.value})}/></label><label>Trainingテーマ<input value={form.training_theme||''} onChange={e=>setForm({...form,training_theme:e.target.value})}/></label></div>
   <textarea placeholder="詳細" value={form.details||''} onChange={e=>setForm({...form,details:e.target.value})}/><label className="gpsCheck"><input type="checkbox" checked={!!form.gps_enabled} onChange={e=>setForm({...form,gps_enabled:e.target.checked})}/> GPS測定あり</label>
   <div className="participantPanel"><div className="participantHead"><div><b>参加選手</b><span>{selected.length}名選択中</span></div><div className="participantActions"><button type="button" className="secondary" onClick={()=>setSelected(players.map(p=>p.player_id))}>全選手を選択</button><button type="button" className="secondary" onClick={()=>setSelected(s=>Array.from(new Set([...s,...filtered.map(p=>p.player_id)])))}>検索結果を選択</button><button type="button" className="secondary" onClick={()=>setSelected([])}>選択解除</button></div></div><input className="participantSearch" value={search} onChange={e=>setSearch(e.target.value)} placeholder="選手名・学年・ポジションで検索"/><div className="participantList">{filtered.map(p=><label key={p.player_id} className={selected.includes(p.player_id)?'selected':''}><input type="checkbox" checked={selected.includes(p.player_id)} onChange={()=>toggle(p.player_id)}/><span><b>{p.full_name}</b><small>{p.school_grade??'-'}年 / {p.position||'-'}</small></span></label>)}</div></div>
   <div className="actions"><button disabled={busy} onClick={save}>{busy?'保存中...':edit?'変更を保存':'予定を追加'}</button>{edit&&<button disabled={busy} className="dangerBtn" onClick={remove}>削除</button>}</div></div>
   {msg&&<div className="notice">{msg}</div>}
   <div className="eventGrid">{rows.map(r=><button className="eventCard" key={r.id} onClick={()=>pick(r)}><b>{new Date(r.starts_at).toLocaleString('ja-JP')}</b><span>{r.title}</span><small>{r.event_type}{r.opponent?' / vs '+r.opponent:''} / 参加 {counts[r.id]||0}名</small></button>)}</div>
 </div>
}

let root:Root|null=null;let host:HTMLElement|null=null;
function mount(){
 const title=Array.from(document.querySelectorAll<HTMLElement>('.title h1')).find(h=>['SCHEDULE / Training','Schedule / Training/Game','SCHEDULE / Training/Game','TR Creation'].includes((h.textContent||'').trim()));
 const section=title?.closest('section') as HTMLElement|null;if(!section)return false;
 title!.textContent='Schedule / Training/Game';
 if(host&&host.isConnected)return true;if(root){try{root.unmount()}catch{}root=null}
 Array.from(section.children).forEach(el=>{const x=el as HTMLElement;if(!x.classList.contains('title')&&!x.classList.contains('ktrsScheduleHost'))x.style.display='none'});
 host=document.createElement('div');host.className='ktrsScheduleHost';title!.closest('.title')?.insertAdjacentElement('afterend',host);root=createRoot(host);root.render(<ScheduleManager/>);return true
}
function scheduleMount(){window.setTimeout(mount,0);window.setTimeout(mount,80);window.setTimeout(mount,220)}
document.addEventListener('click',e=>{const t=e.target as HTMLElement|null;const b=t?.closest('button');const txt=(b?.textContent||'').trim();if(txt==='Training'||txt==='Training/Game'||txt==='Menu Creation')scheduleMount()},{capture:true});
let tries=0;const timer=window.setInterval(()=>{tries++;if(mount()||tries>15)window.clearInterval(timer)},120);

const style=document.createElement('style');style.textContent=`
.scheduleEditorHead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.scheduleEditorHead small{font-size:10px;letter-spacing:.15em;color:#7c8da0;font-weight:800}.scheduleEditorHead h3{margin:3px 0}.participantPanel{margin-top:14px;border:1px solid #dce6ef;border-radius:12px;padding:12px;background:#f9fbfd}.participantHead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.participantHead>div:first-child{display:flex;align-items:baseline;gap:8px}.participantHead span{font-size:12px;color:#60758a}.participantActions{display:flex;gap:6px;flex-wrap:wrap}.participantActions button{padding:7px 9px;font-size:11px}.participantSearch{width:100%;margin:10px 0;padding:10px 12px;border:1px solid #d7e0eb;border-radius:9px}.participantList{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px;max-height:330px;overflow:auto}.participantList label{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center;padding:8px 9px;border:1px solid #e0e7ef;border-radius:9px;background:#fff;cursor:pointer}.participantList label.selected{background:#eaf4ff;border-color:#9bc5ed}.participantList span{display:grid}.participantList small{color:#718498}.gpsCheck{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center;gap:8px!important;margin-top:10px}.gpsCheck input{width:auto!important}@media(max-width:700px){.participantHead{align-items:stretch}.participantActions{width:100%}.participantActions button{flex:1}.participantList{grid-template-columns:1fr}}
`;document.head.appendChild(style);
