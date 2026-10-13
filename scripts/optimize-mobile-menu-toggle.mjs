import {readFile,writeFile} from 'node:fs/promises';

const mainFile=new URL('../src/main.tsx',import.meta.url);
const cssFile=new URL('../src/styles.css',import.meta.url);
let source=await readFile(mainFile,'utf8');
let css=await readFile(cssFile,'utf8');

if(!source.includes('KTRS_MOBILE_MENU_TOGGLE_V1')){
  source=source.replace(
    "function Shell({profile,isAdmin,screen,setScreen,alerts,onLogout,children}:any){\n const [open,setOpen]=useState<Record<string,boolean>>({TEAM:false,SCHEDULE:false,PERFORMANCE:false,GPS:false,MEDICAL:false,DEVELOPMENT:false,COMMUNICATION:false,MANAGEMENT:false,SET:false});",
    "function Shell({profile,isAdmin,screen,setScreen,alerts,onLogout,children}:any){\n const [open,setOpen]=useState<Record<string,boolean>>({TEAM:false,SCHEDULE:false,PERFORMANCE:false,GPS:false,MEDICAL:false,DEVELOPMENT:false,COMMUNICATION:false,MANAGEMENT:false,SET:false});\n const [mobileMenuOpen,setMobileMenuOpen]=useState(true);"
  );

  source=source.replace(
    ' return <div className="appFrame">',
    " return <div className={'appFrame '+(mobileMenuOpen?'':'mobileMenuCollapsed')}>"
  );

  source=source.replace(
    '<header className="topHeader"><div><b>KTRS FMS</b><span> K-trainers Football Management System</span></div><button className="mobileLogout" onClick={onLogout}>ログアウト</button><div className="user">',
    '<header className="topHeader"><div><b>KTRS FMS</b><span> K-trainers Football Management System</span></div><button className="mobileMenuToggle" type="button" aria-expanded={mobileMenuOpen} onClick={()=>setMobileMenuOpen(v=>!v)}>{mobileMenuOpen?\'− メニュー\':\'☰ メニュー\'}</button><button className="mobileLogout" onClick={onLogout}>ログアウト</button><div className="user">'
  );

  source=source.replace(
    "function PlayerPortal({profile,session,onLogout}:{profile:Profile;session:any;onLogout:()=>void}){\n const [screen,setScreen]=useState<PlayerScreen>('mypage');",
    "function PlayerPortal({profile,session,onLogout}:{profile:Profile;session:any;onLogout:()=>void}){\n const [screen,setScreen]=useState<PlayerScreen>('mypage');\n const [mobileMenuOpen,setMobileMenuOpen]=useState(true);"
  );

  source=source.replace(
    ' return <div className="appFrame playerPortal">',
    " return <div className={'appFrame playerPortal '+(mobileMenuOpen?'':'mobileMenuCollapsed')}>"
  );

  source=source.replace(
    '<header className="topHeader"><div><b>KTRS FMS</b><span> PLAYER PORTAL</span></div><button className="mobileLogout" onClick={onLogout}>ログアウト</button><div className="user">',
    '<header className="topHeader"><div><b>KTRS FMS</b><span> PLAYER PORTAL</span></div><button className="mobileMenuToggle" type="button" aria-expanded={mobileMenuOpen} onClick={()=>setMobileMenuOpen(v=>!v)}>{mobileMenuOpen?\'− メニュー\':\'☰ メニュー\'}</button><button className="mobileLogout" onClick={onLogout}>ログアウト</button><div className="user">'
  );

  source+='\n/* KTRS_MOBILE_MENU_TOGGLE_V1 */\n';
}

if(!css.includes('KTRS_MOBILE_MENU_TOGGLE_V1')){
  css+='\n/* KTRS_MOBILE_MENU_TOGGLE_V1 */\n.mobileMenuToggle{display:none;background:#eef3fa;color:#173454;padding:7px 10px;white-space:nowrap}\n@media(max-width:900px){.appFrame.mobileMenuCollapsed .mainSidebar{display:none}.appFrame.mobileMenuCollapsed{grid-template-columns:minmax(0,1fr)!important}}\n@media(max-width:780px){.topHeader{grid-template-columns:minmax(0,1fr) auto auto!important;gap:6px}.topHeader .mobileMenuToggle{display:inline-flex;align-items:center;justify-content:center}.topHeader .mobileMenuToggle,.topHeader .mobileLogout{font-size:12px;padding:7px 9px}}\n';
}

await Promise.all([writeFile(mainFile,source,'utf8'),writeFile(cssFile,css,'utf8')]);
console.log('Applied mobile menu collapse toggle');
