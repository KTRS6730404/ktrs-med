import {readFile,writeFile} from 'node:fs/promises';

const mainFile=new URL('../src/main.tsx',import.meta.url);
const cssFile=new URL('../src/styles.css',import.meta.url);
let source=await readFile(mainFile,'utf8');
let css=await readFile(cssFile,'utf8');

if(!source.includes('KTRS_MOBILE_LOGOUT_V1')){
  source=source.replace(
    '<header className="topHeader"><div><b>KTRS FMS</b><span> K-trainers Football Management System</span></div><div className="user"><LiveDateTime/><span className="headerUserName">{profile?.full_name||\'\'}</span><button onClick={onLogout}>ログアウト</button></div></header>',
    '<header className="topHeader"><div><b>KTRS FMS</b><span> K-trainers Football Management System</span></div><button className="mobileLogout" onClick={onLogout}>ログアウト</button><div className="user"><LiveDateTime/><span className="headerUserName">{profile?.full_name||\'\'}</span><button onClick={onLogout}>ログアウト</button></div></header>'
  );
  source=source.replace(
    '<header className="topHeader"><div><b>KTRS FMS</b><span> PLAYER PORTAL</span></div><div className="user"><LiveDateTime/><span className="headerUserName">{profile.full_name} さん</span><button onClick={onLogout}>ログアウト</button></div></header>',
    '<header className="topHeader"><div><b>KTRS FMS</b><span> PLAYER PORTAL</span></div><button className="mobileLogout" onClick={onLogout}>ログアウト</button><div className="user"><LiveDateTime/><span className="headerUserName">{profile.full_name} さん</span><button onClick={onLogout}>ログアウト</button></div></header>'
  );
  source+='\n/* KTRS_MOBILE_LOGOUT_V1 */\n';
}

if(!css.includes('KTRS_MOBILE_LOGOUT_V1')){
  css+='\n/* KTRS_MOBILE_LOGOUT_V1 */\n.mobileLogout{display:none;background:#eef3fa;color:#173454;padding:7px 10px;white-space:nowrap}\n@media(max-width:780px){.topHeader{grid-template-columns:minmax(0,1fr) auto!important}.topHeader .mobileLogout{display:inline-flex;align-items:center;justify-content:center}.topHeader>div:first-child{min-width:0}.topHeader>div:first-child span{display:none}}\n';
}

await Promise.all([writeFile(mainFile,source,'utf8'),writeFile(cssFile,css,'utf8')]);
console.log('Applied mobile logout buttons');
