function cleanTeamNav(){
  const sidebar=document.querySelector<HTMLElement>('.mainSidebar:not(.playerNav)');
  if(!sidebar)return;
  const groups=Array.from(sidebar.querySelectorAll<HTMLElement>('.navGroup'));
  const team=groups.find(g=>{
    const txt=(g.querySelector('.navGroupHead .navTitleWithAlert > span')?.textContent||'').trim();
    return txt==='Team'||txt==='TEAM'||txt==='Member';
  });
  if(!team)return;
  const headLabel=team.querySelector<HTMLElement>('.navGroupHead .navTitleWithAlert > span');
  if(headLabel)headLabel.textContent='Team';
  const children=team.querySelector<HTMLElement>('.navChildren');
  if(!children)return;
  Array.from(children.querySelectorAll<HTMLButtonElement>(':scope > button')).forEach(btn=>{
    if((btn.textContent||'').trim()==='Teams')btn.remove();
  });
}

cleanTeamNav();

document.addEventListener('click',e=>{
  const target=e.target as HTMLElement|null;
  const head=target?.closest<HTMLElement>('.navGroupHead');
  const txt=(head?.querySelector('.navTitleWithAlert > span')?.textContent||'').trim();
  if(txt!=='Team'&&txt!=='TEAM'&&txt!=='Member')return;
  window.setTimeout(cleanTeamNav,0);
  window.setTimeout(cleanTeamNav,50);
  window.setTimeout(cleanTeamNav,150);
},{capture:true});
