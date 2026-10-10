import React,{Suspense,lazy} from 'react';

const FmsHubCore=lazy(()=>import('./FmsHubCore'));

export default function FmsHub(props:any){
 return <Suspense fallback={<section><div className="title"><h1>{props.pageTitle||'KTRS FMS'}</h1></div><div className="panel">画面を読み込み中...</div></section>}><FmsHubCore {...props}/></Suspense>;
}
