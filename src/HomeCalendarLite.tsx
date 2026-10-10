import React,{useEffect,useMemo,useState} from 'react';
import {createRoot,Root} from 'react-dom/client';
import {supabase} from './supabase';

const pad=(n:number)=>String(n).padStart(2,'0');
const iso=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const cellsFor=(m:Date)=>{const first=new Date(m.getFullYear(),m.getMonth(),1);const start=new Date(first);start.setDate(1-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})};
const contrast=(hex:string)=>{const h=(hex||'#5B8DEF').replace('#','');const r=parseInt(h.slice(0,2),16)||0,g=parseInt(h.slice(2,4),16)||0,b=parseInt(h.slice(4,6),16)||0;return (r*299+g*587+b*114)/1000>150?'#17324d':'#fff'};
const kind=(eventType:string)=>eventType==='training'?'TR':'Game';

type Cat={id:number;name:string;color_hex:string};
function HomeCalendarLite(){
 const now=new Date();
 const [month,setMonth]=useState(new Date(now.getFullYear(),now.getMonth(),1));
 const [rows,setRows]=useState<any[]>([]),[cats,setCats]=useState<Cat[]>([]),[detail,setDetail]=useState<any|null>(null),[busy,setBusy]=useState(false);
 const cells=useMemo(()=>cellsFor(month),[month]);
 useEffect(()=>{void load()},[month.getFullYear(),month.getMonth()]);
 async function load(){
  const from=new Date(cells[0]);from.setHours(0,0,0,0);const to=new Date(cells[cells.length-1]);to.setHours(23,59,59,999);
  const [{data:s},{data:c}]=await Promise.all([
   supabase.from('schedule_events').select('id,event_type,title,category_id,starts_at,ends_at,venue,opponent,competition_name,details,gps_enabled').gte('starts_at',from.toISOString()).lte('starts_at',to.toISOString()).order('starts_at'),
   supabase.from('schedule_entry_categories').select('id,name,color_hex').eq('is_active',true).order('sort_order').order('name')
  ]);setRows(s||[]);setCats((c||[]) as Cat[])
 }
 const catFor=(r:any)=>cats.find(c=>c.id===Number(r.category_id));
 const labelFor=(r:any)=>`${catFor(r)?.name||'未設定'} ${kind(r.event_type)}`;
 async function open(r:any){
  setBusy(true);const cat=catFor(r);
  const {data:p}=await supabase.from('training_plans').select('id,plan_date,title,category_id,venue,start_time,total_minutes,theme,objective,notes').eq('schedule_event_id',r.id).order('id');
  let blocks:any[]=[];if(p?.length){const {data}=await supabase.from('training_plan_blocks').select('training_plan_id,block_label,tr_category,menu_name,theme,duration_minutes,objective,content').in('training_plan_id',p.map((x:any)=>x.id)).eq('is_visible',true).order('sort_order');blocks=data||[]}
  setDetail({schedule:r,cat,plans:p||[],blocks});setBusy(false)
 }
 return <div className="hlWrap"><div className="hlHead"><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹ 前月</button><h3>{month.getFullYear()}年 {month.getMonth()+1}月</h3><div><button onClick={()=>setMonth(new Date(now.getFullYear(),now.getMonth(),1))}>今月</button><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>翌月 ›</button></div></div><div className="hlWeek"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div><div className="hlGrid">{cells.map(d=>{const key=iso(d);const day=rows.filter(r=>iso(new Date(r.starts_at))===key);return <div key={key} className={'hlDay '+(d.getMonth()!==month.getMonth()?'outside ':'')+(key===iso(now)?'today':'')}><b>{d.getDate()}</b><div>{day.map(r=>{const c=catFor(r);const color=c?.color_hex||'#5B8DEF';return <button key={r.id} style={{background:color,color:contrast(color)}} onClick={()=>open(r)}>{labelFor(r)}</button>})}</div></div>})}</div>{busy&&<div className="hlLoading">詳細を読み込み中...</div>}{detail&&<div className="hlOverlay" onClick={()=>setDetail(null)}><div className="hlModal" onClick={e=>e.stopPropagation()}><div className="hlModalHead"><div><small>{iso(new Date(detail.schedule.starts_at))}</small><h2>{`${detail.cat?.name||'未設定'} ${kind(detail.schedule.event_type)}`}</h2></div><button onClick={()=>setDetail(null)}>閉じる</button></div><div className="hlMeta"><span>{kind(detail.schedule.event_type)}</span><span>{new Date(detail.schedule.starts_at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</span><span>{detail.schedule.venue||'-'}</span></div>{detail.schedule.opponent&&<p><b>対戦相手：</b>{detail.schedule.opponent}</p>}{detail.schedule.competition_name&&<p><b>大会名：</b>{detail.schedule.competition_name}</p>}{detail.schedule.details&&<p>{detail.schedule.details}</p>}<h3>TRメニュー</h3>{detail.plans.length?detail.plans.map((p:any)=><div className="hlPlan" key={p.id}><b>{p.title}</b>{p.theme&&<span>Theme：{p.theme}</span>}{detail.blocks.filter((b:any)=>b.training_plan_id===p.id).map((b:any,i:number)=><div key={b.training_plan_id+'-'+(b.tr_category||b.block_label)+'-'+i}><strong>{b.tr_category||b.block_label||'TR'}{b.duration_minutes!=null?` / ${b.duration_minutes}分`:''}</strong><span>{b.menu_name||b.content||b.theme||b.objective||'-'}</span></div>)}</div>):<p className="hlEmpty">このTraining/GameにTRメニューはありません。</p>}</div></div>}</div>
}

const css=`.hlWrap{margin:14px 0}.hlHead{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px}.hlHead h3{text-align:center;margin:0}.hlHead>div{display:flex;gap:6px}.hlHead button,.hlModal button{border:1px solid #d5e3ef;background:#f4f8fb;color:#46627b;border-radius:8px;padding:7px 10px}.hlWeek,.hlGrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}.hlWeek{margin-top:10px;background:#f5f8fb;border:1px solid #e1e8ef;border-bottom:0}.hlWeek span{text-align:center;padding:7px;font-size:11px;font-weight:700}.hlGrid{border-left:1px solid #e1e8ef;border-top:1px solid #e1e8ef}.hlDay{min-height:92px;border-right:1px solid #e1e8ef;border-bottom:1px solid #e1e8ef;padding:5px;background:#fff}.hlDay.outside{background:#fafbfc;color:#a7b1ba}.hlDay.today{box-shadow:inset 0 0 0 2px #9ec9ee}.hlDay>b{font-size:11px}.hlDay>div{display:grid;gap:3px;margin-top:4px}.hlDay button{border:0;border-radius:6px;padding:4px 5px;font-size:10px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hlLoading{padding:8px 0;font-size:11px;color:#708497}.hlOverlay{position:fixed;inset:0;background:rgba(13,31,48,.45);z-index:10000;display:grid;place-items:center;padding:18px}.hlModal{width:min(820px,94vw);max-height:88vh;overflow:auto;background:#fff;border-radius:15px;padding:18px}.hlModalHead{display:flex;justify-content:space-between;gap:12px}.hlModalHead h2{margin:2px 0 10px}.hlMeta{display:flex;gap:8px;flex-wrap:wrap}.hlMeta span{background:#f4f7fa;border-radius:999px;padding:5px 8px;font-size:11px}.hlPlan{border-top:1px solid #edf1f5;padding:9px 0;display:grid;gap:6px}.hlPlan>div{display:grid;grid-template-columns:150px 1fr;gap:8px;background:#f7f9fb;border-radius:8px;padding:7px}.hlEmpty{font-size:12px;color:#81909e}@media(max-width:760px){.hlHead{grid-template-columns:1fr}.hlHead h3{order:-1}.hlDay{min-height:72px;padding:3px}.hlDay button{font-size:9px}.hlPlan>div{grid-template-columns:1fr}}`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
let root:Root|null=null;
function mount(){if(document.querySelector('.kxHomeHost')){const old=document.querySelector('.hlHost');if(old){root?.unmount();root=null;old.remove()}return}const section=document.querySelector<HTMLElement>('section.homePage');if(!section||section.querySelector('.hlHost'))return;const weekly=section.querySelector<HTMLElement>('.weeklySchedule');if(!weekly)return;weekly.style.display='none';const host=document.createElement('div');host.className='hlHost';weekly.insertAdjacentElement('beforebegin',host);root=createRoot(host);root.render(<HomeCalendarLite/>)}
const obs=new MutationObserver(mount);obs.observe(document.documentElement,{childList:true,subtree:true});mount();
export {};
