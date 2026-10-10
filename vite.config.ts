import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as ts from 'typescript';

const PROFILE_TYPE=`type Profile={id:string;role:'player'|'staff';full_name:string;school_grade:number|null;position:string|null;jersey_number:number|null;height_cm:number|null;weight_kg:number|null;dominant_foot:string|null;origin_team:string|null;avatar_path:string|null;player_registration_number:string|null;staff_title:string|null;team_id:number|null};`;
const TITLE_HELPER=`function Title({t}:{t:string;s?:string}){return <div className="title"><h1>{t}</h1></div>}`;
const STATUS_HELPERS=`const statusLabel:Record<string,string>={needs_attention:'要対応',rehab:'リハビリ中',observation:'経過観察',available:'問題なし'};\nconst statusClass:Record<string,string>={needs_attention:'danger',rehab:'info',observation:'warn',available:'ok'};\nconst availabilityLabel:Record<string,string>={out:'参加不可',modified:'別メニュー',partial:'部分参加',full:'通常参加'};`;
const AVATAR_HELPER=`function Avatar({path,name,size=48}:{path?:string|null;name:string;size?:number}){\n const [url,setUrl]=useState('');\n useEffect(()=>{let alive=true;if(!path){setUrl('');return}supabase.storage.from('profile-photos').createSignedUrl(path,3600).then(({data})=>{if(alive)setUrl(data?.signedUrl||'')});return()=>{alive=false}},[path]);\n const initials=(name||'?').slice(0,1);\n return <div className="avatar" style={{width:size,height:size,minWidth:size}}>{url?<img src={url} alt={name}/>:<span>{initials}</span>}</div>;\n}`;

type Extracted=Record<string,string>;
function compileTsx(code:string){
 return ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
}
function splitHeavyPages(){
 const extracted:Extracted={};
 const virtualIds={
   game:'\0ktrs-lazy-game.js',
   video:'\0ktrs-lazy-video.js',
   players:'\0ktrs-lazy-players.js',
   cases:'\0ktrs-lazy-cases.js',
 } as const;
 function spans(source:string,names:string[]){
   const sf=ts.createSourceFile('main.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
   const found:{name:string;start:number;end:number;code:string}[]=[];
   for(const node of sf.statements){
     if(ts.isFunctionDeclaration(node)&&node.name&&names.includes(node.name.text)){
       found.push({name:node.name.text,start:node.getFullStart(),end:node.end,code:source.slice(node.getStart(sf),node.end)});
     }
   }
   return found;
 }
 const wrappers:Record<string,string>={
   GameAnalysis:`const LazyGameAnalysis=React.lazy(()=>import('virtual:ktrs-game'));\nfunction GameAnalysis(props:{profile:Profile|null}){return <React.Suspense fallback={<div className="panel">Game Reviewを読み込み中...</div>}><LazyGameAnalysis {...props}/></React.Suspense>}`,
   VideoClipManager:`const LazyVideoClipManager=React.lazy(()=>import('virtual:ktrs-video'));\nfunction VideoClipManager(props:{profile:Profile|null}){return <React.Suspense fallback={<div className="panel">Videoを読み込み中...</div>}><LazyVideoClipManager {...props}/></React.Suspense>}`,
   Players:`const LazyPlayers=React.lazy(()=>import('virtual:ktrs-players'));\nfunction Players(props:{isAdmin:boolean}){return <React.Suspense fallback={<div className="panel">Playersを読み込み中...</div>}><LazyPlayers {...props}/></React.Suspense>}`,
   Cases:`const LazyCases=React.lazy(()=>import('virtual:ktrs-cases'));\nfunction Cases(props:{isAdmin:boolean}){return <React.Suspense fallback={<div className="panel">Injuryを読み込み中...</div>}><LazyCases {...props}/></React.Suspense>}`,
 };
 return {
   name:'ktrs-split-heavy-pages',
   enforce:'pre' as const,
   resolveId(id:string){
     if(id==='virtual:ktrs-game')return virtualIds.game;
     if(id==='virtual:ktrs-video')return virtualIds.video;
     if(id==='virtual:ktrs-players')return virtualIds.players;
     if(id==='virtual:ktrs-cases')return virtualIds.cases;
   },
   load(id:string){
     const base=`import React,{useEffect,useMemo,useState} from 'react';\nimport {supabase} from '/src/supabase.ts';\n${PROFILE_TYPE}\n${TITLE_HELPER}\n`;
     let code='';
     if(id===virtualIds.game)code=`${base}${AVATAR_HELPER}\n${extracted.GameAnalysis}\nexport default GameAnalysis;`;
     if(id===virtualIds.video)code=`${base}${extracted.VideoClipManager}\nexport default VideoClipManager;`;
     if(id===virtualIds.players)code=`${base}${STATUS_HELPERS}\n${AVATAR_HELPER}\n${extracted.PlayerComprehensiveDashboard}\n${extracted.Players}\nexport default Players;`;
     if(id===virtualIds.cases)code=`${base}${STATUS_HELPERS}\n${extracted.Cases}\nexport default Cases;`;
     return code?compileTsx(code):null;
   },
   transform(source:string,id:string){
     if(!id.endsWith('/src/main.tsx'))return null;
     const names=['GameAnalysis','VideoClipManager','Players','PlayerComprehensiveDashboard','Cases'];
     const parts=spans(source,names);
     for(const p of parts)extracted[p.name]=p.code;
     if(!extracted.GameAnalysis||!extracted.VideoClipManager||!extracted.Players||!extracted.PlayerComprehensiveDashboard||!extracted.Cases){
       this.warn('Heavy page split skipped because one or more functions were not found.');return null;
     }
     let out=source;
     for(const p of [...parts].sort((a,b)=>b.start-a.start)){
       const replacement=p.name==='PlayerComprehensiveDashboard'?'':wrappers[p.name]||'';
       out=out.slice(0,p.start)+replacement+out.slice(p.end);
     }
     return {code:out,map:null};
   },
 };
}

export default defineConfig({
  plugins: [splitHeavyPages(),react()],
  base: '/ktrs-med/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
        },
      },
    },
  },
});
