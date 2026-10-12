export {};

function removeCategoryCloseButton(){
  document.querySelectorAll<HTMLElement>('.categoryPageHeader .categoryHeaderActions button').forEach(button=>{
    if((button.textContent||'').trim()==='閉じる')button.remove();
  });
}

removeCategoryCloseButton();

const observer=new MutationObserver(()=>removeCategoryCloseButton());
observer.observe(document.documentElement,{childList:true,subtree:true});
