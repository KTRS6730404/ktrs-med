let homeLoaded=false;
let scheduleLoaded=false;
let sleepLoaded=false;

function loadHome(){
 if(homeLoaded)return;homeLoaded=true;
 import('./HomeCalendarLite').catch(err=>{homeLoaded=false;console.error('HOME enhancer load failed',err)});
}
function loadSchedule(){
 if(scheduleLoaded)return;scheduleLoaded=true;
 import('./ScheduleEnhancer').catch(err=>{scheduleLoaded=false;console.error('Schedule enhancer load failed',err)});
}
function loadSleep(){
 if(sleepLoaded)return;sleepLoaded=true;
 import('./ConditionSleepEnhancer').catch(err=>{sleepLoaded=false;console.error('Condition enhancer load failed',err)});
}

function scan(){
 if(document.querySelector('section.homePage')) loadHome();
 const title=Array.from(document.querySelectorAll<HTMLElement>('.title h1')).map(x=>(x.textContent||'').trim());
 if(title.some(t=>t==='SCHEDULE / Training'||t==='TR Creation'||t==='SCHEDULE / Games'||t==='SET / Categorys')) loadSchedule();
 if(title.some(t=>t.includes('朝のコンディション'))) loadSleep();
}

document.addEventListener('pointerover',e=>{
 const target=e.target as HTMLElement|null;if(!target)return;
 const head=target.closest<HTMLElement>('.navGroupHead');
 const txt=(head?.textContent||'').trim();
 if(txt.includes('TEAM')||txt.includes('SCHEDULE')||txt.includes('TR Creation')||txt.includes('SET')) loadSchedule();
},{capture:true,passive:true});

document.addEventListener('click',e=>{
 const target=e.target as HTMLElement|null;if(!target)return;
 const txt=(target.closest('button,summary')?.textContent||'').trim();
 if(txt.includes('Category')||txt.includes('Training')||txt.includes('Menu Creation')||txt.includes('Games')||txt.includes('TR Creation')) loadSchedule();
 if(txt.includes('朝のコンディション')) loadSleep();
},{capture:true});

window.addEventListener('load',()=>{
 const ric=(window as any).requestIdleCallback as ((cb:()=>void,opts?:{timeout:number})=>number)|undefined;
 if(ric) ric(scan,{timeout:700}); else window.setTimeout(scan,250);
},{once:true});
const observer=new MutationObserver(scan);observer.observe(document.documentElement,{childList:true,subtree:true});
