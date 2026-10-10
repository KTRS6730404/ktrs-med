export {};

let activePlanningCategory:{id:number;name:string}|null=null;
let categoryCreationMode=false;

function setSelectValue(select:HTMLSelectElement,value:string){
 const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')?.set;
 if(setter)setter.call(select,value);else select.value=value;
 select.dispatchEvent(new Event('change',{bubbles:true}));
}

function findTeamCategorySelect(){
 const labels=Array.from(document.querySelectorAll<HTMLLabelElement>('.pm label'));
 const label=labels.find(x=>(x.textContent||'').includes('Team Category'));
 return label?.querySelector('select') as HTMLSelectElement|null;
}

function syncCreationCategory(){
 if(!categoryCreationMode||!activePlanningCategory)return;
 const select=findTeamCategorySelect();
 if(select){
  if(select.value!==String(activePlanningCategory.id))setSelectValue(select,String(activePlanningCategory.id));
  select.disabled=true;
  select.title=`${activePlanningCategory.name} に保存されます`;
 }
 const context=document.querySelector<HTMLElement>('.pm .pmContext');
 const heading=context?.querySelector<HTMLElement>('h2');
 if(heading&&heading.textContent?.trim()==='Training/Game')heading.textContent='Training/Gameの作成';
 const panelHead=Array.from(document.querySelectorAll<HTMLElement>('.pm .panel h3')).find(x=>(x.textContent||'').includes('Training/Game'));
 if(panelHead&&!panelHead.textContent?.includes('作成'))panelHead.textContent='Training/Gameの作成';
}

function enhanceCategoryView(){
 const context=document.querySelector<HTMLElement>('.pm .pmContext');
 if(!context||!activePlanningCategory)return;
 const button=Array.from(context.querySelectorAll<HTMLButtonElement>('button')).find(b=>['Training/Gameへ戻る','Training/Gameの作成'].includes((b.textContent||'').trim()));
 if(button){
  button.textContent='Training/Gameの作成';
  button.onclick=null;
  if(button.dataset.categoryFlowInstalled!=='1'){
   button.dataset.categoryFlowInstalled='1';
   button.addEventListener('click',()=>{
    categoryCreationMode=true;
    window.setTimeout(syncCreationCategory,0);
    window.setTimeout(syncCreationCategory,80);
    window.setTimeout(syncCreationCategory,220);
   },true);
  }
 }
}

function scheduleCategoryEnhance(){
 window.setTimeout(enhanceCategoryView,0);
 window.setTimeout(enhanceCategoryView,100);
 window.setTimeout(enhanceCategoryView,240);
}

window.addEventListener('ktrs-schedule-category',(e:Event)=>{
 const d=(e as CustomEvent).detail;
 if(d?.id){
  activePlanningCategory={id:Number(d.id),name:String(d.name||'Category')};
  categoryCreationMode=false;
  scheduleCategoryEnhance();
 }
});

document.addEventListener('click',e=>{
 const target=e.target as HTMLElement|null;
 const nav=target?.closest<HTMLButtonElement>('.scheduleCategoryItem');
 if(nav){
  const id=Number(nav.dataset.categoryId||'0');
  const name=(nav.textContent||'').trim();
  if(id)activePlanningCategory={id,name};
  categoryCreationMode=false;
  scheduleCategoryEnhance();
  return;
 }
 const button=target?.closest<HTMLButtonElement>('button');
 const txt=(button?.textContent||'').trim();
 if(txt==='Training/Gameの作成'){
  categoryCreationMode=true;
  window.setTimeout(syncCreationCategory,0);
  window.setTimeout(syncCreationCategory,80);
  window.setTimeout(syncCreationCategory,220);
 }
},true);
