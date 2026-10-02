import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './supabase';
import FmsHub from './FmsHub';
import './styles.css';

type Role='player'|'staff';
type Approval='pending'|'approved'|'rejected';
type Profile={id:string;role:Role;full_name:string;school_grade:number|null;position:string|null;jersey_number:number|null;height_cm:number|null;weight_kg:number|null;dominant_foot:string|null;origin_team:string|null;avatar_path:string|null;player_registration_number:string|null;staff_title:string|null;team_id:number|null};
type ApprovalRow={user_id:string;status:Approval;rejection_reason:string|null};
type Screen='home'|'team_players'|'team_staff'|'team_teams'|'schedule_training'|'schedule_games'|'schedule_events'|'schedule_medical'|'performance_physical'|'performance_gps'|'performance_gps_game'|'performance_gps_tr'|'performance_body'|'performance_benchmark'|'medical_injury'|'medical_evaluation'|'medical_treatment'|'medical_rehab'|'medical_rtp'|'development_evaluation'|'development_objectives'|'development_reports'|'development_video'|'communication_chat'|'communication_announcement'|'communication_notifications'|'management_accounts'|'management_permissions'|'management_data'|'management_settings'|'set_categories'|'set_account';
type PlayerScreen='mypage'|'schedule'|'report'|'history'|'medical'|'rehab'|'rtp'|'physical'|'gps'|'messages'|'chat'|'settings';

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
   {screen==='schedule_games'&&<GameAnalysis profile={profile}/>} 
   {screen==='schedule_events'&&<FmsHub initialTab="schedule" compact pageTitle="SCHEDULE / Events"/>}
   {screen==='schedule_medical'&&<FmsHub initialTab="schedule" compact pageTitle="SCHEDULE / Medical"/>}
   {screen==='performance_physical'&&<><Title t="PERFORMANCE / Physical" s="フィジカル測定と経時変化"/><AdminPhysicalBulk/></>}
   {screen==='performance_gps'&&<FmsHub initialTab="gps" compact pageTitle="PERFORMANCE / GPS"/>}
   {screen==='performance_gps_game'&&<FmsHub initialTab="gps" compact pageTitle="PERFORMANCE / GPS / Game" gpsCategory="Game"/>}
   {screen==='performance_gps_tr'&&<FmsHub initialTab="gps" compact pageTitle="PERFORMANCE / GPS / TR" gpsCategory="TR"/>}
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
   {screen==='set_categories'&&isAdmin&&<CategorySettings profile={profile}/>}
   {screen==='set_account'&&profile&&<AccountSettings profile={profile} session={session}/>}
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

function LiveDateTime(){
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(id)},[]);
 const date=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric',weekday:'short'}).format(now);
 const time=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
 return <span className="liveDateTime">{date} {time}</span>;
}

function Shell({profile,isAdmin,screen,setScreen,alerts,onLogout,children}:any){
 const [open,setOpen]=useState<Record<string,boolean>>({TEAM:false,SCHEDULE:false,PERFORMANCE:false,GPS:false,MEDICAL:false,DEVELOPMENT:false,COMMUNICATION:false,MANAGEMENT:false,SET:false});
 const groups:{key:string;label:string;items:[Screen,string][]}[]=[
   {key:'TEAM',label:'TEAM',items:[['team_players','Players'],['team_staff','Staff'],['team_teams','Teams']]},
   {key:'SCHEDULE',label:'SCHEDULE',items:[['schedule_training','Training'],['schedule_games','Games'],['schedule_events','Events'],['schedule_medical','Medical']]},
   {key:'PERFORMANCE',label:'PERFORMANCE',items:[['performance_physical','Physical'],['performance_body','Body Composition'],['performance_benchmark','Benchmark']]},
   {key:'MEDICAL',label:'MEDICAL',items:[['medical_injury','Injury'],['medical_evaluation','Evaluation'],['medical_treatment','Treatment'],['medical_rehab','Rehabilitation'],['medical_rtp','Return to Play']]},
   {key:'DEVELOPMENT',label:'DEVELOPMENT',items:[['development_evaluation','Player Evaluation'],['development_objectives','Objectives'],['development_reports','Reports'],['development_video','Video']]},
   {key:'COMMUNICATION',label:'COMMUNICATION',items:[['communication_chat','Chat'],['communication_announcement','Announcement'],['communication_notifications','Notifications']]},
   {key:'MANAGEMENT',label:'MANAGEMENT',items:[['management_accounts','Accounts'],['management_permissions','Permissions'],['management_data','Data'],['management_settings','Settings']]},
   {key:'SET',label:'SET',items:[['set_categories','Categorys'],['set_account','Account']]}
 ];
 const alertFor=(s:Screen)=>s==='team_players'?Number(alerts?.players||0):s==='medical_injury'?Number(alerts?.case||0):s==='development_reports'?Number(alerts?.reports||0):s==='communication_chat'?Number(alerts?.chat||0):s==='management_accounts'?Number(alerts?.admin||0):0;
 return <div className="appFrame">
   <aside className="mainSidebar">
     <div className="sidebarBrand"><b>KTRS FMS</b><span>FOOTBALL MANAGEMENT SYSTEM</span></div>
     <button className={'sidebarHome '+(screen==='home'?'active':'')} onClick={()=>setScreen('home')}>HOME</button>
     {groups.map(g=><div className="navGroup" key={g.key}>
       <button className={'navGroupHead '+(g.items.some(([k])=>k===screen)?'activeGroup':'')} onClick={()=>setOpen(o=>({...o,[g.key]:!o[g.key]}))}>
         <span className="navTitleWithAlert"><span>{g.label}</span>{g.items.reduce((n,[k])=>n+alertFor(k),0)>0&&<em className="navGroupAlert">{g.items.reduce((n,[k])=>n+alertFor(k),0)}</em>}</span><span className="chev">{open[g.key]?'−':'＋'}</span>
       </button>
       {open[g.key]&&<div className="navChildren">
         {g.key==='PERFORMANCE'&&<div className="navNested"><button className={'navNestedHead '+(screen==='performance_gps'||screen==='performance_gps_game'||screen==='performance_gps_tr'?'active':'')} onClick={()=>setOpen(o=>({...o,GPS:!o.GPS}))}><span>GPS</span><span className="chev">{open.GPS?'−':'＋'}</span></button>{open.GPS&&<div className="navNestedChildren"><button className={screen==='performance_gps_game'?'active':''} onClick={()=>setScreen('performance_gps_game')}>Game</button><button className={screen==='performance_gps_tr'?'active':''} onClick={()=>setScreen('performance_gps_tr')}>TR</button></div>}</div>}
         {g.items.filter(([k])=>isAdmin||(!k.startsWith('management_')&&k!=='set_categories')).map(([k,l])=>{const n=alertFor(k);return <button key={k} className={screen===k?'active':''} onClick={()=>setScreen(k)}><span>{l}</span>{n>0&&<em>{n}</em>}</button>})}
       </div>}
     </div>)}
   </aside>
   <div className="appContent">
     <header className="topHeader"><div><b>KTRS FMS</b><span> K-trainers Football Management System</span></div><div className="user"><LiveDateTime/><span className="headerUserName">{profile?.full_name||''}</span><button onClick={onLogout}>ログアウト</button></div></header>
     <main>{children}</main>
     <footer>© K-TRAINERS. All rights reserved.<br/><span>傷害情報は認証されたサーバーに保存されます。</span></footer>
   </div>
 </div>;
}

function PlayerPortal({profile,session,onLogout}:{profile:Profile;session:any;onLogout:()=>void}){
 const [screen,setScreen]=useState<PlayerScreen>('mypage');
 const [open,setOpen]=useState<Record<string,boolean>>({MEDICAL:false,PERFORMANCE:false,COMMUNICATION:false,SETTINGS:false});
 const [alerts,setAlerts]=useState({messages:0,chat:0});
 useEffect(()=>{loadPlayerAlerts()},[profile.id]);
 async function loadPlayerAlerts(){const [{count:m},{count:ch}]=await Promise.all([supabase.from('player_messages').select('id',{count:'exact',head:true}).eq('player_id',profile.id).eq('is_read',false),supabase.from('chat_messages').select('id',{count:'exact',head:true}).eq('recipient_id',profile.id).is('read_at',null)]);setAlerts({messages:Number(m||0),chat:Number(ch||0)})}
 async function changePlayerScreen(next:PlayerScreen){setScreen(next);if(next==='messages'){await supabase.from('player_messages').update({is_read:true}).eq('player_id',profile.id).eq('is_read',false);setAlerts(a=>({...a,messages:0}))}if(next==='chat'){await supabase.from('chat_messages').update({read_at:new Date().toISOString()}).eq('recipient_id',profile.id).is('read_at',null);setAlerts(a=>({...a,chat:0}))}}
 const groups:{key:string;label:string;items:[PlayerScreen,string][]}[]=[
   {key:'MEDICAL',label:'MEDICAL',items:[['report','ケガの報告'],['history','ケガの履歴'],['medical','現在の傷害'],['rehab','リハビリ'],['rtp','Return to Play']]},
   {key:'PERFORMANCE',label:'PERFORMANCE',items:[['physical','フィジカル'],['gps','GPS']]},
   {key:'COMMUNICATION',label:'COMMUNICATION',items:[['schedule','スケジュール'],['messages','お知らせ'],['chat','チャット']]},
   {key:'SETTINGS',label:'SETTINGS',items:[['settings','設定']]}
 ];
 return <div className="appFrame playerPortal">
   <aside className="mainSidebar playerNav">
     <div className="sidebarBrand"><b>KTRS FMS</b><span>PLAYER PORTAL</span></div>
     <button className={'sidebarHome '+(screen==='mypage'?'active':'')} onClick={()=>changePlayerScreen('mypage')>HOME</button>
     {groups.map(g=>{const gn=g.key==='COMMUNICATION'?alerts.messages+alerts.chat:0;return <div className="navGroup" key={g.key}><button className={'navGroupHead '+(g.items.some(([k])=>k===screen)?'activeGroup':'')} onClick={()=>setOpen(o=>({...o,[g.key]:!o[g.key]}))}><span className="navTitleWithAlert"><span>{g.label}</span>{gn>0&&<em className="navGroupAlert">{gn}</em>}</span><span className="chev">{open[g.key]?'−':'＋'}</span></button>{open[g.key]&&<div className="navChildren">{g.items.map(([k,l])=>{const n=k==='messages'?alerts.messages:k==='chat'?alerts.chat:0;return <button key={k} className={screen===k?'active':''} onClick={()=>changePlayerScreen(k)}><span>{l}</span>{n>0&&<em>{n}</em>}</button>})}</div>}</div>})}
   </aside>
   <div className="appContent">
     <header className="topHeader"><div><b>KTRS FMS</b><span> PLAYER PORTAL</span></div><div className="user"><LiveDateTime/><span className="headerUserName">{profile.full_name} さん</span><button onClick={onLogout}>ログアウト</button></div></header>
     <main className="playerMain">
       {screen==='mypage'&&<PlayerMyPage profile={profile}/>}
       {screen==='schedule'&&<PlayerSchedule profile={profile}/>}
       {screen==='report'&&<PlayerInjuryReport profile={profile} onDone={()=>changePlayerScreen('history')/>}
       {screen==='history'&&<PlayerInjuryHistory profile={profile}/>}
       {screen==='medical'&&<PlayerMedicalOverview profile={profile}/>}
       {screen==='rehab'&&<PlayerRehabView profile={profile}/>}
       {screen==='rtp'&&<PlayerRtpView profile={profile}/>}
       {screen==='physical'&&<PhysicalMeasurements profile={profile}/>}
       {screen==='gps'&&<PlayerGpsView profile={profile}/>}
       {screen==='messages'&&<PlayerMessagesView profile={profile}/>}
       {screen==='chat'&&<PlayerChat profile={profile}/>}
       {screen==='settings'&&<PlayerSettings profile={profile} session={session}/>}
     </main>
     <footer>© K-TRAINERS. All rights reserved.</footer>
   </div>
 </div>;
}

function GameAnalysis({profile}:{profile:Profile|null}){
 const [games,setGames]=useState<any[]>([]);
 const [players,setPlayers]=useState<any[]>([]);
 const [selected,setSelected]=useState<any|null>(null);
 const [review,setReview]=useState<any|null>(null);
 const [comment,setComment]=useState('');
 const [media,setMedia]=useState<any[]>([]);
 const [evals,setEvals]=useState<Record<string,{grade:string;comment:string}>>({});
 const [files,setFiles]=useState<File[]>([]);
 const [msg,setMsg]=useState('');
 const [saving,setSaving]=useState(false);

 useEffect(()=>{loadBase()},[]);
 async function loadBase(){
   const [{data:g,error:ge},{data:p,error:pe}]=await Promise.all([
     supabase.from('player_schedule').select('id,schedule_date,starts_at,entry_label,event_type,opponent,competition_name,location,notes').is('player_id',null).eq('event_type','Game').order('schedule_date',{ascending:false}).limit(60),
     supabase.from('profiles').select('id,full_name,school_grade,position,avatar_path').eq('role','player').eq('is_hidden',false).order('school_grade',{ascending:false}).order('full_name')
   ]);
   if(ge||pe)setMsg((ge||pe)?.message||'読み込みエラー');
   setGames(g||[]);setPlayers(p||[]);
 }
 async function openGame(game:any){
   setSelected(game);setMsg('');setFiles([]);
   const [{data:r},{data:e}]=await Promise.all([
     supabase.from('game_reviews').select('*').eq('schedule_id',game.id).maybeSingle(),
     supabase.from('player_game_evaluations').select('player_id,grade,comment').eq('schedule_id',game.id)
   ]);
   setReview(r||null);setComment(r?.team_comment||'');
   const map:Record<string,{grade:string;comment:string}>={};
   (e||[]).forEach((x:any)=>map[x.player_id]={grade:x.grade,comment:x.comment||''});
   setEvals(map);
   if(r?.id){
     const {data:m}=await supabase.from('game_review_media').select('*').eq('game_review_id',r.id).order('created_at');
     const withUrls=await Promise.all((m||[]).map(async(x:any)=>{
       const {data}=await supabase.storage.from('game-review-media').createSignedUrl(x.storage_path,3600);
       return {...x,url:data?.signedUrl||''};
     }));
     setMedia(withUrls);
   }else setMedia([]);
 }
 function setEval(id:string,key:'grade'|'comment',value:string){
   setEvals(prev=>({...prev,[id]:{grade:prev[id]?.grade||'',comment:prev[id]?.comment||'',[key]:value}}));
 }
 async function saveReview(){
   if(!selected||!profile?.id)return;
   setSaving(true);setMsg('');
   let reviewId=review?.id;
   if(reviewId){
     const {error}=await supabase.from('game_reviews').update({team_comment:comment||null,updated_by:profile.id,updated_at:new Date().toISOString()}).eq('id',reviewId);
     if(error){setMsg(error.message);setSaving(false);return}
   }else{
     const {data,error}=await supabase.from('game_reviews').insert({schedule_id:selected.id,team_comment:comment||null,created_by:profile.id,updated_by:profile.id}).select().single();
     if(error){setMsg(error.message);setSaving(false);return}
     reviewId=data.id;setReview(data);
   }
   const rows=Object.entries(evals).filter(([,v])=>v.grade).map(([player_id,v])=>({schedule_id:selected.id,player_id,grade:v.grade,comment:v.comment||null,evaluated_by:profile.id,updated_at:new Date().toISOString()}));
   if(rows.length){
     const {error}=await supabase.from('player_game_evaluations').upsert(rows,{onConflict:'schedule_id,player_id'});
     if(error){setMsg(error.message);setSaving(false);return}
   }
   for(const file of files){
     if(!file.type.startsWith('image/')&&!file.type.startsWith('video/'))continue;
     const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
     const path=`${selected.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
     const {error:upErr}=await supabase.storage.from('game-review-media').upload(path,file,{contentType:file.type});
     if(upErr){setMsg(upErr.message);setSaving(false);return}
     const {error:metaErr}=await supabase.from('game_review_media').insert({game_review_id:reviewId,storage_path:path,file_name:file.name,mime_type:file.type,file_size:file.size,uploaded_by:profile.id});
     if(metaErr){setMsg(metaErr.message);setSaving(false);return}
   }
   setFiles([]);setMsg('試合分析を保存しました。');setSaving(false);await openGame(selected);
 }
 async function removeMedia(item:any){
   if(!window.confirm('この写真・動画を削除しますか？'))return;
   const {error:s}=await supabase.storage.from('game-review-media').remove([item.storage_path]);
   if(s){setMsg(s.message);return}
   const {error:d}=await supabase.from('game_review_media').delete().eq('id',item.id);
   setMsg(d?d.message:'削除しました。');if(!d&&selected)openGame(selected);
 }

 return <section><Title t="SCHEDULE / Games"/>
   {msg&&<div className="notice">{msg}</div>}
   {!selected?<div className="gameAnalysisList">{games.length?games.map((g:any)=><button className="panel gameAnalysisCard" key={g.id} onClick={()=>openGame(g)}><div><span>{g.schedule_date}</span><h3>{g.opponent?'vs '+g.opponent:'Game'}</h3>{g.competition_name&&<b>{g.competition_name}</b>}{g.location&&<small>{g.location}</small>}</div><span className="gameAnalysisArrow">›</span></button>):<div className="panel empty">Gameの予定がありません。</div>}</div>:
   <div className="gameAnalysisEditor">
     <div className="panel gameAnalysisHeader"><button className="secondary" onClick={()=>setSelected(null)}>← 試合一覧</button><div><span>{selected.schedule_date}</span><h2>{selected.opponent?'vs '+selected.opponent:'Game'}</h2><p>{[selected.competition_name,selected.location].filter(Boolean).join(' / ')}</p></div></div>
     <div className="panel form"><h3>試合分析コメント</h3><textarea rows={6} value={comment} onChange={e=>setComment(e.target.value)} placeholder="試合全体の振り返り、良かった点、改善点などを入力"/></div>
     <div className="panel form"><h3>写真・動画</h3><input type="file" multiple accept="image/*,video/*" onChange={e=>setFiles(Array.from(e.target.files||[]))}/>{files.length>0&&<p className="fine">{files.length}ファイルを保存時にアップロードします。</p>}<div className="gameMediaGrid">{media.map((m:any)=><div className="gameMediaItem" key={m.id}>{m.mime_type.startsWith('image/')?<img src={m.url} alt={m.file_name}/>:<video src={m.url} controls preload="metadata"/>}<div><span>{m.file_name}</span><button className="dangerBtn" onClick={()=>removeMedia(m)}>削除</button></div></div>)}</div></div>
     <div className="panel"><div className="sofaSectionHead"><div><span className="sectionKicker">PLAYER RATING</span><h3>選手評価 A〜E</h3></div></div><div className="tableWrap"><table><thead><tr><th>選手</th><th>学年/Pos</th><th>評価</th><th>コメント</th></tr></thead><tbody>{players.map((p:any)=><tr key={p.id}><td><div className="personCell"><Avatar path={p.avatar_path} name={p.full_name} size={34}/><b>{p.full_name}</b></div></td><td>{p.school_grade||'-'}年 / {p.position||'-'}</td><td><div className="gradeButtons">{['A','B','C','D','E'].map(g=><button key={g} className={'gradeButton '+(evals[p.id]?.grade===g?'selected grade'+g:'')} onClick={()=>setEval(p.id,'grade',g)}>{g}</button>)}</div></td><td><input value={evals[p.id]?.comment||''} onChange={e=>setEval(p.id,'comment',e.target.value)} placeholder="個別コメント"/></td></tr>)}</tbody></table></div></div>
     <div className="gameAnalysisSave"><button disabled={saving} onClick={saveReview}>{saving?'保存中...':'試合分析を保存'}</button></div>
   </div>}
 </section>;
}


function PlayerMyPage({profile}:{profile:Profile}){
 const [active,setActive]=useState<any[]>([]);
 const [messages,setMessages]=useState<any[]>([]);
 const [schedule,setSchedule]=useState<any[]>([]);
 const [gps,setGps]=useState<any|null>(null);
 const [rehab,setRehab]=useState<any|null>(null);
 const [latestEval,setLatestEval]=useState<any|null>(null);

 useEffect(()=>{(async()=>{
   const today=new Date();const todayIso=today.toISOString().slice(0,10);const end=new Date(today);end.setDate(today.getDate()+7);
   const {data:cases}=await supabase.from('injury_cases').select('id,injury_name,body_part,current_status,injury_date,rehab_start_date,rehab_stage').eq('player_id',profile.id).neq('current_status','available').order('injury_date',{ascending:false});
   const caseIds=(cases||[]).map((x:any)=>x.id);
   const [m,s,g,r,e]=await Promise.all([
     supabase.from('player_messages').select('id,title,body,created_at').eq('player_id',profile.id).order('created_at',{ascending:false}).limit(3),
     supabase.from('player_schedule').select('id,title,starts_at,ends_at,category,entry_label,event_type,opponent,competition_name,location').or('player_id.is.null,player_id.eq.'+profile.id).gte('schedule_date',todayIso).lte('schedule_date',end.toISOString().slice(0,10)).order('schedule_date',{ascending:true}).order('starts_at',{ascending:true}).limit(5),
     supabase.from('gps_player_metrics').select('id,total_distance_m,hsr_distance_m,sprint_distance_m,sprint_count,max_speed_kmh,created_at,gps_sessions(session_date,session_name,session_type)').eq('player_id',profile.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
     caseIds.length?supabase.from('rehab_progress').select('id,case_id,stage_name,progress_percent,next_plan,recorded_at').in('case_id',caseIds).order('recorded_at',{ascending:false}).limit(1).maybeSingle():Promise.resolve({data:null} as any),
     supabase.from('player_game_evaluations').select('id,grade,comment,created_at,schedule_id,player_schedule(schedule_date,opponent,competition_name)').eq('player_id',profile.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
   ]);
   setActive(cases||[]);setMessages(m.data||[]);setSchedule(s.data||[]);setGps(g.data||null);
   if(r.data){const ci=(cases||[]).find((x:any)=>x.id===r.data.case_id);setRehab({...r.data,injury_name:ci?.injury_name||''})}else setRehab(null);
   setLatestEval(e.data||null);
 })()},[profile.id]);

 const bmi=profile.height_cm&&profile.weight_kg?profile.weight_kg/Math.pow(profile.height_cm/100,2):null;
 const dominant=profile.dominant_foot==='right'?'右':profile.dominant_foot==='left'?'左':profile.dominant_foot==='both'?'両':'-';
 const availability=active.some((x:any)=>x.current_status==='needs_attention')?'要対応':active.some((x:any)=>x.current_status==='rehab')?'リハビリ中':active.some((x:any)=>x.current_status==='observation')?'経過観察':'参加可能';
 const availabilityClass=availability==='参加可能'?'ok':availability==='要対応'?'danger':availability==='リハビリ中'?'info':'warn';

 return <section className="sofaPlayerHome">
   <div className="playerHeroCard">
     <div className="playerHeroMain">
       <Avatar path={profile.avatar_path} name={profile.full_name} size={108}/>
       <div className="playerHeroIdentity"><div className="playerHeroEyebrow">PLAYER PROFILE</div><h1>{profile.full_name}</h1><div className="playerHeroMeta"><span>{profile.school_grade||'-'}年</span><span>{profile.position||'-'}</span><span>利き足 {dominant}</span></div></div>
       <div className="playerAvailability"><span>STATUS</span><b className={'pill '+availabilityClass}>{availability}</b></div>
     </div>
     <div className="playerQuickStats">
       <div><span>身長</span><b>{profile.height_cm??'-'}<small>{profile.height_cm?' cm':''}</small></b></div>
       <div><span>体重</span><b>{profile.weight_kg??'-'}<small>{profile.weight_kg?' kg':''}</small></b></div>
       <div><span>BMI</span><b>{bmi?bmi.toFixed(1):'-'}</b></div>
       <div><span>登録番号</span><b>{profile.player_registration_number||'-'}</b></div>
     </div>
   </div>

   <div className="playerHomeGrid">
     <div className="playerHomeMain">
       <div className="panel sofaSection">
         <div className="sofaSectionHead"><div><span className="sectionKicker">PERFORMANCE</span><h3>最新GPS</h3></div>{gps?.gps_sessions?.session_date&&<small>{gps.gps_sessions.session_date}</small>}</div>
         {gps?<div className="sofaStatGrid">
           <div><span>総走行距離</span><b>{gps.total_distance_m??'-'}</b><small>m</small></div>
           <div><span>HSR</span><b>{gps.hsr_distance_m??'-'}</b><small>m</small></div>
           <div><span>スプリント距離</span><b>{gps.sprint_distance_m??'-'}</b><small>m</small></div>
           <div><span>スプリント</span><b>{gps.sprint_count??'-'}</b><small>回</small></div>
           <div><span>最高速度</span><b>{gps.max_speed_kmh??'-'}</b><small>km/h</small></div>
         </div>:<div className="empty compact">GPSデータはまだありません。</div>}
       </div>

       <div className="panel sofaSection">
         <div className="sofaSectionHead"><div><span className="sectionKicker">MEDICAL</span><h3>コンディション</h3></div></div>
         {active.length?<div className="sofaMedicalList">{active.map((x:any)=><div className="sofaMedicalRow" key={x.id}><div><b>{x.injury_name}</b><span>{x.body_part} ・ {new Date(x.injury_date+'T00:00:00').toLocaleDateString('ja-JP')}</span></div><span className={'pill '+statusClass[x.current_status]}>{statusLabel[x.current_status]}{x.current_status==='rehab'&&x.rehab_start_date?' / Day '+(Math.floor((new Date().setHours(0,0,0,0)-new Date(x.rehab_start_date+'T00:00:00').setHours(0,0,0,0))/86400000)+1):''}</span></div>)}</div>:<div className="sofaHealthy"><b>✓ 現在対応中の傷害なし</b><span>通常参加可能</span></div>}
         {rehab&&<div className="rehabSnapshot"><div><span>最新リハビリ</span><b>{rehab.injury_name||'リハビリ'} ・ {rehab.stage_name||'Stage'}</b></div>{rehab.progress_percent!=null&&<strong>{rehab.progress_percent}%</strong>}</div>}
       </div>
     </div>

     <div className="playerHomeSide">
       <div className="panel sofaSection">
         <div className="sofaSectionHead"><div><span className="sectionKicker">SCHEDULE</span><h3>次の予定</h3></div></div>
         {schedule.length?<div className="sofaScheduleList">{schedule.map((s:any)=><div className="sofaScheduleRow" key={s.id}><div className="sofaDateBox"><b>{new Date(s.starts_at||s.schedule_date).getDate()}</b><span>{new Date(s.starts_at||s.schedule_date).toLocaleDateString('ja-JP',{month:'short'})}</span></div><div><b>{s.entry_label||s.title||s.event_type||'-'}</b>{s.event_type==='Game'&&s.opponent&&<span>vs {s.opponent}</span>}{s.competition_name&&<small>{s.competition_name}</small>}{s.location&&<small>{s.location}</small>}</div></div>)}</div>:<div className="empty compact">今週の予定はありません。</div>}
       </div>

       {latestEval&&<div className="panel sofaSection">
         <div className="sofaSectionHead"><div><span className="sectionKicker">GAME REVIEW</span><h3>最新の試合評価</h3></div><span className={'gameGrade grade'+latestEval.grade}>{latestEval.grade}</span></div>
         <div className="latestGameEval"><b>{latestEval.player_schedule?.schedule_date||''} {latestEval.player_schedule?.opponent?'vs '+latestEval.player_schedule.opponent:''}</b>{latestEval.player_schedule?.competition_name&&<span>{latestEval.player_schedule.competition_name}</span>}{latestEval.comment&&<p>{latestEval.comment}</p>}</div>
       </div>}
       <div className="panel sofaSection">
         <div className="sofaSectionHead"><div><span className="sectionKicker">INFO</span><h3>お知らせ</h3></div></div>
         {messages.length?<div className="sofaMessageList">{messages.map((m:any)=><div className="sofaMessageRow" key={m.id}><b>{m.title}</b><p>{m.body||''}</p><small>{new Date(m.created_at).toLocaleDateString('ja-JP')}</small></div>)}</div>:<div className="empty compact">新着のお知らせはありません。</div>}
       </div>
     </div>
   </div>
 </section>;
}

function emptyReport(){return {injury_date:'',symptom:'',body_part:'',side:'right',activity:'',mechanism:'',hospital_status:'未受診',facility_name:'',visit_date:'',diagnosis:'',instructed_plan:'',notes:''}}


function PlayerSchedule({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{(async()=>{const today=new Date().toISOString();const {data}=await supabase.from('player_schedule').select('*').or('player_id.is.null,player_id.eq.'+profile.id).gte('starts_at',today).order('starts_at',{ascending:true}).limit(60);setRows(data||[])})()},[profile.id]);
 return <section><Title t="スケジュール"/><div className="panel">{rows.length?rows.map(r=><div className="scheduleItem" key={r.id}><b>{new Date(r.starts_at).toLocaleString('ja-JP',{month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'})}</b><span>{r.entry_label||r.title||r.event_type||'-'}</span>{r.location&&<small>{r.location}</small>}</div>):<div className="empty">予定はありません。</div>}</div></section>;
}

function PlayerMedicalOverview({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{supabase.from('injury_cases').select('*').eq('player_id',profile.id).order('injury_date',{ascending:false}).then(({data})=>setRows(data||[]))},[profile.id]);
 return <section><Title t="現在の傷害"/><div className="caseGrid">{rows.length?rows.map(r=><div className="panel" key={r.id}><h3>{r.injury_name}</h3><p>{r.body_part} / {r.side||'-'}</p><span className={'pill '+statusClass[r.current_status]}>{statusLabel[r.current_status]||r.current_status}</span><p>受傷日: {r.injury_date}</p>{r.notes&&<p>{r.notes}</p>}</div>):<div className="panel empty">傷害ケースはありません。</div>}</div></section>;
}

function PlayerRehabView({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{(async()=>{const {data:cases}=await supabase.from('injury_cases').select('id,injury_name,body_part,rehab_start_date,rehab_stage').eq('player_id',profile.id);const ids=(cases||[]).map((x:any)=>x.id);if(!ids.length){setRows([]);return}const {data:prog}=await supabase.from('rehab_progress').select('*').in('case_id',ids).order('recorded_at',{ascending:false});const map=new Map((cases||[]).map((x:any)=>[x.id,x]));setRows((prog||[]).map((x:any)=>({...x,caseInfo:map.get(x.case_id)})))})()},[profile.id]);
 return <section><Title t="リハビリ"/><div className="caseGrid">{rows.length?rows.map(r=><div className="panel" key={r.id}><h3>{r.caseInfo?.injury_name||'リハビリ'}</h3><p>{r.stage_name||('Stage '+(r.caseInfo?.rehab_stage??'-'))}</p>{r.progress_percent!=null&&<p><b>進捗 {r.progress_percent}%</b></p>}{r.exercises&&<p>{r.exercises}</p>}{r.next_plan&&<p>次の予定: {r.next_plan}</p>}</div>):<div className="panel empty">リハビリ記録はありません。</div>}</div></section>;
}

function PlayerRtpView({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{(async()=>{const {data:cases}=await supabase.from('injury_cases').select('id,injury_name').eq('player_id',profile.id);const ids=(cases||[]).map((x:any)=>x.id);if(!ids.length){setRows([]);return}const {data}=await supabase.from('return_to_play_decisions').select('*').in('case_id',ids).order('decided_at',{ascending:false});const map=new Map((cases||[]).map((x:any)=>[x.id,x]));setRows((data||[]).map((x:any)=>({...x,injury_name:map.get(x.case_id)?.injury_name})))})()},[profile.id]);
 const label:any={not_cleared:'復帰不可',modified:'制限付き',full:'完全復帰'};
 return <section><Title t="Return to Play"/><div className="caseGrid">{rows.length?rows.map(r=><div className="panel" key={r.id}><h3>{r.injury_name||'復帰判断'}</h3><p><b>{label[r.status]||r.status}</b></p>{r.criteria_summary&&<p>{r.criteria_summary}</p>}{r.restrictions&&<p>制限: {r.restrictions}</p>}<small>{new Date(r.decided_at).toLocaleString('ja-JP')}</small></div>):<div className="panel empty">復帰判断記録はありません。</div>}</div></section>;
}

function PlayerGpsView({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{supabase.from('gps_player_metrics').select('*,gps_sessions(session_date,session_name,session_type)').eq('player_id',profile.id).order('created_at',{ascending:false}).then(({data})=>setRows(data||[]))},[profile.id]);
 return <section><Title t="GPS"/><div className="tableWrap"><table><thead><tr><th>日付</th><th>セッション</th><th>総走行距離</th><th>HSR</th><th>スプリント</th><th>最高速度</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.gps_sessions?.session_date||'-'}</td><td>{r.gps_sessions?.session_name||'-'}</td><td>{r.total_distance_m??'-'}m</td><td>{r.hsr_distance_m??'-'}m</td><td>{r.sprint_distance_m??'-'}m / {r.sprint_count??'-'}回</td><td>{r.max_speed_kmh??'-'}km/h</td></tr>)}</tbody></table>{!rows.length&&<div className="empty">GPSデータはありません。</div>}</div></section>;
}

function PlayerMessagesView({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{supabase.from('player_messages').select('*').eq('player_id',profile.id).order('created_at',{ascending:false}).then(({data})=>setRows(data||[]))},[profile.id]);
 return <section><Title t="お知らせ"/><div className="panel">{rows.length?rows.map(r=><div className="messageItem" key={r.id}><b>{r.title}</b><p>{r.body||''}</p><small>{new Date(r.created_at).toLocaleString('ja-JP')}</small></div>):<div className="empty">お知らせはありません。</div>}</div></section>;
}

function PlayerInjuryReport({profile,onDone}:{profile:Profile;onDone:()=>void}){
 const [form,setForm]=useState<any>(emptyReport()),[msg,setMsg]=useState(''),[files,setFiles]=useState<File[]>([]),[uploading,setUploading]=useState(false);
 async function submit(e:React.FormEvent){
   e.preventDefault();setUploading(true);
   const {data,error}=await supabase.from('injury_reports').insert({player_id:profile.id,...form,visit_date:form.visit_date||null,review_status:'pending'}).select('id').single();
   if(error){setMsg(error.message);setUploading(false);return}
   let uploadError:any=null;
   for(const file of files){
     if(file.size>10*1024*1024){uploadError=new Error('添付ファイルは1件10MB以下にしてください。');break}
     const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
     const path=`${profile.id}/reports/${data.id}/${Date.now()}-${safe}`;
     const up=await supabase.storage.from('medical-attachments').upload(path,file,{contentType:file.type||'application/octet-stream'});
     if(up.error){uploadError=up.error;break}
     const meta=await supabase.from('injury_report_attachments').insert({report_id:data.id,player_id:profile.id,storage_path:path,file_name:file.name,mime_type:file.type||'application/octet-stream',file_size:file.size,uploaded_by:profile.id});
     if(meta.error){uploadError=meta.error;break}
   }
   setMsg(uploadError?'報告は送信しましたが、添付に失敗しました: '+uploadError.message:'ケガの報告を送信しました。');
   setUploading(false);
   if(!uploadError){setForm(emptyReport());setFiles([]);setTimeout(onDone,300)}
 }
 return <section><Title t="ケガの報告" s="新しいケガ・症状を報告します"/><form className="panel form" onSubmit={submit}><ReportFields value={form} setValue={setForm}/>
 <div className="medicalAttachmentBox"><b>病院関連資料・画像</b><input type="file" multiple accept="image/*,.pdf" onChange={e=>setFiles(Array.from(e.target.files||[]))}/><small>診断書・画像・病院資料など。画像またはPDF、1ファイル10MB以下。</small>{files.length>0&&<div className="attachmentNames">{files.map((f,i)=><span key={i}>{f.name}</span>)}</div>}</div>
 <button disabled={uploading}>{uploading?'送信中...':'報告する'}</button></form>{msg&&<div className="notice">{msg}</div>}</section>;
}


function InjuryAttachments({reportId}:{reportId:number}){
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{supabase.from('injury_report_attachments').select('*').eq('report_id',reportId).order('created_at').then(({data})=>setRows(data||[]))},[reportId]);
 async function openFile(path:string){
   const {data,error}=await supabase.storage.from('medical-attachments').createSignedUrl(path,300);
   if(!error&&data?.signedUrl)window.open(data.signedUrl,'_blank','noopener,noreferrer');
 }
 if(!rows.length)return null;
 return <div className="attachmentList">{rows.map(r=><button type="button" className="attachmentLink" key={r.id} onClick={()=>openFile(r.storage_path)}>{r.file_name}</button>)}</div>;
}

function PlayerInjuryHistory({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]),[edit,setEdit]=useState<any|null>(null),[msg,setMsg]=useState('');
 useEffect(()=>{load()},[]);
 async function load(){const {data,error}=await supabase.from('injury_reports').select('id,player_id,injury_date,symptom,body_part,side,activity,mechanism,hospital_status,facility_name,visit_date,diagnosis,instructed_plan,notes,review_status,created_at,player_edited_fields,player_last_edited_at').eq('player_id',profile.id).order('injury_date',{ascending:false});if(error)setMsg(error.message);setRows(data||[])}
 async function save(){if(!edit)return;const {error}=await supabase.rpc('player_update_own_injury_report',{p_report_id:edit.id,p_injury_date:edit.injury_date,p_symptom:edit.symptom,p_body_part:edit.body_part,p_side:edit.side,p_activity:edit.activity||null,p_mechanism:edit.mechanism||null,p_hospital_status:edit.hospital_status||null,p_facility_name:edit.facility_name||null,p_visit_date:edit.visit_date||null,p_diagnosis:edit.diagnosis||null,p_instructed_plan:edit.instructed_plan||null,p_notes:edit.notes||null});setMsg(error?error.message:'履歴を更新しました。');if(!error){setEdit(null);load()}}
 const changed=(r:any,k:string)=>Array.isArray(r.player_edited_fields)&&r.player_edited_fields.includes(k);
 return <section><Title t="ケガの履歴" s="該当するケガを選択して報告内容を編集できます"/>{msg&&<div className="notice">{msg}</div>}<div className="tableWrap"><table><thead><tr><th>受傷日</th><th>ケガ・症状</th><th>部位</th><th>受診</th><th>添付</th><th>編集</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className={changed(r,'injury_date')?'changed':''}>{r.injury_date}</td><td className={changed(r,'symptom')?'changed':''}>{r.symptom}</td><td className={changed(r,'body_part')?'changed':''}>{r.body_part}</td><td>{r.hospital_status||'-'}</td><td><InjuryAttachments reportId={r.id}/></td><td><button onClick={()=>setEdit({...r})}>選択・編集</button></td></tr>)}</tbody></table>{!rows.length&&<div className="empty">ケガの履歴はありません。</div>}</div>
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
 const [form,setForm]=useState<any>({...profile,birth_date:'',phone:''}),[email,setEmail]=useState(session?.user?.email||''),[password,setPassword]=useState(''),[msg,setMsg]=useState(''),[uploading,setUploading]=useState(false),[cropFile,setCropFile]=useState<File|null>(null);
 useEffect(()=>{supabase.from('profiles').select('full_name,birth_date,phone,origin_team,height_cm,weight_kg,dominant_foot,school_grade,position,avatar_path').eq('id',profile.id).maybeSingle().then(({data})=>data&&setForm(data))},[profile.id]);
 async function saveProfile(){const {error}=await supabase.from('profiles').update({full_name:form.full_name,birth_date:form.birth_date||null,phone:form.phone||null,origin_team:form.origin_team||null,height_cm:form.height_cm||null,weight_kg:form.weight_kg||null,dominant_foot:form.dominant_foot||null,school_grade:form.school_grade||null,position:form.position||null}).eq('id',profile.id);setMsg(error?error.message:'基本情報を保存しました。')}
 async function uploadCroppedAvatar(blob:Blob){
   setUploading(true);setMsg('');
   const path=`${profile.id}/avatar.jpg`;
   const {error:upErr}=await supabase.storage.from('profile-photos').upload(path,blob,{upsert:true,contentType:'image/jpeg'});
   if(upErr){setMsg(upErr.message);setUploading(false);return}
   const {error:pErr}=await supabase.from('profiles').update({avatar_path:path}).eq('id',profile.id);
   setMsg(pErr?pErr.message:'顔写真の切り抜きを保存しました。');
   if(!pErr)setForm({...form,avatar_path:path});
   setCropFile(null);setUploading(false);
 }
 async function saveAuth(){let error:any=null;if(email&&email!==session?.user?.email){const r=await supabase.auth.updateUser({email});error=r.error}if(!error&&password){const r=await supabase.auth.updateUser({password});error=r.error}setMsg(error?error.message:'ログイン情報を更新しました。');if(!error)setPassword('')}
 return <section><Title t="設定" s="顔写真・身体情報・経歴・ログイン情報を変更できます"/>
 <div className="panel form"><h3>顔写真</h3><div className="avatarSetting"><Avatar path={form.avatar_path} name={form.full_name||profile.full_name} size={112}/><div><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){setMsg('画像は5MB以下にしてください。');return}setCropFile(file)}}/><p className="fine">JPEG・PNG・WebP、5MB以下。選択後に表示範囲を調整できます。</p>{uploading&&<span className="fine">アップロード中...</span>}</div></div></div>{cropFile&&<AvatarCropper file={cropFile} onCancel={()=>setCropFile(null)} onSave={uploadCroppedAvatar}/>} 
 <div className="panel form"><h3>身体情報・経歴</h3><div className="grid2"><input placeholder="氏名" value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})}/><input type="date" value={form.birth_date||''} onChange={e=>setForm({...form,birth_date:e.target.value})}/><input placeholder="電話番号" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/><input placeholder="出身チーム" value={form.origin_team||''} onChange={e=>setForm({...form,origin_team:e.target.value})}/><input type="number" placeholder="身長 cm" value={form.height_cm??''} onChange={e=>setForm({...form,height_cm:e.target.value===''?null:Number(e.target.value)})}/><input type="number" placeholder="体重 kg" value={form.weight_kg??''} onChange={e=>setForm({...form,weight_kg:e.target.value===''?null:Number(e.target.value)})}/><select value={form.dominant_foot||'right'} onChange={e=>setForm({...form,dominant_foot:e.target.value})}><option value="right">右利き</option><option value="left">左利き</option><option value="both">両利き</option></select><select value={form.school_grade||1} onChange={e=>setForm({...form,school_grade:Number(e.target.value)})}><option value={1}>1年</option><option value={2}>2年</option><option value={3}>3年</option></select><select value={form.position||'FW'} onChange={e=>setForm({...form,position:e.target.value})}><option>GK</option><option>DF</option><option>MF</option><option>FW</option></select></div><button onClick={saveProfile}>基本情報を保存</button></div>
 <div className="panel form"><h3>ID・パスワード</h3><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ログインID（メール）"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="新しいパスワード（8文字以上・英数字）"/><button onClick={saveAuth}>ログイン情報を変更</button></div>{msg&&<div className="notice">{msg}</div>}</section>;
}


function AvatarCropper({file,onCancel,onSave}:{file:File;onCancel:()=>void;onSave:(blob:Blob)=>void|Promise<void>}){
 const [url,setUrl]=useState('');
 const [natural,setNatural]=useState({w:0,h:0});
 const [zoom,setZoom]=useState(1);
 const [offset,setOffset]=useState({x:0,y:0});
 const [drag,setDrag]=useState<{x:number;y:number;ox:number;oy:number}|null>(null);
 const stage=320;
 const cropSize=180;

 useEffect(()=>{
   const u=URL.createObjectURL(file);setUrl(u);
   return()=>URL.revokeObjectURL(u);
 },[file]);

 function ready(e:React.SyntheticEvent<HTMLImageElement>){
   const img=e.currentTarget;
   setNatural({w:img.naturalWidth,h:img.naturalHeight});
   setZoom(1);
   setOffset({x:0,y:0});
 }

 const baseScale=natural.w&&natural.h?Math.max(cropSize/natural.w,cropSize/natural.h):1;
 const displayW=natural.w*baseScale*zoom;
 const displayH=natural.h*baseScale*zoom;
 const centerX=stage/2+offset.x;
 const centerY=stage/2+offset.y;

 function clampOffset(nx:number,ny:number,z=zoom){
   if(!natural.w||!natural.h)return {x:nx,y:ny};
   const w=natural.w*baseScale*z,h=natural.h*baseScale*z;
   const maxX=Math.max(0,(w-cropSize)/2);
   const maxY=Math.max(0,(h-cropSize)/2);
   return {x:Math.max(-maxX,Math.min(maxX,nx)),y:Math.max(-maxY,Math.min(maxY,ny))};
 }
 function pointerDown(e:React.PointerEvent<HTMLDivElement>){
   e.currentTarget.setPointerCapture(e.pointerId);
   setDrag({x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y});
 }
 function pointerMove(e:React.PointerEvent<HTMLDivElement>){
   if(!drag)return;
   const next=clampOffset(drag.ox+(e.clientX-drag.x),drag.oy+(e.clientY-drag.y));
   setOffset(next);
 }
 function pointerUp(){setDrag(null)}
 function changeZoom(v:number){
   const z=Math.max(1,Math.min(3,v));
   setZoom(z);
   setOffset(o=>clampOffset(o.x,o.y,z));
 }
 async function save(){
   const img=document.querySelector('#avatarCropImage') as HTMLImageElement|null;
   if(!img||!natural.w)return;
   const scale=baseScale*zoom;
   const imageLeft=stage/2+offset.x-displayW/2;
   const imageTop=stage/2+offset.y-displayH/2;
   const cropLeft=stage/2-cropSize/2;
   const cropTop=stage/2-cropSize/2;
   const sx=(cropLeft-imageLeft)/scale;
   const sy=(cropTop-imageTop)/scale;
   const ss=cropSize/scale;
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
   const ctx=canvas.getContext('2d');if(!ctx)return;
   ctx.drawImage(img,sx,sy,ss,ss,0,0,512,512);
   canvas.toBlob(blob=>{if(blob)onSave(blob)},'image/jpeg',0.9);
 }
 return <div className="confirmOverlay"><div className="confirmCard cropCard">
   <h3>顔写真の表示範囲を調整</h3>
   <p className="fine">画像をドラッグして位置を調整し、スライダーで拡大・縮小できます。</p>
   <div className="avatarCropStage" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
     {url&&<img id="avatarCropImage" src={url} alt="切り抜き対象" onLoad={ready} style={{width:displayW||'auto',height:displayH||'auto',left:centerX,top:centerY,transform:'translate(-50%,-50%)'}}/>}
     <div className="avatarCropFixedCircle" style={{width:cropSize,height:cropSize}}></div>
   </div>
   <div className="cropZoomRow"><span>縮小</span><input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e=>changeZoom(Number(e.target.value))}/><span>拡大</span><b>{Math.round(zoom*100)}%</b></div>
   <div className="cropPreviewRow"><span>プレビュー</span><div className="cropPreview" style={{width:88,height:88}}>{url&&natural.w>0&&<div style={{width:88,height:88,overflow:'hidden',borderRadius:'50%',position:'relative'}}><img src={url} alt="" style={{position:'absolute',width:displayW*88/cropSize,height:displayH*88/cropSize,left:(cropSize/2-(stage/2+offset.x-displayW/2))*88/cropSize,top:(cropSize/2-(stage/2+offset.y-displayH/2))*88/cropSize,transform:'translate(-50%,-50%)'}}/></div>}</div></div>
   <div className="actions"><button onClick={save}>この範囲で保存</button><button className="secondary" onClick={()=>{setZoom(1);setOffset({x:0,y:0})}}>位置・大きさをリセット</button><button className="secondary" onClick={onCancel}>キャンセル</button></div>
 </div></div>;
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

function ModulePlaceholder({title}:{title:string;text:string}){return <section><Title t={title}/><div className="panel"><h3>画面構成を準備済み</h3></div></section>}

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





function AccountSettings({profile,session}:{profile:Profile;session:any}){
 const [form,setForm]=useState<any>({full_name:profile.full_name||'',birth_date:'',phone:'',staff_title:profile.staff_title||'',avatar_path:profile.avatar_path||''});
 const [email,setEmail]=useState(session?.user?.email||'');
 const [password,setPassword]=useState('');
 const [password2,setPassword2]=useState('');
 const [msg,setMsg]=useState('');
 const [uploading,setUploading]=useState(false);
 const [cropFile,setCropFile]=useState<File|null>(null);

 useEffect(()=>{(async()=>{
   const {data,error}=await supabase.from('profiles').select('full_name,birth_date,phone,staff_title,avatar_path,role').eq('id',profile.id).maybeSingle();
   if(error)setMsg(error.message); else if(data)setForm({...form,...data});
 })()},[profile.id]);

 async function saveProfile(){
   const payload:any={full_name:(form.full_name||'').trim(),birth_date:form.birth_date||null,phone:(form.phone||'').trim()||null,staff_title:(form.staff_title||'').trim()||null};
   const {error}=await supabase.from('profiles').update(payload).eq('id',profile.id);
   setMsg(error?error.message:'個人情報を保存しました。');
 }

 async function uploadCroppedAvatar(blob:Blob){
   setUploading(true);setMsg('');
   const path=`${profile.id}/avatar.jpg`;
   const {error:upErr}=await supabase.storage.from('profile-photos').upload(path,blob,{upsert:true,contentType:'image/jpeg'});
   if(upErr){setMsg(upErr.message);setUploading(false);return}
   const {error:pErr}=await supabase.from('profiles').update({avatar_path:path}).eq('id',profile.id);
   setMsg(pErr?pErr.message:'顔写真の切り抜きを保存しました。');
   if(!pErr)setForm((x:any)=>({...x,avatar_path:path}));
   setCropFile(null);setUploading(false);
 }

 async function saveEmail(){
   const next=email.trim();
   if(!next){setMsg('メールアドレスを入力してください。');return}
   if(next===session?.user?.email){setMsg('メールアドレスは変更されていません。');return}
   const {error}=await supabase.auth.updateUser({email:next});
   setMsg(error?error.message:'確認メールを送信しました。メール認証後にログインIDが変更されます。');
 }

 async function savePassword(){
   if(password.length<8||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password)){setMsg('パスワードは8文字以上で、英字と数字を両方含めてください。');return}
   if(password!==password2){setMsg('確認用パスワードが一致しません。');return}
   const {error}=await supabase.auth.updateUser({password});
   setMsg(error?error.message:'パスワードを変更しました。');
   if(!error){setPassword('');setPassword2('')}
 }

 return <section><Title t="SET / Account" s="個人情報とログイン情報を変更"/>
   {msg&&<div className="notice">{msg}</div>}
   <div className="panel form"><h3>顔写真</h3><div className="avatarSetting"><Avatar path={form.avatar_path} name={form.full_name||profile.full_name} size={96}/><div><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){setMsg('画像は5MB以下にしてください。');return}setCropFile(file)}}/><p className="fine">JPEG・PNG・WebP、5MB以下。選択後に表示範囲を調整できます。</p>{uploading&&<span className="fine">アップロード中...</span>}</div></div></div>
   {cropFile&&<AvatarCropper file={cropFile} onCancel={()=>setCropFile(null)} onSave={uploadCroppedAvatar}/>}
   <div className="panel form"><h3>個人情報</h3><div className="grid2"><label>氏名<input value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label>生年月日<input type="date" value={form.birth_date||''} onChange={e=>setForm({...form,birth_date:e.target.value})}/></label><label>電話番号<input value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>役職・肩書<input value={form.staff_title||''} onChange={e=>setForm({...form,staff_title:e.target.value})}/></label></div><button onClick={saveProfile}>個人情報を保存</button></div>
   <div className="panel form"><h3>ログインID（メールアドレス）</h3><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="メールアドレス"/><p className="fine">メールアドレス変更時は確認メールによる認証が必要です。</p><button onClick={saveEmail}>メールアドレスを変更</button></div>
   <div className="panel form"><h3>パスワード</h3><div className="grid2"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="新しいパスワード"/><input type="password" value={password2} onChange={e=>setPassword2(e.target.value)} placeholder="新しいパスワード（確認）"/></div><p className="fine">8文字以上・英字と数字を両方含む</p><button onClick={savePassword}>パスワードを変更</button></div>
 </section>;
}


function CategorySettings({profile}:{profile:Profile|null}){
 const [scheduleRows,setScheduleRows]=useState<any[]>([]);
 const [competitionRows,setCompetitionRows]=useState<any[]>([]);
 const [scheduleName,setScheduleName]=useState('');
 const [competitionName,setCompetitionName]=useState('');
 const [edit,setEdit]=useState<{kind:'schedule'|'competition';row:any;name:string}|null>(null);
 const [msg,setMsg]=useState('');

 useEffect(()=>{load()},[]);
 async function load(){
   const [{data:s,error:se},{data:c,error:ce}]=await Promise.all([
     supabase.from('schedule_entry_categories').select('*').order('sort_order').order('name'),
     supabase.from('schedule_competitions').select('*').order('sort_order').order('name'),
     isAdmin?supabase.rpc('admin_list_accounts',{filter_status:'pending'}):Promise.resolve({data:[]} as any)
   ]);
   if(se||ce)setMsg((se||ce)?.message||'読み込みに失敗しました。');
   setScheduleRows(s||[]);setCompetitionRows(c||[]);
 }

 async function add(kind:'schedule'|'competition'){
   const isSchedule=kind==='schedule';
   const raw=isSchedule?scheduleName:competitionName;
   const name=raw.trim();if(!name)return;
   const table=isSchedule?'schedule_entry_categories':'schedule_competitions';
   const rows=isSchedule?scheduleRows:competitionRows;
   const existing=rows.find((x:any)=>x.name===name);
   if(existing){setMsg('同じ名称がすでに登録されています。');return}
   const {error}=await supabase.from(table).insert({name,sort_order:rows.length+1,created_by:profile?.id||null});
   setMsg(error?error.message:'追加しました。');
   if(!error){isSchedule?setScheduleName(''):setCompetitionName('');await load()}
 }

 async function saveEdit(){
   if(!edit)return;
   const name=edit.name.trim();if(!name)return;
   const isSchedule=edit.kind==='schedule';
   const table=isSchedule?'schedule_entry_categories':'schedule_competitions';
   const scheduleColumn=isSchedule?'entry_label':'competition_name';
   const oldName=edit.row.name;
   const {error}=await supabase.from(table).update({name,updated_at:new Date().toISOString()}).eq('id',edit.row.id);
   if(error){setMsg(error.message);return}
   if(name!==oldName){
     const history=await supabase.from('player_schedule').update({[scheduleColumn]:name}).eq(scheduleColumn,oldName);
     if(history.error){
       await supabase.from(table).update({name:oldName,updated_at:new Date().toISOString()}).eq('id',edit.row.id);
       setMsg(history.error.message);return;
     }
   }
   setMsg('名称を変更しました。');setEdit(null);await load();
 }

 async function toggleHidden(){
   if(!edit)return;
   const table=edit.kind==='schedule'?'schedule_entry_categories':'schedule_competitions';
   const next=!edit.row.is_active;
   const {error}=await supabase.from(table).update({is_active:next,updated_at:new Date().toISOString()}).eq('id',edit.row.id);
   setMsg(error?error.message:(next?'再表示しました。':'非表示にしました。'));
   if(!error){setEdit(null);await load()}
 }

 async function deleteItem(){
   if(!edit)return;
   if(!window.confirm('「'+edit.row.name+'」を一覧から削除しますか？\n過去のスケジュールに保存済みの名称は履歴として残ります。'))return;
   const table=edit.kind==='schedule'?'schedule_entry_categories':'schedule_competitions';
   const {error}=await supabase.from(table).delete().eq('id',edit.row.id);
   setMsg(error?error.message:'削除しました。');
   if(!error){setEdit(null);await load()}
 }

 function list(kind:'schedule'|'competition',rows:any[],value:string,setValue:(v:string)=>void){
   const title=kind==='schedule'?'Team Category一覧':'Competition一覧';
   const placeholder=kind==='schedule'?'新しいTeam Category':'新しいCompetition';
   return <details className="panel categorySetGroup">
     <summary className="categorySetSummary"><div><b>{title}</b><span>{rows.length}件</span></div><div className="categoryNamePreview">{rows.length?rows.map((r:any)=>r.name).join(' / '):'未登録'}</div></summary>
     <div className="categorySetBody">
       <div className="categoryAddRow"><input value={value} placeholder={placeholder} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add(kind)}}}/><button onClick={()=>add(kind)}>＋ 追加</button></div>
       <div className="categoryManageList">{rows.map((row:any)=><div className="categoryManageRow" key={row.id}><div><b className={!row.is_active?'archivedCategory':''}>{row.name}</b>{!row.is_active&&<small>非表示</small>}</div><button className="secondary" onClick={()=>setEdit({kind,row,name:row.name})}>編集</button></div>)}</div>
     </div>
   </details>
 }

 return <section><Title t="SET / Categorys" s="Team CategoryとCompetitionをまとめて管理"/>
   {msg&&<div className="notice">{msg}</div>}
   {list('schedule',scheduleRows,scheduleName,setScheduleName)}
   {list('competition',competitionRows,competitionName,setCompetitionName)}
   {edit&&<div className="confirmOverlay" onClick={()=>setEdit(null)}><div className="confirmCard categoryEditCard" onClick={e=>e.stopPropagation()}>
     <h3>{edit.kind==='schedule'?'Team Category':'Competition'} 編集</h3>
     <label>名称<input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></label>
     <div className="actions"><button onClick={saveEdit}>変更を保存</button><button className="secondary" onClick={toggleHidden}>{edit.row.is_active?'非表示':'再表示'}</button><button className="dangerBtn" onClick={deleteItem}>削除</button><button className="secondary" onClick={()=>setEdit(null)}>キャンセル</button></div>
   </div></div>}
 </section>;
}


function Team({isAdmin,profile}:{isAdmin:boolean;profile:Profile|null}){
 const [players,setPlayers]=useState<any[]>([]);
 const [messages,setMessages]=useState<any[]>([]);
 const [schedule,setSchedule]=useState<any[]>([]);
 const [staff,setStaff]=useState<any[]>([]);
 const [categories,setCategories]=useState<any[]>([]);
 const [competitions,setCompetitions]=useState<any[]>([]);
 const [msg,setMsg]=useState('');
 const [saving,setSaving]=useState<string>('');

 const weekDates=useMemo(()=>{
   const now=new Date();
   const day=(now.getDay()+6)%7;
   const monday=new Date(now);monday.setHours(0,0,0,0);monday.setDate(now.getDate()-day);
   return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d});
 },[]);
 const iso=(d:Date)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day};
 const weekStart=iso(weekDates[0]),weekEnd=iso(weekDates[6]);
 const blank=(date:string,idx:number)=>({temp_id:'new-'+date+'-'+Date.now()+'-'+idx,schedule_date:date,entry_label:'カテゴリー '+(idx+1),event_type:'TR',opponent:'',competition_name:'',starts_at:null,start_time:'',location:'',staff_names:[],notes:''});

 useEffect(()=>{load()},[]);
 async function load(){
   const [{data:p},{data:m},{data:s},{data:st},{data:cats},{data:comps},{data:pendingAccounts}]=await Promise.all([
     supabase.from('player_directory').select('*').eq('is_hidden',false).order('school_grade',{ascending:false}).order('full_name'),
     profile?.id?supabase.from('chat_messages').select('id,sender_id,recipient_id,body,created_at,read_at').eq('recipient_id',profile.id).order('created_at',{ascending:false}).limit(5):Promise.resolve({data:[]} as any),
     supabase.from('player_schedule').select('id,schedule_date,entry_label,event_type,opponent,competition_name,starts_at,location,staff_names,notes,title,category,details').is('player_id',null).gte('schedule_date',weekStart).lte('schedule_date',weekEnd).order('schedule_date').order('id'),
     supabase.from('profiles').select('id,full_name,role').eq('role','staff').order('full_name'),
     supabase.from('schedule_entry_categories').select('*').order('sort_order').order('name'),
     supabase.from('schedule_competitions').select('*').order('sort_order').order('name')
   ]);
   const existing:any[]=s||[];
   const seeded:any[]=[...existing];
   weekDates.forEach((d:Date)=>{
     const date=iso(d);
     const dayRows=seeded.filter((x:any)=>x.schedule_date===date);
     for(let i=dayRows.length;i<3;i++)seeded.push(blank(date,i));
   });
   setPlayers(p||[]);setMessages([...(pendingAccounts||[]).map((a:any)=>({id:'approval-'+a.user_id,sender_id:null,body:'アカウント承認リクエスト：'+a.full_name+'（'+(a.role==='player'?'選手':'スタッフ')+'）',created_at:a.created_at||new Date().toISOString(),read_at:null,isApproval:true})),...(m||[])]);setSchedule(seeded);setStaff(st||[]);setCategories(cats||[]);setCompetitions(comps||[]);
 }
 const peopleMap=new Map(staff.map((x:any)=>[x.id,x.full_name]));
 const nonParticipants=players.filter(p=>p.today_availability==='out');
 const participants=Math.max(0,players.length-nonParticipants.length);
 const reasonLabel=(p:any)=>p.display_status==='rehab'?'リハビリ':p.absence_reason==='absent'?'欠席':p.absence_reason==='illness'?'体調不良':p.absence_reason==='other'?'その他':'理由未設定';
 const reasonCounts=nonParticipants.reduce((acc:any,p:any)=>{const k=reasonLabel(p);acc[k]=(acc[k]||0)+1;return acc},{});
 const timeOf=(v:any)=>v?new Date(v).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',hour12:false}):'';
 const toTs=(date:string,time:string)=>time?date+'T'+time+':00+09:00':date+'T09:00:00+09:00';
 const entriesFor=(date:string)=>schedule.filter(x=>x.schedule_date===date);
 function patchEntry(date:string,keyId:any,key:string,value:any){setSchedule(prev=>prev.map(x=>(x.id||x.temp_id)===keyId?{...x,[key]:value}:x))}
 function addEntry(date:string){setSchedule(prev=>[...prev,blank(date,entriesFor(date).length)])}
 async function quickAddCategory(date:string,key:any){
   if(!isAdmin)return;
   const raw=window.prompt('追加するカテゴリー名を入力してください。');
   const name=(raw||'').trim();if(!name)return;
   const existing=categories.find((x:any)=>x.name===name);
   if(existing){
     if(!existing.is_active){
       const {error}=await supabase.from('schedule_entry_categories').update({is_active:true,updated_at:new Date().toISOString()}).eq('id',existing.id);
       if(error){setMsg(error.message);return}
     }
     patchEntry(date,key,'entry_label',name);await load();return;
   }
   const {data,error}=await supabase.from('schedule_entry_categories').insert({name,sort_order:categories.length+1,created_by:profile?.id||null}).select().single();
   if(error){setMsg(error.message);return}
   setCategories(prev=>[...prev,data]);patchEntry(date,key,'entry_label',name);
 }
 async function quickAddCompetition(date:string,key:any){
   if(!isAdmin)return;
   const raw=window.prompt('追加する大会名を入力してください。');
   const name=(raw||'').trim();if(!name)return;
   const existing=competitions.find((x:any)=>x.name===name);
   if(existing){
     if(!existing.is_active){
       const {error}=await supabase.from('schedule_competitions').update({is_active:true,updated_at:new Date().toISOString()}).eq('id',existing.id);
       if(error){setMsg(error.message);return}
     }
     patchEntry(date,key,'competition_name',name);await load();return;
   }
   const {data,error}=await supabase.from('schedule_competitions').insert({name,sort_order:competitions.length+1,created_by:profile?.id||null}).select().single();
   if(error){setMsg(error.message);return}
   setCompetitions(prev=>[...prev,data]);patchEntry(date,key,'competition_name',name);
 }
 async function removeEntry(date:string,r:any){
   if(r.id){const {error}=await supabase.from('player_schedule').delete().eq('id',r.id);setMsg(error?error.message:'予定を削除しました。');if(!error)load()}
   else setSchedule(prev=>prev.filter(x=>(x.id||x.temp_id)!==(r.id||r.temp_id)));
 }
 function addStaff(date:string,r:any,name:string){if(!name)return;patchEntry(date,r.id||r.temp_id,'staff_names',Array.from(new Set([...(r.staff_names||[]),name])))}
 function removeStaff(date:string,r:any,name:string){patchEntry(date,r.id||r.temp_id,'staff_names',(r.staff_names||[]).filter((x:string)=>x!==name))}
 async function saveEntry(date:string,r:any){
   if(!isAdmin)return;
   const key=String(r.id||r.temp_id);setSaving(key);setMsg('');
   const start=r.start_time??timeOf(r.starts_at);
   const payload:any={player_id:null,schedule_date:date,entry_label:r.entry_label||null,event_type:r.event_type||'TR',
     title:(r.event_type==='Game'||r.event_type==='TRM')?(r.opponent?(r.event_type+' vs '+r.opponent):r.event_type):(r.event_type||'TR'),
     category:r.event_type||'TR',opponent:(r.event_type==='Game'||r.event_type==='TRM')?(r.opponent||null):null,competition_name:r.event_type==='Game'?(r.competition_name||null):null,
     starts_at:toTs(date,start),ends_at:null,location:r.location||null,staff_names:r.staff_names||[],staff_name:(r.staff_names||[]).join(' / ')||null,
     notes:r.notes||null,details:r.notes||null,created_by:profile?.id||null};
   const res=r.id?await supabase.from('player_schedule').update(payload).eq('id',r.id):await supabase.from('player_schedule').insert(payload);
   setMsg(res.error?res.error.message:'スケジュールを保存しました。');setSaving('');if(!res.error)load();
 }

 return <section className="homePage"><Title t="HOME" s="メッセージ・本日のTR参加状況・今週の予定をまとめて確認"/>
 <div className="homeGrid">
   <div className="panel homeMessages"><h3>新着メッセージ</h3>{messages.length?messages.map(m=><div className={'homeMessage '+(!m.read_at?'unreadMessage':'')} key={m.id}><b>{m.isApproval?'アカウント承認':(peopleMap.get(m.sender_id)||'選手・スタッフ')}</b><span>{new Date(m.created_at).toLocaleString('ja-JP')}</span><p>{m.body}</p></div>):<div className="empty">新着メッセージはありません。</div>}</div>
   <div className="panel attendanceCard"><h3>TR参加人数</h3><div className="attendanceCount"><b>{participants}</b><span> / {players.length}名</span></div>
   <details className="absenceDetails"><summary>TR不参加者 {nonParticipants.length}名</summary>
   {nonParticipants.length?<><div className="absenceBreakdown">{Object.entries(reasonCounts).map(([k,v])=><span key={k}>{k} <b>{String(v)}名</b></span>)}</div>{nonParticipants.map(p=><div className="absenceRow" key={p.player_id}><div className="personCell"><Avatar path={p.avatar_path} name={p.full_name} size={34}/><b>{p.full_name}</b></div><div>{p.school_grade||'-'}年 / {p.position||'-'}</div><div><span className="pill warn">{reasonLabel(p)}</span>{p.injury_name&&<small>{p.injury_name}</small>}</div><div>{p.pain_score!=null?'Pain '+p.pain_score+'/10':'Pain -'}</div></div>)}</>:<div className="empty">TR不参加者はいません。</div>}</details></div>
 </div>

 <div className="panel weeklySchedule"><div className="scheduleHeader"><div><h3>今週のスケジュール</h3><p>{weekStart} 〜 {weekEnd}</p></div>{msg&&<span className="notice inlineNotice">{msg}</span>}</div>
 <div className="scheduleDays">{weekDates.map(d=>{const date=iso(d);const dayRows=entriesFor(date);const savedCount=dayRows.filter((x:any)=>x.id).length;return <details className="scheduleDay" key={date}><summary className="scheduleDayHead"><b>{d.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'})}</b><span className="scheduleDaySummary">{savedCount?savedCount+'件':'予定なし'}</span></summary><div className="scheduleDayBody">{isAdmin&&<div className="scheduleDayAdd"><button className="secondary" onClick={()=>addEntry(date)}>＋ 追加</button></div>}{entriesFor(date).map((r:any,idx:number)=>{const key=r.id||r.temp_id;const start=r.start_time??timeOf(r.starts_at);const opponentEnabled=r.event_type==='Game'||r.event_type==='TRM';return <div className="scheduleEntry" key={key}><select className="entryLabelInput" disabled={!isAdmin} value={r.entry_label||('カテゴリー '+(idx+1))} onChange={e=>{if(e.target.value==='__add__'){e.currentTarget.value=r.entry_label||('カテゴリー '+(idx+1));quickAddCategory(date,key)}else patchEntry(date,key,'entry_label',e.target.value)}}>{categories.filter((cat:any)=>cat.is_active||cat.name===r.entry_label).map((cat:any)=><option key={cat.id} value={cat.name}>{cat.name}</option>)}<option value="__add__">＋ カテゴリー追加</option></select><select disabled={!isAdmin} value={r.event_type||'TR'} onChange={e=>patchEntry(date,key,'event_type',e.target.value)}><option value="TR">TR</option><option value="Game">Game</option><option value="TRM">TRM</option><option value="OFF">OFF</option><option value="Other">Other</option></select>{opponentEnabled?<div className="scheduleOpponentBlock"><input disabled={!isAdmin} value={r.opponent||''} placeholder="対戦相手" onChange={e=>patchEntry(date,key,'opponent',e.target.value)}/>{r.event_type==='Game'&&<select disabled={!isAdmin} value={r.competition_name||''} onChange={e=>{if(e.target.value==='__add__'){e.currentTarget.value=r.competition_name||'';quickAddCompetition(date,key)}else patchEntry(date,key,'competition_name',e.target.value)}}><option value="">大会名</option>{competitions.filter((x:any)=>x.is_active||x.name===r.competition_name).map((x:any)=><option key={x.id} value={x.name}>{x.name}</option>)}<option value="__add__">＋ 大会名追加</option></select>}</div>:<div className="opponentSpacer"></div>}<input disabled={!isAdmin} type="time" value={start} onChange={e=>patchEntry(date,key,'start_time',e.target.value)}/><input disabled={!isAdmin} value={r.location||''} placeholder="場所" onChange={e=>patchEntry(date,key,'location',e.target.value)}/><div className="staffMulti"><div className="staffChips">{(r.staff_names||[]).map((n:string)=><span className="staffChip" key={n}>{n}{isAdmin&&<button type="button" onClick={()=>removeStaff(date,r,n)}>×</button>}</span>)}</div>{isAdmin&&<div className="staffAdd"><select defaultValue="" onChange={e=>{addStaff(date,r,e.target.value);e.currentTarget.value=''}}><option value="">担当者</option>{staff.map(s=><option key={s.id} value={s.full_name}>{s.full_name}</option>)}</select><button type="button" className="secondary" onClick={e=>{const sel=(e.currentTarget.previousElementSibling as HTMLSelectElement);addStaff(date,r,sel.value);sel.value=''}}>追加</button></div>}</div><textarea disabled={!isAdmin} rows={2} value={r.notes||''} placeholder="自由記述" onChange={e=>patchEntry(date,key,'notes',e.target.value)}/>{isAdmin&&<div className="scheduleActions"><button onClick={()=>saveEntry(date,r)} disabled={saving===String(key)}>{saving===String(key)?'保存中':'保存'}</button><button className="dangerBtn" onClick={()=>removeEntry(date,r)}>削除</button></div>}</div>})}</div></details>})}</div>
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
   if(!err){const {error}=await supabase.from('daily_player_status').update({absence_reason:edit.today_availability==='out'?(edit.display_status==='rehab'?'rehab':edit.absence_reason||null):null}).eq('player_id',edit.player_id).eq('status_date',new Date().toISOString().slice(0,10));err=error}
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

 return <section><Title t="TEAM / Players" s=""/>
 <div className="filters"><input placeholder="氏名" value={filters.name} onChange={e=>setFilters({...filters,name:e.target.value})}/><select value={filters.grade} onChange={e=>setFilters({...filters,grade:e.target.value})}><option value="">全学年</option><option value="1">1年</option><option value="2">2年</option><option value="3">3年</option></select><select value={filters.position} onChange={e=>setFilters({...filters,position:e.target.value})}><option value="">全ポジション</option>{positions.map(p=><option key={p}>{p}</option>)}</select><input placeholder="傷害名で検索" value={filters.injury} onChange={e=>setFilters({...filters,injury:e.target.value})}/><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">全対応</option><option value="needs_attention">要対応</option><option value="rehab">リハビリ中</option><option value="observation">経過観察</option><option value="available">問題なし</option></select></div>
 {isAdmin&&<div className="bulkBar"><label><input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)}/> 非表示の選手を表示</label><span>{selected.length}名選択中</span><button disabled={!selected.length} onClick={()=>beginAction('hide',selected)}>まとめて非表示</button><button className="secondary" disabled={!selected.length} onClick={()=>beginAction('show',selected)}>まとめて再表示</button><button className="dangerBtn" disabled={!selected.length} onClick={()=>beginAction('delete',selected)}>まとめて削除</button></div>}
 {msg&&<div className="notice">{msg}</div>}
 {loading?<p>読み込み中...</p>:<div className="tableWrap"><table><thead><tr>{isAdmin&&<th><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}/></th>}<th>氏名</th><th>学年/Pos</th><th>傷害</th><th>対応</th><th>本日</th>{isAdmin&&<th>管理</th>}</tr></thead><tbody>{filtered.map(r=><tr key={r.player_id} className={r.is_hidden?'hiddenRow':''}>{isAdmin&&<td><input type="checkbox" checked={selected.includes(r.player_id)} onChange={()=>toggleOne(r.player_id)}/></td>}<td><div className="personCell"><Avatar path={r.avatar_path} name={r.full_name} size={38}/><div><b>{r.full_name}</b>{r.is_hidden&&<small>非表示</small>}</div></div></td><td>{r.school_grade||'-'}年 / {r.position||'-'}</td><td>{r.injury_name||'なし'}{r.body_part&&<small>{r.body_part}</small>}</td><td><span className={'pill '+statusClass[r.display_status]}>{statusLabel[r.display_status]}</span>{r.display_status==='rehab'&&r.rehab_day&&<small>Rehab Day {r.rehab_day}</small>}</td><td>{availabilityLabel[r.today_availability]||'-'}{r.pain_score!=null&&<small>Pain {r.pain_score}/10</small>}</td>{isAdmin&&<td><div className="rowActions"><button onClick={()=>setEdit({...r})}>編集</button>{r.is_hidden?<button className="secondary" onClick={()=>beginAction('show',[r.player_id])}>再表示</button>:<button className="secondary" onClick={()=>beginAction('hide',[r.player_id])}>非表示</button>}<button className="dangerBtn" onClick={()=>beginAction('delete',[r.player_id])}>削除</button></div></td>}</tr>)}</tbody></table>{!filtered.length&&<div className="empty">該当する選手はいません。</div>}</div>}
 {isAdmin&&edit&&<div className="panel form"><h3>{edit.full_name}｜対応・参加状況を編集</h3><div className="grid2">{edit.case_id&&<select value={edit.display_status} onChange={e=>setEdit({...edit,display_status:e.target.value})}><option value="needs_attention">要対応</option><option value="rehab">リハビリ中</option><option value="observation">経過観察</option><option value="available">問題なし</option></select>}<select value={edit.today_availability} onChange={e=>setEdit({...edit,today_availability:e.target.value})}><option value="out">参加不可</option><option value="modified">別メニュー</option><option value="partial">部分参加</option><option value="full">通常参加</option></select><input type="number" min="0" max="10" placeholder="Pain 0-10" value={edit.pain_score??''} onChange={e=>setEdit({...edit,pain_score:e.target.value===''?null:Number(e.target.value)})}/>{edit.today_availability==='out'&&edit.display_status!=='rehab'&&<select value={edit.absence_reason||''} onChange={e=>setEdit({...edit,absence_reason:e.target.value})}><option value="">不参加理由を選択</option><option value="absent">欠席</option><option value="illness">体調不良</option><option value="other">その他</option></select>}</div><div className="actions"><button onClick={saveStatus}>保存</button><button className="secondary" onClick={()=>setEdit(null)}>キャンセル</button></div></div>}
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
 <div className="tableWrap"><table><thead><tr><th>日付</th><th>症状</th><th>部位</th><th>状態</th><th>添付</th><th>編集履歴</th>{(isAdmin||profile?.role==='player')&&<th>操作</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className={changed(r,'injury_date')?'changed':''}>{r.injury_date}</td><td className={changed(r,'symptom')?'changed':''}>{r.symptom}</td><td className={changed(r,'body_part')?'changed':''}>{r.body_part}</td><td>{r.review_status==='pending'?'未確認':'確認済み'}</td><td><InjuryAttachments reportId={r.id}/></td><td>{r.player_last_edited_at?<span className="changed">選手が変更済み</span>:'-'}</td>{(isAdmin||profile?.role==='player')&&<td>{(isAdmin||ownCanEdit(r))&&<button onClick={()=>setEdit({...r})}>編集</button>} {isAdmin&&r.review_status==='pending'&&<button onClick={()=>convert(r.id)}>ケース化</button>}</td>}</tr>)}</tbody></table></div>
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
 const [rows,setRows]=useState<any[]>([]),[msg,setMsg]=useState('');
 useEffect(()=>{load()},[]);
 async function load(){
   const [{data,error},{data:ps}]=await Promise.all([
     supabase.rpc('admin_list_accounts',{filter_status:null}),
     supabase.from('profiles').select('id,avatar_path,player_registration_number,staff_title,team_id')
   ]);
   if(error)setMsg(error.message);
   else{
     const map=new Map((ps||[]).map((p:any)=>[p.id,p]));
     setRows((data||[]).map((r:any)=>({...r,...(map.get(r.user_id)||{})})));
   }
 }
 async function approval(id:string,status:Approval){
   const {error}=await supabase.rpc('admin_set_account_approval',{target_user_id:id,new_status:status,reason:status==='rejected'?'管理者により却下':''});
   setMsg(error?error.message:'承認状態を更新しました');
   if(!error)load();
 }
 return <section><Title t="アカウント承認" s="登録申請の確認と承認のみ行います"/>
   {msg&&<div className="notice">{msg}</div>}
   <div className="notice">個人情報・メールアドレス・パスワードなどの変更は SET → Account から行います。</div>
   <div className="tableWrap"><table><thead><tr><th>氏名</th><th>メール</th><th>区分</th><th>学年/Pos</th><th>状態</th><th>承認操作</th></tr></thead><tbody>{rows.map(r=><tr key={r.user_id}><td><div className="personCell"><Avatar path={r.avatar_path} name={r.full_name} size={36}/><span>{r.full_name}</span></div></td><td>{r.email}</td><td>{r.role==='player'?'選手':'スタッフ'}</td><td>{r.school_grade?`${r.school_grade}年 / ${r.player_position||'-'}`:'-'}</td><td><span className={'pill '+(r.status==='approved'?'ok':r.status==='pending'?'warn':'danger')}>{r.status==='approved'?'承認済み':r.status==='pending'?'承認待ち':'却下'}</span></td><td>{r.status!=='approved'&&<button onClick={()=>approval(r.user_id,'approved')}>承認</button>} {r.status!=='rejected'&&<button className="secondary" onClick={()=>approval(r.user_id,'rejected')}>却下</button>}</td></tr>)}</tbody></table></div>
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

function Title({t}:{t:string;s?:string}){return <div className="title"><h1>{t}</h1></div>}
function Stat({n,l,c,p}:{n:number;l:string;c:string;p?:number}){return <div className={'stat '+c}><div className="statValue"><b>{n}</b>{p!==undefined&&<small>{p}%</small>}</div><span>{l}</span></div>}
function Center({children}:{children:React.ReactNode}){return <div className="center">{children}</div>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
