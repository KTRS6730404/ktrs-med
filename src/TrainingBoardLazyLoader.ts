export {};

let loading:Promise<unknown>|null=null;

function loadBoard(){
  if(!loading) loading=import('./TrainingBoardEnhancer').catch(err=>{loading=null;console.error('Training board load failed',err);throw err});
  return loading;
}

function attachButtons(){
  const pm=document.querySelector<HTMLElement>('.pm');
  if(!pm)return;
  pm.querySelectorAll<HTMLElement>('.menuEditor').forEach(editor=>{
    if(editor.querySelector('.trainingBoardButton,.trainingBoardLazyButton'))return;
    const top=editor.querySelector<HTMLElement>('.menuTop')||editor;
    const b=document.createElement('button');
    b.type='button';
    b.className='trainingBoardLazyButton soft';
    b.textContent='コート図を作成';
    b.addEventListener('click',async()=>{
      b.disabled=true;
      b.textContent='読み込み中...';
      try{
        await loadBoard();
        b.remove();
        await new Promise(r=>window.setTimeout(r,50));
        const real=editor.querySelector<HTMLButtonElement>('.trainingBoardButton');
        real?.click();
      }catch{
        b.disabled=false;
        b.textContent='コート図を作成';
      }
    });
    top.appendChild(b);
  });
}

function schedule(){window.setTimeout(attachButtons,0);window.setTimeout(attachButtons,120)}

document.addEventListener('click',e=>{
  const btn=(e.target as HTMLElement|null)?.closest<HTMLButtonElement>('button');
  if(!btn)return;
  const txt=(btn.textContent||'').trim();
  if(txt.includes('Training/Gameを作成')||txt.includes('新規作成')||txt.includes('メニュー追加')||txt.includes('Training'))schedule();
},true);
window.addEventListener('ktrs-schedule-category',schedule as EventListener);
if(document.querySelector('.pm'))schedule();

const style=document.createElement('style');
style.textContent='.trainingBoardLazyButton{white-space:nowrap;font-size:11px!important;padding:6px 9px!important}.trainingBoardLazyButton:disabled{opacity:.55}';
document.head.appendChild(style);
