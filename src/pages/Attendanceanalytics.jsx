/**
 * AttendanceAnalytics.jsx — Premium Redesign
 * Clean white layout · Editorial · Luxurious spacing
 */

import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

const baseUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://backend.vjcoverseas.com';

/* ─── Utilities ─────────────────────────────────────────────────────────── */
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
  // Support both field names: leave_type (from DB) and paid_leave_reason (legacy)
  const leaveField = log?.leave_type || log?.paid_leave_reason || '';
  if (leaveField.toLowerCase().includes('earned')) return 'paidleave';
  if (leaveField) return 'absent';
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
function shiftMonth(ym, delta) {
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}
function todayYM() { return new Date().toISOString().slice(0, 7); }

/* ─── Count-up ──────────────────────────────────────────────────────────── */
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null, frame;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return val;
}

/* ─── Theme ─────────────────────────────────────────────────────────────── */
const T = {
  green: '#059669',
  greenLight: '#f0fdf8',
  greenMid: '#d1fae5',
  amber: '#d97706',
  amberLight: '#fffbeb',
  amberMid: '#fde68a',
  red: '#dc2626',
  redLight: '#fef2f2',
  redMid: '#fecaca',
  blue: '#2563eb',
  blueLight: '#eff6ff',
  blueMid: '#bfdbfe',
  violet: '#7c3aed',
  violetLight: '#faf5ff',
  violetMid: '#ddd6fe',
  teal: '#0891b2',
  tealLight: '#ecfeff',
  tealMid: '#a5f3fc',
  ink: '#0f172a',
  inkMid: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  bg: '#ffffff',
  bgSoft: '#f8fafc',
};

const BUCKET = {
  fullday:   { color: T.green,  light: T.greenLight,  mid: T.greenMid,  label: 'Full Day',   icon: '●' },
  halfday:   { color: T.amber,  light: T.amberLight,  mid: T.amberMid,  label: 'Half Day',   icon: '◐' },
  absent:    { color: T.red,    light: T.redLight,    mid: T.redMid,    label: 'Absent',     icon: '○' },
  holiday:   { color: T.blue,   light: T.blueLight,   mid: T.blueMid,   label: 'Holiday',    icon: '◇' },
  paidleave: { color: T.violet, light: T.violetLight, mid: T.violetMid, label: 'Paid Leave', icon: '◈' },
};

/* ══════════════════════════════════════════════════════════════════
   STAT RING — clean SVG arc
══════════════════════════════════════════════════════════════════ */
function StatRing({ score }) {
  const animated = useCountUp(score);
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 80); return () => clearTimeout(t); }, [score]);

  const R = 52, circ = 2 * Math.PI * R;
  const dashFull = circ * 0.75;
  const dash = go ? (score / 100) * dashFull : 0;
  const color = score >= 90 ? T.green : score >= 75 ? T.amber : score >= 60 ? '#f97316' : T.red;
  const label = score >= 90 ? 'Excellent' : score >= 80 ? 'Great' : score >= 70 ? 'Good' : score >= 60 ? 'Average' : 'Needs Work';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width="140" height="100" viewBox="0 0 140 100">
          {/* Track */}
          <circle cx="70" cy="86" r={R} fill="none" stroke={T.borderLight} strokeWidth="10"
            strokeDasharray={`${dashFull} ${circ * 0.25}`}
            strokeDashoffset={circ * 0.125}
            strokeLinecap="round" />
          {/* Progress */}
          <circle cx="70" cy="86" r={R} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={circ * 0.125}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.16,1,0.3,1)' }} />
          <text x="70" y="78" textAnchor="middle" fontSize="26" fontWeight="800"
            fontFamily="'DM Serif Display', Georgia, serif" fill={T.ink}>
            {animated}
          </text>
          <text x="70" y="93" textAnchor="middle" fontSize="11" fill={T.muted} fontWeight="500">
            / 100
          </text>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 6 }}>
          Attendance Score
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'DM Serif Display', Georgia, serif", lineHeight: 1 }}>
          {label}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 12, color: T.muted }}>{score >= 90 ? 'Keep the momentum' : score >= 70 ? 'Room to improve' : 'Focus required'}</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STAT TILE — minimal number card
══════════════════════════════════════════════════════════════════ */
function StatTile({ label, value, color, light, mid, icon, note }) {
  const n = useCountUp(typeof value === 'number' ? value : 0);
  return (
    <div style={{
      background: T.bg,
      border: `1.5px solid ${T.border}`,
      borderRadius: 16,
      padding: '22px 24px',
      display: 'flex', flexDirection: 'column', gap: 10,
      position: 'relative', overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${color}18`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Accent top line */}
      <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: color, borderRadius: '0 0 3px 3px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
          {label}
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: 10, background: light,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color, fontWeight: 900,
        }}>{icon}</div>
      </div>
      <div style={{ fontSize: 42, fontWeight: 900, color: T.ink, lineHeight: 1, fontFamily: "'DM Serif Display', Georgia, serif" }}>
        {typeof value === 'string' ? value : n}
      </div>
      {note && <div style={{ fontSize: 12, color }}>{note}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CALENDAR HEATMAP — clean, readable, always shows day numbers
══════════════════════════════════════════════════════════════════ */
function Heatmap({ ym, logs, hols, compact }) {
  const [tooltip, setTooltip] = useState(null);
  const [y, m] = ym.split('-').map(Number);
  const days = getMonthDays(y, m - 1);
  const lm = new Map(logs.map(l => [l.date, l]));
  const firstDow = new Date(days[0] + 'T00:00:00Z').getUTCDay();
  const today = new Date().toISOString().slice(0, 10);

  // Cell size — compact for mini cards, full for main view
  const sz = compact ? 32 : 44;
  const gap = compact ? 4 : 6;
  const fontSize = compact ? 11 : 13;

  const cells = [
    ...Array(firstDow).fill(null),
    ...days.map(iso => ({
      iso,
      day: parseInt(iso.split('-')[2]),
      b: getBucket(iso, lm.get(iso), hols),
      future: iso > today,
      isToday: iso === today,
    })),
  ];

  const DOW = compact
    ? ['S','M','T','W','T','F','S']
    : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div style={{ position: 'relative' }}>
      {/* Day-of-week header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(7, ${sz}px)`,
        gap,
        marginBottom: compact ? 4 : 8,
      }}>
        {DOW.map((d, i) => (
          <div key={i} style={{
            width: sz,
            textAlign: 'center',
            fontSize: compact ? 9 : 11,
            color: i === 0 ? '#ef4444' : T.muted,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(7, ${sz}px)`,
        gap,
      }}>
        {cells.map((c, i) => {
          if (c === null) return <div key={`e${i}`} style={{ width: sz, height: sz }} />;

          const meta = BUCKET[c.b];
          const isSun = new Date(c.iso + 'T00:00:00Z').getUTCDay() === 0;

          return (
            <div
              key={c.iso}
              onMouseEnter={() => setTooltip({ iso: c.iso, b: c.b, label: meta?.label })}
              onMouseLeave={() => setTooltip(null)}
              style={{
                width: sz,
                height: sz,
                borderRadius: compact ? 7 : 10,
                position: 'relative',
                background: c.future
                  ? '#f8fafc'
                  : c.b === 'fullday' ? '#dcfce7'
                  : c.b === 'halfday' ? '#fef3c7'
                  : c.b === 'absent' ? '#fee2e2'
                  : c.b === 'holiday' ? '#dbeafe'
                  : c.b === 'paidleave' ? '#ede9fe'
                  : '#f1f5f9',
                border: c.isToday
                  ? `2.5px solid ${meta?.color || T.ink}`
                  : c.future
                  ? `1px dashed ${T.border}`
                  : `1.5px solid ${(meta?.color || T.border)}40`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'default',
                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                boxShadow: c.isToday ? `0 0 0 3px ${(meta?.color || T.ink)}22` : 'none',
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'scale(1.18)';
                e.currentTarget.style.zIndex = '10';
                e.currentTarget.style.boxShadow = `0 4px 16px ${(meta?.color || '#000')}30`;
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.zIndex = '1';
                e.currentTarget.style.boxShadow = c.isToday ? `0 0 0 3px ${(meta?.color || T.ink)}22` : 'none';
              }}
            >
              {/* Day number */}
              <span style={{
                fontSize,
                fontWeight: c.isToday ? 900 : 700,
                color: c.future
                  ? '#cbd5e1'
                  : isSun && c.b === 'holiday'
                  ? T.blue
                  : meta?.color || T.inkMid,
                lineHeight: 1,
              }}>
                {c.day}
              </span>
              {/* Status dot — shown only in full (non-compact) when not future */}
              {!compact && !c.future && (
                <div style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: meta?.color || 'transparent',
                  marginTop: 3,
                  opacity: 0.7,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          bottom: -38,
          left: '50%',
          transform: 'translateX(-50%)',
          background: T.ink,
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          padding: '5px 12px',
          borderRadius: 7,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 100,
          letterSpacing: '0.02em',
        }}>
          {tooltip.iso} — {tooltip.label}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TREND CHART
══════════════════════════════════════════════════════════════════ */
function TrendChart({ allStats }) {
  if (allStats.length < 2) return <div style={{ color: T.muted, fontSize: 13, padding: '20px 0' }}>Need 2+ months of data</div>;
  const vals = allStats.map(s => s.att);
  const W = 100, H = 60;
  const maxV = 100;
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * W,
    H - (v / maxV) * (H - 16) - 8,
  ]);
  const area = `M${pts[0][0]},${H} ` + pts.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length-1][0]},${H} Z`;
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const last = vals[vals.length - 1], prev = vals[vals.length - 2];
  const up = last >= prev;
  const color = up ? T.green : T.red;

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: '100%', height: 120, display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[25, 50, 75, 100].map(v => {
          const py = H - (v / maxV) * (H - 16) - 8;
          return (
            <g key={v}>
              <line x1="0" y1={py} x2={W} y2={py} stroke={T.borderLight} strokeWidth="0.5" />
              <text x={W + 1} y={py + 3} fontSize="6" fill={T.muted}>{v}%</text>
            </g>
          );
        })}
        <path d={area} fill="url(#areaGrad)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5}
              fill={i === pts.length - 1 ? color : T.bg} stroke={color} strokeWidth="1.5" />
            <text x={x} y={H + 16} textAnchor="middle" fontSize="7.5" fill={T.muted} fontWeight="600">
              {monthShort(allStats[i].ym)}
            </text>
            {i === pts.length - 1 && (
              <text x={x} y={y - 7} textAnchor="middle" fontSize="8" fontWeight="800" fill={color}>
                {vals[i]}%
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STREAK
══════════════════════════════════════════════════════════════════ */
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

  const emoji = streak >= 20 ? '🔥🔥🔥' : streak >= 10 ? '🔥🔥' : streak >= 5 ? '🔥' : streak >= 1 ? '⚡' : '—';
  const color = streak >= 15 ? T.red : streak >= 8 ? '#f97316' : streak >= 3 ? T.amber : streak >= 1 ? T.green : T.muted;

  return (
    <div style={{
      border: `1.5px solid ${streak > 0 ? '#fed7aa' : T.border}`,
      borderRadius: 16, padding: '18px 24px',
      background: streak > 0 ? '#fff7ed' : T.bg,
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{ fontSize: 36, lineHeight: 1 }}>{emoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Current Streak</div>
        <div style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1.1, fontFamily: "'DM Serif Display', Georgia, serif" }}>
          {streak} <span style={{ fontSize: 14, color: T.muted, fontWeight: 400, fontFamily: 'inherit' }}>full days</span>
        </div>
      </div>
      <div style={{
        padding: '8px 16px', borderRadius: 99,
        background: streak > 0 ? color + '18' : T.bgSoft,
        color: streak > 0 ? color : T.muted,
        fontSize: 12, fontWeight: 700, border: `1px solid ${streak > 0 ? color + '30' : T.border}`,
      }}>
        {streak === 0 ? 'Start today' : streak >= 10 ? 'On fire!' : 'Keep going'}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BAR ROW — for trends
══════════════════════════════════════════════════════════════════ */
function BarRow({ ym, value, max, color, light }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(max > 0 ? (value / max) * 100 : 0), 120); return () => clearTimeout(t); }, [value, max]);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 40px', alignItems: 'center', gap: 12, padding: '7px 0' }}>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textAlign: 'right' }}>{monthShort(ym)}</div>
      <div style={{ background: T.bgSoft, borderRadius: 99, height: 22, overflow: 'hidden', border: `1px solid ${T.border}` }}>
        <div style={{
          height: '100%', borderRadius: 99, background: color,
          width: `${w}%`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
          minWidth: value > 0 ? 22 : 0,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
        }}>
          {w > 18 && <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{value}</span>}
        </div>
      </div>
      <div style={{ fontSize: 12, color, fontWeight: 800, textAlign: 'right' }}>{value}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DIVIDER
══════════════════════════════════════════════════════════════════ */
const Divider = () => <div style={{ height: 1, background: T.border, margin: '0' }} />;

/* ══════════════════════════════════════════════════════════════════
   LEGEND
══════════════════════════════════════════════════════════════════ */
function Legend() {
  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', paddingTop: 16, marginTop: 16, borderTop: `1px solid ${T.borderLight}` }}>
      {Object.entries(BUCKET).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: T.muted }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: v.light, border: `1.5px solid ${v.color}` }} />
          <span style={{ fontWeight: 600, color: T.inkMid }}>{v.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION HEADING
══════════════════════════════════════════════════════════════════ */
function SectionHead({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 16 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════ */
export default function AttendanceAnalytics() {
  const [selectedMonth, setSelectedMonth] = useState(todayYM());
  const [allLogs, setAllLogs] = useState([]);
  const [allHolidays, setAllHolidays] = useState(new Map());
  const [histData, setHistData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    axios.get(`${baseUrl}/my-attendance?month=${selectedMonth}`, { withCredentials: true })
      .then(r => { setAllLogs(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(() => { setAllLogs([]); setLoading(false); });
  }, [selectedMonth]);

  useEffect(() => {
    if (!selectedMonth) return;
    axios.get(`${baseUrl}/holidays?month=${selectedMonth}`, { withCredentials: true })
      .then(r => {
        const map = new Map();
        if (Array.isArray(r.data)) r.data.forEach(h => { if (h.date && h.name) map.set(h.date, h); });
        setAllHolidays(map);
      }).catch(() => setAllHolidays(new Map()));
  }, [selectedMonth]);

  useEffect(() => {
    const months = prevMonths(selectedMonth, 6);
    Promise.all([
      ...months.map(ym =>
        axios.get(`${baseUrl}/my-attendance?month=${ym}`, { withCredentials: true })
          .then(r => ({ ym, logs: Array.isArray(r.data) ? r.data : [] }))
          .catch(() => ({ ym, logs: [] }))
      ),
      ...months.map(ym =>
        axios.get(`${baseUrl}/holidays?month=${ym}`, { withCredentials: true })
          .then(r => Array.isArray(r.data) ? r.data : [])
          .catch(() => [])
      ),
    ]).then(results => {
      const n = months.length;
      const attendanceResults = results.slice(0, n);
      const holidayResults = results.slice(n);
      setHistData(attendanceResults);
      setAllHolidays(prev => {
        const merged = new Map(prev);
        holidayResults.flat().forEach(h => { if (h.date && h.name) merged.set(h.date, h); });
        return merged;
      });
    });
  }, [selectedMonth]);

  const currentStats = useMemo(() => buildStats(selectedMonth, allLogs, allHolidays), [selectedMonth, allLogs, allHolidays]);
  const allStats = useMemo(() => histData.map(h => buildStats(h.ym, h.logs, allHolidays)), [histData, allHolidays]);
  const allStatsWithCurrent = useMemo(() => [...allStats, currentStats], [allStats, currentStats]);
  const maxFull = useMemo(() => Math.max(...allStatsWithCurrent.map(s => s.full), 1), [allStatsWithCurrent]);
  const maxAbs = useMemo(() => Math.max(...allStatsWithCurrent.map(s => s.absent), 1), [allStatsWithCurrent]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'trends', label: 'Trends' },
    { id: 'heatmap', label: 'Heatmap' },
  ];

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif", background: T.bg, borderRadius: 20, border: `1px solid ${T.border}`, overflow: 'hidden', color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        .aa-fade { animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {/* ── TOP HEADER BAR ── */}
      <div style={{ padding: '24px 28px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, background: T.bg }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: T.ink, letterSpacing: '-0.02em', fontFamily: "'DM Serif Display', Georgia, serif" }}>
            Attendance Analytics
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontWeight: 500 }}>
            {monthFull(selectedMonth)} {selectedMonth.split('-')[0]} · Personal Report
          </div>
        </div>

        {/* Month picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}
            style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, cursor: 'pointer', fontSize: 16, color: T.inkMid, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = T.bgSoft}
            onMouseLeave={e => e.currentTarget.style.background = T.bg}>
            ‹
          </button>
          <input type="month" value={selectedMonth}
            onChange={e => e.target.value && setSelectedMonth(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, fontSize: 13, fontWeight: 700, color: T.ink, cursor: 'pointer', outline: 'none' }} />
          <button onClick={() => setSelectedMonth(m => shiftMonth(m, 1))}
            disabled={selectedMonth >= todayYM()}
            style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: selectedMonth >= todayYM() ? T.bgSoft : T.bg, cursor: selectedMonth >= todayYM() ? 'not-allowed' : 'pointer', fontSize: 16, color: selectedMonth >= todayYM() ? T.border : T.inkMid, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => { if (selectedMonth < todayYM()) e.currentTarget.style.background = T.bgSoft; }}
            onMouseLeave={e => e.currentTarget.style.background = selectedMonth >= todayYM() ? T.bgSoft : T.bg}>
            ›
          </button>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, background: T.bg }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: tab === t.id ? T.ink : T.muted,
              borderBottom: `2.5px solid ${tab === t.id ? T.ink : 'transparent'}`,
              transition: 'color 0.2s, border-color 0.2s', marginBottom: -1,
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = T.inkMid; }}
            onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = T.muted; }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ padding: '64px', textAlign: 'center', color: T.muted }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>Loading…</div>
        </div>
      )}

      {/* ════════════════════════════════════════
          OVERVIEW TAB
      ════════════════════════════════════════ */}
      {!loading && tab === 'overview' && (
        <div className="aa-fade" style={{ padding: '28px' }}>

          {/* Score + key stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: 20, marginBottom: 20, alignItems: 'start' }}>
            {/* Score card */}
            <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '28px 32px', background: T.bg }}>
              <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 20 }}>Monthly Performance</div>
              <StatRing score={currentStats.att} />
              <Divider />
              <div style={{ paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Work Days', value: currentStats.workDays, color: T.blue },
                  { label: 'Avg Hours', value: `${currentStats.avgH.toFixed(1)}h`, color: T.teal },
                  { label: 'Holidays', value: currentStats.holiday, color: T.blue },
                  { label: 'Paid Leave', value: currentStats.paid, color: T.violet },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'DM Serif Display', Georgia, serif" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3-col stat tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <StatTile label="Full Days" value={currentStats.full} color={T.green} light={T.greenLight} icon="✓" note={currentStats.full === 0 ? null : currentStats.workDays > 0 ? `${Math.round((currentStats.full/currentStats.workDays)*100)}% of workdays` : null} />
              <StatTile label="Half Days" value={currentStats.half} color={T.amber} light={T.amberLight} icon="◐" note="Partial attendance" />
              <StatTile label="Absent" value={currentStats.absent} color={T.red} light={T.redLight} icon="✕" note={currentStats.absent === 0 ? '🎉 Perfect record' : `${currentStats.absent} day${currentStats.absent > 1 ? 's' : ''} missed`} />
            </div>
          </div>

          {/* Streak */}
          <div style={{ marginBottom: 20 }}>
            <Streak logs={allLogs} hols={allHolidays} />
          </div>

          {/* Calendar + Breakdown side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,auto) 1fr', gap: 20, alignItems: 'start', overflowX: 'auto' }}>
            {/* Calendar */}
            <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '24px', background: T.bg }}>
              <SectionHead title={`${monthFull(selectedMonth)} ${selectedMonth.split('-')[0]}`} sub="Daily attendance view" />
              <Heatmap ym={selectedMonth} logs={allLogs} hols={allHolidays} />
              <Legend />
            </div>

            {/* Day breakdown */}
            <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '24px', background: T.bg }}>
              <SectionHead title="Day Breakdown" sub="Distribution of your attendance types" />
              {[
                { key: 'fullday', val: currentStats.full },
                { key: 'halfday', val: currentStats.half },
                { key: 'absent', val: currentStats.absent },
                { key: 'paidleave', val: currentStats.paid },
                { key: 'holiday', val: currentStats.holiday },
              ].map(({ key, val }) => {
                const m = BUCKET[key];
                const total = currentStats.workDays + currentStats.holiday;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: m.color }} />
                        <span style={{ color: T.inkMid }}>{m.label}</span>
                      </div>
                      <span style={{ color: T.muted }}>{val} day{val !== 1 ? 's' : ''} · {pct}%</span>
                    </div>
                    <BarRow ym={selectedMonth} value={val} max={Math.max(total, 1)} color={m.color} light={m.light} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TRENDS TAB
      ════════════════════════════════════════ */}
      {!loading && tab === 'trends' && (
        <div className="aa-fade" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Main trend chart */}
          <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '28px', background: T.bg }}>
            <SectionHead
              title="Attendance Score Trend"
              sub="6-month attendance percentage"
              right={
                allStatsWithCurrent.length >= 2 ? (() => {
                  const diff = currentStats.att - (allStatsWithCurrent[allStatsWithCurrent.length - 2]?.att || 0);
                  const up = diff >= 0;
                  return (
                    <div style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 99, background: up ? T.greenLight : T.redLight, color: up ? T.green : T.red, border: `1px solid ${up ? T.greenMid : T.redMid}` }}>
                      {up ? '↑' : '↓'} {Math.abs(diff)}% vs last month
                    </div>
                  );
                })() : null
              }
            />
            <TrendChart allStats={allStatsWithCurrent} />
          </div>

          {/* Full + Absent bar charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '24px', background: T.bg }}>
              <SectionHead title="Full Days per Month" sub="More is better" />
              {allStatsWithCurrent.map(s => (
                <BarRow key={s.ym} ym={s.ym} value={s.full} max={maxFull} color={T.green} light={T.greenLight} />
              ))}
            </div>
            <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '24px', background: T.bg }}>
              <SectionHead title="Absences per Month" sub="Less is better" />
              {allStatsWithCurrent.map(s => (
                <BarRow key={s.ym} ym={s.ym} value={s.absent} max={maxAbs} color={s.absent === 0 ? T.green : T.red} light={T.redLight} />
              ))}
            </div>
          </div>

          {/* Summary table */}
          <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 16, background: T.bg, overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px 0' }}>
              <SectionHead title="Month-by-Month Summary" sub="Complete statistics" />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.bgSoft, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
                    {['Month', 'Full Days', 'Half Days', 'Absent', 'Paid Leave', 'Score', 'Avg / Day'].map(h => (
                      <th key={h} style={{ padding: '11px 20px', color: T.muted, textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allStatsWithCurrent.map((s, i) => {
                    const isCur = i === allStatsWithCurrent.length - 1;
                    const sc = s.att >= 90 ? T.green : s.att >= 75 ? T.amber : s.att >= 60 ? '#f97316' : T.red;
                    const scBg = s.att >= 90 ? T.greenLight : s.att >= 75 ? T.amberLight : s.att >= 60 ? '#fff7ed' : T.redLight;
                    return (
                      <tr key={s.ym}
                        style={{ background: isCur ? T.blueLight : 'transparent', borderBottom: `1px solid ${T.borderLight}`, transition: 'background 0.15s' }}
                        onMouseEnter={e => { if (!isCur) e.currentTarget.style.background = T.bgSoft; }}
                        onMouseLeave={e => { if (!isCur) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '13px 20px', fontWeight: isCur ? 800 : 600, color: isCur ? T.blue : T.ink }}>
                          {monthShort(s.ym)} {s.ym.split('-')[0]} {isCur && <span style={{ fontSize: 10, background: T.blue, color: '#fff', borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontWeight: 700 }}>current</span>}
                        </td>
                        <td style={{ padding: '13px 20px', color: T.green, fontWeight: 700 }}>{s.full}</td>
                        <td style={{ padding: '13px 20px', color: T.amber }}>{s.half}</td>
                        <td style={{ padding: '13px 20px', color: s.absent === 0 ? T.green : T.red, fontWeight: s.absent === 0 ? 700 : 400 }}>
                          {s.absent === 0 ? '0 ✓' : s.absent}
                        </td>
                        <td style={{ padding: '13px 20px', color: T.violet }}>{s.paid}</td>
                        <td style={{ padding: '13px 20px' }}>
                          <span style={{ background: scBg, color: sc, borderRadius: 99, padding: '3px 11px', fontWeight: 800, fontSize: 11, border: `1px solid ${sc}25` }}>
                            {s.att}%
                          </span>
                        </td>
                        <td style={{ padding: '13px 20px', color: T.teal, fontWeight: 600 }}>{s.avgH.toFixed(1)}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          HEATMAP TAB
      ════════════════════════════════════════ */}
      {!loading && tab === 'heatmap' && (
        <div className="aa-fade" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Main big heatmap */}
          <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '28px', background: T.bg, overflowX: 'auto' }}>
            <SectionHead title={`${monthFull(selectedMonth)} ${selectedMonth.split('-')[0]}`} sub="Daily attendance heatmap" />
            <Heatmap ym={selectedMonth} logs={allLogs} hols={allHolidays} />
            <Legend />
          </div>

          {/* Past months grid */}
          {histData.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Previous 3 Months</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {histData.slice(-3).map(({ ym, logs }) => {
                  const s = buildStats(ym, logs, allHolidays);
                  const sc = s.att >= 90 ? T.green : s.att >= 75 ? T.amber : T.red;
                  const scBg = s.att >= 90 ? T.greenLight : s.att >= 75 ? T.amberLight : T.redLight;
                  return (
                    <div key={ym} style={{ border: `1.5px solid ${T.border}`, borderRadius: 14, padding: '20px', background: T.bg, overflowX: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{monthFull(ym)} {ym.split('-')[0]}</div>
                        <span style={{ background: scBg, color: sc, borderRadius: 99, padding: '3px 10px', fontWeight: 800, fontSize: 11 }}>{s.att}%</span>
                      </div>
                      <Heatmap ym={ym} logs={logs} hols={allHolidays} compact />
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderLight}`, display: 'flex', gap: 14, fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: T.green }}>✓ {s.full}</span>
                        <span style={{ color: T.amber }}>◐ {s.half}</span>
                        <span style={{ color: T.red }}>✕ {s.absent}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Legend detail */}
          <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '24px', background: T.bg }}>
            <SectionHead title="Legend" sub="What each status means" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {Object.entries(BUCKET).map(([k, v]) => (
                <div key={k} style={{ background: v.light, border: `1.5px solid ${v.color}25`, borderRadius: 12, padding: '14px 16px', borderLeft: `3px solid ${v.color}` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: v.color, marginBottom: 4 }}>{v.label}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>
                    {k === 'fullday' ? 'Worked 8+ hours' : k === 'halfday' ? 'Worked 4–8 hours' : k === 'absent' ? 'Worked <4 hours' : k === 'holiday' ? 'Sunday / public holiday' : 'Approved paid leave'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ padding: '14px 28px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 11, color: T.muted, background: T.bgSoft }}>
        <span>Updated {new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit' })} IST</span>
        <span>Future dates are excluded from calculations</span>
      </div>
    </div>
  );
}