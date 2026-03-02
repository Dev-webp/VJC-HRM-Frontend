import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const baseUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://backend.vjcoverseas.com';

const OFFICE_START     = '10:00:00';
const LATE_GRACE_LIMIT = '10:15:00';
const LOGOUT_CUTOFF    = '19:00:00';
const MAX_LATES        = 6;

// ─── LIGHT THEME ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#f8fafc',
  surface: '#ffffff',
  surf2:   '#f1f5f9',
  border:  '#e2e8f0',
  text:    '#0f172a',
  muted:   '#64748b',
  accent:  '#0ea5e9',
  full:    '#16a34a',
  half:    '#d97706',
  absent:  '#dc2626',
  holiday: '#2563eb',
  leave:   '#7c3aed',
};

const EMP_COLORS = [
  '#0ea5e9','#16a34a','#f97316','#ec4899','#8b5cf6',
  '#eab308','#06b6d4','#84cc16','#ef4444','#a855f7',
  '#14b8a6','#6366f1','#f43f5e','#f59e0b','#10b981',
];

// ─── UTILS ───────────────────────────────────────────────────────────────────
function parseT(t) {
  if (!t) return null;
  const p = t.split('.')[0].split(':');
  const h = parseInt(p[0], 10), m = parseInt(p[1] || '0', 10);
  if (isNaN(h) || isNaN(m)) return null;
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}
function diffMs(a, b) {
  const ta = parseT(a), tb = parseT(b);
  if (!ta || !tb || tb < ta) return 0;
  return tb - ta;
}
function toHours(ms) { return ms / 3600000; }
function fmtHM(ms) {
  const min = Math.floor(ms / 60000);
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}
function nowYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextYM(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
}
function monthDays(ym) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1, i + 1));
    // Use getUTCDay() to ensure consistent day-of-week in UTC
    return { date: d, iso: d.toISOString().slice(0, 10), weekday: d.getUTCDay() };
  });
}
function fmtTime(t) {
  if (!t) return '-';
  try {
    const [h, m] = t.split(':');
    const d = new Date(); d.setHours(+h, +m, 0);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return t; }
}

// Normalize date string to YYYY-MM-DD (handles both "2026-03-1" and "2026-03-01")
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  try {
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length !== 3) return null;
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  } catch { return null; }
}

// ─── POLICY ──────────────────────────────────────────────────────────────────
function calcNet(log) {
  const {
    office_in, office_out,
    break_in, break_out, break_in_2, break_out_2,
    lunch_in, lunch_out,
    extra_break_ins, extra_break_outs,
  } = log || {};
  if (!office_in || !office_out) return 0;

  const tIn  = parseT(office_in);
  const tOut = parseT(office_out);
  if (!tIn || !tOut) return 0;

  // FIX: compare Date objects properly
  const tOfficeStart  = parseT(OFFICE_START);
  const tLogoutCutoff = parseT(LOGOUT_CUTOFF);
  const actualIn  = tIn  < tOfficeStart  ? OFFICE_START  : office_in;
  const actualOut = tOut > tLogoutCutoff ? LOGOUT_CUTOFF : office_out;

  let gross = diffMs(actualIn, actualOut);
  let brk = 0;
  if (break_in   && break_out)   brk += diffMs(break_in,   break_out);
  if (break_in_2 && break_out_2) brk += diffMs(break_in_2, break_out_2);
  if (lunch_in   && lunch_out)   brk += diffMs(lunch_in,   lunch_out);
  const ins  = Array.isArray(extra_break_ins)  ? extra_break_ins  : [];
  const outs = Array.isArray(extra_break_outs) ? extra_break_outs : [];
  for (let i = 0; i < Math.min(ins.length, outs.length); i++)
    if (ins[i] && outs[i]) brk += diffMs(ins[i], outs[i]);
  return Math.max(0, gross - brk);
}

function getLateInfo(log) {
  const t = parseT(log?.office_in);
  if (!t) return { late: false, grace: false, beyond: false };
  const s = parseT(OFFICE_START), g = parseT(LATE_GRACE_LIMIT);
  if (!s || !g) return { late: false, grace: false, beyond: false };
  if (t <= s) return { late: false, grace: false, beyond: false };
  if (t <= g) return { late: true,  grace: true,  beyond: false };
  return { late: true, grace: false, beyond: true };
}

function buildLateStats(byDate, days) {
  let count = 0;
  const exceeded = [];
  for (const { iso } of days) {
    const l = byDate.get(iso);
    if (l) {
      const li = getLateInfo(l);
      if (li.late && li.grace) {
        count++;
        if (count > MAX_LATES) exceeded.push(iso);
      }
    }
  }
  return { count, exceeded };
}

function classifyDay(iso, weekday, log, holidays, lStats, byDate) {
  const netMs = calcNet(log || {});
  const netH  = toHours(netMs);

  // Monday after 2 PM → absent
  if (weekday === 1) {
    const t = parseT(log?.office_in), c = parseT('14:00:00');
    if (t && c && t > c) return 'absent';
  }

  // Sunday logic
  if (weekday === 0) {
    if (holidays.has(iso)) return 'holiday';
    const dt = new Date(iso + 'T00:00:00Z');
    const isMonthStart = dt.getUTCDate() === 1;
    const satS = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() - 1)).toISOString().slice(0, 10);
    const monS = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + 1)).toISOString().slice(0, 10);
    const satL = byDate.get(satS) || {};
    const monL = byDate.get(monS) || {};

    // FIX: null-safe comparisons for sat/mon conditions
    const satOutT = parseT(satL.office_out);
    const cutoffT = parseT(LOGOUT_CUTOFF);
    const monInT  = parseT(monL.office_in);
    const graceT  = parseT(LATE_GRACE_LIMIT);

    const satOk = (satOutT && cutoffT && satOutT >= cutoffT)
      || (satL.leave_type && (
        satL.leave_type.toLowerCase().includes('paid') ||
        satL.leave_type.toLowerCase().includes('half') ||
        satL.leave_type.toLowerCase().includes('earned')
      ));
    const monOk = (monInT && graceT && monInT <= graceT)
      || (monL.leave_type && monL.leave_type.toLowerCase().includes('earned'));

    if (isMonthStart) return monOk ? 'holiday' : 'absent';
    return (satOk && monOk) ? 'holiday' : 'absent';
  }

  if (holidays.has(iso)) return 'holiday';

  // Earned leave
  if (log?.leave_type?.toLowerCase().includes('earned')) {
    return netH >= 4 ? 'fullday' : 'paidleave';
  }
  // Other leave (unpaid)
  if (log?.leave_type && !log.leave_type.toLowerCase().includes('earned')) return 'absent';

  if (!log?.office_in || !log?.office_out) return 'absent';

  const outT  = parseT(log.office_out);
  const cutT  = parseT(LOGOUT_CUTOFF);
  const li    = getLateInfo(log);
  const exc   = lStats.exceeded.includes(iso);

  if (outT && cutT && outT >= cutT && netH >= 4 && netH < 8) return 'halfday';
  if (outT && cutT && outT < cutT)  {
    if (netH >= 8) return 'halfday';
    if (netH < 4)  return 'absent';
  }
  if ((li.late && li.grace && exc) || (li.late && li.beyond)) return netH >= 8 ? 'halfday' : 'absent';
  if (netH < 4) return 'absent';
  if (netH < 8) return 'halfday';
  return 'fullday';
}

function buildSummary(logs, holidays, ym) {
  if (!ym || !logs) return { fullDays: 0, halfDays: 0, absentDays: 0, holidayDays: 0, paidDays: 0, attPct: '0.0', avgNet: '0.0', lateCount: 0 };
  const days    = monthDays(ym);
  const todayIS = new Date().toISOString().slice(0, 10);
  const valid   = days.filter(d => d.iso <= todayIS);

  // FIX: normalize all log dates before building map
  const byDate = new Map();
  (logs || []).forEach(l => {
    const nd = normalizeDate(l.date);
    if (nd) byDate.set(nd, l);
  });

  const ls = buildLateStats(byDate, days);
  let full = 0, half = 0, absent = 0, holiday = 0, paid = 0, totalMs = 0;
  for (const { iso, weekday } of valid) {
    const log = byDate.get(iso);
    totalMs += calcNet(log || {});
    const b = classifyDay(iso, weekday, log, holidays, ls, byDate);
    if      (b === 'fullday')   full++;
    else if (b === 'halfday')   half++;
    else if (b === 'paidleave') paid++;
    else if (b === 'holiday')   holiday++;
    else                        absent++;
  }

  const extraFull = Math.floor(half / 2);
  full += extraFull;
  const remHalf = half % 2;

  const workDays = valid.filter(d => d.weekday !== 0 && !holidays.has(d.iso)).length;
  const attPct   = workDays > 0 ? (((full + remHalf * 0.5 + paid) / workDays) * 100).toFixed(1) : '0.0';
  const workedDays = valid.filter(d => {
    const nd = normalizeDate(d.iso);
    return nd && byDate.get(nd)?.office_in;
  }).length;
  const avgNet = workedDays > 0 ? (toHours(totalMs) / workedDays).toFixed(1) : '0.0';

  return { fullDays: full, halfDays: remHalf, absentDays: absent, holidayDays: holiday, paidDays: paid, attPct, avgNet, lateCount: ls.count };
}

// ─── CHARTS ──────────────────────────────────────────────────────────────────
function OverallBar({ data }) {
  if (!data.length) return <div style={{ padding: 40, color: C.muted, textAlign: 'center' }}>No data yet</div>;
  const w = Math.max(600, data.length * 60);
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <BarChart width={w} height={320} data={data} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
        <XAxis dataKey="shortName" tick={{ fill: C.muted, fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
        <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
        <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8 }}
          labelFormatter={(_, pl) => pl?.[0]?.payload?.fullName || ''} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Full"   stackId="a" fill={C.full}   name="Full Day"   />
        <Bar dataKey="Half"   stackId="a" fill={C.half}   name="Half Day"   />
        <Bar dataKey="Leave"  stackId="a" fill={C.leave}  name="Paid Leave" />
        <Bar dataKey="Absent" stackId="a" fill={C.absent} name="Absent" radius={[4,4,0,0]} />
      </BarChart>
    </div>
  );
}

function AttLine({ data }) {
  if (!data.length) return <div style={{ padding: 40, color: C.muted, textAlign: 'center' }}>No data yet</div>;
  const w = Math.max(600, data.length * 60);
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <LineChart width={w} height={260} data={data} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
        <XAxis dataKey="shortName" tick={{ fill: C.muted, fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
        <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 11 }} unit="%" />
        <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8 }}
          formatter={v => [`${v}%`, 'Attendance']}
          labelFormatter={(_, pl) => pl?.[0]?.payload?.fullName || ''} />
        <Line type="monotone" dataKey="att" name="Attendance %" stroke={C.accent}
          strokeWidth={2.5} dot={{ r: 5, fill: C.accent }} activeDot={{ r: 7 }} />
      </LineChart>
    </div>
  );
}

function EmpPie({ s, name, color }) {
  const slices = [
    { name: 'Full',    value: s.fullDays,    color: C.full    },
    { name: 'Half',    value: s.halfDays,    color: C.half    },
    { name: 'Absent',  value: s.absentDays,  color: C.absent  },
    { name: 'Leave',   value: s.paidDays,    color: C.leave   },
    { name: 'Holiday', value: s.holidayDays, color: C.holiday },
  ].filter(d => d.value > 0);
  const pieData = slices.length > 0 ? slices : [{ name: 'No Data', value: 1, color: '#e2e8f0' }];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: '16px 18px', width: 210, flexShrink: 0,
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)', borderTop: `4px solid ${color}` }}>
      <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      <div style={{ color: color, fontSize: 22, fontWeight: 800 }}>{s.attPct}%</div>
      <div style={{ color: C.muted, fontSize: 10, marginBottom: 8 }}>Attendance</div>
      <PieChart width={174} height={160}>
        <Pie data={pieData} dataKey="value" cx={87} cy={75}
          innerRadius={38} outerRadius={62} paddingAngle={slices.length > 1 ? 3 : 0} startAngle={90} endAngle={-270}>
          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${C.border}`, fontSize: 11, borderRadius: 6 }} />
      </PieChart>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
        {slices.length > 0 ? slices.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.muted }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            {d.name}: <b style={{ color: C.text }}>{d.value}</b>
          </div>
        )) : <div style={{ color: C.muted, fontSize: 10 }}>No attendance recorded</div>}
      </div>
    </div>
  );
}

function EmpHoursBar({ logs, name, color }) {
  const data = [...(logs || [])]
    .filter(l => l.office_in && l.office_out)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(-20)
    .map(l => ({ date: (l.date || '').slice(5), hrs: +toHours(calcNet(l)).toFixed(2) }));
  if (!data.length) return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 20, height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: C.muted, fontSize: 13 }}>No logged days found for this month</div>
  );
  const w = Math.max(400, data.length * 36);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
      <div style={{ color: C.text, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
        {name} — <span style={{ color: C.muted, fontWeight: 400, fontSize: 11 }}>Last {data.length} logged days</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <BarChart width={w} height={200} data={data} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} angle={-35} textAnchor="end" />
          <YAxis tick={{ fill: C.muted, fontSize: 10 }} domain={[0, 10]} />
          <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${C.border}`, fontSize: 11, borderRadius: 6 }}
            formatter={v => [`${v}h`, 'Hours']} />
          <Bar dataKey="hrs" name="Hours" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </div>
    </div>
  );
}

function LogTable({ logs }) {
  const sorted = [...logs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.surf2 }}>
            {['Date','Login','B.In','B.Out','L.In','L.Out','Logout','Net Hrs','Leave'].map(h => (
              <th key={h} style={{ padding: '9px 12px', color: C.muted, textAlign: 'left',
                borderBottom: `2px solid ${C.border}`, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((l, i) => {
            const net = calcNet(l), netH = toHours(net);
            const clr = netH >= 8 ? C.full : netH >= 4 ? C.half : netH > 0 ? C.absent : C.muted;
            return (
              <tr key={l.date || i} style={{ background: i % 2 ? C.surf2 : C.surface }}>
                <td style={{ padding: '6px 12px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.text }}>{l.date}</td>
                {[l.office_in, l.break_in, l.break_out, l.lunch_in, l.lunch_out, l.office_out].map((t, idx) => (
                  <td key={idx} style={{ padding: '6px 12px', borderBottom: `1px solid ${C.border}`, fontFamily: 'monospace', color: C.muted }}>{fmtTime(t)}</td>
                ))}
                <td style={{ padding: '6px 12px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ background: clr + '18', color: clr, padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace', fontWeight: 700 }}>
                    {net > 0 ? fmtHM(net) : '-'}
                  </span>
                </td>
                <td style={{ padding: '6px 12px', borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 11 }}>{l.leave_type || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Card({ label, value, color, sub }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '14px 18px', minWidth: 120, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      borderTop: `4px solid ${color || C.accent}` }}>
      <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <div style={{ color: color || C.text, fontSize: 22, fontWeight: 800, fontFamily: 'monospace' }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Sec({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 12px' }}>
      <div style={{ width: 4, height: 20, background: C.accent, borderRadius: 2 }} />
      <h2 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{children}</h2>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function ChairmanDashboard() {
  const [employees,     setEmployees]   = useState([]);
  const [allLogs,       setAllLogs]     = useState({});
  const [holidays,      setHolidays]    = useState(new Map());
  const [selectedMonth, setMonth]       = useState(() => nowYM());
  const [loading,       setLoading]     = useState(true);
  const [logsReady,     setLogsReady]   = useState(false);
  const [error,         setError]       = useState('');
  const [activeTab,     setActiveTab]   = useState('overview');
  const [selectedEmp,   setSelectedEmp] = useState(null);
  const [loadProgress,  setLoadProgress] = useState({ done: 0, total: 0 });

  // Load employees
  useEffect(() => {
    setLoading(true);
    setError('');
    axios.get(`${baseUrl}/admin/employees`, { withCredentials: true })
      .then(r => {
        const emps = Array.isArray(r.data) ? r.data : [];
        // FIX: ensure IDs are always strings for consistent map keying
        setEmployees(emps.map(e => ({ ...e, id: String(e.id) })));
      })
      .catch(() => {
        setError('❌ Failed to load employees. Make sure you are logged in as chairman.');
        setLoading(false);
      });
  }, []);

  // Load holidays
  useEffect(() => {
    if (!selectedMonth) return;
    axios.get(`${baseUrl}/holidays?month=${selectedMonth}`, { withCredentials: true })
      .then(r => {
        const m = new Map();
        (r.data || []).forEach(h => { if (h.date) m.set(normalizeDate(h.date) || h.date, h); });
        setHolidays(m);
      })
      .catch(() => {});
  }, [selectedMonth]);

  // FIX: Use /all-attendance endpoint (same as AttendanceChatLogs) instead of per-employee calls
  // This avoids the N+1 problem and uses the same data source as the working component
  useEffect(() => {
    if (!selectedMonth) return;
    setLogsReady(false);
    setLoading(true);
    setLoadProgress({ done: 0, total: 1 });

    axios.get(`${baseUrl}/all-attendance?month=${selectedMonth}`, { withCredentials: true })
      .then(r => {
        const obj = r.data || {};
        const map = {};
        // obj keys are emails, values have { name, role, attendance: [...] }
        // We also need to handle if employees list uses IDs — try to match by email
        Object.entries(obj).forEach(([email, userData]) => {
          const logs = (userData.attendance || []).map(l => ({
            ...l,
            date: normalizeDate(l.date) || l.date,
          }));
          map[email] = { logs, name: userData.name, role: userData.role, email };
        });
        setAllLogs(map);
        setLoadProgress({ done: 1, total: 1 });
        setLoading(false);
        setLogsReady(true);
      })
      .catch(() => {
        // Fallback: fetch per-employee if /all-attendance not available
        if (!employees.length) { setLoading(false); return; }
        setLoadProgress({ done: 0, total: employees.length });
        const next = nextYM(selectedMonth);
        Promise.all(
          employees.map((emp, idx) =>
            Promise.all([
              axios.get(`${baseUrl}/admin/attendance?employee_id=${emp.id}&month=${selectedMonth}`, { withCredentials: true })
                .then(r => Array.isArray(r.data) ? r.data : []).catch(() => []),
              axios.get(`${baseUrl}/admin/attendance?employee_id=${emp.id}&month=${next}`, { withCredentials: true })
                .then(r => Array.isArray(r.data) ? r.data : []).catch(() => []),
            ]).then(([a, b]) => {
              setLoadProgress(p => ({ ...p, done: p.done + 1 }));
              return {
                id: emp.id,
                logs: [...a, ...b].map(l => ({ ...l, date: normalizeDate(l.date) || l.date })),
              };
            })
          )
        ).then(results => {
          const map = {};
          results.forEach(r => { map[r.id] = { logs: r.logs }; });
          setAllLogs(map);
          setLoading(false);
          setLogsReady(true);
        });
      });
  }, [employees, selectedMonth]);

  // Summaries — handle both /all-attendance response (keyed by email) and fallback (keyed by id)
  const summaries = useMemo(() => {
    if (!logsReady) return [];

    // If allLogs is keyed by email (from /all-attendance)
    const isEmailKeyed = Object.keys(allLogs).some(k => k.includes('@'));

    if (isEmailKeyed) {
      // Build summaries directly from allLogs entries (no need for employees list)
      return Object.entries(allLogs).map(([email, userData], i) => ({
        id:    email,
        email: email,
        name:  userData.name || email,
        role:  userData.role || '',
        s:     buildSummary(userData.logs || [], holidays, selectedMonth),
      })).filter(e => e.role !== 'chairman')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // Fallback: match by employee ID
    return employees.map(emp => ({
      ...emp,
      s: buildSummary((allLogs[emp.id] || {}).logs || allLogs[emp.id] || [], holidays, selectedMonth),
    }));
  }, [employees, allLogs, holidays, selectedMonth, logsReady]);

  const chartData = useMemo(() =>
    summaries.map(e => ({
      shortName: (e.name || '').split(' ')[0],
      fullName:  e.name || '',
      Full:      e.s.fullDays,
      Half:      e.s.halfDays,
      Leave:     e.s.paidDays,
      Absent:    e.s.absentDays,
      att:       parseFloat(e.s.attPct),
    })), [summaries]);

  const org = useMemo(() => {
    if (!summaries.length) return { n: 0, avgA: '0.0', top: '-', bot: '-', absent: 0 };
    const n    = summaries.length;
    const avgA = (summaries.reduce((a, e) => a + parseFloat(e.s.attPct), 0) / n).toFixed(1);
    const top  = [...summaries].sort((a, b) => parseFloat(b.s.attPct) - parseFloat(a.s.attPct))[0];
    const bot  = [...summaries].sort((a, b) => b.s.absentDays - a.s.absentDays)[0];
    return { n, avgA, top: top?.name || '-', bot: bot?.name || '-', absent: summaries.reduce((a, e) => a + e.s.absentDays, 0) };
  }, [summaries]);

  // FIX: selectedEmp is now email (string), empLogs filtered by month
  const empIdx  = summaries.findIndex(e => e.id === selectedEmp);
  const empData = empIdx >= 0 ? summaries[empIdx] : null;
  const empLogs = useMemo(() => {
    if (!selectedEmp) return [];
    const userData = allLogs[selectedEmp];
    const logs = userData?.logs || (Array.isArray(userData) ? userData : []);
    return logs.filter(l => {
      const nd = normalizeDate(l.date);
      return nd && nd.startsWith(selectedMonth);
    });
  }, [allLogs, selectedEmp, selectedMonth]);
  const empClr = empIdx >= 0 ? EMP_COLORS[empIdx % EMP_COLORS.length] : C.accent;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text,
      fontFamily: "'Segoe UI', Arial, sans-serif", paddingBottom: 60 }}>

      {/* HEADER */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '16px 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.accent}, #6366f1)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏛️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Chairman Dashboard</div>
            <div style={{ color: C.muted, fontSize: 11 }}>Full Attendance Overview · All Employees</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.muted, fontSize: 12 }}>Month:</span>
          <input type="month" value={selectedMonth}
            onChange={e => { setMonth(e.target.value); setSelectedEmp(null); setLogsReady(false); }}
            style={{ background: C.surf2, border: `1px solid ${C.border}`, color: C.text,
              borderRadius: 8, padding: '5px 10px', fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', margin: '14px 28px',
          borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>
      )}

      <div style={{ padding: '18px 28px' }}>

        {!loading && summaries.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <Card label="Employees"      value={org.n}          color={C.accent} />
            <Card label="Avg Attendance" value={`${org.avgA}%`} color={C.full} />
            <Card label="Top Performer"  value={(org.top || '-').split(' ')[0]} sub={org.top} color={C.full} />
            <Card label="Most Absences"  value={(org.bot || '-').split(' ')[0]} sub={org.bot} color={C.absent} />
            <Card label="Total Absences" value={org.absent}     color={C.half} />
          </div>
        )}

        {/* TABS */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 18, borderBottom: `2px solid ${C.border}` }}>
          {[['overview','📊 Overview'],['employees','👥 All Employees'],['individual','🔍 Individual']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              background:  activeTab === id ? C.accent : 'transparent',
              color:       activeTab === id ? '#fff'   : C.muted,
              border: 'none', borderRadius: '7px 7px 0 0',
              padding: '8px 18px', fontWeight: activeTab === id ? 700 : 400,
              fontSize: 13, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: C.muted, fontSize: 15 }}>
            <div style={{ marginBottom: 12 }}>⏳ Loading attendance data…</div>
            {loadProgress.total > 1 && (
              <div style={{ fontSize: 13 }}>
                {loadProgress.done} / {loadProgress.total} employees loaded
                <div style={{ marginTop: 8, height: 4, background: C.border, borderRadius: 4, width: 200, margin: '8px auto 0' }}>
                  <div style={{ height: '100%', background: C.accent, borderRadius: 4,
                    width: `${(loadProgress.done / loadProgress.total) * 100}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
          </div>
        ) : summaries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontSize: 14,
            background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
            No attendance data found for {selectedMonth}.<br />
            <span style={{ fontSize: 12 }}>Make sure employees have logged attendance this month.</span>
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div>
                <Sec>Attendance Breakdown — All Employees</Sec>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '18px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
                  <OverallBar data={chartData} />
                </div>
                <Sec>Attendance % Comparison</Sec>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '18px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
                  <AttLine data={chartData} />
                </div>
                <Sec>Individual Breakdown</Sec>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                  {summaries.map((e, i) => (
                    <EmpPie key={e.id} name={e.name} s={e.s} color={EMP_COLORS[i % EMP_COLORS.length]} />
                  ))}
                </div>
              </div>
            )}

            {/* ── ALL EMPLOYEES ── */}
            {activeTab === 'employees' && (
              <div>
                <Sec>All Employees · {selectedMonth}</Sec>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 12, overflowX: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.surf2 }}>
                        {['#','Name','Att %','Full','Half','Absent','Leave','Holiday','Late','Avg Net',''].map(h => (
                          <th key={h} style={{ padding: '10px 12px', color: C.muted, textAlign: 'left',
                            borderBottom: `2px solid ${C.border}`, fontWeight: 600, fontSize: 11,
                            textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summaries.map((e, i) => {
                        const attF = parseFloat(e.s.attPct);
                        const attClr = attF >= 80 ? C.full : attF >= 60 ? C.half : C.absent;
                        const col = EMP_COLORS[i % EMP_COLORS.length];
                        return (
                          <tr key={e.id}
                            style={{ background: i % 2 ? C.surf2 : C.surface }}
                            onMouseEnter={ev => ev.currentTarget.style.background = '#e0f2fe'}
                            onMouseLeave={ev => ev.currentTarget.style.background = i % 2 ? C.surf2 : C.surface}>
                            <td style={{ padding: '8px 12px', color: C.muted, borderBottom: `1px solid ${C.border}` }}>{i + 1}</td>
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                  background: `linear-gradient(135deg,${col},${EMP_COLORS[(i+4)%EMP_COLORS.length]})`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 12, fontWeight: 800, color: '#fff' }}>
                                  {(e.name || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ color: C.text, fontWeight: 600 }}>{e.name}</div>
                                  <div style={{ color: C.muted, fontSize: 10 }}>{e.role || ''}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
                              <span style={{ background: attClr + '18', color: attClr,
                                padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontFamily: 'monospace' }}>
                                {e.s.attPct}%
                              </span>
                            </td>
                            {[[e.s.fullDays,C.full],[e.s.halfDays,C.half],[e.s.absentDays,C.absent],
                              [e.s.paidDays,C.leave],[e.s.holidayDays,C.holiday]].map(([v,c],idx) => (
                              <td key={idx} style={{ padding: '8px 12px', color: c, fontWeight: 700,
                                borderBottom: `1px solid ${C.border}`, fontFamily: 'monospace' }}>{v}</td>
                            ))}
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`,
                              fontFamily: 'monospace', color: e.s.lateCount > MAX_LATES ? C.absent : C.muted }}>
                              {e.s.lateCount}/{MAX_LATES}
                            </td>
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`,
                              fontFamily: 'monospace', color: C.muted }}>{e.s.avgNet}h</td>
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
                              <button onClick={() => { setSelectedEmp(e.id); setActiveTab('individual'); }}
                                style={{ background: C.accent, border: 'none', color: '#fff',
                                  borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                View →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── INDIVIDUAL ── */}
            {activeTab === 'individual' && (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {summaries.map((e, i) => {
                    const col = EMP_COLORS[i % EMP_COLORS.length];
                    const sel = selectedEmp === e.id;
                    return (
                      <button key={e.id} onClick={() => setSelectedEmp(e.id)} style={{
                        background: sel ? col : C.surface,
                        color:      sel ? '#fff' : C.muted,
                        border: `1.5px solid ${sel ? col : C.border}`,
                        borderRadius: 20, padding: '6px 16px', fontSize: 13,
                        fontWeight: sel ? 700 : 400, cursor: 'pointer',
                        boxShadow: sel ? `0 2px 8px ${col}44` : 'none',
                      }}>{e.name}</button>
                    );
                  })}
                </div>

                {!selectedEmp ? (
                  <div style={{ color: C.muted, textAlign: 'center', padding: 60, fontSize: 14,
                    background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                    👆 Select an employee above to view their records
                  </div>
                ) : empData ? (
                  <div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.surface,
                        border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 16px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                          background: `linear-gradient(135deg, ${empClr}, #6366f1)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, fontWeight: 800, color: '#fff' }}>
                          {(empData.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{empData.name}</div>
                          <div style={{ color: C.muted, fontSize: 11 }}>{empData.role || 'Employee'}</div>
                        </div>
                      </div>
                      <Card label="Attendance"  value={`${empData.s.attPct}%`} color={empClr} />
                      <Card label="Full Days"   value={empData.s.fullDays}     color={C.full} />
                      <Card label="Half Days"   value={empData.s.halfDays}     color={C.half} />
                      <Card label="Absent"      value={empData.s.absentDays}   color={C.absent} />
                      <Card label="Late Logins" value={`${empData.s.lateCount}/${MAX_LATES}`}
                        color={empData.s.lateCount > MAX_LATES ? C.absent : C.muted} />
                      <Card label="Avg Net/Day" value={`${empData.s.avgNet}h`} color={C.accent} />
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-start' }}>
                      <EmpPie name={empData.name} s={empData.s} color={empClr} />
                      <div style={{ flex: 1, minWidth: 300 }}>
                        <EmpHoursBar logs={empLogs} name={empData.name} color={empClr} />
                      </div>
                    </div>
                    <Sec>Complete Log · {selectedMonth}</Sec>
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
                      {empLogs.length > 0
                        ? <LogTable logs={empLogs} />
                        : <div style={{ color: C.muted, padding: 40, textAlign: 'center' }}>
                            No logs found for {selectedMonth}.<br/>
                            <span style={{ fontSize: 11 }}>
                              Total logs in system: {(allLogs[selectedEmp]?.logs || []).length}
                            </span>
                          </div>
                      }
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      {/* LEGEND */}
      <div style={{ display: 'flex', gap: 16, padding: '0 28px 20px', flexWrap: 'wrap' }}>
        {[['Full Day',C.full],['Half Day',C.half],['Absent',C.absent],['Holiday',C.holiday],['Paid Leave',C.leave]].map(([l,c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
          </div>
        ))}
      </div>
    </div>
  );
}