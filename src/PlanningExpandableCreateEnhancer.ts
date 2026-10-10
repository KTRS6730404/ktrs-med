let activeCategory:{id:number;name:string}|null=null;
let compactSnapshot='';
let installedButton:HTMLButtonElement|null=null;

function captureCompactLibrary(){
 const grid=document.querySelector<HTMLElement>('.pm .libGrid');
 if(grid)compactSnapshot=grid.innerHTML;
}

function installCategoryCreateBar(){
 const pm=document.querySelector<HTMLElement>('.pm');
 const context=pm?.querySelector<HTMLElement>('.pmContext');
 if(!pm||!context||!activeCategory)return;
 const heading=context.querySelector<HTMLElement>('h2');
 if(!heading||heading.textContent?.trim()==='Training/Gameの作成')return;
 captureCompactLibrary();
 const old=Array.from(context.querySelectorAll<HTMLButtonElement>('button')).find(b=>['Training/Gameへ戻る','Training/Gameの作成','Training/Gameを作成'].includes((b.textContent||'').trim()));
 if(!old)return;
 old.style.display='none';
 let bar=pm.querySelector<HTMLElement>('.trainingGameCreateBar');
 if(!bar){
  bar=document.createElement('div');bar.className='trainingGameCreateBar';
  const left=document.createElement('div');left.className='trainingGameCreateTitle';left.innerHTML='<small>TRAINING / GAME</small><strong>Training/Game</strong>';
  const btn=document.createElement('button');btn.type='button';btn.className='trainingGameCreateButton';btn.textContent='Training/Gameを作成';
  btn.addEventListener('click',()=>{captureCompactLibrary();old.click();window.setTimeout(enhanceCreationView,0);window.setTimeout(enhanceCreationView,100);window.setTimeout(enhanceCreationView,260)});
  installedButton=btn;bar.append(left,btn);context.insertAdjacentElement('afterend',bar)
 }
 const grid=pm.querySelector<HTMLElement>('.libGrid');if(grid)grid.classList.add('compactLibraryGrid');
}

function enhanceCreationView(){
 const pm=document.querySelector<HTMLElement>('.pm');if(!pm||!activeCategory)return;
 const context=pm.querySelector<HTMLElement>('.pmContext');const h=context?.querySelector<HTMLElement>('h2');
 if(!h||!h.textContent?.includes('Training/Game'))return;
 h.textContent='Training/Game';
 let top=pm.querySelector<HTMLElement>('.trainingGameCreateOpenBar');
 if(!top){top=document.createElement('div');top.className='trainingGameCreateOpenBar';top.innerHTML=`<div><small>${activeCategory.name}</small><strong>Training/Game</strong></div><span>作成画面を展開中</span>`;context?.insertAdjacentElement('afterend',top)}
 if(!compactSnapshot)return;
 let section=pm.querySelector<HTMLElement>('.compactCreatedMenuSection');
 if(!section){
  section=document.createElement('section');section.className='compactCreatedMenuSection';section.innerHTML=`<div class="compactCreatedMenuHead"><h3>作成したメニュー</h3><span>${activeCategory.name}</span></div><div class="compactCreatedMenuList">${compactSnapshot}</div>`;
  const saveBar=pm.querySelector<HTMLElement>('.saveBar');if(saveBar)saveBar.insertAdjacentElement('afterend',section);else pm.appendChild(section)
 }
}

window.addEventListener('ktrs-schedule-category',(e:Event)=>{const d=(e as CustomEvent).detail;if(d?.id){activeCategory={id:Number(d.id),name:String(d.name||'Category')};compactSnapshot='';window.setTimeout(installCategoryCreateBar,0);window.setTimeout(installCategoryCreateBar,120)}});

document.addEventListener('click',e=>{const t=e.target as HTMLElement|null;const nav=t?.closest<HTMLButtonElement>('.scheduleCategoryItem');if(nav){const id=Number(nav.dataset.categoryId||'0');if(id){activeCategory={id,name:(nav.textContent||'').trim()};compactSnapshot=''}}},true);

const style=document.createElement('style');style.textContent=`
.trainingGameCreateBar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 14px;padding:12px 14px;border:1px solid #d8e4ef;border-radius:12px;background:#fff}.trainingGameCreateTitle{display:grid;gap:2px}.trainingGameCreateTitle small{font-size:9px;letter-spacing:.14em;color:#8191a2;font-weight:800}.trainingGameCreateTitle strong{font-size:16px;color:#17324d}.trainingGameCreateButton{white-space:nowrap;background:#1769aa!important;color:#fff!important;border:none!important;border-radius:9px!important;padding:9px 14px!important;font-weight:800!important}.trainingGameCreateOpenBar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 0 12px;padding:10px 13px;border-radius:10px;background:#eef6ff;border:1px solid #d3e4f5}.trainingGameCreateOpenBar>div{display:flex;align-items:baseline;gap:10px}.trainingGameCreateOpenBar small{color:#6f8193}.trainingGameCreateOpenBar span{font-size:11px;color:#1769aa;font-weight:800}.compactLibraryGrid,.compactCreatedMenuList .libGrid{display:grid!important;grid-template-columns:1fr!important;gap:6px!important}.compactLibraryGrid .libCard,.compactCreatedMenuList .libCard{display:grid!important;grid-template-columns:90px minmax(120px,1fr) minmax(120px,1fr) auto!important;align-items:center!important;gap:8px!important;padding:8px 10px!important;min-height:0!important}.compactLibraryGrid .libCard .tag,.compactCreatedMenuList .libCard .tag{margin:0!important}.compactLibraryGrid .libCard h3,.compactCreatedMenuList .libCard h3{margin:0!important;font-size:13px!important}.compactLibraryGrid .libCard p,.compactCreatedMenuList .libCard p{margin:0!important;font-size:12px!important}.compactLibraryGrid .libCard>div:not(.tag):not(.fileLinks),.compactCreatedMenuList .libCard>div:not(.tag):not(.fileLinks){display:none!important}.compactLibraryGrid .libCard>small,.compactCreatedMenuList .libCard>small{font-size:10px!important;white-space:nowrap}.compactCreatedMenuSection{margin:14px 0}.compactCreatedMenuHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.compactCreatedMenuHead h3{margin:0}.compactCreatedMenuHead span{font-size:11px;color:#6f8193}.compactCreatedMenuList{display:grid;gap:6px}@media(max-width:760px){.compactLibraryGrid .libCard,.compactCreatedMenuList .libCard{grid-template-columns:1fr!important}.trainingGameCreateBar{align-items:flex-start;flex-direction:column}.trainingGameCreateButton{width:100%}}
`;document.head.appendChild(style);

const observer=new MutationObserver(()=>{installCategoryCreateBar();enhanceCreationView()});observer.observe(document.documentElement,{childList:true,subtree:true});
