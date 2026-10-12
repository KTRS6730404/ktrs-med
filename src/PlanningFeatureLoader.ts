export {};

let coreLoaded=false;
let coreLoading:Promise<unknown>|null=null;
let extrasLoaded=false;
let extrasLoading:Promise<unknown>|null=null;
let scheduled=false;

function loadPlanningCore(){
  if(coreLoaded)return Promise.resolve();
  if(coreLoading)return coreLoading;
  coreLoading=import('./PlanningManagerEnhancer')
    .then(()=>{coreLoaded=true})
    .catch(err=>{coreLoading=null;console.error('Planning core load failed',err)});
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
  if(scheduled||coreLoaded)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    window.setTimeout(()=>{
      scheduled=false;
      void loadPlanningCore().then(()=>idleExtras());
    },40);
  });
}

function planningVisible(){
  if(document.querySelector('.pm'))return true;
  const text=(document.querySelector('.appContent main')?.textContent||'').slice(0,500);
  return /Planning|Training\/Gameを作成|TRメニュー構成/.test(text);
}

document.addEventListener('click',e=>{
  const target=e.target as HTMLElement|null;if(!target)return;
  const control=target.closest<HTMLElement>('button,summary');
  const txt=(control?.textContent||'').trim();
  if(/Planning|Training/.test(txt))schedulePlanningLoad();
},{capture:true});

window.addEventListener('ktrs-schedule-category',()=>{
  void loadPlanningCore().then(()=>void loadPlanningExtras());
});

window.addEventListener('load',()=>{
  if(planningVisible())schedulePlanningLoad();
},{once:true});
