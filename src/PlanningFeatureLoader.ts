export {};

let planningLoaded=false;
let planningLoading:Promise<unknown>|null=null;

function loadPlanning(){
  if(planningLoaded)return Promise.resolve();
  if(planningLoading)return planningLoading;
  planningLoading=Promise.all([
    import('./PlanningManagerEnhancer'),
    import('./PlanningExpandableCreateEnhancer'),
    import('./TrainingMenuReuseEnhancer'),
    import('./TRMenuModeEnhancer')
  ]).then(()=>{planningLoaded=true}).catch(err=>{planningLoading=null;console.error('Planning features load failed',err)});
  return planningLoading;
}

function planningVisible(){
  if(document.querySelector('.pm'))return true;
  const text=(document.querySelector('.appContent main')?.textContent||'').slice(0,500);
  return /Planning|Training\/Gameを作成|TRメニュー構成/.test(text);
}

document.addEventListener('click',e=>{
  const target=e.target as HTMLElement|null;if(!target)return;
  const txt=(target.closest<HTMLElement>('button,summary')?.textContent||'').trim();
  if(/Planning|Training|Schedule/.test(txt))void loadPlanning();
},{capture:true});

window.addEventListener('ktrs-schedule-category',()=>void loadPlanning());
window.addEventListener('load',()=>{if(planningVisible())void loadPlanning()},{once:true});
