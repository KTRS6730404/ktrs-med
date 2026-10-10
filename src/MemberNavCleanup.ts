function removeTeamsFromMember(){
  const sidebar=document.querySelector<HTMLElement>('.mainSidebar:not(.playerNav)');
  if(!sidebar)return;
  const groups=Array.from(sidebar.querySelectorAll<HTMLElement>('.navGroup'));
  const member=groups.find(g=>{
    const txt=(g.querySelector('.navGroupHead .navTitleWithAlert > span')?.textContent||'').trim();
    return txt==='Member'||txt==='TEAM';
  });
  if(!member)return;
  const headLabel=member.querySelector<HTMLElement>('.navGroupHead .navTitleWithAlert > span');
  if(headLabel)headLabel.textContent='Member';
  const children=member.querySelector<HTMLElement>('.navChildren');
  if(!children)return;
  Array.from(children.querySelectorAll<HTMLButtonElement>(':scope > button')).forEach(btn=>{
    if((btn.textContent||'').trim()==='Teams')btn.remove();
  });
}

removeTeamsFromMember();

// Member配下は開いた時にReactが生成されるため、クリック直後だけ数回確認して削除する。
document.addEventListener('click',e=>{
  const target=e.target as HTMLElement|null;
  const head=target?.closest<HTMLElement>('.navGroupHead');
  const txt=(head?.querySelector('.navTitleWithAlert > span')?.textContent||'').trim();
  if(txt!=='Member'&&txt!=='TEAM')return;
  window.setTimeout(removeTeamsFromMember,0);
  window.setTimeout(removeTeamsFromMember,50);
  window.setTimeout(removeTeamsFromMember,150);
},{capture:true});
