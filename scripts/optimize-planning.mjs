import {readFile,writeFile} from 'node:fs/promises';

const file=new URL('../src/PlanningManagerEnhancer.tsx',import.meta.url);
let source=await readFile(file,'utf8');

if(!source.includes('KTRS_PLANNING_FAST_BOOT')){
 const replacement=` async function loadBase(){
  /* KTRS_PLANNING_FAST_BOOT */
  const now=new Date();
  const from=new Date(now);from.setDate(from.getDate()-120);
  const to=new Date(now);to.setDate(to.getDate()+365);
  const [{data:e,error:ee},{data:p,error:pe},{data:a,error:ae},{data:c,error:ce},{data:tc,error:tce},{data:pl,error:ple}]=await Promise.all([
   supabase.from('schedule_events').select('*').gte('starts_at',from.toISOString()).lte('starts_at',to.toISOString()).order('starts_at',{ascending:false}).limit(300),
   supabase.from('training_plans').select('id,schedule_event_id,plan_date,title,category_id,venue,start_time,total_minutes,theme,objective,notes').order('plan_date',{ascending:false}).limit(250),
   supabase.from('training_plan_attachments').select('id,training_plan_id,training_plan_block_id,storage_path,file_name,mime_type,file_size').order('created_at'),
   supabase.from('schedule_entry_categories').select('id,name,color_hex').eq('is_active',true).order('sort_order').order('name'),
   supabase.from('training_block_categories').select('id,name,sort_order,is_default').order('sort_order').order('name'),
   supabase.from('player_directory').select('player_id,full_name,school_grade,position').eq('is_hidden',false).order('school_grade',{ascending:false}).order('full_name')
  ]);
  const err=ee||pe||ae||ce||tce||ple;if(err){setMsg(err.message||'読み込みに失敗しました。');return}
  const planRows=p||[];const eventRows=e||[];const attachmentRows=(a||[]) as Attachment[];
  setEvents(eventRows);setPlans(planRows);setAllAttachments(attachmentRows);setTeamCategories((c||[]) as TeamCategory[]);setTrCategories((tc||[]) as TrCategory[]);setPlayers((pl||[]) as Player[]);

  const hydrateSecondary=async()=>{
   const planIds=planRows.map((x:any)=>x.id);const eventIds=eventRows.map((x:any)=>x.id);
   const [blocksRes,participantsRes]=await Promise.all([
    planIds.length?supabase.from('training_plan_blocks').select('id,training_plan_id,tr_category,menu_name,theme,block_label,duration_minutes,objective,organization,content,coaching_points,load_notes,sort_order').in('training_plan_id',planIds).order('sort_order'):Promise.resolve({data:[],error:null} as any),
    eventIds.length?supabase.from('schedule_event_participants').select('event_id,player_id').in('event_id',eventIds):Promise.resolve({data:[],error:null} as any)
   ]);
   if(!blocksRes.error)setAllBlocks(blocksRes.data||[]);
   if(!participantsRes.error){const map:Record<number,number>={};(participantsRes.data||[]).forEach((x:any)=>map[x.event_id]=(map[x.event_id]||0)+1);setCounts(map)}
   if(attachmentRows.length){
    const signed=await Promise.all(attachmentRows.map(async x=>{const {data}=await supabase.storage.from('training-plan-files').createSignedUrl(x.storage_path,3600);return {...x,url:data?.signedUrl||''}}));
    setAllAttachments(signed);
   }
  };
  const ric=(window as any).requestIdleCallback as ((cb:()=>void,opts?:{timeout:number})=>number)|undefined;
  if(ric)ric(()=>void hydrateSecondary(),{timeout:900});else window.setTimeout(()=>void hydrateSecondary(),100);
 }

 const trOptions=`;
 const pattern=/ async function loadBase\(\)\{[\s\S]*?\n \}\n\n const trOptions=/;
 if(!pattern.test(source))throw new Error('Planning loadBase block not found; optimization was not applied.');
 source=source.replace(pattern,replacement);
}

if(!source.includes('KTRS_PLANNING_ROBUST_MOUNT')){
 const oldMount=`function scheduleMount(){setTimeout(mount,0);setTimeout(mount,80);setTimeout(mount,220)}\ndocument.addEventListener('click',e=>{const txt=((e.target as HTMLElement|null)?.closest('button')?.textContent||'').trim();if(txt==='Training/Game')scheduleMount()},{capture:true});let tries=0;const timer=setInterval(()=>{tries++;if(mount()||tries>15)clearInterval(timer)},120);`;
 const newMount=`/* KTRS_PLANNING_ROBUST_MOUNT */\nlet mountObserver:MutationObserver|null=null;\nlet mountObserverTimer:number|undefined;\nfunction stopMountObserver(){if(mountObserver){mountObserver.disconnect();mountObserver=null}if(mountObserverTimer){window.clearTimeout(mountObserverTimer);mountObserverTimer=undefined}}\nfunction watchForPlanningHost(){\n if(mount()){stopMountObserver();return}\n if(mountObserver)return;\n const target=document.querySelector('.appContent main')||document.body;\n mountObserver=new MutationObserver(()=>{if(mount())stopMountObserver()});\n mountObserver.observe(target,{childList:true,subtree:true});\n mountObserverTimer=window.setTimeout(()=>{if(mount()){stopMountObserver()}else{stopMountObserver()}},15000);\n}\nfunction scheduleMount(){setTimeout(()=>{if(!mount())watchForPlanningHost()},0);setTimeout(()=>{if(!mount())watchForPlanningHost()},120);setTimeout(()=>{if(!mount())watchForPlanningHost()},400)}\ndocument.addEventListener('click',e=>{const txt=((e.target as HTMLElement|null)?.closest('button')?.textContent||'').trim();if(txt==='Training'||txt==='Training/Game'||txt==='Planning')scheduleMount()},{capture:true});\nwindow.addEventListener('ktrs-schedule-category',scheduleMount);\nscheduleMount();`;
 if(!source.includes(oldMount))throw new Error('Planning mount block not found; robust mount was not applied.');
 source=source.replace(oldMount,newMount);
}

await writeFile(file,source,'utf8');
console.log('Applied Planning fast bootstrap and robust mount');
