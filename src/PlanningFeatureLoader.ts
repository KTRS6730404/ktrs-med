export {};

let coreLoaded=false;
let coreLoading:Promise<unknown>|null=null;
let extrasLoaded=false;
let extrasLoading:Promise<unknown>|null=null;
let scheduled=false;

function maskLegacyTraining(){
  if(document.querySelector('.planningManagerHost'))return true;
  const h=Array.from(document.querySelectorAll<HTMLElement>('.title h1')).find(x=>(x.textContent||'').trim()==='SCHEDULE / Training');
  const section=h?.closest('section') as HTMLElement|null;
  if(!section)return false;
  Array.from(section.children).forEach(el=>{
    const node=el as HTMLElement;
    if(node.classList.contains('title')||node.classList.contains('planningManagerHost')||node.classList.contains('ktrsPlanningLoading'))return;
    if(!node.dataset.ktrsTrainingHidden){node.dataset.ktrsTrainingHidden='1';node.style.display='none'}
  });
  if(!section.querySelector('.ktrsPlanningLoading')){
    const loading=document.createElement('div');
    loading.className='panel ktrsPlanningLoading';
    loading.textContent='Trainingメニューを読み込み中...';
    h!.closest('.title')?.insertAdjacentElement('afterend',loading);
  }
  return true;
}

function restoreLegacyTraining(){
  document.querySelectorAll<HTMLElement>('[data-ktrs-training-hidden="1"]').forEach(node=>{delete node.dataset.ktrsTrainingHidden;node.style.removeProperty('display')});
  document.querySelectorAll('.ktrsPlanningLoading').forEach(node=>node.remove());
}

function prepareTrainingTransition(){
  maskLegacyTraining();
  requestAnimationFrame(()=>maskLegacyTraining());
  window.setTimeout(()=>maskLegacyTraining(),40);
  window.setTimeout(()=>maskLegacyTraining(),120);
  window.setTimeout(()=>maskLegacyTraining(),300);
}

function loadPlanningCore(){
  if(coreLoaded)return Promise.resolve();
  if(coreLoading)return coreLoading;
  coreLoading=import('./PlanningManagerEnhancer')
    .then(()=>{coreLoaded=true})
    .catch(err=>{coreLoading=null;restoreLegacyTraining();console.error('Planning core load failed',err)});
  return coreLoading;
}

function loadPlanningExtras(){
  if(extrasLoaded)return Promise.resolve();
  if(extrasLoading)return extrasLoading;
  extrasLoading=Promise.all([
    import('./PlanningExpandableCreateEnhancer'),
    import('./TrainingMenuReuseEnhancer'),
    import('./TRMenuModeEnhancer')
  ]).then(()=>{extrasLoaded=true}).catch(err=>{extrasLoading=null;console.error('Planning extras load failed',err)});
  return extrasLoading;
}

function idleExtras(){
  const run=()=>void loadPlanningExtras();
  const ric=(window as any).requestIdleCallback as ((cb:()=>void,opts?:{timeout:number})=>number)|undefined;
  if(ric)ric(run,{timeout:1200});
  else window.setTimeout(run,700);
}

function schedulePlanningLoad(){
  prepareTrainingTransition();
  if(scheduled||coreLoaded)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    window.setTimeout(()=>{
      scheduled=false;
      void loadPlanningCore().then(()=>idleExtras());
    },20);
  });
}

function planningVisible(){
  if(document.querySelector('.pm'))return true;
  const text=(document.querySelector('.appContent main')?.textContent||'').slice(0,500);
  return /Planning|Training\/Gameを作成|TRメニュー構成|SCHEDULE \/ Training/.test(text);
}

document.addEventListener('click',e=>{
  const target=e.target as HTMLElement|null;if(!target)return;
  const control=target.closest<HTMLElement>('button,summary');
  const txt=(control?.textContent||'').trim();
  if(txt==='Training'||txt==='Training/Game'||/Planning/.test(txt))schedulePlanningLoad();
},{capture:true});

window.addEventListener('ktrs-schedule-category',()=>{
  prepareTrainingTransition();
  void loadPlanningCore().then(()=>void loadPlanningExtras());
});

window.addEventListener('load',()=>{
  if(planningVisible())schedulePlanningLoad();
},{once:true});
