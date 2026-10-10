import {supabase} from './supabase';

function groupByLabel(sidebar:HTMLElement,label:string){return Array.from(sidebar.querySelectorAll<HTMLElement>('.navGroup')).find(g=>(g.querySelector('.navGroupHead .navTitleWithAlert > span')?.textContent||'').trim()===label)}
function setButtonLabel(btn:HTMLButtonElement,text:string){const s=btn.querySelector('span');if(s)s.textContent=text;else btn.textContent=text}
let categoryCache:{id:number;name:string}[]=[];
async function loadCategories(){const {data}=await supabase.from('schedule_entry_categories').select('id,name').eq('is_active',true).order('sort_order').order('name');categoryCache=(data||[]) as any[];normalize()}
function normalize(){
 const sidebar=document.querySelector<HTMLElement>('.mainSidebar:not(.playerNav)');if(!sidebar)return;
 const labels:Record<string,string>={TEAM:'Team',Team:'Team',SCHEDULE:'Schedule',Schedule:'Schedule',PERFORMANCE:'Stats',Performance:'Stats',Stats:'Stats',MEDICAL:'Medical',Medical:'Medical',DEVELOPMENT:'Development',Development:'Development',COMMUNICATION:'Communication',Communication:'Communication',MANAGEMENT:'Management',Management:'Management',SET:'Set',Set:'Set',HOME:'Dashboard',Dashboard:'Dashboard'};
 Array.from(sidebar.querySelectorAll<HTMLElement>('.navGroupHead .navTitleWithAlert > span')).forEach(x=>{const t=(x.textContent||'').trim();if(labels[t])x.textContent=labels[t]});
 const schedule=groupByLabel(sidebar,'Schedule');const scheduleChildren=schedule?.querySelector<HTMLElement>('.navChildren');if(scheduleChildren){
   Array.from(scheduleChildren.querySelectorAll<HTMLButtonElement>(':scope > button')).forEach(btn=>{const t=(btn.textContent||'').trim();if(t==='Training'||t==='Menu Creation')setButtonLabel(btn,'Training/Game');if(t==='Games'||t==='Events'||t==='Medical'||btn.classList.contains('scheduleCategoryItem'))btn.remove()});
   for(const c of categoryCache){const b=document.createElement('button');b.className='scheduleCategoryItem';b.dataset.categoryId=String(c.id);b.innerHTML=`<span>${c.name}</span>`;b.onclick=e=>{e.preventDefault();e.stopPropagation();openScheduleCategory(sidebar,c.id,c.name)};scheduleChildren.appendChild(b)}
 }
 const management=groupByLabel(sidebar,'Management');if(management)management.style.display='none';
 const set=groupByLabel(sidebar,'Set');const setChildren=set?.querySelector<HTMLElement>('.navChildren');if(setChildren){Array.from(setChildren.querySelectorAll<HTMLButtonElement>(':scope > button')).forEach(btn=>{const t=(btn.textContent||'').trim();if(t==='Categorys'||t==='Category')btn.remove()});ensureManagementItems(sidebar,setChildren)}
}
function ensureScheduleOpen(sidebar:HTMLElement){const schedule=groupByLabel(sidebar,'Schedule');if(!schedule)return;const children=schedule.querySelector<HTMLElement>('.navChildren');if(!children)(schedule.querySelector('.navGroupHead') as HTMLButtonElement|null)?.click()}
function openScheduleCategory(sidebar:HTMLElement,id:number,name:string){ensureScheduleOpen(sidebar);const schedule=groupByLabel(sidebar,'Schedule');const training=Array.from(schedule?.querySelectorAll<HTMLButtonElement>('.navChildren > button')||[]).find(b=>(b.textContent||'').trim()==='Training/Game');training?.click();const fire=()=>window.dispatchEvent(new CustomEvent('ktrs-schedule-category',{detail:{id,name}}));window.setTimeout(fire,80);window.setTimeout(fire,220)}
function ensureManagementOpen(sidebar:HTMLElement){const management=groupByLabel(sidebar,'Management');if(!management)return;const child=management.querySelector('.navChildren');if(!child)(management.querySelector('.navGroupHead') as HTMLButtonElement|null)?.click()}
function openManagementItem(sidebar:HTMLElement,label:string){ensureManagementOpen(sidebar);const go=()=>{const management=groupByLabel(sidebar,'Management');const b=Array.from(management?.querySelectorAll<HTMLButtonElement>('.navChildren > button')||[]).find(x=>(x.textContent||'').trim()===label);b?.click()};window.setTimeout(go,0);window.setTimeout(go,60)}
function ensureManagementItems(sidebar:HTMLElement,setChildren:HTMLElement){
 const wanted=['Accounts','Permissions','Data','Settings'];for(const label of wanted){if(Array.from(setChildren.querySelectorAll<HTMLButtonElement>(':scope > button')).some(b=>(b.textContent||'').trim()===label))continue;const b=document.createElement('button');b.className='movedManagementItem';b.innerHTML=`<span>${label}</span>`;b.onclick=e=>{e.preventDefault();e.stopPropagation();openManagementItem(sidebar,label)};const account=Array.from(setChildren.querySelectorAll<HTMLButtonElement>(':scope > button')).find(x=>(x.textContent||'').trim()==='Account');if(account)setChildren.insertBefore(b,account);else setChildren.appendChild(b)}}
function refreshLater(){window.setTimeout(normalize,0);window.setTimeout(normalize,50);window.setTimeout(normalize,160)}
normalize();void loadCategories();
document.addEventListener('click',e=>{const t=e.target as HTMLElement|null;const h=t?.closest('.navGroupHead');if(h)refreshLater();const txt=(t?.closest('button')?.textContent||'').trim();if(['追加する','更新する','削除'].includes(txt))window.setTimeout(()=>void loadCategories(),250)},{capture:true});
window.addEventListener('ktrs-categories-changed',()=>void loadCategories());
let tries=0;const timer=window.setInterval(()=>{tries++;normalize();if(tries>=15)window.clearInterval(timer)},120);
