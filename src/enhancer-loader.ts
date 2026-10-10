const loadEnhancers=()=>{
  Promise.all([
    import('./ScheduleEnhancer'),
    import('./ConditionSleepEnhancer')
  ]).catch(err=>console.error('Enhancer load failed',err));
};

window.addEventListener('load',()=>{
  const ric=(window as any).requestIdleCallback as ((cb:()=>void,opts?:{timeout:number})=>number)|undefined;
  if(ric) ric(loadEnhancers,{timeout:1200});
  else window.setTimeout(loadEnhancers,500);
},{once:true});
