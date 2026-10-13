export {};

let coreLoaded=false;
let coreLoading:Promise<unknown>|null=null;
let extrasLoaded=false;
let extrasLoading:Promise<unknown>|null=null;
let scheduled=false;
let transitionObserver:MutationObserver|null=null;
let transitionTimer=0;

function findLegacyTrainingSection(){
  if(document.querySelector('.planningManagerHost,.pm'))return null;
  const headings=Array.from(document.querySelectorAll<HTMLElement>('.title h1'));
  const h=headings.find(x=>/^(SCHEDULE \/ Training|Schedule \/ Training\/Game|SCHEDULE \/ Training\/Game|Planning \/ Training\/Game|TR Creation)$/i.test((x.textContent||'').trim()));
  return h?.closest('section') as HTMLElement|null;
}

function maskLegacyTraining(){
  if(document.querySelector('.planningManagerHost,.pm')){
    document.querySelectorAll('.ktrsPlanningLoading').forEach(node=>node.remove());
    return true;
  }
  const section=findLegacyTrainingSection();
  if(!section)return false;
  const h=section.querySelector<HTMLElement>('.title h1');
  Array.from(section.children).forEach(el=>{
    const node=el as HTMLElement;
    if(node.classList.contains('title')||node.classList.contains('planningManagerHost')||node.classList.contains('ktrsPlanningLoading'))return;
    if(!node.dataset.ktrsTrainingHidden){node.dataset.ktrsTrainingHidden='1';node.style.display='none'}
  });
  if(!section.querySelector('.ktrsPlanningLoading')){
    const loading=document.createElement('div');
    loading.className='panel ktrsPlanningLoading';
    loading.textContent='Trainingメニューを読み込み中...';
    h?.closest('.title')?.insertAdjacentElement('afterend',loading);
  }
  return true;
}

function stopTransitionGuard(){
  transitionObserver?.disconnect();transitionObserver=null;
  if(transitionTimer){window.clearTimeout(transitionTimer);transitionTimer=0}
  document.documentElement.classList.remove('ktrsPlanningTransition');
}

function restoreLegacyTraining(){
  stopTransitionGuard();
  document.querySelectorAll<HTMLElement>('[data-ktrs-training-hidden="1"]').forEach(node=>{delete node.dataset.ktrsTrainingHidden;node.style.removeProperty('display')});
  document.querySelectorAll('.ktrsPlanningLoading').forEach(node=>node.remove());
}

function startTransitionGuard(){
  document.documentElement.classList.add('ktrsPlanningTransition');
  maskLegacyTraining();
  transitionObserver?.disconnect();
  transitionObserver=new MutationObserver(()=>{
    maskLegacyTraining();
    if(document.querySelector('.planningManagerHost,.pm'))stopTransitionGuard();
  });
  transitionObserver.observe(document.body||document.documentElement,{childList:true,subtree:true});
  if(transitionTimer)window.clearTimeout(transitionTimer);
  transitionTimer=window.setTimeout(()=>stopTransitionGuard(),10000);
}

function prepareTrainingTransition(){
  startTransitionGuard();
  requestAnimationFrame(()=>maskLegacyTraining());
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
    scheduled=false;
    void loadPlanningCore().then(()=>idleExtras());
  });
}

function planningControl(target:HTMLElement|null){
  const control=target?.closest<HTMLElement>('button,summary');
  const txt=(control?.textContent||'').trim();
  return txt==='Training'||txt==='Training/Game'||/Planning/.test(txt);
}

function planningVisible(){
  if(document.querySelector('.pm'))return true;
  const text=(document.querySelector('.appContent main')?.textContent||'').slice(0,500);
  return /Planning|Training\/Gameを作成|TRメニュー構成|SCHEDULE \/ Training/.test(text);
}

document.addEventListener('pointerdown',e=>{
  const target=e.target as HTMLElement|null;
  if(!planningControl(target))return;
  prepareTrainingTransition();
  void loadPlanningCore();
},{capture:true});

document.addEventListener('click',e=>{
  const target=e.target as HTMLElement|null;
  if(planningControl(target))schedulePlanningLoad();
},{capture:true});

window.addEventListener('ktrs-schedule-category',()=>{
  prepareTrainingTransition();
  void loadPlanningCore().then(()=>void loadPlanningExtras());
});

window.addEventListener('load',()=>{
  if(planningVisible())schedulePlanningLoad();
},{once:true});
