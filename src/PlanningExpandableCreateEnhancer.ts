export {};

let activeCategory:{id:number;name:string}|null=null;
let compactSnapshot='';

function pm(){return document.querySelector<HTMLElement>('.pm')}
function host(){return document.querySelector<HTMLElement>('.planningManagerHost')}
function captureLibrary(){const grid=pm()?.querySelector<HTMLElement>('.libGrid');if(grid)compactSnapshot=grid.innerHTML}
function currentNativeCreateButton(){
 const context=pm()?.querySelector<HTMLElement>('.pmContext');
 return Array.from(context?.querySelectorAll<HTMLButtonElement>('button')||[]).find(b=>['Training/Gameへ戻る','Training/Gameの作成','Training/Gameを作成'].includes((b.textContent||'').trim()))||null
}
function clearInjected(){document.querySelectorAll('.trainingGameCreateBar,.trainingGameCreateOpenBar,.compactCreatedMenuSection').forEach(x=>x.remove())}
function showHost(){const h=host();if(h)h.style.display='';document.querySelector('.planningCategoryLanding')?.remove()}
function showLanding(){
 clearInjected();activeCategory=null;compactSnapshot='';
 const h=host();if(h)h.style.display='none';
 const section=h?.parentElement;if(!section||section.querySelector('.planningCategoryLanding'))return;
 const box=document.createElement('div');box.className='planningCategoryLanding';box.innerHTML='<small>PLANNING</small><h2>Team Categoryを選択</h2><p>左側のPlanningからTeam Categoryを選択してください。</p>';
 h.insertAdjacentElement('beforebegin',box)
}
function openCreation(){
 captureLibrary();
 const native=currentNativeCreateButton();
 if(!native)return;
 native.click();
 [0,80,180,320].forEach(ms=>window.setTimeout(enhanceCreationView,ms))
}
function closeCreation(){if(activeCategory)window.dispatchEvent(new CustomEvent('ktrs-schedule-category',{detail:{id:activeCategory.id,name:activeCategory.name}}))}

function enhanceCategoryView(){
 const root=pm();if(!root||!activeCategory)return;
 const context=root.querySelector<HTMLElement>('.pmContext');const heading=context?.querySelector<HTMLElement>('h2');
 if(!context||!heading||heading.textContent?.trim()!==activeCategory.name)return;
 showHost();captureLibrary();
 const native=currentNativeCreateButton();if(!native)return;native.style.display='none';
 root.querySelector('.trainingGameCreateOpenBar')?.remove();root.querySelector('.compactCreatedMenuSection')?.remove();
 let bar=root.querySelector<HTMLElement>('.trainingGameCreateBar');
 if(!bar){
  bar=document.createElement('div');bar.className='trainingGameCreateBar';
  const left=document.createElement('div');left.className='trainingGameCreateTitle';left.innerHTML='<small>TRAINING / GAME</small><strong>Training/Game</strong>';
  const btn=document.createElement('button');btn.type='button';btn.className='trainingGameCreateButton';btn.textContent='Training/Gameを作成';btn.addEventListener('click',openCreation);
  bar.append(left,btn);context.insertAdjacentElement('afterend',bar)
 }
 const grid=root.querySelector<HTMLElement>('.libGrid');if(grid)grid.classList.add('compactLibraryGrid')
}

function enhanceCreationView(){
 const root=pm();if(!root||!activeCategory)return;
 const context=root.querySelector<HTMLElement>('.pmContext');const heading=context?.querySelector<HTMLElement>('h2');
 if(!context||!heading||heading.textContent?.trim()!=='Training/Game')return;
 showHost();root.querySelector('.trainingGameCreateBar')?.remove();
 let top=root.querySelector<HTMLElement>('.trainingGameCreateOpenBar');
 if(!top){
  top=document.createElement('div');top.className='trainingGameCreateOpenBar';
  const info=document.createElement('div');info.innerHTML=`<small>${activeCategory.name}</small><strong>Training/Game</strong>`;
  const actions=document.createElement('div');actions.className='trainingGameCreateOpenActions';
  const state=document.createElement('span');state.textContent='作成画面を展開中';
  const close=document.createElement('button');close.type='button';close.className='trainingGameCloseButton';close.textContent='閉じる';close.addEventListener('click',closeCreation);
  actions.append(state,close);top.append(info,actions);context.insertAdjacentElement('afterend',top)
 }
 if(compactSnapshot&&!root.querySelector('.compactCreatedMenuSection')){
  const section=document.createElement('section');section.className='compactCreatedMenuSection';section.innerHTML=`<div class="compactCreatedMenuHead"><h3>作成したメニュー</h3><span>${activeCategory.name}</span></div><div class="compactCreatedMenuList">${compactSnapshot}</div>`;
  const saveBar=root.querySelector<HTMLElement>('.saveBar');if(saveBar)saveBar.insertAdjacentElement('afterend',section);else root.appendChild(section)
 }
}
function scheduleCategory(){[0,80,180,320].forEach(ms=>window.setTimeout(enhanceCategoryView,ms))}

window.addEventListener('ktrs-schedule-category',(e:Event)=>{
 const d=(e as CustomEvent).detail;if(!d?.id)return;
 activeCategory={id:Number(d.id),name:String(d.name||'Category')};compactSnapshot='';showHost();clearInjected();scheduleCategory()
});

document.addEventListener('click',e=>{
 const t=e.target as HTMLElement|null;if(!t)return;
 const category=t.closest<HTMLButtonElement>('.scheduleCategoryItem');
 if(category){const id=Number(category.dataset.categoryId||0);if(id){activeCategory={id,name:(category.textContent||'').trim()};compactSnapshot='';showHost();clearInjected();scheduleCategory()}return}
 const head=t.closest<HTMLElement>('.navGroupHead');
 if(head){const label=(head.querySelector('.navTitleWithAlert > span')?.textContent||'').trim();if(label==='Planning')window.setTimeout(()=>{const group=head.closest('.navGroup');if(group?.querySelector('.navChildren'))showLanding()},30)}
},true);

const style=document.createElement('style');style.textContent=`
.planningCategoryLanding{margin:14px 0;background:#fff;border:1px solid #dfe7ef;border-radius:14px;padding:24px}.planningCategoryLanding small{font-size:10px;letter-spacing:.14em;color:#71869a;font-weight:800}.planningCategoryLanding h2{margin:5px 0}.planningCategoryLanding p{margin:0;color:#6d8092}.trainingGameCreateBar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 14px;padding:12px 14px;border:1px solid #d8e4ef;border-radius:12px;background:#fff}.trainingGameCreateTitle{display:grid;gap:2px}.trainingGameCreateTitle small{font-size:9px;letter-spacing:.14em;color:#8191a2;font-weight:800}.trainingGameCreateTitle strong{font-size:16px;color:#17324d}.trainingGameCreateButton{white-space:nowrap;background:#1769aa!important;color:#fff!important;border:none!important;border-radius:9px!important;padding:9px 14px!important;font-weight:800!important}.trainingGameCreateOpenBar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 0 12px;padding:10px 13px;border-radius:10px;background:#eef6ff;border:1px solid #d3e4f5}.trainingGameCreateOpenBar>div{display:flex;align-items:baseline;gap:10px}.trainingGameCreateOpenBar small{color:#6f8193}.trainingGameCreateOpenActions{display:flex!important;align-items:center!important;gap:9px!important}.trainingGameCreateOpenActions span{font-size:11px;color:#1769aa;font-weight:800}.trainingGameCloseButton{border:1px solid #c9d8e5!important;background:#fff!important;color:#46627b!important;border-radius:8px!important;padding:6px 10px!important;font-weight:800!important}.compactLibraryGrid,.compactCreatedMenuList .libGrid{display:grid!important;grid-template-columns:1fr!important;gap:6px!important}.compactLibraryGrid .libCard,.compactCreatedMenuList .libCard{display:grid!important;grid-template-columns:90px minmax(120px,1fr) minmax(120px,1fr) auto!important;align-items:center!important;gap:8px!important;padding:8px 10px!important;min-height:0!important}.compactLibraryGrid .libCard h3,.compactCreatedMenuList .libCard h3,.compactLibraryGrid .libCard p,.compactCreatedMenuList .libCard p{margin:0!important}.compactLibraryGrid .libCard>div:not(.tag):not(.fileLinks),.compactCreatedMenuList .libCard>div:not(.tag):not(.fileLinks){display:none!important}.compactCreatedMenuSection{margin:14px 0}.compactCreatedMenuHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.compactCreatedMenuHead h3{margin:0}.compactCreatedMenuHead span{font-size:11px;color:#6f8193}@media(max-width:760px){.compactLibraryGrid .libCard,.compactCreatedMenuList .libCard{grid-template-columns:1fr!important}.trainingGameCreateBar,.trainingGameCreateOpenBar{align-items:flex-start;flex-direction:column}.trainingGameCreateButton{width:100%}.trainingGameCreateOpenActions{width:100%;justify-content:space-between}}
`;document.head.appendChild(style);
