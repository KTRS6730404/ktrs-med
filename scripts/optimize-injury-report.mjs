import {readFile,writeFile} from 'node:fs/promises';

const file=new URL('../src/main.tsx',import.meta.url);
let source=await readFile(file,'utf8');
if(source.includes('KTRS_INJURY_REPORT_V2'))process.exit(0);

source=source.replace("function emptyReport(){return {injury_date:'',symptom:'',body_part:'',side:'right',activity:'',mechanism:'',hospital_status:'未受診',facility_name:'',visit_date:'',diagnosis:'',instructed_plan:'',notes:''}}","/* KTRS_INJURY_REPORT_V2 */\nfunction emptyReport(){return {injury_date:'',symptom:'',body_part:'',side:'右',activity:'',mechanism:'',hospital_status:'未受診',facility_name:'',visit_date:'',diagnosis:'',instructed_plan:'',notes:''}}")
  .replaceAll("review_status:'pending'","review_status:'未確認'")
  .replaceAll("r.review_status==='pending'","r.review_status==='未確認'");

const playerStart=source.indexOf('function PlayerInjuryReport(');
const playerEnd=source.indexOf('\nfunction PlayerInjuryHistory',playerStart);
if(playerStart<0||playerEnd<0)throw new Error('PlayerInjuryReport block not found');
const playerBlock=`function PlayerInjuryReport({profile,onDone}:{profile:Profile;onDone:()=>void}){
 const [form,setForm]=useState<any>(emptyReport()),[msg,setMsg]=useState(''),[files,setFiles]=useState<File[]>([]),[uploading,setUploading]=useState(false),[sent,setSent]=useState<{id:number;warning:string}|null>(null);
 async function submit(e:React.FormEvent){
   e.preventDefault();setUploading(true);setMsg('');
   if(!form.symptom||form.symptom==='__その他__'){setMsg('傷害名または症状を入力してください。');setUploading(false);return}
   const payload={...form,player_id:profile.id,visit_date:form.visit_date||null,review_status:'未確認'};
   const {data,error}=await supabase.from('injury_reports').insert(payload).select('id').single();
   if(error){setMsg('送信できませんでした：'+error.message);setUploading(false);return}
   let uploadError:any=null;
   for(const file of files){
     if(file.size>10*1024*1024){uploadError=new Error('添付ファイルは1件10MB以下にしてください。');break}
     const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
     const path=\`${profile.id}/reports/\${data.id}/\${Date.now()}-\${safe}\`;
     const up=await supabase.storage.from('medical-attachments').upload(path,file,{contentType:file.type||'application/octet-stream'});
     if(up.error){uploadError=up.error;break}
     const meta=await supabase.from('injury_report_attachments').insert({report_id:data.id,player_id:profile.id,storage_path:path,file_name:file.name,mime_type:file.type||'application/octet-stream',file_size:file.size,uploaded_by:profile.id});
     if(meta.error){uploadError=meta.error;break}
   }
   setUploading(false);
   setSent({id:Number(data.id),warning:uploadError?'報告は送信されましたが、添付ファイルの一部を保存できませんでした。':''});
 }
 if(sent)return <section><Title t="送信完了" s="ケガの報告をスタッフへ送信しました"/><div className="panel injuryReportComplete"><div className="injuryReportCompleteIcon">✓</div><h2>報告を送信しました</h2><p>スタッフ画面の「選手報告」に反映されます。</p>{sent.warning&&<div className="notice">{sent.warning}</div>}<div className="actions"><button onClick={onDone}>ケガの履歴を見る</button><button className="secondary" onClick={()=>{setForm(emptyReport());setFiles([]);setMsg('');setSent(null)}}>続けて報告する</button></div></div></section>;
 return <section><Title t="ケガの報告" s="新しいケガ・症状を報告します"/><form className="panel form" onSubmit={submit}><ReportFields value={form} setValue={setForm}/>
 <div className="medicalAttachmentBox"><b>病院関連資料・画像</b><input type="file" multiple accept="image/*,.pdf" onChange={e=>setFiles(Array.from(e.target.files||[]))}/><small>診断書・画像・病院資料など。画像またはPDF、1ファイル10MB以下。</small>{files.length>0&&<div className="attachmentNames">{files.map((f,i)=><span key={i}>{f.name}</span>)}</div>}</div>
 <button disabled={uploading}>{uploading?'送信中...':'報告する'}</button></form>{msg&&<div className="notice">{msg}</div>}</section>;
}`;
source=source.slice(0,playerStart)+playerBlock+source.slice(playerEnd);

const fieldsStart=source.indexOf('function ReportFields(');
const fieldsEnd=source.indexOf('\nfunction Cases',fieldsStart);
if(fieldsStart<0||fieldsEnd<0)throw new Error('ReportFields block not found');
const fieldsBlock=`function ReportFields({value,setValue,changedFields=[]}:{value:any;setValue:(v:any)=>void;changedFields?:string[]}){
 const cls=(k:string)=>changedFields?.includes(k)?'changedField':'';
 const symptoms=['捻挫','打撲','骨折','脱臼','肉離れ','筋損傷','腱損傷','靱帯損傷','炎症','腱炎','滑液包炎','疲労骨折','裂傷・擦過傷','脳震盪'];
 const symptomChoice=symptoms.includes(value.symptom)?value.symptom:(value.symptom?'その他':'');
 const otherSymptom=symptomChoice==='その他';
 return <div className="grid2 injuryReportFields">
  <label className={cls('injury_date')}><span>受傷日</span><input type="date" required value={value.injury_date||''} onChange={e=>setValue({...value,injury_date:e.target.value})}/></label>
  <label className={cls('side')}><span>左右</span><select value={value.side||'右'} onChange={e=>setValue({...value,side:e.target.value})}><option value="右">右</option><option value="左">左</option><option value="両側">両側</option><option value="中央">中央</option><option value="該当なし">該当なし</option></select></label>
  <label className={cls('symptom')}><span>傷害名または症状</span><select required value={symptomChoice} onChange={e=>setValue({...value,symptom:e.target.value==='その他'?'__その他__':e.target.value})}><option value="" disabled>選択してください</option>{symptoms.map(x=><option key={x} value={x}>{x}</option>)}<option value="その他">その他</option></select>{otherSymptom&&<input autoFocus placeholder="傷害名・症状を入力" required value={value.symptom==='__その他__'?'':value.symptom||''} onChange={e=>setValue({...value,symptom:e.target.value})}/>}</label>
  <label className={cls('body_part')}><span>受傷部位</span><input placeholder="例：右足関節、左大腿後面" required value={value.body_part||''} onChange={e=>setValue({...value,body_part:e.target.value})}/></label>
  <label className={cls('activity')}><span>受傷時の活動内容</span><select value={value.activity||''} onChange={e=>setValue({...value,activity:e.target.value})}><option value="">選択してください</option><option value="TR">TR</option><option value="Game">Game</option><option value="TRM">TRM</option><option value="活動外">活動外</option></select></label>
  <label className={cls('mechanism')}><span>受傷機転</span><input placeholder="例：相手と接触／着地でひねった／切り返し時に痛めた" value={value.mechanism||''} onChange={e=>setValue({...value,mechanism:e.target.value})}/></label>
  <label className={cls('hospital_status')}><span>受診状況</span><select value={value.hospital_status||'未受診'} onChange={e=>setValue({...value,hospital_status:e.target.value})}><option>未受診</option><option>受診済み</option><option>受診予定</option></select></label>
  <label className={cls('facility_name')}><span>医療機関名</span><input placeholder="医療機関名" value={value.facility_name||''} onChange={e=>setValue({...value,facility_name:e.target.value})}/></label>
  <label className={cls('visit_date')}><span>受診日（予定日）</span><input type="date" value={value.visit_date||''} onChange={e=>setValue({...value,visit_date:e.target.value})}/></label>
  <label className={cls('diagnosis')}><span>診断名</span><input placeholder="診断を受けている場合" value={value.diagnosis||''} onChange={e=>setValue({...value,diagnosis:e.target.value})}/></label>
  <label className={cls('instructed_plan')}><span>今後の対応</span><input placeholder="例：受診、経過観察、リハビリ" value={value.instructed_plan||''} onChange={e=>setValue({...value,instructed_plan:e.target.value})}/></label>
  <label className={cls('notes')}><span>備考</span><input placeholder="その他伝えておきたいこと" value={value.notes||''} onChange={e=>setValue({...value,notes:e.target.value})}/></label>
 </div>;
}`;
source=source.slice(0,fieldsStart)+fieldsBlock+source.slice(fieldsEnd);

source += `\n/* injury report form styles */\n`;
await writeFile(file,source,'utf8');
console.log('Applied injury report v2 fixes');
