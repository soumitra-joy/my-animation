import { useState, useEffect, useRef } from "react";

/* ══════════════════ CONSTANTS ══════════════════ */
const RP = [{ x:318,y:272 },{ x:572,y:272 },{ x:318,y:458 },{ x:572,y:458 }];
const LABELS = ["Rack A","Rack B","Rack C","Rack D"];
const TX = [205, 685, 205, 685];          // thermometer cx
const T_LEFT = [true, false, true, false];
const HOT=68, TMAX=92, TMIN=22, RACK_R=56;
const TUBE_H=104, TUBE_W=17, BULB_R=13;
const W=980, H=650;

/* user objects: position + which cluster they drive */
const USERS = [
  { x:58, y:272, label:"User 1", rack:0 },
  { x:58, y:458, label:"User 2", rack:2 },
  { x:922,y:272, label:"User 3", rack:1 },
  { x:922,y:458, label:"User 4", rack:3 },
];

/* guided tour – user activity drives cluster temps */
const GUIDED = [
  { dur:5500, lv:[.02,.02,.02,.02], name:"OFF-PEAK",
    desc:"All 4 remote users idle. No network requests reaching the data center. All clusters cool — local baseband rings active (0–25 GHz)." },
  { dur:7000, lv:[.90,.02,.02,.02], name:"User 1 active → Rack A heating",
    desc:"User 1 begins heavy workload (AI training). Traffic routed to Rack A — thermometer rising toward the 68 °C VO₂ transition threshold." },
  { dur:7000, lv:[.90,.87,.02,.02], name:"Users 1 & 2 active → SEMI-BUSY",
    desc:"User 2 joins with intensive tasks. Rack C heats up — both left clusters cross 68 °C, VO₂ metallic, first broadband link forms at 175–290 GHz." },
  { dur:6000, lv:[.90,.87,.92,.02], name:"User 3 active → 3-rack mesh",
    desc:"User 3 from right side starts peak demand. Rack B crosses threshold — three-rack broadband mesh now active, topology expanding." },
  { dur:6000, lv:[.92,.88,.92,.88], name:"ALL USERS ACTIVE → PEAK WORKLOAD",
    desc:"All 4 remote users at maximum demand. All clusters above 68 °C — full 6-link broadband mesh active at 175–290 GHz. Maximum throughput." },
  { dur:5000, lv:[.92,.88,.92,.88], name:"PEAK WORKLOAD — sustained",
    desc:"Full peak workload sustained. Every rack interconnected via VO₂ broadband. Data center operating at maximum capacity — all users served." },
  { dur:9000, lv:[.02,.02,.02,.02], name:"Users finishing tasks → Cooling",
    desc:"Users completing workloads — network demand dropping. Clusters cooling below 68 °C. Broadband links dissolving as VO₂ reverts to insulating." },
  { dur:3500, lv:[.02,.02,.02,.02], name:"OFF-PEAK restored",
    desc:"All users idle. Data center returns to energy-efficient baseband-only operation. Cycle complete — ready for next demand surge." },
];

/* ══════════════════ COLOUR ══════════════════ */
function tc(temp, a=1) {
  const t=Math.max(0,Math.min(1,(temp-TMIN)/(TMAX-TMIN)));
  const S=[[0,[38,125,232]],[.36,[38,198,210]],[.53,[195,212,42]],[.63,[255,148,20]],[.82,[255,72,18]],[1,[232,22,22]]];
  let r,g,b;
  for(let i=1;i<S.length;i++){if(t<=S[i][0]){const u=(t-S[i-1][0])/(S[i][0]-S[i-1][0]);[r,g,b]=S[i-1][1].map((v,k)=>Math.round(v+u*(S[i][1][k]-v)));break;}}
  if(r==null)[r,g,b]=S.at(-1)[1];
  return a<1?`rgba(${r},${g},${b},${a})`:`rgb(${r},${g},${b})`;
}

/* ══════════════════ SINGLE SERVER RACK UNIT ══════════════════ */
function ServerRack({ cx, cy, temp }) {
  const RW=26, RH=100, x=cx-RW/2, y=cy-RH/2, hot=temp>=HOT, col=tc(temp);
  return (
    <g>
      {hot&&<rect x={x-3} y={y-3} width={RW+6} height={RH+6} rx={4} fill={tc(temp,.11)}/>}
      {/* cabinet */}
      <rect x={x} y={y} width={RW} height={RH} rx={2}
        fill="rgba(7,13,40,.97)" stroke={hot?tc(temp,.58):"rgba(42,78,162,.28)"} strokeWidth={hot?1.5:.7}/>
      {/* top status bar */}
      <rect x={x} y={y} width={RW} height={8} rx={1} fill={hot?tc(temp,.28):"rgba(18,34,82,.75)"}/>
      <rect x={x+3} y={y+2.5} width={RW-10} height={2.2} rx={1} fill={hot?tc(temp,.42):"rgba(32,60,145,.38)"}/>
      <circle cx={x+RW-4} cy={y+4} r={1.8} fill={hot?col:"rgba(38,118,55,.7)"}/>
      {/* 4 server blades */}
      {[0,1,2,3].map(i=>{
        const sy=y+10+i*21;
        return(<g key={i}>
          <rect x={x+1.5} y={sy} width={RW-3} height={18} rx={1}
            fill="rgba(12,24,60,.92)" stroke="rgba(32,60,140,.33)" strokeWidth=".4"/>
          <rect x={x+3} y={sy+3} width={13} height={3} rx={.5} fill="rgba(22,44,110,.75)"/>
          <rect x={x+3} y={sy+8} width={9}  height={2.5} rx={.5} fill="rgba(22,44,110,.65)"/>
          <rect x={x+3} y={sy+13} width={11} height={2} rx={.5} fill="rgba(22,44,110,.55)"/>
          <circle cx={x+RW-5} cy={sy+5}  r={1.5} fill={hot?tc(temp+(i-1.5)*4):    "rgba(35,112,52,.72)"}/>
          <circle cx={x+RW-5} cy={sy+13} r={1}   fill={hot?"rgba(255,195,55,.55)":"rgba(28,52,118,.48)"}/>
        </g>);
      })}
      {/* cable management bottom */}
      <rect x={x} y={y+RH-6} width={RW} height={6} rx={1} fill="rgba(10,20,52,.72)"/>
      {[0,1,2].map(i=><circle key={i} cx={x+5+i*7} cy={y+RH-3} r={2.4}
        fill="none" stroke="rgba(32,60,140,.38)" strokeWidth=".8"/>)}
    </g>
  );
}

/* ══════════════════ CLUSTER (3 racks + ring animation) ═══════════ */
function ClusterGroup({ ri, temp, animOff }) {
  const cx=RP[ri].x, cy=RP[ri].y, hot=temp>=HOT;
  const rackOffX=[-35,0,35];
  // ring bounding box (outside the 3 racks)
  const rx=52, ry=54;  // half-extents of ring

  return (
    <g>
      {/* DC floor plate */}
      <rect x={cx-55} y={cy+52} width={110} height={4} rx={2} fill="rgba(15,28,68,.55)"/>
      {/* ceiling cable tray */}
      <rect x={cx-50} y={cy-56} width={100} height={5} rx={2} fill="rgba(15,28,68,.45)"/>

      {/* local ring — counterclockwise animated dashes */}
      {/* top arc */}
      <path d={`M ${cx-rx} ${cy-ry} Q ${cx} ${cy-ry-20} ${cx+rx} ${cy-ry}`}
        fill="none" stroke="rgba(60,162,255,.35)" strokeWidth="1.3"
        strokeDasharray="5 4" strokeDashoffset={-animOff*22}/>
      {/* right side */}
      <line x1={cx+rx} y1={cy-ry} x2={cx+rx} y2={cy+ry}
        stroke="rgba(60,162,255,.28)" strokeWidth="1.1"
        strokeDasharray="4 3" strokeDashoffset={-animOff*22}/>
      {/* bottom arc */}
      <path d={`M ${cx+rx} ${cy+ry} Q ${cx} ${cy+ry+20} ${cx-rx} ${cy+ry}`}
        fill="none" stroke="rgba(60,162,255,.35)" strokeWidth="1.3"
        strokeDasharray="5 4" strokeDashoffset={-animOff*22}/>
      {/* left side */}
      <line x1={cx-rx} y1={cy+ry} x2={cx-rx} y2={cy-ry}
        stroke="rgba(60,162,255,.28)" strokeWidth="1.1"
        strokeDasharray="4 3" strokeDashoffset={-animOff*22}/>
      {/* 0-25 GHz label on top arc */}
      <text x={cx} y={cy-ry-24} textAnchor="middle"
        fill="rgba(60,155,255,.32)" fontSize="7" fontFamily="'Courier New',monospace">0–25 GHz</text>

      {/* cluster background */}
      {hot&&<rect x={cx-58} y={cy-58} width={116} height={116} rx={8} fill={tc(temp,.08)}/>}
      <rect x={cx-56} y={cy-56} width={112} height={112} rx={7}
        fill="rgba(6,12,35,.52)"
        stroke={hot?tc(temp,.32):"rgba(32,62,138,.18)"}
        strokeWidth={hot?1.2:.6} strokeDasharray={hot?"":"6 3"}/>

      {/* 3 server racks */}
      {rackOffX.map((off,i)=>(
        <ServerRack key={i} cx={cx+off} cy={cy} temp={temp+(i-1)*2}/>
      ))}

      {/* cluster label */}
      <text x={cx} y={cy+74} textAnchor="middle"
        fill="rgba(65,115,205,.40)" fontSize="10" letterSpacing=".18em"
        fontFamily="'Courier New',monospace">{LABELS[ri]}</text>
    </g>
  );
}

/* ══════════════════ LARGE THERMOMETER ══════════════════ */
function ClusterThermometer({ ri, temp, hot }) {
  const cx=TX[ri], cy=RP[ri].y, left=T_LEFT[ri];
  const topY=cy-TUBE_H/2, pct=Math.max(0,Math.min(1,(temp-TMIN)/(TMAX-TMIN)));
  const fillH=pct*TUBE_H, col=tc(temp), threshY=topY+TUBE_H*(1-(HOT-TMIN)/(TMAX-TMIN));
  return (
    <g>
      {hot&&<><rect x={cx-TUBE_W/2-9} y={topY-7} width={TUBE_W+18} height={TUBE_H+14} rx={TUBE_W/2+9} fill={tc(temp,.09)}/><rect x={cx-TUBE_W/2-4} y={topY-3} width={TUBE_W+8} height={TUBE_H+6} rx={TUBE_W/2+4} fill={tc(temp,.07)}/></>}
      <rect x={cx-TUBE_W/2} y={topY} width={TUBE_W} height={TUBE_H} rx={TUBE_W/2}
        fill="rgba(8,16,46,.97)" stroke={hot?tc(temp,.55):"rgba(48,88,178,.27)"} strokeWidth={hot?1.4:.7}/>
      {fillH>.5&&<rect x={cx-TUBE_W/2+1.8} y={topY+TUBE_H-fillH} width={TUBE_W-3.6} height={fillH} rx={(TUBE_W-3.6)/2} fill={tc(temp,.94)}/>}
      <circle cx={cx} cy={topY+TUBE_H+BULB_R-1} r={BULB_R} fill="rgba(8,16,46,.97)" stroke={hot?tc(temp,.55):"rgba(48,88,178,.27)"} strokeWidth={hot?1.4:.7}/>
      <circle cx={cx} cy={topY+TUBE_H+BULB_R-1} r={BULB_R-2} fill={tc(temp,.94)}/>
      <line x1={cx-TUBE_W/2-9} y1={threshY} x2={cx+TUBE_W/2+9} y2={threshY}
        stroke={hot?"rgba(255,195,45,.95)":"rgba(195,148,38,.50)"} strokeWidth={hot?1.6:1} strokeDasharray="3 2"/>
      <text x={left?cx+TUBE_W/2+13:cx-TUBE_W/2-13} y={threshY+3.5}
        textAnchor={left?"start":"end"} fill={hot?"rgba(255,195,45,.90)":"rgba(185,138,38,.50)"}
        fontSize="8" fontFamily="'Courier New',monospace">68°C</text>
      {[30,50,70,85].map(t=>{
        const ty=topY+TUBE_H*(1-(t-TMIN)/(TMAX-TMIN));
        if(Math.abs(ty-threshY)<9)return null;
        return(<g key={t}>
          {left?<line x1={cx-TUBE_W/2-4} y1={ty} x2={cx-TUBE_W/2} y2={ty} stroke="rgba(48,88,178,.35)" strokeWidth=".7"/>
               :<line x1={cx+TUBE_W/2} y1={ty} x2={cx+TUBE_W/2+4} y2={ty} stroke="rgba(48,88,178,.35)" strokeWidth=".7"/>}
          <text x={left?cx-TUBE_W/2-7:cx+TUBE_W/2+7} y={ty+3.2} textAnchor={left?"end":"start"}
            fill="rgba(58,100,185,.34)" fontSize="7" fontFamily="'Courier New',monospace">{t}°</text>
        </g>);
      })}
      <text x={cx} y={topY-19} textAnchor="middle" fill="rgba(72,132,218,.48)" fontSize="10"
        letterSpacing=".18em" fontFamily="'Courier New',monospace">{LABELS[ri]}</text>
      <text x={cx} y={topY-6} textAnchor="middle" fill={col} fontSize="12" fontWeight="700"
        fontFamily="'Courier New',monospace">{Math.round(temp)}°C</text>
      <text x={cx} y={topY+TUBE_H+BULB_R*2+14} textAnchor="middle"
        fill={hot?col:"rgba(52,90,170,.36)"} fontSize="8" fontWeight="700" letterSpacing=".12em"
        fontFamily="'Courier New',monospace">{hot?"◆ BROADBAND":"○ BASEBAND"}</text>
    </g>
  );
}

/* ══════════════════ PARALLEL BROADBAND LINK ══════════════════ */
function ParallelLink({ ri, rj, animOff }) {
  const p1=RP[ri],p2=RP[rj],dx=p2.x-p1.x,dy=p2.y-p1.y,d=Math.sqrt(dx*dx+dy*dy);
  const nx=dx/d,ny=dy/d,px=-ny,py=nx;
  const x1=p1.x+nx*RACK_R,y1=p1.y+ny*RACK_R,x2=p2.x-nx*RACK_R,y2=p2.y-ny*RACK_R;
  const len=Math.sqrt((x2-x1)**2+(y2-y1)**2),dash=len*.048,gap=len*.036;
  const mx=(x1+x2)/2,my=(y1+y2)/2;
  return(
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,148,28,.07)" strokeWidth="10"/>
      {[-3.8,0,3.8].map((off,i)=>{
        const ox=px*off,oy=py*off;
        return(<g key={i}>
          <line x1={x1+ox} y1={y1+oy} x2={x2+ox} y2={y2+oy} stroke="rgba(255,148,28,.10)" strokeWidth="3.5"/>
          <line x1={x1+ox} y1={y1+oy} x2={x2+ox} y2={y2+oy}
            stroke={i===1?"rgba(255,208,55,.68)":"rgba(255,178,45,.48)"}
            strokeWidth={i===1?1.8:1.3}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-animOff*len*.10-i*dash*.38}/>
        </g>);
      })}
      <circle cx={mx} cy={my} r={3.2} fill="rgba(255,218,75,.82)"/>
      <text x={mx} y={my-9} textAnchor="middle" fill="rgba(255,205,65,.72)"
        fontSize="6.8" fontFamily="'Courier New',monospace">175–290 GHz</text>
    </g>
  );
}

/* ══════════════════ PULSE RING ══════════════════ */
function PulseRing({ cx, cy, color, delay=0 }) {
  const [p,setP]=useState(delay);
  useEffect(()=>{let f,t0=null;const P=2000;
    const r=ts=>{if(!t0)t0=ts-delay*P;setP(((ts-t0)%P)/P);f=requestAnimationFrame(r);};
    f=requestAnimationFrame(r);return()=>cancelAnimationFrame(f);
  },[delay]);
  return <circle cx={cx} cy={cy} r={RACK_R+4+p*34} fill="none" stroke={color} strokeWidth="1.6" opacity={.50*(1-p)}/>;
}

/* ══════════════════ REMOTE USER ICON ══════════════════ */
function RemoteUser({ x, y, level, label }) {
  const active=level>.28, busy=level>.68;
  const personCol = busy?tc(82+level*10,.85):active?"rgba(255,188,42,.82)":"rgba(88,148,220,.72)";
  const screenGlow = active?`rgba(255,${busy?115:200},38,${level*.22})`:"rgba(40,80,200,.05)";
  return(
    <g>
      {active&&<circle cx={x} cy={y} r={42} fill={`rgba(${busy?"255,138,28":"95,175,255"},${level*.12})`}/>}
      {/* person */}
      <circle cx={x} cy={y-42} r={10} fill={personCol} opacity={.88}/>
      <rect x={x-10} y={y-32} width={20} height={18} rx={5} fill={personCol} opacity={.72}/>
      {/* arms on keyboard */}
      <rect x={x-18} y={y-14} width={8} height={12} rx={3} fill={personCol} opacity={.55}/>
      <rect x={x+10} y={y-14} width={8} height={12} rx={3} fill={personCol} opacity={.55}/>
      {/* monitor */}
      <rect x={x-22} y={y-22} width={44} height={28} rx={3}
        fill="rgba(8,18,50,.94)"
        stroke={active?(busy?"rgba(255,145,28,.68)":"rgba(255,198,50,.52)"):"rgba(50,90,180,.35)"}
        strokeWidth="1.1"/>
      {/* screen */}
      <rect x={x-19} y={y-19} width={38} height={22} rx={2} fill={screenGlow}/>
      {[0,1,2,3].map(i=>(
        <rect key={i} x={x-15} y={y-16+i*4.5} width={active?18+i*3:10} height={2} rx={.8}
          fill={active?(busy?"rgba(255,168,38,.62)":"rgba(195,228,95,.55)"):"rgba(68,118,222,.22)"}/>
      ))}
      {/* stand */}
      <rect x={x-3} y={y+6} width={6} height={7} fill="rgba(25,45,108,.55)"/>
      {/* desk */}
      <rect x={x-24} y={y+13} width={48} height={3} rx={1} fill="rgba(18,32,78,.65)"/>
      {/* keyboard */}
      <rect x={x-18} y={y+16} width={36} height={9} rx={2}
        fill="rgba(14,28,72,.75)" stroke="rgba(40,72,155,.28)" strokeWidth=".5"/>
      {[0,1,2].map(i=>(
        <rect key={i} x={x-14+i*11} y={y+18} width={9} height={5} rx={1}
          fill="rgba(22,42,100,.82)"/>
      ))}
      {/* status badge */}
      <text x={x} y={y-58} textAnchor="middle"
        fill={busy?"rgba(255,105,28,.92)":active?"rgba(255,198,50,.88)":"rgba(82,142,218,.52)"}
        fontSize="8.5" fontWeight={active?"700":"400"}
        fontFamily="'Courier New',monospace" letterSpacing=".10em">
        {busy?"HEAVY LOAD":active?"ACTIVE":"IDLE"}
      </text>
      <text x={x} y={y+32} textAnchor="middle"
        fill="rgba(68,118,208,.44)" fontSize="8.5"
        fontFamily="'Courier New',monospace" letterSpacing=".1em">{label}</text>
    </g>
  );
}

/* ══════════════════ INTERNET CONNECTION LINE ══════════════════ */
function InternetLine({ user, level, animOff }) {
  const isLeft=user.x<400;
  const x1=isLeft?user.x+28:user.x-28, y1=user.y;
  const x2=isLeft?RP[user.rack].x-RACK_R+8:RP[user.rack].x+RACK_R-8, y2=user.y;
  const active=level>.25;
  const dx=x2-x1, len=Math.abs(dx);
  const mx=(x1+x2)/2, my=y1;
  const numPkts=active?Math.min(4,Math.ceil(level*4.5)):0;
  return(
    <g>
      {/* glow */}
      {active&&<line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={`rgba(255,175,40,${level*.12})`} strokeWidth="6"/>}
      {/* dashed internet line */}
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={active?"rgba(255,175,40,.42)":"rgba(52,90,178,.18)"}
        strokeWidth={active?1.6:.9} strokeDasharray="7 5"/>
      {/* INTERNET label */}
      <text x={mx} y={my-9} textAnchor="middle"
        fill={active?"rgba(255,185,42,.45)":"rgba(52,90,178,.22)"}
        fontSize="7.5" letterSpacing=".18em" fontFamily="'Courier New',monospace">INTERNET</text>
      {/* animated data packets */}
      {Array.from({length:numPkts},(_,i)=>{
        const t=((animOff*.28+i/numPkts)%1.0);
        const px=x1+dx*t;
        return <circle key={i} cx={px} cy={y1} r={2.8}
          fill={`rgba(255,210,55,${.65+level*.25})`}/>;
      })}
    </g>
  );
}

/* ══════════════════ STATUS BAR (top of SVG) ══════════════════ */
function StatusBar({ phaseIdx, name, desc, clusterTemps, userLevels, mode, guidedPct }) {
  const scol=["#52c4ff","#ffc938","#ff6720"][phaseIdx];
  const sbg=["rgba(4,12,50,.94)","rgba(56,42,0,.94)","rgba(60,12,0,.94)"][phaseIdx];
  return(
    <g>
      <rect x={0} y={0} width={W} height={82} fill={sbg}/>
      <rect x={0} y={80} width={W} height={2} fill={scol} opacity={.42}/>
      {/* state name */}
      <text x={26} y={32} fill={scol} fontSize="22" fontWeight="700"
        fontFamily="'Courier New',monospace" letterSpacing=".07em">{name}</text>
      {/* description */}
      <text x={26} y={56} fill={scol} fontSize="12.5" opacity={.78}
        fontFamily="'Courier New',monospace">{desc}</text>
      {/* guided progress bar */}
      {mode==="guided"&&(
        <>
          <rect x={26} y={68} width={480} height={3} rx={1.5} fill="rgba(28,52,128,.4)"/>
          <rect x={26} y={68} width={guidedPct*480} height={3} rx={1.5} fill={scol} opacity={.6}/>
        </>
      )}
      {/* cluster temp indicators */}
      {clusterTemps.map((t,i)=>{
        const hot=t>=HOT, cx=680+i*42;
        return(<g key={i}>
          <circle cx={cx} cy={28} r={13}
            fill={hot?tc(t,.24):"rgba(16,30,78,.5)"}
            stroke={hot?tc(t,.72):"rgba(42,78,152,.28)"} strokeWidth="1.2"/>
          <text x={cx} y={32} textAnchor="middle" fill={hot?tc(t):"rgba(72,115,198,.42)"}
            fontSize="8" fontFamily="'Courier New',monospace">{LABELS[i].replace("Rack","")}</text>
          <text x={cx} y={55} textAnchor="middle" fill={hot?tc(t,.72):"rgba(52,92,172,.32)"}
            fontSize="9" fontWeight={hot?"700":"400"} fontFamily="'Courier New',monospace">
            {Math.round(t)}°</text>
        </g>);
      })}
      {/* user activity dots */}
      {userLevels.map((l,i)=>{
        const act=l>.28, cx=860+i*26;
        return(<g key={i}>
          <circle cx={cx} cy={28} r={8}
            fill={act?`rgba(255,175,40,${.15+l*.22})`:"rgba(16,30,78,.4)"}
            stroke={act?"rgba(255,180,42,.52)":"rgba(42,78,152,.22)"} strokeWidth="1"/>
          <text x={cx} y={32} textAnchor="middle"
            fill={act?"rgba(255,200,58,.80)":"rgba(65,105,172,.32)"}
            fontSize="6.5" fontFamily="'Courier New',monospace">U{i+1}</text>
        </g>);
      })}
      <text x={850} y={60} fill="rgba(72,108,185,.35)" fontSize="8"
        fontFamily="'Courier New',monospace" letterSpacing=".12em">CLUSTERS  USERS</text>
    </g>
  );
}

/* ══════════════════ APP ══════════════════ */
function makeAutoUsers() {
  return [0,1,2,3].map(i=>({
    level:i<2?.82+i*.04:.03, countdown:3200+i*1600,
    target:i<2?.82+i*.04:.03
  }));
}

export default function App() {
  const [mode,setMode]=useState("guided");
  const [cTemps,setCTemps]=useState([TMIN+3,TMIN+3,TMIN+3,TMIN+3]);
  const [uLevels,setULevels]=useState([.02,.02,.02,.02]);
  const [animOff,setAnimOff]=useState(0);
  const [gPhase,setGPhase]=useState(0);
  const [gPct,setGPct]=useState(0);
  const modeRef=useRef("guided"), gPhaseRef=useRef(0), gElapsed=useRef(0);
  const autoU=useRef(makeAutoUsers());

  const switchMode=m=>{setMode(m);modeRef.current=m;
    if(m==="guided"){gPhaseRef.current=0;gElapsed.current=0;setGPhase(0);setGPct(0);}};

  useEffect(()=>{let f;const r=()=>{setAnimOff(a=>a+.016);f=requestAnimationFrame(r);};
    f=requestAnimationFrame(r);return()=>cancelAnimationFrame(f);},[]);

  useEffect(()=>{
    const id=setInterval(()=>{
      const DT=80;
      let tgtLv;
      if(modeRef.current==="guided"){
        gElapsed.current+=DT;
        if(gElapsed.current>=GUIDED[gPhaseRef.current].dur){
          gElapsed.current=0;
          gPhaseRef.current=(gPhaseRef.current+1)%GUIDED.length;
          setGPhase(gPhaseRef.current);
        }
        setGPct(gElapsed.current/GUIDED[gPhaseRef.current].dur);
        tgtLv=GUIDED[gPhaseRef.current].lv;
      } else {
        autoU.current=autoU.current.map(u=>{
          const nu={...u,countdown:u.countdown-DT};
          if(nu.countdown<=0){
            const goHot=nu.level<.3;
            nu.level=nu.target=goHot?.78+Math.random()*.18:.02+Math.random()*.05;
            nu.countdown=goHot?9000+Math.random()*7000:2000+Math.random()*3500;
          }
          return nu;
        });
        tgtLv=autoU.current.map(u=>u.target);
      }
      setULevels(prev=>prev.map((l,i)=>l+(tgtLv[i]-l)*.08));
      setCTemps(prev=>prev.map((t,ri)=>{
        const ui=USERS.findIndex(u=>u.rack===ri);
        const tgt=TMIN+tgtLv[ui]*(TMAX-TMIN);
        return Math.max(TMIN-2,Math.min(TMAX+2,t+(tgt-t)*.055+(Math.random()-.5)*.2));
      }));
    },80);
    return()=>clearInterval(id);
  },[]);

  const hotSet=new Set(cTemps.map((t,i)=>t>=HOT?i:-1).filter(i=>i>=0));
  const hotArr=[...hotSet];
  const links=[];
  for(let i=0;i<hotArr.length;i++) for(let j=i+1;j<hotArr.length;j++) links.push([hotArr[i],hotArr[j]]);
  const phaseIdx=hotSet.size===0?0:hotSet.size<=2?1:2;
  const actUCnt=uLevels.filter(l=>l>.35).length;

  const sName=mode==="guided"?GUIDED[gPhase].name:
    ["◉  OFF-PEAK","◉  SEMI-BUSY","⚡  PEAK WORKLOAD"][phaseIdx];
  const sDesc=mode==="guided"?GUIDED[gPhase].desc:
    phaseIdx===0?"No active users. All clusters cool — data center in energy-saving baseband-only mode (0–25 GHz).":
    phaseIdx===1?`${actUCnt} remote user${actUCnt!==1?"s":""} active. ${hotSet.size} cluster${hotSet.size!==1?"s":""} above 68°C — VO₂ metallic, broadband links forming at 175–290 GHz.`:
    `${actUCnt} users at peak demand. All ${hotSet.size} clusters connected — full broadband mesh active at 175–290 GHz. Maximum throughput.`;

  return (
    <div style={{background:"#060710",minHeight:"100vh",display:"flex",flexDirection:"column",
      fontFamily:"'Courier New',monospace",color:"#bccfe8",userSelect:"none"}}>

      {/* ── mode tabs ── */}
      <div style={{padding:"8px 22px 6px",borderBottom:"1px solid rgba(45,80,182,.18)",
        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:9.5,letterSpacing:".28em",color:"rgba(62,148,255,.42)",textTransform:"uppercase"}}>
          sp-SIW · VO₂ Phase-Change Interconnect · UNC Charlotte ECE
        </div>
        <div style={{display:"flex",border:"1px solid rgba(48,85,188,.22)",borderRadius:5,overflow:"hidden"}}>
          {[{id:"guided",icon:"▶",label:"Guided Tour"},{id:"auto",icon:"⟳",label:"Auto Random"}]
            .map(({id,icon,label})=>(
              <button key={id} onClick={()=>switchMode(id)} style={{
                padding:"6px 18px",fontSize:11,cursor:"pointer",letterSpacing:".10em",
                textTransform:"uppercase",border:"none",transition:"all .22s",
                borderRight:id==="guided"?"1px solid rgba(48,85,188,.22)":"none",
                background:mode===id?(id==="guided"?"rgba(18,52,135,.7)":"rgba(88,28,5,.7)"):"rgba(6,10,30,.5)",
                color:mode===id?(id==="guided"?"#72caff":"#ff9055"):"rgba(65,98,172,.45)",
                fontWeight:mode===id?"700":"400",
              }}>{icon} {label}</button>
            ))}
        </div>
      </div>

      {/* ── full SVG ── */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 8px 8px"}}>
        <svg viewBox={`0 0 ${W} ${H}`}
          style={{width:"100%",maxWidth:W,height:"auto",display:"block"}}>

          {/* grid */}
          <defs>
            <pattern id="gp" width="38" height="38" patternUnits="userSpaceOnUse">
              <path d="M38 0L0 0 0 38" fill="none" stroke="#3a72b8" strokeWidth=".4"/>
            </pattern>
            {RP.map((_,ri)=>(
              <radialGradient key={ri} id={`rh${ri}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={tc(cTemps[ri])} stopOpacity=".24"/>
                <stop offset="100%" stopColor={tc(cTemps[ri])} stopOpacity="0"/>
              </radialGradient>
            ))}
          </defs>
          <rect width={W} height={H} fill="rgba(4,6,18,1)"/>
          <rect y={82} width={W} height={H-82} fill="url(#gp)" opacity=".042"/>

          {/* DATA CENTER boundary */}
          <rect x={178} y={175} width={544} height={418} rx={10}
            fill="rgba(5,10,30,.0)"
            stroke="rgba(38,72,158,.18)" strokeWidth="1.2" strokeDasharray="8 4"/>
          <text x={450} y={612} textAnchor="middle"
            fill="rgba(50,88,168,.25)" fontSize="11" letterSpacing=".3em"
            fontFamily="'Courier New',monospace">DATA CENTER</text>

          {/* internet connection lines (rendered first, under everything) */}
          {USERS.map((u,i)=>(
            <InternetLine key={i} user={u} level={uLevels[i]} animOff={animOff}/>
          ))}

          {/* broadband cross-links */}
          {links.map(([ri,rj])=>(
            <ParallelLink key={`${ri}-${rj}`} ri={ri} rj={rj} animOff={animOff}/>
          ))}

          {/* rack glow halos + pulse rings */}
          {RP.map((rp,ri)=>{
            const hot=hotSet.has(ri);
            return(<g key={ri}>
              {hot&&<circle cx={rp.x} cy={rp.y} r={72} fill={`url(#rh${ri})`}/>}
              {hot&&<PulseRing cx={rp.x} cy={rp.y} color={tc(cTemps[ri],.62)} delay={ri*.28}/>}
            </g>);
          })}

          {/* cluster groups (server racks) */}
          {RP.map((_,ri)=>(
            <ClusterGroup key={ri} ri={ri} temp={cTemps[ri]} animOff={animOff}/>
          ))}

          {/* thermometers */}
          {RP.map((_,ri)=>(
            <ClusterThermometer key={ri} ri={ri} temp={cTemps[ri]} hot={hotSet.has(ri)}/>
          ))}

          {/* remote users */}
          {USERS.map((u,i)=>(
            <RemoteUser key={i} x={u.x} y={u.y} level={uLevels[i]} label={u.label}/>
          ))}

          {/* legend */}
          <g transform="translate(190,630)">
            <path d="M0 0 Q18 -8 36 0" fill="none" stroke="rgba(60,162,255,.38)" strokeWidth="1.2" strokeDasharray="4 3"/>
            <text x={42} y={4} fill="rgba(60,162,255,.48)" fontSize="8.5" fontFamily="'Courier New',monospace">Local baseband ring  0–25 GHz (always active)</text>
            <g transform="translate(0,13)">
              {[-3.8,0,3.8].map((off,i)=>(
                <line key={i} x1={0} y1={off} x2={36} y2={off}
                  stroke={i===1?"rgba(255,208,55,.68)":"rgba(255,178,45,.48)"}
                  strokeWidth={i===1?1.7:1.2} strokeDasharray="5 4"/>
              ))}
              <text x={42} y={4} fill="rgba(255,192,52,.58)" fontSize="8.5" fontFamily="'Courier New',monospace">Cross-rack broadband  175–290 GHz (hot clusters only · 3 parallel streams)</text>
            </g>
            <g transform="translate(0,26)">
              <circle cx={8} cy={0} r={2.8} fill="rgba(255,212,55,.82)"/>
              <line x1={0} y1={0} x2={36} y2={0} stroke="rgba(255,175,40,.40)" strokeWidth="1.5" strokeDasharray="7 5"/>
              <text x={42} y={4} fill="rgba(255,175,40,.50)" fontSize="8.5" fontFamily="'Courier New',monospace">Internet traffic from remote users  (animated packets = active data flow)</text>
            </g>
          </g>

          {/* status bar rendered last (on top) */}
          <StatusBar phaseIdx={phaseIdx} name={sName} desc={sDesc}
            clusterTemps={cTemps} userLevels={uLevels} mode={mode} guidedPct={gPct}/>
        </svg>
      </div>
    </div>
  );
}