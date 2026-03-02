import React, { useState, useEffect } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

/* ── Global styles ─────────────────────────────────────────────────────── */
const STYLE_ID = "sm-premium-style";
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    .sm-root { font-family: 'DM Sans', sans-serif; }
    @keyframes smFadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes smFadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes smPulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
    @keyframes smSpin    { to{transform:rotate(360deg)} }
    @keyframes smShake   { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
    .sm-up    { animation: smFadeUp .48s cubic-bezier(.22,.68,0,1.2) both; }
    .sm-in    { animation: smFadeIn .32s ease both; }
    .sm-spin  { animation: smSpin 1s linear infinite; }
    .sm-card  { transition: transform .2s, box-shadow .2s; }
    .sm-card:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(15,23,42,.10)!important; }
    .sm-erow  { transition: background .13s; cursor: pointer; }
    .sm-erow:hover { background: #F8FAFF!important; }
    .sm-tab   { transition: all .17s; }
    .sm-tab:hover { background: #F0F4FF!important; }
    .sm-btn   { transition: all .17s; }
    .sm-btn:hover { transform: translateY(-1px); filter: brightness(1.06); }
    .sm-del   { transition: all .17s; opacity: .55; }
    .sm-del:hover { opacity: 1; transform: scale(1.1); }
    .sm-confirm { animation: smShake .35s ease; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #F1F5F9; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
    input[type=month]::-webkit-calendar-picker-indicator { cursor: pointer; }
    select option { background: #fff; color: #1E293B; }
  `;
  document.head.appendChild(s);
}

/* ── Design tokens — clean white theme ──────────────────────────────────── */
const C = {
  bg:       "#F4F6FB",
  surface:  "#FAFBFE",
  card:     "#FFFFFF",
  border:   "#E8EEFF",
  borderSt: "#CBD5E1",
  accent:   "#3B6FE8",          // rich blue accent
  accentSt: "#2554C7",
  accentBg: "#EEF3FF",
  text:     "#0F172A",
  textSub:  "#334155",
  muted:    "#94A3B8",
  dim:      "#E2E8F0",
  green:    "#10B981",
  greenBg:  "#D1FAE5",
  amber:    "#F59E0B",
  amberBg:  "#FEF3C7",
  orange:   "#F97316",
  orangeBg: "#FFEDD5",
  red:      "#EF4444",
  redBg:    "#FEE2E2",
  blue:     "#3B82F6",
  blueBg:   "#DBEAFE",
  purple:   "#8B5CF6",
  purpleBg: "#EDE9FE",
  cyan:     "#06B6D4",
};

const TIER_COLOR  = p => p >= 100 ? C.green  : p >= 75 ? C.amber  : p >= 50 ? C.orange  : p >= 25 ? C.red  : C.muted;
const TIER_BG     = p => p >= 100 ? C.greenBg: p >= 75 ? C.amberBg: p >= 50 ? C.orangeBg: p >= 25 ? C.redBg: "#F1F5F9";
const TIER_LABEL  = p => p >= 100 ? "Full Salary" : p >= 75 ? "75% Salary" : p >= 50 ? "50% Salary" : p >= 25 ? "25% Salary" : "No Salary";

const EMP_COLORS  = [C.accent, C.green, C.purple, C.cyan, C.orange, C.red, C.amber, C.blue];

const fmt  = n => parseFloat(n || 0).toLocaleString("en-IN");
const fmtS = n => {
  n = parseFloat(n || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n}`;
};
const TODAY_MONTH = () => new Date().toISOString().slice(0, 7);

/* ── Shared UI pieces ───────────────────────────────────────────────────── */
const Card = ({ children, style, className = "" }) => (
  <div className={`sm-card ${className}`} style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
    padding: "22px 24px", boxShadow: "0 2px 10px rgba(15,23,42,.06)", ...style,
  }}>{children}</div>
);

const Micro = ({ children, style }) => (
  <p style={{ margin: 0, fontSize: ".65rem", fontWeight: 700, letterSpacing: ".12em",
    textTransform: "uppercase", color: C.muted, ...style }}>{children}</p>
);

/* ── Donut chart ────────────────────────────────────────────────────────── */
function Donut({ pct, color, size = 100, thick = 10 }) {
  const r = (size - thick) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (Math.min(parseFloat(pct) || 0, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.dim} strokeWidth={thick} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thick}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset .8s ease" }} />
    </svg>
  );
}

/* ── Vertical bar chart ─────────────────────────────────────────────────── */
function BarChart({ data, height = 130 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, paddingTop: 26 }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * (height - 26), d.value > 0 ? 5 : 2);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: ".54rem", color: C.muted, fontWeight: 700, whiteSpace: "nowrap",
              opacity: d.value > 0 ? 1 : 0, marginBottom: 2 }}>{fmtS(d.value)}</span>
            <div style={{ width: "100%", height: h, borderRadius: "5px 5px 0 0",
              background: `linear-gradient(180deg,${d.color},${d.color}66)`,
              transition: "height .7s cubic-bezier(.22,.68,0,1.2)",
              boxShadow: `0 4px 14px ${d.color}44` }} />
            <span style={{ fontSize: ".58rem", color: C.muted, textAlign: "center",
              fontWeight: 600, maxWidth: 44, overflow: "hidden", lineHeight: 1.2 }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── SVG Line chart ─────────────────────────────────────────────────────── */
function LineChart({ datasets, height = 150, width = 600 }) {
  const padL = 40, padB = 26, padT = 14, padR = 12;
  const W = width - padL - padR, H = height - padT - padB;
  const allVals = datasets.flatMap(d => d.points.map(p => p.y));
  const maxV = Math.max(...allVals, 1);
  const xCount = Math.max(...datasets.map(d => d.points.length));
  const px = i => padL + (i / (xCount - 1 || 1)) * W;
  const py = v => padT + H - (v / maxV) * H;
  const yTicks = [0, .25, .5, .75, 1].map(t => ({ v: maxV * t, y: py(maxV * t) }));

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={width - padR} y1={t.y} y2={t.y}
            stroke={C.dim} strokeWidth=".7" strokeDasharray="4 4" />
          <text x={padL - 5} y={t.y + 4} textAnchor="end"
            style={{ fill: C.muted, fontSize: 8, fontFamily: "DM Sans,sans-serif" }}>
            {fmtS(t.v)}
          </text>
        </g>
      ))}
      {datasets[0]?.points.map((p, i) => (
        <text key={i} x={px(i)} y={height - 4} textAnchor="middle"
          style={{ fill: C.muted, fontSize: 8, fontFamily: "DM Sans,sans-serif" }}>{p.label}</text>
      ))}
      {datasets.map((ds, di) => {
        if (ds.points.length < 2) return null;
        const pathD = ds.points.map((p, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(p.y)}`).join(" ");
        const areaD = `${pathD} L${px(ds.points.length - 1)},${padT + H} L${px(0)},${padT + H} Z`;
        return (
          <g key={di}>
            <defs>
              <linearGradient id={`grad${di}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ds.color} stopOpacity=".18" />
                <stop offset="100%" stopColor={ds.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#grad${di})`} />
            <path d={pathD} fill="none" stroke={ds.color} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
            {ds.points.map((p, i) => (
              <circle key={i} cx={px(i)} cy={py(p.y)} r={4} fill="#fff"
                stroke={ds.color} strokeWidth="2" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Horizontal progress bar ────────────────────────────────────────────── */
function HBar({ pct, color, height = 8 }) {
  return (
    <div style={{ height, borderRadius: 99, background: C.dim, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(parseFloat(pct) || 0, 100)}%`,
        borderRadius: 99, background: `linear-gradient(90deg,${color},${color}99)`,
        transition: "width .7s cubic-bezier(.22,.68,0,1.2)" }} />
    </div>
  );
}

/* ── Delete confirm button ──────────────────────────────────────────────── */
function DeleteBtn({ onConfirm, label = "Delete" }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }} className="sm-confirm">
      <span style={{ fontSize: ".72rem", color: C.red, fontWeight: 600, whiteSpace: "nowrap" }}>Sure?</span>
      <button onClick={e => { e.stopPropagation(); onConfirm(); setConfirm(false); }} style={{
        padding: "3px 10px", borderRadius: 6, background: C.red, color: "#fff", border: "none",
        fontWeight: 700, cursor: "pointer", fontSize: ".72rem", fontFamily: "'DM Sans',sans-serif",
      }}>Yes</button>
      <button onClick={e => { e.stopPropagation(); setConfirm(false); }} style={{
        padding: "3px 10px", borderRadius: 6, background: C.dim, color: C.textSub, border: "none",
        fontWeight: 700, cursor: "pointer", fontSize: ".72rem", fontFamily: "'DM Sans',sans-serif",
      }}>No</button>
    </div>
  ) : (
    <button className="sm-del" onClick={e => { e.stopPropagation(); setConfirm(true); }} style={{
      padding: "4px 10px", borderRadius: 6, background: C.redBg, color: C.red,
      border: `1px solid ${C.red}33`, cursor: "pointer", fontSize: ".72rem",
      fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
    }}>🗑 {label}</button>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════════════════ */
export default function SalesManagement() {
  const [allEmployees, setAllEmployees]   = useState([]);
  const [salesStats, setSalesStats]       = useState({});
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [deleting, setDeleting]           = useState(null); // entry id being deleted

  /* selected employee state */
  const [selStats, setSelStats]           = useState(null);
  const [selEntries, setSelEntries]       = useState([]);
  const [selAttendance, setSelAttendance] = useState(null);
  const [targetInput, setTargetInput]     = useState("");

  const [currentMonth, setCurrentMonth]   = useState(TODAY_MONTH());
  const [activeTab, setActiveTab]         = useState("overview");
  const [savingTarget, setSavingTarget]   = useState(false);

  /* ── Bootstrap ── */
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [empRes, statsRes] = await Promise.all([
        axios.get(`${baseUrl}/all-attendance`, { withCredentials: true }),
        axios.get(`${baseUrl}/all-sales-stats-chairman`, { withCredentials: true }),
      ]);
      const emps = Object.entries(empRes.data).map(([email, d]) => ({
        email, name: d.name, role: d.role, department: d.department,
        salary: d.salary, employeeId: d.employeeId,
      }));
      setAllEmployees(emps);
      const sm = {};
      statsRes.data.forEach(s => { sm[s.email] = s; });
      setSalesStats(sm);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  /* ── Select employee ── */
  const selectEmployee = async (email) => {
    if (!email) return;
    setSelectedEmail(email);
    setActiveTab("detail");
    try {
      const [statsRes, entriesRes, attRes] = await Promise.all([
        axios.get(`${baseUrl}/sales-stats/${email}`, { withCredentials: true }),
        axios.get(`${baseUrl}/sales-entries/${email}`, { withCredentials: true }),
        axios.post(`${baseUrl}/get-attendance-summary`, { email, month: currentMonth }, { withCredentials: true })
          .catch(() => ({ data: null })),
      ]);
      setSelStats(statsRes.data);
      setSelEntries(entriesRes.data || []);
      setSelAttendance(attRes.data);
      setTargetInput(statsRes.data.target || "");
    } catch {
      setSelStats(null); setSelEntries([]); setSelAttendance(null); setTargetInput("");
    }
  };

  /* ── Save target ── */
  const saveTarget = async () => {
    if (!selectedEmail || !targetInput) return alert("Enter a target amount first");
    setSavingTarget(true);
    try {
      await axios.post(`${baseUrl}/update-sales-target`,
        new URLSearchParams({ employee_email: selectedEmail, target: targetInput }),
        { withCredentials: true });
      await Promise.all([fetchAll(), selectEmployee(selectedEmail)]);
    } catch (e) { alert("Failed: " + (e.response?.data?.error || e.message)); }
    setSavingTarget(false);
  };

  /* ── Delete a sales entry ── */
  const deleteEntry = async (entryId) => {
    setDeleting(entryId);
    try {
      await axios.delete(`${baseUrl}/sales-entry/${entryId}`, { withCredentials: true });
      setSelEntries(prev => prev.filter(e => e.id !== entryId));
      await fetchAll();
    } catch (e) { alert("Delete failed: " + (e.response?.data?.error || e.message)); }
    setDeleting(null);
  };

  /* ── Real-time salary calc ── */
  const calcSalary = (emp, stats, entries, att, month) => {
    if (!emp || !stats) return null;
    const target = parseFloat(stats.target || 0);
    const base   = parseFloat(emp.salary || 0);
    const [y, m] = month.split("-");
    const current = (entries || [])
      .filter(e => { const d = new Date(e.sale_date); return d.getFullYear() === +y && d.getMonth() + 1 === +m; })
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalDays = att?.totalDays || 0;
    const workDays  = parseFloat(att?.workDays || 0);
    const hasAtt    = totalDays > 0;
    const prorated  = hasAtt ? (base / totalDays) * workDays : base;
    const pct       = target > 0 ? (current / target) * 100 : 0;
    let sp = 0;
    if (pct >= 100) sp = 100; else if (pct >= 75) sp = 75;
    else if (pct >= 50) sp = 50; else if (pct >= 25) sp = 25;
    return { current, target, base, prorated, pct, sp,
      payable: prorated * sp / 100, workDays: workDays.toFixed(1), totalDays, hasAtt };
  };

  /* ── Monthly history ── */
  const buildMonthHistory = (entries) => {
    const map = {};
    (entries || []).forEach(e => {
      const d = new Date(e.sale_date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[k] = (map[k] || 0) + parseFloat(e.amount || 0);
    });
    const cur = TODAY_MONTH();
    if (!map[cur]) map[cur] = 0;
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  };

  /* ── Derived ── */
  const selEmp      = allEmployees.find(e => e.email === selectedEmail);
  const salary      = calcSalary(selEmp, selStats, selEntries, selAttendance, currentMonth);
  const monthHistory = buildMonthHistory(selEntries);

  const ranked = allEmployees
    .filter(e => salesStats[e.email])
    .map((e, i) => ({ ...e, stats: salesStats[e.email], color: EMP_COLORS[i % EMP_COLORS.length] }))
    .sort((a, b) => (parseFloat(b.stats.percentage) || 0) - (parseFloat(a.stats.percentage) || 0));

  const totalSales   = ranked.reduce((s, e) => s + parseFloat(e.stats.current_sales || 0), 0);
  const totalPayable = ranked.reduce((s, e) => s + parseFloat(e.stats.payable_salary || 0), 0);
  const avgPct       = ranked.length ? ranked.reduce((s, e) => s + parseFloat(e.stats.percentage || 0), 0) / ranked.length : 0;
  const hitters      = ranked.filter(e => parseFloat(e.stats.percentage || 0) >= 100).length;
  const compBarData  = ranked.map(e => ({ label: e.name.split(" ")[0], value: parseFloat(e.stats.current_sales || 0), color: e.color }));

  /* ── Input style reused ── */
  const INP = {
    padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.borderSt}`,
    fontSize: ".88rem", fontFamily: "'DM Sans',sans-serif", background: "#FAFBFF",
    color: C.text, outline: "none", width: "100%",
  };

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.dim}`, borderTopColor: C.accent,
          borderRadius: "50%", margin: "0 auto 14px" }} className="sm-spin" />
        <p style={{ color: C.muted, fontSize: ".9rem" }}>Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="sm-root" style={{ background: C.bg, minHeight: "100vh", padding: "28px 24px 60px" }}>

      {/* ── HEADER ── */}
      <div className="sm-up" style={{ marginBottom: 28, display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ margin: "0 0 5px", fontSize: ".68rem", fontWeight: 700, letterSpacing: ".16em",
            color: C.accent, textTransform: "uppercase" }}>VJC Overseas · Chairman Portal</p>
          <h1 style={{ margin: 0, fontFamily: "'DM Serif Display',serif", fontSize: "clamp(1.7rem,3vw,2.3rem)",
            fontWeight: 400, color: C.text, lineHeight: 1.1 }}>
            Sales Intelligence{" "}
            <span style={{ fontStyle: "italic", color: C.accent }}>Dashboard</span>
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green,
            animation: "smPulse 2s ease-in-out infinite", display: "inline-block" }} />
          <span style={{ fontSize: ".78rem", color: C.green, fontWeight: 700 }}>Live · Real-time</span>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: C.card,
        borderRadius: 12, padding: 4, width: "fit-content", border: `1px solid ${C.border}`,
        boxShadow: "0 2px 8px rgba(15,23,42,.05)" }}>
        {[["overview", "📊 Overview"], ["detail", "🔍 Employee Detail"]].map(([k, lbl]) => (
          <button key={k} className="sm-tab" onClick={() => setActiveTab(k)} style={{
            padding: "9px 22px", borderRadius: 9, border: "none", cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: ".83rem",
            background: activeTab === k ? C.accent : "transparent",
            color: activeTab === k ? "#fff" : C.muted,
          }}>{lbl}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════
          OVERVIEW TAB
      ════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div>
          {/* KPI Strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Total Sales",     val: fmtS(totalSales),   sub: `₹${fmt(totalSales)}`,   color: C.accent,  icon: "💰", d: ".05s" },
              { label: "Avg Achievement", val: `${avgPct.toFixed(0)}%`, sub: `${ranked.length} employees`, color: TIER_COLOR(avgPct), icon: "📈", d: ".1s" },
              { label: "Target Hitters",  val: hitters,            sub: `of ${ranked.length} total`, color: C.green, icon: "🎯", d: ".15s" },
              { label: "Total Payable",   val: fmtS(totalPayable), sub: `₹${fmt(totalPayable)}`, color: C.blue,    icon: "🏦", d: ".2s" },
            ].map((k, i) => (
              <Card key={i} className="sm-up" style={{ borderTop: `3px solid ${k.color}`, animationDelay: k.d, marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <Micro>{k.label}</Micro>
                    <p style={{ margin: "8px 0 3px", fontSize: "1.75rem", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.val}</p>
                    <p style={{ margin: 0, fontSize: ".74rem", color: C.muted }}>{k.sub}</p>
                  </div>
                  <span style={{ fontSize: "1.5rem" }}>{k.icon}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Comparison charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Card className="sm-up" style={{ animationDelay: ".22s" }}>
              <Micro style={{ marginBottom: 4 }}>Sales Comparison</Micro>
              <p style={{ margin: "3px 0 14px", fontWeight: 700, color: C.text, fontSize: ".9rem" }}>All Employees — Current Sales</p>
              {compBarData.length > 0
                ? <BarChart data={compBarData} height={145} />
                : <p style={{ color: C.muted, fontSize: ".85rem", textAlign: "center", padding: "40px 0" }}>No data yet</p>}
            </Card>

            <Card className="sm-up" style={{ animationDelay: ".28s" }}>
              <Micro style={{ marginBottom: 14 }}>Achievement % — All Employees</Micro>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {ranked.map(e => {
                  const pct = parseFloat(e.stats.percentage || 0);
                  return (
                    <div key={e.email} onClick={() => selectEmployee(e.email)} style={{ cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                          <span style={{ fontSize: ".83rem", fontWeight: 600, color: C.textSub }}>{e.name.split(" ")[0]}</span>
                        </div>
                        <span style={{ fontSize: ".8rem", fontWeight: 800, color: TIER_COLOR(pct) }}>{pct.toFixed(0)}%</span>
                      </div>
                      <HBar pct={pct} color={e.color} height={7} />
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Leaderboard table */}
          <Card className="sm-up" style={{ animationDelay: ".34s", padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Micro>Live Leaderboard</Micro>
                <p style={{ margin: "3px 0 0", fontWeight: 700, color: C.text, fontSize: ".95rem" }}>
                  All Employees — Real-time Payroll Status
                </p>
              </div>
              <span style={{ padding: "4px 12px", borderRadius: 99, background: C.accentBg,
                color: C.accent, fontWeight: 700, fontSize: ".72rem" }}>
                {ranked.length} Employees
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {["#", "Employee", "Target", "Sales", "Achievement", "Base Salary", "Net Payable", "Status", ""].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: ".63rem",
                        fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase",
                        color: C.muted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((e, i) => {
                    const pct = parseFloat(e.stats.percentage || 0);
                    return (
                      <tr key={e.email} className="sm-erow" onClick={() => selectEmployee(e.email)}
                        style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontWeight: 800, color: i < 3 ? C.accent : C.muted, fontSize: ".85rem" }}>
                            {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${e.color}18`,
                              border: `2px solid ${e.color}44`, display: "flex", alignItems: "center",
                              justifyContent: "center", fontWeight: 800, fontSize: ".82rem", color: e.color, flexShrink: 0 }}>
                              {e.name[0]}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, color: C.text, fontSize: ".87rem" }}>{e.name}</p>
                              <p style={{ margin: 0, fontSize: ".72rem", color: C.muted }}>{e.role || "Employee"}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: ".85rem", color: C.muted }}>{fmtS(e.stats.target || 0)}</td>
                        <td style={{ padding: "14px 16px", fontSize: ".88rem", fontWeight: 700, color: C.green }}>{fmtS(e.stats.current_sales || 0)}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Donut pct={pct} color={TIER_COLOR(pct)} size={34} thick={4} />
                            <span style={{ fontWeight: 800, color: TIER_COLOR(pct), fontSize: ".85rem" }}>{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: ".85rem", color: C.muted }}>{fmtS(e.stats.base_salary || 0)}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontWeight: 800, fontSize: ".95rem", color: C.accent }}>₹{fmt(e.stats.payable_salary || 0)}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 99, fontWeight: 700, fontSize: ".7rem",
                            background: TIER_BG(pct), color: TIER_COLOR(pct), whiteSpace: "nowrap" }}>
                            {TIER_LABEL(pct)}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <button className="sm-btn" onClick={ev => { ev.stopPropagation(); selectEmployee(e.email); }}
                            style={{ padding: "5px 12px", borderRadius: 7, background: C.accentBg, color: C.accent,
                              border: `1px solid ${C.accent}33`, cursor: "pointer", fontSize: ".72rem",
                              fontWeight: 700, fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                            View →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          DETAIL TAB
      ════════════════════════════════════════════════ */}
      {activeTab === "detail" && (
        <div>
          {/* Selector bar */}
          <Card className="sm-up" style={{ marginBottom: 18, animationDelay: ".04s" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Micro style={{ marginBottom: 6 }}>Employee</Micro>
                <select value={selectedEmail || ""} onChange={e => selectEmployee(e.target.value)} style={{ ...INP }}>
                  <option value="">— Select Employee —</option>
                  {allEmployees.map(e => (
                    <option key={e.email} value={e.email}>{e.name} · {e.role || "Employee"}</option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: 160 }}>
                <Micro style={{ marginBottom: 6 }}>Month</Micro>
                <input type="month" value={currentMonth} style={{ ...INP, width: "auto", color: C.accent }}
                  onChange={async e => {
                    setCurrentMonth(e.target.value);
                    if (selectedEmail) {
                      const r = await axios.post(`${baseUrl}/get-attendance-summary`,
                        { email: selectedEmail, month: e.target.value }, { withCredentials: true }).catch(() => ({ data: null }));
                      setSelAttendance(r.data);
                    }
                  }} />
              </div>
              {selEmp && (
                <div style={{ minWidth: 180 }}>
                  <Micro style={{ marginBottom: 6 }}>Monthly Target (₹)</Micro>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)}
                      placeholder="e.g. 100000" style={{ ...INP, flex: 1 }} />
                    <button className="sm-btn" onClick={saveTarget} disabled={savingTarget}
                      style={{ padding: "10px 16px", background: C.accent, color: "#fff",
                        border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer",
                        fontSize: ".82rem", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                      {savingTarget ? "Saving…" : "💾 Save"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {!selEmp ? (
            <div style={{ textAlign: "center", padding: "80px 20px", background: C.card,
              borderRadius: 16, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: "2.5rem", margin: "0 0 10px" }}>👆</p>
              <p style={{ fontSize: ".95rem", color: C.muted, margin: 0 }}>Select an employee to see their full performance breakdown</p>
            </div>
          ) : (
            <>
              {/* Employee hero card */}
              <Card className="sm-up" style={{ animationDelay: ".08s", marginBottom: 18,
                borderLeft: `4px solid ${C.accent}`,
                background: `linear-gradient(135deg,#fff,${C.accentBg}44)` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 54, height: 54, borderRadius: "50%", background: C.accentBg,
                      border: `2px solid ${C.accent}44`, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "1.5rem", fontWeight: 800, color: C.accent }}>
                      {selEmp.name[0]}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontFamily: "'DM Serif Display',serif",
                        fontSize: "1.45rem", fontWeight: 400, color: C.text }}>{selEmp.name}</h2>
                      <p style={{ margin: "3px 0 0", color: C.muted, fontSize: ".8rem" }}>
                        {selEmp.role} · ID: {selEmp.employeeId} · {selEmp.email}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <Micro style={{ marginBottom: 3 }}>Base Salary</Micro>
                      <p style={{ margin: 0, fontWeight: 800, color: C.text, fontSize: "1.05rem" }}>₹{fmt(selEmp.salary)}</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <Micro style={{ marginBottom: 3 }}>Net Payable</Micro>
                      <p style={{ margin: 0, fontWeight: 800, color: C.accent, fontSize: "1.05rem" }}>₹{fmt(salary?.payable || 0)}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* KPI trio */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
                {/* Achievement donut */}
                <Card className="sm-up" style={{ animationDelay: ".12s", display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Donut pct={salary?.pct || 0} color={TIER_COLOR(salary?.pct || 0)} size={108} thick={11} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center" }}>
                      <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900, lineHeight: 1, color: TIER_COLOR(salary?.pct || 0) }}>
                        {Math.round(salary?.pct || 0)}%
                      </p>
                      <p style={{ margin: 0, fontSize: ".52rem", color: C.muted, fontWeight: 600 }}>achieved</p>
                    </div>
                  </div>
                  <div>
                    <Micro>Achievement</Micro>
                    <p style={{ margin: "6px 0 3px", fontSize: "1.15rem", fontWeight: 800,
                      color: TIER_COLOR(salary?.pct || 0), lineHeight: 1 }}>
                      {TIER_LABEL(salary?.pct || 0)}
                    </p>
                    <p style={{ margin: 0, fontSize: ".75rem", color: C.muted }}>
                      {fmtS(salary?.current || 0)} / {fmtS(salary?.target || 0)}
                    </p>
                    <div style={{ marginTop: 10, height: 6, borderRadius: 99, background: C.dim, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(salary?.pct || 0, 100)}%`,
                        borderRadius: 99, background: TIER_COLOR(salary?.pct || 0),
                        transition: "width .7s ease" }} />
                    </div>
                  </div>
                </Card>

                {/* Attendance */}
                <Card className="sm-up" style={{ animationDelay: ".16s" }}>
                  <Micro style={{ marginBottom: 10 }}>Attendance — {currentMonth}</Micro>
                  {salary?.hasAtt ? (
                    <>
                      {[["Work Days", salary.workDays], ["Total Days", salary.totalDays]].map(([lbl, val]) => (
                        <div key={lbl} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: ".82rem", color: C.muted }}>{lbl}</span>
                          <span style={{ fontSize: ".88rem", fontWeight: 700, color: C.text }}>{val}</span>
                        </div>
                      ))}
                      <HBar pct={(parseFloat(salary.workDays) / salary.totalDays) * 100} color={C.blue} />
                      <p style={{ margin: "7px 0 0", fontSize: ".74rem", color: C.blue, fontWeight: 700 }}>
                        {((parseFloat(salary.workDays) / salary.totalDays) * 100).toFixed(0)}% attendance rate
                      </p>
                    </>
                  ) : (
                    <div style={{ marginTop: 10, padding: "12px 14px", background: C.amberBg,
                      borderRadius: 8, border: `1px solid ${C.amber}44` }}>
                      <p style={{ margin: 0, fontSize: ".8rem", color: C.amber, fontWeight: 600 }}>
                        ⚠️ No attendance data for this month
                      </p>
                    </div>
                  )}
                </Card>

                {/* Net Payable */}
                <Card className="sm-up" style={{ animationDelay: ".2s",
                  background: `linear-gradient(135deg,#fff,${C.accentBg}55)`,
                  border: `1.5px solid ${C.accent}33` }}>
                  <Micro style={{ marginBottom: 8 }}>Net Payable This Month</Micro>
                  <p style={{ margin: "0 0 3px", fontSize: "2.1rem", fontWeight: 900, color: C.accent, lineHeight: 1 }}>
                    ₹{fmt(salary?.payable || 0)}
                  </p>
                  <p style={{ margin: "0 0 12px", fontSize: ".75rem", color: C.muted }}>
                    {salary?.sp}% of {salary?.hasAtt ? "pro-rated" : "base"} ₹{fmt(salary?.prorated || 0)}
                  </p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {[25, 50, 75, 100].map(t => (
                      <span key={t} style={{ padding: "2px 9px", borderRadius: 99, fontSize: ".63rem", fontWeight: 700,
                        background: (salary?.pct || 0) >= t ? TIER_BG(t) : C.dim,
                        color: (salary?.pct || 0) >= t ? TIER_COLOR(t) : C.muted }}>
                        {t}%
                      </span>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Line chart — monthly trend */}
              <Card className="sm-up" style={{ animationDelay: ".24s", marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <Micro>Monthly Trend</Micro>
                    <p style={{ margin: "3px 0 0", fontWeight: 700, color: C.text, fontSize: ".92rem" }}>
                      Sales History — Last 6 Months
                    </p>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: 99, background: C.greenBg,
                    color: C.green, fontWeight: 700, fontSize: ".7rem" }}>🔴 Live</span>
                </div>
                {monthHistory.length >= 2 ? (
                  <LineChart height={150} width={600}
                    datasets={[{ color: C.accent, points: monthHistory.map(([m, v]) => ({
                      y: v, label: new Date(m + "-01").toLocaleDateString("en-IN", { month: "short" }),
                    })) }]} />
                ) : (
                  <p style={{ color: C.muted, textAlign: "center", padding: "30px 0", fontSize: ".85rem" }}>
                    Not enough data for chart
                  </p>
                )}
                {/* Month tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(88px,1fr))", gap: 8, marginTop: 16 }}>
                  {monthHistory.map(([m, v], i) => {
                    const prev   = i > 0 ? monthHistory[i - 1][1] : null;
                    const growth = prev !== null && prev > 0 ? ((v - prev) / prev * 100) : null;
                    const isCur  = m === TODAY_MONTH();
                    return (
                      <div key={m} style={{ background: isCur ? C.accentBg : C.surface,
                        border: `1px solid ${isCur ? C.accent + "44" : C.border}`, borderRadius: 9, padding: "8px 10px", textAlign: "center" }}>
                        <p style={{ margin: 0, fontSize: ".6rem", fontWeight: 700, color: isCur ? C.accent : C.muted }}>
                          {new Date(m + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                          {isCur && " 🔴"}
                        </p>
                        <p style={{ margin: "3px 0 2px", fontSize: ".88rem", fontWeight: 800, color: C.text }}>{fmtS(v)}</p>
                        {growth !== null && (
                          <p style={{ margin: 0, fontSize: ".62rem", fontWeight: 700, color: growth >= 0 ? C.green : C.red }}>
                            {growth >= 0 ? "▲" : "▼"}{Math.abs(growth).toFixed(0)}%
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Category breakdown + Salary rules */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <Card className="sm-up" style={{ animationDelay: ".28s" }}>
                  <Micro style={{ marginBottom: 12 }}>Sales by Category</Micro>
                  {(() => {
                    const byComp = selEntries.reduce((acc, e) => {
                      const c = e.company || "Other";
                      acc[c] = (acc[c] || 0) + parseFloat(e.amount || 0);
                      return acc;
                    }, {});
                    const total = Object.values(byComp).reduce((s, v) => s + v, 0);
                    const entries = Object.entries(byComp).sort(([, a], [, b]) => b - a);
                    if (!entries.length) return <p style={{ color: C.muted, fontSize: ".85rem" }}>No entries</p>;
                    return entries.map(([co, v], i) => (
                      <div key={co} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ color: C.textSub, fontWeight: 600, fontSize: ".83rem" }}>{co}</span>
                          <span style={{ fontSize: ".8rem", color: C.muted }}>
                            <strong style={{ color: EMP_COLORS[i % EMP_COLORS.length] }}>{fmtS(v)}</strong>
                            &nbsp;· {total > 0 ? ((v / total) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                        <HBar pct={total > 0 ? (v / total) * 100 : 0} color={EMP_COLORS[i % EMP_COLORS.length]} />
                      </div>
                    ));
                  })()}
                </Card>

                <Card className="sm-up" style={{ animationDelay: ".3s" }}>
                  <Micro style={{ marginBottom: 12 }}>Salary Eligibility Rules</Micro>
                  {[
                    { range: "≥ 100%",     payout: "Full Salary (100%)", t: 100 },
                    { range: "75 – 99%",   payout: "75% of Salary",      t: 75 },
                    { range: "50 – 74%",   payout: "50% of Salary",      t: 50 },
                    { range: "25 – 49%",   payout: "25% of Salary",      t: 25 },
                    { range: "Below 25%",  payout: "No Salary (0%)",     t: 0 },
                  ].map((r, i) => {
                    const isCurrentTier = salary?.sp === r.t && (i < 4 ? true : salary?.sp === 0);
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", marginBottom: 6, borderRadius: 8,
                        background: isCurrentTier ? TIER_BG(r.t || 1) : C.surface,
                        border: `1px solid ${isCurrentTier ? TIER_COLOR(r.t || 1) + "44" : C.border}` }}>
                        <span style={{ fontWeight: 700, color: TIER_COLOR(r.t || 1), fontSize: ".8rem" }}>{r.range}</span>
                        <span style={{ color: C.muted, fontSize: ".78rem" }}>{r.payout}</span>
                        {isCurrentTier && <span style={{ fontSize: ".68rem", fontWeight: 700,
                          color: TIER_COLOR(r.t || 1), marginLeft: 6 }}>← Now</span>}
                      </div>
                    );
                  })}
                </Card>
              </div>

              {/* Transactions table with delete */}
              {selEntries.length > 0 && (
                <Card className="sm-up" style={{ animationDelay: ".33s", padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <Micro>All Transactions</Micro>
                      <p style={{ margin: "3px 0 0", fontWeight: 700, color: C.text, fontSize: ".9rem" }}>Sales Entries</p>
                    </div>
                    <span style={{ padding: "4px 12px", borderRadius: 99, background: C.blueBg,
                      color: C.blue, fontWeight: 700, fontSize: ".72rem" }}>{selEntries.length} records</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: C.surface }}>
                          {["Date", "Client", "Category", "Amount", "Remarks", "Action"].map(h => (
                            <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: ".63rem",
                              fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.muted }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...selEntries].sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date)).map((e, i) => (
                          <tr key={e.id || i} className="sm-erow" style={{ borderTop: `1px solid ${C.border}`,
                            opacity: deleting === e.id ? .4 : 1, transition: "opacity .2s" }}>
                            <td style={{ padding: "12px 16px", fontSize: ".83rem", color: C.muted }}>
                              {new Date(e.sale_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: ".85rem", fontWeight: 600, color: C.text }}>
                              {e.client_name}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <span style={{ padding: "2px 10px", borderRadius: 99, background: C.accentBg,
                                color: C.accent, fontWeight: 700, fontSize: ".72rem" }}>{e.company}</span>
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: ".9rem", fontWeight: 800, color: C.green }}>
                              ₹{fmt(e.amount)}
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: ".8rem", color: C.muted }}>
                              {e.remarks || "—"}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              {deleting === e.id ? (
                                <span style={{ fontSize: ".75rem", color: C.muted }}>Deleting…</span>
                              ) : (
                                <DeleteBtn onConfirm={() => deleteEntry(e.id)} label="Delete" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}