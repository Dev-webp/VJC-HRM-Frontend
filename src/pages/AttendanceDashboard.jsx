import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// Base API URL logic
const baseUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:5000' // Your local backend URL
  : 'https://backend.vjcoverseas.com'; // Production backend URL

// --- Utility functions ---
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

function toIndianTime(isoTimeStr) {
  if (!isoTimeStr) return '-';
  try {
    const [h, m, s] = isoTimeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10), parseInt(s, 10));
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  } catch (e) {
    console.error('Failed to convert time:', isoTimeStr, e);
    return isoTimeStr;
  }
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
  return `${h}h ${m}m`;
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

function getMonthDays(year, monthIndex0) {
  const res = [];
  const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(Date.UTC(year, monthIndex0, d));
    res.push({ date, iso: date.toISOString().slice(0, 10) });
  }
  return res;
}

// --- Policy constants ---
const OFFICE_START = '10:00:00';
const LATE_GRACE_LIMIT = '10:15:00';
const MAX_PERMITTED_LATES_PER_MONTH = 6;
const HALF_SLOT_A_START = '10:00:00';
const HALF_SLOT_A_END = '14:30:00';
const HALF_SLOT_B_START = '14:30:00';
const HALF_SLOT_B_END = '19:00:00';
const LUNCH_IN_LIMIT = '14:00:00';
const LOGOUT_CUTOFF = '19:00:00';

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
  if (weekday === 0) {
    return { bucket: 'holiday', reason: 'Sunday (Holiday)', netHHMM: '00:00', netHours: 0, flags: [] };
  }
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
  if (leaveStatus && (leaveStatus === 'Pending' || leaveStatus === 'Rejected')) {
    if (!log || !log.office_in || !log.office_out) {
      return {
        bucket: 'absent',
        reason: `Leave ${leaveStatus.toLowerCase()} - treated as absent with grace`,
        netHHMM: '00:00',
        netHours: 0,
        flags: ['grace_absent', `leave_${leaveStatus.toLowerCase()}`],
      };
    }
  }
  if (log && log.leave_type && log.leave_type.toLowerCase().includes('earned')) {
    return {
      bucket: 'paidleave',
      reason: `Paid Leave: ${log.leave_type}`,
      netHHMM: '00:00',
      netHours: 0,
      flags: ['paid_leave'],
    };
  }
  if (log && log.leave_type && !log.leave_type.toLowerCase().includes('earned')) {
    return {
      bucket: 'absent',
      reason: `${log.leave_type} (unpaid)`,
      netHHMM: '00:00',
      netHours: 0,
      flags: ['unpaid_leave'],
    };
  }
  const netMillis = calculateNetWorkMillis(log || {});
  const netHours = millisToDecimalHours(netMillis);
  const netHHMM = fmtHrsMinFromMillis(netMillis);
  const lateInfo = evaluateLateLogin(log);
  const isExceededLate = monthlyLateStats.exceededDates && monthlyLateStats.exceededDates.includes(isoDate);
  if (!log || !log.office_in || !log.office_out) {
    return { bucket: 'absent', reason: 'No attendance log', netHHMM: '00:00', netHours: 0, flags: [] };
  }
  const logoutTime = parseTime(log.office_out);
  const logoutCutoff = parseTime(LOGOUT_CUTOFF);
  const logoutBeforeCutoff = logoutTime && logoutTime < logoutCutoff;

  if ((lateInfo.isLate && lateInfo.isWithinGrace && isExceededLate) || (lateInfo.isLate && lateInfo.isBeyondGrace)) {
    if (netHours >= 8) {
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

  if (logoutBeforeCutoff) {
    if (netHours >= 4 && netHours < 8) {
      return {
        bucket: 'halfday',
        reason: 'Worked between 4 and 8 hours with timely login/logout - Half Day',
        netHHMM,
        netHours,
        flags: ['halfday_worked_4_to_8'],
      };
    } else if (netHours < 4) {
      return {
        bucket: 'absent',
        reason: 'Worked less than 4 hours - Absent',
        netHHMM,
        netHours,
        flags: ['absent_lt_4_hours'],
      };
    }
  }

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
const dayStyles = {
  fullday: { background: '#b9f6ca' },
  halfday: { background: '#ffe082' },
  absent: { background: '#ffcdd2' },
  holiday: { background: '#90caf9' },
  paidleave: { background: '#ce93d8' }
};

function getHoursCellStyle(bucket) {
  return dayStyles[bucket] || {};
}

function lunchInStatus(lunchInTime) {
  if (!lunchInTime) return { status: 'NA', text: 'No Lunch In' };
  const lunchIn = parseTime(lunchInTime);
  const limit = parseTime(LUNCH_IN_LIMIT);
  if (!lunchIn || !limit) return { status: 'NA', text: 'Invalid or missing data' };
  if (lunchIn <= limit) return { status: 'ONTIME', text: 'Lunch In is on time' };
  else return { status: 'LATE', text: `Lunch In is late (after ${toIndianTime(LUNCH_IN_LIMIT)})` };
}

function isActionAllowed(action, todayLog) {
  if (todayLog && todayLog.office_out) return false;
  if (action === 'office_in') {
    return !(todayLog && todayLog.office_in);
  }
  if (action === 'office_out') {
    return todayLog && todayLog.office_in && !todayLog.office_out;
  }
  // Corrected logic for break/lunch buttons
  if (action === 'break_in') {
    return todayLog && todayLog.office_in && !todayLog.break_out && !todayLog.break_in;
  }
  if (action === 'break_out') {
    return todayLog && todayLog.office_in && todayLog.break_in && !todayLog.break_out;
  }
  if (action === 'break_in_2') {
    return todayLog && todayLog.office_in && todayLog.break_out && !todayLog.break_in_2 && !todayLog.break_out_2;
  }
  if (action === 'break_out_2') {
    return todayLog && todayLog.office_in && todayLog.break_in_2 && !todayLog.break_out_2;
  }
  if (action === 'lunch_in') {
    return todayLog && todayLog.office_in && !todayLog.lunch_out && !todayLog.lunch_in;
  }
  if (action === 'lunch_out') {
    return todayLog && todayLog.office_in && todayLog.lunch_in && !todayLog.lunch_out;
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
    axios.get(`${baseUrl}/my-attendance?month=${selectedMonth}`, { withCredentials: true })
      .then(res => {
        setLogs(Array.isArray(res.data) ? res.data : []);
        setMessage('');
      })
      .catch(() => setMessage('❌ Failed to fetch attendance logs'));
  }

  function fetchHolidays() {
    if (!selectedMonth) return;
    axios.get(`${baseUrl}/holidays?month=${selectedMonth}`, { withCredentials: true })
      .then(res => {
        const map = new Map();
        res.data.forEach(h => {
          if (h.date && h.name) {
            map.set(h.date, { name: h.name, isPaid: h.is_paid });
          }
        });
        setHolidays(map);
        setMessage('');
      })
      .catch(error => {
        console.error('Failed to fetch holidays:', error.response || error.message || error);
        setMessage('❌ Failed to fetch holidays (see console)');
      });
  }

  const logsByDate = useMemo(() => {
    const map = new Map();
    for (const l of logs) if (l && l.date) map.set(l.date, l);
    return map;
  }, [logs]);

  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = useMemo(() => getMonthDays(year, month - 1), [year, month]);

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
    let fullDays = 0;
    let halfDays = 0;
    let paidLeaves = 0;
    let absentDays = 0;
    let sundaysAndHolidays = 0;

    for (const { iso } of daysInMonth) {
      const classification = dayClassifications.get(iso);
      if (!classification) {
        absentDays++;
        continue;
      }
      switch (classification.bucket) {
        case 'fullday':
          fullDays++;
          break;
        case 'halfday':
          halfDays++;
          break;
        case 'paidleave':
          paidLeaves++;
          break;
        case 'holiday':
          sundaysAndHolidays++;
          break;
        case 'absent':
          absentDays++;
          break;
        default:
          absentDays++;
          break;
      }
    }
    const totalWorkingDays = fullDays + halfDays / 2 + paidLeaves;
    const totalDays = daysInMonth.length;
    const average = totalDays > sundaysAndHolidays ? (totalWorkingDays / (totalDays - sundaysAndHolidays)).toFixed(2) : 0;
    const sundays = daysInMonth.filter(d => d.date.getDay() === 0).length;
    const paidHolidays = [...holidays.values()].filter(h => h.isPaid).length;

    return {
      totalDays,
      sundays,
      fullDays,
      halfDays,
      paidLeaves,
      absentDays,
      totalWorkingDays,
      average,
      paidHolidays,
    };
  }, [daysInMonth, dayClassifications, holidays]);

  async function saveAttendanceSummary(summary, selectedMonth) {
    try {
      await axios.post(`${baseUrl}/save-attendance-summary`, {
        month: selectedMonth,
        summary
      }, { withCredentials: true });
    } catch (error) {
      console.error("Failed to save attendance summary:", error);
    }
  }

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
      const res = await axios.post(`${baseUrl}/attendance`, new URLSearchParams({ action: actionParam }), { withCredentials: true });
      setMessage('✅ ' + res.data.message);
      fetchAttendance();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Something went wrong'));
    }
  }

  const filteredRows = useMemo(() => {
    const sorted = [...(filteredLogs || [])].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map(log => {
      const netMillis = calculateNetWorkMillis(log);
      const netHrs = millisToDecimalHours(netMillis);
      const netWorkedHrsMin = fmtHrsMinFromMillis(netMillis);
      const iso = log.date;
      const cls = dayClassifications.get(iso);
      const remarks = cls?.reason || '';

      return {
        ...log,
        netMillis,
        netHrs,
        netWorkedHrsMin,
        office_in_disp: toIndianTime(log.office_in),
        break_out_disp: toIndianTime(log.break_out),
        break_in_disp: toIndianTime(log.break_in),
        break_out_2_disp: toIndianTime(log.break_out_2),
        break_in_2_disp: toIndianTime(log.break_in_2),
        lunch_out_disp: toIndianTime(log.lunch_out),
        lunch_in_disp: toIndianTime(log.lunch_in),
        office_out_disp: toIndianTime(log.office_out),
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
    const weekday = getWeekdayFromISO(iso);
    let tooltip = `Date: ${iso}\n`;

    if (weekday === 0) {
      tooltip += 'Holiday (Sunday)';
      return tooltip;
    }
    if (holidays.has(iso)) {
      tooltip += `Holiday: ${holidays.get(iso).name}\n`;
      return tooltip;
    }
    if (!log) {
      tooltip += 'Absent\nReason: No attendance log';
      return tooltip;
    }
    
    tooltip += `Classification: ${cls?.bucket}\n`;
    tooltip += `Reason: ${cls?.reason}\n`;
    tooltip += `Worked: ${cls?.netHHMM || '00:00'}\n`;
    tooltip += `Login: ${toIndianTime(log.office_in) || '-'}\n`;
    tooltip += `Logout: ${toIndianTime(log.office_out) || '-'}\n`;
    if (log.break_in || log.break_out) tooltip += `Break 1: ${toIndianTime(log.break_in) || '-'} → ${toIndianTime(log.break_out) || '-'}\n`;
    if (log.break_in_2 || log.break_out_2) tooltip += `Break 2: ${toIndianTime(log.break_in_2) || '-'} → ${toIndianTime(log.break_out_2) || '-'}\n`;
    if (log.lunch_in || log.lunch_out) tooltip += `Lunch: ${toIndianTime(log.lunch_in) || '-'} → ${toIndianTime(log.lunch_out) || '-'}\n`;
    return tooltip.trimEnd();
  }

  return (
    <div style={styles.page}>
      <h2 style={styles.header}>📅 Attendance Calendar</h2>
      <div style={styles.summaryContainer}>
        <div style={styles.summaryItem}><strong>Total Days:</strong> {summary.totalDays}</div>
        <div style={styles.summaryItem}><strong>Sundays:</strong> {summary.sundays}</div>
        <div style={styles.summaryItem}><strong>Full Days:</strong> {summary.fullDays}</div>
        <div style={styles.summaryItem}><strong>Half Days:</strong> {summary.halfDays}</div>
        <div style={styles.summaryItem}><strong>Paid Leaves & Holidays:</strong> {summary.paidLeaves + summary.paidHolidays}</div>
        <div style={styles.summaryItem}><strong>Absent Days:</strong> {summary.absentDays}</div>
        <div style={styles.summaryItem}><strong>Work Days (Total):</strong> {summary.totalWorkingDays.toFixed(1)}</div>
        <div style={styles.summaryItem}><strong>Avg. Per Day:</strong> {summary.average}</div>
      </div>
      <div style={styles.actionSection}>
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
            <div style={styles.lateInfoPill}>
          <span role="img" aria-label="clock">⏰</span> <strong>Late Logins:</strong> {monthlyLateStats.permittedLateCount} / {monthlyLateStats.maxPermitted} (Remaining {monthlyLateStats.remaining})
        </div>
        </div>
      
      </div>
      <div style={styles.filterRow}>
        <label htmlFor="select-month" style={styles.filterLabel}>Select Month:</label>
        <input
          id="select-month"
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={styles.monthInput}
        />
      </div>
      <div style={styles.calendarGrid}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
          <div key={dayName} style={styles.weekdayHeader}>{dayName}</div>
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
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, backgroundColor: '#90caf9' }} /> Sunday &amp; Holiday
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, backgroundColor: '#b9f6ca' }} /> Full Day
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, backgroundColor: '#ffe082' }} /> Half Day
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, backgroundColor: '#ffcdd2' }} /> Absent / &lt;4h Worked
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, backgroundColor: '#ce93d8' }} /> Paid Leave
        </div>
      </div>
      <h3 style={styles.historyHeader}>🗂️ Attendance History</h3>
      <div style={styles.historyFilterContainer}>
        <div style={styles.historyFilterGroup}>
          <label style={styles.filterLabel}>From:</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={styles.dateInput} />
        </div>
        <div style={styles.historyFilterGroup}>
          <label style={styles.filterLabel}>To:</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={styles.dateInput} />
        </div>
        <button style={styles.filterButton} onClick={applyDateFilter}>Filter</button>
        <button
          style={{ ...styles.filterButton, backgroundColor: '#b0bec5' }}
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
        <div style={styles.tableContainer}>
          <table style={styles.attendanceTable}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Date</th>
                <th style={styles.tableHeader}>Login</th>
                <th style={styles.tableHeader}>B.In</th>
                <th style={styles.tableHeader}>B.Out</th>
                <th style={styles.tableHeader}>L.In</th>
                <th style={styles.tableHeader}>L.Out</th>
                <th style={styles.tableHeader}>B2.In</th>
                <th style={styles.tableHeader}>B2.Out</th>
                <th style={styles.tableHeader}>Logout</th>
                <th style={styles.tableHeader}>Net</th>
                <th style={{ ...styles.tableHeader, textAlign: 'left' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((log, index) => {
                const cls = dayClassifications.get(log.date);
                return (
                  <tr
                    key={log.date || index}
                    style={{
                      backgroundColor: index % 2 ? '#f7fbff' : '#fff',
                      transition: 'background 0.18s',
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = index % 2 ? '#f7fbff' : '#fff'}
                  >
                    <td style={styles.cellDate}>{log.date}</td>
                    <td style={styles.cellMono}>{log.office_in_disp}</td>
                    <td style={styles.cellMono}>{log.break_in_disp}</td>
                    <td style={styles.cellMono}>{log.break_out_disp}</td>
                    <td
                      style={{
                        ...styles.cellMono,
                        cursor: log.lunch_in ? "pointer" : "not-allowed",
                        color: log.lunch_in ? "#0d47a1" : "#818281",
                        textDecoration: log.lunch_in ? "underline" : "none",
                        fontWeight: log.lunch_in ? 600 : 400,
                        backgroundColor: "none"
                      }}
                      onClick={() => { if (log.lunch_in) handleLunchInClick(log.lunch_in); }}
                      title={log.lunch_in ? "Click to check lunch in status" : ""}
                    >
                      {log.lunch_in_disp}
                    </td>
                    <td style={styles.cellMono}>{log.lunch_out_disp}</td>
                    <td style={styles.cellMono}>{log.break_in_2_disp}</td>
                    <td style={styles.cellMono}>{log.break_out_2_disp}</td>
                    <td style={styles.cellMono}>{log.office_out_disp}</td>
                    <td>
                      <span style={{
                        ...styles.workedPill,
                        background: getHoursCellStyle(cls?.bucket).background,
                      }}>
                        {log.netWorkedHrsMin}
                      </span>
                    </td>
                    <td title={log.remarks} style={styles.remarksCell}>
                      {log.remarks}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={styles.noLogsMessage}>No attendance logs found.</p>
      )}
      <div style={styles.buttonGrid}>
        {['break_in', 'break_out', 'break_in_2', 'break_out_2', 'lunch_in', 'lunch_out'].map(action => (
          <button
            key={action}
            onClick={() => sendAction(action)}
            disabled={!isActionAllowed(action, getTodayLog())}
            style={{
              ...styles.button,
              opacity: isActionAllowed(action, getTodayLog()) ? 1 : 0.47,
              cursor: isActionAllowed(action, getTodayLog()) ? 'pointer' : 'not-allowed',
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

// --- STYLES ---
const styles = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '1rem',
    backgroundColor: '#f5f7fa',
    minHeight: '100vh',
    color: '#333',
    boxSizing: 'border-box',
    '@media (min-width: 768px)': {
      padding: '2rem',
    }
  },
  header: {
    textAlign: 'center',
    fontSize: '1.5rem',
    color: '#2c3e50',
    marginBottom: '1rem',
    '@media (min-width: 768px)': {
      fontSize: '2rem',
    }
  },
  summaryContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
    marginBottom: '1rem',
    backgroundColor: '#ffffff',
    padding: '1rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    }
  },
  summaryItem: {
    fontSize: '0.9rem',
    fontWeight: '500',
    padding: '8px',
    borderRadius: '8px',
    background: '#f8f9fa',
    border: '1px solid #e9ecef',
    '@media (min-width: 768px)': {
      fontSize: '1rem',
      padding: '10px',
    }
  },
  actionSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '1rem',
    '@media (min-width: 768px)': {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: '20px',
      marginBottom: '1.5rem',
    }
  },
  premiumButtonGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '8px',
    '@media (min-width: 768px)': {
      gap: '10px',
    }
  },
  premiumButton: {
    padding: '10px 15px',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    background: 'linear-gradient(45deg, #1d6e90, #00c1e8)',
    boxShadow: '0 4px 10px rgba(0, 193, 232, 0.3)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    '@media (min-width: 768px)': {
      padding: '12px 20px',
      fontSize: '1rem',
    }
  },
  lateInfoPill: {
    backgroundColor: '#fff',
    padding: '10px 15px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    fontWeight: '600',
    fontSize: '0.9rem',
    textAlign: 'center',
    '@media (min-width: 768px)': {
      padding: '12px 18px',
      fontSize: '1rem',
    }
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '1rem',
  },
  filterLabel: {
    fontWeight: '500',
    color: '#555',
  },
  monthInput: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '0.9rem',
    '@media (min-width: 768px)': {
      fontSize: '1rem',
    }
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
    backgroundColor: '#ffffff',
    padding: '0.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    '@media (min-width: 768px)': {
      gap: '8px',
      padding: '1rem',
    }
  },
  weekdayHeader: {
    textAlign: 'center',
    fontWeight: 'bold',
    padding: '8px 0',
    color: '#555',
    fontSize: '0.8rem',
    '@media (min-width: 768px)': {
      fontSize: '1rem',
      padding: '10px 0',
    }
  },
   dayCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    fontWeight: '500',
    fontSize: '0.8rem',
    border: '1px solid #e9ecef',
    transition: 'background-color 0.2s',
    minHeight: '40px', // Adjusted height
    padding: '4px', // Reduced padding
    '@media (min-width: 768px)': {
      fontSize: '1rem',
      borderRadius: '8px',
      minHeight: '50px',
      padding: '6px',
    }
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '1rem',
    fontSize: '0.8rem',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '10px',
    '@media (min-width: 768px)': {
      gap: '20px',
      marginTop: '1.5rem',
      fontSize: '0.9rem',
      padding: '15px',
    }
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
  },
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    marginRight: '6px',
    border: '1px solid #ddd',
    '@media (min-width: 768px)': {
      width: '18px',
      height: '18px',
      marginRight: '8px',
    }
  },
  historyHeader: {
    marginTop: '2rem',
    marginBottom: '1rem',
    textAlign: 'center',
    fontSize: '1.2rem',
    color: '#2c3e50',
    '@media (min-width: 768px)': {
      marginTop: '2.5rem',
      marginBottom: '1.5rem',
      fontSize: '1.5rem',
    }
  },
  historyFilterContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    padding: '1rem',
    backgroundColor: '#eaf3f9',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0, 16, 40, 0.05)',
    marginBottom: '1rem',
    '@media (min-width: 768px)': {
      gap: '15px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    }
  },
  historyFilterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateInput: {
    padding: '6px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '0.9rem',
    '@media (min-width: 768px)': {
      padding: '8px',
      fontSize: '1rem',
    }
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007bff',
    color: '#fff',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '@media (min-width: 768px)': {
      padding: '10px 20px',
      fontSize: '1rem',
    }
  },
  tableContainer: {
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '300px',
    borderRadius: '14px',
    boxShadow: '0 3px 16px rgba(80,100,130,0.07)',
    backgroundColor: '#fff',
    marginBottom: '1.5rem',
  },
  attendanceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'center',
    fontSize: '0.8rem',
    '@media (min-width: 768px)': {
      fontSize: '0.9rem',
    }
  },
  tableHeader: {
    padding: '10px 5px',
    backgroundColor: '#f1f4f8',
    borderBottom: '2px solid #e9ecef',
    fontWeight: '600',
    color: '#444',
    whiteSpace: 'nowrap',
    '@media (min-width: 768px)': {
      padding: '12px 8px',
    }
  },
  cellDate: {
    padding: '10px 5px',
    whiteSpace: 'nowrap',
    fontWeight: '600',
    color: '#333',
    '@media (min-width: 768px)': {
      padding: '12px 8px',
    }
  },
  cellMono: {
    fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    padding: '10px 5px',
    whiteSpace: 'nowrap',
    color: '#555',
    '@media (min-width: 768px)': {
      padding: '12px 8px',
    }
  },
  workedPill: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '0.7rem',
    minWidth: '50px',
    '@media (min-width: 768px)': {
      padding: '4px 10px',
      fontSize: '0.8rem',
      minWidth: '60px',
    }
  },
  remarksCell: {
    fontSize: '0.7rem',
    fontStyle: 'italic',
    padding: '10px 5px',
    textAlign: 'left',
    userSelect: 'text',
    color: '#777',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '120px',
    '@media (min-width: 768px)': {
      fontSize: '0.8rem',
      padding: '12px 8px',
      maxWidth: '180px',
    }
  },
  noLogsMessage: {
    textAlign: 'center',
    marginTop: '15px',
    color: '#888',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  buttonGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '15px',
    '@media (min-width: 768px)': {
      gap: '10px',
      marginTop: '20px',
    }
  },
  button: {
    padding: '10px 15px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#17a2b8',
    color: '#fff',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '@media (min-width: 768px)': {
      padding: '12px 20px',
      fontSize: '1rem',
    }
  },
  message: {
    textAlign: 'center',
    marginTop: '15px',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    '@media (min-width: 768px)': {
      fontSize: '1rem',
    }
  },
};

// CSS-in-JS for media queries
const styleSheet = document.createElement('style');
styleSheet.innerText = `
@media (min-width: 768px) {
  .page { padding: 2rem; }
  .header { font-size: 2rem; }
  .summary-container { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .summary-item { font-size: 1rem; padding: 10px; }
  .action-section { flex-direction: row; justify-content: space-between; gap: 20px; margin-bottom: 1.5rem; }
  .premium-button { padding: 12px 20px; font-size: 1rem; }
  .late-info-pill { padding: 12px 18px; font-size: 1rem; }
  .calendar-grid { gap: 8px; padding: 1rem; }
  .weekday-header { font-size: 1rem; padding: 10px 0; }
  .day-cell { font-size: 1rem; border-radius: 8px; min-height: 40px; }
  .legend { gap: 20px; margin-top: 1.5rem; font-size: 0.9rem; padding: 15px; }
  .legend-color { width: 18px; height: 18px; margin-right: 8px; }
  .history-header { margin-top: 2.5rem; margin-bottom: 1.5rem; font-size: 1.5rem; }
  .history-filter-container { gap: 15px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .date-input { padding: 8px; font-size: 1rem; }
  .filter-button { padding: 10px 20px; font-size: 1rem; }
  .attendance-table { font-size: 0.9rem; }
  .table-header { padding: 12px 8px; }
  .cell-date { padding: 12px 8px; }
  .cell-mono { padding: 12px 8px; }
  .worked-pill { padding: 4px 10px; font-size: 0.8rem; min-width: 60px; }
  .remarks-cell { font-size: 0.8rem; padding: 12px 8px; max-width: 180px; }
  .button { padding: 12px 20px; font-size: 1rem; }
  .message { font-size: 1rem; }
}
`;
document.head.appendChild(styleSheet);


export default AttendanceDashboard;