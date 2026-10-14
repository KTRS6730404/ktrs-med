import {readFile,writeFile} from 'node:fs/promises';

const file=new URL('../src/main.tsx',import.meta.url);
let source=await readFile(file,'utf8');
if(source.includes('KTRS_IDP_TR_V1'))process.exit(0);

source=source.replace(
  "type Screen='home'|",
  "type Screen='home'|'idp_tr'|"
).replace(
  "type PlayerScreen='mypage'|",
  "type PlayerScreen='mypage'|'idp_tr'|"
);

source=source.replace(
  "   {screen==='performance_benchmark'&&<ModulePlaceholder title=\"PERFORMANCE / Benchmark\" text=\"学年・ポジション別の基準値と個人値を比較する画面です。\"/>}",
  "   {screen==='performance_benchmark'&&<ModulePlaceholder title=\"PERFORMANCE / Benchmark\" text=\"学年・ポジション別の基準値と個人値を比較する画面です。\"/>}\n   {screen==='idp_tr'&&<StaffIdpTr/>}"
);

source=source.replace(
  "   {key:'PERFORMANCE',label:'PERFORMANCE',items:[['performance_physical','Physical'],['performance_body','Body Composition'],['performance_benchmark','Benchmark']]},",
  "   {key:'PERFORMANCE',label:'PERFORMANCE',items:[['performance_physical','Physical'],['performance_body','Body Composition'],['performance_benchmark','Benchmark']]},\n   {key:'IDP',label:'IDP TR',items:[['idp_tr','個人課題・TR']]},"
);

source=source.replace(
  " const [open,setOpen]=useState<Record<string,boolean>>({MEDICAL:false,PERFORMANCE:false,COMMUNICATION:false,SETTINGS:false});",
  " const [open,setOpen]=useState<Record<string,boolean>>({IDP:false,MEDICAL:false,PERFORMANCE:false,COMMUNICATION:false,SETTINGS:false});"
);

source=source.replace(
  " const groups:{key:string;label:string;items:[PlayerScreen,string][]}[]=[\n   {key:'MEDICAL'",
  " const groups:{key:string;label:string;items:[PlayerScreen,string][]}[]=[\n   {key:'IDP',label:'IDP TR',items:[['idp_tr','個人課題・TR']]},\n   {key:'MEDICAL'"
);

source=source.replace(
  "       {screen==='mypage'&&<PlayerMyPage profile={profile}/>}",
  "       {screen==='mypage'&&<PlayerMyPage profile={profile}/>}\n       {screen==='idp_tr'&&<PlayerIdpTr profile={profile}/>}"
);

const marker='function ModulePlaceholder(';
const at=source.indexOf(marker);
if(at<0)throw new Error('ModulePlaceholder insertion point not found');

const component=`/* KTRS_IDP_TR_V1 */
type IdpForm={id?:number;challenge:string;action_plan:string;training_date:string;timing:string;training_content:string;status:'planned'|'completed';reflection:string};
const emptyIdpForm=():IdpForm=>({challenge:'',action_plan:'',training_date:'',timing:'TR後',training_content:'',status:'planned',reflection:''});

function PlayerIdpTr({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]),[form,setForm]=useState<IdpForm>(emptyIdpForm()),[msg,setMsg]=useState(''),[saving,setSaving]=useState(false);
 async function load(){
   const {data,error}=await supabase.from('idp_training_plans').select('*').eq('player_id',profile.id).order('training_date',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false});
   if(error){setMsg(error.message);return}setRows(data||[]);
 }
 useEffect(()=>{void load()},[profile.id]);
 async function save(e:React.FormEvent){
   e.preventDefault();setSaving(true);setMsg('');
   const payload={player_id:profile.id,challenge:form.challenge.trim(),action_plan:form.action_plan.trim()||null,training_date:form.training_date||null,timing:form.timing||null,training_content:form.training_content.trim(),status:form.status,reflection:form.reflection.trim()||null,updated_at:new Date().toISOString()};
   const q=form.id?supabase.from('idp_training_plans').update(payload).eq('id',form.id).eq('player_id',profile.id):supabase.from('idp_training_plans').insert(payload);
   const {error}=await q;if(error){setMsg(error.message);setSaving(false);return}
   setForm(emptyIdpForm());await load();setMsg(form.id?'IDPを更新しました。':'IDPを保存しました。');setSaving(false);
 }
 function edit(r:any){setForm({id:Number(r.id),challenge:r.challenge||'',action_plan:r.action_plan||'',training_date:r.training_date||'',timing:r.timing||'TR後',training_content:r.training_content||'',status:r.status==='completed'?'completed':'planned',reflection:r.reflection||''});window.scrollTo({top:0,behavior:'smooth'})}
 async function remove(r:any){if(!window.confirm('このIDPを削除しますか？'))return;const {error}=await supabase.from('idp_training_plans').delete().eq('id',r.id).eq('player_id',profile.id);if(error){setMsg(error.message);return}if(form.id===r.id)setForm(emptyIdpForm());await load();setMsg('IDPを削除しました。')}
 return <section><Title t="IDP TR" s="個人の課題と、自分で取り組むトレーニングを計画・記録します"/>
  <form className="panel form" onSubmit={save}>
   <div className="grid2">
    <label><span>個人の課題</span><textarea required placeholder="例：切り返し時の1歩目を速くする" value={form.challenge} onChange={e=>setForm({...form,challenge:e.target.value})}/></label>
    <label><span>取り組み</span><textarea placeholder="課題に対して何を継続するか" value={form.action_plan} onChange={e=>setForm({...form,action_plan:e.target.value})}/></label>
    <label><span>実施日</span><input type="date" value={form.training_date} onChange={e=>setForm({...form,training_date:e.target.value})}/></label>
    <label><span>実施タイミング</span><select value={form.timing} onChange={e=>setForm({...form,timing:e.target.value})}><option>TR前</option><option>TR後</option><option>OFF日</option><option>自主練習</option><option>その他</option></select></label>
    <label><span>実施するTR</span><textarea required placeholder="例：5m加速×5本、左右各3セット。セット間60秒" value={form.training_content} onChange={e=>setForm({...form,training_content:e.target.value})}/></label>
    <label><span>状況</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'planned'|'completed'})}><option value="planned">予定</option><option value="completed">実施済み</option></select></label>
   </div>
   <label><span>振り返り</span><textarea placeholder="実施後の感覚、できたこと、次回修正すること" value={form.reflection} onChange={e=>setForm({...form,reflection:e.target.value})}/></label>
   <div className="actions"><button disabled={saving}>{saving?'保存中...':form.id?'変更を保存':'IDPを保存'}</button>{form.id&&<button type="button" className="secondary" onClick={()=>setForm(emptyIdpForm())}>編集をキャンセル</button>}</div>
  </form>{msg&&<div className="notice">{msg}</div>}
  <div className="caseGrid">{rows.length?rows.map(r=><article className="panel" key={r.id}><div className="actions" style={{justifyContent:'space-between'}}><span className={'pill '+(r.status==='completed'?'ok':'info')}>{r.status==='completed'?'実施済み':'予定'}</span><small>{r.training_date||'日付未設定'} / {r.timing||'-'}</small></div><h3>{r.challenge}</h3>{r.action_plan&&<p><b>取り組み：</b>{r.action_plan}</p>}<p><b>TR：</b>{r.training_content}</p>{r.reflection&&<p><b>振り返り：</b>{r.reflection}</p>}<div className="actions"><button type="button" className="secondary" onClick={()=>edit(r)}>編集</button><button type="button" className="dangerBtn" onClick={()=>void remove(r)}>削除</button></div></article>):<div className="panel empty">まだIDPは登録されていません。</div>}</div>
 </section>;
}

function StaffIdpTr(){
 const [rows,setRows]=useState<any[]>([]),[players,setPlayers]=useState<any[]>([]),[selected,setSelected]=useState(''),[msg,setMsg]=useState('');
 useEffect(()=>{(async()=>{const [{data:p,error:pe},{data:r,error:re}]=await Promise.all([supabase.from('profiles').select('id,full_name,school_grade,position').eq('role','player').order('school_grade').order('full_name'),supabase.from('idp_training_plans').select('*').order('training_date',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false})]);if(pe||re){setMsg((pe||re)?.message||'読み込みエラー');return}setPlayers(p||[]);setRows(r||[])})()},[]);
 const map=new Map(players.map((p:any)=>[p.id,p]));const filtered=selected?rows.filter(r=>r.player_id===selected):rows;
 return <section><Title t="IDP TR" s="選手が設定した個人課題と自主トレーニング計画を確認します"/>{msg&&<div className="notice">{msg}</div>}<div className="panel"><label><span>選手で絞り込み</span><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">全選手</option>{players.map((p:any)=><option key={p.id} value={p.id}>{p.school_grade?(p.school_grade+'年 '):''}{p.full_name}{p.position?(' / '+p.position):''}</option>)}</select></label></div><div className="caseGrid">{filtered.length?filtered.map(r=>{const p:any=map.get(r.player_id);return <article className="panel" key={r.id}><div className="actions" style={{justifyContent:'space-between'}}><b>{p?.full_name||'選手'}</b><span className={'pill '+(r.status==='completed'?'ok':'info')}>{r.status==='completed'?'実施済み':'予定'}</span></div><small>{p?.school_grade?(p.school_grade+'年 / '):''}{p?.position||'-'}　{r.training_date||'日付未設定'} / {r.timing||'-'}</small><h3>{r.challenge}</h3>{r.action_plan&&<p><b>取り組み：</b>{r.action_plan}</p>}<p><b>TR：</b>{r.training_content}</p>{r.reflection&&<p><b>振り返り：</b>{r.reflection}</p>}</article>}):<div className="panel empty">該当するIDPはありません。</div>}</div></section>;
}

`;

source=source.slice(0,at)+component+source.slice(at);
await writeFile(file,source,'utf8');
console.log('Applied IDP TR player/staff feature');
