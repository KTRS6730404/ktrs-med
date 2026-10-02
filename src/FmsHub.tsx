import React,{useEffect,useState} from 'react';
import {supabase} from './supabase';

type Tab='schedule'|'rehab'|'library'|'gps'|'video'|'prevention'|'report'|'team';
const statusLabel:any={needs_attention:'要対応',rehab:'リハビリ中',observation:'経過観察',available:'問題なし'};
function day(start?:string|null){if(!start)return null;const s=new Date(start+'T00:00:00');const n=new Date();s.setHours(0,0,0,0);n.setHours(0,0,0,0);return Math.floor((n.getTime()-s.getTime())/86400000)+1}
export default function FmsHub({initialTab='schedule',compact=false,pageTitle}:{initialTab?:Tab;compact?:boolean;pageTitle?:string}){
 const [tab,setTab]=useState<Tab>(initialTab);
 useEffect(()=>{setTab(initialTab)},[initialTab]);
 const tabs:[Tab,string][]=[['schedule','スケジュール'],['rehab','リハビリ・受診'],['library','メニュー'],['gps','GPS'],['video','動画'],['prevention','傷害予防'],['report','レポート'],['team','TEAM']];
 return <section><div className="title"><h1>{pageTitle||'KTRS FMS'}</h1></div>{!compact&&<div className="fmsTabs">{tabs.map(([k,l])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{l}</button>)}</div>}{tab==='schedule'&&<Schedule/>}{tab==='rehab'&&<Rehab/>}{tab==='library'&&<Library/>}{tab==='gps'&&<Gps/>}{tab==='video'&&<Video/>}{tab==='prevention'&&<Prevention/>}{tab==='report'&&<Report/>}{tab==='team'&&<Team/>}</section>
}
function Schedule(){
 const blank:any={event_type:'training',title:'',starts_at:'',ends_at:'',venue:'',opponent:'',competition_name:'',training_theme:'',details:'',gps_enabled:false};
 const [rows,setRows]=useState<any[]>([]),[form,setForm]=useState<any>(blank),[edit,setEdit]=useState<any>(null),[msg,setMsg]=useState('');
 const load=async()=>{const {data}=await supabase.from('schedule_events').select('*').order('starts_at',{ascending:true});setRows(data||[])};
 useEffect(()=>{load()},[]);
 async function save(){const {data:{user}}=await supabase.auth.getUser();if(!user||!form.title||!form.starts_at)return;const p:any={...form,starts_at:new Date(form.starts_at).toISOString(),ends_at:form.ends_at?new Date(form.ends_at).toISOString():null,created_by:user.id};const r=edit?await supabase.from('schedule_events').update(p).eq('id',edit.id):await supabase.from('schedule_events').insert(p);setMsg(r.error?r.error.message:'保存しました');if(!r.error){setForm(blank);setEdit(null);load()}}
 async function del(){if(!edit||!confirm('この予定を削除しますか？'))return;const {error}=await supabase.from('schedule_events').delete().eq('id',edit.id);setMsg(error?error.message:'削除しました');if(!error){setEdit(null);setForm(blank);load()}}
 function pick(r:any){setEdit(r);setForm({...r,starts_at:r.starts_at?new Date(r.starts_at).toISOString().slice(0,16):'',ends_at:r.ends_at?new Date(r.ends_at).toISOString().slice(0,16):''})}
 return <div><div className="panel form"><h3>{edit?'予定を編集':'予定を追加'}</h3><div className="grid2"><select value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})}><option value="training">練習</option><option value="friendly_match">練習試合</option><option value="official_match">公式戦</option><option value="measurement">測定</option><option value="medical_check">メディカルチェック</option><option value="prevention">傷害予防</option><option value="other">その他</option></select><input placeholder="タイトル" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/><input type="datetime-local" value={form.ends_at||''} onChange={e=>setForm({...form,ends_at:e.target.value})}/><input placeholder="場所" value={form.venue||''} onChange={e=>setForm({...form,venue:e.target.value})}/><input placeholder="対戦相手" value={form.opponent||''} onChange={e=>setForm({...form,opponent:e.target.value})}/><input placeholder="大会名" value={form.competition_name||''} onChange={e=>setForm({...form,competition_name:e.target.value})}/><input placeholder="練習テーマ" value={form.training_theme||''} onChange={e=>setForm({...form,training_theme:e.target.value})}/></div><textarea placeholder="詳細" value={form.details||''} onChange={e=>setForm({...form,details:e.target.value})}/><label><input type="checkbox" checked={!!form.gps_enabled} onChange={e=>setForm({...form,gps_enabled:e.target.checked})}/> GPS測定あり</label><div className="actions"><button onClick={save}>{edit?'変更を保存':'追加'}</button>{edit&&<><button className="secondary" onClick={()=>{setEdit(null);setForm(blank)}}>キャンセル</button><button className="dangerBtn" onClick={del}>削除</button></>}</div></div>{msg&&<div className="notice">{msg}</div>}<div className="eventGrid">{rows.map(r=><button className="eventCard" key={r.id} onClick={()=>pick(r)}><b>{new Date(r.starts_at).toLocaleString('ja-JP')}</b><span>{r.title}</span><small>{r.event_type}{r.opponent?' / vs '+r.opponent:''}</small></button>)}</div>{edit&&<div className="panel"><h3>予定詳細</h3><p>{edit.title}</p><p>{edit.details||'詳細なし'}</p></div>}</div>
}
function Rehab(){
 const [cases,setCases]=useState<any[]>([]),[sel,setSel]=useState<any>(null),[sessions,setSessions]=useState<any[]>([]),[visits,setVisits]=useState<any[]>([]),[msg,setMsg]=useState('');
 const [start,setStart]=useState(''),[stage,setStage]=useState(0);
 const [s,setS]=useState<any>({session_date:new Date().toISOString().slice(0,10),pain_score:'',hsr_distance_m:'',sprint_distance_m:'',max_speed_kmh:'',training_participation_pct:'',next_goal:'',notes:''});
 const [v,setV]=useState<any>({visit_date:new Date().toISOString().slice(0,10),facility_name:'',department:'',physician_name:'',diagnosis:'',examinations:'',physician_findings:'',exercise_restriction:'',weight_bearing_restriction:'',rom_restriction:'',next_visit_date:'',plan:'',notes:''}),[file,setFile]=useState<File|null>(null);
 const load=async()=>{const {data}=await supabase.from('player_rehab_status').select('*').order('injury_date',{ascending:false});setCases(data||[])};
 useEffect(()=>{load()},[]);
 async function choose(x:any){setSel(x);setStart(x.rehab_start_date||'');setStage(x.rehab_stage||0);const [{data:a},{data:b}]=await Promise.all([supabase.from('rehab_sessions').select('*').eq('case_id',x.case_id).order('session_date',{ascending:false}),supabase.from('hospital_visits').select('*').eq('case_id',x.case_id).order('visit_date',{ascending:false})]);setSessions(a||[]);setVisits(b||[])}
 async function saveHead(){if(!sel)return;const {error}=await supabase.from('injury_cases').update({current_status:'rehab',rehab_start_date:start||null,rehab_stage:stage}).eq('id',sel.case_id);setMsg(error?error.message:'リハビリ情報を保存しました');if(!error)load()}
 async function addSession(){if(!sel)return;const {data:{user}}=await supabase.auth.getUser();if(!user)return;const p:any={case_id:sel.case_id,recorded_by:user.id,session_date:s.session_date,rehab_stage:stage,pain_score:s.pain_score===''?null:Number(s.pain_score),hsr_distance_m:s.hsr_distance_m===''?null:Number(s.hsr_distance_m),sprint_distance_m:s.sprint_distance_m===''?null:Number(s.sprint_distance_m),max_speed_kmh:s.max_speed_kmh===''?null:Number(s.max_speed_kmh),training_participation_pct:s.training_participation_pct===''?null:Number(s.training_participation_pct),next_goal:s.next_goal,notes:s.notes};const {error}=await supabase.from('rehab_sessions').insert(p);setMsg(error?error.message:'リハビリ記録を追加しました');if(!error)choose(sel)}
 async function addVisit(){if(!sel)return;const {data:{user}}=await supabase.auth.getUser();if(!user)return;let paths:string[]=[];if(file){const safe=file.name.replace(/[^A-Za-z0-9._-]/g,'_');const path=sel.player_id+'/'+sel.case_id+'/'+Date.now()+'-'+safe;const up=await supabase.storage.from('medical-attachments').upload(path,file);if(up.error){setMsg(up.error.message);return}paths=[path]}const p:any={case_id:sel.case_id,recorded_by:user.id,...v,examinations:v.examinations?v.examinations.split(',').map((x:string)=>x.trim()).filter(Boolean):[],next_visit_date:v.next_visit_date||null,attachment_paths:paths};const {error}=await supabase.from('hospital_visits').insert(p);setMsg(error?error.message:'受診記録を追加しました');if(!error)choose(sel)}
 return <div><div className="cards">{cases.map(x=><button className="rehabCard" key={x.case_id} onClick={()=>choose(x)}><b>{x.full_name}</b><span>{x.injury_name} / {x.body_part}</span><strong>{x.current_status==='rehab'&&x.rehab_day?'Rehab Day '+x.rehab_day:'-'}</strong><small>Stage {x.rehab_stage==null?'-':x.rehab_stage}</small></button>)}</div>{sel&&<><div className="panel form"><h3>{sel.full_name}｜{sel.injury_name}</h3><div className="rehabHero"><b>{start?'Rehab Day '+day(start):'開始日未設定'}</b><span>受傷日 {sel.injury_date}</span></div><div className="grid2"><label>リハビリ開始日<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Stage<select value={stage} onChange={e=>setStage(Number(e.target.value))}>{Array.from({length:10},(_,i)=><option key={i} value={i}>Stage {i}</option>)}</select></label></div><button onClick={saveHead}>保存</button></div><div className="panel form"><h3>リハビリ記録</h3><div className="grid2"><input type="date" value={s.session_date} onChange={e=>setS({...s,session_date:e.target.value})}/><input type="number" min="0" max="10" placeholder="Pain 0-10" value={s.pain_score} onChange={e=>setS({...s,pain_score:e.target.value})}/><input type="number" placeholder="HSR m" value={s.hsr_distance_m} onChange={e=>setS({...s,hsr_distance_m:e.target.value})}/><input type="number" placeholder="Sprint m" value={s.sprint_distance_m} onChange={e=>setS({...s,sprint_distance_m:e.target.value})}/><input type="number" placeholder="最高速度 km/h" value={s.max_speed_kmh} onChange={e=>setS({...s,max_speed_kmh:e.target.value})}/><input type="number" placeholder="練習参加 %" value={s.training_participation_pct} onChange={e=>setS({...s,training_participation_pct:e.target.value})}/><input placeholder="次回目標" value={s.next_goal} onChange={e=>setS({...s,next_goal:e.target.value})}/><input placeholder="備考" value={s.notes} onChange={e=>setS({...s,notes:e.target.value})}/></div><button onClick={addSession}>記録追加</button>{sessions.map(r=><div className="historyLine" key={r.id}><b>{r.session_date}｜Stage {r.rehab_stage==null?'-':r.rehab_stage}</b><span>Pain {r.pain_score==null?'-':r.pain_score} / HSR {r.hsr_distance_m==null?'-':r.hsr_distance_m}m</span></div>)}</div><div className="panel form"><h3>病院受診記録</h3><div className="grid2"><input type="date" value={v.visit_date} onChange={e=>setV({...v,visit_date:e.target.value})}/><input placeholder="医療機関名" value={v.facility_name} onChange={e=>setV({...v,facility_name:e.target.value})}/><input placeholder="診療科" value={v.department} onChange={e=>setV({...v,department:e.target.value})}/><input placeholder="医師名" value={v.physician_name} onChange={e=>setV({...v,physician_name:e.target.value})}/><input placeholder="診断名" value={v.diagnosis} onChange={e=>setV({...v,diagnosis:e.target.value})}/><input placeholder="検査（MRI,X線など）" value={v.examinations} onChange={e=>setV({...v,examinations:e.target.value})}/><input placeholder="運動制限" value={v.exercise_restriction} onChange={e=>setV({...v,exercise_restriction:e.target.value})}/><input placeholder="荷重制限" value={v.weight_bearing_restriction} onChange={e=>setV({...v,weight_bearing_restriction:e.target.value})}/><input placeholder="ROM制限" value={v.rom_restriction} onChange={e=>setV({...v,rom_restriction:e.target.value})}/><input type="date" value={v.next_visit_date} onChange={e=>setV({...v,next_visit_date:e.target.value})}/></div><textarea placeholder="医師所見" value={v.physician_findings} onChange={e=>setV({...v,physician_findings:e.target.value})}/><textarea placeholder="今後の方針" value={v.plan} onChange={e=>setV({...v,plan:e.target.value})}/><input type="file" accept="image/*,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/><button onClick={addVisit}>受診記録追加</button>{visits.map(r=><div className="historyLine" key={r.id}><b>{r.visit_date}｜{r.facility_name}</b><span>{r.diagnosis||'診断未入力'}{r.attachment_paths&&r.attachment_paths.length?' / 添付 '+r.attachment_paths.length+'件':''}</span></div>)}</div></>}{msg&&<div className="notice">{msg}</div>}</div>
}
function Library(){
 const [kind,setKind]=useState<'rehab'|'training'>('rehab'),[rows,setRows]=useState<any[]>([]),[msg,setMsg]=useState(''),[f,setF]=useState<any>({name:'',category:'',phase:'',purpose:'',instructions:'',sets:'',reps:'',load:'',progression_criteria:'',precautions:'',tags:''});
 const load=async()=>{const {data}=await supabase.from(kind==='rehab'?'rehab_menu_library':'training_menu_library').select('*').order('name');setRows(data||[])};
 useEffect(()=>{load()},[kind]);
 async function add(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const t=kind==='rehab'?'rehab_menu_library':'training_menu_library';const p:any={name:f.name,purpose:f.purpose,instructions:f.instructions,sets:f.sets,reps:f.reps,load:f.load,tags:f.tags.split(',').map((x:string)=>x.trim()).filter(Boolean),created_by:user.id};if(kind==='rehab')Object.assign(p,{injury_category:f.category,phase:f.phase,progression_criteria:f.progression_criteria,precautions:f.precautions});else p.category=f.category;const {error}=await supabase.from(t).insert(p);setMsg(error?error.message:'保存しました');if(!error)load()}
 return <div><div className="seg"><button className={kind==='rehab'?'active':''} onClick={()=>setKind('rehab')}>リハビリメニュー</button><button className={kind==='training'?'active':''} onClick={()=>setKind('training')}>練習メニュー</button></div><div className="panel form"><div className="grid2"><input placeholder="メニュー名" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input placeholder="カテゴリー" value={f.category} onChange={e=>setF({...f,category:e.target.value})}/>{kind==='rehab'&&<input placeholder="Phase / Stage" value={f.phase} onChange={e=>setF({...f,phase:e.target.value})}/>}<input placeholder="目的" value={f.purpose} onChange={e=>setF({...f,purpose:e.target.value})}/><input placeholder="セット" value={f.sets} onChange={e=>setF({...f,sets:e.target.value})}/><input placeholder="回数" value={f.reps} onChange={e=>setF({...f,reps:e.target.value})}/><input placeholder="負荷" value={f.load} onChange={e=>setF({...f,load:e.target.value})}/><input placeholder="タグ" value={f.tags} onChange={e=>setF({...f,tags:e.target.value})}/></div><textarea placeholder="実施方法" value={f.instructions} onChange={e=>setF({...f,instructions:e.target.value})}/>{kind==='rehab'&&<><input placeholder="進行基準" value={f.progression_criteria} onChange={e=>setF({...f,progression_criteria:e.target.value})}/><input placeholder="注意点" value={f.precautions} onChange={e=>setF({...f,precautions:e.target.value})}/></>}<button onClick={add}>保存</button></div>{msg&&<div className="notice">{msg}</div>}<div className="libraryGrid">{rows.map(r=><div className="panel" key={r.id}><h3>{r.name}</h3><p>{r.purpose||'-'}</p><small>{(r.tags||[]).join(' / ')}</small></div>)}</div></div>
}



function MiniLineChart({title,subtitle,rows,series}:{title:string;subtitle:string;rows:any[];series:{key:string;label:string;unit?:string}[]}){
 const [expanded,setExpanded]=useState(false);
 const w=760,h=230,pad={l:54,r:18,t:24,b:38};
 const values=rows.flatMap(r=>series.map(s=>Number(r[s.key]||0)));
 const max=Math.max(1,...values),min=0;
 const x=(i:number)=>rows.length<=1?(pad.l+(w-pad.l-pad.r)/2):pad.l+i*(w-pad.l-pad.r)/(rows.length-1);
 const y=(v:number)=>h-pad.b-(v-min)/(max-min)*(h-pad.t-pad.b);
 const ticks=[0,.25,.5,.75,1].map(v=>Math.round(max*v));
 const chart=<><div className="gpsChartTitle"><div><h4>{title}</h4><p>{subtitle}</p></div><div className="gpsLegend">{series.map((s,i)=><span key={s.key}><i className={'gpsDot dot'+i}></i>{s.label}</span>)}</div></div>
 <svg className="gpsChart" viewBox={'0 0 '+w+' '+h} role="img" aria-label={title+'折れ線グラフ'}>
   {ticks.map((t,i)=>{const yy=y(t);return <g key={i}><line x1={pad.l} x2={w-pad.r} y1={yy} y2={yy} className="gridLine"/><text x={pad.l-8} y={yy+4} textAnchor="end" className="axisText">{t.toLocaleString()}</text></g>})}
   <line x1={pad.l} x2={pad.l} y1={pad.t} y2={h-pad.b} className="axisLine"/><line x1={pad.l} x2={w-pad.r} y1={h-pad.b} y2={h-pad.b} className="axisLine"/>
   {series.map((s,si)=>{const pts=rows.map((r,i)=>x(i)+','+y(Number(r[s.key]||0))).join(' ');return <g key={s.key}>{rows.length>1&&<polyline points={pts} fill="none" className={'gpsSeries series'+si}/>} {rows.map((r,i)=><circle key={i} cx={x(i)} cy={y(Number(r[s.key]||0))} r="4" className={'gpsPoint point'+si}><title>{r.label} {s.label}: {Number(r[s.key]||0).toLocaleString('ja-JP',{maximumFractionDigits:1})}{s.unit||''}</title></circle>)}</g>})}
   {rows.map((r,i)=><text key={i} x={x(i)} y={h-12} textAnchor="middle" className="axisText">{r.label}</text>)}
 </svg></>;
 return <><button type="button" className="gpsChartCard gpsChartButton" onClick={()=>setExpanded(true)} aria-label={title+'グラフを拡大表示'}>{chart}<span className="expandHint">クリックで拡大</span></button>
 {expanded&&<div className="confirmOverlay" onClick={()=>setExpanded(false)}><div className="confirmCard gpsChartModal" onClick={e=>e.stopPropagation()}><div className="gpsModalHead"><b>{title}</b><button type="button" className="secondary" onClick={()=>setExpanded(false)}>閉じる</button></div>{chart}</div></div>}</>;
}

function Gps(){
 const [players,setPlayers]=useState<any[]>([]),[sessions,setSessions]=useState<any[]>([]),[metrics,setMetrics]=useState<any[]>([]),[knows,setKnows]=useState<any[]>([]),[msg,setMsg]=useState('');
 const [sort,setSort]=useState<{key:string;dir:'asc'|'desc'}>({key:'athlete_name',dir:'asc'});
 const [showImport,setShowImport]=useState(false),[dragging,setDragging]=useState(false),[importFile,setImportFile]=useState<File|null>(null),[importing,setImporting]=useState(false);
 const [editGroup,setEditGroup]=useState<any|null>(null),[editRow,setEditRow]=useState<any|null>(null);
 const [chartRange,setChartRange]=useState<any>({from:'',to:''});
 const [importMeta,setImportMeta]=useState<any>({activity_type:'Game',session_date:new Date().toISOString().slice(0,10),kickoff_time:'',venue:'',opponent:''});
 const [sf,setSf]=useState<any>({session_date:new Date().toISOString().slice(0,10),session_name:'',session_type:'training',duration_minutes:''}),[mf,setMf]=useState<any>({gps_session_id:'',player_id:'',total_distance_m:'',meters_per_min:'',hsr_distance_m:'',sprint_distance_m:'',sprint_count:'',max_speed_kmh:'',acceleration_count:'',deceleration_count:''});
 async function load(){
   const [{data:p},{data:s},{data:m},{data:k}]=await Promise.all([
     supabase.from('profiles').select('id,full_name').eq('role','player').eq('is_hidden',false),
     supabase.from('gps_sessions').select('*').order('session_date',{ascending:false}),
     supabase.from('gps_player_metrics').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(100),
     supabase.from('knows_gps_imports').select('*').order('session_date',{ascending:false}).order('kickoff_time',{ascending:false}).order('athlete_name')
   ]);
   setPlayers(p||[]);setSessions(s||[]);setMetrics(m||[]);setKnows(k||[]);
 }
 useEffect(()=>{load()},[]);
 async function addSession(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from('gps_sessions').insert({...sf,duration_minutes:sf.duration_minutes?Number(sf.duration_minutes):null,created_by:user.id});setMsg(error?error.message:'GPSセッション追加');if(!error)load()}
 async function addMetric(){const {data:{user}}=await supabase.auth.getUser();if(!user||!mf.gps_session_id||!mf.player_id)return;const prev=metrics.filter(x=>x.player_id===mf.player_id&&x.hsr_distance_m!=null).slice(0,5);const avg=prev.length?prev.reduce((a,x)=>a+Number(x.hsr_distance_m),0)/prev.length:0;const h=mf.hsr_distance_m?Number(mf.hsr_distance_m):0;const pct=avg?Math.round((h-avg)/avg*100):null;const feedback=pct==null?'比較データがまだありません。':'HSRは直近平均より'+(pct>=0?'+':'')+pct+'%。最終判断はスタッフが行ってください。';const p:any={...mf,feedback,created_by:user.id};['gps_session_id','sprint_count','acceleration_count','deceleration_count'].forEach(k=>p[k]=p[k]?Number(p[k]):null);['total_distance_m','meters_per_min','hsr_distance_m','sprint_distance_m','max_speed_kmh'].forEach(k=>p[k]=p[k]?Number(p[k]):null);const {error}=await supabase.from('gps_player_metrics').upsert(p,{onConflict:'gps_session_id,player_id'});setMsg(error?error.message:'GPSデータ保存');if(!error)load()}
 async function deleteKnows(id:number,name:string){if(!confirm(name+' のGPSデータを削除しますか？'))return;const {error}=await supabase.from('knows_gps_imports').delete().eq('id',id);setMsg(error?error.message:'GPSデータを削除しました。');if(!error)load()}
 async function saveGroupEdit(){
   if(!editGroup)return;
   const ids=(editGroup.rows||[]).map((r:any)=>r.id);
   const payload={session_date:editGroup.session_date,kickoff_time:editGroup.kickoff_time||null,venue:editGroup.venue||null,opponent:editGroup.opponent||null,activity_type:editGroup.activity_type||'Game'};
   const {error}=await supabase.from('knows_gps_imports').update(payload).in('id',ids);
   setMsg(error?error.message:'GPSセッション情報を修正しました。');
   if(!error){setEditGroup(null);await load()}
 }
 async function saveRowEdit(){
   if(!editRow)return;
   const n=(v:any)=>v===''||v==null?null:Number(v);
   const payload={athlete_name:editRow.athlete_name,total_distance_m:n(editRow.total_distance_m),sprint_distance_m:n(editRow.sprint_distance_m),sprint_count:n(editRow.sprint_count),si:n(editRow.si),hi:n(editRow.hi),acceleration_count:n(editRow.acceleration_count),deceleration_count:n(editRow.deceleration_count)};
   const {error}=await supabase.from('knows_gps_imports').update(payload).eq('id',editRow.id);
   setMsg(error?error.message:'選手GPS数値を修正しました。');
   if(!error){setEditRow(null);await load()}
 }
 function parseCsv(text:string){
   const out:string[][]=[];let row:string[]=[],cell='',quoted=false;
   for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1];
     if(ch==='"'){if(quoted&&next==='"'){cell+='"';i++}else quoted=!quoted}
     else if(ch===','&&!quoted){row.push(cell);cell=''}
     else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell);cell='';if(row.some(v=>v.trim()!==''))out.push(row);row=[]}
     else cell+=ch;
   }
   if(cell||row.length){row.push(cell);if(row.some(v=>v.trim()!==''))out.push(row)}
   return out;
 }
 function headerIndex(headers:string[],names:string[]){
   const norm=(v:string)=>v.trim().toLowerCase().replace(/[\s_()\[\]\/.-]/g,'');
   const hs=headers.map(norm);
   for(const n of names){const i=hs.indexOf(norm(n));if(i>=0)return i}
   return -1;
 }
 async function importKnows(){
   if(!importFile||!importMeta.session_date){setMsg('CSVファイルと日付を設定してください。');return}
   setImporting(true);setMsg('');
   try{
     const text=await importFile.text();
     const rows=parseCsv(text);
     if(rows.length<2)throw new Error('CSVデータを読み取れませんでした。');
     const headers=rows[0];
     const iName=headerIndex(headers,['Name','Player','Athlete','選手名','氏名']);
     const iDistance=headerIndex(headers,['Distance','Total Distance','総走行距離']);
     const iSprintD=headerIndex(headers,['SPD_D_Z6','Sprint Distance','スプリント距離']);
     const iSprint=headerIndex(headers,['Sprint','Sprint Count','スプリント回数']);
     const iSi=headerIndex(headers,['SI_D','SI']);
     const iHi=headerIndex(headers,['HI_D','HI']);
     const iAcc=headerIndex(headers,['Accel_Z3','Acceleration','加速']);
     const iDec=headerIndex(headers,['Decel_Z3','Deceleration','減速']);
     if(iName<0||iDistance<0)throw new Error('Knows CSVの選手名またはDistance列を確認できません。');
     const num=(v:any)=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0};
     const {data:{user}}=await supabase.auth.getUser();
     if(!user)throw new Error('ログイン情報を確認できません。');
     const payload=rows.slice(1).map(r=>({
       activity_type:importMeta.activity_type||'Game',
       session_date:importMeta.session_date,
       session_name:'Knows CSV',
       kickoff_time:importMeta.kickoff_time||null,
       venue:importMeta.venue||null,
       opponent:importMeta.opponent||null,
       athlete_name:String(r[iName]||'').trim(),
       total_distance_m:num(r[iDistance]),
       sprint_distance_m:iSprintD>=0?num(r[iSprintD]):null,
       sprint_count:iSprint>=0?Math.round(num(r[iSprint])):null,
       si:iSi>=0?num(r[iSi]):null,
       hi:iHi>=0?num(r[iHi]):null,
       acceleration_count:iAcc>=0?Math.round(num(r[iAcc])):null,
       deceleration_count:iDec>=0?Math.round(num(r[iDec])):null,
       source_file:importFile.name,
       created_by:user.id
     })).filter(r=>r.athlete_name&&r.total_distance_m>=1000);
     if(!payload.length)throw new Error('総走行距離1000m以上の選手データがありません。');
     const {error}=await supabase.from('knows_gps_imports').upsert(payload,{onConflict:'session_date,session_name,athlete_name'});
     if(error)throw error;
     setMsg(payload.length+'名のGPSデータを取り込みました。');
     setImportFile(null);setShowImport(false);await load();
   }catch(e:any){setMsg(e?.message||'CSV取込に失敗しました。')}
   setImporting(false);
 }
 function acceptFile(file?:File|null){if(!file)return;if(!file.name.toLowerCase().endsWith('.csv')){setMsg('CSVファイルを選択してください。');return}setImportFile(file);setShowImport(true)}

 const matchGroups=knows.reduce((acc:any,row:any)=>{
   const key=[row.activity_type||'Game',row.session_date,row.kickoff_time||'',row.venue||'',row.opponent||'',row.session_name||''].join('|');
   (acc[key] ||= []).push(row); return acc;
 },{});
 const matches=Object.entries(matchGroups).map(([key,rowsAny])=>{const rows=rowsAny as any[];return {key,rows,head:rows[0]}}).sort((a:any,b:any)=>String(b.head.session_date+' '+(b.head.kickoff_time||'')).localeCompare(String(a.head.session_date+' '+(a.head.kickoff_time||''))));
 const gameMatches=matches.filter((g:any)=>(g.head.activity_type||'Game')==='Game');
 const trMatches=matches.filter((g:any)=>g.head.activity_type==='TR');
 const chartMatches=matches.filter((g:any)=>(!chartRange.from||g.head.session_date>=chartRange.from)&&(!chartRange.to||g.head.session_date<=chartRange.to));
 const toChartRow=(g:any,mode:'per10'|'avg')=>{const rows=g.rows;const calc=(k:string)=>{const sum=rows.reduce((a:any,r:any)=>a+Number(r[k]||0),0);return mode==='per10'?sum/10:(rows.length?sum/rows.length:0)};return {key:g.key,label:g.head.session_date.slice(5).replace('-','/')+' '+(g.head.opponent||g.head.session_name||''),total_distance_m:calc('total_distance_m'),sprint_distance_m:calc('sprint_distance_m'),si:calc('si'),hi:calc('hi'),sprint_count:calc('sprint_count'),acceleration_count:calc('acceleration_count'),deceleration_count:calc('deceleration_count')}};
 const gameWeekly=chartMatches.filter((g:any)=>(g.head.activity_type||'Game')==='Game').map((g:any)=>toChartRow(g,'per10')).sort((a:any,b:any)=>String(a.key).localeCompare(String(b.key)));
 const trWeekly=chartMatches.filter((g:any)=>g.head.activity_type==='TR').map((g:any)=>toChartRow(g,'avg')).sort((a:any,b:any)=>String(a.key).localeCompare(String(b.key)));
 const toggleSort=(key:string)=>setSort(s=>({key,dir:s.key===key&&s.dir==='asc'?'desc':'asc'}));
 const arrow=(key:string)=>sort.key===key?(sort.dir==='asc'?' ▲':' ▼'):'';
 const sortRows=(rows:any[])=>[...rows].sort((a:any,b:any)=>{const av=a[sort.key],bv=b[sort.key];const cmp=typeof av==='string'?String(av||'').localeCompare(String(bv||''),'ja'):Number(av||0)-Number(bv||0);return sort.dir==='asc'?cmp:-cmp});
 const fmt=(v:any,d=0)=>v==null?'-':Number(v).toLocaleString('ja-JP',{maximumFractionDigits:d});
 const pctOfDistance=(v:any,total:any)=>Number(total)>0?Number(v||0)/Number(total)*100:null;
 const timeText=(v:any)=>v?String(v).slice(0,5):'-';
 return <div>
   <div className="gpsToolbar"><button onClick={()=>setShowImport(v=>!v)}>＋ データ追加</button></div>
   {showImport&&<div className="panel gpsImportPanel"><div className="grid2"><select value={importMeta.activity_type} onChange={e=>setImportMeta({...importMeta,activity_type:e.target.value})}><option value="Game">Game</option><option value="TR">TR</option></select><input type="date" value={importMeta.session_date} onChange={e=>setImportMeta({...importMeta,session_date:e.target.value})}/><input type="time" value={importMeta.kickoff_time} onChange={e=>setImportMeta({...importMeta,kickoff_time:e.target.value})}/><input placeholder="試合会場" value={importMeta.venue} onChange={e=>setImportMeta({...importMeta,venue:e.target.value})}/><input placeholder="対戦相手" value={importMeta.opponent} onChange={e=>setImportMeta({...importMeta,opponent:e.target.value})}/></div>
   <label className={'gpsDropZone '+(dragging?'dragging':'')} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);acceptFile(e.dataTransfer.files?.[0])}}>
     <input type="file" accept=".csv,text/csv" onChange={e=>acceptFile(e.target.files?.[0])}/>
     <b>Knows CSVをここにドラッグ＆ドロップ</b><span>またはクリックしてCSVを選択</span>{importFile&&<strong>{importFile.name}</strong>}
   </label>
   <div className="actions"><button disabled={!importFile||importing} onClick={importKnows}>{importing?'取込中...':'データを取り込む'}</button><button className="secondary" onClick={()=>{setShowImport(false);setImportFile(null)}}>キャンセル</button></div></div>}
   <div className="panel gpsChartFilters"><div><b>グラフ表示期間</b><small>3つのグラフに共通適用</small></div><label>開始日<input type="date" value={chartRange.from} onChange={e=>setChartRange({...chartRange,from:e.target.value})}/></label><label>終了日<input type="date" value={chartRange.to} onChange={e=>setChartRange({...chartRange,to:e.target.value})}/></label><button className="secondary" onClick={()=>setChartRange({from:'',to:''})}>全期間</button><span>Game {gameWeekly.length}件 / TR {trWeekly.length}件</span></div>
   <div className="gpsChartSection"><div className="gpsChartSectionHead"><h3>Game</h3><span>10人換算</span></div><div className="gpsChartsTop">
     <MiniLineChart title="Volume" subtitle="Game｜10人換算｜総走行距離・スプリント距離" rows={gameWeekly} series={[{key:'total_distance_m',label:'総走行距離',unit:'m'},{key:'sprint_distance_m',label:'スプリント距離',unit:'m'}]}/>
     <MiniLineChart title="Intensity" subtitle="Game｜10人換算｜SI・HI" rows={gameWeekly} series={[{key:'si',label:'SI'},{key:'hi',label:'HI'}]}/>
     <MiniLineChart title="Actions" subtitle="Game｜10人換算｜スプリント・加速・減速" rows={gameWeekly} series={[{key:'sprint_count',label:'スプリント',unit:'回'},{key:'acceleration_count',label:'加速',unit:'回'},{key:'deceleration_count',label:'減速',unit:'回'}]}/>
   </div></div>
   <div className="gpsChartSection"><div className="gpsChartSectionHead"><h3>TR</h3><span>参加者平均</span></div><div className="gpsChartsTop">
     <MiniLineChart title="Volume" subtitle="TR｜参加者平均｜総走行距離・スプリント距離" rows={trWeekly} series={[{key:'total_distance_m',label:'総走行距離',unit:'m'},{key:'sprint_distance_m',label:'スプリント距離',unit:'m'}]}/>
     <MiniLineChart title="Intensity" subtitle="TR｜参加者平均｜SI・HI" rows={trWeekly} series={[{key:'si',label:'SI'},{key:'hi',label:'HI'}]}/>
     <MiniLineChart title="Actions" subtitle="TR｜参加者平均｜スプリント・加速・減速" rows={trWeekly} series={[{key:'sprint_count',label:'スプリント',unit:'回'},{key:'acceleration_count',label:'加速',unit:'回'},{key:'deceleration_count',label:'減速',unit:'回'}]}/>
   </div></div>
   <div className="gpsCategoryList">
   {(['Game','TR'] as const).map(cat=>{const list=cat==='Game'?gameMatches:trMatches;return <details className="panel gpsCategoryCard" key={cat}>
      <summary className="gpsCategorySummary"><b>{cat}</b><span>{list.length}件</span></summary>
      <div className="gpsMatchList">{list.length===0?<div className="empty">{cat}データはまだありません。</div>:list.map((g:any)=><details className="panel gpsMatchCard" key={g.key}>
         <summary className="gpsMatchSummary"><div><span>日付</span><b>{g.head.session_date}</b></div><div><span>{cat==='Game'?'キックオフ時間':'開始時間'}</span><b>{timeText(g.head.kickoff_time)}</b></div><div><span>{cat==='Game'?'試合会場':'TR会場'}</span><b>{g.head.venue||'-'}</b></div><div><span>{cat==='Game'?'対戦相手':'内容'}</span><b>{cat==='Game'?(g.head.opponent||'-'):(g.head.opponent||g.head.session_name||'-')}</b></div><div className="gpsSummaryActions"><em>{g.rows.length}名</em><button type="button" className="secondary" onClick={e=>{e.preventDefault();e.stopPropagation();setEditGroup({rows:g.rows,activity_type:g.head.activity_type||'Game',session_date:g.head.session_date,kickoff_time:g.head.kickoff_time||'',venue:g.head.venue||'',opponent:g.head.opponent||''})}}>修正</button></div></summary>
         <div className="tableWrap"><table className="knowsTable"><thead><tr>
         <th><button className="sortHead" onClick={()=>toggleSort('athlete_name')}>選手{arrow('athlete_name')}</button></th>
         <th><button className="sortHead" onClick={()=>toggleSort('total_distance_m')}>総走行距離{arrow('total_distance_m')}</button></th>
         <th><button className="sortHead" onClick={()=>toggleSort('sprint_distance_m')}>スプリント距離{arrow('sprint_distance_m')}</button></th>
         <th><button className="sortHead" onClick={()=>toggleSort('sprint_count')}>スプリント回数{arrow('sprint_count')}</button></th>
         <th><button className="sortHead" onClick={()=>toggleSort('si')}>SI{arrow('si')}</button></th>
         <th><button className="sortHead" onClick={()=>toggleSort('hi')}>HI{arrow('hi')}</button></th>
         <th><button className="sortHead" onClick={()=>toggleSort('acceleration_count')}>加速{arrow('acceleration_count')}</button></th>
         <th><button className="sortHead" onClick={()=>toggleSort('deceleration_count')}>減速{arrow('deceleration_count')}</button></th><th>操作</th></tr></thead>
         <tbody>{sortRows(g.rows).map((r:any)=><tr key={r.id}><td><b>{r.athlete_name}</b></td><td>{fmt(r.total_distance_m,0)}m</td><td>{fmt(r.sprint_distance_m,1)}m</td><td>{fmt(r.sprint_count)}回</td><td><div className="gpsMetricStack"><b>{fmt(r.si,2)}</b><small>{pctOfDistance(r.si,r.total_distance_m)!=null?fmt(pctOfDistance(r.si,r.total_distance_m),1)+'%':'-'}</small></div></td><td><div className="gpsMetricStack"><b>{fmt(r.hi,2)}</b><small>{pctOfDistance(r.hi,r.total_distance_m)!=null?fmt(pctOfDistance(r.hi,r.total_distance_m),1)+'%':'-'}</small></div></td><td>{fmt(r.acceleration_count)}回</td><td>{fmt(r.deceleration_count)}回</td><td><div className="rowActions"><button className="secondary" onClick={()=>setEditRow({...r})}>修正</button><button className="dangerBtn" onClick={()=>deleteKnows(r.id,r.athlete_name)}>削除</button></div></td></tr>)}</tbody></table></div>
      </details>)}</div>
   </details>})}
   </div>
   {editGroup&&<div className="confirmOverlay" onClick={()=>setEditGroup(null)}><div className="confirmCard gpsEditModal" onClick={e=>e.stopPropagation()}><h3>{editGroup.activity_type==='Game'?'Game情報を修正':'TR情報を修正'}</h3><div className="grid2"><select value={editGroup.activity_type} onChange={e=>setEditGroup({...editGroup,activity_type:e.target.value})}><option value="Game">Game</option><option value="TR">TR</option></select><input type="date" value={editGroup.session_date} onChange={e=>setEditGroup({...editGroup,session_date:e.target.value})}/><input type="time" value={editGroup.kickoff_time} onChange={e=>setEditGroup({...editGroup,kickoff_time:e.target.value})}/><input placeholder={editGroup.activity_type==='Game'?'試合会場':'TR会場'} value={editGroup.venue} onChange={e=>setEditGroup({...editGroup,venue:e.target.value})}/><input placeholder={editGroup.activity_type==='Game'?'対戦相手':'TR内容'} value={editGroup.opponent} onChange={e=>setEditGroup({...editGroup,opponent:e.target.value})}/></div><div className="actions"><button onClick={saveGroupEdit}>変更を保存</button><button className="secondary" onClick={()=>setEditGroup(null)}>キャンセル</button></div></div></div>}
   {editRow&&<div className="confirmOverlay" onClick={()=>setEditRow(null)}><div className="confirmCard gpsEditModal" onClick={e=>e.stopPropagation()}><h3>GPS数値を修正</h3><div className="grid2"><input value={editRow.athlete_name||''} onChange={e=>setEditRow({...editRow,athlete_name:e.target.value})}/><input type="number" step="0.01" placeholder="総走行距離 m" value={editRow.total_distance_m??''} onChange={e=>setEditRow({...editRow,total_distance_m:e.target.value})}/><input type="number" step="0.01" placeholder="スプリント距離 m" value={editRow.sprint_distance_m??''} onChange={e=>setEditRow({...editRow,sprint_distance_m:e.target.value})}/><input type="number" step="1" placeholder="スプリント回数" value={editRow.sprint_count??''} onChange={e=>setEditRow({...editRow,sprint_count:e.target.value})}/><input type="number" step="0.01" placeholder="SI" value={editRow.si??''} onChange={e=>setEditRow({...editRow,si:e.target.value})}/><input type="number" step="0.01" placeholder="HI" value={editRow.hi??''} onChange={e=>setEditRow({...editRow,hi:e.target.value})}/><input type="number" step="1" placeholder="加速回数" value={editRow.acceleration_count??''} onChange={e=>setEditRow({...editRow,acceleration_count:e.target.value})}/><input type="number" step="1" placeholder="減速回数" value={editRow.deceleration_count??''} onChange={e=>setEditRow({...editRow,deceleration_count:e.target.value})}/></div><div className="actions"><button onClick={saveRowEdit}>変更を保存</button><button className="secondary" onClick={()=>setEditRow(null)}>キャンセル</button></div></div></div>}
   <details className="panel gpsManual"><summary>手入力GPSデータ</summary><div className="form"><h3>GPSセッション</h3><div className="grid2"><input type="date" value={sf.session_date} onChange={e=>setSf({...sf,session_date:e.target.value})}/><input placeholder="セッション名" value={sf.session_name} onChange={e=>setSf({...sf,session_name:e.target.value})}/><select value={sf.session_type} onChange={e=>setSf({...sf,session_type:e.target.value})}><option value="training">練習</option><option value="friendly_match">練習試合</option><option value="official_match">公式戦</option><option value="rehab">リハビリ</option><option value="other">その他</option></select><input type="number" placeholder="時間 分" value={sf.duration_minutes} onChange={e=>setSf({...sf,duration_minutes:e.target.value})}/></div><button onClick={addSession}>追加</button></div><div className="form"><h3>選手GPSデータ</h3><div className="grid2"><select value={mf.gps_session_id} onChange={e=>setMf({...mf,gps_session_id:e.target.value})}><option value="">セッション選択</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.session_date}｜{s.session_name}</option>)}</select><select value={mf.player_id} onChange={e=>setMf({...mf,player_id:e.target.value})}><option value="">選手選択</option>{players.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select><input type="number" placeholder="Total Distance m" value={mf.total_distance_m} onChange={e=>setMf({...mf,total_distance_m:e.target.value})}/><input type="number" placeholder="m/min" value={mf.meters_per_min} onChange={e=>setMf({...mf,meters_per_min:e.target.value})}/><input type="number" placeholder="HSR m" value={mf.hsr_distance_m} onChange={e=>setMf({...mf,hsr_distance_m:e.target.value})}/><input type="number" placeholder="Sprint Distance m" value={mf.sprint_distance_m} onChange={e=>setMf({...mf,sprint_distance_m:e.target.value})}/><input type="number" placeholder="Sprint回数" value={mf.sprint_count} onChange={e=>setMf({...mf,sprint_count:e.target.value})}/><input type="number" placeholder="Max Speed km/h" value={mf.max_speed_kmh} onChange={e=>setMf({...mf,max_speed_kmh:e.target.value})}/><input type="number" placeholder="加速回数" value={mf.acceleration_count} onChange={e=>setMf({...mf,acceleration_count:e.target.value})}/><input type="number" placeholder="減速回数" value={mf.deceleration_count} onChange={e=>setMf({...mf,deceleration_count:e.target.value})}/></div><button onClick={addMetric}>保存・フィードバック</button></div><div className="tableWrap"><table><thead><tr><th>選手</th><th>Total</th><th>HSR</th><th>Sprint</th><th>Max</th><th>Feedback</th></tr></thead><tbody>{metrics.map(m=><tr key={m.id}><td>{m.profiles?.full_name||'-'}</td><td>{m.total_distance_m||'-'}m</td><td>{m.hsr_distance_m||'-'}m</td><td>{m.sprint_distance_m||'-'}m</td><td>{m.max_speed_kmh||'-'}km/h</td><td>{m.feedback||'-'}</td></tr>)}</tbody></table></div></details>
   {msg&&<div className="notice">{msg}</div>}
 </div>;
}
function Video(){
 const [rows,setRows]=useState<any[]>([]),[players,setPlayers]=useState<any[]>([]),[f,setF]=useState<any>({player_id:'',category:'training',title:'',description:'',video_url:''}),[msg,setMsg]=useState('');
 async function load(){const [{data:r},{data:p}]=await Promise.all([supabase.from('videos').select('*,profiles(full_name)').order('created_at',{ascending:false}),supabase.from('profiles').select('id,full_name').eq('role','player')]);setRows(r||[]);setPlayers(p||[])}
 useEffect(()=>{load()},[]);
 async function add(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from('videos').insert({...f,player_id:f.player_id||null,created_by:user.id});setMsg(error?error.message:'動画登録');if(!error)load()}
 return <div><div className="panel form"><div className="grid2"><select value={f.player_id} onChange={e=>setF({...f,player_id:e.target.value})}><option value="">チーム共通</option>{players.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select><select value={f.category} onChange={e=>setF({...f,category:e.target.value})}><option value="training">Training</option><option value="game">Game</option><option value="rehab">Rehab</option><option value="medical">Medical</option><option value="exercise">Exercise</option><option value="education">Education</option></select><input placeholder="タイトル" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><input placeholder="動画URL" value={f.video_url} onChange={e=>setF({...f,video_url:e.target.value})}/></div><textarea placeholder="説明" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><button onClick={add}>登録</button></div>{msg&&<div className="notice">{msg}</div>}<div className="libraryGrid">{rows.map(r=><div className="panel" key={r.id}><h3>{r.title}</h3><p>{r.profiles?.full_name||'チーム共通'} / {r.category}</p>{r.video_url&&<a href={r.video_url} target="_blank" rel="noreferrer">動画を開く</a>}</div>)}</div></div>
}
function Prevention(){
 const [rows,setRows]=useState<any[]>([]),[f,setF]=useState<any>({activity_date:new Date().toISOString().slice(0,10),category:'ACL予防',title:'',target_grade:'',participants_count:'',duration_minutes:'',details:''}),[msg,setMsg]=useState('');
 const load=async()=>{const {data}=await supabase.from('prevention_activities').select('*').order('activity_date',{ascending:false});setRows(data||[])};
 useEffect(()=>{load()},[]);
 async function add(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from('prevention_activities').insert({...f,participants_count:f.participants_count?Number(f.participants_count):null,duration_minutes:f.duration_minutes?Number(f.duration_minutes):null,created_by:user.id});setMsg(error?error.message:'傷害予防活動を記録');if(!error)load()}
 return <div><div className="panel form"><div className="grid2"><input type="date" value={f.activity_date} onChange={e=>setF({...f,activity_date:e.target.value})}/><input placeholder="カテゴリー" value={f.category} onChange={e=>setF({...f,category:e.target.value})}/><input placeholder="タイトル" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><input placeholder="対象学年" value={f.target_grade} onChange={e=>setF({...f,target_grade:e.target.value})}/><input type="number" placeholder="対象人数" value={f.participants_count} onChange={e=>setF({...f,participants_count:e.target.value})}/><input type="number" placeholder="時間 分" value={f.duration_minutes} onChange={e=>setF({...f,duration_minutes:e.target.value})}/></div><textarea placeholder="内容" value={f.details} onChange={e=>setF({...f,details:e.target.value})}/><button onClick={add}>記録</button></div>{msg&&<div className="notice">{msg}</div>}<div className="tableWrap"><table><thead><tr><th>日付</th><th>活動</th><th>対象</th><th>人数</th><th>時間</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.activity_date}</td><td>{r.category}｜{r.title}</td><td>{r.target_grade||'-'}</td><td>{r.participants_count==null?'-':r.participants_count}</td><td>{r.duration_minutes==null?'-':r.duration_minutes}分</td></tr>)}</tbody></table></div></div>
}
function Report(){
 const [stats,setStats]=useState<any>({players:0,injuries:0,rehab:0,prevention:0,participants:0,visits:0}),[injuries,setInjuries]=useState<any[]>([]);
 async function load(){const [{count:pc},{data:i},{count:vc},{data:p}]=await Promise.all([supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','player').eq('is_hidden',false),supabase.from('injury_cases').select('id,injury_date,injury_name,body_part,current_status,profiles(full_name,school_grade,position)').order('injury_date',{ascending:false}),supabase.from('hospital_visits').select('*',{count:'exact',head:true}),supabase.from('prevention_activities').select('participants_count')]);const a=i||[];setInjuries(a);setStats({players:pc||0,injuries:a.length,rehab:a.filter(x=>x.current_status==='rehab').length,prevention:p?.length||0,participants:(p||[]).reduce((n,x)=>n+Number(x.participants_count||0),0),visits:vc||0})}
 useEffect(()=>{load()},[]);
 function csv(){const rows:any[]=[['選手','学年','Pos','受傷日','傷害名','部位','状態'],...injuries.map(x=>[x.profiles?.full_name||'',x.profiles?.school_grade||'',x.profiles?.position||'',x.injury_date,x.injury_name,x.body_part,statusLabel[x.current_status]||x.current_status])];const body='\ufeff'+rows.map(r=>r.map((v:any)=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([body],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='KTRS_FMS_injury_report.csv';a.click();URL.revokeObjectURL(u)}
 const cards=[['登録選手',stats.players],['傷害ケース',stats.injuries],['リハビリ中',stats.rehab],['傷害予防活動',stats.prevention],['延べ参加人数',stats.participants],['病院受診記録',stats.visits]];
 return <div><div className="cards">{cards.map(([l,n])=><div className="stat info" key={String(l)}><b>{n}</b><span>{l}</span></div>)}</div><div className="panel"><h3>補助金・事業報告用出力</h3><p>通常業務で蓄積したデータを外部出力できます。</p><div className="actions"><button onClick={csv}>傷害一覧CSV</button><button className="secondary" onClick={()=>window.print()}>PDF / 印刷</button></div></div></div>
}
function Team(){
 const [players,setPlayers]=useState<any[]>([]),[teams,setTeams]=useState<any[]>([]),[staff,setStaff]=useState<any[]>([]),[name,setName]=useState(''),[msg,setMsg]=useState('');
 async function load(){const [{data:p},{data:t},{data:s}]=await Promise.all([supabase.from('profiles').select('id,full_name,school_grade,position,player_registration_number').eq('role','player').eq('is_hidden',false).order('school_grade'),supabase.from('teams').select('*').order('name'),supabase.from('profiles').select('id,full_name,staff_title').eq('role','staff').order('full_name')]);setPlayers(p||[]);setTeams(t||[]);setStaff(s||[])}
 useEffect(()=>{load()},[]);
 async function addTeam(){const {data:{user}}=await supabase.auth.getUser();if(!user||!name.trim())return;const {error}=await supabase.from('teams').insert({name:name.trim(),created_by:user.id});setMsg(error?error.message:'チーム追加');if(!error){setName('');load()}}
 return <div><h2>Players</h2><div className="tableWrap"><table><thead><tr><th>選手</th><th>学年</th><th>Pos</th><th>選手登録番号</th></tr></thead><tbody>{players.map(p=><tr key={p.id}><td>{p.full_name}</td><td>{p.school_grade||'-'}年</td><td>{p.position||'-'}</td><td>{p.player_registration_number||'-'}</td></tr>)}</tbody></table></div><h2>Teams</h2><div className="panel"><div className="actions"><input placeholder="チーム名" value={name} onChange={e=>setName(e.target.value)}/><button onClick={addTeam}>追加</button></div>{teams.map(t=><div className="historyLine" key={t.id}><b>{t.name}</b><span>{t.category||'高校サッカー'}</span></div>)}</div><h2>Staff</h2><div className="tableWrap"><table><thead><tr><th>氏名</th><th>役職</th></tr></thead><tbody>{staff.map(s=><tr key={s.id}><td>{s.full_name}</td><td>{s.staff_title||'-'}</td></tr>)}</tbody></table></div>{msg&&<div className="notice">{msg}</div>}</div>
}