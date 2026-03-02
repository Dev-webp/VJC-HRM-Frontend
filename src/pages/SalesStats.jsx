import React, { useState, useEffect } from 'react';
import axios from 'axios';

const baseUrl =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://backend.vjcoverseas.com";

/* ─── Inject styles once ──────────────────────────────────────────────── */
const STYLE_ID = 'ss-global-style';
if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Lora:ital,wght@1,400;0,500&display=swap');
        .ss-wrap { font-family:'Sora',sans-serif; }
        @keyframes ssUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ssGrow { from{width:0!important} }
        @keyframes ssGrowH{ from{height:0!important} }
        @keyframes ssRing { from{stroke-dashoffset:339.3} }
        @keyframes ssFade { from{opacity:0} to{opacity:1} }
        .ss-anim { animation:ssUp   .45s cubic-bezier(.22,.68,0,1.2) both; }
        .ss-fade { animation:ssFade .32s ease both; }
        .ss-bar  { animation:ssGrow  .85s cubic-bezier(.22,.68,0,1.2) both; }
        .ss-barH { animation:ssGrowH .75s cubic-bezier(.22,.68,0,1.2) both; }
        .ss-ring { animation:ssRing 1.1s cubic-bezier(.22,.68,0,1.2) both; }
        .ss-kpi  { transition:transform .22s,box-shadow .22s; }
        .ss-kpi:hover { transform:translateY(-5px); box-shadow:0 14px 36px rgba(15,23,42,.10)!important; }
        .ss-row  { transition:background .14s; }
        .ss-row:hover  { background:#F8FAFF!important; }
        .ss-btn  { transition:all .17s; }
        .ss-btn:hover  { transform:translateY(-1px); filter:brightness(1.07); }
        .ss-mcol { transition:all .17s; cursor:pointer; }
        .ss-mcol:hover { transform:translateY(-3px); }
        .ss-mcol:hover .ss-mbar { filter:brightness(1.12)!important; }
        .ss-htab { transition:all .17s; cursor:pointer; }
        .ss-htab:hover { background:#EFF6FF!important; }
        .ss-inp:focus { outline:none!important; border-color:#3B82F6!important; box-shadow:0 0 0 3px rgba(59,130,246,.14)!important; }
        .ss-inp  { transition:border-color .17s,box-shadow .17s; }
        .ss-div  { display:flex;align-items:center;gap:14px;margin:28px 0 16px; }
        .ss-div span { font-size:.67rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#94A3B8;white-space:nowrap; }
        .ss-div::before,.ss-div::after { content:'';flex:1;height:1px;background:#E2E8F0; }
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#F1F5F9;border-radius:99px}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:99px}
    `;
    document.head.appendChild(s);
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const INR   = n => parseFloat(n||0).toLocaleString('en-IN');
const SHORT = n => {
    n = parseFloat(n||0);
    if(n>=1e7) return `₹${(n/1e7).toFixed(1)}Cr`;
    if(n>=1e5) return `₹${(n/1e5).toFixed(1)}L`;
    if(n>=1e3) return `₹${(n/1e3).toFixed(0)}K`;
    return `₹${n}`;
};
const MONTH_LABEL = m => new Date(m+'-01').toLocaleDateString('en-IN',{month:'short',year:'2-digit'});
const MONTH_FULL  = m => new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'});
const TODAY_MONTH = () => new Date().toISOString().slice(0,7);

const TIERS = [
    {min:100,label:'Full Salary Eligible',color:'#10B981',bg:'#D1FAE5',text:'#065F46'},
    {min:75, label:'75% Salary Eligible', color:'#F59E0B',bg:'#FEF3C7',text:'#92400E'},
    {min:50, label:'50% Salary Eligible', color:'#F97316',bg:'#FFEDD5',text:'#7C2D12'},
    {min:25, label:'25% Salary Eligible', color:'#EF4444',bg:'#FEE2E2',text:'#7F1D1D'},
    {min:0,  label:'No Salary Eligible',  color:'#94A3B8',bg:'#F1F5F9',text:'#475569'},
];
const getTier = p => TIERS.find(t=>parseFloat(p)>=t.min)||TIERS[4];
const CAT_CLR = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#EC4899'];

const CARD = {
    background:'#fff',borderRadius:16,padding:'22px 24px',
    boxShadow:'0 2px 12px rgba(15,23,42,.07)',border:'1px solid #E8EEFF',marginBottom:18,
};
const INPUT_S = {
    width:'100%',padding:'11px 14px',border:'1.5px solid #CBD5E1',
    borderRadius:10,fontSize:'0.88rem',fontFamily:'Sora,sans-serif',
    background:'#FAFBFF',color:'#1E293B',boxSizing:'border-box',
};
const FLABEL = {display:'block',fontWeight:600,fontSize:'0.8rem',color:'#64748B',marginBottom:5};
const MICRO  = {fontSize:'0.67rem',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#94A3B8'};

/* ─── Sub-components ───────────────────────────────────────────────────── */
function RingGauge({pct,color,size=130}){
    const r=54, circ=2*Math.PI*r;
    const off=circ-(Math.min(parseFloat(pct),100)/100)*circ;
    return(
        <svg width={size} height={size} viewBox="0 0 120 120">
            <circle fill="none" stroke="#F1F5F9" strokeWidth="12" cx="60" cy="60" r={r}/>
            <circle fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
                cx="60" cy="60" r={r} strokeDasharray={circ} strokeDashoffset={off}
                className="ss-ring" style={{transform:'rotate(-90deg)',transformOrigin:'50% 50%'}}/>
            <text x="60" y="55" textAnchor="middle" fill={color}
                style={{fontFamily:'Sora,sans-serif',fontSize:'19px',fontWeight:800}}>
                {Math.round(parseFloat(pct))}%
            </text>
            <text x="60" y="73" textAnchor="middle" fill="#94A3B8"
                style={{fontFamily:'Sora,sans-serif',fontSize:'10px',fontWeight:500}}>
                achieved
            </text>
        </svg>
    );
}

function Divider({children}){
    return <div className="ss-div"><span>{children}</span></div>;
}

function MiniBar({label,pct,value,count,color}){
    return(
        <div style={{marginBottom:13}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,alignItems:'center'}}>
                <span style={{fontWeight:600,fontSize:'0.87rem',color:'#334155'}}>{label}</span>
                <span style={{fontSize:'0.8rem',color:'#64748B'}}>
                    <strong style={{color:'#1E293B'}}>{value}</strong>&nbsp;·&nbsp;{count} deal{count!==1?'s':''}
                </span>
            </div>
            <div style={{height:10,borderRadius:8,background:'#F1F5F9',overflow:'hidden'}}>
                <div className="ss-bar" style={{height:'100%',borderRadius:8,width:`${Math.min(pct,100)}%`,
                    background:`linear-gradient(90deg,${color},${color}99)`}}/>
            </div>
        </div>
    );
}

/* ─── Monthly History (real-time, from salesEntries only) ──────────────── */
function MonthlyHistory({salesEntries, target}){
    const [selected, setSelected] = useState(null);

    const buildData = () => {
        const map = {};
        salesEntries.forEach(e=>{
            const d   = new Date(e.sale_date);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            if(!map[key]) map[key]={total:0,count:0,entries:[]};
            map[key].total   += parseFloat(e.amount||0);
            map[key].count   += 1;
            map[key].entries.push(e);
        });
        const cur = TODAY_MONTH();
        if(!map[cur]) map[cur]={total:0,count:0,entries:[]};
        return Object.entries(map)
            .sort(([a],[b])=>a.localeCompare(b))
            .map(([month,d],idx,arr)=>{
                const prev   = idx>0 ? arr[idx-1][1].total : null;
                const growth = prev!==null && prev>0 ? ((d.total-prev)/prev*100) : null;
                const pct    = target>0 ? (d.total/target)*100 : 0;
                return {month,...d,growth,pct,tier:getTier(pct)};
            });
    };

    const data    = buildData();
    if(!data.length) return null;
    const maxVal  = Math.max(...data.map(d=>d.total),1);
    const cur     = TODAY_MONTH();
    const selData = selected ? data.find(d=>d.month===selected) : null;
    const best    = [...data].sort((a,b)=>b.total-a.total)[0];

    return(
        <div>
            {/* Summary strip */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:12,marginBottom:18}}>
                {[
                    {label:'Months Tracked', val:data.length,                                 color:'#3B82F6'},
                    {label:'All-time Total',  val:SHORT(data.reduce((s,d)=>s+d.total,0)),      color:'#10B981'},
                    {label:'Best Month',      val:MONTH_LABEL(best.month),                     color:'#F59E0B'},
                    {label:'Best Month Sales',val:SHORT(best.total),                           color:'#8B5CF6'},
                ].map((item,i)=>(
                    <div key={i} style={{background:'#F8FAFF',borderRadius:12,padding:'12px 14px',border:'1px solid #E8EEFF',textAlign:'center'}}>
                        <p style={{...MICRO,margin:'0 0 4px'}}>{item.label}</p>
                        <p style={{margin:0,fontSize:'1.15rem',fontWeight:800,color:item.color}}>{item.val}</p>
                    </div>
                ))}
            </div>

            {/* Bar chart */}
            <div style={{background:'#FAFBFF',borderRadius:14,padding:'20px 16px 12px',border:'1px solid #E8EEFF',marginBottom:16,overflowX:'auto'}}>
                <p style={{...MICRO,margin:'0 0 16px',color:'#64748B'}}>Monthly Sales vs Target — click any bar to drill in</p>
                <div style={{display:'flex',gap:6,alignItems:'flex-end',minHeight:160,minWidth:Math.max(data.length*52,300)}}>
                    {data.map((d)=>{
                        const barH = Math.max((d.total/maxVal)*130, d.total>0?6:2);
                        const isSel = selected===d.month;
                        const isCur = d.month===cur;
                        const clr   = isSel ? '#1D4ED8' : isCur ? '#3B82F6' : d.tier.color;
                        return(
                            <div key={d.month} className="ss-mcol"
                                onClick={()=>setSelected(isSel?null:d.month)}
                                style={{flex:'1 0 44px',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                                {/* Growth arrow */}
                                <div style={{fontSize:'0.63rem',fontWeight:700,minHeight:16,
                                    color:d.growth===null?'transparent':d.growth>=0?'#10B981':'#EF4444'}}>
                                    {d.growth!==null?(d.growth>=0?`▲${d.growth.toFixed(0)}%`:`▼${Math.abs(d.growth).toFixed(0)}%`):''}
                                </div>
                                {/* Bar */}
                                <div className="ss-mbar ss-barH" style={{
                                    width:'100%',height:barH,borderRadius:'6px 6px 0 0',
                                    background:clr,transition:'background .18s',
                                    border:isSel?'2px solid #1D4ED8':'2px solid transparent',
                                    position:'relative',
                                }}>
                                    {d.count>0&&(
                                        <span style={{position:'absolute',top:-18,left:'50%',transform:'translateX(-50%)',
                                            fontSize:'0.58rem',fontWeight:700,color:'#64748B',whiteSpace:'nowrap'}}>
                                            {SHORT(d.total)}
                                        </span>
                                    )}
                                </div>
                                {/* Target hit indicator */}
                                <div style={{width:'100%',height:2,background:d.pct>=100?'#10B98166':'#E2E8F0',borderRadius:1}}/>
                                {/* Label */}
                                <span style={{fontSize:'0.63rem',fontWeight:isCur?800:600,
                                    color:isCur?'#2563EB':'#94A3B8',textAlign:'center',lineHeight:1.2}}>
                                    {MONTH_LABEL(d.month)}
                                    {isCur&&<span style={{display:'block',fontSize:'0.53rem',color:'#3B82F6'}}>NOW</span>}
                                </span>
                            </div>
                        );
                    })}
                </div>
                {target>0&&(
                    <p style={{margin:'8px 0 0',fontSize:'0.72rem',color:'#94A3B8',textAlign:'right'}}>
                        Monthly target: <strong style={{color:'#3B82F6'}}>{SHORT(target)}</strong>
                    </p>
                )}
            </div>

            {/* Drill-down panel */}
            {selData&&(
                <div className="ss-fade" style={{...CARD,background:'linear-gradient(135deg,#EFF6FF,#F8FAFF)',
                    border:`2px solid ${selData.tier.color}44`,marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:14}}>
                        <div>
                            <p style={{...MICRO,margin:'0 0 3px'}}>Month Drill-down</p>
                            <p style={{margin:0,fontWeight:800,fontSize:'1.05rem',color:'#0F172A'}}>{MONTH_FULL(selData.month)}</p>
                        </div>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                            <span style={{padding:'4px 12px',borderRadius:99,background:selData.tier.bg,
                                color:selData.tier.text,fontWeight:700,fontSize:'0.77rem'}}>{selData.tier.label}</span>
                            {selData.month===cur&&(
                                <span style={{padding:'4px 10px',borderRadius:99,background:'#DBEAFE',
                                    color:'#1D4ED8',fontWeight:700,fontSize:'0.72rem'}}>🔴 Live</span>
                            )}
                            <button onClick={()=>setSelected(null)} style={{padding:'4px 10px',border:'1px solid #CBD5E1',
                                borderRadius:8,background:'#fff',color:'#64748B',cursor:'pointer',
                                fontSize:'0.78rem',fontFamily:'Sora,sans-serif',fontWeight:600}}>✕ Close</button>
                        </div>
                    </div>
                    {/* Stats mini cards */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:14}}>
                        {[
                            {label:'Total Sales', val:SHORT(selData.total),                                    color:'#10B981'},
                            {label:'Deals',       val:selData.count||'0',                                      color:'#3B82F6'},
                            {label:'Avg/Deal',    val:selData.count?SHORT(selData.total/selData.count):'₹0',   color:'#8B5CF6'},
                            {label:'vs Target',   val:`${selData.pct.toFixed(1)}%`,                            color:selData.tier.color},
                            ...(selData.growth!==null?[{
                                label:'vs Prev Month',
                                val:selData.growth>=0?`+${selData.growth.toFixed(1)}%`:`${selData.growth.toFixed(1)}%`,
                                color:selData.growth>=0?'#10B981':'#EF4444',
                            }]:[]),
                        ].map((item,i)=>(
                            <div key={i} style={{background:'#fff',borderRadius:10,padding:'10px 12px',
                                border:'1px solid #E8EEFF',textAlign:'center'}}>
                                <p style={{...MICRO,margin:'0 0 3px'}}>{item.label}</p>
                                <p style={{margin:0,fontSize:'1.05rem',fontWeight:800,color:item.color}}>{item.val}</p>
                            </div>
                        ))}
                    </div>
                    {/* Progress */}
                    <div style={{marginBottom:14}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                            <span style={{fontWeight:600,fontSize:'0.82rem',color:'#334155'}}>Achievement vs Target</span>
                            <span style={{fontWeight:700,fontSize:'0.82rem',color:selData.tier.color}}>{selData.pct.toFixed(1)}%</span>
                        </div>
                        <div style={{height:10,borderRadius:99,background:'#F1F5F9',overflow:'hidden'}}>
                            <div style={{height:'100%',borderRadius:99,width:`${Math.min(selData.pct,100)}%`,
                                background:`linear-gradient(90deg,${selData.tier.color},${selData.tier.color}88)`,
                                transition:'width .6s ease'}}/>
                        </div>
                    </div>
                    {/* Transactions */}
                    {selData.entries.length>0?(
                        <div style={{overflowX:'auto',border:'1px solid #E8EEFF',borderRadius:10}}>
                            <table style={{width:'100%',borderCollapse:'collapse'}}>
                                <thead><tr style={{background:'#F8FAFF'}}>
                                    {['Date','Client','Category','Amount','Remarks'].map(h=>(
                                        <th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:'0.65rem',
                                            fontWeight:700,letterSpacing:'.09em',textTransform:'uppercase',
                                            color:'#94A3B8',whiteSpace:'nowrap'}}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {[...selData.entries].sort((a,b)=>new Date(b.sale_date)-new Date(a.sale_date)).map((e,i)=>(
                                        <tr key={i} className="ss-row">
                                            <td style={{padding:'10px 12px',fontSize:'0.83rem',color:'#334155',borderTop:'1px solid #F1F5F9'}}>
                                                {new Date(e.sale_date).toLocaleDateString('en-IN')}
                                            </td>
                                            <td style={{padding:'10px 12px',fontSize:'0.83rem',fontWeight:600,color:'#1E293B',borderTop:'1px solid #F1F5F9'}}>
                                                {e.client_name}
                                            </td>
                                            <td style={{padding:'10px 12px',borderTop:'1px solid #F1F5F9'}}>
                                                <span style={{padding:'2px 9px',borderRadius:99,background:'#EFF6FF',
                                                    color:'#2563EB',fontWeight:700,fontSize:'0.72rem'}}>{e.company}</span>
                                            </td>
                                            <td style={{padding:'10px 12px',fontSize:'0.87rem',fontWeight:800,color:'#10B981',borderTop:'1px solid #F1F5F9'}}>
                                                ₹{INR(e.amount)}
                                            </td>
                                            <td style={{padding:'10px 12px',fontSize:'0.8rem',color:'#94A3B8',borderTop:'1px solid #F1F5F9'}}>
                                                {e.remarks||'—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ):(
                        <div style={{textAlign:'center',padding:'24px',color:'#94A3B8',fontSize:'0.85rem'}}>
                            No sales recorded for {MONTH_FULL(selData.month)} yet.
                        </div>
                    )}
                </div>
            )}

            {/* Month-by-month summary table */}
            <div style={{overflowX:'auto',border:'1px solid #E8EEFF',borderRadius:12}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:480}}>
                    <thead><tr style={{background:'#F8FAFF'}}>
                        {['Month','Total Sales','Deals','Avg/Deal','vs Target','Growth','Status'].map(h=>(
                            <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'0.65rem',
                                fontWeight:700,letterSpacing:'.09em',textTransform:'uppercase',
                                color:'#94A3B8',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                    </tr></thead>
                    <tbody>
                        {[...data].reverse().map((d)=>{
                            const isCur = d.month===cur;
                            const isSel = selected===d.month;
                            return(
                                <tr key={d.month} className="ss-row ss-htab"
                                    onClick={()=>setSelected(isSel?null:d.month)}
                                    style={{background:isSel?'#EFF6FF':isCur?'#F0FDF4':'#fff'}}>
                                    <td style={{padding:'11px 14px',borderTop:'1px solid #F1F5F9'}}>
                                        <span style={{fontWeight:700,fontSize:'0.88rem',color:'#1E293B'}}>{MONTH_FULL(d.month)}</span>
                                        {isCur&&<span style={{marginLeft:6,padding:'1px 7px',borderRadius:99,
                                            background:'#DBEAFE',color:'#1D4ED8',fontWeight:700,fontSize:'0.63rem'}}>LIVE</span>}
                                    </td>
                                    <td style={{padding:'11px 14px',borderTop:'1px solid #F1F5F9',fontWeight:800,color:'#10B981',fontSize:'0.9rem'}}>
                                        {d.total>0?`₹${INR(d.total)}`:<span style={{color:'#CBD5E1'}}>—</span>}
                                    </td>
                                    <td style={{padding:'11px 14px',borderTop:'1px solid #F1F5F9',color:'#334155',fontWeight:600,fontSize:'0.88rem'}}>
                                        {d.count||<span style={{color:'#CBD5E1'}}>0</span>}
                                    </td>
                                    <td style={{padding:'11px 14px',borderTop:'1px solid #F1F5F9',color:'#64748B',fontSize:'0.85rem'}}>
                                        {d.count?SHORT(d.total/d.count):<span style={{color:'#CBD5E1'}}>—</span>}
                                    </td>
                                    <td style={{padding:'11px 14px',borderTop:'1px solid #F1F5F9'}}>
                                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                                            <div style={{width:56,height:7,borderRadius:99,background:'#F1F5F9',overflow:'hidden'}}>
                                                <div style={{height:'100%',borderRadius:99,width:`${Math.min(d.pct,100)}%`,background:d.tier.color}}/>
                                            </div>
                                            <span style={{fontSize:'0.8rem',fontWeight:700,color:d.tier.color}}>{d.pct.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td style={{padding:'11px 14px',borderTop:'1px solid #F1F5F9'}}>
                                        {d.growth===null?(
                                            <span style={{color:'#CBD5E1',fontSize:'0.8rem'}}>—</span>
                                        ):(
                                            <span style={{fontWeight:700,fontSize:'0.83rem',color:d.growth>=0?'#10B981':'#EF4444'}}>
                                                {d.growth>=0?'▲':'▼'} {Math.abs(d.growth).toFixed(1)}%
                                            </span>
                                        )}
                                    </td>
                                    <td style={{padding:'11px 14px',borderTop:'1px solid #F1F5F9'}}>
                                        <span style={{padding:'3px 10px',borderRadius:99,background:d.tier.bg,
                                            color:d.tier.text,fontWeight:700,fontSize:'0.72rem',whiteSpace:'nowrap'}}>
                                            {d.tier.label.replace(' Eligible','')}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — real-time mode only (no toggle)
═══════════════════════════════════════════════════════════════════════ */
export default function SalesStats({ employeeEmail, employeeSalary, isChairman = false }) {
    const [stats, setStats]                 = useState(null);
    const [salesEntries, setSalesEntries]   = useState([]);
    const [loading, setLoading]             = useState(true);
    const [editMode, setEditMode]           = useState(false);
    const [targetAmount, setTargetAmount]   = useState('');
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [saleAmount, setSaleAmount]       = useState('');
    const [saleCompany, setSaleCompany]     = useState('');
    const [clientName, setClientName]       = useState('');
    const [saleDate, setSaleDate]           = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks]             = useState('');
    const [viewPeriod, setViewPeriod]       = useState('current');
    const [attendance, setAttendance]       = useState(null);
    const [currentMonth, setCurrentMonth]   = useState(TODAY_MONTH());

    // Always real-time: re-compute current_sales from entries when month changes
    useEffect(()=>{
        if(employeeEmail){ fetchStats(); fetchEntries(); fetchAttendance(employeeEmail, currentMonth); }
        // eslint-disable-next-line
    },[employeeEmail]);

    useEffect(()=>{
        if(employeeEmail && salesEntries.length>0){
            setStats(p=>({...p, current_sales: calcMonthSales(salesEntries, currentMonth)}));
        }
        // eslint-disable-next-line
    },[currentMonth, salesEntries]);

    const calcMonthSales = (entries, month) => {
        const [y,m] = month.split('-');
        return entries
            .filter(e=>{ const d=new Date(e.sale_date); return d.getFullYear()===+y&&(d.getMonth()+1)===+m; })
            .reduce((s,e)=>s+parseFloat(e.amount||0), 0);
    };

    const fetchStats = async()=>{
        try{
            const r = await axios.get(`${baseUrl}/sales-stats/${employeeEmail}`,{withCredentials:true});
            setStats(r.data); setTargetAmount(r.data.target||'');
        }catch{ setStats({target:0,current_sales:0}); }
        finally{ setLoading(false); }
    };
    const fetchEntries = async()=>{
        try{ const r=await axios.get(`${baseUrl}/sales-entries/${employeeEmail}`,{withCredentials:true}); setSalesEntries(r.data); }
        catch{}
    };
    const fetchAttendance = async(email,month)=>{
        try{ const r=await axios.post(`${baseUrl}/get-attendance-summary`,{email,month},{withCredentials:true}); setAttendance(r.data); }
        catch{ setAttendance(null); }
    };

    const handleSaveTarget = async()=>{
        if(!targetAmount) return alert('Please enter target amount');
        try{
            await axios.post(`${baseUrl}/update-sales-target`,
                new URLSearchParams({employee_email:employeeEmail,target:targetAmount}),{withCredentials:true});
            alert('✅ Target updated'); fetchStats(); setEditMode(false);
        }catch(err){ alert('❌ '+(err.response?.data?.error||err.message)); }
    };
    const handleAddEntry = async()=>{
        if(!saleAmount||!saleCompany||!clientName||!saleDate) return alert('Please fill all required fields');
        try{
            await axios.post(`${baseUrl}/add-sales-entry`,
                new URLSearchParams({employee_email:employeeEmail,amount:saleAmount,company:saleCompany,
                    client_name:clientName,sale_date:saleDate,remarks:remarks||''}),{withCredentials:true});
            alert('✅ Entry added');
            setSaleAmount(''); setSaleCompany(''); setClientName(''); setRemarks('');
            setSaleDate(new Date().toISOString().split('T')[0]); setShowEntryForm(false);
            fetchStats(); fetchEntries();
        }catch(err){ alert('❌ '+(err.response?.data?.error||err.message)); }
    };

    if(loading) return(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:80,
            fontFamily:'Sora,sans-serif',color:'#94A3B8',gap:10}}>
            <div style={{width:24,height:24,border:'3px solid #E2E8F0',borderTopColor:'#3B82F6',
                borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
            Loading performance data…
        </div>
    );

    /* ── Computed values ── */
    const target    = parseFloat(stats?.target||0);
    const current   = parseFloat(stats?.current_sales||0);
    const base      = parseFloat(employeeSalary||0);

    // Real-time salary calc: uses attendance when available, falls back to simple
    const salaryCalc = (() => {
        const hasMeta = attendance && attendance.totalDays > 0;
        const totalDays = hasMeta ? (attendance.totalDays||0) : 0;
        const workDays  = hasMeta ? (parseFloat(attendance.workDays)||0) : 0;
        const prorated  = hasMeta ? (base/totalDays)*workDays : base;
        const p = target>0 ? (current/target)*100 : 0;
        let sp=0;
        if(p>=100)sp=100; else if(p>=75)sp=75; else if(p>=50)sp=50; else if(p>=25)sp=25;
        return {
            percentage: p.toFixed(1),
            salaryPercentage: sp,
            payable: (prorated*sp/100).toFixed(2),
            proratedSalary: hasMeta ? prorated.toFixed(2) : null,
            attendanceData: hasMeta ? {totalDays,sundays:attendance.sundays||0,workDays:workDays.toFixed(2)} : null,
        };
    })();

    const pct       = parseFloat(salaryCalc.percentage);
    const remaining = Math.max(0, target-current);
    const tier      = getTier(pct);

    const getCompData = ()=>{
        if(!salesEntries.length) return null;
        const now=new Date(); let data=[];
        if(viewPeriod==='10days'){ const ago=new Date(now-10*864e5); data=salesEntries.filter(e=>new Date(e.sale_date)>=ago); }
        else if(viewPeriod==='month'){ const som=new Date(now.getFullYear(),now.getMonth(),1); data=salesEntries.filter(e=>new Date(e.sale_date)>=som); }
        if(!data.length) return null;
        const total=data.reduce((s,e)=>s+parseFloat(e.amount||0),0);
        return{totalSales:total,count:data.length,avgSale:total/data.length,
            period:viewPeriod==='10days'?'Last 10 Days':'This Month'};
    };
    const cmpData = getCompData();

    const byCompany = salesEntries.reduce((acc,e)=>{
        const c=e.company||'Other'; if(!acc[c]) acc[c]={total:0,count:0};
        acc[c].total+=parseFloat(e.amount||0); acc[c].count+=1; return acc;
    },{});

    return(
        <div className="ss-wrap" style={{background:'linear-gradient(145deg,#F0F4FF,#F8FAFF)',minHeight:'100vh',padding:'28px 22px 56px'}}>

            {/* ── HEADER ── */}
            <div className="ss-anim" style={{marginBottom:28,display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
                <div>
                    <p style={{...MICRO,color:'#3B82F6',margin:'0 0 5px'}}>VJC Overseas · Sales Intelligence</p>
                    <h1 style={{margin:0,fontSize:'clamp(1.45rem,3vw,1.9rem)',fontWeight:800,color:'#0F172A',lineHeight:1.15}}>
                        Sales Performance Dashboard
                    </h1>
                    <p style={{margin:'5px 0 0',fontSize:'0.88rem',color:'#64748B',fontFamily:'Lora,serif',fontStyle:'italic'}}>
                        {isChairman?'👑 Chairman View — complete employee visibility':`Viewing: ${employeeEmail}`}
                    </p>
                </div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                    {/* Real-time badge — always on */}
                    <span style={{padding:'7px 14px',borderRadius:99,background:'#DBEAFE',color:'#1D4ED8',
                        fontWeight:700,fontSize:'0.78rem',display:'flex',alignItems:'center',gap:6}}>
                        <span style={{width:7,height:7,borderRadius:'50%',background:'#EF4444',display:'inline-block',
                            animation:'pulse 1.5s ease-in-out infinite',boxShadow:'0 0 0 0 #EF444466'}}/>
                        Real-time Mode
                    </span>
                    {isChairman&&(
                        <button className="ss-btn" onClick={()=>setEditMode(v=>!v)} style={{
                            padding:'10px 20px',background:editMode?'#F1F5F9':'#3B82F6',color:editMode?'#475569':'#fff',
                            border:editMode?'2px solid #CBD5E1':'none',borderRadius:10,fontWeight:700,
                            cursor:'pointer',fontSize:'0.85rem',fontFamily:'Sora,sans-serif',
                        }}>{editMode?'✕ Cancel':'✏️ Edit Target'}</button>
                    )}
                    {!isChairman&&(
                        <button className="ss-btn" onClick={()=>setShowEntryForm(v=>!v)} style={{
                            padding:'10px 20px',background:showEntryForm?'#F1F5F9':'#10B981',color:showEntryForm?'#475569':'#fff',
                            border:showEntryForm?'2px solid #CBD5E1':'none',borderRadius:10,fontWeight:700,
                            cursor:'pointer',fontSize:'0.85rem',fontFamily:'Sora,sans-serif',
                        }}>{showEntryForm?'✕ Cancel':'＋ Add Sale'}</button>
                    )}
                </div>
            </div>

            {/* ── MONTH SELECTOR (always visible) ── */}
            <div className="ss-anim" style={{...CARD,background:'linear-gradient(135deg,#FFFBEB,#FFF7ED)',
                border:'1.5px solid #FDE68A',animationDelay:'.04s',display:'flex',flexWrap:'wrap',
                alignItems:'center',gap:20}}>
                <div style={{flex:1,minWidth:200}}>
                    <p style={{margin:'0 0 8px',fontWeight:700,fontSize:'0.85rem',color:'#92400E'}}>
                        📅 Viewing Month
                    </p>
                    <input type="month" value={currentMonth} className="ss-inp"
                        style={{...INPUT_S,maxWidth:220,background:'#FFFBEB',borderColor:'#FDE68A'}}
                        onChange={async e=>{
                            setCurrentMonth(e.target.value);
                            await fetchAttendance(employeeEmail, e.target.value);
                        }}/>
                </div>
                <div style={{textAlign:'right'}}>
                    <p style={{...MICRO,margin:'0 0 4px',color:'#B45309'}}>Sales This Month</p>
                    <p style={{margin:0,fontSize:'1.6rem',fontWeight:800,color:'#92400E'}}>
                        {SHORT(current)}
                    </p>
                    <p style={{margin:'2px 0 0',fontSize:'0.78rem',color:'#B45309'}}>₹{INR(current)}</p>
                </div>
            </div>

            {!attendance&&(
                <div className="ss-fade" style={{...CARD,background:'#FEF2F2',border:'1.5px solid #FECACA',
                    padding:'14px 20px',marginTop:-10,animationDelay:'.06s'}}>
                    <p style={{margin:0,fontSize:'0.82rem',color:'#DC2626',fontWeight:600}}>
                        ⚠️ No attendance summary found for {MONTH_FULL(currentMonth)} —
                        salary calculation will use base salary only until attendance is generated.
                    </p>
                </div>
            )}

            {/* ── EDIT TARGET ── */}
            {editMode&&isChairman&&(
                <div className="ss-anim ss-fade" style={{...CARD,background:'linear-gradient(135deg,#EFF6FF,#F8FAFF)',
                    border:'1.5px solid #BFDBFE',animationDelay:'.04s'}}>
                    <p style={{margin:'0 0 14px',fontWeight:700,fontSize:'0.95rem',color:'#1E3A5F'}}>📌 Set Monthly Sales Target</p>
                    <label style={FLABEL}>Monthly Target Amount (₹)</label>
                    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                        <input type="number" value={targetAmount} onChange={e=>setTargetAmount(e.target.value)}
                            className="ss-inp" style={{...INPUT_S,maxWidth:260}} placeholder="e.g. 100000"/>
                        <button className="ss-btn" onClick={handleSaveTarget} style={{
                            padding:'11px 22px',background:'#3B82F6',color:'#fff',border:'none',
                            borderRadius:10,fontWeight:700,cursor:'pointer',fontFamily:'Sora,sans-serif',
                        }}>💾 Save Target</button>
                    </div>
                </div>
            )}

            {/* ── ADD SALE FORM ── */}
            {showEntryForm&&!isChairman&&(
                <div className="ss-anim ss-fade" style={{...CARD,background:'linear-gradient(135deg,#F0FDF4,#ECFDF5)',
                    border:'1.5px solid #A7F3D0',animationDelay:'.04s'}}>
                    <p style={{margin:'0 0 16px',fontWeight:700,fontSize:'0.95rem',color:'#064E3B'}}>＋ New Sales Entry</p>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:14}}>
                        {[
                            {label:'Sale Amount (₹) *',type:'number',val:saleAmount,set:setSaleAmount,ph:'e.g. 50000'},
                            {label:'Client Name *',    type:'text',  val:clientName, set:setClientName, ph:'Client name'},
                            {label:'Sale Date *',      type:'date',  val:saleDate,   set:setSaleDate},
                        ].map((f,i)=>(
                            <div key={i}>
                                <label style={FLABEL}>{f.label}</label>
                                <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)}
                                    className="ss-inp" style={INPUT_S} placeholder={f.ph||''}/>
                            </div>
                        ))}
                        <div>
                            <label style={FLABEL}>Company / Service *</label>
                            <select value={saleCompany} onChange={e=>setSaleCompany(e.target.value)} className="ss-inp" style={INPUT_S}>
                                <option value="">— Select —</option>
                                {['JSS','PR','Study','Work Visa','Tourist Visa','Other'].map(o=><option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{marginBottom:14}}>
                        <label style={FLABEL}>Remarks (optional)</label>
                        <textarea value={remarks} onChange={e=>setRemarks(e.target.value)}
                            className="ss-inp" style={{...INPUT_S,minHeight:65,resize:'vertical'}} placeholder="Additional notes…"/>
                    </div>
                    <button className="ss-btn" onClick={handleAddEntry} style={{
                        width:'100%',padding:'12px',background:'#10B981',color:'#fff',border:'none',
                        borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:'0.9rem',fontFamily:'Sora,sans-serif',
                    }}>💾 Save Sales Entry</button>
                </div>
            )}

            {/* ── KPI CARDS ── */}
            <Divider>This Month's Key Metrics</Divider>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:14,marginBottom:18}}>
                {[
                    {label:'Monthly Target', big:SHORT(target),    sub:`₹${INR(target)}`,   accent:'#3B82F6',icon:'🎯',delay:'.06s'},
                    {label:'Sales Achieved', big:SHORT(current),   sub:`₹${INR(current)}`,  accent:'#10B981',icon:'💰',delay:'.1s'},
                    {label:'Remaining Gap',  big:SHORT(remaining), sub:remaining===0?'🎉 Target Met!':`₹${INR(remaining)} to go`,
                        accent:remaining===0?'#10B981':'#EF4444',icon:'📉',delay:'.14s'},
                    {label:'Achievement',    big:`${Math.round(pct)}%`,sub:tier.label,      accent:tier.color,icon:'🏆',delay:'.18s'},
                ].map((k,i)=>(
                    <div key={i} className="ss-kpi ss-anim" style={{...CARD,borderTop:`3px solid ${k.accent}`,margin:0,animationDelay:k.delay}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                            <div>
                                <p style={{...MICRO,margin:'0 0 6px'}}>{k.label}</p>
                                <p style={{margin:'0 0 4px',fontSize:'1.65rem',fontWeight:800,color:k.accent,lineHeight:1}}>{k.big}</p>
                                <p style={{margin:0,fontSize:'0.78rem',color:'#64748B'}}>{k.sub}</p>
                            </div>
                            <span style={{fontSize:'1.5rem'}}>{k.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── PROGRESS RING ── */}
            <div className="ss-anim" style={{...CARD,display:'flex',gap:26,flexWrap:'wrap',alignItems:'center',
                borderLeft:`4px solid ${tier.color}`,animationDelay:'.22s'}}>
                <RingGauge pct={pct} color={tier.color} size={130}/>
                <div style={{flex:1,minWidth:200}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                        <span style={{fontWeight:700,fontSize:'0.88rem',color:'#334155'}}>Progress to Monthly Target</span>
                        <span style={{fontWeight:800,fontSize:'0.88rem',color:tier.color}}>{Math.round(pct)}%</span>
                    </div>
                    <div style={{height:13,borderRadius:99,background:'#F1F5F9',overflow:'hidden',marginBottom:14}}>
                        <div className="ss-bar" style={{height:'100%',borderRadius:99,width:`${Math.min(pct,100)}%`,
                            background:`linear-gradient(90deg,${tier.color},${tier.color}99)`}}/>
                    </div>
                    <div style={{display:'flex',gap:8,marginBottom:14}}>
                        {[25,50,75,100].map(m=>(
                            <div key={m} style={{flex:1,textAlign:'center',padding:'6px 4px',borderRadius:8,
                                background:pct>=m?tier.bg:'#F8FAFF',border:`1px solid ${pct>=m?tier.color+'44':'#E2E8F0'}`}}>
                                <p style={{margin:0,fontSize:'0.68rem',fontWeight:700,color:pct>=m?tier.color:'#CBD5E1'}}>{m}%</p>
                                <p style={{margin:0,fontSize:'0.6rem',color:pct>=m?tier.text:'#CBD5E1',fontWeight:600}}>
                                    {m===100?'Full':`${m}%`}
                                </p>
                            </div>
                        ))}
                    </div>
                    <span style={{padding:'5px 14px',borderRadius:99,background:tier.bg,color:tier.text,fontWeight:700,fontSize:'0.8rem'}}>
                        {tier.label}
                    </span>
                    <span style={{marginLeft:10,padding:'5px 14px',borderRadius:99,background:'#F0FDF4',color:'#065F46',fontWeight:700,fontSize:'0.8rem'}}>
                        Net Payable: ₹{INR(salaryCalc.payable)}
                    </span>
                </div>
            </div>

            {/* ── SALARY BREAKDOWN ── */}
            <Divider>Salary Breakdown</Divider>
            <div className="ss-anim" style={{...CARD,animationDelay:'.26s'}}>
                <p style={{margin:'0 0 16px',fontWeight:700,fontSize:'0.95rem',color:'#0F172A'}}>💰 Salary Calculation
                    <span style={{marginLeft:8,fontSize:'0.75rem',color:'#3B82F6',fontWeight:600}}>
                        {salaryCalc.attendanceData?'(Attendance × Sales performance)':'(Sales performance — no attendance data)'}
                    </span>
                </p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:12,marginBottom:18}}>
                    {[
                        {label:'Base Salary',     val:`₹${INR(base)}`,                                        color:'#64748B'},
                        salaryCalc.proratedSalary && {label:'Pro-rated Salary',val:`₹${INR(salaryCalc.proratedSalary)}`,color:'#3B82F6'},
                        salaryCalc.attendanceData && {label:'Work Days',        val:salaryCalc.attendanceData.workDays, color:'#8B5CF6'},
                        {label:'Salary Tier',     val:`${salaryCalc.salaryPercentage}%`,                       color:tier.color},
                    ].filter(Boolean).map((row,i)=>row&&(
                        <div key={i} style={{background:'#F8FAFF',borderRadius:10,padding:'12px 14px',border:'1px solid #E8EEFF'}}>
                            <p style={{...MICRO,margin:'0 0 4px'}}>{row.label}</p>
                            <p style={{margin:0,fontSize:'1.1rem',fontWeight:800,color:row.color}}>{row.val}</p>
                        </div>
                    ))}
                </div>
                <div style={{background:tier.bg,borderRadius:12,padding:'16px 20px',display:'flex',
                    justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                    <span style={{fontWeight:700,color:tier.text}}>Net Payable Amount</span>
                    <span style={{fontSize:'2rem',fontWeight:800,color:tier.color}}>₹{INR(salaryCalc.payable)}</span>
                </div>
            </div>

            {/* ── MONTHLY HISTORY ── */}
            <Divider>Monthly History & Comparison</Divider>
            <div className="ss-anim" style={{...CARD,animationDelay:'.28s'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:16}}>
                    <div>
                        <p style={{margin:0,fontWeight:700,fontSize:'0.95rem',color:'#0F172A'}}>📅 Month-over-Month Performance</p>
                        <p style={{margin:'3px 0 0',fontSize:'0.8rem',color:'#64748B'}}>
                            Live from all sales entries · Current month always shown · Click any bar or row to drill in
                        </p>
                    </div>
                    <span style={{padding:'4px 12px',borderRadius:99,background:'#DBEAFE',color:'#1D4ED8',fontWeight:700,fontSize:'0.72rem'}}>
                        🔴 Real-time
                    </span>
                </div>
                <MonthlyHistory salesEntries={salesEntries} target={target}/>
            </div>

            {/* ── PERIOD SNAPSHOT ── */}
            <Divider>Period Snapshot</Divider>
            <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
                {[['current','📊 Overall'],['10days','📈 Last 10 Days'],['month','📅 This Month']].map(([k,lbl])=>(
                    <button key={k} className="ss-btn" onClick={()=>setViewPeriod(k)} style={{
                        padding:'9px 18px',borderRadius:10,cursor:'pointer',fontWeight:600,
                        fontSize:'0.83rem',fontFamily:'Sora,sans-serif',
                        border:viewPeriod===k?'2px solid #3B82F6':'2px solid #E2E8F0',
                        background:viewPeriod===k?'#EFF6FF':'#fff',
                        color:viewPeriod===k?'#2563EB':'#64748B',
                    }}>{lbl}</button>
                ))}
            </div>
            {viewPeriod!=='current'&&cmpData&&(
                <div className="ss-anim ss-fade" style={{...CARD,background:'linear-gradient(135deg,#EFF6FF,#F8FAFF)',
                    border:'1.5px solid #BFDBFE',animationDelay:'.04s'}}>
                    <p style={{margin:'0 0 14px',fontWeight:700,color:'#1E3A5F'}}>📈 {cmpData.period} — Snapshot</p>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12}}>
                        {[
                            {label:'Total Sales',  val:`₹${INR(cmpData.totalSales)}`,              color:'#3B82F6'},
                            {label:'No. of Deals', val:cmpData.count,                               color:'#8B5CF6'},
                            {label:'Avg per Deal', val:`₹${INR(Math.round(cmpData.avgSale))}`,      color:'#10B981'},
                        ].map((item,i)=>(
                            <div key={i} style={{textAlign:'center',background:'#fff',borderRadius:10,
                                padding:'14px',border:'1px solid #E8EEFF'}}>
                                <p style={{...MICRO,margin:'0 0 5px'}}>{item.label}</p>
                                <p style={{margin:0,fontSize:'1.3rem',fontWeight:800,color:item.color}}>{item.val}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── COMPANY BREAKDOWN ── */}
            {Object.keys(byCompany).length>0&&(
                <>
                    <Divider>Sales by Category</Divider>
                    <div className="ss-anim" style={{...CARD,animationDelay:'.3s'}}>
                        <p style={{margin:'0 0 18px',fontWeight:700,fontSize:'0.95rem',color:'#0F172A'}}>💼 Breakdown by Company / Service</p>
                        {Object.entries(byCompany).sort(([,a],[,b])=>b.total-a.total).map(([co,d],i)=>(
                            <MiniBar key={co} label={co} pct={target>0?(d.total/target)*100:0}
                                value={SHORT(d.total)} count={d.count} color={CAT_CLR[i%CAT_CLR.length]}/>
                        ))}
                    </div>
                </>
            )}

            {/* ── ALL TRANSACTIONS ── */}
            {salesEntries.length>0&&(
                <>
                    <Divider>All Transactions</Divider>
                    <div className="ss-anim" style={{...CARD,padding:0,overflow:'hidden',animationDelay:'.35s'}}>
                        <div style={{padding:'16px 22px',borderBottom:'1px solid #F1F5F9',display:'flex',
                            justifyContent:'space-between',alignItems:'center'}}>
                            <p style={{margin:0,fontWeight:700,fontSize:'0.9rem',color:'#0F172A'}}>📋 All Sales Entries</p>
                            <span style={{padding:'4px 12px',background:'#EFF6FF',color:'#2563EB',borderRadius:99,fontWeight:700,fontSize:'0.75rem'}}>
                                {salesEntries.length} records
                            </span>
                        </div>
                        <div style={{overflowX:'auto'}}>
                            <table style={{width:'100%',borderCollapse:'collapse'}}>
                                <thead><tr style={{background:'#F8FAFF'}}>
                                    {['Date','Client','Category','Amount','Remarks'].map(h=>(
                                        <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:'0.68rem',
                                            fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',
                                            color:'#94A3B8',whiteSpace:'nowrap'}}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {[...salesEntries].sort((a,b)=>new Date(b.sale_date)-new Date(a.sale_date)).map((e,i)=>(
                                        <tr key={i} className="ss-row">
                                            <td style={{padding:'12px 14px',fontSize:'0.85rem',color:'#334155',borderTop:'1px solid #F1F5F9'}}>
                                                {new Date(e.sale_date).toLocaleDateString('en-IN')}
                                            </td>
                                            <td style={{padding:'12px 14px',fontSize:'0.85rem',fontWeight:600,color:'#1E293B',borderTop:'1px solid #F1F5F9'}}>
                                                {e.client_name}
                                            </td>
                                            <td style={{padding:'12px 14px',borderTop:'1px solid #F1F5F9'}}>
                                                <span style={{padding:'3px 10px',borderRadius:99,background:'#EFF6FF',
                                                    color:'#2563EB',fontWeight:700,fontSize:'0.73rem'}}>{e.company}</span>
                                            </td>
                                            <td style={{padding:'12px 14px',fontSize:'0.88rem',fontWeight:800,color:'#10B981',borderTop:'1px solid #F1F5F9'}}>
                                                ₹{INR(e.amount)}
                                            </td>
                                            <td style={{padding:'12px 14px',fontSize:'0.82rem',color:'#94A3B8',borderTop:'1px solid #F1F5F9'}}>
                                                {e.remarks||'—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ── SALARY RULES ── */}
            <Divider>Eligibility Rules</Divider>
            <div className="ss-anim" style={{...CARD,animationDelay:'.4s'}}>
                <p style={{margin:'0 0 14px',fontWeight:700,fontSize:'0.92rem',color:'#0F172A'}}>📋 Salary Eligibility Tiers</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
                    {[
                        {range:'≥ 100% of Target',payout:'100% — Full Salary',color:'#10B981',bg:'#D1FAE5',text:'#065F46'},
                        {range:'75% – 99%',        payout:'75% of Salary',    color:'#F59E0B',bg:'#FEF3C7',text:'#92400E'},
                        {range:'50% – 74%',        payout:'50% of Salary',    color:'#F97316',bg:'#FFEDD5',text:'#7C2D12'},
                        {range:'25% – 49%',        payout:'25% of Salary',    color:'#EF4444',bg:'#FEE2E2',text:'#7F1D1D'},
                        {range:'Below 25%',        payout:'No Salary',        color:'#94A3B8',bg:'#F1F5F9',text:'#475569'},
                    ].map((r,i)=>(
                        <div key={i} style={{background:r.bg,borderRadius:10,padding:'12px 14px',borderLeft:`4px solid ${r.color}`}}>
                            <p style={{margin:'0 0 3px',fontSize:'0.75rem',fontWeight:700,color:r.color}}>{r.range}</p>
                            <p style={{margin:0,fontSize:'0.88rem',fontWeight:700,color:'#1E293B'}}>{r.payout}</p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}