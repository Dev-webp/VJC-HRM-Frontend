import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// --- Utility functions (unchanged) ---
function parseTime(timeStr) {
  if (!timeStr) return null;
  const cleaned = timeStr.split('.')[0];
  const parts = cleaned.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const s = parseInt(parts[2] || '0', 10);
  if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
  return new Date(Date.UTC(1970, 0, 1, h, m, s));
}
function diffMillis(startStr, endStr) {
  const a = parseTime(startStr), b = parseTime(endStr);
  if (!a || !b || b < a) return 0;
  return b - a;
}
function fmtHrsMinFromMillis(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}hrs ${m}min`;
}
function millisToDecimalHours(ms) {
  return ms / (1000 * 60 * 60);
}
function dateStrLTE(a, b) {
  return a <= b;
}
function dateStrGTE(a, b) {
  return a >= b;
}
function getWeekdayFromISO(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCDay();
}
function currentYearMonth() {
  const now = new Date();
  return now.toISOString().slice(0, 7);
}
// eslint-disable-next-line no-unused-vars
function addDaysISO(isoDate, delta) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
function getMonthDays(year, monthIndex0) {
  const res = [];
  const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(Date.UTC(year, monthIndex0, d));
    res.push({ date, iso: date.toISOString().slice(0, 10) });
  }
  return res;
}
// eslint-disable-next-line no-unused-vars
function getSafeOfficeOut(log) {
  if (log && log.office_in && !log.office_out) {
    return '19:00:00';
  }
  return log.office_out;
}
// --- Policy constants ---
const OFFICE_START = '10:00:00';
const LATE_GRACE_LIMIT = '10:15:00';
const MAX_PERMITTED_LATES_PER_MONTH = 6;
const HALF_SLOT_A_START = '10:00:00';
const HALF_SLOT_A_END = '14:30:00';
const HALF_SLOT_B_START = '14:30:00';
const HALF_SLOT_B_END = '19:00:00';
const MISUSE_GRACE_MIN = 10;
const LUNCH_IN_LIMIT = '14:00:00';
const LOGOUT_CUTOFF = '19:00:00';  // New logout time cutoff for half/absent logic


// --- Main classification policy ---
function calculateNetWorkMillis(log) {
  const { office_in, office_out, break_out, break_in, break_out_2, break_in_2, lunch_out, lunch_in } = log || {};
  if (!office_in || !office_out) return 0;
  const grossMillis = diffMillis(office_in, office_out);
  let explicitBreakMillis = 0;
  if (break_in && break_out) explicitBreakMillis += diffMillis(break_out, break_in);
  if (break_in_2 && break_out_2) explicitBreakMillis += diffMillis(break_out_2, break_in_2);
  if (lunch_in && lunch_out) explicitBreakMillis += diffMillis(lunch_out, lunch_in);
  let totalBreakDeduction = explicitBreakMillis;
  let net = grossMillis - totalBreakDeduction;
  if (net < 0) net = 0;
  return net;
}
function evaluateLateLogin(log) {
  const { office_in } = log || {};
  if (!office_in) return { isLate: false, isWithinGrace: false, isBeyondGrace: false };
  const login = parseTime(office_in);
  const start = parseTime(OFFICE_START);
  const grace = parseTime(LATE_GRACE_LIMIT);
  if (!login || !start || !grace) return { isLate: false, isWithinGrace: false, isBeyondGrace: false };
  if (login <= start) return { isLate: false, isWithinGrace: false, isBeyondGrace: false };
  if (login <= grace) return { isLate: true, isWithinGrace: true, isBeyondGrace: false };
  return { isLate: true, isWithinGrace: false, isBeyondGrace: true };
}
function qualifiesHalfDayPresentBySlot(log) {
  const { office_in, office_out } = log || {};
  if (!office_in || !office_out) return false;
  const inT = parseTime(office_in);
  const outT = parseTime(office_out);
  if (!inT || !outT || outT <= inT) return false;
  const slotAStart = parseTime(HALF_SLOT_A_START);
  const slotAEnd = parseTime(HALF_SLOT_A_END);
  const slotBStart = parseTime(HALF_SLOT_B_START);
  const slotBEnd = parseTime(HALF_SLOT_B_END);
  const coversSlotA = inT <= slotAStart && outT >= slotAEnd;
  const coversSlotB = inT <= slotBStart && outT >= slotBEnd;
  const netMillis = calculateNetWorkMillis(log);
  const netHours = millisToDecimalHours(netMillis);
  if (netHours < 4) return false;
  return coversSlotA || coversSlotB;
}
// eslint-disable-next-line no-unused-vars
function detectMisuseAfterLogin(log) {
  const { office_in, break_out, break_in, lunch_out, lunch_in } = log || {};
  if (!office_in) return false;
  const login = parseTime(office_in);
  const graceEnd = new Date(login.getTime() + MISUSE_GRACE_MIN * 60000);
  const candidates = [];
  if (break_out && break_in) candidates.push({ out: parseTime(break_out), in: parseTime(break_in) });
  if (lunch_out && lunch_in) candidates.push({ out: parseTime(lunch_out), in: parseTime(lunch_in) });
  for (const seg of candidates) {
    if (!seg.out || !seg.in || seg.in <= seg.out) continue;
    if (seg.out >= login && seg.out <= graceEnd) {
      const durMin = (seg.in.getTime() - seg.out.getTime()) / 60000;
      if (durMin > MISUSE_GRACE_MIN) return true;
    }
  }
  return false;
}
// --- Monthly late login counting ---
function buildMonthlyLateStats(logsByDate, daysInMonth) {
  let permittedLateCount = 0;
  let exceededDates = [];
  for (const { iso } of daysInMonth) {
    const log = logsByDate.get(iso);
    if (log) {
      const lateInfo = evaluateLateLogin(log);
      if (lateInfo.isLate && lateInfo.isWithinGrace) {
        permittedLateCount++;
        if (permittedLateCount > MAX_PERMITTED_LATES_PER_MONTH) {
          exceededDates.push(iso);
        }
      }
    }
  }
  return {
    permittedLateCount,
    exceededDates,
    maxPermitted: MAX_PERMITTED_LATES_PER_MONTH,
    remaining: Math.max(0, MAX_PERMITTED_LATES_PER_MONTH - permittedLateCount),
  };
}
// --- Updated Classification logic with new policies ---
function classifyDayPolicy({ isoDate, weekday, log, holidaysMap, monthlyLateStats, leaveStatus }) {
  // Sunday holiday
  if (weekday === 0) {
    return { bucket: 'holiday', reason: 'Sunday (Holiday)', netHHMM: '00:00', netHours: 0, flags: [] };
  }
  // Paid holiday from calendar
  if (holidaysMap.has(isoDate)) {
    const holiday = holidaysMap.get(isoDate);
    return {
      bucket: 'holiday',
      reason: `Paid Holiday: ${holiday.name}`,
      netHHMM: '00:00',
      netHours: 0,
      flags: ['paid_holiday'],
    };
  }
  // Grace absent logic for unapproved leave
  if (leaveStatus && (leaveStatus === 'Pending' || leaveStatus === 'Rejected')) {
    // If no attendance log or office_in/out missing → treat as absent with grace
    if (!log || !log.office_in || !log.office_out) {
      return {
        bucket: 'absent',
        reason: `Leave ${leaveStatus.toLowerCase()} - treated as absent with grace`,
        netHHMM: '00:00',
        netHours: 0,
        flags: ['grace_absent', `leave_${leaveStatus.toLowerCase()}`],
      };
    }
    // Optionally, handle partial day grace if partial attendance (extend this logic as needed)
  }
  // Paid leave fully approved
  if (log && log.leave_type && log.leave_type.toLowerCase().includes('earned')) {
    return {
      bucket: 'paidleave',
      reason: `Paid Leave: ${log.leave_type}`,
      netHHMM: '00:00',
      netHours: 0,
      flags: ['paid_leave'],
    };
  }
  // Other unpaid leave types treated as absent
  if (log && log.leave_type && !log.leave_type.toLowerCase().includes('earned')) {
    return {
      bucket: 'absent',
      reason: `${log.leave_type} (unpaid)`,
      netHHMM: '00:00',
      netHours: 0,
      flags: ['unpaid_leave'],
    };
  }
  // Process attendance and normal classification logic as before
  const netMillis = calculateNetWorkMillis(log || {});
  const netHours = millisToDecimalHours(netMillis);
  const netHHMM = fmtHrsMinFromMillis(netMillis);
  const lateInfo = evaluateLateLogin(log);
  const isExceededLate = monthlyLateStats.exceededDates && monthlyLateStats.exceededDates.includes(isoDate);
  if (!log || !log.office_in || !log.office_out) {
    return { bucket: 'absent', reason: 'No attendance log', netHHMM: '00:00', netHours: 0, flags: [] };
  }
  // --- New logout time check ---
  const logoutTime = parseTime(log.office_out);
  const logoutCutoff = parseTime(LOGOUT_CUTOFF);
  const logoutBeforeCutoff = logoutTime && logoutTime < logoutCutoff;


  // Logic when late logins exceed limit or login beyond 10:15
  if ((lateInfo.isLate && lateInfo.isWithinGrace && isExceededLate) || (lateInfo.isLate && lateInfo.isBeyondGrace)) {
    // If worked hours >= 8, classify half day, else full day (reversed)
    if (netHours >= 8) {
      // But modulate if logout before 19:00 → half day overrides
      if (logoutBeforeCutoff) {
        return {
          bucket: 'halfday',
          reason: 'Exceeded late logins or late beyond grace + logout before 19:00 (half day applied)',
          netHHMM,
          netHours,
          flags: ['halfday_late_exceeded_logout_early'],
        };
      }
      return {
        bucket: 'halfday',
        reason: 'Exceeded permitted late logins or late beyond grace (Half Day Applied)',
        netHHMM,
        netHours,
        flags: ['late_exceeded_or_beyond_grace'],
      };
    } else {
      // Worked less than 8 hours
      if (logoutBeforeCutoff) {
        return {
          bucket: 'absent',
          reason: 'Exceeded lates or late beyond grace + worked <8h + logout before 19:00 (Absent)',
          netHHMM,
          netHours,
          flags: ['absent_late_logout_early'],
        };
      }
      return {
        bucket: 'fullday',
        reason: 'Exceeded permitted late logins or late beyond grace (Full Day Applied due to <8h worked)',
        netHHMM,
        netHours,
        flags: ['late_exceeded_or_beyond_grace_full_day'],
      };
    }
  }


  // If logout before 19:00 but not late user exceeding limits
  if (logoutBeforeCutoff) {
    if (netHours >= 8) {
      return {
        bucket: 'halfday',
        reason: 'Logout before 19:00 with >=8 hours worked (Half Day Applied)',
        netHHMM,
        netHours,
        flags: ['halfday_logout_early'],
      };
    } else {
      return {
        bucket: 'absent',
        reason: 'Logout before 19:00 with <8 hours worked (Absent Applied)',
        netHHMM,
        netHours,
        flags: ['absent_logout_early'],
      };
    }
  }


   // New logic for login after 10:15 AM:
  if (lateInfo.isLate && lateInfo.isBeyondGrace) {
    if (netHours >= 8) {
      return {
        bucket: 'halfday',
        reason: 'Login after 10:15 AM, worked >= 8 hours (Half Day)',
        netHHMM,
        netHours,
        flags: ['late_beyond_1015_halfday'],
      };
    } else {
      return {
        bucket: 'absent',
        reason: 'Login after 10:15 AM, worked less than 8 hours (Absent)',
        netHHMM,
        netHours,
        flags: ['late_beyond_1015_absent'],
      };
    }
  }



  if (netHours < 4) {
    return { bucket: 'absent', reason: 'Worked less than 4 hours', netHHMM, netHours, flags: ['lt4h'] };
  }


  if (netHours < 8) {
    if (qualifiesHalfDayPresentBySlot(log)) {
      return { bucket: 'halfday', reason: 'Half-Day Present slot satisfied', netHHMM, netHours, flags: ['half_day_slot_present'] };
    }
    return { bucket: 'halfday', reason: 'Worked 4–8 hours', netHHMM, netHours, flags: ['ge4_lt8_no_slot'] };
  }


  return {
    bucket: 'fullday',
    reason: 'Full Day Present',
    netHHMM,
    netHours,
    flags: [],
  };
}
// --- Get cell style for compact table ---
function getHoursCellStyle(bucket) {
  return dayStyles[bucket] || {};
}
function lunchInStatus(lunchInTime) {
  if (!lunchInTime) return { status: 'NA', text: 'No Lunch In' };
  const lunchIn = parseTime(lunchInTime);
  const limit = parseTime(LUNCH_IN_LIMIT);
  if (!lunchIn || !limit) return { status: 'NA', text: 'Invalid or missing data' };
  if (lunchIn <= limit) return { status: 'ONTIME', text: 'Lunch In is on time' };
  else return { status: 'LATE', text: `Lunch In is late (after ${LUNCH_IN_LIMIT})` };
}
function isActionAllowed(action, todayLog) {
  if (todayLog && todayLog.office_out) return false;
  if (action === 'office_in') {
    return !(todayLog && todayLog.office_in);
  }
  if (action === 'office_out') {
    return todayLog && todayLog.office_in && !todayLog.office_out;
  }
  if (action === 'break_in') {
    return todayLog.office_in && !todayLog.break_in && !todayLog.break_out;
  }
  if (action === 'break_out') {
    return todayLog.office_in && todayLog.break_in && !todayLog.break_out;
  }
  if (action === 'break_in_2') {
    return todayLog.office_in && todayLog.break_out && !todayLog.break_in_2 && !todayLog.break_out_2;
  }
  if (action === 'break_out_2') {
    return todayLog.office_in && todayLog.break_in_2 && !todayLog.break_out_2;
  }
  if (action === 'lunch_in') {
    return todayLog.office_in && !todayLog.lunch_in;
  }
  if (action === 'lunch_out') {
    return todayLog.office_in && todayLog.lunch_in && !todayLog.lunch_out;
  }
  return false;
}
// --- Attendance Dashboard Component ---
function AttendanceDashboard() {
  const [logs, setLogs] = useState([]);
  const [holidays, setHolidays] = useState(new Map());
  const [message, setMessage] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => currentYearMonth());
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  useEffect(() => {
    fetchAttendance();
    fetchHolidays();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);


  useEffect(() => {
    applyDateFilter();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, fromDate, toDate]);
  function fetchAttendance() {
    if (!selectedMonth) return;
    axios.get(`http://localhost:5000/my-attendance?month=${selectedMonth}`, { withCredentials: true })
      .then(res => {
        setLogs(Array.isArray(res.data) ? res.data : []);
        setMessage('');
      })
      .catch(() => setMessage('❌ Failed to fetch attendance logs'));
  }
  function fetchHolidays() {
    if (!selectedMonth) return;
    axios.get(`http://localhost:5000/holidays?month=${selectedMonth}`, { withCredentials: true })
      .then(res => {
        const map = new Map();
        res.data.forEach(h => {
          if (h.date && h.name) {
            map.set(h.date, { name: h.name, isPaid: h.is_paid });
          }
        });
        setHolidays(map);
      })
      .catch(() => setMessage('❌ Failed to fetch holidays'));
  }
  const logsByDate = useMemo(() => {
    const map = new Map();
    for (const l of logs) if (l && l.date) map.set(l.date, l);
    return map;
  }, [logs]);
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = useMemo(() => getMonthDays(year, month - 1), [year, month]);
  // Monthly late login stats (new logic)
  const monthlyLateStats = useMemo(() => buildMonthlyLateStats(logsByDate, daysInMonth), [logsByDate, daysInMonth]);
  function applyDateFilter() {
    if (!fromDate && !toDate) {
      setFilteredLogs(logs);
      return;
    }
    let filtered = logs;
    if (fromDate) filtered = filtered.filter(log => dateStrGTE(log.date, fromDate));
    if (toDate) filtered = filtered.filter(log => dateStrLTE(log.date, toDate));
    setFilteredLogs(filtered);
  }
  const dayClassifications = useMemo(() => {
    const result = new Map();
    for (const { date, iso } of daysInMonth) {
      const weekday = date.getDay();
      const log = logsByDate.get(iso);
      const classification = classifyDayPolicy({
        isoDate: iso,
        weekday,
        log,
        holidaysMap: holidays,
        monthlyLateStats,
      });
      result.set(iso, classification);
    }
    return result;
  }, [daysInMonth, logsByDate, holidays, monthlyLateStats]);
const summary = useMemo(() => {
  const totalDays = daysInMonth.length;
  let sundays = 0;
  let fullDays = 0;
  let halfDays = 0;
  let paidLeaves = 0;
  let graceAbsents = 0;
  for (const { date, iso } of daysInMonth) {
    const weekday = date.getDay();
    if (weekday === 0) {
      sundays++;
      fullDays++;
      continue;
    }
    const cls = dayClassifications.get(iso);
    if (!cls) continue;
    if (cls.flags.includes('grace_absent')) {
      graceAbsents++;
      continue; // Don't count as paid leave or anything else
    }
    if (cls.bucket === 'paidleave' || (holidays.get(iso)?.isPaid)) {
      paidLeaves++;
      continue;
    }
    switch (cls.bucket) {
      case 'fullday':
        fullDays++;
        break;
      case 'halfday':
        halfDays++;
        break;
      case 'absent':
        break;
      default:
        break;
    }
  }
  // Grace absent penalty: count every grace absent as 2 absent days (i.e. subtract 2 days)
  // So deduct graceAbsents count from total working days
  // If you want halfday grace to count double, adapt here accordingly
  const gracePenaltyDays = graceAbsents * 1; // Number of extra absent days added (adjust multiplier)
  const totalWorkingDays = fullDays + halfDays / 2 + paidLeaves - gracePenaltyDays;
  return {
    totalDays,
    sundays,
    fullDays,
    halfDays,
    paidLeaves,
    graceAbsents,
    totalWorkingDays,
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [daysInMonth, dayClassifications, holidays, selectedMonth]);
async function saveAttendanceSummary(summary, selectedMonth) {
    try {
      await axios.post('http://localhost:5000/save-attendance-summary', {
        month: selectedMonth,
        summary
      }, { withCredentials: true });
    } catch (error) {
      console.error("Failed to save attendance summary:", error);
    }
  }
  // useEffect hook to trigger saving when summary or month changes
  useEffect(() => {
    if (summary && selectedMonth) {
      saveAttendanceSummary(summary, selectedMonth);
    }
  }, [summary, selectedMonth]);
  function getTodayLog() {
    const todayStr = new Date().toISOString().slice(0, 10);
    return logsByDate.get(todayStr) || {};
  }
  async function sendAction(actionParam) {
    const todayLog = getTodayLog();
    if (!isActionAllowed(actionParam, todayLog)) {
      setMessage('⛔ Action not permitted at current state.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/attendance', new URLSearchParams({ action: actionParam }), { withCredentials: true });
      setMessage('✅ ' + res.data.message);
      fetchAttendance();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Something went wrong'));
    }
  }
const filteredRows = useMemo(() => {
  // Sort logs by ascending date (oldest first)
  const sorted = [...(filteredLogs || [])].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map(log => {
      const netMillis = calculateNetWorkMillis(log);
      const netHrs = millisToDecimalHours(netMillis);
      const netWorkedHrsMin = fmtHrsMinFromMillis(netMillis);

      function fmtCell(timeStr) {
        if (!timeStr) return '-';
        const ms = parseTime(timeStr).getTime() - parseTime('00:00:00').getTime();
        return fmtHrsMinFromMillis(ms);
      }
      const iso = log.date;
      const cls = dayClassifications.get(iso);
      const remarks = cls?.reason || '';

      return {
        ...log,
        netMillis,
        netHrs,
        netWorkedHrsMin,
        office_in_disp: fmtCell(log.office_in),
        break_out_disp: fmtCell(log.break_out),
        break_in_disp: fmtCell(log.break_in),
        break_out_2_disp: fmtCell(log.break_out_2),
        break_in_2_disp: fmtCell(log.break_in_2),
        lunch_out_disp: fmtCell(log.lunch_out),
        lunch_in_disp: fmtCell(log.lunch_in),
        office_out_disp: fmtCell(log.office_out),
        remarks,
      };
    });
  }, [filteredLogs, dayClassifications]);
  function handleLunchInClick(lunchInTime) {
    const status = lunchInStatus(lunchInTime);
    alert(status.text);
  }
  function buildTooltip(iso) {
    const log = logsByDate.get(iso);
    const cls = dayClassifications.get(iso);
    let tooltip = `${iso}\n`;
    const weekday = getWeekdayFromISO(iso);
    if (weekday === 0) {
      tooltip += 'Holiday (Sunday)';
      return tooltip;
    }
    if (!log) {
      tooltip += 'Absent';
      return tooltip;
    }
    tooltip += `Worked: ${cls?.netHHMM || '00:00'}\n`;
    tooltip += `Login: ${log.office_in || '-'}\n`;
    tooltip += `Logout: ${log.office_out || '-'}\n`;
    if (log.break_out || log.break_in) tooltip += `Break 1: ${log.break_out || '-'} → ${log.break_in || '-'}\n`;
    if (log.break_out_2 || log.break_in_2) tooltip += `Break 2: ${log.break_out_2 || '-'} → ${log.break_in_2 || '-'}\n`;
    if (log.lunch_out || log.lunch_in) tooltip += `Lunch: ${log.lunch_out || '-'} → ${log.lunch_in || '-'}\n`;
    return tooltip.trimEnd();
  }
  return (
    <div style={styles.page}>
      <h2>📅 Attendance Calendar</h2>
      <div style={{
        marginBottom: 15,
        fontWeight: '600',
        fontSize: 18,
        display: 'flex',
        gap: 30,
        flexWrap: 'wrap',
        backgroundColor: '#f0f4f8',
        padding: 12,
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
      }}>
        <div><strong>Total days:</strong> {summary.totalDays}</div>
        <div><strong>Sundays:</strong> {summary.sundays}</div>
        <div><strong>Full days:</strong> {summary.fullDays}</div>
        <div><strong>Half days:</strong> {summary.halfDays}</div>
        <div><strong>Paid leaves/holidays:</strong> {summary.paidLeaves}</div>
        <div>
          <strong>Work days (full + 0.5 half + paid):</strong> {summary.totalWorkingDays.toFixed(1)}
        </div>
        <div>
          <strong>Average per day:</strong> {(summary.totalWorkingDays / summary.totalDays).toFixed(2)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
        <div style={styles.premiumButtonGrid}>
          {['office_in', 'office_out'].map(action => (
            <button
              key={action}
              style={{
                ...styles.premiumButton,
                opacity: isActionAllowed(action, getTodayLog()) ? 1 : 0.5,
                cursor: isActionAllowed(action, getTodayLog()) ? 'pointer' : 'not-allowed',
              }}
              onClick={() => sendAction(action)}
              disabled={!isActionAllowed(action, getTodayLog())}
              title={action.replace('_', ' ').toUpperCase()}
            >
              {action.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
        <div
          style={{
            backgroundColor: '#fff',
            padding: '8px 12px',
            borderRadius: 8,
            boxShadow: '0 0 8px rgba(0,0,0,0.1)',
            fontWeight: 600,
          }}
          title="Permitted late logins within grace (10:15) for the selected month"
        >
          ⏰ Late used: {monthlyLateStats.permittedLateCount} / {monthlyLateStats.maxPermitted} (Remaining {monthlyLateStats.remaining})
        </div>
      </div>
      <div style={styles.filterRow}>
        <label htmlFor="select-month">Select Month: </label>
        <input
          id="select-month"
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={{ minWidth: 140 }}
        />
      </div>
      <div style={styles.calendarGrid}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
          <div key={dayName} style={{ ...styles.dayCell, fontWeight: 'bold', textAlign: 'center' }}>{dayName}</div>
        ))}
        {Array(daysInMonth[0].date.getDay()).fill(null).map((_, i) => (
          <div key={'blank-' + i} style={styles.dayCell} />
        ))}
        {daysInMonth.map(day => {
          const iso = day.iso;
          const cls = dayClassifications.get(iso);
          const style = getHoursCellStyle(cls?.bucket);
          const tooltip = buildTooltip(iso);
          return (
            <div key={iso} title={tooltip} style={{ ...styles.dayCell, ...style, cursor: 'default' }}>
              {day.date.getDate()}
            </div>
          );
        })}
      </div>
      <div style={styles.legend}>
        <div>
          <span style={{ ...styles.legendColor, backgroundColor: '#90caf9' }} /> Sunday &amp; Paid Holiday
        </div>
        <div>
          <span style={{ ...styles.legendColor, backgroundColor: '#b9f6ca' }} /> Full Day Present
        </div>
        <div>
          <span style={{ ...styles.legendColor, backgroundColor: '#ffe082' }} /> Half Day Present
        </div>
        <div>
          <span style={{ ...styles.legendColor, backgroundColor: '#ffcdd2' }} /> Absent / No Log / &lt;4h Worked
        </div>
        <div>
          <span style={{ ...styles.legendColor, backgroundColor: '#ce93d8' }} /> Paid Leave
        </div>
      </div>
      <h3 style={{ marginTop: 30 }}>🗂️ Attendance History</h3>
      <div style={{
        ...styles.filterRow, gap: 15,
        background: '#f5fafd',
        borderRadius: 8,
        marginBottom: 30,
        padding: 18,
        boxShadow: '0 1px 8px rgba(0,16,40,0.09)'
      }}>
        <div>
          <label style={styles.filterLabel}>From:</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={styles.dateInput} />
        </div>
        <div>
          <label style={styles.filterLabel}>To:</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={styles.dateInput} />
        </div>
        <button style={styles.button} onClick={applyDateFilter}>Filter</button>
        <button
          style={{ ...styles.button, background: '#b0bec5', color: '#fff' }}
          onClick={() => {
            setFromDate('');
            setToDate('');
            setFilteredLogs(logs.slice(-5));
          }}
        >
          Reset
        </button>
      </div>
      {filteredRows.length > 0 ? (
        <div   style={{
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: 5 * 31, // Height for 5 rows, adjust 38px if your row is taller or shorter
        borderRadius: 14,
        boxShadow: '0 3px 16px 0 rgba(80,100,130,0.07)',
        background: '#fff'
      }}>
          <table style={styles.attendanceTable}>
            <thead>
              <tr>
                <th style={{ width: 56 }}>Date</th>
                <th style={{ width: 48 }}>Login</th>
                <th style={{ width: 52 }}>B.Out</th>
                <th style={{ width: 52 }}>B.In</th>
                <th style={{ width: 54 }}>L.Out</th>
                <th style={{ width: 54 }}>L.In</th>
                <th style={{ width: 54 }}>B2.Out</th>
                <th style={{ width: 54 }}>B2.In</th>
                <th style={{ width: 52 }}>Logout</th>
                <th style={{ width: 62 }}>Net</th>
                <th style={{ width: 180, textAlign: 'left' }}>Remarks</th> {/* New Remarks column */}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((log, index) => {
                const netHrs = log.netHrs;
                let rowBucket = 'absent';
                if (netHrs >= 8) rowBucket = 'fullday';
                else if (netHrs >= 4) rowBucket = 'halfday';
                else if (log.office_in && log.office_out && netHrs < 4) rowBucket = 'absent';
                return (
                  <tr
                    key={log.date || index}
                    style={{
                      background: index % 2 ? '#f7fbff' : '#fff',


                      transition: 'background 0.18s',
                      verticalAlign: 'middle'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#e3f2fd'}
                    onMouseOut={e => e.currentTarget.style.background = index % 2 ? '#f7fbff' : '#fff'}
                  >
                    <td style={styles.cellDate}>{log.date}</td>
                    <td style={styles.cellMono}>{log.office_in_disp}</td>
                    <td style={styles.cellMono}>{log.break_out_disp}</td>
                    <td style={styles.cellMono}>{log.break_in_disp}</td>
                    <td style={styles.cellMono}>{log.lunch_out_disp}</td>
                    <td
                      style={{
                        ...styles.cellMono,
                        cursor: log.lunch_in ? "pointer" : "not-allowed",
                        color: log.lunch_in ? "#0d47a1" : "#818281",
                        textDecoration: log.lunch_in ? "underline" : "none",
                        fontWeight: log.lunch_in ? 600 : 400,
                        background: "none"
                      }}
                      onClick={() => { if (log.lunch_in) handleLunchInClick(log.lunch_in); }}
                      title={log.lunch_in ? "Click to check lunch in status" : ""}
                    >
                      {log.lunch_in_disp}
                    </td>
                    <td style={styles.cellMono}>{log.break_out_2_disp}</td>
                    <td style={styles.cellMono}>{log.break_in_2_disp}</td>
                    <td style={styles.cellMono}>{log.office_out_disp}</td>
                    <td>
                      <span style={{
                        ...styles.workedPill,
                        background: rowBucket === 'fullday'
                          ? '#b9f6ca'
                          : rowBucket === 'halfday'
                            ? '#ffe082'
                            : '#ffcdd2',
                        color: '#222',
                      }}>
                        {log.netWorkedHrsMin}
                      </span>
                    </td>
                    <td title={log.remarks} style={{ fontSize: 11, fontStyle: 'italic', paddingLeft: 8, userSelect: 'text' }}>
                      {log.remarks}
                    </td> {/* Remarks content */}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: 'center', marginTop: 10, color: '#888', fontStyle: 'italic', fontWeight: 500 }}>No attendance logs found.</p>
      )}
      <div style={styles.buttonGrid}>
        {['break_out', 'break_in', 'break_out_2', 'break_in_2', 'lunch_in', 'lunch_out'].map(action => (
          <button
            key={action}
            onClick={() => sendAction(action)}
            disabled={!isActionAllowed(action, getTodayLog())}
            style={{
              ...styles.button,
              opacity: isActionAllowed(action, getTodayLog()) ? 1 : 0.47,
              cursor: isActionAllowed(action, getTodayLog()) ? 'pointer' : 'not-allowed',
              marginBottom: 4
            }}
          >
            {action.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>
      <p style={styles.message}>{message}</p>
    </div>
  );
}


// --- COLOR STYLES for buckets ---
const dayStyles = {
  holiday:     { backgroundColor: '#90caf9', color: 'black' },    // Sundays and holidays - Blue
  fullday:     { backgroundColor: '#b9f6ca', color: 'black' },    // Full day present - Light Green
  halfday:     { backgroundColor: '#ffe082', color: 'black' },    // Half day - Light Orange
  paidleave:   { backgroundColor: '#ce93d8', color: 'black' },    // Paid Leave - Purple
  grace_absent: { backgroundColor: '#fa3a00ff', color: '#000' }, // Grace absent
  absent:      { backgroundColor: '#ffcdd2', color: 'black' },    // Absent / <4h / No Log - Light Red
};


const styles = {
  page: {
    padding: 20,
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh',
  },
  filterRow: {
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap'
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    boxShadow: '0 0 8px rgba(0,0,0,0.1)',
  },
  dayCell: {
    padding: 8,
    minHeight: 40,
    borderRadius: 6,
    userSelect: 'none',
    fontWeight: 600,
    textAlign: 'center',
  },
  legend: {
    marginTop: 15,
    display: 'flex',
    gap: 15,
    flexWrap: 'wrap',
    fontSize: 14
  },
  legendColor: {
    display: 'inline-block',
    width: 18,
    height: 18,
    marginRight: 6,
    borderRadius: 4,
    verticalAlign: 'middle'
  },
  premiumButtonGrid: {
    display: 'flex',
    gap: 15,
    marginBottom: 20
  },
  premiumButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    padding: '14px 26px',
    borderRadius: 30,
    cursor: 'pointer',
    boxShadow: '0 8px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
    minWidth: 140,
    textTransform: 'uppercase',
    fontSize: '1rem',
  },
  filterLabel: {
    fontWeight: 600,
    color: '#127bbb',
    fontSize: 15,
    marginRight: 3,
  },
  dateInput: {
    padding: '7px 13px',
    border: '1px solid #d0ecfc',
    borderRadius: 5,
    background: '#fcfeff',
    fontSize: 15,
    fontWeight: 500,
    color: '#263047'
  },
  buttonGrid: {
    marginTop: 20,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10
  },
  button: {
    backgroundColor: '#3498db',
    border: 'none',
    color: 'white',
    fontWeight: 600,
    padding: '10px 20px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background-color 0.25s ease',
  },
  attendanceTable: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    fontSize: 12,
    minWidth: 580,
    maxWidth: 1000,
    background: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    margin: 0,
    boxShadow: "0 1px 7px #e3eef8",
    tableLayout: 'fixed'
  },
  cellDate: {
    fontWeight: 600,
    color: '#134685',
    background: 'none',
    textAlign: 'left',
    padding: '4px 4px',
    whiteSpace: 'nowrap',
    maxWidth: 70,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: 12
  },
  cellMono: {
    fontFamily: 'Menlo, Monaco, monospace',
    fontSize: 12,
    textAlign: 'center',
    padding: '3px',
    background: 'none',
    maxWidth: 52,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  workedPill: {
    display: 'inline-block',
    borderRadius: 8,
    fontWeight: 700,
    padding: '2px 7px',
    fontSize: 11,
    boxShadow: '0 0.5px 2px #ececec',
    background: '#eee',
    textAlign: 'center',
    minWidth: 35
  },
};


export default AttendanceDashboard;
