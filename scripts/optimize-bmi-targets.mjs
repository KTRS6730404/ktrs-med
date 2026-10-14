import {readFile,writeFile} from 'node:fs/promises';

const file=new URL('../src/main.tsx',import.meta.url);
const cssFile=new URL('../src/styles.css',import.meta.url);
let source=await readFile(file,'utf8');
let css=await readFile(cssFile,'utf8');

if(!source.includes('KTRS_BMI_TARGETS_V2')){
 // If an older generated version is present, normalize it first so this script is idempotent.
 source=source.replace('/* KTRS_BMI_TARGETS_V1 */','/* KTRS_BMI_TARGETS_V2 */');

 if(!source.includes('const [targetBmi,setTargetBmi]')){
  source=source.replace(
   " const [latestEval,setLatestEval]=useState<any|null>(null);",
   " const [latestEval,setLatestEval]=useState<any|null>(null);\n const [targetBmi,setTargetBmi]=useState<number|null>(null);"
  );
 }

 if(!source.includes("supabase.from('target_bmi_settings').select('target_bmi')")){
  source=source.replace(
   " })()},[profile.id]);\n\n const bmi=profile.height_cm&&profile.weight_kg?profile.weight_kg/Math.pow(profile.height_cm/100,2):null;",
   " })()},[profile.id]);\n\n useEffect(()=>{(async()=>{\n   if(!profile.school_grade||!profile.position){setTargetBmi(null);return}\n   const {data}=await supabase.from('target_bmi_settings').select('target_bmi').eq('school_grade',profile.school_grade).eq('position',profile.position).maybeSingle();\n   setTargetBmi(data?.target_bmi==null?null:Number(data.target_bmi));\n })()},[profile.school_grade,profile.position]);\n\n const bmi=profile.height_cm&&profile.weight_kg?profile.weight_kg/Math.pow(profile.height_cm/100,2):null;\n const bmiDiff=bmi!=null&&targetBmi!=null?bmi-targetBmi:null;"
  );
 }

 const oldBmi=`       <div><span>BMI</span><b>{bmi?bmi.toFixed(1):'-'}</b></div>`;
 const v1Bmi="       <div><span>BMI</span><b>{bmi?bmi.toFixed(1):'-'}</b>{targetBmi!=null&&<small style={{display:'block',marginTop:4}}>基準 {targetBmi.toFixed(1)} / 差 {bmiDiff==null?'-':`${bmiDiff>=0?'+':''}${bmiDiff.toFixed(1)}`}</small>}</div>";
 const v2Bmi=`       <div><span>BMI</span><b className="playerBmiValue">{bmi?bmi.toFixed(1):'-'}{bmiDiff!=null&&<small className={'playerBmiDiff '+(bmiDiff<0?'minus':bmiDiff>0?'plus':'zero')}>（{bmiDiff>0?'+':''}{bmiDiff.toFixed(1)}）</small>}</b></div>`;
 source=source.replace(oldBmi,v2Bmi).replace(v1Bmi,v2Bmi);

 source=source.replace(
  "   {screen==='management_settings'&&<ModulePlaceholder title=\"MANAGEMENT / Settings\" text=\"KTRS FMS全体の設定を管理する画面です。\"/>}",
  "   {screen==='management_settings'&&profile&&<BmiTargetSettings profile={profile}/>}"
 );

 if(!source.includes('function BmiTargetSettings(')){
  const insertBefore='function ModulePlaceholder(';
  const at=source.indexOf(insertBefore);
  if(at<0)throw new Error('ModulePlaceholder insertion point not found');
  const component=`/* KTRS_BMI_TARGETS_V2 */\nfunction BmiTargetSettings({profile}:{profile:Profile}){\n const grades=[1,2,3];const positions=['GK','DF','MF','FW'];\n const [values,setValues]=useState<Record<string,string>>({});\n const [existing,setExisting]=useState<Record<string,number>>({});\n const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');\n const key=(g:number,p:string)=>g+'-'+p;\n async function load(){\n   setLoading(true);setMsg('');\n   const {data,error}=await supabase.from('target_bmi_settings').select('id,school_grade,position,target_bmi').order('school_grade').order('position');\n   if(error){setMsg(error.message);setLoading(false);return}\n   const next:Record<string,string>={};const ids:Record<string,number>={};\n   for(const r of data||[]){const k=key(Number(r.school_grade),String(r.position));next[k]=String(r.target_bmi??'');ids[k]=Number(r.id)}\n   setValues(next);setExisting(ids);setLoading(false);\n }\n useEffect(()=>{void load()},[]);\n async function save(){\n   setSaving(true);setMsg('');\n   for(const g of grades)for(const p of positions){\n     const k=key(g,p);const raw=(values[k]||'').trim();const id=existing[k];\n     if(!raw){if(id){const {error}=await supabase.from('target_bmi_settings').delete().eq('id',id);if(error){setMsg(error.message);setSaving(false);return}}continue}\n     const n=Number(raw);if(!Number.isFinite(n)||n<=0){setMsg(g+'年 '+p+' のBMIを正しく入力してください。');setSaving(false);return}\n     if(id){const {error}=await supabase.from('target_bmi_settings').update({target_bmi:n,updated_at:new Date().toISOString()}).eq('id',id);if(error){setMsg(error.message);setSaving(false);return}}\n     else{const {error}=await supabase.from('target_bmi_settings').insert({school_grade:g,position:p,target_bmi:n,created_by:profile.id});if(error){setMsg(error.message);setSaving(false);return}}\n   }\n   await load();setMsg('BMI基準値を保存しました。');setSaving(false);\n }\n return <section><Title t="MANAGEMENT / Settings" s="選手HOMEのBMI比較に使用する基準値を設定します"/>\n  <div className="panel"><h3>BMI 基準値</h3><p className="fine">学年・ポジション別に設定します。空欄で保存すると、その基準値を解除します。</p>\n  {loading?<div className="empty">読み込み中...</div>:<div className="tableWrap"><table><thead><tr><th>学年</th>{positions.map(p=><th key={p}>{p}</th>)}</tr></thead><tbody>{grades.map(g=><tr key={g}><th>{g}年</th>{positions.map(p=>{const k=key(g,p);return <td key={p}><input type="number" min="1" max="50" step="0.1" placeholder="例 22.5" value={values[k]||''} onChange={e=>setValues(v=>({...v,[k]:e.target.value}))} style={{width:90}}/></td>})}</tr>)}</tbody></table></div>}\n  <div className="actions" style={{marginTop:14}}><button disabled={loading||saving} onClick={save}>{saving?'保存中...':'基準値を保存'}</button></div>{msg&&<div className="notice">{msg}</div>}</div>\n </section>;\n}\n\n`;
  source=source.slice(0,at)+component+source.slice(at);
 }
}

if(!css.includes('BMI difference inline display')){
 css += `\n/* BMI difference inline display */\n.playerBmiValue{display:inline-flex;align-items:baseline;gap:6px;white-space:nowrap}.playerBmiDiff{font-size:.58em;font-weight:800}.playerBmiDiff.minus{color:#dc2626}.playerBmiDiff.plus,.playerBmiDiff.zero{color:inherit}\n`;
}

await Promise.all([writeFile(file,source,'utf8'),writeFile(cssFile,css,'utf8')]);
console.log('Applied BMI target settings and compact player difference display');
