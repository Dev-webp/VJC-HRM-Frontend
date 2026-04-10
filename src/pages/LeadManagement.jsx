/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";

const BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

const STATUS_CFG = {
  "New":           { color: "#0f172a", bg: "#f8fafc", border: "#cbd5e1", dot: "#64748b" },
  "Prospect":      { color: "#1e40af", bg: "#eff6ff", border: "#93c5fd", dot: "#3b82f6" },
  "Warm":          { color: "#92400e", bg: "#fef3c7", border: "#fcd34d", dot: "#f59e0b" },
  "Cold":          { color: "#155e75", bg: "#f0f9ff", border: "#7dd3fc", dot: "#0ea5e9" },
  "Process":       { color: "#5b21b6", bg: "#f5f3ff", border: "#c4b5fd", dot: "#8b5cf6" },
  "Case Complete": { color: "#065f46", bg: "#ecfdf5", border: "#6ee7b7", dot: "#10b981" },
  "Hold":          { color: "#9a3412", bg: "#fff7ed", border: "#fdba74", dot: "#f97316" },
  "Drop":          { color: "#991b1b", bg: "#fef2f2", border: "#fca5a5", dot: "#ef4444" },
  "Converted":     { color: "#14532d", bg: "#f0fdf4", border: "#86efac", dot: "#22c55e" },
  "Dead":          { color: "#374151", bg: "#f9fafb", border: "#d1d5db", dot: "#9ca3af" },
};
const ALL_STATUSES = Object.keys(STATUS_CFG);
const ACTED = ["Prospect","Warm","Cold","Process","Case Complete","Hold","Drop","Converted","Dead"];

function slug(n=""){return n.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");}

// ─── Styles ───────────────────────────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --f:'DM Sans',sans-serif; --fm:'DM Mono',monospace;
  --bg:#f6f7f9; --s:#fff; --s2:#fafafa; --b:#e5e7eb; --b2:#f3f4f6;
  --k:#0f172a; --k2:#6b7280; --k3:#9ca3af;
  --blue:#2563eb; --green:#16a34a; --red:#dc2626; --amber:#d97706; --purple:#7c3aed;
  --r:8px; --r2:12px; --r3:16px;
  --sh:0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.04);
  --sh2:0 4px 16px rgba(0,0,0,.08),0 2px 6px rgba(0,0,0,.04);
  --sh3:0 20px 60px rgba(0,0,0,.14),0 8px 24px rgba(0,0,0,.08);
}
body{font-family:var(--f);background:var(--bg);color:var(--k);-webkit-font-smoothing:antialiased;}
input,select,textarea,button{font-family:var(--f);}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
@keyframes slideR{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.3)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}
@keyframes ringIn{from{opacity:0;transform:scale(.92) translateY(-6px)}to{opacity:1;transform:scale(1) translateY(0)}}
.pu{animation:fadeUp .25s ease both;}
.pu2{animation:fadeUp .25s .06s ease both;}
.pu3{animation:fadeUp .25s .12s ease both;}
.btn{display:inline-flex;align-items:center;gap:6px;border:none;border-radius:var(--r);font-family:var(--f);font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;font-size:13px;}
.bp{background:var(--k);color:#fff;padding:8px 18px;}
.bp:hover{background:#1e293b;} .bp:disabled{opacity:.4;cursor:not-allowed;}
.bs{background:var(--s);color:var(--k);padding:8px 16px;border:1px solid var(--b);}
.bs:hover{background:var(--bg);border-color:#9ca3af;}
.bd{background:#fef2f2;color:var(--red);padding:7px 14px;border:1px solid #fecaca;}
.bd:hover{background:#fee2e2;}
.bsm{background:var(--s);color:var(--k);padding:5px 11px;font-size:12px;font-weight:500;border:1px solid var(--b);border-radius:6px;cursor:pointer;transition:background .12s;white-space:nowrap;}
.bsm:hover{background:var(--bg);}
.bpurp{background:#f5f3ff;color:#5b21b6;padding:5px 11px;font-size:12px;font-weight:600;border:1px solid #c4b5fd;border-radius:6px;cursor:pointer;transition:all .12s;}
.bpurp:hover{background:#ede9fe;}
.bamber{background:#fffbeb;color:#92400e;padding:5px 11px;font-size:12px;font-weight:600;border:1px solid #fcd34d;border-radius:6px;cursor:pointer;transition:all .12s;}
.bamber:hover{background:#fef3c7;}
.fl{display:block;font-size:12px;font-weight:600;color:var(--k2);margin-bottom:5px;}
.fi{width:100%;padding:9px 12px;border:1px solid var(--b);border-radius:var(--r);font-size:13px;font-family:var(--f);color:var(--k);background:var(--s);outline:none;transition:border-color .15s;}
.fi:focus{border-color:var(--k);}
.fi::placeholder{color:var(--k3);}
.card{background:var(--s);border:1px solid var(--b);border-radius:var(--r2);box-shadow:var(--sh);}
.panel{background:var(--s);border:1px solid var(--b);border-radius:var(--r2);}
.schip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid;white-space:nowrap;}
.sdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.cok{font-family:var(--fm);font-size:11px;font-weight:500;color:var(--green);background:#f0fdf4;padding:3px 9px;border-radius:20px;}
.cwn{font-family:var(--fm);font-size:11px;font-weight:500;color:var(--amber);background:#fffbeb;padding:3px 9px;border-radius:20px;animation:blink 1.4s infinite;}
.cex{font-family:var(--fm);font-size:11px;font-weight:500;color:var(--red);background:#fef2f2;padding:3px 9px;border-radius:20px;}
.cdo{font-size:11px;font-weight:600;color:var(--green);}
.crem{font-family:var(--fm);font-size:11px;font-weight:500;color:#5b21b6;background:#f5f3ff;padding:3px 9px;border-radius:20px;}
.dt{width:100%;border-collapse:collapse;font-size:13px;}
.dt thead tr{border-bottom:1px solid var(--b);}
.dt th{padding:10px 13px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--k3);background:var(--s2);white-space:nowrap;}
.dt tbody tr{border-bottom:1px solid var(--b2);cursor:pointer;transition:background .1s;}
.dt tbody tr:hover{background:#f9fafb;}
.dt td{padding:11px 13px;vertical-align:top;}
.dt tbody tr:last-child{border-bottom:none;}
.tg{display:flex;gap:2px;background:#f3f4f6;padding:3px;border-radius:8px;border:1px solid var(--b);}
.ti{padding:6px 14px;font-size:13px;font-weight:500;color:var(--k2);border:none;background:transparent;cursor:pointer;border-radius:6px;transition:all .15s;}
.ti.on{background:var(--s);color:var(--k);font-weight:700;box-shadow:var(--sh);}
.fp{padding:5px 12px;border:1px solid var(--b);border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;background:transparent;color:var(--k2);transition:all .15s;}
.fp:hover{border-color:#9ca3af;color:var(--k);}
.fp.on{background:var(--k);color:#fff;border-color:var(--k);}
.tt{width:40px;height:22px;border-radius:11px;border:1px solid var(--b);background:#e5e7eb;position:relative;transition:all .2s;flex-shrink:0;cursor:pointer;}
.tt.on{background:var(--k);border-color:var(--k);}
.th{width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);}
.tt.on .th{transform:translateX(18px);}
.ov{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;z-index:5000;padding:20px;backdrop-filter:blur(3px);}
.mb{background:var(--s);border-radius:var(--r3);width:100%;max-height:92vh;overflow-y:auto;box-shadow:var(--sh3);animation:scaleIn .18s ease;}
.mh{padding:22px 26px 18px;border-bottom:1px solid var(--b2);display:flex;justify-content:space-between;align-items:flex-start;position:sticky;top:0;background:var(--s);z-index:1;border-radius:var(--r3) var(--r3) 0 0;}
.mbd{padding:22px 26px;}
.mc{width:30px;height:30px;border-radius:50%;border:1px solid var(--b);background:transparent;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:var(--k2);transition:all .15s;flex-shrink:0;}
.mc:hover{background:var(--bg);}
.ar{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:var(--r);padding:10px 14px;font-size:12px;line-height:1.6;}
.aa{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:var(--r);padding:10px 14px;font-size:12px;line-height:1.6;}
.ag{background:#f0fdf4;border:1px solid #86efac;color:#15803d;border-radius:var(--r);padding:10px 14px;font-size:12px;line-height:1.6;}
.ap{background:#f5f3ff;border:1px solid #c4b5fd;color:#5b21b6;border-radius:var(--r);padding:10px 14px;font-size:12px;line-height:1.6;}
.mc2{background:var(--s);border:1px solid var(--b);border-radius:var(--r2);padding:18px 20px;}
.mn{font-size:28px;font-weight:800;letter-spacing:-.04em;line-height:1;}
.ml{font-size:11px;color:var(--k2);margin-top:4px;font-weight:500;}
.pt{height:5px;background:var(--b);border-radius:3px;overflow:hidden;}
.pf{height:100%;border-radius:3px;transition:width .6s ease;}
.av{border-radius:50%;background:var(--k);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.tli{display:flex;gap:12px;padding-bottom:18px;}
.tli:last-child{padding-bottom:0;}
.tlw{display:flex;flex-direction:column;align-items:center;width:10px;flex-shrink:0;}
.tld{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:2px;}
.tll{width:1px;background:var(--b);flex:1;margin-top:4px;}
.eh{background:var(--k);color:#fff;border-radius:var(--r2);padding:22px 26px;}
.np{position:fixed;top:66px;right:18px;z-index:9000;display:flex;flex-direction:column;gap:8px;width:320px;}
.nc{background:var(--s);border:1px solid var(--b);border-left:3px solid var(--amber);border-radius:var(--r);padding:12px 14px;box-shadow:var(--sh2);animation:slideR .22s ease;font-size:12px;}
.nc-red{border-left-color:var(--red);}
.nc-purp{border-left-color:var(--purple);}
.nc-green{border-left-color:var(--green);}
.sw{position:relative;}
.si{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--k3);pointer-events:none;}
.sin{padding:8px 12px 8px 32px;border:1px solid var(--b);border-radius:var(--r);font-size:13px;font-family:var(--f);color:var(--k);background:var(--s);outline:none;transition:border-color .15s;width:200px;}
.sin:focus{border-color:var(--k);}
.sin::placeholder{color:var(--k3);}
.bb{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--k2);background:var(--s);border:1px solid var(--b);border-radius:var(--r);cursor:pointer;transition:all .15s;}
.bb:hover{background:var(--bg);color:var(--k);}
.bc{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--k2);margin-bottom:18px;}
.lc{background:var(--s);border:1px solid var(--b);border-radius:var(--r2);overflow:hidden;transition:box-shadow .15s;cursor:pointer;}
.lc:hover{box-shadow:var(--sh2);}
.kvg{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.kvk{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--k3);margin-bottom:3px;}
.kvv{font-size:13px;font-weight:600;color:var(--k);}
.sl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--k3);margin-bottom:10px;}
.sp{width:18px;height:18px;border:2px solid var(--b);border-top-color:var(--k);border-radius:50%;animation:spin 1s linear infinite;}
.es{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:var(--k3);text-align:center;}
.pr{border:1px solid var(--b);border-radius:var(--r);overflow:hidden;margin-bottom:8px;}
.ph{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--s2);border-bottom:1px solid var(--b2);}
.pb{padding:10px 16px;display:flex;flex-direction:column;gap:10px;}
.prow{display:flex;align-items:center;justify-content:space-between;gap:12px;}

/* ── Ticket cards ── */
.tkcard{background:var(--s);border:1px solid var(--b);border-radius:var(--r2);overflow:hidden;margin-bottom:10px;}
.tkcard-open{border-left:3px solid var(--red);}
.tkcard-closed{border-left:3px solid var(--green);opacity:.75;}

/* ── Employee ticket banner (top of dashboard) ── */
.emp-ticket-banner{background:#fef2f2;border:1px solid #fecaca;border-left:4px solid var(--red);border-radius:var(--r2);padding:16px 20px;margin-bottom:18px;animation:pulse 2s infinite;}

.rmring{background:#fff;border:2px solid var(--purple);border-radius:var(--r2);padding:16px 20px;box-shadow:0 4px 20px rgba(124,58,237,.15);animation:ringIn .3s ease;}
.calinput{width:100%;padding:10px 12px;border:1.5px solid var(--purple);border-radius:var(--r);font-size:13px;font-family:var(--f);color:var(--k);background:#f5f3ff;outline:none;cursor:pointer;}
.badge{display:inline-flex;align-items:center;justify-content:center;border-radius:20px;font-size:10px;font-weight:700;padding:2px 7px;min-width:18px;}
.badge-red{background:#fef2f2;color:var(--red);border:1px solid #fecaca;}
.badge-purple{background:#f5f3ff;color:#5b21b6;border:1px solid #c4b5fd;}
.badge-amber{background:#fffbeb;color:#92400e;border:1px solid #fcd34d;}
.badge-green{background:#f0fdf4;color:var(--green);border:1px solid #86efac;}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDT(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function fmtD(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}

// ─── Countdown ───────────────────────────────────────────────────────────────
function useCd(deadlineIso, acted) {
  const [rem, setRem] = useState(null);
  useEffect(() => {
    if (!deadlineIso || acted) return;
    const tick = () => { const d = new Date(deadlineIso) - Date.now(); setRem(d > 0 ? d : 0); };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [deadlineIso, acted]);
  if (acted) return { label: "Responded", cls: "cdo" };
  if (rem === null) return { label: "—", cls: "cok" };
  if (rem === 0) return { label: "EXPIRED", cls: "cex" };
  const m = Math.floor(rem / 60000), s = Math.floor((rem % 60000) / 1000);
  return { label: `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`, cls: rem < 10*60000 ? "cwn" : "cok" };
}
function CD({ deadlineIso, status, remarksCount }) {
  const acted = ACTED.includes(status) || (remarksCount || 0) > 0;
  const { label, cls } = useCd(deadlineIso, acted);
  return <span className={cls}>{label}</span>;
}

function useNextCallCd(nextCallAt) {
  const [rem, setRem] = useState(null);
  useEffect(() => {
    if (!nextCallAt) return;
    const tick = () => { const d = new Date(nextCallAt) - Date.now(); setRem(d); };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [nextCallAt]);
  if (!nextCallAt || rem === null) return null;
  if (rem <= 0) return { label: "Call now!", cls: "cex", urgent: true };
  const h = Math.floor(rem / 3600000);
  const m = Math.floor((rem % 3600000) / 60000);
  const s = Math.floor((rem % 60000) / 1000);
  if (h > 0) return { label: `${h}h ${m}m`, cls: "crem", urgent: false };
  if (m > 5) return { label: `${m}m ${s}s`, cls: "crem", urgent: false };
  return { label: `${m}m ${s}s`, cls: "cwn", urgent: m < 2 };
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const I = {
  back: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>,
  x: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  search: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  spin: <div className="sp" />,
  bell: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  ticket: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>,
  calendar: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  check: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m20 6-11 11-5-5"/></svg>,
  alert: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>,
  warning: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>,
};

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled }) {
  return (
    <div className={`tt${on?" on":""}`} onClick={disabled ? undefined : () => onChange(!on)}
      style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1 }}>
      <div className="th" />
    </div>
  );
}

function Chip({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG["New"];
  return <span className="schip" style={{ background: c.bg, color: c.color, borderColor: c.border }}><span className="sdot" style={{ background: c.dot }} />{status}</span>;
}

// ══════════════════════════════════════════════════════════════
//  EMPLOYEE TICKETS PANEL
//  Shows all SLA tickets raised against the current employee.
//  Visible in the "Tickets" tab in employee dashboard.
//  Open tickets block lead editing — must be resolved by chairman.
// ══════════════════════════════════════════════════════════════
function EmployeeTicketsPanel({ tickets }) {
  const [tab, setTab] = useState("open");
  const open   = tickets.filter(t => !t.resolved_at);
  const closed = tickets.filter(t =>  t.resolved_at);
  const shown  = tab === "open" ? open : closed;

  return (
    <div className="pu">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>My SLA Tickets</div>
        <div style={{ fontSize: 12, color: "var(--k2)", marginTop: 3 }}>
          Tickets are raised when you miss the 45-minute response window on an assigned lead.
          Contact the chairman to resolve open tickets.
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: open.length > 0 ? "#fef2f2" : "var(--s)", border: `1px solid ${open.length > 0 ? "#fecaca" : "var(--b)"}`, borderLeft: `4px solid ${open.length > 0 ? "var(--red)" : "var(--b)"}`, borderRadius: "var(--r2)", padding: "18px 20px" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: open.length > 0 ? "var(--red)" : "var(--k3)" }}>{open.length}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: open.length > 0 ? "#991b1b" : "var(--k2)", marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>Open Tickets</div>
          <div style={{ fontSize: 11, color: open.length > 0 ? "#7f1d1d" : "var(--k3)", marginTop: 6 }}>
            {open.length > 0
              ? "⚠️ You cannot edit blocked leads until resolved."
              : "✓ All clear — no open tickets."}
          </div>
        </div>
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderLeft: "4px solid var(--green)", borderRadius: "var(--r2)", padding: "18px 20px" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--green)" }}>{closed.length}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#14532d", marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>Resolved Tickets</div>
          <div style={{ fontSize: 11, color: "#15803d", marginTop: 6 }}>Resolved by chairman</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="tg" style={{ marginBottom: 16, width: "fit-content" }}>
        <button className={`ti${tab === "open" ? " on" : ""}`} onClick={() => setTab("open")}>
          Open {open.length > 0 && <span className="badge badge-red" style={{ marginLeft: 5 }}>{open.length}</span>}
        </button>
        <button className={`ti${tab === "closed" ? " on" : ""}`} onClick={() => setTab("closed")}>
          Resolved <span className="badge badge-green" style={{ marginLeft: 5 }}>{closed.length}</span>
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="es">
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: tab === "closed" ? "#f0fdf4" : "var(--b2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            {tab === "closed" ? <span style={{ fontSize: 24 }}>✓</span> : I.ticket}
          </div>
          <div style={{ fontWeight: 600, color: "var(--k2)" }}>
            {tab === "closed" ? "No resolved tickets yet" : "No open tickets — great work!"}
          </div>
          <div style={{ fontSize: 12, color: "var(--k3)", marginTop: 4 }}>
            {tab === "open"
              ? "Keep responding to leads within 45 minutes."
              : "Resolved tickets will appear here."}
          </div>
        </div>
      ) : (
        <div>
          {shown.map(t => (
            <div key={t.id} className={`tkcard ${t.resolved_at ? "tkcard-closed" : "tkcard-open"}`}>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontFamily: "var(--fm)", fontWeight: 700, color: t.resolved_at ? "var(--green)" : "var(--red)" }}>
                    Ticket #{t.id}
                  </span>
                  {t.resolved_at
                    ? <span className="badge badge-green">Resolved</span>
                    : <span className="badge badge-red" style={{ animation: "pulse 2s infinite" }}>Open — action required</span>
                  }
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--k3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Lead</div>
                    <div style={{ fontWeight: 700 }}>{t.lead_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--k3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Ticket Raised</div>
                    <div style={{ fontWeight: 600, color: "var(--red)" }}>{fmtDT(t.raised_at)}</div>
                  </div>
                  {t.resolved_at && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--k3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Resolved At</div>
                      <div style={{ fontWeight: 600, color: "var(--green)" }}>{fmtDT(t.resolved_at)}</div>
                    </div>
                  )}
                </div>

                {!t.resolved_at && (
                  <div style={{ marginTop: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 12, color: "#991b1b" }}>
                    <strong>What to do:</strong> Call or message your chairman and ask them to resolve this ticket.
                    You cannot update this lead until it is resolved.
                  </div>
                )}

                {t.resolution && (
                  <div style={{ marginTop: 10, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 12, color: "#15803d" }}>
                    <strong>Chairman's resolution:</strong> {t.resolution}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  CHAIRMAN TICKETS PANEL
// ══════════════════════════════════════════════════════════════
function CloseTicketModal({ ticket, onClose, onClosed }) {
  const [resolution, setResolution] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    if (!resolution.trim()) { setErr("Please provide a resolution note."); return; }
    setLoading(true);
    try {
      await axios.post(`${BASE}/leads/tickets/${ticket.id}/close`, { resolution: resolution.trim() }, { withCredentials: true });
      onClosed();
      onClose();
    } catch (e) { setErr(e.response?.data?.message || "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="ov" style={{ zIndex: 6500 }} onClick={onClose}>
      <div className="mb" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="sl">Resolve Ticket #{ticket.id}</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Close & Reset Timer</div>
            <div style={{ fontSize: 12, color: "var(--k2)", marginTop: 3 }}>
              Lead: <strong>{ticket.lead_name}</strong> · Employee: <strong>{ticket.employee_name}</strong>
            </div>
          </div>
          <button className="mc" onClick={onClose}>{I.x}</button>
        </div>
        <div className="mbd">
          <div className="aa" style={{ marginBottom: 14 }}>
            <strong>What happens:</strong> Closing this ticket resets the 45-min response timer on the lead.
            The employee can now work the lead normally again.
          </div>
          <label className="fl">Chairman resolution note <span style={{ color:"var(--red)" }}>*</span></label>
          <textarea className="fi" style={{ minHeight: 80, resize: "vertical", marginBottom: 14 }}
            placeholder="e.g. Employee counselled. Reassigned or given fresh start."
            value={resolution} onChange={e => setResolution(e.target.value)} />
          {err && <div className="ar" style={{ marginBottom: 10 }}>{err}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn bs" onClick={onClose}>Cancel</button>
            <button className="btn bp" onClick={go} disabled={loading}>{loading ? "Closing…" : "Close Ticket & Reset"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChairmanTicketsPanel({ tickets, onRefresh }) {
  const [closing, setClosing] = useState(null);
  const [tab, setTab] = useState("open");
  const open   = tickets.filter(t => !t.resolved_at);
  const closed = tickets.filter(t =>  t.resolved_at);
  const shown  = tab === "open" ? open : closed;

  return (
    <div className="pu">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>SLA Breach Tickets</div>
          <div style={{ fontSize: 12, color: "var(--k2)", marginTop: 2 }}>
            Raised automatically when an employee misses the 45-min response window.
            You must close tickets to unblock the employee.
          </div>
        </div>
        <div className="tg">
          <button className={`ti${tab === "open" ? " on" : ""}`} onClick={() => setTab("open")}>
            Open {open.length > 0 && <span className="badge badge-red" style={{ marginLeft: 5 }}>{open.length}</span>}
          </button>
          <button className={`ti${tab === "closed" ? " on" : ""}`} onClick={() => setTab("closed")}>
            Resolved <span className="badge badge-green" style={{ marginLeft: 5 }}>{closed.length}</span>
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="es">
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: tab === "closed" ? "#f0fdf4" : "var(--b2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            {tab === "closed" ? <span style={{ fontSize: 24 }}>✓</span> : I.ticket}
          </div>
          <div style={{ fontWeight: 600, color: "var(--k2)" }}>
            {tab === "closed" ? "No resolved tickets" : "All clear — no open tickets"}
          </div>
          <div style={{ fontSize: 12, color: "var(--k3)", marginTop: 4 }}>
            {tab === "open"
              ? "Tickets appear when employees miss the 45-min SLA."
              : "Resolved tickets appear here."}
          </div>
        </div>
      ) : (
        <div>
          {shown.map(t => (
            <div key={t.id} className={`tkcard ${t.resolved_at ? "tkcard-closed" : "tkcard-open"}`}>
              <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontFamily: "var(--fm)", color: t.resolved_at ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                      #{t.id}
                    </span>
                    {t.resolved_at
                      ? <span className="badge badge-green">Resolved</span>
                      : <span className="badge badge-red" style={{ animation: "pulse 2s infinite" }}>Open</span>
                    }
                  </div>

                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--k3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Employee</div>
                      <div style={{ fontWeight: 700, marginTop: 2 }}>{t.employee_name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--k3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Lead</div>
                      <div style={{ fontWeight: 700, marginTop: 2 }}>{t.lead_name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--k3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Raised At</div>
                      <div style={{ fontWeight: 600, fontSize: 12, color: "var(--red)", marginTop: 2 }}>{fmtDT(t.raised_at)}</div>
                    </div>
                    {t.resolved_at && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--k3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Resolved At</div>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "var(--green)", marginTop: 2 }}>{fmtDT(t.resolved_at)}</div>
                      </div>
                    )}
                    {t.resolved_by_name && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--k3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Resolved By</div>
                        <div style={{ fontWeight: 600, fontSize: 12, marginTop: 2 }}>{t.resolved_by_name}</div>
                      </div>
                    )}
                  </div>

                  {t.resolution && (
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "var(--r)", fontSize: 12, color: "#15803d" }}>
                      <strong>Resolution:</strong> {t.resolution}
                    </div>
                  )}
                </div>

                {!t.resolved_at && (
                  <button className="btn bp" style={{ padding: "7px 16px", fontSize: 12 }} onClick={() => setClosing(t)}>
                    {I.check} Close Ticket
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {closing && (
        <CloseTicketModal
          ticket={closing}
          onClose={() => setClosing(null)}
          onClosed={() => { onRefresh(); setClosing(null); }}
        />
      )}
    </div>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────
function HistPanel({ leadId, leadName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios.get(`${BASE}/leads/${leadId}/history`, { withCredentials: true })
      .then(r => setData(r.data)).catch(() => setData({ assignments: [], remarks: [] })).finally(() => setLoading(false));
  }, [leadId]);
  const tl = React.useMemo(() => {
    if (!data) return [];
    return [...data.assignments.map(a => ({ ...a, _t: "a", _ts: a.assigned_at })), ...data.remarks.map(r => ({ ...r, _t: "r", _ts: r.created_at }))].sort((a, b) => new Date(a._ts) - new Date(b._ts));
  }, [data]);

  return (
    <div className="ov" onClick={onClose}>
      <div className="mb" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="sl">Complete Timeline</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{leadName}</div>
          </div>
          <button className="mc" onClick={onClose}>{I.x}</button>
        </div>
        <div className="mbd" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>{I.spin}</div>
            : tl.length === 0 ? <div style={{ fontSize: 13, color: "var(--k2)" }}>No activity yet.</div>
              : tl.map((item, i) => {
                const isLast = i === tl.length - 1;
                const c = item._t === "r" && item.status_at_time ? STATUS_CFG[item.status_at_time] : null;
                return (
                  <div key={i} className="tli">
                    <div className="tlw">
                      <div className="tld" style={{ background: item._t === "a" ? "#0f172a" : "#3b82f6" }} />
                      {!isLast && <div className="tll" />}
                    </div>
                    <div style={{ flex: 1, paddingTop: 1 }}>
                      {item._t === "a" ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            Assigned to <strong>{item.assignee_name || "Unknown"}</strong>
                            {item.assigned_by_name && <span style={{ color: "var(--k2)", fontWeight: 400 }}> · by {item.assigned_by_name}</span>}
                            {item.is_current && <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, marginLeft: 8 }}>Current</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--k3)", marginTop: 3 }}>{fmtDT(item._ts)}</div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{item.author_name || "Unknown"}</span>
                            {c && <span className="schip" style={{ background: c.bg, color: c.color, borderColor: c.border, fontSize: 10 }}>{item.status_at_time}</span>}
                            <span style={{ fontSize: 11, color: "var(--k3)" }}>{fmtDT(item._ts)}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--k2)", marginTop: 5, lineHeight: 1.6 }}>{item.remark}</div>
                          {item.next_call_at && (
                            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#5b21b6" }}>
                              {I.calendar} Next call: <strong>{fmtDT(item.next_call_at)}</strong>
                              {item.next_call_note && <span style={{ color: "var(--k3)" }}>— {item.next_call_note}</span>}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}

// ─── Update Modal ─────────────────────────────────────────────────────────────
function NextCallScheduler({ leadId, leadName, onClose, onScheduled }) {
  const [dt, setDt] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const d = new Date(Date.now() + 24 * 3600000);
    d.setSeconds(0, 0);
    setDt(d.toISOString().slice(0, 16));
  }, []);

  const quick = (mins) => {
    const d = new Date(Date.now() + mins * 60000);
    d.setSeconds(0, 0);
    setDt(d.toISOString().slice(0, 16));
  };

  const save = async () => {
    if (!dt) { setErr("Pick a date and time."); return; }
    const ts = new Date(dt);
    if (ts <= new Date()) { setErr("Must be a future time."); return; }
    setLoading(true);
    try {
      await axios.post(`${BASE}/leads/${leadId}/next-call`, { next_call_at: ts.toISOString(), note: note.trim() }, { withCredentials: true });
      onScheduled(ts.toISOString());
      onClose();
    } catch (e) { setErr(e.response?.data?.message || "Failed to schedule."); }
    finally { setLoading(false); }
  };

  const QUICK = [
    { l: "30 min", v: 30 }, { l: "1 hour", v: 60 }, { l: "2 hours", v: 120 },
    { l: "Tomorrow", v: 24 * 60 }, { l: "2 days", v: 2 * 24 * 60 }, { l: "1 week", v: 7 * 24 * 60 },
  ];

  return (
    <div className="ov" style={{ zIndex: 7000 }} onClick={onClose}>
      <div className="mb" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="sl">📅 Next Call Reminder</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{leadName}</div>
          </div>
          <button className="mc" onClick={onClose}>{I.x}</button>
        </div>
        <div className="mbd">
          <div style={{ marginBottom: 16 }}>
            <div className="sl">Quick set</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {QUICK.map(q => (
                <button key={q.l} className="bpurp" onClick={() => quick(q.v)}>{q.l}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="fl">Custom date & time</label>
            <input type="datetime-local" className="fi" style={{ border: "1.5px solid var(--purple)", background: "#f5f3ff" }} value={dt} onChange={e => setDt(e.target.value)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="fl">Note <span style={{ color: "var(--k3)", fontWeight: 400 }}>optional</span></label>
            <input type="text" className="fi" placeholder="e.g. Follow up on PR Canada docs" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          {dt && <div className="ap" style={{ marginBottom: 14 }}><strong>Set for:</strong> {fmtDT(new Date(dt).toISOString())}</div>}
          {err && <div className="ar" style={{ marginBottom: 12 }}>{err}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn bs" onClick={onClose}>Skip</button>
            <button className="btn bp" onClick={save} disabled={loading}>{loading ? "Saving…" : "Set Reminder"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpdateModal({ lead, isChairman, canAssign, employees, isBlocked, onClose, onUpdated }) {
  const [status, setStatus] = useState(lead.status);
  const [remark, setRemark] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [hist, setHist] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [savedLeadId, setSavedLeadId] = useState(null);

  const save = async () => {
    if (isBlocked && !isChairman) { setErr("Open ticket — contact chairman."); return; }
    if (!remark.trim() && status === lead.status && !assignTo) { setErr("Make at least one change."); return; }
    setLoading(true); setErr("");
    try {
      const p = { status };
      if (canAssign && assignTo) p.assigned_to = parseInt(assignTo);
      await axios.put(`${BASE}/leads/${lead.id}`, p, { withCredentials: true });
      if (remark.trim()) {
        await axios.post(`${BASE}/leads/${lead.id}/remarks`, { remark: remark.trim(), status_at_time: status }, { withCredentials: true });
        setSavedLeadId(lead.id);
        setShowScheduler(true);
      } else {
        onUpdated(); onClose();
      }
    } catch (e) { setErr(e.response?.data?.message || "Failed"); }
    finally { setLoading(false); }
  };

  if (showScheduler) {
    return (
      <NextCallScheduler
        leadId={savedLeadId || lead.id}
        leadName={lead.name}
        onClose={() => { setShowScheduler(false); onUpdated(); onClose(); }}
        onScheduled={() => { onUpdated(); onClose(); }}
      />
    );
  }

  return (
    <>
      <div className="ov" onClick={onClose}>
        <div className="mb" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
          <div className="mh">
            <div>
              <div className="sl">{lead.assigned_by_name ? `Assigned by ${lead.assigned_by_name}` : "Update Lead"}</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{lead.name}</div>
              <div style={{ fontSize: 12, color: "var(--k2)", marginTop: 3 }}>{lead.contact} · {lead.email}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <button className="mc" onClick={onClose}>{I.x}</button>
              <button className="bsm" onClick={() => setHist(true)}>History</button>
            </div>
          </div>
          <div className="mbd">
            {isBlocked && !isChairman && <div className="ar" style={{ marginBottom: 14 }}>Open ticket — resolve with chairman first.</div>}
            {lead.next_call_at && (
              <div className="ap" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                {I.calendar}
                <span><strong>Next call:</strong> {fmtDT(lead.next_call_at)}</span>
                {lead.next_call_note && <span style={{ color: "var(--k3)" }}>— {lead.next_call_note}</span>}
              </div>
            )}
            <label className="fl">Status</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 16 }}>
              {ALL_STATUSES.map(k => {
                const c = STATUS_CFG[k]; const sel = status === k;
                return <button key={k} onClick={() => setStatus(k)} style={{ padding: "7px 3px", border: `1.5px solid ${sel ? c.dot : c.border}`, borderRadius: "var(--r)", fontSize: 11, cursor: "pointer", background: sel ? c.bg : "#fff", color: sel ? c.color : "var(--k2)", fontWeight: sel ? 700 : 500, transition: "all .15s", fontFamily: "var(--f)", textAlign: "center" }}>{k}</button>;
              })}
            </div>
            <label className="fl">Add Remark <span style={{ fontWeight: 400, color: "var(--k3)", marginLeft: 4 }}>permanent</span></label>
            <textarea className="fi" style={{ minHeight: 84, resize: "vertical", marginBottom: 14 }} placeholder="What was discussed? Next steps?" value={remark} onChange={e => setRemark(e.target.value)} />
            {canAssign && (
              <>
                <label className="fl">Reassign To</label>
                <select className="fi" style={{ marginBottom: 14 }} value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                  <option value="">Keep current — {lead.assignee_name || "Unassigned"}</option>
                  {employees.filter(e => e.user_id !== lead.assigned_to).map(e => <option key={e.user_id} value={e.user_id}>{e.name} ({e.location || "N/A"})</option>)}
                </select>
              </>
            )}
            {err && <div className="ar" style={{ marginTop: 12 }}>{err}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button className="btn bs" onClick={onClose}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={loading}>{loading ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      </div>
      {hist && <HistPanel leadId={lead.id} leadName={lead.name} onClose={() => setHist(false)} />}
    </>
  );
}

function DelModal({ lead, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setLoading(true);
    try { await axios.delete(`${BASE}/leads/${lead.id}`, { withCredentials: true }); onDeleted(); onClose(); }
    catch (e) { setErr(e.response?.data?.message || "Failed"); setLoading(false); }
  };
  return (
    <div className="ov" style={{ zIndex: 6000 }} onClick={onClose}>
      <div className="mb" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div><div className="sl">Danger Zone</div><div style={{ fontSize: 17, fontWeight: 800 }}>Delete Lead?</div></div>
          <button className="mc" onClick={onClose}>{I.x}</button>
        </div>
        <div className="mbd">
          <div className="ar">Cannot be undone. Permanently deleting <strong>{lead.name}</strong> ({lead.contact}) and all history.</div>
          {err && <div className="ar" style={{ marginTop: 8 }}>{err}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
            <button className="btn bs" onClick={onClose}>Cancel</button>
            <button className="btn bd" onClick={go} disabled={loading}>{loading ? "Deleting…" : "Delete Permanently"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermsModal({ employees, onClose }) {
  const [perms, setPerms] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    Promise.all([
      axios.get(`${BASE}/leads/creators`, { withCredentials: true }).then(r => r.data).catch(() => []),
      axios.get(`${BASE}/leads/viewers`, { withCredentials: true }).then(r => r.data).catch(() => []),
    ]).then(([creators, viewers]) => {
      const map = {};
      employees.forEach(e => { map[e.user_id] = { canCreate: false, canViewAll: false }; });
      creators.forEach(c => { if (map[c.user_id]) map[c.user_id].canCreate = true; });
      viewers.forEach(v => { if (map[v.user_id]) map[v.user_id].canViewAll = true; });
      setPerms(map);
    }).finally(() => setLoading(false));
  }, [employees]);

  const toggle = async (uid, perm) => {
    setSaving(s => ({ ...s, [`${uid}_${perm}`]: true }));
    const cur = perms[uid]?.[perm];
    try {
      if (perm === "canCreate") {
        if (cur) await axios.delete(`${BASE}/leads/creators/${uid}`, { withCredentials: true });
        else await axios.post(`${BASE}/leads/creators`, { user_id: uid }, { withCredentials: true });
      } else {
        if (cur) await axios.delete(`${BASE}/leads/viewers/${uid}`, { withCredentials: true });
        else await axios.post(`${BASE}/leads/viewers`, { user_id: uid }, { withCredentials: true });
      }
      setPerms(p => ({ ...p, [uid]: { ...p[uid], [perm]: !cur } }));
    } catch {}
    finally { setSaving(s => ({ ...s, [`${uid}_${perm}`]: false })); }
  };

  const PDEFS = [
    { key: "canCreate", label: "Lead Creator", desc: "Can add leads and assign to any employee." },
    { key: "canViewAll", label: "Analytics Viewer", desc: "Can see Analytics tab with all leads and stats." },
  ];

  return (
    <div className="ov" onClick={onClose}>
      <div className="mb" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="sl">Chairman · Access Control</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Manage Permissions</div>
          </div>
          <button className="mc" onClick={onClose}>{I.x}</button>
        </div>
        <div className="mbd">
          {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>{I.spin}</div> : (
            <div>
              {employees.map(emp => (
                <div key={emp.user_id} className="pr">
                  <div className="ph">
                    <div className="av" style={{ width: 34, height: 34, fontSize: 13 }}>{(emp.name || "?")[0].toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{emp.name}</div>
                      <div style={{ fontSize: 11, color: "var(--k3)" }}>{emp.role || "Employee"} · {emp.location || "N/A"}</div>
                    </div>
                  </div>
                  <div className="pb">
                    {PDEFS.map(p => (
                      <div key={p.key} className="prow">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</div>
                          <div style={{ fontSize: 11, color: "var(--k3)", marginTop: 2 }}>{p.desc}</div>
                        </div>
                        <Toggle on={!!perms[emp.user_id]?.[p.key]} onChange={() => toggle(emp.user_id, p.key)} disabled={!!saving[`${emp.user_id}_${p.key}`]} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button className="btn bp" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Lead Page ────────────────────────────────────────────────────────────
function AddLeadPage({ isChairman, canAssign, employees, onBack, onCreated }) {
  const [form, setForm] = useState({ name:"",contact:"",email:"",age:"",education:"",experience:"",domain:"",calling_city:"",service_interested:"",lead_source:"",additional_comments:"",assigned_to:"" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [dupWarn, setDupWarn] = useState(null);
  const [force, setForce] = useState(false);

  const checkDup = async (field, value) => {
    if (!value) return;
    try {
      const r = await axios.get(`${BASE}/leads/check-duplicate`, { params: { field, [field]: value }, withCredentials: true });
      if (r.data.exists) setDupWarn({ field, lead: r.data.lead });
      else setDupWarn(p => p?.field === field ? null : p);
    } catch {}
  };
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async () => {
    setLoading(true); setErr("");
    try {
      const payload = { ...form, force };
      if (form.assigned_to && canAssign) payload.assigned_to = parseInt(form.assigned_to);
      else delete payload.assigned_to;
      const r = await axios.post(`${BASE}/leads/create`, payload, { withCredentials: true });
      onCreated(r.data);
    } catch (e) {
      const msg = e.response?.data?.message || "Create failed";
      if (e.response?.status === 409) { setDupWarn({ field: e.response.data.duplicate_field, lead: e.response.data.existing }); setErr(msg + " — Force create to proceed."); setForce(true); }
      else setErr(msg);
    } finally { setLoading(false); }
  };

  const SVCS = ["PR - Canada","PR - Australia","PR - UK","PR - Germany","PR - New Zealand","Student Visa - UK","Student Visa - Canada","Student Visa - Australia","Student Visa - USA","Work Visa - Germany","Work Visa - Canada","Work Visa - UK","Business Visa - USA","Business Visa - UK","Tourist Visa","Family Visa","Dependent Visa","Spouse Visa"];
  const SRCS = ["Facebook Ad","Google Ad","Instagram Ad","LinkedIn","Walk-in","Referral","Website","Cold Call","WhatsApp","Email Campaign","Event","Other"];

  return (
    <div className="pu">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <button className="bb" onClick={onBack}>{I.back} Back</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Add New Lead</div>
          <div style={{ fontSize: 12, color: "var(--k2)", marginTop: 2 }}>45-min timer starts on assignment.</div>
        </div>
      </div>
      {dupWarn && <div className="aa" style={{ marginBottom: 14 }}>Duplicate <strong>{dupWarn.field}</strong> — existing: <strong>{dupWarn.lead.name}</strong>. {force && "Use Force Create to proceed."}</div>}
      <div style={{ background: "var(--s)", border: "1px solid var(--b)", borderRadius: "var(--r2)", padding: "22px 26px", maxWidth: 800 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { k:"name", l:"Full Name", req:true },
            { k:"contact", l:"Mobile Number", req:true, blur: v=>checkDup("contact",v) },
            { k:"email", l:"Email Address", req:true, blur: v=>checkDup("email",v) },
            { k:"age", l:"Age", req:true, type:"number" },
            { k:"education", l:"Education", req:true },
            { k:"experience", l:"Experience (years)", req:true, type:"number" },
            { k:"domain", l:"Domain / Field", req:true },
            { k:"calling_city", l:"Calling City", req:true },
          ].map(({ k, l, req, type, blur }) => (
            <div key={k}>
              <label className="fl">{l}{req && <span style={{ color:"var(--red)",marginLeft:2 }}>*</span>}</label>
              <input type={type||"text"} className="fi" placeholder={l} value={form[k]} onChange={e=>upd(k,e.target.value)} onBlur={blur?e=>blur(e.target.value):undefined} />
            </div>
          ))}
          <div>
            <label className="fl">Service Interested <span style={{ color:"var(--red)" }}>*</span></label>
            <select className="fi" value={form.service_interested} onChange={e=>upd("service_interested",e.target.value)}>
              <option value="">Select service</option>
              {SVCS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="fl">Lead Source <span style={{ color:"var(--red)" }}>*</span></label>
            <select className="fi" value={form.lead_source} onChange={e=>upd("lead_source",e.target.value)}>
              <option value="">Select source</option>
              {SRCS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {canAssign && (
            <div>
              <label className="fl">Assign To</label>
              <select className="fi" value={form.assigned_to} onChange={e=>upd("assigned_to",e.target.value)}>
                <option value="">Assign to yourself</option>
                {employees.map(e=><option key={e.user_id} value={e.user_id}>{e.name} ({e.location||"N/A"})</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="fl">Additional Comments</label>
          <textarea className="fi" style={{ minHeight: 70, resize: "vertical" }} placeholder="Extra notes…" value={form.additional_comments} onChange={e=>upd("additional_comments",e.target.value)} />
        </div>
        <div className="ag" style={{ marginTop: 12 }}>45-minute response timer starts automatically on assignment.</div>
        {err && <div className="ar" style={{ marginTop: 12 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn bs" onClick={onBack}>Cancel</button>
          <button className="btn bp" onClick={submit} disabled={loading}>{loading ? "Creating…" : force ? "Force Create" : "Create Lead"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function Analytics({ leads, employees, allTickets, onSelectEmp }) {
  const [period, setPeriod] = useState("all");
  const now = new Date();
  const fl = period==="all"?leads:leads.filter(l=>{
    const d=new Date(l.created_at);
    if(period==="today") return d.toDateString()===now.toDateString();
    if(period==="week") return (now-d)<7*86400000;
    if(period==="month") return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    return true;
  });
  const tot=fl.length,conv=fl.filter(l=>l.status==="Converted").length,drop=fl.filter(l=>l.status==="Drop").length,newL=fl.filter(l=>l.status==="New").length,proc=fl.filter(l=>l.status==="Process").length;
  const openTix=allTickets.filter(t=>!t.resolved_at).length;
  const cr=tot>0?((conv/tot)*100).toFixed(1):"0.0";
  const sr=ALL_STATUSES.map(s=>({s,count:fl.filter(l=>l.status===s).length})).filter(r=>r.count>0).sort((a,b)=>b.count-a.count);
  const maxSt=Math.max(...sr.map(r=>r.count),1);
  const empSt=employees.map(emp=>{
    const el=fl.filter(l=>l.assigned_to===emp.user_id);
    const cv=el.filter(l=>l.status==="Converted").length;
    const rs=el.filter(l=>ACTED.includes(l.status)||(l.remarks_count||0)>0).length;
    const tix=allTickets.filter(t=>t.employee_id===emp.user_id);
    const openTixCount=tix.filter(t=>!t.resolved_at).length;
    const slaOk=el.length>0?Math.max(0,Math.round(((el.length-tix.length)/el.length)*100)):100;
    return{...emp,total:el.length,conv:cv,cr:el.length>0?((cv/el.length)*100).toFixed(1):"0.0",rr:el.length>0?Math.round((rs/el.length)*100):0,tixTotal:tix.length,openTix:openTixCount,slaOk,sb:ALL_STATUSES.reduce((a,k)=>{a[k]=el.filter(l=>l.status===k).length;return a;},{})};
  }).sort((a,b)=>b.total-a.total);
  const PER=[{k:"today",l:"Today"},{k:"week",l:"This Week"},{k:"month",l:"This Month"},{k:"all",l:"All Time"}];

  return (
    <div className="pu">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12 }}>
        <div>
          <div style={{ fontSize:16,fontWeight:800 }}>Analytics Overview</div>
          <div style={{ fontSize:12,color:"var(--k2)",marginTop:2 }}>Performance metrics across all employees</div>
        </div>
        <div className="tg">{PER.map(p=><button key={p.k} className={`ti${period===p.k?" on":""}`} onClick={()=>setPeriod(p.k)}>{p.l}</button>)}</div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:18 }}>
        {[{l:"Total Leads",v:tot,s:"in period"},{l:"Converted",v:conv,s:`${cr}% rate`,c:"var(--green)"},{l:"New / Unacted",v:newL,s:"awaiting action",c:"var(--blue)"},{l:"In Process",v:proc,s:"active",c:"#8b5cf6"},{l:"Dropped",v:drop,s:"lost",c:"var(--red)"},{l:"Open Tickets",v:openTix,s:`${allTickets.length} total`,c:openTix>0?"var(--red)":undefined}].map(({l,v,s,c})=>(
          <div key={l} className="mc2"><div className="mn" style={c?{color:c}:{}}>{v}</div><div className="ml">{l}</div><div style={{ fontSize:11,color:"var(--k3)" }}>{s}</div></div>
        ))}
      </div>
      <div className="panel" style={{ padding:"20px 22px",marginBottom:18 }}>
        <div className="sl">Status Distribution</div>
        {sr.length===0?<div style={{ fontSize:13,color:"var(--k2)" }}>No data.</div>:
          <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
            {sr.map(({s,count})=>{const c=STATUS_CFG[s];return(<div key={s} style={{ display:"flex",alignItems:"center",gap:12 }}><div style={{ width:96,fontSize:12,fontWeight:600,color:c.color,flexShrink:0 }}>{s}</div><div className="pt" style={{ flex:1 }}><div className="pf" style={{ width:`${Math.round((count/maxSt)*100)}%`,background:c.dot }} /></div><div style={{ width:24,fontSize:13,fontWeight:700,textAlign:"right" }}>{count}</div></div>);})}
          </div>
        }
      </div>
      <div className="panel">
        <div style={{ padding:"14px 18px",borderBottom:"1px solid var(--b2)",fontWeight:700,fontSize:14 }}>Employee Performance <span style={{ fontSize:12,color:"var(--k2)",fontWeight:400 }}>— click to drill in</span></div>
        {empSt.length===0?<div className="es"><div style={{ fontSize:13,color:"var(--k2)" }}>No employees.</div></div>:(
          <table className="dt">
            <thead><tr>{["Employee","Leads","Conv.","Rate","Response","SLA %","Tickets","Top Statuses"].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {empSt.map(emp=>(
                <tr key={emp.user_id} onClick={()=>onSelectEmp(emp)}>
                  <td><div style={{ display:"flex",alignItems:"center",gap:10 }}><div className="av" style={{ width:32,height:32,fontSize:13 }}>{(emp.name||"?")[0].toUpperCase()}</div><div><div style={{ fontWeight:600 }}>{emp.name}</div><div style={{ fontSize:11,color:"var(--k3)",marginTop:1 }}>{emp.location||"N/A"}</div></div></div></td>
                  <td><span style={{ fontSize:18,fontWeight:800 }}>{emp.total}</span></td>
                  <td><span style={{ fontSize:15,fontWeight:700,color:"var(--green)" }}>{emp.conv}</span></td>
                  <td><span style={{ fontWeight:700,color:parseFloat(emp.cr)>10?"var(--green)":"var(--k2)" }}>{emp.cr}%</span></td>
                  <td><div style={{ display:"flex",alignItems:"center",gap:8 }}><div className="pt" style={{ width:64 }}><div className="pf" style={{ width:`${emp.rr}%`,background:emp.rr>80?"#22c55e":emp.rr>50?"#f59e0b":"#ef4444" }} /></div><span style={{ fontSize:12,fontWeight:600 }}>{emp.rr}%</span></div></td>
                  <td><div style={{ display:"flex",alignItems:"center",gap:6 }}><div className="pt" style={{ width:48 }}><div className="pf" style={{ width:`${emp.slaOk}%`,background:emp.slaOk>90?"#22c55e":emp.slaOk>70?"#f59e0b":"#ef4444" }} /></div><span style={{ fontSize:12,fontWeight:600,color:emp.slaOk>90?"var(--green)":emp.slaOk>70?"var(--amber)":"var(--red)" }}>{emp.slaOk}%</span></div></td>
                  <td>{emp.tixTotal>0?(<div style={{ display:"flex",alignItems:"center",gap:5 }}>{emp.openTix>0&&<span className="badge badge-red">{emp.openTix} open</span>}<span style={{ fontSize:11,color:"var(--k3)" }}>{emp.tixTotal} total</span></div>):<span style={{ color:"var(--k3)",fontSize:12 }}>0</span>}</td>
                  <td><div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>{ALL_STATUSES.filter(s=>emp.sb[s]>0).slice(0,3).map(s=>{const c=STATUS_CFG[s];return<span key={s} className="schip" style={{ background:c.bg,color:c.color,borderColor:c.border,fontSize:10 }}>{s} {emp.sb[s]}</span>;})}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Lead Card (employee card view) ──────────────────────────────────────────
function LeadCard({ lead, onClick, blocked }) {
  const c = STATUS_CFG[lead.status] || STATUS_CFG["New"];
  const nextCallInfo = useNextCallCd(lead.next_call_at);
  const isThisLeadBlocked = blocked && blocked.some && blocked.some(t => t.lead_id === lead.id && !t.resolved_at);

  return (
    <div className="lc" onClick={() => onClick(lead)}>
      <div style={{ height: 3, background: c.dot }} />
      <div style={{ padding: "14px 16px" }}>
        {isThisLeadBlocked && (
          <div style={{ fontSize:11,fontWeight:700,color:"#991b1b",background:"#fef2f2",padding:"4px 10px",borderRadius:4,marginBottom:8,display:"inline-flex",alignItems:"center",gap:5 }}>
            {I.warning} Ticket Open — contact chairman
          </div>
        )}
        {nextCallInfo && (
          <div style={{ background: nextCallInfo.urgent?"#fef2f2":"#f5f3ff", border:`1px solid ${nextCallInfo.urgent?"#fecaca":"#c4b5fd"}`, borderRadius:"var(--r)", padding:"7px 12px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:12 }}>
              {I.bell}
              <span style={{ fontWeight:600, color:nextCallInfo.urgent?"#991b1b":"#5b21b6" }}>{nextCallInfo.urgent ? "Call now!" : "Next call"}</span>
              {lead.next_call_note && <span style={{ color:"var(--k3)" }}>— {lead.next_call_note}</span>}
            </div>
            <span className={nextCallInfo.cls}>{nextCallInfo.label}</span>
          </div>
        )}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15,fontWeight:700,marginBottom:6 }}>{lead.name}</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:12,fontSize:12,color:"var(--k2)",marginBottom:6 }}>
              {lead.age!=null&&<span>{lead.age} yrs</span>}
              <span>{lead.contact}</span><span>{lead.email}</span>
            </div>
            {lead.service_interested&&<div style={{ fontSize:12,fontWeight:600,color:"var(--blue)",marginTop:6 }}>{lead.service_interested}</div>}
            {lead.assigned_by_name&&<div style={{ fontSize:12,color:"var(--k2)",marginTop:5 }}>Assigned by <strong style={{ color:"var(--k)" }}>{lead.assigned_by_name}</strong></div>}
          </div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8 }}>
            <Chip status={lead.status} />
            <CD deadlineIso={lead.deadline_at} status={lead.status} remarksCount={lead.remarks_count} />
          </div>
        </div>
        {lead.latest_remark&&<div style={{ marginTop:8,padding:"8px 12px",background:"#eff6ff",borderRadius:"var(--r)",fontSize:12,color:"var(--k2)" }}><strong>Latest:</strong> {lead.latest_remark}{lead.remarks_count>1?<span style={{ color:"var(--blue)",marginLeft:6 }}>+{lead.remarks_count-1} more</span>:null}</div>}
      </div>
      <div style={{ padding:"9px 16px",borderTop:"1px solid var(--b2)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--s2)" }}>
        <span style={{ fontSize:11,color:"var(--k3)" }}>{lead.created_at?new Date(lead.created_at).toLocaleString("en-IN"):""}</span>
        <button className="bsm" onClick={e=>{e.stopPropagation();onClick(lead);}}>View / Update</button>
      </div>
    </div>
  );
}

// ─── Lead Detail Full Page ────────────────────────────────────────────────────
function LeadDetailPage({ lead, isChairman, canAssign, employees, tickets, onBack, onUpdated }) {
  const [upd, setUpd] = useState(false);
  const [del, setDel] = useState(false);
  const [hist, setHist] = useState(false);
  const [scheduler, setScheduler] = useState(false);
  const [histData, setHistData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${BASE}/leads/${lead.id}/history`,{withCredentials:true}).then(r=>setHistData(r.data)).catch(()=>setHistData({assignments:[],remarks:[]})).finally(()=>setLoading(false));
  },[lead.id]);
  const tl=React.useMemo(()=>{
    if(!histData) return [];
    return[...histData.assignments.map(a=>({...a,_t:"a",_ts:a.assigned_at})),...histData.remarks.map(r=>({...r,_t:"r",_ts:r.created_at}))].sort((a,b)=>new Date(a._ts)-new Date(b._ts));
  },[histData]);

  // Check if this specific lead has an open ticket
  const isBlocked = !isChairman && tickets && tickets.some(t => t.lead_id === lead.id && !t.resolved_at);
  const nextCallInfo = useNextCallCd(lead.next_call_at);

  return (
    <div className="pu">
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:12 }}>
        <div className="bc" style={{ margin:0 }}>
          <button className="bb" onClick={onBack}>{I.back} Back to Leads</button>
          <span style={{ color:"var(--k3)" }}>/</span>
          <span style={{ fontWeight:600 }}>{lead.name}</span>
        </div>
        <div style={{ display:"flex",gap:7 }}>
          <button className="bsm" onClick={()=>setHist(true)}>History</button>
          <button className="bpurp" onClick={()=>setScheduler(true)}>{I.calendar} Schedule Call</button>
          <button className="btn bp" style={{ padding:"6px 14px",fontSize:12 }} onClick={()=>setUpd(true)}>{isChairman||canAssign?"Edit / Update":"Add Remark"}</button>
          {isChairman&&<button className="btn bd" style={{ padding:"6px 12px",fontSize:12 }} onClick={()=>setDel(true)}>Delete</button>}
        </div>
      </div>

      {nextCallInfo && (
        <div className="rmring" style={{ marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:"#f5f3ff", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{I.bell}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"#5b21b6" }}>{nextCallInfo.urgent ? "🔔 Time to call!" : "Upcoming call reminder"}</div>
              <div style={{ fontSize:12, color:"var(--k2)", marginTop:2 }}>{lead.next_call_note || "Scheduled follow-up call"} · {fmtDT(lead.next_call_at)}</div>
            </div>
          </div>
          <span className={nextCallInfo.cls} style={{ fontSize:14, padding:"5px 14px" }}>{nextCallInfo.label}</span>
        </div>
      )}

      {isBlocked && (
        <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderLeft:"4px solid var(--red)", borderRadius:"var(--r2)", padding:"14px 18px", marginBottom:14 }}>
          <div style={{ fontWeight:700, color:"#991b1b", fontSize:14, display:"flex", alignItems:"center", gap:8 }}>{I.warning} Open SLA Ticket on this Lead</div>
          <div style={{ fontSize:12, color:"#7f1d1d", marginTop:4 }}>You cannot update this lead until the chairman resolves the ticket.</div>
        </div>
      )}

      <div className="card" style={{ padding:"20px 24px",marginBottom:14 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14 }}>
          <div>
            <div style={{ fontSize:22,fontWeight:800,marginBottom:8 }}>{lead.name}</div>
            <div style={{ display:"flex",gap:14,flexWrap:"wrap",fontSize:13,color:"var(--k2)" }}>
              <span>{lead.contact}</span><span>{lead.email}</span>
              {lead.calling_city&&<span>{lead.calling_city}</span>}
              {lead.age&&<span>{lead.age} yrs</span>}
            </div>
            {lead.assigned_by_name&&<div style={{ fontSize:12,color:"var(--k2)",marginTop:8 }}>Assigned by <strong style={{ color:"var(--k)" }}>{lead.assigned_by_name}</strong></div>}
          </div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:9 }}>
            <Chip status={lead.status} />
            <CD deadlineIso={lead.deadline_at} status={lead.status} remarksCount={lead.remarks_count} />
          </div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 270px",gap:14 }}>
        <div>
          <div className="card" style={{ padding:"18px 22px",marginBottom:14 }}>
            <div className="sl">Lead Information</div>
            <div className="kvg">
              {[["Education",lead.education],["Domain",lead.domain],["Service",lead.service_interested],["Source",lead.lead_source],["Assigned To",lead.assignee_name||"Unassigned"],["Created",fmtDT(lead.created_at)]].map(([k,v])=>(
                <div key={k}><div className="kvk">{k}</div><div className="kvv">{v||"—"}</div></div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding:"18px 22px" }}>
            <div className="sl">Activity Timeline</div>
            {loading?<div style={{ display:"flex",justifyContent:"center",padding:24 }}>{I.spin}</div>:tl.length===0?<div style={{ fontSize:13,color:"var(--k2)" }}>No activity yet.</div>:
              tl.map((item,i)=>{
                const isLast=i===tl.length-1;
                const c=item._t==="r"&&item.status_at_time?STATUS_CFG[item.status_at_time]:null;
                return(
                  <div key={i} className="tli">
                    <div className="tlw"><div className="tld" style={{ background:item._t==="a"?"#0f172a":"#3b82f6" }} />{!isLast&&<div className="tll" />}</div>
                    <div style={{ flex:1,paddingTop:1 }}>
                      {item._t==="a"?(<><div style={{ fontSize:13,fontWeight:600 }}>Assigned to <strong>{item.assignee_name}</strong>{item.is_current&&<span style={{ background:"#f0fdf4",color:"#16a34a",fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,marginLeft:8 }}>Current</span>}</div><div style={{ fontSize:11,color:"var(--k3)",marginTop:3 }}>{fmtDT(item._ts)}</div></>):(
                        <><div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}><span style={{ fontWeight:700,fontSize:13 }}>{item.author_name}</span>{c&&<span className="schip" style={{ background:c.bg,color:c.color,borderColor:c.border,fontSize:10 }}>{item.status_at_time}</span>}<span style={{ fontSize:11,color:"var(--k3)" }}>{fmtDT(item._ts)}</span></div><div style={{ fontSize:12,color:"var(--k2)",marginTop:5,lineHeight:1.6 }}>{item.remark}</div>{item.next_call_at&&<div style={{ marginTop:5,fontSize:11,color:"#5b21b6",display:"flex",alignItems:"center",gap:5 }}>{I.calendar} Next call: {fmtDT(item.next_call_at)}</div>}</>
                      )}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div className="card" style={{ padding:"16px 18px" }}>
            <div className="sl">Remarks</div>
            <div style={{ fontSize:30,fontWeight:800,lineHeight:1 }}>{lead.remarks_count||0}</div>
            <div style={{ fontSize:12,color:"var(--k2)",marginTop:4 }}>Total remarks</div>
            {lead.latest_remark&&<div style={{ marginTop:12,background:"var(--bg)",padding:"10px 12px",borderRadius:"var(--r)",border:"1px solid var(--b)",fontSize:12,color:"var(--k2)",fontStyle:"italic" }}>{lead.latest_remark}</div>}
          </div>
          <div className="card" style={{ padding:"16px 18px" }}>
            <div className="sl">Response Timer</div>
            <div style={{ marginBottom:6 }}><CD deadlineIso={lead.deadline_at} status={lead.status} remarksCount={lead.remarks_count} /></div>
            <div style={{ fontSize:11,color:"var(--k3)" }}>Must respond within 45 min</div>
          </div>
        </div>
      </div>

      {upd&&<UpdateModal lead={lead} isChairman={isChairman} canAssign={canAssign} employees={employees} isBlocked={isBlocked} onClose={()=>setUpd(false)} onUpdated={()=>{onUpdated();setUpd(false);}} />}
      {del&&<DelModal lead={lead} onClose={()=>setDel(false)} onDeleted={()=>{onUpdated();onBack();}} />}
      {hist&&<HistPanel leadId={lead.id} leadName={lead.name} onClose={()=>setHist(false)} />}
      {scheduler&&<NextCallScheduler leadId={lead.id} leadName={lead.name} onClose={()=>setScheduler(false)} onScheduled={()=>{onUpdated();setScheduler(false);}} />}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function LeadManagement({ isChairman = false }) {
  const navigate = useNavigate();
  const { employeeName, leadSlug } = useParams();

  const [view, setView] = useState("list");
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canViewAll, setCanViewAll] = useState(false);
  const [loading, setLoading] = useState(true);

  // tickets: employee's own tickets | allTickets: chairman sees all
  const [tickets, setTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);

  const [selLead, setSelLead] = useState(null);
  const [selEmp, setSelEmp] = useState(null);
  const [editLead, setEditLead] = useState(null);
  const [delLead, setDelLead] = useState(null);
  const [showPerms, setShowPerms] = useState(false);

  const [activeTab, setActiveTab] = useState("leads");
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [notifs, setNotifs] = useState([]);

  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const reminderCheckRef = useRef(null);

  const fetchLeads = useCallback(async () => {
    try { const r = await axios.get(`${BASE}/leads`, { withCredentials: true }); setLeads(r.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const fetchEmps = useCallback(async () => {
    try { const r = await axios.get(`${BASE}/leads/employees`, { withCredentials: true }); setEmployees(r.data); } catch {}
  }, []);

  const fetchAccess = useCallback(async () => {
    if (isChairman) { setCanCreate(true); setCanViewAll(true); fetchEmps(); return; }
    try {
      const r = await axios.get(`${BASE}/leads/my-access`, { withCredentials: true });
      setCanCreate(!!r.data.canCreate); setCanViewAll(!!r.data.canViewAll);
      if (r.data.canCreate) fetchEmps();
    } catch {}
  }, [isChairman, fetchEmps]);

  const fetchTickets = useCallback(async () => {
    if (isChairman) {
      try { const r = await axios.get(`${BASE}/leads/all-tickets`, { withCredentials: true }); setAllTickets(r.data || []); }
      catch { setAllTickets([]); }
      return;
    }
    // Always fetch employee's own tickets
    try { const r = await axios.get(`${BASE}/leads/my-tickets`, { withCredentials: true }); setTickets(r.data || []); }
    catch { setTickets([]); }
  }, [isChairman]);

  const fetchMe = useCallback(async () => {
    try { const r = await axios.get(`${BASE}/me`, { withCredentials: true }); setMyProfile(r.data); } catch {}
  }, []);

  // Reminder checker for next-call
  useEffect(() => {
    const alerted = new Set();
    reminderCheckRef.current = setInterval(() => {
      const now = Date.now();
      leads.forEach(lead => {
        if (!lead.next_call_at) return;
        const callTime = new Date(lead.next_call_at).getTime();
        const diff = callTime - now;
        const key = `${lead.id}_${lead.next_call_at}`;
        if (!alerted.has(key) && diff >= 0 && diff <= 5 * 60 * 1000) {
          alerted.add(key);
          const msg = diff < 30000
            ? `📞 Call ${lead.name} NOW! ${lead.next_call_note || ""}`
            : `📅 Call reminder: ${lead.name} in ~${Math.ceil(diff / 60000)} min`;
          setNotifs(p => [{ id: Date.now(), msg, type: "purple", time: new Date().toLocaleTimeString() }, ...p].slice(0, 6));
          if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(diff < 30000 ? "📞 Call now!" : "📅 Call reminder", { body: `${lead.name}` });
          }
        }
      });
    }, 15000);
    return () => clearInterval(reminderCheckRef.current);
  }, [leads]);

  useEffect(() => { fetchMe(); fetchAccess(); fetchLeads(); fetchTickets(); }, [fetchMe, fetchAccess, fetchLeads, fetchTickets]);

  // Socket
  useEffect(() => {
    const socket = io(BASE, { path: "/socket.io/", transports: ["polling", "websocket"], withCredentials: true });
    socketRef.current = socket;
    socket.on("connect", () => { if (myProfile?.id) socket.emit("join_user_room", { user_id: myProfile.id }); });

    socket.on("new_lead_assigned", data => {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
      setNotifs(p => [{ id: Date.now(), msg: `"${data.lead_name}" assigned by ${data.assigned_by_name} — call within 45 min.`, type: "amber", time: new Date().toLocaleTimeString() }, ...p].slice(0, 6));
      if ("Notification" in window && Notification.permission === "granted") new Notification("New Lead Assigned", { body: `${data.lead_name} — 45 min to call!` });
      fetchLeads();
    });

    // Ticket raised — notify employee + refresh their tickets
    socket.on("ticket_raised", data => {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
      setNotifs(p => [{ id: Date.now(), msg: `⚠️ SLA ticket raised for "${data.lead_name}" — contact chairman to resolve.`, type: "red", time: new Date().toLocaleTimeString() }, ...p].slice(0, 6));
      if ("Notification" in window && Notification.permission === "granted") new Notification("SLA Ticket Raised", { body: `Missed 45-min window on: ${data.lead_name}` });
      fetchTickets();
      fetchLeads();
    });

    // Ticket resolved — notify employee + refresh
    socket.on("ticket_resolved", data => {
      setNotifs(p => [{ id: Date.now(), msg: `✅ Ticket resolved for "${data.lead_name}" — timer reset. You can work this lead again!`, type: "green", time: new Date().toLocaleTimeString() }, ...p].slice(0, 6));
      fetchTickets();
      fetchLeads();
    });

    return () => socket.disconnect();
  }, [myProfile, fetchLeads, fetchTickets]);

  useEffect(() => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); }, []);

  useEffect(() => {
    if (leadSlug && leads.length > 0) {
      const found = leads.find(l => slug(l.name) === leadSlug);
      if (found) { setSelLead(found); setView("detail"); }
    }
  }, [leadSlug, leads]);

  const openLead = lead => {
    setSelLead(lead); setView("detail");
    if (isChairman) navigate(`/chairman/${slug(lead.name)}`, { replace: true });
    else navigate(`/employee/${employeeName}/${slug(lead.name)}`, { replace: true });
  };
  const backToList = () => {
    setView("list"); setSelLead(null);
    if (isChairman) navigate("/chairman/leads", { replace: true });
    else navigate(`/employee/${employeeName}`, { replace: true });
  };

  const canAssign = isChairman || canCreate;
  const showAnalytics = isChairman || canViewAll;

  // Open tickets counts
  const myOpenTickets = tickets.filter(t => !t.resolved_at);
  const chairmanOpenTickets = allTickets.filter(t => !t.resolved_at);
  const openTicketCount = isChairman ? chairmanOpenTickets.length : myOpenTickets.length;

  // Which leads are blocked for this employee
  const blockedLeadIds = new Set(myOpenTickets.map(t => t.lead_id));

  const filtered = leads.filter(l => {
    const mf = filter === "All" || l.status === filter;
    const mq = !q || l.name?.toLowerCase().includes(q.toLowerCase()) || l.email?.toLowerCase().includes(q.toLowerCase()) || l.contact?.includes(q) || l.assignee_name?.toLowerCase().includes(q.toLowerCase()) || l.calling_city?.toLowerCase().includes(q.toLowerCase());
    return mf && mq;
  });
  const sts = ALL_STATUSES.reduce((a, k) => { a[k] = leads.filter(l => l.status === k).length; return a; }, {});

  const upcomingReminders = leads.filter(l => {
    if (!l.next_call_at) return false;
    const diff = new Date(l.next_call_at) - Date.now();
    return diff > 0 && diff < 24 * 3600000;
  }).length;

  // Sub-views
  if (view === "addlead") return <div style={{ fontFamily:"var(--f)" }}><style>{G}</style><AddLeadPage isChairman={isChairman} canAssign={canAssign} employees={employees} onBack={()=>setView("list")} onCreated={()=>{fetchLeads();setView("list");}} /></div>;

  if (view === "detail" && selLead) {
    const fresh = leads.find(l => l.id === selLead.id) || selLead;
    return <div style={{ fontFamily:"var(--f)" }}><style>{G}</style>
      <LeadDetailPage lead={fresh} isChairman={isChairman} canAssign={canAssign} employees={employees} tickets={isChairman ? allTickets : tickets} onBack={backToList} onUpdated={fetchLeads} />
    </div>;
  }

  return (
    <div style={{ fontFamily: "var(--f)", color: "var(--k)", position: "relative" }}>
      <style>{G}</style>
      <audio ref={audioRef} src="/new-request.mp3" preload="auto" />

      {/* Toast notifications */}
      {notifs.length > 0 && (
        <div className="np">
          {notifs.map(n => (
            <div key={n.id} className={`nc ${n.type==="red"?"nc-red":n.type==="purple"?"nc-purp":n.type==="green"?"nc-green":""}`}>
              <div style={{ marginBottom: 6 }}>{n.msg}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--k3)" }}>{n.time}</span>
                <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--blue)", fontWeight: 600, fontFamily: "var(--f)" }} onClick={() => setNotifs(p => p.filter(x => x.id !== n.id))}>Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em" }}>Lead Management</div>
          <div style={{ fontSize: 12, color: "var(--k2)", marginTop: 3 }}>
            {isChairman ? "Chairman — full access." : canCreate ? "Lead Creator — add & assign leads." : "Employee — your assigned leads."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Tab switcher — always show Tickets tab */}
          <div className="tg">
            <button className={`ti${activeTab === "leads" ? " on" : ""}`} onClick={() => setActiveTab("leads")}>Leads</button>
            {showAnalytics && (
              <button className={`ti${activeTab === "analytics" ? " on" : ""}`} onClick={() => setActiveTab("analytics")}>Analytics</button>
            )}
            {/* Tickets tab: visible for ALL users (employees see their own, chairman sees all) */}
            <button className={`ti${activeTab === "tickets" ? " on" : ""}`} onClick={() => setActiveTab("tickets")}>
              Tickets {openTicketCount > 0 && <span className="badge badge-red" style={{ marginLeft: 5 }}>{openTicketCount}</span>}
            </button>
          </div>
          {isChairman && <button className="btn bs" onClick={() => setShowPerms(true)}>Manage Permissions</button>}
          {(canCreate || isChairman) && <button className="btn bp" onClick={() => setView("addlead")}>+ Add Lead</button>}
        </div>
      </div>

      {/* ── TICKETS TAB ── */}
      {activeTab === "tickets" ? (
        isChairman ? (
          <ChairmanTicketsPanel
            tickets={allTickets}
            onRefresh={() => { fetchTickets(); fetchLeads(); }}
          />
        ) : (
          // Employee's own tickets panel
          <EmployeeTicketsPanel tickets={tickets} />
        )
      ) : showAnalytics && activeTab === "analytics" ? (
        <Analytics leads={leads} employees={employees} allTickets={allTickets} onSelectEmp={emp => { setSelEmp(emp); }} />
      ) : (
        /* ── LEADS TAB ── */
        <>
          {/* Employee open-ticket banner — shown above leads list if they have open tickets */}
          {!isChairman && myOpenTickets.length > 0 && (
            <div className="emp-ticket-banner">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, background: "#fecaca", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {I.warning}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: "#991b1b", fontSize: 15 }}>
                    {myOpenTickets.length} open SLA ticket{myOpenTickets.length > 1 ? "s" : ""} — action required
                  </div>
                  <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 2 }}>
                    You missed the 45-minute response window. Contact your chairman to resolve.
                    Leads with a ticket are blocked until resolved.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {myOpenTickets.map(t => (
                  <div key={t.id} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r)", padding: "6px 12px", fontSize: 12 }}>
                    <strong>Ticket #{t.id}</strong> — {t.lead_name} — raised {fmtDT(t.raised_at)}
                  </div>
                ))}
              </div>
              <button className="btn bp" style={{ marginTop: 10, padding: "6px 16px", fontSize: 12 }} onClick={() => setActiveTab("tickets")}>
                View My Tickets →
              </button>
            </div>
          )}

          {/* Upcoming reminders bar */}
          {upcomingReminders > 0 && (
            <div style={{ background:"#f5f3ff", border:"1px solid #c4b5fd", borderLeft:"3px solid var(--purple)", borderRadius:"var(--r)", padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
              {I.bell}
              <span style={{ fontSize:13, fontWeight:600, color:"#5b21b6" }}>{upcomingReminders} call reminder{upcomingReminders>1?"s":""} due today</span>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            {[{l:"Total",v:leads.length},{l:"New",v:sts["New"]||0,c:"var(--blue)"},{l:"Converted",v:sts["Converted"]||0,c:"var(--green)"},{l:"Warm",v:sts["Warm"]||0,c:"var(--amber)"},{l:"Process",v:sts["Process"]||0,c:"#8b5cf6"},{l:"Drop",v:sts["Drop"]||0,c:"var(--red)"}].map(({l,v,c})=>(
              <div key={l} style={{ background:"var(--s)",border:"1px solid var(--b)",borderRadius:"var(--r2)",padding:"14px 18px",flex:1,minWidth:90,textAlign:"center" }}>
                <div style={{ fontSize:22,fontWeight:800,letterSpacing:"-.04em",color:c||"var(--k)" }}>{v}</div>
                <div style={{ fontSize:10,color:"var(--k3)",marginTop:4,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em" }}>{l}</div>
              </div>
            ))}
            {openTicketCount > 0 && (
              <div style={{ background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"var(--r2)",padding:"14px 18px",flex:1,minWidth:90,textAlign:"center",cursor:"pointer" }}
                onClick={() => setActiveTab("tickets")}>
                <div style={{ fontSize:22,fontWeight:800,color:"var(--red)" }}>{openTicketCount}</div>
                <div style={{ fontSize:10,color:"#991b1b",marginTop:4,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em" }}>Open Tickets</div>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
              {["All", ...ALL_STATUSES].map(f => (
                <button key={f} className={`fp${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
                  {f}{f !== "All" && sts[f] > 0 ? <span style={{ marginLeft: 5, fontSize: 10, opacity: .65 }}>{sts[f]}</span> : null}
                </button>
              ))}
            </div>
            <div className="sw">
              <div className="si">{I.search}</div>
              <input className="sin" placeholder="Search name, email, contact…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </div>

          {/* Leads content */}
          {loading ? (
            <div className="es">{I.spin}<div style={{ fontSize:13,color:"var(--k2)",marginTop:12 }}>Loading…</div></div>
          ) : filtered.length === 0 ? (
            <div className="es">
              <div style={{ width:44,height:44,borderRadius:"50%",background:"var(--b2)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14 }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect width="6" height="4" x="9" y="3" rx="1"/></svg>
              </div>
              <div style={{ fontWeight:700,color:"var(--k2)" }}>No leads found</div>
              <div style={{ fontSize:12,color:"var(--k3)",marginTop:4 }}>Add a lead or adjust your filters.</div>
            </div>
          ) : (canCreate || isChairman) ? (
            // TABLE VIEW for managers/chairman
            <div style={{ overflowX:"auto",borderRadius:"var(--r2)",border:"1px solid var(--b)",background:"var(--s)" }}>
              <table className="dt">
                <thead>
                  <tr>{["Lead","Contact / Email","Service / Source","Assigned To","Status","Timer","Next Call","Remarks",""].map(h=><th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map(lead => {
                    const nextCallInfo2 = lead.next_call_at ? (() => {
                      const diff = new Date(lead.next_call_at) - Date.now();
                      if (diff <= 0) return { label:"Call now!", cls:"cex" };
                      const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);
                      if(h>0) return{label:`${h}h ${m}m`,cls:"crem"};
                      return{label:`${m}m`,cls:m<5?"cwn":"crem"};
                    })() : null;
                    const isRowBlocked = !isChairman && blockedLeadIds.has(lead.id);
                    return (
                      <tr key={lead.id} onClick={() => openLead(lead)} style={isRowBlocked ? { background:"#fff5f5" } : {}}>
                        <td>
                          <div style={{ fontWeight:600 }}>{lead.name}</div>
                          {isRowBlocked && <div style={{ fontSize:10,color:"var(--red)",fontWeight:700,marginTop:2 }}>🔒 Ticket Open</div>}
                          {lead.age!=null&&<div style={{ fontSize:11,color:"var(--k3)",marginTop:2 }}>{lead.age} yrs · {lead.calling_city||"—"}</div>}
                        </td>
                        <td><div>{lead.contact}</div><div style={{ fontSize:11,color:"var(--k2)",marginTop:2 }}>{lead.email}</div></td>
                        <td>{lead.service_interested&&<div style={{ fontWeight:600,color:"var(--blue)",fontSize:12 }}>{lead.service_interested}</div>}{lead.lead_source&&<div style={{ fontSize:11,color:"var(--k2)",marginTop:2 }}>{lead.lead_source}</div>}</td>
                        <td>{lead.assignee_name?<span style={{ background:"#f5f3ff",color:"#5b21b6",border:"1px solid #c4b5fd",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600 }}>{lead.assignee_name}</span>:<span style={{ fontSize:12,color:"var(--k3)" }}>Unassigned</span>}</td>
                        <td><Chip status={lead.status} /></td>
                        <td><CD deadlineIso={lead.deadline_at} status={lead.status} remarksCount={lead.remarks_count} /></td>
                        <td>{nextCallInfo2?<div><span className={nextCallInfo2.cls}>{nextCallInfo2.label}</span>{lead.next_call_note&&<div style={{ fontSize:11,color:"var(--k3)",marginTop:3 }}>{lead.next_call_note.slice(0,30)}</div>}</div>:<span style={{ fontSize:12,color:"var(--k3)" }}>—</span>}</td>
                        <td style={{ maxWidth:180 }}>{lead.latest_remark?<div><div style={{ fontSize:12,color:"var(--k2)" }}>{lead.latest_remark.slice(0,65)}{lead.latest_remark.length>65?"…":""}</div><div style={{ fontSize:11,color:"var(--k3)",marginTop:2 }}>{lead.remarks_count} total</div></div>:<span style={{ fontSize:12,color:"var(--k3)" }}>None</span>}</td>
                        <td onClick={e=>e.stopPropagation()}>
                          <div style={{ display:"flex",gap:5 }}>
                            <button className="bsm" onClick={()=>openLead(lead)}>View</button>
                            <button className="bsm" onClick={()=>setEditLead(lead)}>Edit</button>
                            {isChairman&&<button className="btn bd" style={{ padding:"4px 8px",fontSize:11 }} onClick={()=>setDelLead(lead)}>Del</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            // CARD VIEW for regular employees
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {filtered.map(lead => <LeadCard key={lead.id} lead={lead} onClick={openLead} blocked={tickets} />)}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {editLead && <UpdateModal lead={editLead} isChairman={isChairman} canAssign={canAssign} employees={employees} isBlocked={!isChairman && blockedLeadIds.has(editLead.id)} onClose={() => setEditLead(null)} onUpdated={() => { fetchLeads(); setEditLead(null); }} />}
      {delLead && <DelModal lead={delLead} onClose={() => setDelLead(null)} onDeleted={() => { fetchLeads(); setDelLead(null); }} />}
      {showPerms && isChairman && <PermsModal employees={employees} onClose={() => setShowPerms(false)} />}
    </div>
  );
}