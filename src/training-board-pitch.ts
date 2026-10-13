export const BOARD_W=800;
export const BOARD_H=500;

const FULL_H=500;
const FULL_SCALE=FULL_H/68;
const FULL_W=105*FULL_SCALE;
const FULL_X=(BOARD_W-FULL_W)/2;
const FULL_Y=0;
const FULL_CX=BOARD_W/2;
const FULL_CY=BOARD_H/2;

const PENALTY_DEPTH_M=16.5;
const PENALTY_WIDTH_M=40.32;
const GOAL_AREA_DEPTH_M=5.5;
const GOAL_AREA_WIDTH_M=18.32;
const GOAL_WIDTH_M=7.32;
const PENALTY_MARK_M=11;
const CIRCLE_R_M=9.15;
const CORNER_R_M=1;

function n(v:number){return Number(v.toFixed(2))}
function rect(x:number,y:number,w:number,h:number,extra=''){return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${extra}/>`}
function arcOffset(scale:number){const r=CIRCLE_R_M*scale,d=(PENALTY_DEPTH_M-PENALTY_MARK_M)*scale;return Math.sqrt(Math.max(0,r*r-d*d))}

function fullPitch(){
 const s=FULL_SCALE;
 const right=FULL_X+FULL_W,top=FULL_Y,bottom=FULL_Y+FULL_H;
 const penaltyDepth=PENALTY_DEPTH_M*s,penaltyWidth=PENALTY_WIDTH_M*s;
 const goalAreaDepth=GOAL_AREA_DEPTH_M*s,goalAreaWidth=GOAL_AREA_WIDTH_M*s;
 const goalWidth=GOAL_WIDTH_M*s,penaltyMark=PENALTY_MARK_M*s;
 const centerR=CIRCLE_R_M*s,cornerR=CORNER_R_M*s;
 const paTop=FULL_CY-penaltyWidth/2,gaTop=FULL_CY-goalAreaWidth/2,goalTop=FULL_CY-goalWidth/2;
 const stripeCount=14;
 const stripes=Array.from({length:stripeCount},(_,i)=>{const w=FULL_W/stripeCount;return rect(FULL_X+i*w,FULL_Y,w,FULL_H,`fill="${i%2?'#3f9a36':'#53aa3e'}" stroke="none"`)}).join('');
 const off=arcOffset(s);
 const leftArcX=FULL_X+penaltyDepth,leftMarkX=FULL_X+penaltyMark;
 const rightArcX=right-penaltyDepth,rightMarkX=right-penaltyMark;
 const penaltyArcs=`<path d="M ${n(leftArcX)} ${n(FULL_CY-off)} A ${n(centerR)} ${n(centerR)} 0 0 1 ${n(leftArcX)} ${n(FULL_CY+off)} M ${n(rightArcX)} ${n(FULL_CY+off)} A ${n(centerR)} ${n(centerR)} 0 0 1 ${n(rightArcX)} ${n(FULL_CY-off)}"/>`;
 const corners=`<path d="M ${n(FULL_X)} ${n(top+cornerR)} A ${n(cornerR)} ${n(cornerR)} 0 0 0 ${n(FULL_X+cornerR)} ${n(top)} M ${n(right-cornerR)} ${n(top)} A ${n(cornerR)} ${n(cornerR)} 0 0 0 ${n(right)} ${n(top+cornerR)} M ${n(FULL_X)} ${n(bottom-cornerR)} A ${n(cornerR)} ${n(cornerR)} 0 0 1 ${n(FULL_X+cornerR)} ${n(bottom)} M ${n(right-cornerR)} ${n(bottom)} A ${n(cornerR)} ${n(cornerR)} 0 0 1 ${n(right)} ${n(bottom-cornerR)}"/>`;
 const lines=`<g class="pitchLines" stroke="white" stroke-width="2.4" fill="none" opacity=".98">${rect(FULL_X,FULL_Y,FULL_W,FULL_H)}<line x1="${FULL_CX}" y1="${top}" x2="${FULL_CX}" y2="${bottom}"/><circle cx="${FULL_CX}" cy="${FULL_CY}" r="${n(centerR)}"/><circle cx="${FULL_CX}" cy="${FULL_CY}" r="3" fill="white" stroke="none"/>${rect(FULL_X,paTop,penaltyDepth,penaltyWidth)}${rect(FULL_X,gaTop,goalAreaDepth,goalAreaWidth)}${rect(right-penaltyDepth,paTop,penaltyDepth,penaltyWidth)}${rect(right-goalAreaDepth,gaTop,goalAreaDepth,goalAreaWidth)}<circle cx="${n(leftMarkX)}" cy="${FULL_CY}" r="3" fill="white" stroke="none"/><circle cx="${n(rightMarkX)}" cy="${FULL_CY}" r="3" fill="white" stroke="none"/>${penaltyArcs}${corners}</g>`;
 const goals=`<g stroke="white" stroke-width="2" fill="none" opacity=".96">${rect(Math.max(0,FULL_X-13),goalTop,13,goalWidth)}${rect(right,goalTop,Math.min(13,BOARD_W-right),goalWidth)}</g>`;
 return `<rect width="${BOARD_W}" height="${BOARD_H}" fill="#2d7f31"/>${stripes}${lines}${goals}`;
}

function halfPitch(){
 // Left-side half of the 105x68m pitch, rotated 90° clockwise.
 // Result: goal at the top and attack direction from bottom to top.
 const halfLengthM=52.5;
 const s=BOARD_H/halfLengthM;
 const fieldW=68*s,fieldH=halfLengthM*s;
 const x=(BOARD_W-fieldW)/2,y=0,cx=BOARD_W/2,bottom=y+fieldH;
 const penaltyDepth=PENALTY_DEPTH_M*s,penaltyWidth=PENALTY_WIDTH_M*s;
 const goalAreaDepth=GOAL_AREA_DEPTH_M*s,goalAreaWidth=GOAL_AREA_WIDTH_M*s;
 const goalWidth=GOAL_WIDTH_M*s,penaltyMark=PENALTY_MARK_M*s;
 const centerR=CIRCLE_R_M*s,cornerR=CORNER_R_M*s;
 const paX=cx-penaltyWidth/2,gaX=cx-goalAreaWidth/2,goalX=cx-goalWidth/2;
 const stripeCount=10;
 const stripes=Array.from({length:stripeCount},(_,i)=>{const h=fieldH/stripeCount;return rect(x,y+i*h,fieldW,h,`fill="${i%2?'#3f9a36':'#53aa3e'}" stroke="none"`)}).join('');
 const off=arcOffset(s),arcY=y+penaltyDepth,markY=y+penaltyMark;
 const penaltyArc=`<path d="M ${n(cx-off)} ${n(arcY)} A ${n(centerR)} ${n(centerR)} 0 0 0 ${n(cx+off)} ${n(arcY)}"/>`;
 const centerArc=`<path d="M ${n(cx-centerR)} ${n(bottom)} A ${n(centerR)} ${n(centerR)} 0 0 0 ${n(cx+centerR)} ${n(bottom)}"/>`;
 const corners=`<path d="M ${n(x)} ${n(y+cornerR)} A ${n(cornerR)} ${n(cornerR)} 0 0 0 ${n(x+cornerR)} ${n(y)} M ${n(x+fieldW-cornerR)} ${n(y)} A ${n(cornerR)} ${n(cornerR)} 0 0 0 ${n(x+fieldW)} ${n(y+cornerR)}"/>`;
 const lines=`<g class="pitchLines" stroke="white" stroke-width="2.4" fill="none" opacity=".98">${rect(x,y,fieldW,fieldH)}${rect(paX,y,penaltyWidth,penaltyDepth)}${rect(gaX,y,goalAreaWidth,goalAreaDepth)}<circle cx="${n(cx)}" cy="${n(markY)}" r="3" fill="white" stroke="none"/>${penaltyArc}${centerArc}${corners}</g>`;
 const goalDepth=Math.min(14,y+14);
 const goal=`<g stroke="white" stroke-width="2" fill="none" opacity=".96">${rect(goalX,Math.max(0,y-goalDepth),goalWidth,goalDepth)}</g>`;
 return `<rect width="${BOARD_W}" height="${BOARD_H}" fill="#203d25"/>${stripes}${lines}${goal}`;
}

export function pitchMarkup(half=false){return half?halfPitch():fullPitch()}
