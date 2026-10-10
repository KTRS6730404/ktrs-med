let homeLoaded=false;
let scheduleLoaded=false;
let scheduleLoading=false;
let sleepLoaded=false;

function loadHome(){
 if(homeLoaded)return;homeLoaded=true;
 import('./HomeCalendarLite').catch(err=>{homeLoaded=false;console.error('HOME enhancer load failed',err)});
}

async function loadSchedule(){
 if(scheduleLoaded||scheduleLoading)return;
 scheduleLoading=true;
 // ScheduleEnhancer used to install a document-wide MutationObserver at import time.
 // That observer repeatedly re-ran sidebar enhancement while the sidebar itself was
 // changing, which could lock up the UI. Suppress only that import-time observer;
 // the module's initial boot() still runs once and all React roots remain interactive.
 const NativeMutationObserver=window.MutationObserver;
 class OneShotNoopObserver{
   observe(){}
   disconnect(){}
   takeRecords(){return [] as MutationRecord[]}
 }
 try{
   (window as any).MutationObserver=OneShotNoopObserver;
   await import('./ScheduleEnhancer');
   scheduleLoaded=true;
 }catch(err){
   console.error('Schedule enhancer load failed',err);
 }finally{
   (window as any).MutationObserver=NativeMutationObserver;
   scheduleLoading=false;
 }
}

function loadSleep(){
 if(sleepLoaded)return;sleepLoaded=true;
 import('./ConditionSleepEnhancer').catch(err=>{sleepLoaded=false;console.error('Condition enhancer load failed',err)});
}

function currentTitles(){
 return Array.from(document.querySelectorAll<HTMLElement>('.title h1')).map(x=>(x.textContent||'').trim());
}

function initialScan(){
 if(document.querySelector('section.homePage'))loadHome();
 const title=currentTitles();
 if(title.some(t=>t==='SCHEDULE / Training'||t==='TR Creation'||t==='SCHEDULE / Games'||t==='SET / Categorys'))loadSchedule();
 if(title.some(t=>t.includes('朝のコンディション')))loadSleep();
}

// Deliberately no pointerover preload. Hovering/opening a sidebar group must remain instant.
document.addEventListener('click',e=>{
 const target=e.target as HTMLElement|null;if(!target)return;
 const clickable=target.closest<HTMLElement>('button,summary');
 if(!clickable)return;
 const txt=(clickable.textContent||'').trim();

 // TEAM is the only group-head click that needs the lightweight Category nav injected.
 // Loading happens once, on the actual click, never on hover.
 if(clickable.classList.contains('navGroupHead')&&txt.includes('TEAM')){
   void loadSchedule();
 }
 if(txt.includes('Category')||txt.includes('Training')||txt.includes('Menu Creation')||txt.includes('Games')||txt.includes('TR Creation')||txt.includes('Categorys')){
   void loadSchedule();
 }
 if(txt.includes('朝のコンディション'))loadSleep();
},{capture:true});

window.addEventListener('load',()=>{
 const ric=(window as any).requestIdleCallback as ((cb:()=>void,opts?:{timeout:number})=>number)|undefined;
 if(ric)ric(initialScan,{timeout:500});else window.setTimeout(initialScan,120);
},{once:true});

// A short-lived observer is enough to catch the first React render. It disconnects
// immediately after finding a relevant screen, avoiding continuous whole-document scans.
const startupObserver=new MutationObserver(()=>{
 const hasHome=!!document.querySelector('section.homePage');
 const titles=currentTitles();
 const hasSleep=titles.some(t=>t.includes('朝のコンディション'));
 const hasSchedule=titles.some(t=>t==='SCHEDULE / Training'||t==='TR Creation'||t==='SCHEDULE / Games'||t==='SET / Categorys');
 if(hasHome)loadHome();
 if(hasSleep)loadSleep();
 if(hasSchedule)void loadSchedule();
 if(hasHome||hasSleep||hasSchedule){startupObserver.disconnect()}
});
startupObserver.observe(document.documentElement,{childList:true,subtree:true});
window.setTimeout(()=>startupObserver.disconnect(),1800);
