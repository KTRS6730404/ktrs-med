import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './supabase';
import FmsHub from './FmsHub';
import './styles.css';

type Role='player'|'staff';
type Approval='pending'|'approved'|'rejected';
type Profile={id:string;role:Role;full_name:string;school_grade:number|null;position:string|null;jersey_number:number|null;height_cm:number|null;weight_kg:number|null;dominant_foot:string|null;origin_team:string|null;avatar_path:string|null;player_registration_number:string|null;staff_title:string|null;team_id:number|null};
type ApprovalRow={user_id:string;status:Approval;rejection_reason:string|null};
type Screen='home'|'team_players'|'team_staff'|'team_teams'|'schedule_training'|'schedule_games'|'schedule_events'|'schedule_medical'|'performance_physical'|'performance_gps'|'performance_body'|'performance_benchmark'|'medical_injury'|'medical_evaluation'|'medical_treatment'|'medical_rehab'|'medical_rtp'|'development_evaluation'|'development_objectives'|'development_reports'|'development_video'|'communication_chat'|'communication_announcement'|'communication_notifications'|'management_accounts'|'management_permissions'|'management_data'|'management_settings';
type PlayerScreen='mypage'|'report'|'history'|'physical'|'chat'|'settings';

const statusLabel:Record<string,string>={needs_attention:'要対応',rehab:'リハビリ中',observation:'経過観察',available:'問題なし'};
const statusClass:Record<string,string>={needs_attention:'danger',rehab:'info',observation:'warn',available:'ok'};
const availabilityLabel:Record<string,string>={out:'参加不可',modified:'別メニュー',partial:'部分参加',full:'通常参加'};

function App(){
 const [session,setSession]=useState<any>(null);
 const [profile,setProfile]=useState<Profile|null>(null);
 const [approval,setApproval]=useState<ApprovalRow|null>(null);
 const [isAdmin,setIsAdmin]=useState(false);
 const [screen,setScreen]=useState<Screen>('home');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [alerts,setAlerts]=useState<Record<string,number>>({team:0,reports:0,players:0,case:0,chat:0,admin:0});

 useEffect(()=>{
   supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
   return()=>subscription.unsubscribe();
 },[]);

 useEffect(()=>{if(!session){setProfile(null);setApproval(null);setIsAdmin(false);setAlerts({team:0,reports:0,players:0,case:0,admin:0});return} loadIdentity()},[session?.user?.id]);

 async function loadIdentity(){
   setLoading(true);setError('');
   const uid=session.user.id;
   const [{data:p,error:pe},{data:a,error:ae},{data:ad,error:ade}]=await Promise.all([
     supabase.from('profiles').select('id,role,full_name,school_grade,position,jersey_number,height_cm,weight_kg,dominant_foot,origin_team,avatar_path,player_registration_number,staff_title,team_id').eq('id',uid).maybeSingle(),
     supabase.from('account_approvals').select('user_id,status,rejection_reason').eq('user_id',uid).maybeSingle(),
     supabase.from('app_admins').select('user_id').eq('user_id',uid).maybeSingle()
   ]);
   if(pe||ae)setError((pe||ae)?.message||'読み込みエラー');
   const adminFlag=!!ad&&!ade;
   setProfile(p as any);setApproval(a as any);setIsAdmin(adminFlag);
   if(adminFlag){
     const {data:counts}=await supabase.rpc('get_admin_tab_alert_counts');
     setAlerts({...{team:0,reports:0,players:0,case:0,admin:0},...(counts||{})});
   }else if((p as any)?.role==='staff'){
     const {data:u}=await supabase.rpc('get_unread_injury_report_count');
     setAlerts({team:0,reports:Number(u||0),players:0,case:0,admin:0});
   }
   setLoading(false);
 }

 async function changeScreen(next:Screen){
   setScreen(next);
   const legacyMap:Record<string,string>={home:'team',team_players:'players',medical_injury:'case',communication_chat:'chat',management_accounts:'admin',development_reports:'reports'};
   const key=legacyMap[next];
   if(isAdmin&&key){
     await supabase.rpc('mark_admin_tab_read',{p_tab_key:key});
     setAlerts(prev=>({...prev,[key]:0}));
   }else if(next==='development_reports' && profile?.role==='staff'){
     await supabase.rpc('mark_injury_reports_read');
     setAlerts(prev=>({...prev,reports:0}));
   }
 }

 if(loading)return <Center>読み込み中...</Center>;
 if(!session)return <Auth/>;
 if(approval?.status!=='approved')return <Pending status={approval?.status} reason={approval?.rejection_reason} onLogout={()=>supabase.auth.signOut()}/>;
 if(profile?.role==='player'&&!isAdmin)return <PlayerPortal profile={profile} session={session} onLogout={()=>supabase.auth.signOut()}/>;

 return <Shell profile={profile} isAdmin={isAdmin} screen={screen} setScreen={changeScreen} alerts={alerts} onLogout={()=>supabase.auth.signOut()}>
   {error&&<div className="error">{error}</div>}
   {screen==='home'&&<Team isAdmin={isAdmin} profile={profile}/>}
   {screen==='team_players'&&<Players isAdmin={isAdmin}/>}
   {screen==='team_staff'&&<DirectoryView mode="staff" isAdmin={isAdmin}/>}
   {screen==='team_teams'&&<DirectoryView mode="teams" isAdmin={isAdmin}/>}
   {screen==='schedule_training'&&<FmsHub initialTab="schedule" compact pageTitle="SCHEDULE / Training"/>}
   {screen==='schedule_games'&&<FmsHub initialTab="schedule" compact pageTitle="SCHEDULE / Games"/>}
   {screen==='schedule_events'&&<FmsHub initialTab="schedule" compact pageTitle="SCHEDULE / Events"/>}
   {screen==='schedule_medical'&&<FmsHub initialTab="schedule" compact pageTitle="SCHEDULE / Medical"/>}
   {screen==='performance_physical'&&<><Title t="PERFORMANCE / Physical" s="フィジカル測定と経時変化"/><AdminPhysicalBulk/></>}
   {screen==='performance_gps'&&<FmsHub initialTab="gps" compact pageTitle="PERFORMANCE / GPS"/>}
   {screen==='performance_body'&&<ModulePlaceholder title="PERFORMANCE / Body Composition" text="身長・体重・BMI・体組成データを集約する画面です。"/>}
   {screen==='performance_benchmark'&&<ModulePlaceholder title="PERFORMANCE / Benchmark" text="学年・ポジション別の基準値と個人値を比較する画面です。"/>}
   {screen==='medical_injury'&&<Cases isAdmin={isAdmin}/>}
   {screen==='medical_evaluation'&&<ModulePlaceholder title="MEDICAL / Evaluation" text="現場評価・所見・テスト結果を記録する画面です。"/>}
   {screen==='medical_treatment'&&<ModulePlaceholder title="MEDICAL / Treatment" text="処置・治療・対応履歴を記録する画面です。"/>}
   {screen==='medical_rehab'&&<FmsHub initialTab="rehab" compact pageTitle="MEDICAL / Rehabilitation"/>}
   {screen==='medical_rtp'&&<ModulePlaceholder title="MEDICAL / Return to Play" text="段階的復帰と最終復帰判断を記録する画面です。"/>}
   {screen==='development_evaluation'&&<ModulePlaceholder title="DEVELOPMENT / Player Evaluation" text="選手評価を蓄積し、成長を追跡する画面です。"/>}
   {screen==='development_objectives'&&<ModulePlaceholder title="DEVELOPMENT / Objectives" text="個人・チームの目標と進捗を管理する画面です。"/>}
   {screen==='development_reports'&&<Reports profile={profile} isAdmin={isAdmin}/>}
   {screen==='development_video'&&<FmsHub initialTab="video" compact pageTitle="DEVELOPMENT / Video"/>}
   {screen==='communication_chat'&&<StaffChat profile={profile} isAdmin={isAdmin}/>}
   {screen==='communication_announcement'&&<ModulePlaceholder title="COMMUNICATION / Announcement" text="チーム全体・カテゴリー別のお知らせ配信画面です。"/>}
   {screen==='communication_notifications'&&<ModulePlaceholder title="COMMUNICATION / Notifications" text="通知履歴と既読状況を管理する画面です。"/>}
   {screen==='management_accounts'&&isAdmin&&<Admin/>}
   {screen==='management_permissions'&&<ModulePlaceholder title="MANAGEMENT / Permissions" text="ロール・閲覧範囲・編集権限を管理する画面です。"/>}
   {screen==='management_data'&&<FmsHub initialTab="report" compact pageTitle="MANAGEMENT / Data"/>}
   {screen==='management_settings'&&<ModulePlaceholder title="MANAGEMENT / Settings" text="KTRS FMS全体の設定を管理する画面です。"/>}
 </Shell>;
}

function Auth(){
 const [mode,setMode]=useState<'login'|'signup'>('login'),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const [form,setForm]=useState<any>({email:'',password:'',password2:'',role:'player',full_name:'',school_grade:'1',position:'FW',height_cm:'',weight_kg:'',dominant_foot:'right',origin_team:'',player_registration_number:'',staff_title:''});
 async function submit(e:React.FormEvent){
   e.preventDefault();setBusy(true);setMsg('');
   if(mode==='signup'&&form.password!==form.password2){setMsg('パスワードが一致しません');setBusy(false);return}
   if(!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password)){setMsg('パスワードは8文字以上、英字と数字を含めてください');setBusy(false);return}
   if(mode==='login'){
     const {error}=await supabase.auth.signInWithPassword({email:form.email,password:form.password});if(error)setMsg(error.message);
   }else{
     const metadata:any={role:form.role,full_name:form.full_name,player_registration_number:form.role==='player'?form.player_registration_number:null,staff_title:form.role==='staff'?form.staff_title:null};
     if(form.role==='player')Object.assign(metadata,{school_grade:Number(form.school_grade),position:form.position,height_cm:Number(form.height_cm),weight_kg:Number(form.weight_kg),dominant_foot:form.dominant_foot,origin_team:form.origin_team});
     const {error}=await supabase.auth.signUp({email:form.email,password:form.password,options:{data:metadata}});
     setMsg(error?error.message:'登録しました。管理者の承認後に利用できます。');
   }
   setBusy(false);
 }
 return <div className="authPage"><div className="authCard"><div className="brandBig">KTRS FMS</div><div className="sub">FOOTBALL MANAGEMENT SYSTEM</div><h2>{mode==='login'?'ログイン':'アカウント新規作成'}</h2>
 <form onSubmit={submit} className="form"><input placeholder="メールアドレス" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input placeholder="パスワード" type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
 {mode==='signup'&&<><input placeholder="パスワード（確認）" type="password" required value={form.password2} onChange={e=>setForm({...form,password2:e.target.value})}/><input placeholder="氏名" required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="player">選手</option><option value="staff">スタッフ</option></select>{form.role==='staff'&&<input placeholder="役職（例：トレーナー、コーチ）" value={form.staff_title} onChange={e=>setForm({...form,staff_title:e.target.value})}/>} {form.role==='player'&&<div className="grid2"><input placeholder="選手登録番号" value={form.player_registration_number} onChange={e=>setForm({...form,player_registration_number:e.target.value})}/><select value={form.school_grade} onChange={e=>setForm({...form,school_grade:e.target.value})}><option>1</option><option>2</option><option>3</option></select><select value={form.position} onChange={e=>setForm({...form,position:e.target.value})}><option>GK</option><option>DF</option><option>MF</option><option>FW</option></select><input placeholder="身長 cm" type="number" required value={form.height_cm} onChange={e=>setForm({...form,height_cm:e.target.value})}/><input placeholder="体重 kg" type="number" required value={form.weight_kg} onChange={e=>setForm({...form,weight_kg:e.target.value})}/><select value={form.dominant_foot} onChange={e=>setForm({...form,dominant_foot:e.target.value})}><option value="right">右</option><option value="left">左</option><option value="both">両方</option></select><input placeholder="出身チーム" value={form.origin_team} onChange={e=>setForm({...form,origin_team:e.target.value})}/></div>}</>}
 <button disabled={busy}>{busy?'処理中...':mode==='login'?'ログイン':'登録する'}</button></form>{msg&&<div className="notice">{msg}</div>}<button className="linkBtn" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'アカウントの新規作成':'ログインへ戻る'}</button><p className="fine">医療機関の診断に代わるものではありません。</p></div></div>;
}

function Pending({status,reason,onLogout}:{status?:Approval;reason?:string|null;onLogout:()=>void}){return <Center><div className="authCard"><h2>{status==='rejected'?'アカウントは承認されていません':'管理者の承認待ちです'}</h2><p>{status==='rejected'?(reason||'管理者にお問い合わせください。'):'承認後にKTRS FMSを利用できます。'}</p><button onClick={onLogout}>ログアウト</button></div></Center>}

function Shell({profile,isAdmin,screen,setScreen,alerts,onLogout,children}:any){
 const [open,setOpen]=useState<Record<string,boolean>>({TEAM:true,SCHEDULE:false,PERFORMANCE:false,MEDICAL:true,DEVELOPMENT:false,COMMUNICATION:false,MANAGEMENT:false});
 const groups:{key:string;label:string;items:[Screen,string][]}[]=[
   {key:'TEAM',label:'TEAM',items:[['team_players','Players'],['team_staff','Staff'],['team_teams','Teams']]},
   {key:'SCHEDULE',label:'SCHEDULE',items:[['schedule_training','Training'],['schedule_games','Games'],['schedule_events','Events'],['schedule_medical','Medical']]},
   {key:'PERFORMANCE',label:'PERFORMANCE',items:[['performance_physical','Physical'],['performance_gps','GPS'],['performance_body','Body Composition'],['performance_benchmark','Benchmark']]},
   {key:'MEDICAL',label:'MEDICAL',items:[['medical_injury','Injury'],['medical_evaluation','Evaluation'],['medical_treatment','Treatment'],['medical_rehab','Rehabilitation'],['medical_rtp','Return to Play']]},
   {key:'DEVELOPMENT',label:'DEVELOPMENT',items:[['development_evaluation','Player Evaluation'],['development_objectives','Objectives'],['development_reports','Reports'],['development_video','Video']]},
   {key:'COMMUNICATION',label:'COMMUNICATION',items:[['communication_chat','Chat'],['communication_announcement','Announcement'],['communication_notifications','Notifications']]},
   {key:'MANAGEMENT',label:'MANAGEMENT',items:[['management_accounts','Accounts'],['management_permissions','Permissions'],['management_data','Data'],['management_settings','Settings']]}
 ];
 const alertFor=(s:Screen)=>s==='team_players'?Number(alerts?.players||0):s==='medical_injury'?Number(alerts?.case||0):s==='development_reports'?Number(alerts?.reports||0):s==='communication_chat'?Number(alerts?.chat||0):s==='management_accounts'?Number(alerts?.admin||0):0;
 return <div className="appFrame">
   <aside className="mainSidebar">
     <div className="sidebarBrand"><b>KTRS FMS</b><span>FOOTBALL MANAGEMENT SYSTEM</span></div>
     <button className={'sidebarHome '+(screen==='home'?'active':'')} onClick={()=>setScreen('home')}>HOME</button>
     {groups.map(g=><div className="navGroup" key={g.key}>
       <button className={'navGroupHead '+(g.items.some(([k])=>k===screen)?'activeGroup':'')} onClick={()=>setOpen(o=>({...o,[g.key]:!o[g.key]}))}>
         <span>{g.label}</span><span className="chev">{open[g.key]?'−':'＋'}</span>
       </button>
       {open[g.key]&&<div className="navChildren">{g.items.filter(([k])=>isAdmin||!k.startsWith('management_')).map(([k,l])=>{const n=alertFor(k);return <button key={k} className={screen===k?'active':''} onClick={()=>setScreen(k)}><span>{l}</span>{n>0&&<em>{n}</em>}</button>})}</div>}
     </div>)}
   </aside>
   <div className="appContent">
     <header className="topHeader"><div><b>KTRS FMS</b><span> K-trainers Football Management System</span></div><div className="user">{profile?.full_name||''}<button onClick={onLogout}>ログアウト</button></div></header>
     <main>{children}</main>
     <footer>© K-TRAINERS. All rights reserved.<br/><span>傷害情報は認証されたサーバーに保存されます。</span></footer>
   </div>
 </div>;
}

function PlayerPortal({profile,session,onLogout}:{profile:Profile;session:any;onLogout:()=>void}){
 const [screen,setScreen]=useState<PlayerScreen>('mypage');
 const items:[PlayerScreen,string][]=[['mypage','マイページ'],['report','ケガの報告'],['history','ケガの履歴'],['physical','フィジカルデータ'],['chat','チャット'],['settings','設定']];
 return <div className="playerPortal"><header className="playerHeader"><div><b>KTRS FMS</b><span> PLAYER PORTAL</span></div><div className="user">{profile.full_name} さん <button onClick={onLogout}>ログアウト</button></div></header><div className="playerBody"><aside className="playerSidebar">{items.map(([k,l])=><button key={k} className={screen===k?'active':''} onClick={()=>setScreen(k)}>{l}</button>)}</aside><main className="playerMain">{screen==='mypage'&&<PlayerMyPage profile={profile}/>} {screen==='report'&&<PlayerInjuryReport profile={profile} onDone={()=>setScreen('history')}/>} {screen==='history'&&<PlayerInjuryHistory profile={profile}/>} {screen==='physical'&&<PhysicalMeasurements profile={profile}/>} {screen==='chat'&&<PlayerChat profile={profile}/>} {screen==='settings'&&<PlayerSettings profile={profile} session={session}/>}</main></div><footer>© K-TRAINERS. All rights reserved.</footer></div>;
}

function PlayerMyPage({profile}:{profile:Profile}){
 const [active,setActive]=useState<any[]>([]),[messages,setMessages]=useState<any[]>([]),[schedule,setSchedule]=useState<any[]>([]);
 useEffect(()=>{(async()=>{
   const today=new Date(); const end=new Date(today); end.setDate(today.getDate()+7);
   const [{data:a},{data:m},{data:s}]=await Promise.all([
     supabase.from('injury_cases').select('id,injury_name,body_part,current_status,injury_date,rehab_start_date,rehab_stage').eq('player_id',profile.id).neq('current_status','available').order('injury_date',{ascending:false}),
     supabase.from('player_messages').select('id,title,body,created_at').eq('player_id',profile.id).order('created_at',{ascending:false}).limit(5),
     supabase.from('player_schedule').select('id,title,starts_at,ends_at,category').gte('starts_at',today.toISOString()).lt('starts_at',end.toISOString()).order('starts_at',{ascending:true})
   ]); setActive(a||[]);setMessages(m||[]);setSchedule(s||[]);
 })()},[profile.id]);
 return <section><Title t="マイページ" s="自分の情報と今週の状況を確認できます"/>
 <div className="panel playerInfoCard"><div className="playerInfoTop"><Avatar path={profile.avatar_path} name={profile.full_name} size={92}/><div><h3>選手情報</h3><p className="fine">顔写真は「設定」から登録・変更できます。</p></div></div><div className="infoGrid"><div><span>氏名</span><b>{profile.full_name}</b></div><div><span>学年</span><b>{profile.school_grade||'-'}年</b></div><div><span>ポジション</span><b>{profile.position||'-'}</b></div><div><span>身長 / 体重</span><b>{profile.height_cm||'-'}cm / {profile.weight_kg||'-'}kg</b></div><div><span>利き足</span><b>{profile.dominant_foot==='right'?'右':profile.dominant_foot==='left'?'左':profile.dominant_foot==='both'?'両方':'-'}</b></div><div><span>出身チーム</span><b>{profile.origin_team||'-'}</b></div></div>
 {active.length>0&&<div className="activeInjuries"><h4>現在対応中のケガ</h4>{active.map(x=><div className="miniRow" key={x.id}><span>{x.injury_name} / {x.body_part}</span><span className={'pill '+statusClass[x.current_status]}>{statusLabel[x.current_status]}{x.current_status==='rehab'&&x.rehab_start_date?' / Day '+(Math.floor((new Date().setHours(0,0,0,0)-new Date(x.rehab_start_date+'T00:00:00').setHours(0,0,0,0))/86400000)+1):''}</span></div>)}</div>}</div>
 <div className="panel"><h3>新着メッセージ</h3>{messages.length?messages.map(m=><div className="messageItem" key={m.id}><b>{m.title}</b><p>{m.body||''}</p><small>{new Date(m.created_at).toLocaleDateString('ja-JP')}</small></div>):<div className="empty compact">新着メッセージはありません。</div>}</div>
 <div className="panel"><h3>今週の予定</h3>{schedule.length?schedule.map(s=><div className="scheduleItem" key={s.id}><b>{new Date(s.starts_at).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'})}</b><span>{s.title}</span>{s.category&&<small>{s.category}</small>}</div>):<div className="empty compact">今週の予定は登録されていません。</div>}</div>
 </section>;
}

function emptyReport(){return {injury_date:'',symptom:'',body_part:'',side:'right',activity:'',mechanism:'',hospital_status:'未受診',facility_name:'',visit_date:'',diagnosis:'',instructed_plan:'',notes:''}}

function PlayerInjuryReport({profile,onDone}:{profile:Profile;onDone:()=>void}){
 const [form,setForm]=useState<any>(emptyReport()),[msg,setMsg]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();const {error}=await supabase.from('injury_reports').insert({player_id:profile.id,...form,visit_date:form.visit_date||null,review_status:'pending'});setMsg(error?error.message:'ケガの報告を送信しました。');if(!error){setForm(emptyReport());setTimeout(onDone,300)}}
 return <section><Title t="ケガの報告" s="新しいケガ・症状を報告します"/><form className="panel form" onSubmit={submit}><ReportFields value={form} setValue={setForm}/><button>報告する</button></form>{msg&&<div className="notice">{msg}</div>}</section>;
}

function PlayerInjuryHistory({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]),[edit,setEdit]=useState<any|null>(null),[msg,setMsg]=useState('');
 useEffect(()=>{load()},[]);
 async function load(){const {data,error}=await supabase.from('injury_reports').select('id,player_id,injury_date,symptom,body_part,side,activity,mechanism,hospital_status,facility_name,visit_date,diagnosis,instructed_plan,notes,review_status,created_at,player_edited_fields,player_last_edited_at').eq('player_id',profile.id).order('injury_date',{ascending:false});if(error)setMsg(error.message);setRows(data||[])}
 async function save(){if(!edit)return;const {error}=await supabase.rpc('player_update_own_injury_report',{p_report_id:edit.id,p_injury_date:edit.injury_date,p_symptom:edit.symptom,p_body_part:edit.body_part,p_side:edit.side,p_activity:edit.activity||null,p_mechanism:edit.mechanism||null,p_hospital_status:edit.hospital_status||null,p_facility_name:edit.facility_name||null,p_visit_date:edit.visit_date||null,p_diagnosis:edit.diagnosis||null,p_instructed_plan:edit.instructed_plan||null,p_notes:edit.notes||null});setMsg(error?error.message:'履歴を更新しました。');if(!error){setEdit(null);load()}}
 const changed=(r:any,k:string)=>Array.isArray(r.player_edited_fields)&&r.player_edited_fields.includes(k);
 return <section><Title t="ケガの履歴" s="該当するケガを選択して報告内容を編集できます"/>{msg&&<div className="notice">{msg}</div>}<div className="tableWrap"><table><thead><tr><th>受傷日</th><th>ケガ・症状</th><th>部位</th><th>受診</th><th>編集</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className={changed(r,'injury_date')?'changed':''}>{r.injury_date}</td><td className={changed(r,'symptom')?'changed':''}>{r.symptom}</td><td className={changed(r,'body_part')?'changed':''}>{r.body_part}</td><td>{r.hospital_status||'-'}</td><td><button onClick={()=>setEdit({...r})}>選択・編集</button></td></tr>)}</tbody></table>{!rows.length&&<div className="empty">ケガの履歴はありません。</div>}</div>
 {edit&&<div className="panel form editPanel"><h3>{edit.injury_date}｜{edit.symptom}</h3><p className="fine">変更した項目は保存後、赤文字・赤枠で表示されます。</p><ReportFields value={edit} setValue={setEdit} changedFields={edit.player_edited_fields}/><div className="actions"><button onClick={save}>変更を保存</button><button className="secondary" onClick={()=>setEdit(null)}>キャンセル</button></div></div>}</section>;
}

function PhysicalMeasurements({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]),[showInput,setShowInput]=useState(false),[msg,setMsg]=useState('');
 useEffect(()=>{load()},[]);
 async function load(){const {data}=await supabase.from('physical_measurement_records').select('*').eq('player_id',profile.id).order('measured_at',{ascending:false});setRows(data||[])}
 async function add(){const {error}=await supabase.from('physical_measurement_records').insert({player_id:profile.id,category:'基本測定',metrics:{},created_by:profile.id});setMsg(error?error.message:'新規測定枠を作成しました。測定項目は後ほど設定できます。');if(!error){setShowInput(false);load()}}
 const axes=['速度','持久力','筋力','パワー','敏捷性','柔軟性'];
 return <section><Title t="フィジカルデータ" s="測定項目の詳細は後ほど設定します"/><div className="actions topActions"><button onClick={()=>setShowInput(true)}>＋ 新規入力</button><button className="secondary" disabled={!rows.length}>編集</button></div>
 <div className="physicalGrid"><div className="panel"><h3>測定記録</h3><div className="tableWrap inner"><table><thead><tr><th>測定日</th><th>カテゴリー</th><th>本人</th><th>平均</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.measured_at}</td><td>{r.category}</td><td>—</td><td>—</td></tr>)}</tbody></table>{!rows.length&&<div className="empty">測定記録はまだありません。</div>}</div></div>
 <div className="panel radarPanel"><h3>平均値との比較</h3><RadarPlaceholder axes={axes}/><p className="fine">測定項目確定後、本人値とカテゴリー平均を重ねて表示します。</p></div></div>
 {showInput&&<div className="panel form"><h3>新規入力</h3><p>現在は測定枠のみ作成できます。詳細項目は後ほど追加します。</p><div className="actions"><button onClick={add}>測定枠を追加</button><button className="secondary" onClick={()=>setShowInput(false)}>キャンセル</button></div></div>}{msg&&<div className="notice">{msg}</div>}</section>;
}

function RadarPlaceholder({axes}:{axes:string[]}){
 const center=120,r=82; const pts=axes.map((_,i)=>{const a=(-90+i*360/axes.length)*Math.PI/180;return [center+r*Math.cos(a),center+r*Math.sin(a)]});
 return <svg className="radar" viewBox="0 0 240 240" aria-label="平均比較レーダーチャート">{[1,.75,.5,.25].map(k=><polygon key={k} points={pts.map(([x,y])=>center+(x-center)*k+','+(center+(y-center)*k)).join(' ')} fill="none" stroke="#dce6f1"/>)}
 {pts.map(([x,y],i)=><g key={axes[i]}><line x1={center} y1={center} x2={x} y2={y} stroke="#dce6f1"/><text x={center+(x-center)*1.17} y={center+(y-center)*1.17} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#60758a">{axes[i]}</text></g>)}<text x="120" y="120" textAnchor="middle" fontSize="12" fill="#8a9bae">データ未登録</text></svg>;
}

function PlayerSettings({profile,session}:{profile:Profile;session:any}){
 const [form,setForm]=useState<any>({...profile,birth_date:'',phone:''}),[email,setEmail]=useState(session?.user?.email||''),[password,setPassword]=useState(''),[msg,setMsg]=useState(''),[uploading,setUploading]=useState(false);
 useEffect(()=>{supabase.from('profiles').select('full_name,birth_date,phone,origin_team,height_cm,weight_kg,dominant_foot,school_grade,position,avatar_path').eq('id',profile.id).maybeSingle().then(({data})=>data&&setForm(data))},[profile.id]);
 async function saveProfile(){const {error}=await supabase.from('profiles').update({full_name:form.full_name,birth_date:form.birth_date||null,phone:form.phone||null,origin_team:form.origin_team||null,height_cm:form.height_cm||null,weight_kg:form.weight_kg||null,dominant_foot:form.dominant_foot||null,school_grade:form.school_grade||null,position:form.position||null}).eq('id',profile.id);setMsg(error?error.message:'基本情報を保存しました。')}
 async function uploadAvatar(file:File){
   setUploading(true);setMsg('');
   if(!file.type.startsWith('image/')){setMsg('画像ファイルを選択してください。');setUploading(false);return}
   if(file.size>5*1024*1024){setMsg('画像は5MB以下にしてください。');setUploading(false);return}
   const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
   const path=`${profile.id}/avatar.${ext}`;
   const {error:upErr}=await supabase.storage.from('profile-photos').upload(path,file,{upsert:true,contentType:file.type});
   if(upErr){setMsg(upErr.message);setUploading(false);return}
   const {error:pErr}=await supabase.from('profiles').update({avatar_path:path}).eq('id',profile.id);
   setMsg(pErr?pErr.message:'顔写真を更新しました。');if(!pErr)setForm({...form,avatar_path:path});setUploading(false);
 }
 async function saveAuth(){let error:any=null;if(email&&email!==session?.user?.email){const r=await supabase.auth.updateUser({email});error=r.error}if(!error&&password){const r=await supabase.auth.updateUser({password});error=r.error}setMsg(error?error.message:'ログイン情報を更新しました。');if(!error)setPassword('')}
 return <section><Title t="設定" s="顔写真・身体情報・経歴・ログイン情報を変更できます"/>
 <div className="panel form"><h3>顔写真</h3><div className="avatarSetting"><Avatar path={form.avatar_path} name={form.full_name||profile.full_name} size={112}/><div><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)uploadAvatar(file)}}/><p className="fine">JPEG・PNG・WebP、5MB以下。本人とスタッフ／管理者のみ閲覧できます。</p>{uploading&&<span className="fine">アップロード中...</span>}</div></div></div>
 <div className="panel form"><h3>身体情報・経歴</h3><div className="grid2"><input placeholder="氏名" value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})}/><input type="date" value={form.birth_date||''} onChange={e=>setForm({...form,birth_date:e.target.value})}/><input placeholder="電話番号" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/><input placeholder="出身チーム" value={form.origin_team||''} onChange={e=>setForm({...form,origin_team:e.target.value})}/><input type="number" placeholder="身長 cm" value={form.height_cm??''} onChange={e=>setForm({...form,height_cm:e.target.value===''?null:Number(e.target.value)})}/><input type="number" placeholder="体重 kg" value={form.weight_kg??''} onChange={e=>setForm({...form,weight_kg:e.target.value===''?null:Number(e.target.value)})}/><select value={form.dominant_foot||'right'} onChange={e=>setForm({...form,dominant_foot:e.target.value})}><option value="right">右利き</option><option value="left">左利き</option><option value="both">両利き</option></select><select value={form.school_grade||1} onChange={e=>setForm({...form,school_grade:Number(e.target.value)})}><option value={1}>1年</option><option value={2}>2年</option><option value={3}>3年</option></select><select value={form.position||'FW'} onChange={e=>setForm({...form,position:e.target.value})}><option>GK</option><option>DF</option><option>MF</option><option>FW</option></select></div><button onClick={saveProfile}>基本情報を保存</button></div>
 <div className="panel form"><h3>ID・パスワード</h3><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ログインID（メール）"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="新しいパスワード（8文字以上・英数字）"/><button onClick={saveAuth}>ログイン情報を変更</button></div>{msg&&<div className="notice">{msg}</div>}</section>;
}


function Avatar({path,name,size=48}:{path?:string|null;name:string;size?:number}){
 const [url,setUrl]=useState('');
 useEffect(()=>{let alive=true;if(!path){setUrl('');return}supabase.storage.from('profile-photos').createSignedUrl(path,3600).then(({data})=>{if(alive)setUrl(data?.signedUrl||'')});return()=>{alive=false}},[path]);
 const initials=(name||'?').slice(0,1);
 return <div className="avatar" style={{width:size,height:size,minWidth:size}}>{url?<img src={url} alt={name}/>:<span>{initials}</span>}</div>;
}

function PlayerChat({profile}:{profile:Profile}){
 const [staff,setStaff]=useState<any[]>([]),[messages,setMessages]=useState<any[]>([]),[recipient,setRecipient]=useState(''),[body,setBody]=useState(''),[confirm,setConfirm]=useState(false),[msg,setMsg]=useState('');
 useEffect(()=>{load()},[]);
 async function load(){
   const [{data:s},{data:m}]=await Promise.all([
     supabase.from('chat_staff_directory').select('user_id,full_name').eq('approval_status','approved').order('full_name'),
     supabase.from('chat_messages').select('*').order('created_at',{ascending:true})
   ]);
   setStaff(s||[]);setMessages(m||[]);
   await supabase.from('chat_messages').update({read_at:new Date().toISOString()}).eq('recipient_id',profile.id).is('read_at',null);
 }
 const staffMap=new Map(staff.map(s=>[s.user_id,s.full_name]));
 const nameOf=(id:string)=>id===profile.id?profile.full_name:(staffMap.get(id)||'スタッフ');
 async function send(){
   if(!recipient||!body.trim())return;
   const {error}=await supabase.from('chat_messages').insert({sender_id:profile.id,recipient_id:recipient,body:body.trim()});
   setMsg(error?error.message:'送信しました。');if(!error){setBody('');setConfirm(false);load()}
 }
 return <section><Title t="チャット" s="スタッフへメッセージを送信できます"/>
 <div className="chatLayout"><div className="panel chatHistory"><h3>メッセージ履歴</h3>{messages.length?messages.map(m=><div className={'chatBubble '+(m.sender_id===profile.id?'mine':'theirs')} key={m.id}><div className="chatMeta">{nameOf(m.sender_id)} → {nameOf(m.recipient_id)}　{new Date(m.created_at).toLocaleString('ja-JP')}</div><div>{m.body}</div></div>):<div className="empty">メッセージはまだありません。</div>}</div>
 <div className="panel chatComposer"><h3>メッセージを作成</h3><label>宛先</label><select value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="">スタッフを選択</option>{staff.map(s=><option value={s.user_id} key={s.user_id}>{s.full_name}</option>)}</select><label>メッセージ</label><textarea rows={8} maxLength={4000} value={body} onChange={e=>setBody(e.target.value)} placeholder="メッセージを入力"/><button disabled={!recipient||!body.trim()} onClick={()=>setConfirm(true)}>送信内容を確認</button></div></div>
 {confirm&&<div className="confirmOverlay"><div className="confirmCard"><h3>送信内容の確認</h3><p><b>宛先：</b>{nameOf(recipient)}</p><div className="confirmMessage">{body}</div><p className="fine">この内容で送信しますか？</p><div className="actions"><button onClick={send}>送信を確定</button><button className="secondary" onClick={()=>setConfirm(false)}>戻って修正</button></div></div></div>}
 {msg&&<div className="notice">{msg}</div>}</section>;
}

function StaffChat({profile,isAdmin}:{profile:Profile|null;isAdmin:boolean}){
 const [people,setPeople]=useState<any[]>([]),[messages,setMessages]=useState<any[]>([]),[recipient,setRecipient]=useState(''),[body,setBody]=useState(''),[confirm,setConfirm]=useState(false),[msg,setMsg]=useState('');
 const [filters,setFilters]=useState({person:'',keyword:'',date:''});
 useEffect(()=>{load()},[]);
 async function load(){
   const [{data:p},{data:m}]=await Promise.all([
     supabase.from('profiles').select('id,full_name,role,avatar_path').order('full_name'),
     supabase.from('chat_messages').select('*').order('created_at',{ascending:false})
   ]);
   setPeople(p||[]);setMessages(m||[]);
   if(profile?.id)await supabase.from('chat_messages').update({read_at:new Date().toISOString()}).eq('recipient_id',profile.id).is('read_at',null);
 }
 const map=new Map(people.map(p=>[p.id,p]));
 const nameOf=(id:string)=>map.get(id)?.full_name||'不明';
 const filtered=useMemo(()=>messages.filter(m=>{
   const personOk=!filters.person||m.sender_id===filters.person||m.recipient_id===filters.person;
   const keywordOk=!filters.keyword||String(m.body||'').toLowerCase().includes(filters.keyword.toLowerCase())||nameOf(m.sender_id).includes(filters.keyword)||nameOf(m.recipient_id).includes(filters.keyword);
   const dateOk=!filters.date||String(m.created_at||'').slice(0,10)===filters.date;
   return personOk&&keywordOk&&dateOk;
 }),[messages,filters,people]);
 async function send(){
   if(!profile?.id||!recipient||!body.trim())return;
   const {error}=await supabase.from('chat_messages').insert({sender_id:profile.id,recipient_id:recipient,body:body.trim()});
   setMsg(error?error.message:'送信しました。');if(!error){setBody('');setConfirm(false);load()}
 }
 return <section><Title t="チャット" s={isAdmin?'全選手・スタッフのチャットを確認できます':'自分宛て・自分が送信したチャットを確認できます'}/>
 {isAdmin&&<div className="chatFilters"><select value={filters.person} onChange={e=>setFilters({...filters,person:e.target.value})}><option value="">全参加者</option>{people.map(p=><option key={p.id} value={p.id}>{p.full_name}（{p.role==='player'?'選手':'スタッフ'}）</option>)}</select><input placeholder="キーワード検索" value={filters.keyword} onChange={e=>setFilters({...filters,keyword:e.target.value})}/><input type="date" value={filters.date} onChange={e=>setFilters({...filters,date:e.target.value})}/><button className="secondary" onClick={()=>setFilters({person:'',keyword:'',date:''})}>検索条件をクリア</button></div>}
 <div className="chatLayout adminChat"><div className="panel chatHistory"><h3>{isAdmin?'全チャット':'チャット履歴'}</h3>{filtered.length?filtered.map(m=><div className="adminChatRow" key={m.id}><div className="chatPeople"><div className="personCell"><Avatar path={map.get(m.sender_id)?.avatar_path} name={nameOf(m.sender_id)} size={34}/><b>{nameOf(m.sender_id)}</b></div><span>→</span><div className="personCell"><Avatar path={map.get(m.recipient_id)?.avatar_path} name={nameOf(m.recipient_id)} size={34}/><b>{nameOf(m.recipient_id)}</b></div></div><div className="chatBody">{m.body}</div><small>{new Date(m.created_at).toLocaleString('ja-JP')}</small></div>):<div className="empty">該当するチャットはありません。</div>}</div>
 <div className="panel chatComposer"><h3>メッセージを作成</h3><label>宛先</label><select value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="">宛先を選択</option>{people.filter(p=>p.id!==profile?.id).map(p=><option value={p.id} key={p.id}>{p.full_name}（{p.role==='player'?'選手':'スタッフ'}）</option>)}</select><label>メッセージ</label><textarea rows={8} maxLength={4000} value={body} onChange={e=>setBody(e.target.value)} placeholder="メッセージを入力"/><button disabled={!recipient||!body.trim()} onClick={()=>setConfirm(true)}>送信内容を確認</button></div></div>
 {confirm&&<div className="confirmOverlay"><div className="confirmCard"><h3>送信内容の確認</h3><p><b>宛先：</b>{nameOf(recipient)}</p><div className="confirmMessage">{body}</div><p className="fine">この内容で送信しますか？</p><div className="actions"><button onClick={send}>送信を確定</button><button className="secondary" onClick={()=>setConfirm(false)}>戻って修正</button></div></div></div>}
 {msg&&<div className="notice">{msg}</div>}</section>;
}

function ModulePlaceholder({title,text}:{title:string;text:string}){return <section><Title t={title} s={text}/><div className="panel"><h3>画面構成を準備済み</h3><p>{text}</p><p className="fine">既存データ構造を壊さず、このメニュー配下に機能を追加できる状態にしています。</p></div></section>}

function DirectoryView({mode,isAdmin}:{mode:'staff'|'teams';isAdmin:boolean}){
 const [rows,setRows]=useState<any[]>([]),[edit,setEdit]=useState<any|null>(null),[deleteTarget,setDeleteTarget]=useState<any|null>(null),[deleteStage,setDeleteStage]=useState<1|2>(1),[msg,setMsg]=useState('');
 async function load(){if(mode==='staff'){const {data,error}=await supabase.from('profiles').select('id,full_name,staff_title,avatar_path').eq('role','staff').order('full_name');if(error)setMsg(error.message);setRows(data||[])}else{const {data,error}=await supabase.from('teams').select('*').order('name');if(error)setMsg(error.message);setRows(data||[])}}
 useEffect(()=>{load()},[mode]);
 async function saveStaff(){if(!edit)return;const {error}=await supabase.rpc('admin_update_staff_profile',{p_user_id:edit.id,p_full_name:edit.full_name,p_staff_title:edit.staff_title||''});setMsg(error?error.message:'スタッフ情報を更新しました');if(!error){setEdit(null);load()}}
 async function deleteStaff(){
   if(!deleteTarget)return;
   if(deleteStage===1){setDeleteStage(2);return}
   const {error}=await supabase.rpc('admin_delete_staff',{p_staff_id:deleteTarget.id});
   setMsg(error?error.message:'スタッフを削除しました');
   if(!error){setDeleteTarget(null);setDeleteStage(1);load()}
 }
 if(mode==='staff')return <section><Title t="TEAM / Staff" s="スタッフ情報と役職"/>{msg&&<div className="notice">{msg}</div>}<div className="tableWrap"><table><thead><tr><th>氏名</th><th>役職</th>{isAdmin&&<th>操作</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><div className="personCell"><Avatar path={r.avatar_path} name={r.full_name} size={36}/><b>{r.full_name}</b></div></td><td>{r.staff_title||'-'}</td>{isAdmin&&<td><div className="actions"><button onClick={()=>setEdit({...r})}>編集</button><button className="dangerBtn" onClick={()=>{setDeleteTarget(r);setDeleteStage(1)}}>削除</button></div></td>}</tr>)}</tbody></table></div>
 {edit&&<div className="panel form"><h3>スタッフ情報を編集</h3><div className="grid2"><input placeholder="氏名" value={edit.full_name||''} onChange={e=>setEdit({...edit,full_name:e.target.value})}/><input placeholder="役職" value={edit.staff_title||''} onChange={e=>setEdit({...edit,staff_title:e.target.value})}/></div><div className="actions"><button onClick={saveStaff}>変更を保存</button><button className="secondary" onClick={()=>setEdit(null)}>キャンセル</button></div></div>}
 {deleteTarget&&<div className="confirmOverlay"><div className="confirmCard"><h3>{deleteStage===1?'スタッフ削除の確認':'最終確認'}</h3><p><b>{deleteTarget.full_name}</b> を削除します。</p>{deleteStage===1?<p className="fine">スタッフのログインアカウントも削除されます。過去記録に担当者として紐づく場合は履歴保全のため削除を停止します。</p>:<p className="error">この操作は取り消せません。本当に削除しますか？</p>}<div className="actions"><button className="dangerBtn" onClick={deleteStaff}>{deleteStage===1?'次へ':'削除を確定'}</button><button className="secondary" onClick={()=>{setDeleteTarget(null);setDeleteStage(1)}}>キャンセル</button></div></div></div>}</section>;
 return <section><Title t="TEAM / Teams" s="チーム・カテゴリー管理"/><div className="tableWrap"><table><thead><tr><th>チーム名</th><th>カテゴリー</th><th>学年</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.name}</b></td><td>{r.category||'-'}</td><td>{r.school_year||'-'}</td></tr>)}</tbody></table></div></section>;
}


function Team({isAdmin,profile}:{isAdmin:boolean;profile:Profile|null}){
 const [players,setPlayers]=useState<any[]>([]);
 const [messages,setMessages]=useState<any[]>([]);
 const [schedule,setSchedule]=useState<any[]>([]);
 const [staff,setStaff]=useState<any[]>([]);
 const [msg,setMsg]=useState('');
 const [saving,setSaving]=useState<string>('');

 const weekDates=useMemo(()=>{
   const now=new Date();
   const day=(now.getDay()+6)%7;
   const monday=new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate()-day);
   return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d});
 },[]);
 const iso=(d:Date)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day};
 const weekStart=iso(weekDates[0]),weekEnd=iso(weekDates[6]);

 useEffect(()=>{load()},[]);
 async function load(){
   const [{data:p},{data:m},{data:s},{data:st}]=await Promise.all([
     supabase.from('player_directory').select('*').eq('is_hidden',false).order('school_grade',{ascending:false}).order('full_name'),
     profile?.id?supabase.from('chat_messages').select('id,sender_id,recipient_id,body,created_at,read_at').eq('recipient_id',profile.id).order('created_at',{ascending:false}).limit(5):Promise.resolve({data:[]} as any),
     supabase.from('player_schedule').select('id,schedule_date,event_type,opponent,starts_at,ends_at,location,staff_name,notes,title,category,details').is('player_id',null).gte('schedule_date',weekStart).lte('schedule_date',weekEnd).order('schedule_date'),
     supabase.from('profiles').select('id,full_name,role').eq('role','staff').order('full_name')
   ]);
   setPlayers(p||[]);setMessages(m||[]);setSchedule(s||[]);setStaff(st||[]);
 }
 const peopleMap=new Map(staff.map((x:any)=>[x.id,x.full_name]));
 const nonParticipants=players.filter(p=>p.today_availability==='out');
 const participants=Math.max(0,players.length-nonParticipants.length);
 const rowFor=(date:string)=>schedule.find(x=>x.schedule_date===date)||{schedule_date:date,event_type:'TR',opponent:'',starts_at:null,ends_at:null,location:'',staff_name:'',notes:''};
 const timeOf=(v:any)=>v?new Date(v).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',hour12:false}):'';
 const toTs=(date:string,time:string)=>time?date+'T'+time+':00+09:00':date+'T09:00:00+09:00';

 function updateLocal(date:string,key:string,value:any){
   setSchedule(prev=>{
     const found=prev.find(x=>x.schedule_date===date);
     if(found)return prev.map(x=>x.schedule_date===date?{...x,[key]:value}:x);
     return [...prev,{...rowFor(date),[key]:value}];
   });
 }
 async function saveDay(date:string){
   if(!isAdmin)return;
   const r=rowFor(date);
   setSaving(date);setMsg('');
   const payload:any={
     player_id:null,
     schedule_date:date,
     event_type:r.event_type||'TR',
     title:r.event_type==='Game'?(r.opponent?'Game vs '+r.opponent:'Game'):(r.event_type||'TR'),
     category:r.event_type||'TR',
     opponent:r.opponent||null,
     starts_at:toTs(date,r.start_time||timeOf(r.starts_at)),
     ends_at:(r.end_time||timeOf(r.ends_at))?toTs(date,r.end_time||timeOf(r.ends_at)):null,
     location:r.location||null,
     staff_name:r.staff_name||null,
     notes:r.notes||null,
     details:r.notes||null,
     created_by:profile?.id||null
   };
   let error:any=null;
   if(r.id){
     const res=await supabase.from('player_schedule').update(payload).eq('id',r.id);error=res.error;
   }else{
     const res=await supabase.from('player_schedule').insert(payload);error=res.error;
   }
   setMsg(error?error.message:'スケジュールを保存しました。');
   setSaving('');if(!error)await load();
 }

 return <section className="homePage"><Title t="HOME" s="メッセージ・本日のTR参加状況・今週の予定をまとめて確認"/>
 <div className="homeGrid">
   <div className="panel homeMessages"><h3>新着メッセージ</h3>{messages.length?messages.map(m=><div className={'homeMessage '+(!m.read_at?'unreadMessage':'')} key={m.id}><b>{peopleMap.get(m.sender_id)||'選手・スタッフ'}</b><span>{new Date(m.created_at).toLocaleString('ja-JP')}</span><p>{m.body}</p></div>):<div className="empty">新着メッセージはありません。</div>}</div>
   <div className="panel attendanceCard"><h3>TR参加人数</h3><div className="attendanceCount"><b>{participants}</b><span> / {players.length}名</span></div><details className="absenceDetails"><summary>TR不参加者 {nonParticipants.length}名</summary>{nonParticipants.length?nonParticipants.map(p=><div className="absenceRow" key={p.player_id}><div className="personCell"><Avatar path={p.avatar_path} name={p.full_name} size={34}/><b>{p.full_name}</b></div><div>{p.school_grade||'-'}年 / {p.position||'-'}</div><div>{p.injury_name||'傷害情報なし'}</div><div>{p.pain_score!=null?'Pain '+p.pain_score+'/10':'Pain -'}</div></div>):<div className="empty">TR不参加者はいません。</div>}</details></div>
 </div>

 <div className="panel weeklySchedule"><div className="scheduleHeader"><div><h3>今週のスケジュール</h3><p>{weekStart} 〜 {weekEnd}</p></div>{msg&&<span className="notice inlineNotice">{msg}</span>}</div>
 <div className="weekTableWrap"><table className="weekTable"><thead><tr><th>日付</th><th>予定</th><th>対戦相手</th><th>時間</th><th>場所</th><th>担当者</th><th>自由記述</th>{isAdmin&&<th>保存</th>}</tr></thead><tbody>{weekDates.map(d=>{const date=iso(d),r=rowFor(date),start=r.start_time??timeOf(r.starts_at),end=r.end_time??timeOf(r.ends_at);return <tr key={date}><td><b>{d.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'})}</b></td><td>{isAdmin?<select value={r.event_type||'TR'} onChange={e=>updateLocal(date,'event_type',e.target.value)}><option value="TR">TR</option><option value="Game">Game</option><option value="OFF">OFF</option><option value="Other">Other</option></select>:<span className="pill info">{r.event_type||'-'}</span>}</td><td>{isAdmin?<input value={r.opponent||''} placeholder={r.event_type==='Game'?'対戦相手':'-'} onChange={e=>updateLocal(date,'opponent',e.target.value)} disabled={r.event_type!=='Game'}/>:r.opponent||'-'}</td><td>{isAdmin?<div className="timePair"><input type="time" value={start} onChange={e=>updateLocal(date,'start_time',e.target.value)}/><span>〜</span><input type="time" value={end} onChange={e=>updateLocal(date,'end_time',e.target.value)}/></div>:(start?(start+(end?'〜'+end:'')):'-')}</td><td>{isAdmin?<input value={r.location||''} placeholder="場所" onChange={e=>updateLocal(date,'location',e.target.value)}/>:r.location||'-'}</td><td>{isAdmin?<select value={r.staff_name||''} onChange={e=>updateLocal(date,'staff_name',e.target.value)}><option value="">担当者を選択</option>{staff.map(s=><option key={s.id} value={s.full_name}>{s.full_name}</option>)}</select>:r.staff_name||'-'}</td><td>{isAdmin?<textarea rows={2} value={r.notes||''} placeholder="自由記述" onChange={e=>updateLocal(date,'notes',e.target.value)}/>:r.notes||'-'}</td>{isAdmin&&<td><button onClick={()=>saveDay(date)} disabled={saving===date}>{saving===date?'保存中':'保存'}</button></td>}</tr>})}</tbody></table></div>
 </div>
 </section>;
}

function Players({isAdmin}:{isAdmin:boolean}){
 const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[msg,setMsg]=useState('');
 const [filters,setFilters]=useState({name:'',grade:'',position:'',injury:'',status:''});
 const [edit,setEdit]=useState<any|null>(null);
 const [selected,setSelected]=useState<string[]>([]);
 const [showHidden,setShowHidden]=useState(false);
 const [confirmAction,setConfirmAction]=useState<{kind:'hide'|'show'|'delete';ids:string[];stage:1|2}|null>(null);
 useEffect(()=>{load()},[]);
 async function load(){
   const [{data,error},{data:rehabRows}]=await Promise.all([supabase.from('player_directory').select('*').order('status_order',{ascending:true}).order('school_grade',{ascending:false}).order('full_name',{ascending:true}),supabase.from('player_rehab_status').select('case_id,player_id,rehab_start_date,rehab_stage,rehab_day')]);
   if(error)setMsg(error.message);
   const byCase=new Map((rehabRows||[]).map((x:any)=>[x.case_id,x]));
   setRows((data||[]).map((r:any)=>({...r,...(r.case_id?byCase.get(r.case_id)||{}:{})})));setLoading(false);setSelected([]);
 }
 const positions=Array.from(new Set(rows.map(r=>r.position).filter(Boolean)));
 const filtered=useMemo(()=>rows.filter(r=>
   (isAdmin?(showHidden?true:!r.is_hidden):!r.is_hidden)&&
   (!filters.name||String(r.full_name||'').includes(filters.name))&&
   (!filters.grade||String(r.school_grade||'')===filters.grade)&&
   (!filters.position||r.position===filters.position)&&
   (!filters.injury||String(r.injury_name||'').includes(filters.injury))&&
   (!filters.status||r.display_status===filters.status)
 ),[rows,filters,isAdmin,showHidden]);
 const visibleIds=filtered.map(r=>r.player_id);
 const allVisibleSelected=visibleIds.length>0&&visibleIds.every(id=>selected.includes(id));
 const toggleAll=()=>setSelected(allVisibleSelected?selected.filter(id=>!visibleIds.includes(id)):Array.from(new Set([...selected,...visibleIds])));
 const toggleOne=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);

 async function saveStatus(){
   if(!edit)return;
   let err:any=null;
   if(edit.case_id){const {error}=await supabase.rpc('staff_update_case_status',{case_uuid:edit.case_id,new_status:edit.display_status});err=error}
   if(!err){const {error}=await supabase.rpc('staff_set_daily_status',{target_player:edit.player_id,new_availability:edit.today_availability,new_pain_score:edit.pain_score||null,new_notes:null});err=error}
   setMsg(err?err.message:'更新しました');if(!err){setEdit(null);load()}
 }

 function beginAction(kind:'hide'|'show'|'delete',ids:string[]){
   if(!ids.length)return;
   setConfirmAction({kind,ids,stage:1});
 }
 async function executeAction(){
   if(!confirmAction)return;
   const {kind,ids}=confirmAction;
   if(kind==='delete'){
     const targets=rows.filter(r=>ids.includes(r.player_id));
     const {data,error}=await supabase.rpc('admin_delete_players',{p_player_ids:ids});
     if(error){setMsg(error.message);setConfirmAction(null);return}
     const paths=targets.map(r=>r.avatar_path).filter(Boolean);
     if(paths.length)await supabase.storage.from('profile-photos').remove(paths);
     setMsg(String(Number(data||0))+'名の選手を削除しました。');
   }else{
     const hidden=kind==='hide';
     const {data,error}=await supabase.rpc('admin_set_players_hidden',{p_player_ids:ids,p_hidden:hidden});
     if(error){setMsg(error.message);setConfirmAction(null);return}
     setMsg(String(Number(data||0))+'名を'+(hidden?'非表示':'再表示')+'にしました。');
   }
   setConfirmAction(null);await load();
 }
 const actionLabel=confirmAction?.kind==='delete'?'削除':confirmAction?.kind==='hide'?'非表示':'再表示';
 const actionTargets=confirmAction?rows.filter(r=>confirmAction.ids.includes(r.player_id)):[];

 return <section><Title t="選手一覧" s="要対応 → リハビリ中 → 経過観察 → 問題なし の順で表示"/>
 <div className="filters"><input placeholder="氏名" value={filters.name} onChange={e=>setFilters({...filters,name:e.target.value})}/><select value={filters.grade} onChange={e=>setFilters({...filters,grade:e.target.value})}><option value="">全学年</option><option value="1">1年</option><option value="2">2年</option><option value="3">3年</option></select><select value={filters.position} onChange={e=>setFilters({...filters,position:e.target.value})}><option value="">全ポジション</option>{positions.map(p=><option key={p}>{p}</option>)}</select><input placeholder="傷害名で検索" value={filters.injury} onChange={e=>setFilters({...filters,injury:e.target.value})}/><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">全対応</option><option value="needs_attention">要対応</option><option value="rehab">リハビリ中</option><option value="observation">経過観察</option><option value="available">問題なし</option></select></div>
 {isAdmin&&<div className="bulkBar"><label><input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)}/> 非表示の選手を表示</label><span>{selected.length}名選択中</span><button disabled={!selected.length} onClick={()=>beginAction('hide',selected)}>まとめて非表示</button><button className="secondary" disabled={!selected.length} onClick={()=>beginAction('show',selected)}>まとめて再表示</button><button className="dangerBtn" disabled={!selected.length} onClick={()=>beginAction('delete',selected)}>まとめて削除</button></div>}
 {msg&&<div className="notice">{msg}</div>}
 {loading?<p>読み込み中...</p>:<div className="tableWrap"><table><thead><tr>{isAdmin&&<th><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}/></th>}<th>氏名</th><th>学年/Pos</th><th>傷害</th><th>対応</th><th>本日</th>{isAdmin&&<th>管理</th>}</tr></thead><tbody>{filtered.map(r=><tr key={r.player_id} className={r.is_hidden?'hiddenRow':''}>{isAdmin&&<td><input type="checkbox" checked={selected.includes(r.player_id)} onChange={()=>toggleOne(r.player_id)}/></td>}<td><div className="personCell"><Avatar path={r.avatar_path} name={r.full_name} size={38}/><div><b>{r.full_name}</b>{r.is_hidden&&<small>非表示</small>}</div></div></td><td>{r.school_grade||'-'}年 / {r.position||'-'}</td><td>{r.injury_name||'なし'}{r.body_part&&<small>{r.body_part}</small>}</td><td><span className={'pill '+statusClass[r.display_status]}>{statusLabel[r.display_status]}</span>{r.display_status==='rehab'&&r.rehab_day&&<small>Rehab Day {r.rehab_day}</small>}</td><td>{availabilityLabel[r.today_availability]||'-'}{r.pain_score!=null&&<small>Pain {r.pain_score}/10</small>}</td>{isAdmin&&<td><div className="rowActions"><button onClick={()=>setEdit({...r})}>編集</button>{r.is_hidden?<button className="secondary" onClick={()=>beginAction('show',[r.player_id])}>再表示</button>:<button className="secondary" onClick={()=>beginAction('hide',[r.player_id])}>非表示</button>}<button className="dangerBtn" onClick={()=>beginAction('delete',[r.player_id])}>削除</button></div></td>}</tr>)}</tbody></table>{!filtered.length&&<div className="empty">該当する選手はいません。</div>}</div>}
 {isAdmin&&edit&&<div className="panel form"><h3>{edit.full_name}｜対応・参加状況を編集</h3><div className="grid2">{edit.case_id&&<select value={edit.display_status} onChange={e=>setEdit({...edit,display_status:e.target.value})}><option value="needs_attention">要対応</option><option value="rehab">リハビリ中</option><option value="observation">経過観察</option><option value="available">問題なし</option></select>}<select value={edit.today_availability} onChange={e=>setEdit({...edit,today_availability:e.target.value})}><option value="out">参加不可</option><option value="modified">別メニュー</option><option value="partial">部分参加</option><option value="full">通常参加</option></select><input type="number" min="0" max="10" placeholder="Pain 0-10" value={edit.pain_score??''} onChange={e=>setEdit({...edit,pain_score:e.target.value===''?null:Number(e.target.value)})}/></div><div className="actions"><button onClick={saveStatus}>保存</button><button className="secondary" onClick={()=>setEdit(null)}>キャンセル</button></div></div>}
 {confirmAction&&<div className="confirmOverlay"><div className="confirmCard"><h3>{confirmAction.stage===1?actionLabel+'する選手を確認':'最終確認：'+actionLabel}</h3><div className="confirmList">{actionTargets.map(r=><div key={r.player_id}>{r.full_name}　{r.school_grade||'-'}年 / {r.position||'-'}</div>)}</div>{confirmAction.kind==='delete'?<p className="dangerText">削除すると、ログインアカウント・傷害報告・ケース・フィジカルデータ・チャットなど関連データも削除され、元に戻せません。</p>:<p className="fine">{confirmAction.kind==='hide'?'非表示後もデータとログイン権限は残ります。チーム集計からは除外されます。':'再表示すると通常の選手一覧とチーム集計に戻ります。'}</p>}<div className="actions">{confirmAction.stage===1?<button onClick={()=>setConfirmAction({...confirmAction,stage:2})}>次の確認へ</button>:<button className={confirmAction.kind==='delete'?'dangerBtn':''} onClick={executeAction}>{actionLabel}を確定</button>}<button className="secondary" onClick={()=>setConfirmAction(null)}>キャンセル</button></div></div></div>}
 </section>;
}

function Reports({profile,isAdmin}:{profile:Profile|null;isAdmin:boolean}){
 const [rows,setRows]=useState<any[]>([]),[msg,setMsg]=useState(''),[edit,setEdit]=useState<any|null>(null);
 const [form,setForm]=useState<any>({injury_date:'',symptom:'',body_part:'',side:'right',activity:'',mechanism:'',hospital_status:'未受診',facility_name:'',visit_date:'',diagnosis:'',instructed_plan:'',notes:''});
 useEffect(()=>{load()},[]);
 async function load(){const {data,error}=await supabase.from('injury_reports').select('id,player_id,injury_date,symptom,body_part,side,activity,mechanism,hospital_status,facility_name,visit_date,diagnosis,instructed_plan,notes,review_status,created_at,player_edited_fields,player_last_edited_at').order('created_at',{ascending:false});if(error)setMsg(error.message);setRows(data||[])}
 async function submit(e:React.FormEvent){e.preventDefault();if(!profile||profile.role!=='player')return;const payload={player_id:profile.id,...form,visit_date:form.visit_date||null,review_status:'pending'};const {error}=await supabase.from('injury_reports').insert(payload);setMsg(error?error.message:'報告を送信しました');if(!error){setForm({injury_date:'',symptom:'',body_part:'',side:'right',activity:'',mechanism:'',hospital_status:'未受診',facility_name:'',visit_date:'',diagnosis:'',instructed_plan:'',notes:''});load()}}
 async function convert(id:number){const {error}=await supabase.rpc('staff_convert_report_to_case',{report_id:id});setMsg(error?error.message:'正式な傷害ケースに変換しました');if(!error)load()}
 async function saveEdit(){
   if(!edit)return;
   const base={p_report_id:edit.id,p_injury_date:edit.injury_date,p_symptom:edit.symptom,p_body_part:edit.body_part,p_side:edit.side,p_activity:edit.activity||null,p_mechanism:edit.mechanism||null,p_hospital_status:edit.hospital_status||null,p_facility_name:edit.facility_name||null,p_visit_date:edit.visit_date||null,p_diagnosis:edit.diagnosis||null,p_instructed_plan:edit.instructed_plan||null,p_notes:edit.notes||null};
   let error:any=null;
   if(profile?.role==='player'){
     const res=await supabase.rpc('player_update_own_injury_report',base);error=res.error;
   }else if(isAdmin){
     const {p_report_id,...p}=base;
     const payload={injury_date:p.p_injury_date,symptom:p.p_symptom,body_part:p.p_body_part,side:p.p_side,activity:p.p_activity,mechanism:p.p_mechanism,hospital_status:p.p_hospital_status,facility_name:p.p_facility_name,visit_date:p.p_visit_date,diagnosis:p.p_diagnosis,instructed_plan:p.p_instructed_plan,notes:p.p_notes};
     const res=await supabase.from('injury_reports').update(payload).eq('id',p_report_id);error=res.error;
   }
   setMsg(error?error.message:'履歴を更新しました');if(!error){setEdit(null);load()}
 }
 const ownCanEdit=(r:any)=>profile?.role==='player'&&r.player_id===profile.id;
 const changed=(r:any,k:string)=>Array.isArray(r.player_edited_fields)&&r.player_edited_fields.includes(k);
 return <section><Title t="選手報告" s="新規報告は未読時のみ上部タブが赤く表示されます"/>
 {profile?.role==='player'&&<form className="panel form" onSubmit={submit}><h3>新しい傷害・症状を報告</h3><ReportFields value={form} setValue={setForm}/><button>報告する</button></form>}
 {msg&&<div className="notice">{msg}</div>}
 <div className="tableWrap"><table><thead><tr><th>日付</th><th>症状</th><th>部位</th><th>状態</th><th>編集履歴</th>{(isAdmin||profile?.role==='player')&&<th>操作</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className={changed(r,'injury_date')?'changed':''}>{r.injury_date}</td><td className={changed(r,'symptom')?'changed':''}>{r.symptom}</td><td className={changed(r,'body_part')?'changed':''}>{r.body_part}</td><td>{r.review_status==='pending'?'未確認':'確認済み'}</td><td>{r.player_last_edited_at?<span className="changed">選手が変更済み</span>:'-'}</td>{(isAdmin||profile?.role==='player')&&<td>{(isAdmin||ownCanEdit(r))&&<button onClick={()=>setEdit({...r})}>編集</button>} {isAdmin&&r.review_status==='pending'&&<button onClick={()=>convert(r.id)}>ケース化</button>}</td>}</tr>)}</tbody></table></div>
 {edit&&<div className="panel form editPanel"><h3>傷害履歴を編集</h3><p className="fine">選手本人が変更した項目は保存後、赤文字・赤枠で表示されます。</p><ReportFields value={edit} setValue={setEdit} changedFields={edit.player_edited_fields}/><div className="actions"><button onClick={saveEdit}>保存</button><button className="secondary" onClick={()=>setEdit(null)}>キャンセル</button></div></div>}
 </section>;
}

function ReportFields({value,setValue,changedFields=[]}:{value:any;setValue:(v:any)=>void;changedFields?:string[]}){
 const cls=(k:string)=>changedFields?.includes(k)?'changedField':'';
 return <div className="grid2"><input className={cls('injury_date')} type="date" required value={value.injury_date||''} onChange={e=>setValue({...value,injury_date:e.target.value})}/><select className={cls('side')} value={value.side||'right'} onChange={e=>setValue({...value,side:e.target.value})}><option value="right">右</option><option value="left">左</option><option value="both">両側</option><option value="none">左右なし</option></select><input className={cls('symptom')} placeholder="傷害名または症状" required value={value.symptom||''} onChange={e=>setValue({...value,symptom:e.target.value})}/><input className={cls('body_part')} placeholder="受傷部位" required value={value.body_part||''} onChange={e=>setValue({...value,body_part:e.target.value})}/><input className={cls('activity')} placeholder="受傷時の活動内容" value={value.activity||''} onChange={e=>setValue({...value,activity:e.target.value})}/><input className={cls('mechanism')} placeholder="受傷機転" value={value.mechanism||''} onChange={e=>setValue({...value,mechanism:e.target.value})}/><select className={cls('hospital_status')} value={value.hospital_status||'未受診'} onChange={e=>setValue({...value,hospital_status:e.target.value})}><option>未受診</option><option>受診済み</option><option>受診予定</option></select><input className={cls('facility_name')} placeholder="医療機関名" value={value.facility_name||''} onChange={e=>setValue({...value,facility_name:e.target.value})}/><input className={cls('visit_date')} type="date" value={value.visit_date||''} onChange={e=>setValue({...value,visit_date:e.target.value})}/><input className={cls('diagnosis')} placeholder="診断名" value={value.diagnosis||''} onChange={e=>setValue({...value,diagnosis:e.target.value})}/><input className={cls('instructed_plan')} placeholder="今後の対応" value={value.instructed_plan||''} onChange={e=>setValue({...value,instructed_plan:e.target.value})}/><input className={cls('notes')} placeholder="備考" value={value.notes||''} onChange={e=>setValue({...value,notes:e.target.value})}/></div>;
}

function Cases({isAdmin}:{isAdmin:boolean}){
 const [rows,setRows]=useState<any[]>([]),[msg,setMsg]=useState('');
 useEffect(()=>{load()},[]);
 async function load(){const [{data},{data:rehabRows}]=await Promise.all([supabase.from('active_case_board').select('*').order('updated_at',{ascending:false}),supabase.from('player_rehab_status').select('case_id,rehab_day,rehab_stage')]);const m=new Map((rehabRows||[]).map((x:any)=>[x.case_id,x]));setRows((data||[]).map((r:any)=>({...r,...(m.get(r.case_id)||{})})))}
 async function setStatus(id:string,status:string){const {error}=await supabase.rpc('staff_update_case_status',{case_uuid:id,new_status:status});setMsg(error?error.message:'対応を更新しました');if(!error)load()}
 return <section><Title t="記録・判断支援" s="評価・対応・リハビリ・復帰判断"/>{msg&&<div className="notice">{msg}</div>}<div className="caseGrid">{rows.map(r=><div className="panel" key={r.case_id}><h3>{r.full_name}</h3><p><b>{r.injury_name}</b> / {r.body_part}</p><span className={'pill '+statusClass[r.current_status]}>{statusLabel[r.current_status]||r.current_status}</span>{r.current_status==='rehab'&&r.rehab_day&&<p><b>Rehab Day {r.rehab_day}</b> / Stage {r.rehab_stage??'-'}</p>}<p className="muted">未完了ToDo: {r.open_tasks}件</p>{isAdmin&&<div className="actions"><select value={r.current_status} onChange={e=>setStatus(r.case_id,e.target.value)}><option value="needs_attention">要対応</option><option value="rehab">リハビリ中</option><option value="observation">経過観察</option><option value="available">問題なし</option></select><button>＋ 記録追加</button></div>}</div>)}</div></section>;
}

function Admin(){
 const [rows,setRows]=useState<any[]>([]),[msg,setMsg]=useState(''),[edit,setEdit]=useState<any|null>(null);
 useEffect(()=>{load()},[]);
 async function load(){const [{data,error},{data:ps}]=await Promise.all([supabase.rpc('admin_list_accounts',{filter_status:null}),supabase.from('profiles').select('id,avatar_path,player_registration_number,staff_title,team_id')]);if(error)setMsg(error.message);else{const map=new Map((ps||[]).map((p:any)=>[p.id,p]));setRows((data||[]).map((r:any)=>({...r,...(map.get(r.user_id)||{})})))}}
 async function approval(id:string,status:Approval){const {error}=await supabase.rpc('admin_set_account_approval',{target_user_id:id,new_status:status,reason:status==='rejected'?'管理者により却下':''});setMsg(error?error.message:'承認状態を更新しました');if(!error)load()}
 async function save(){
   if(!edit)return;
   const base=await supabase.rpc('admin_update_account_profile',{p_user_id:edit.user_id,p_role:edit.role,p_full_name:edit.full_name,p_birth_date:edit.birth_date||null,p_phone:edit.phone||null,p_origin_team:edit.origin_team||null,p_height_cm:edit.height_cm||null,p_weight_kg:edit.weight_kg||null,p_dominant_foot:edit.dominant_foot||null,p_school_grade:edit.school_grade||null,p_position:edit.player_position||null,p_jersey_number:edit.jersey_number||null});
   let error:any=base.error;if(!error){const extra=await supabase.from('profiles').update({player_registration_number:edit.role==='player'?(edit.player_registration_number||null):null,staff_title:edit.role==='staff'?(edit.staff_title||null):null}).eq('id',edit.user_id);error=extra.error}
   setMsg(error?error.message:'アカウント情報を更新しました');if(!error){setEdit(null);load()}
 }
 return <section><Title t="アカウント承認" s="管理者は登録内容を編集できます"/>{msg&&<div className="notice">{msg}</div>}<div className="tableWrap"><table><thead><tr><th>氏名</th><th>メール</th><th>区分</th><th>学年/Pos</th><th>状態</th><th>操作</th></tr></thead><tbody>{rows.map(r=><tr key={r.user_id}><td><div className="personCell"><Avatar path={r.avatar_path} name={r.full_name} size={36}/><span>{r.full_name}</span></div></td><td>{r.email}</td><td>{r.role==='player'?'選手':'スタッフ'}</td><td>{r.school_grade?`${r.school_grade}年 / ${r.player_position||'-'}`:'-'}</td><td><span className={'pill '+(r.status==='approved'?'ok':r.status==='pending'?'warn':'danger')}>{r.status==='approved'?'承認済み':r.status==='pending'?'承認待ち':'却下'}</span></td><td><button onClick={()=>setEdit({...r})}>編集</button> {r.status!=='approved'&&<button onClick={()=>approval(r.user_id,'approved')}>承認</button>} {r.status!=='rejected'&&<button className="secondary" onClick={()=>approval(r.user_id,'rejected')}>却下</button>}</td></tr>)}</tbody></table></div>
 {edit&&<div className="panel form"><h3>{edit.full_name}｜登録内容を編集</h3><div className="grid2"><input value={edit.full_name||''} placeholder="氏名" onChange={e=>setEdit({...edit,full_name:e.target.value})}/><input value={edit.email||''} disabled title="ログインメールは認証情報のためここでは変更しません"/><select value={edit.role} onChange={e=>setEdit({...edit,role:e.target.value})}><option value="player">選手</option><option value="staff">スタッフ</option></select>{edit.role==='staff'&&<input placeholder="役職" value={edit.staff_title||''} onChange={e=>setEdit({...edit,staff_title:e.target.value})}/>} {edit.role==='player'&&<input placeholder="選手登録番号" value={edit.player_registration_number||''} onChange={e=>setEdit({...edit,player_registration_number:e.target.value})}/>}<input type="date" value={edit.birth_date||''} onChange={e=>setEdit({...edit,birth_date:e.target.value})}/><input placeholder="電話番号" value={edit.phone||''} onChange={e=>setEdit({...edit,phone:e.target.value})}/><input placeholder="出身チーム" value={edit.origin_team||''} onChange={e=>setEdit({...edit,origin_team:e.target.value})}/>{edit.role==='player'&&<><input type="number" placeholder="身長 cm" value={edit.height_cm??''} onChange={e=>setEdit({...edit,height_cm:e.target.value===''?null:Number(e.target.value)})}/><input type="number" placeholder="体重 kg" value={edit.weight_kg??''} onChange={e=>setEdit({...edit,weight_kg:e.target.value===''?null:Number(e.target.value)})}/><select value={edit.dominant_foot||'right'} onChange={e=>setEdit({...edit,dominant_foot:e.target.value})}><option value="right">右利き</option><option value="left">左利き</option><option value="both">両利き</option></select><select value={edit.school_grade||1} onChange={e=>setEdit({...edit,school_grade:Number(e.target.value)})}><option value={1}>1年</option><option value={2}>2年</option><option value={3}>3年</option></select><select value={edit.player_position||'FW'} onChange={e=>setEdit({...edit,player_position:e.target.value})}><option>GK</option><option>DF</option><option>MF</option><option>FW</option></select><input type="number" placeholder="背番号" value={edit.jersey_number??''} onChange={e=>setEdit({...edit,jersey_number:e.target.value===''?null:Number(e.target.value)})}/></>}</div><div className="actions"><button onClick={save}>変更を保存</button><button className="secondary" onClick={()=>setEdit(null)}>キャンセル</button></div></div>}
 </section>;
}


function AdminPhysicalBulk(){
 const axes=['速度','持久力','筋力','パワー','敏捷性','柔軟性'];
 const [players,setPlayers]=useState<any[]>([]),[category,setCategory]=useState('基本測定'),[grade,setGrade]=useState(''),[position,setPosition]=useState(''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[values,setValues]=useState<Record<string,Record<string,string>>>({}),[msg,setMsg]=useState('');
 useEffect(()=>{supabase.from('profiles').select('id,full_name,school_grade,position').eq('role','player').order('school_grade').order('full_name').then(({data})=>setPlayers(data||[]))},[]);
 const filtered=players.filter(p=>(!grade||String(p.school_grade)===grade)&&(!position||p.position===position));
 function setVal(id:string,key:string,v:string){setValues(prev=>({...prev,[id]:{...(prev[id]||{}),[key]:v}}))}
 async function saveAll(){
   const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
   const payload=filtered.map(p=>({player_id:p.id,measured_at:date,category,metrics:Object.fromEntries(axes.map(a=>[a,values[p.id]?.[a]===''||values[p.id]?.[a]==null?null:Number(values[p.id][a])]).filter(([,v])=>v!==null)),created_by:user.id}));
   const {error}=await supabase.from('physical_measurement_records').insert(payload);
   setMsg(error?error.message:'対象選手のフィジカルデータを一括保存しました。');
 }
 return <div className="panel"><h3>フィジカルデータ｜カテゴリー一括入力</h3><p className="fine">測定項目は仮設定です。後ほど正式な項目へ変更できます。</p><div className="filters"><input value={category} onChange={e=>setCategory(e.target.value)} placeholder="測定カテゴリー"/><select value={grade} onChange={e=>setGrade(e.target.value)}><option value="">全学年</option><option value="1">1年</option><option value="2">2年</option><option value="3">3年</option></select><select value={position} onChange={e=>setPosition(e.target.value)}><option value="">全ポジション</option><option>GK</option><option>DF</option><option>MF</option><option>FW</option></select><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div className="tableWrap"><table><thead><tr><th>選手</th><th>学年/Pos</th>{axes.map(a=><th key={a}>{a}</th>)}</tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><b>{p.full_name}</b></td><td>{p.school_grade||'-'}年 / {p.position||'-'}</td>{axes.map(a=><td key={a}><input className="bulkInput" type="number" step="0.01" value={values[p.id]?.[a]||''} onChange={e=>setVal(p.id,a,e.target.value)}/></td>)}</tr>)}</tbody></table></div><div className="actions"><button onClick={saveAll}>表示中の選手をまとめて保存</button></div>{msg&&<div className="notice">{msg}</div>}</div>;
}

function Title({t,s}:{t:string;s:string}){return <div className="title"><h1>{t}</h1><p>{s}</p></div>}
function Stat({n,l,c,p}:{n:number;l:string;c:string;p?:number}){return <div className={'stat '+c}><div className="statValue"><b>{n}</b>{p!==undefined&&<small>{p}%</small>}</div><span>{l}</span></div>}
function Center({children}:{children:React.ReactNode}){return <div className="center">{children}</div>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
