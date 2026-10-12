import {readFile,writeFile} from 'node:fs/promises';

const file=new URL('../src/TrainingBoardEnhancer.tsx',import.meta.url);
let source=await readFile(file,'utf8');

if(!source.includes("from './training-board-pitch'")){
  source=source.replace("import {supabase} from './supabase';", "import {supabase} from './supabase';\nimport {pitchMarkup} from './training-board-pitch';");
}

const nextPitch=`function Pitch({half}:{half:boolean}){return <g dangerouslySetInnerHTML={{__html:pitchMarkup(half)}}/>}`;
const pitchPattern=/function Pitch\(\{half\}:\{half:boolean\}\)\{return <g className="pitchLines"[\s\S]*?<\/g>\}/;
if(pitchPattern.test(source)) source=source.replace(pitchPattern,nextPitch);
else if(!source.includes('dangerouslySetInnerHTML={{__html:pitchMarkup(half)}}')) throw new Error('Pitch component not found');

await writeFile(file,source,'utf8');
console.log('Applied shared 105x68 pitch design to TrainingBoardEnhancer.tsx');
