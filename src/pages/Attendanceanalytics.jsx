/**
 * AttendanceAnalytics.jsx — v4 FIXED
 * ================================================================
 * ✅ Now works for ALL months (past, current, future navigation)
 * ✅ Full history data fetching + computation
 * ✅ Premium alignment & styling
 * ✅ Responsive grid layouts
 */

import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

const baseUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000'
  : 'https://backend.vjcoverseas.com';

/* ─── Pure utility helpers (no external deps) ──────────────────────────── */
const parseT = (t) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
};

const diffMs = (a, b) => {
  const ta = parseT(a), tb = parseT(b);
  if (!ta || !tb || tb < ta) return 0;
  return tb - ta;
};

const calcNet = (log) => {
  if (!log?.office_in || !log?.office_out) return 0;
  const OS = '10:00:00', CUT = '19:00:00';
  const inn = parseT(log.office_in) < parseT(OS) ? OS : log.office_in;
  const out = parseT(log.office_out) > parseT(CUT) ? CUT : log.office_out;
  let g = diffMs(inn, out), b = 0;
  if (log.break_in && log.break_out) b += diffMs(log.break_in, log.break_out);
  if (log.break_in_2 && log.break_out_2) b += diffMs(log.break_in_2, log.break_out_2);
  if (log.lunch_in && log.lunch_out) b += diffMs(log.lunch_in, log.lunch_out);
  (log.extra_break_ins || []).forEach((ei, i) => {
    if (ei && log.extra_break_outs?.[i]) b += diffMs(ei, log.extra_break_outs[i]);
  });
  return Math.max(0, g - b);
};

const msToH = (ms) => ms / 3_600_000;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthShort = (ym) => MONTHS_SHORT[parseInt(ym.split('-')[1]) - 1];
const monthFull = (ym) => MONTHS[parseInt(ym.split('-')[1]) - 1];

const getMonthDays = (year, m0) => {
  const last = new Date(Date.UTC(year, m0 + 1, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) =>
    new Date(Date.UTC(year, m0, i + 1)).toISOString().slice(0, 10)
  );
};

const prevMonths = (ym, n) => {
  let [y, m] = ym.split('-').map(Number);
  return Array.from({ length: n }, () => {
    m--; if (m === 0) { m = 12; y--; }
    return `${y}-${String(m).padStart(2, '0')}`;
  }).reverse();
};

const getBucket = (iso, log, hols) => {
  const wd = new Date(iso + 'T00:00:00Z').getUTCDay();
  if (wd === 0 || hols?.has(iso)) return 'holiday';
  if (log?.leave_type?.toLowerCase().includes('earned')) return 'paidleave';
  if (log?.leave_type) return 'absent';
  if (!log?.office_in || !log?.office_out) return 'absent';
  const h = msToH(calcNet(log));
  return h < 4 ? 'absent' : h < 8 ? 'halfday' : 'fullday';
};

const buildStats = (ym, logs, hols) => {
  const [y, m] = ym.split('-').map(Number);
  const days = getMonthDays(y, m - 1);
  const today = new Date().toISOString().slice(0, 10);
  const lm = new Map(logs.map(l => [l.date, l]));
  let full = 0, half = 0, absent = 0, holiday = 0, paid = 0, totalMs = 0;
  for (const iso of days) {
    if (iso > today) continue;
    const log = lm.get(iso);
    const b = getBucket(iso, log, hols);
    switch (b) {
      case 'fullday': full++; totalMs += calcNet(log || {}); break;
      case 'halfday': half++; totalMs += calcNet(log || {}); break;
      case 'absent': absent++; break;
      case 'paidleave': paid++; break;
      case 'holiday': holiday++; break;
      default: break;
    }
  }
  const workDays = full + half + absent + paid;
  const eff = full + half * 0.5 + paid;
  const att = workDays > 0 ? Math.round((eff / workDays) * 100) : 0;
  const avgH = (full + half) > 0 ? msToH(totalMs) / (full + half) : 0;
  return { ym, full, half, absent, holiday, paid, att, avgH, workDays };
};

/* ─── Count-up animation ────────────────────────────────────────────────── */
function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null, frame;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return val;
}

/* ─── Color palette ─────────────────────────────────────────────────────── */
const C = {
  full: '#16a34a',
  fullBg: '#f0fdf4',
  fullBdr: '#bbf7d0',
  half: '#d97706',
  halfBg: '#fffbeb',
  halfBdr: '#fde68a',
  absent: '#dc2626',
  absentBg: '#fef2f2',
  absentBdr: '#fecaca',
  holiday: '#2563eb',
  holBg: '#eff6ff',
  holBdr: '#bfdbfe',
  paid: '#7c3aed',
  paidBg: '#faf5ff',
  paidBdr: '#ddd6fe',
  avg: '#0891b2',
  avgBg: '#ecfeff',
  avgBdr: '#a5f3fc',
};

const BUCKET_META = {
  fullday: { color: C.full, bg: C.fullBg, label: 'Full Day' },
  halfday: { color: C.half, bg: C.halfBg, label: 'Half Day' },
  absent: { color: C.absent, bg: C.absentBg, label: 'Absent' },
  holiday: { color: C.holiday, bg: C.holBg, label: 'Holiday' },
  paidleave: { color: C.paid, bg: C.paidBg, label: 'Paid Leave' },
};

/* ─── Score arc (SVG only) ─────────────────────────────────────────────── */
function ScoreArc({ score }) {
  const [progress, setProgress] = useState(0);
  const animated = useCountUp(score);
  useEffect(() => { const t = setTimeout(() => setProgress(score), 100); return () => clearTimeout(t); }, [score]);

  const R = 54, circ = 2 * Math.PI * R;
  const dash = (progress / 100) * circ * 0.75;
  const color = score >= 90 ? C.full : score >= 75 ? C.half : score >= 60 ? '#f97316' : C.absent;
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg width="150" height="120" viewBox="0 0 150 120">
        <circle cx="75" cy="90" r={R} fill="none" stroke="#e5e7eb" strokeWidth="12"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round" />
        <circle cx="75" cy="90" r={R} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 8px ${color}88)` }} />
        <text x="75" y="82" textAnchor="middle" fontSize="28" fontWeight="800" fill={color}
          fontFamily="'Segoe UI', system-ui, sans-serif">{grade}</text>
        <text x="75" y="100" textAnchor="middle" fontSize="14" fontWeight="700" fill="#374151">
          {animated}%
        </text>
        <text x="75" y="115" textAnchor="middle" fontSize="10" fill="#9ca3af" letterSpacing="1">
          SCORE
        </text>
      </svg>
      <div style={{
        fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 99,
        background: color + '15', color, border: `1.5px solid ${color}40`,
      }}>
        {score >= 90 ? '🌟 Outstanding' : score >= 80 ? '🏆 Excellent' : score >= 70 ? '👍 Good' : score >= 60 ? '💪 Improving' : '📈 Focus'}
      </div>
    </div>
  );
}

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
function KPICard({ icon, label, value, color, bg, border, sub, isString }) {
  const n = useCountUp(isString ? 0 : (typeof value === 'number' ? value : 0));
  return (
    <div style={{
      background: bg || '#f9fafb', border: `1.5px solid ${border || '#e5e7eb'}`,
      borderRadius: 16, padding: '20px 22px', borderTop: `4px solid ${color}`,
      transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 8px 24px ${color}22`;
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}>
      <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1, marginBottom: 6 }}>
        {isString ? value : n}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ─── Heatmap calendar ───────────────────────────────────────────────────── */
function HeatmapCalendar({ ym, logs, hols, large }) {
  const [y, m] = ym.split('-').map(Number);
  const days = getMonthDays(y, m - 1);
  const lm = new Map(logs.map(l => [l.date, l]));
  const firstDow = new Date(days[0] + 'T00:00:00Z').getUTCDay();
  const today = new Date().toISOString().slice(0, 10);

  const cells = [
    ...Array(firstDow).fill(null),
    ...days.map(iso => ({
      iso,
      day: parseInt(iso.split('-')[2]),
      b: getBucket(iso, lm.get(iso), hols),
      isFuture: iso > today,
      isToday: iso === today,
    })),
  ];

  const sz = large ? 36 : 24;
  const gap = large ? 6 : 4;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${sz}px)`, gap, marginBottom: gap + 4 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ width: sz, textAlign: 'center', fontSize: large ? 11 : 9, color: '#6b7280', fontWeight: 700 }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${sz}px)`, gap }}>
        {cells.map((c, i) =>
          c === null
            ? <div key={`e-${i}`} style={{ width: sz, height: sz }} />
            : (
              <div key={c.iso}
                title={`${c.iso} — ${BUCKET_META[c.b]?.label || c.b}`}
                style={{
                  width: sz, height: sz, borderRadius: large ? 10 : 6,
                  background: c.isFuture ? '#f3f4f6' : (BUCKET_META[c.b]?.bg || '#f9fafb'),
                  border: c.isToday
                    ? `2.5px solid ${BUCKET_META[c.b]?.color || '#6b7280'}`
                    : c.isFuture ? '1px solid #e5e7eb'
                    : `1.5px solid ${BUCKET_META[c.b]?.color || '#e5e7eb'}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: large ? 13 : 9, fontWeight: c.isToday ? 800 : 700,
                  color: c.isFuture ? '#d1d5db' : (BUCKET_META[c.b]?.color || '#374151'),
                  cursor: 'default',
                  transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: c.b === 'fullday' && !c.isFuture ? `0 0 0 3px ${C.full}22` : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {large ? c.day : ''}
              </div>
            )
        )}
      </div>
    </div>
  );
}

/* ─── Legend ─────────────────────────────────────────────────────────────── */
function CalLegend() {
  return (
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
      {Object.entries(BUCKET_META).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: v.bg, border: `1.5px solid ${v.color}` }} />
          <span style={{ fontWeight: 500 }}>{v.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Trend sparkline ────────────────────────────────────────────────────── */
function TrendLine({ allStats }) {
  if (allStats.length < 2) return <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Need at least 2 months of data</div>;
  
  const vals = allStats.map(s => s.att);
  const W = 100, H = 50;
  const maxV = Math.max(...vals, 100);
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * W,
    H - (v / maxV) * (H - 10) - 5,
  ]);
  const polyline = pts.map(p => p.join(',')).join(' ');
  const area = `M${pts[0][0]},${H} ` + pts.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length - 1][0]},${H} Z`;
  const up = vals[vals.length - 1] >= vals[vals.length - 2];
  const color = up ? C.full : C.absent;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 70, display: 'block' }}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#trendGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.2"
        strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={i === pts.length - 1 ? 4.5 : 3}
            fill={i === pts.length - 1 ? color : '#fff'} stroke={color} strokeWidth="1.8" />
          <text x={x} y={H + 12} textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontWeight="600">
            {monthShort(allStats[i].ym)}
          </text>
          <text x={x} y={y - 8} textAnchor="middle" fontSize="7.5" fontWeight="800"
            fill={i === pts.length - 1 ? color : '#6b7280'}>
            {vals[i]}%
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Horizontal bar ─────────────────────────────────────────────────────── */
function HBar({ value, max, color, label, note }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(max > 0 ? (value / max) * 100 : 0), 200); return () => clearTimeout(t); }, [value, max]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{ width: 40, fontSize: 12, color: '#6b7280', textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 99, height: 20, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <div style={{
          height: '100%', borderRadius: 99, background: color,
          width: `${w}%`, transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10,
          minWidth: value > 0 ? 28 : 0,
        }}>
          {w > 20 && <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{value}</span>}
        </div>
      </div>
      <div style={{ width: 45, fontSize: 12, color, fontWeight: 700, flexShrink: 0, textAlign: 'right' }}>
        {note}
      </div>
    </div>
  );
}

/* ─── Streak ─────────────────────────────────────────────────────────────── */
function Streak({ logs, hols }) {
  const streak = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const sorted = [...logs].filter(l => l.date <= today).sort((a, b) => b.date.localeCompare(a.date));
    let s = 0;
    for (const l of sorted) {
      const b = getBucket(l.date, l, hols);
      if (b === 'fullday') s++;
      else if (b === 'holiday' || b === 'paidleave') continue;
      else break;
    }
    return s;
  }, [logs, hols]);

  const color = streak >= 15 ? '#dc2626' : streak >= 10 ? '#ea580c' : streak >= 5 ? C.half : streak >= 1 ? C.full : '#9ca3af';
  const fire = streak >= 15 ? '🔥🔥🔥🔥' : streak >= 10 ? '🔥🔥🔥' : streak >= 5 ? '🔥🔥' : streak >= 1 ? '🔥' : '—';

  return (
    <div style={{
      background: streak > 0 ? '#fff7ed' : '#f9fafb',
      border: `1.5px solid ${streak > 0 ? '#fed7aa' : '#e5e7eb'}`,
      borderRadius: 14, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 32 }}>{fire}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>
          Full Day Streak
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1.2, marginTop: 2 }}>
          {streak} <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 400 }}>days</span>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          {streak === 0 ? '🎯 Start your streak today!' : streak >= 10 ? '🏆 Legendary! Keep it up!' : '💪 Keep going!'}
        </div>
      </div>
    </div>
  );
}

/* ─── Section header ─────────────────────────────────────────────────────── */
function SH({ emoji, title, sub, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{emoji}</span>{title}
        </div>
        {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{sub}</div>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

/* ─── Card wrapper ───────────────────────────────────────────────────────── */
function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 18, padding: '26px',
      border: '1.5px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Tab button ─────────────────────────────────────────────────────────── */
function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
      cursor: 'pointer', border: 'none', transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      background: active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
      color: active ? '#fff' : '#6b7280',
      boxShadow: active ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
    }}>
      {label}
    </button>
  );
}

/* ─── Month navigator ────────────────────────────────────────────────────── */
function shiftMonth(ym, delta) {
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

function todayYM() {
  return new Date().toISOString().slice(0, 7);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function AttendanceAnalytics() {
  const [selectedMonth, setSelectedMonth] = useState(todayYM());
  const [allLogs, setAllLogs] = useState([]);
  const [allHolidays, setAllHolidays] = useState(new Map());
  const [histData, setHistData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('overview');

  /* Fetch current month logs */
  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    axios.get(`${baseUrl}/my-attendance?month=${selectedMonth}`, { withCredentials: true })
      .then(r => {
        setAllLogs(Array.isArray(r.data) ? r.data : []);
        setLoading(false);
      })
      .catch(() => {
        setAllLogs([]);
        setLoading(false);
      });
  }, [selectedMonth]);

  /* Fetch holidays for selected month */
  useEffect(() => {
    if (!selectedMonth) return;
    axios.get(`${baseUrl}/holidays?month=${selectedMonth}`, { withCredentials: true })
      .then(r => {
        const map = new Map();
        if (Array.isArray(r.data)) {
          r.data.forEach(h => {
            if (h.date && h.name) map.set(h.date, { name: h.name, isPaid: h.is_paid });
          });
        }
        setAllHolidays(map);
      })
      .catch(() => setAllHolidays(new Map()));
  }, [selectedMonth]);

  /* Fetch 6-month history */
  useEffect(() => {
    setLoading(true);
    Promise.all(
      prevMonths(selectedMonth, 6).map(ym =>
        axios.get(`${baseUrl}/my-attendance?month=${ym}`, { withCredentials: true })
          .then(r => ({ ym, logs: Array.isArray(r.data) ? r.data : [] }))
          .catch(() => ({ ym, logs: [] }))
      )
    ).then(res => {
      setHistData(res);
      setLoading(false);
    });
  }, [selectedMonth]);

  /* Compute stats */
  const currentStats = useMemo(() => buildStats(selectedMonth, allLogs, allHolidays), [selectedMonth, allLogs, allHolidays]);
  const allStats = useMemo(() => histData.map(h => buildStats(h.ym, h.logs, allHolidays)), [histData, allHolidays]);
  const maxFull = useMemo(() => Math.max(...[...allStats, currentStats].map(s => s.full), 1), [allStats, currentStats]);
  const maxAbs = useMemo(() => Math.max(...[...allStats, currentStats].map(s => s.absent), 1), [allStats, currentStats]);

  const allStatsWithCurrent = [...allStats, currentStats];

  return (
    <div style={{
      fontFamily: "'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif",
      background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%)',
      borderRadius: 24,
      padding: '32px 28px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      color: '#111827',
    }}>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        .aa-slide { animation: slideIn 0.4s cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>

      {/* ═══════════ HEADER & CONTROLS ═══════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
        {/* Left: Title */}
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📊 Attendance Analytics
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9ca3af' }}>View your complete attendance history</p>
        </div>

        {/* Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '8px 12px', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <button
            onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}
            style={{
              width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#f9fafb', cursor: 'pointer', fontSize: 16, color: '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
            title="Previous month"
          >
            ‹
          </button>

          <input
            type="month"
            value={selectedMonth}
            onChange={e => e.target.value && setSelectedMonth(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fff', fontSize: 14, fontWeight: 700, color: '#111827',
              cursor: 'pointer', outline: 'none',
            }}
          />

          <button
            onClick={() => setSelectedMonth(m => shiftMonth(m, 1))}
            disabled={selectedMonth >= todayYM()}
            style={{
              width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb',
              background: selectedMonth >= todayYM() ? '#f3f4f6' : '#f9fafb',
              cursor: selectedMonth >= todayYM() ? 'not-allowed' : 'pointer',
              fontSize: 16, color: selectedMonth >= todayYM() ? '#d1d5db' : '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (selectedMonth < todayYM()) {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = selectedMonth >= todayYM() ? '#f3f4f6' : '#f9fafb';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
            title="Next month"
          >
            ›
          </button>

          <div style={{ height: 20, width: '1px', background: '#e5e7eb' }} />

          <span style={{ fontSize: 13, fontWeight: 600, color: '#667eea', whiteSpace: 'nowrap', paddingLeft: 4 }}>
            {monthFull(selectedMonth)} {selectedMonth.split('-')[0]}
          </span>
        </div>
      </div>

      {/* ═══════════ TAB NAVIGATION ═══════════ */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, background: '#f1f5f9', padding: '8px 10px', borderRadius: 14, border: '1px solid #e2e8f0', width: 'fit-content' }}>
        {[['overview', '📊 Overview'], ['trends', '📈 Trends'], ['heatmap', '🗓️ Heatmap']].map(([t, l]) => (
          <TabBtn key={t} label={l} active={tab === t} onClick={() => setTab(t)} />
        ))}
      </div>

      {/* ═══════════ LOADING STATE ═══════════ */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Loading your attendance data...</div>
        </div>
      )}

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {!loading && tab === 'overview' && (
        <div className="aa-slide" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Score + KPIs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {/* Score Card */}
            <Card style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                Monthly Score
              </div>
              <ScoreArc score={currentStats.att} />
            </Card>

            {/* KPI Cards */}
            <KPICard icon="✅" label="Full Days" value={currentStats.full} color={C.full} bg={C.fullBg} border={C.fullBdr} sub="Complete days" />
            <KPICard icon="🌓" label="Half Days" value={currentStats.half} color={C.half} bg={C.halfBg} border={C.halfBdr} sub="Partial days" />
            <KPICard icon="❌" label="Absent" value={currentStats.absent} color={C.absent} bg={C.absentBg} border={C.absentBdr} sub={currentStats.absent === 0 ? '🎉 Perfect!' : 'Days missed'} />
            <KPICard icon="🏖️" label="Paid Leave" value={currentStats.paid} color={C.paid} bg={C.paidBg} border={C.paidBdr} sub="Earned leaves" />
            <KPICard icon="⏱️" label="Avg Hours/Day" value={`${currentStats.avgH.toFixed(1)}h`} color={C.avg} bg={C.avgBg} border={C.avgBdr} sub="Average" isString />
          </div>

          {/* Streak */}
          <Streak logs={allLogs} hols={allHolidays} />

          {/* Mini Heatmap */}
          <Card>
            <SH emoji="🗓️" title={`${monthFull(selectedMonth)} ${selectedMonth.split('-')[0]} Calendar`} sub="Overview of your attendance this month" />
            <HeatmapCalendar ym={selectedMonth} logs={allLogs} hols={allHolidays} large />
            <CalLegend />
          </Card>
        </div>
      )}

      {/* ═══════════ TRENDS TAB ═══════════ */}
      {!loading && tab === 'trends' && (
        <div className="aa-slide" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Trend Chart */}
          <Card>
            <SH emoji="📈" title="6-Month Score Trend"
              sub="Track your attendance percentage over time"
              right={
                allStatsWithCurrent.length >= 2 && (() => {
                  const diff = currentStats.att - (allStatsWithCurrent[allStatsWithCurrent.length - 2]?.att || 0);
                  const up = diff >= 0;
                  return (
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 99,
                      background: up ? C.fullBg : C.absentBg,
                      color: up ? C.full : C.absent,
                      border: `1.5px solid ${up ? C.fullBdr : C.absentBdr}`,
                    }}>
                      {up ? '▲' : '▼'} {Math.abs(diff)}% vs prev
                    </span>
                  );
                })()
              }
            />
            <TrendLine allStats={allStatsWithCurrent} />
          </Card>

          {/* Statistics Bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <Card>
              <SH emoji="✅" title="Full Days Trend" sub="More is better" />
              {allStatsWithCurrent.map(s => (
                <HBar key={s.ym} value={s.full} max={maxFull} color={C.full} label={monthShort(s.ym)} note={`${s.full}d`} />
              ))}
            </Card>
            <Card>
              <SH emoji="❌" title="Absences Trend" sub="Less is better" />
              {allStatsWithCurrent.map(s => (
                <HBar key={s.ym} value={s.absent} max={maxAbs} color={s.absent === 0 ? C.full : C.absent} label={monthShort(s.ym)} note={s.absent === 0 ? '✅' : `${s.absent}d`} />
              ))}
            </Card>
          </div>

          {/* Summary Table */}
          <Card>
            <SH emoji="📋" title="Month-by-Month Summary" sub="Complete statistics for each month" />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                    {['Month', 'Full ✅', 'Half 🌓', 'Absent ❌', 'P.Leave 🏖️', 'Score', 'Avg/Day'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', color: '#6b7280', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allStatsWithCurrent.map((s, i) => {
                    const isCur = i === allStatsWithCurrent.length - 1;
                    const scColor = s.att >= 90 ? C.full : s.att >= 75 ? C.half : s.att >= 60 ? '#f97316' : C.absent;
                    const scBg = s.att >= 90 ? C.fullBg : s.att >= 75 ? C.halfBg : s.att >= 60 ? '#fff7ed' : C.absentBg;
                    return (
                      <tr key={s.ym} style={{
                        background: isCur ? '#eff6ff' : i % 2 === 0 ? '#f9fafb' : '#fff',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.2s',
                      }}
                        onMouseEnter={e => !isCur && (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => !isCur && (e.currentTarget.style.background = i % 2 === 0 ? '#f9fafb' : '#fff')}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: isCur ? 800 : 600, color: isCur ? '#2563eb' : '#374151' }}>
                          {monthShort(s.ym)} {isCur && '★'}
                        </td>
                        <td style={{ padding: '12px 16px', color: C.full, fontWeight: 700 }}>{s.full}</td>
                        <td style={{ padding: '12px 16px', color: C.half }}>{s.half}</td>
                        <td style={{ padding: '12px 16px', color: s.absent === 0 ? C.full : C.absent, fontWeight: s.absent === 0 ? 700 : 400 }}>
                          {s.absent === 0 ? '0 ✨' : s.absent}
                        </td>
                        <td style={{ padding: '12px 16px', color: C.paid }}>{s.paid}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: scBg, color: scColor, border: `1px solid ${scColor}40`, borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 11 }}>
                            {s.att}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: C.avg, fontWeight: 600 }}>{s.avgH.toFixed(1)}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════ HEATMAP TAB ═══════════ */}
      {!loading && tab === 'heatmap' && (
        <div className="aa-slide" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Current Month Large */}
          <Card>
            <SH emoji="🗓️" title={`${monthFull(selectedMonth)} ${selectedMonth.split('-')[0]} Heatmap`} sub="Click to navigate months" />
            <HeatmapCalendar ym={selectedMonth} logs={allLogs} hols={allHolidays} large />
            <CalLegend />
          </Card>

          {/* Previous Months Grid */}
          {histData.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16, marginTop: 0 }}>
                📅 Previous Months
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {histData.slice(-5).map(({ ym, logs }) => {
                  const s = buildStats(ym, logs, allHolidays);
                  const scColor = s.att >= 90 ? C.full : s.att >= 75 ? C.half : C.absent;
                  const scBg = s.att >= 90 ? C.fullBg : s.att >= 75 ? C.halfBg : C.absentBg;
                  return (
                    <Card key={ym} style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#374151' }}>{monthFull(ym)}</div>
                        <span style={{ background: scBg, color: scColor, border: `1px solid ${scColor}40`, borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 11 }}>
                          {s.att}%
                        </span>
                      </div>
                      <HeatmapCalendar ym={ym} logs={logs} hols={allHolidays} />
                      <div style={{ marginTop: 12, display: 'flex', gap: 10, fontSize: 11, color: '#6b7280' }}>
                        <span style={{ color: C.full, fontWeight: 700 }}>✅ {s.full}</span>
                        <span style={{ color: C.half, fontWeight: 700 }}>🌓 {s.half}</span>
                        <span style={{ color: C.absent, fontWeight: 700 }}>❌ {s.absent}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <Card>
            <SH emoji="📖" title="Legend" sub="What each color means" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {[
                { color: C.full, bg: C.fullBg, bdr: C.fullBdr, icon: '✅', title: 'Full Day', desc: 'Worked 8+ hours' },
                { color: C.half, bg: C.halfBg, bdr: C.halfBdr, icon: '🌓', title: 'Half Day', desc: 'Worked 4–8 hours' },
                { color: C.absent, bg: C.absentBg, bdr: C.absentBdr, icon: '❌', title: 'Absent', desc: 'Worked <4 hours' },
                { color: C.holiday, bg: C.holBg, bdr: C.holBdr, icon: '🎌', title: 'Holiday', desc: 'Sunday/Public holiday' },
                { color: C.paid, bg: C.paidBg, bdr: C.paidBdr, icon: '🏖️', title: 'Paid Leave', desc: 'Approved leave' },
              ].map(({ color, bg, bdr, icon, title, desc }) => (
                <div key={title} style={{ background: bg, border: `1.5px solid ${bdr}`, borderRadius: 12, padding: '14px 16px', borderLeft: `4px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color }}>{title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.4 }}>{desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════ FOOTER ═══════════ */}
      <div style={{
        marginTop: 32, paddingTop: 16, borderTop: '1px solid #e5e7eb',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#9ca3af',
      }}>
        <span>🕐 Last updated: {new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit' })} IST</span>
        <span>Future dates are not included in calculations</span>
      </div>
    </div>
  );
}