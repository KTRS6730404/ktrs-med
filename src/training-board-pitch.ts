export const BOARD_W=800;
export const BOARD_H=500;
const FIELD_H=500;
const SCALE=FIELD_H/68;
const FIELD_W=105*SCALE;
const X=(BOARD_W-FIELD_W)/2;
const Y=0;
const CX=BOARD_W/2;
const CY=BOARD_H/2;
const penaltyDepth=16.5*SCALE;
const penaltyWidth=40.32*SCALE;
const goalAreaDepth=5.5*SCALE;
const goalAreaWidth=18.32*SCALE;
const goalWidth=7.32*SCALE;
const penaltyMark=11*SCALE;
const centerR=9.15*SCALE;
const cornerR=1*SCALE;
const stripeCount=14;

function n(v:number){return Number(v.toFixed(2))}
function rect(x:number,y:number,w:number,h:number,extra=''){return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${extra}/>`}

export function pitchMarkup(half=false){
 const right=X+FIELD_W;
 const top=Y,bottom=Y+FIELD_H;
 const paTop=CY-penaltyWidth/2,gaTop=CY-goalAreaWidth/2,goalTop=CY-goalWidth/2;
 const stripes=Array.from({length:stripeCount},(_,i)=>{const w=FIELD_W/stripeCount;return rect(X+i*w,Y,w,FIELD_H,`fill="${i%2?'#3f9a36':'#53aa3e'}" stroke="none"`)}).join('');
 const goals=`<g stroke="white" stroke-width="2" fill="none" opacity=".96">${rect(Math.max(0,X-13),goalTop,13,goalWidth)}${rect(right,goalTop,Math.min(13,BOARD_W-right),goalWidth)}</g>`;
 const corners=`<path d="M ${n(X)} ${n(top+cornerR)} A ${n(cornerR)} ${n(cornerR)} 0 0 0 ${n(X+cornerR)} ${n(top)} M ${n(right-cornerR)} ${n(top)} A ${n(cornerR)} ${n(cornerR)} 0 0 0 ${n(right)} ${n(top+cornerR)} M ${n(X)} ${n(bottom-cornerR)} A ${n(cornerR)} ${n(cornerR)} 0 0 1 ${n(X+cornerR)} ${n(bottom)} M ${n(right-cornerR)} ${n(bottom)} A ${n(cornerR)} ${n(cornerR)} 0 0 1 ${n(right)} ${n(bottom-cornerR)}"/>`;
 const full=`<g class="pitchLines" stroke="white" stroke-width="2.4" fill="none" opacity=".98">${rect(X,Y,FIELD_W,FIELD_H)}<line x1="${CX}" y1="${top}" x2="${CX}" y2="${bottom}"/><circle cx="${CX}" cy="${CY}" r="${n(centerR)}"/><circle cx="${CX}" cy="${CY}" r="3" fill="white" stroke="none"/>${rect(X,paTop,penaltyDepth,penaltyWidth)}${rect(X,gaTop,goalAreaDepth,goalAreaWidth)}${rect(right-penaltyDepth,paTop,penaltyDepth,penaltyWidth)}${rect(right-goalAreaDepth,gaTop,goalAreaDepth,goalAreaWidth)}<circle cx="${n(X+penaltyMark)}" cy="${CY}" r="3" fill="white" stroke="none"/><circle cx="${n(right-penaltyMark)}" cy="${CY}" r="3" fill="white" stroke="none"/>${corners}</g>`;
 const halfLines=`<g class="pitchLines" stroke="white" stroke-width="2.4" fill="none" opacity=".98">${rect(CX,Y,right-CX,FIELD_H)}<path d="M ${CX} ${n(CY-centerR)} A ${n(centerR)} ${n(centerR)} 0 0 1 ${CX} ${n(CY+centerR)}"/>${rect(right-penaltyDepth,paTop,penaltyDepth,penaltyWidth)}${rect(right-goalAreaDepth,gaTop,goalAreaDepth,goalAreaWidth)}<circle cx="${n(right-penaltyMark)}" cy="${CY}" r="3" fill="white" stroke="none"/><path d="M ${n(right-cornerR)} ${top} A ${n(cornerR)} ${n(cornerR)} 0 0 0 ${right} ${n(top+cornerR)} M ${n(right-cornerR)} ${bottom} A ${n(cornerR)} ${n(cornerR)} 0 0 1 ${right} ${n(bottom-cornerR)}"/></g>`;
 const bg=`<rect width="${BOARD_W}" height="${BOARD_H}" fill="#2d7f31"/>${stripes}`;
 return half?`${bg}<rect x="0" y="0" width="${CX}" height="${BOARD_H}" fill="rgba(0,0,0,.18)"/>${halfLines}${goals}`:`${bg}${full}${goals}`;
}
