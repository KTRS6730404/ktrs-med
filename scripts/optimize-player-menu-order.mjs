import {readFile,writeFile} from 'node:fs/promises';

const file=new URL('../src/main.tsx',import.meta.url);
let source=await readFile(file,'utf8');

const medical="   {key:'MEDICAL',label:'MEDICAL',items:[['condition','朝のコンディション'],['report','ケガの報告'],['history','ケガの履歴'],['medical','現在の傷害'],['rehab','リハビリ'],['rtp','Return to Play']]},";
const performance="   {key:'PERFORMANCE',label:'PERFORMANCE',items:[['physical','フィジカル'],['gps','GPS']]},";

const oldOrder=medical+'\n'+performance;
const newOrder=performance+'\n'+medical;

if(source.includes(oldOrder)){
  source=source.replace(oldOrder,newOrder);
  await writeFile(file,source,'utf8');
  console.log('Swapped player PERFORMANCE and MEDICAL menu order');
}else if(source.includes(newOrder)){
  console.log('Player menu order already optimized');
}else{
  throw new Error('Player MEDICAL/PERFORMANCE menu block not found');
}
