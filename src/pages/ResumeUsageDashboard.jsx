/* eslint-disable */
// ResumeUsageDashboard.jsx — VJC Overseas Chairman Analytics
// Real-time resume usage data from Postgres via /api/resume/stats
// Socket.IO live updates when new resumes are generated

import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const FLAG_MAP = {
  uk:"🇬🇧",germany:"🇩🇪",france:"🇫🇷",european:"🇪🇺",netherlands:"🇳🇱",sweden:"🇸🇪",
  denmark:"🇩🇰",norway:"🇳🇴",switzerland:"🇨🇭",spain:"🇪🇸",italy:"🇮🇹",poland:"🇵🇱",
  portugal:"🇵🇹",gulf:"🌏",dubai:"🇦🇪",saudi:"🇸🇦",singapore:"🇸🇬",malaysia:"🇲🇾",
  india:"🇮🇳",japan:"🇯🇵",china:"🇨🇳",hongkong:"🇭🇰",southkorea:"🇰🇷",thailand:"🇹🇭",
  philippines:"🇵🇭",us:"🇺🇸",canadian:"🇨🇦",brazil:"🇧🇷",mexico:"🇲🇽",
  australian:"🇦🇺",nz:"🇳🇿",southafrica:"🇿🇦",nigeria:"🇳🇬",kenya:"🇰🇪",
};

const ACTION_META = {
  generate:    { label:"Generated",    color:"#16a34a", bg:"#f0fdf4", border:"#86efac", emoji:"📄" },
  jd_analysis: { label:"JD Analysis",  color:"#d97706", bg:"#fffbeb", border:"#fde68a", emoji:"🔍" },
  jd_rebuild:  { label:"JD Rebuild",   color:"#7c3aed", bg:"#faf5ff", border:"#d8b4fe", emoji:"✨" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function fmtRel(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNum({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = Number(value) || 0;
    if (end === 0) { setDisplay(0); return; }
    const step = Math.ceil(end / 30);
    const t = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(t); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <>{display}</>;
}

// ── Mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(d => d.cnt), 1);
  const W = 120, H = 36;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (d.cnt / max) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - (d.cnt / max) * (H - 4) - 2;
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
      })}
    </svg>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function ResumeUsageDashboard() {
  const [stats, setStats]         = useState(null);
  const [logs, setLogs]           = useState([]);
  const [totalCount, setTotal]    = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const [page, setPage]           = useState(1);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [liveFlash, setLiveFlash] = useState(false);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing]   = useState(false);

  const socketRef = useRef(null);
  const PER_PAGE  = 25;

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (p = page, f = filter, s = search) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: p, per_page: PER_PAGE });
      if (f && f !== "all") params.set("action", f);
      if (s) params.set("search", s);

      const res = await fetch(`${BASE}/api/resume/stats?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setStats(data.stats);
      setLogs(data.logs || []);
      setTotal(data.total_count || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => { fetchData(page, filter, search); }, [page, filter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchData(1, filter, search); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Socket.IO live updates ─────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(BASE, { withCredentials: true });
    socketRef.current = socket;

    socket.emit("join_resume_dashboard");

    socket.on("resume_log_added", (newLog) => {
      // Flash indicator
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 2000);

      // If on page 1 and no filters, prepend to log
      if (page === 1 && filter === "all" && !search) {
        setLogs(prev => [newLog, ...prev].slice(0, PER_PAGE));
        setTotal(p => p + 1);
      }

      // Refresh stats
      fetchData(page, filter, search);
    });

    return () => socket.disconnect();
  }, []);

  // ── Clear logs ─────────────────────────────────────────────────────────────
  const clearLogs = async () => {
    setClearing(true);
    try {
      const res = await fetch(`${BASE}/api/resume/logs/clear`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Clear failed");
      setLogs([]);
      setStats(null);
      setTotal(0);
      setShowClearConfirm(false);
      fetchData(1, "all", "");
    } catch (e) {
      setError(e.message);
    } finally {
      setClearing(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  // ── Card style ─────────────────────────────────────────────────────────────
  const card = {
    background: "#fff", borderRadius: 16, border: "1.5px solid #e8ecf0",
    padding: "20px 22px", boxShadow: "0 3px 16px rgba(0,0,0,.05)"
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .dash-card { animation: fadeUp .3s ease both }
      `}</style>

      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: "100%" }}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #0c0f1a 0%, #0f2d5c 50%, #1a1066 100%)",
          borderRadius: 20, padding: "24px 30px", marginBottom: 22, color: "#fff", position: "relative", overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: -80, right: -40, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.12),transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", opacity: .35, marginBottom: 6 }}>Chairman Analytics</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: -.5 }}>📊 Resume Builder — Live Analytics</div>
              <div style={{ fontSize: 12, opacity: .5, marginTop: 5 }}>Real-time data from Postgres · Updates live as staff generate resumes</div>
            </div>
            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: liveFlash ? "rgba(34,197,94,.25)" : "rgba(255,255,255,.08)", border: `1px solid ${liveFlash ? "#22c55e" : "rgba(255,255,255,.15)"}`, borderRadius: 20, padding: "6px 14px", transition: "all .4s" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: liveFlash ? "#86efac" : "rgba(255,255,255,.6)" }}>{liveFlash ? "New activity!" : "Live"}</span>
            </div>
          </div>

          {/* Aggregate stat pills */}
          <div style={{ display: "flex", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
            {[
              { val: stats?.total_actions   || 0, lbl: "Total Actions",  color: "#818cf8" },
              { val: stats?.total_generated || 0, lbl: "Resumes Built",  color: "#34d399" },
              { val: stats?.total_analyses  || 0, lbl: "JD Analyses",    color: "#fbbf24" },
              { val: stats?.total_rebuilds  || 0, lbl: "JD Rebuilds",    color: "#c084fc" },
              { val: stats?.avg_match_score ? `${stats.avg_match_score}%` : "—", lbl: "Avg JD Match", color: "#60a5fa" },
            ].map(({ val, lbl, color }) => (
              <div key={lbl} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "10px 18px", textAlign: "center", minWidth: 80 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color }}>
                  {typeof val === "number" ? <AnimatedNum value={val} /> : val}
                </div>
                <div style={{ fontSize: 10, opacity: .5, marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
            ⚠️ {error}
            <button onClick={() => fetchData(page, filter, search)} style={{ marginLeft: 12, background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Retry</button>
          </div>
        )}

        {/* ── CHARTS ROW ──────────────────────────────────────────────────── */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14, marginBottom: 18 }}>

            {/* Activity chart (14 days) */}
            <div style={card} className="dash-card">
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Activity (Last 14 Days)</div>
              {stats.daily_activity && stats.daily_activity.length > 0 ? (() => {
                const maxV = Math.max(...stats.daily_activity.map(d => d.cnt), 1);
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 72 }}>
                      {stats.daily_activity.map((d, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          {d.cnt > 0 && <div style={{ fontSize: 8, color: "#64748b", fontWeight: 700 }}>{d.cnt}</div>}
                          <div style={{ width: "100%", background: d.cnt > 0 ? "#2563eb" : "#e2e8f0", borderRadius: "3px 3px 0 0", height: `${Math.max(4, (d.cnt / maxV) * 58)}px`, transition: "height .4s" }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 9, color: "#94a3b8" }}>{stats.daily_activity[0]?.day?.slice(5)}</span>
                      <span style={{ fontSize: 9, color: "#94a3b8" }}>{stats.daily_activity[stats.daily_activity.length - 1]?.day?.slice(5)}</span>
                    </div>
                  </>
                );
              })() : <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>No activity yet</div>}
            </div>

            {/* Top countries */}
            <div style={card} className="dash-card">
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>🌍 Top Countries</div>
              {stats.top_countries?.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8" }}>No data yet</div>}
              {(stats.top_countries || []).map(({ country, cnt }) => (
                <div key={country} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{FLAG_MAP[country] || "🌐"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: "#1e293b", marginBottom: 3 }}>
                      <span style={{ textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{country}</span>
                      <span style={{ color: "#2563eb", flexShrink: 0, marginLeft: 4 }}>{cnt}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(cnt / (stats.total_generated || 1)) * 100}%`, background: "linear-gradient(90deg, #2563eb, #60a5fa)", borderRadius: 99 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Top employees */}
            <div style={card} className="dash-card">
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>👤 Top Staff</div>
              {stats.top_employees?.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8" }}>No data yet</div>}
              {(stats.top_employees || []).map(({ employee_name, cnt }, i) => (
                <div key={employee_name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: ["#2563eb","#7c3aed","#059669","#d97706","#dc2626","#0d7377"][i % 6], color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {(employee_name || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: "#1e293b" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employee_name}</span>
                      <span style={{ color: "#16a34a", flexShrink: 0, marginLeft: 4 }}>{cnt}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: "#e2e8f0", marginTop: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(cnt / (stats.total_actions || 1)) * 100}%`, background: "linear-gradient(90deg, #16a34a, #4ade80)", borderRadius: 99 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTER + SEARCH BAR ──────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 3 }}>
            {[["all","All"],["generate","Generated"],["jd_analysis","JD Analysis"],["jd_rebuild","JD Rebuild"]].map(([k, l]) => (
              <button key={k} onClick={() => { setFilter(k); setPage(1); }}
                style={{ padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: filter === k ? "#fff" : "transparent", color: filter === k ? "#2563eb" : "#64748b", fontFamily: "inherit", boxShadow: filter === k ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidate or employee…"
              style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none", background: "#fff" }}
              onFocus={e => e.target.style.borderColor = "#2563eb"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          <button onClick={() => fetchData(page, filter, search)} style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#374151", fontFamily: "inherit" }}>
            🔄 Refresh
          </button>

          {showClearConfirm ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 9, padding: "6px 12px" }}>
              <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Clear all {totalCount} logs?</span>
              <button onClick={clearLogs} disabled={clearing} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {clearing ? "Clearing…" : "Yes, Clear"}
              </button>
              <button onClick={() => setShowClearConfirm(false)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#e5e7eb", color: "#374151", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowClearConfirm(true)} style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid #fca5a5", background: "#fef2f2", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#dc2626", fontFamily: "inherit" }}>
              🗑 Clear Logs
            </button>
          )}
        </div>

        {/* ── TABLE ───────────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e8ecf0", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
          <div style={{ padding: "14px 22px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "#374151" }}>
              Usage Log — {totalCount.toLocaleString()} total entries
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Stored in Postgres · Real-time updates via Socket.IO</span>
          </div>

          {loading ? (
            <div style={{ padding: "50px 20px", textAlign: "center" }}>
              <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", margin: "0 auto 12px", animation: "spin .75s linear infinite" }} />
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Loading…</div>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>📭</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>No logs yet</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Activity will appear here in real-time as staff use the Resume Builder.</div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}>
                      {["#","Action","Employee","Candidate","Country","Template","Match","Time",""].map(h => (
                        <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,.7)", whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,.06)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => {
                      const act = ACTION_META[log.action] || ACTION_META.generate;
                      return (
                        <tr key={log.id || idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f8faff", borderBottom: "1px solid #f1f5f9", transition: "background .1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#f8faff"}>
                          <td style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>{(page - 1) * PER_PAGE + idx + 1}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ background: act.bg, color: act.color, border: `1px solid ${act.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                              {act.emoji} {act.label}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a", fontSize: 12 }}>{log.employee_name || "—"}</td>
                          <td style={{ padding: "10px 14px", color: "#374151", fontSize: 12 }}>{log.candidate_name || "—"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {log.country ? (
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontSize: 15 }}>{FLAG_MAP[log.country] || "🌐"}</span>
                                <span style={{ fontSize: 11.5, color: "#374151", textTransform: "capitalize" }}>{log.country}</span>
                              </span>
                            ) : <span style={{ color: "#94a3b8" }}>—</span>}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 11.5, color: "#374151" }}>{log.template_name || "—"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {log.match_score != null ? (
                              <span style={{ fontWeight: 800, color: log.match_score >= 70 ? "#16a34a" : log.match_score >= 45 ? "#d97706" : "#dc2626", fontSize: 13 }}>
                                {log.match_score}%
                                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, marginLeft: 3 }}>({log.match_label})</span>
                              </span>
                            ) : <span style={{ color: "#e2e8f0" }}>—</span>}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                            <div>{fmtDate(log.created_at)}</div>
                            <div style={{ color: "#94a3b8", marginTop: 1 }}>{fmtRel(log.created_at)}</div>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            {log.file_name && (
                              <span title={log.file_name} style={{ fontSize: 10, color: "#94a3b8", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                                📁 {log.file_name.split("_").slice(-2).join("_")}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ padding: "12px 22px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Page {page} of {totalPages} · {totalCount.toLocaleString()} total
                  </span>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: page === 1 ? "#f8fafc" : "#fff", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, color: page === 1 ? "#94a3b8" : "#374151", fontFamily: "inherit" }}>
                      ← Prev
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                      return p <= totalPages ? (
                        <button key={p} onClick={() => setPage(p)}
                          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: p === page ? "#2563eb" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: p === page ? "#fff" : "#374151", fontFamily: "inherit" }}>
                          {p}
                        </button>
                      ) : null;
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: page === totalPages ? "#f8fafc" : "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, color: page === totalPages ? "#94a3b8" : "#374151", fontFamily: "inherit" }}>
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
          💡 All data stored in Postgres · Live updates via Socket.IO · Chairman-only view
        </div>
      </div>
    </>
  );
}