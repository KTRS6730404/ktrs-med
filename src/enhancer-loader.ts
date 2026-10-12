import './CategoryNavEnhancer';
import './CategoryHeaderCleanup';
import './MemberNavCleanup';
import './NavStructureEnhancer';
import './PlanningFeatureLoader';
import './TrainingBoardLazyLoader';
import './TrainingBoardPreviewEnhancer';

let homeLoaded=false;
let sleepLoaded=false;

function loadHome(){
 if(homeLoaded)return;homeLoaded=true;
 import('./HomeCalendarLite').catch(err=>{homeLoaded=false;console.error('HOME enhancer load failed',err)});
}
function loadSleep(){
 if(sleepLoaded)return;sleepLoaded=true;
 import('./ConditionSleepEnhancer').catch(err=>{sleepLoaded=false;console.error('Condition enhancer load failed',err)});
}
function currentTitles(){return Array.from(document.querySelectorAll<HTMLElement>('.title h1')).map(x=>(x.textContent||'').trim())}
function initialScan(){
 if(document.querySelector('section.homePage'))loadHome();
 const title=currentTitles();if(title.some(t=>t.includes('朝のコンディション')))loadSleep();
}
document.addEventListener('click',e=>{const target=e.target as HTMLElement|null;if(!target)return;const txt=(target.closest<HTMLElement>('button,summary')?.textContent||'').trim();if(txt.includes('朝のコンディション'))loadSleep()},{capture:true});
window.addEventListener('load',()=>{const ric=(window as any).requestIdleCallback as ((cb:()=>void,opts?:{timeout:number})=>number)|undefined;if(ric)ric(initialScan,{timeout:500});else window.setTimeout(initialScan,120)},{once:true});
const startupObserver=new MutationObserver(()=>{const hasHome=!!document.querySelector('section.homePage');const hasSleep=currentTitles().some(t=>t.includes('朝のコンディション'));if(hasHome)loadHome();if(hasSleep)loadSleep();if(hasHome||hasSleep)startupObserver.disconnect()});
startupObserver.observe(document.documentElement,{childList:true,subtree:true});window.setTimeout(()=>startupObserver.disconnect(),1800);
