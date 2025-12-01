/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-mixed-operators */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './AttendanceDashboard.css';

// Base API URL logic
const baseUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:5000' // Your local backend URL
    : 'https://backend.vjcoverseas.com'; // Production backend URL

const clickSound = new Audio('/on-click.mp3');

function playClickSound() {
    try {
        clickSound.currentTime = 0;
        clickSound.play();
    } catch (e) {
        // Ignore playback errors such as user not interacted yet
    }
}    

// --- Utility functions ---

function parseTime(timeStr) {
    if (!timeStr) return null;
    const cleaned = timeStr.split('.')[0];
    const parts = cleaned.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    // Always set seconds to zero
    return new Date(Date.UTC(1970, 0, 1, h, m, 0));
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

function calculateNetWorkMillis(log) {
    const { office_in, office_out, break_in, break_out, break_in_2, break_out_2, lunch_in, lunch_out, extra_break_ins = [], extra_break_outs = [] } = log || {};
    if (!office_in || !office_out) return 0;

    let actualOfficeIn = office_in;
    const loginTime = parseTime(office_in);
    const officeStartTime = parseTime(OFFICE_START);
    if (loginTime && officeStartTime && loginTime < officeStartTime) {
        actualOfficeIn = OFFICE_START;
    }

     // Clamp office_out if after 7 PM (19:00:00)
    const officeOutTime = parseTime(office_out);
    const cutoffTime = parseTime(LOGOUT_CUTOFF); // '19:00:00'
    let adjustedOfficeOut = office_out;
    if (officeOutTime && cutoffTime && officeOutTime > cutoffTime) {
        adjustedOfficeOut = LOGOUT_CUTOFF;  // Clamp to 7 PM
    }

    const grossMillis = diffMillis(actualOfficeIn, adjustedOfficeOut);

    let breaks = 0;
    // Existing breaks sum
    if (break_in && break_out) breaks += diffMillis(break_in, break_out);
    if (break_in_2 && break_out_2) breaks += diffMillis(break_in_2, break_out_2);
    if (lunch_in && lunch_out) breaks += diffMillis(lunch_in, lunch_out);

    // Extra multiple breaks sum (pair by index)
    for (let i = 0; i < Math.min(extra_break_ins.length, extra_break_outs.length); i++) {
        if (extra_break_ins[i] && extra_break_outs[i]) {
            breaks += diffMillis(extra_break_ins[i], extra_break_outs[i]);
        }
    }

    let net = grossMillis - breaks;
    return net < 0 ? 0 : net;
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

    const adjustedInT = (inT && slotAStart && inT < slotAStart) ? slotAStart : inT;
    const coversA = adjustedInT <= slotAStart && outT >= slotAEnd;
    const coversB = adjustedInT <= slotBStart && outT >= slotBEnd;

    const netHours = millisToDecimalHours(calculateNetWorkMillis(log));
    return netHours >= 4 && (coversA || coversB);
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

// --- Classification with policies ---
function classifyDayPolicy({ isoDate, weekday, log, holidaysMap, monthlyLateStats, leaveStatus, logsByDate }) {
  const netMillis = calculateNetWorkMillis(log || {});
  const netHours = millisToDecimalHours(netMillis);
  const netHHMM = fmtHrsMinFromMillis(netMillis);
  const lateInfo = evaluateLateLogin(log);
  
  const isExceededLate = monthlyLateStats.exceededDates?.includes(isoDate);
  if (weekday === 1) {
    const officeInTime = parseTime(log?.office_in);
    const cutoffTime = parseTime('14:00:00'); // 2:00 PM cutoff
    if (officeInTime && cutoffTime && officeInTime > cutoffTime) {
      return {
        bucket: 'absent',
        reason: 'Monday login after 2:00 PM — full day absent per policy',
        netHHMM: '00:00',
        netHours: 0,
        flags: ['monday_late_full_absent'],
      };
    }
  }
// Sunday special condition check (Month-end logic included)
if (weekday === 0) {
  const dateObj = new Date(isoDate + 'T00:00:00Z'); // Treat as UTC
  
  // --- Check if Sunday is month end ---
  const currentMonth = dateObj.getUTCMonth();
  const nextDay = new Date(dateObj);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const isMonthEndSunday = nextDay.getUTCMonth() !== currentMonth;
  
  // Get previous day (Saturday) and next day (Monday) ISO dates
  const saturdayISO = new Date(dateObj);
  saturdayISO.setUTCDate(saturdayISO.getUTCDate() - 1);
  const saturdayStr = saturdayISO.toISOString().slice(0, 10);

  const mondayISO = new Date(dateObj);
  mondayISO.setUTCDate(mondayISO.getUTCDate() + 1);
  const mondayStr = mondayISO.toISOString().slice(0, 10);

  // Fetch logs for Saturday (same month) and Monday (next month if month-end)
  const saturdayLog = logsByDate.get(saturdayStr) || {};
  const mondayLog = logsByDate.get(mondayStr) || {};

  // Logic for Saturday logout at or after 7:00 PM or paid/half paid holiday with half worked
  const logoutSatTime = parseTime(saturdayLog.office_out);
  const cutoffLogoutTime = parseTime(LOGOUT_CUTOFF);

  // Monday login before 10:15 AM (grace)
  const loginMondayTime = parseTime(mondayLog.office_in);
  const lateGraceTime = parseTime(LATE_GRACE_LIMIT);
  
  // Conditions for Sunday as holiday
  if (
    (logoutSatTime && cutoffLogoutTime && logoutSatTime >= cutoffLogoutTime) || 
    (saturdayLog.leave_type && (saturdayLog.leave_type.toLowerCase().includes('paid') || saturdayLog.leave_type.toLowerCase().includes('half'))) &&
    netHours >= 4
  ) {
    if (loginMondayTime && lateGraceTime && loginMondayTime <= lateGraceTime) {
      // Mark Sunday as holiday
      if (holidaysMap.has(isoDate)) {
        return { bucket: 'holiday', reason: `Paid Holiday: ${holidaysMap.get(isoDate).name}`, netHHMM: '00:00', netHours: 0, flags: ['paid_holiday'] };
      }
      return { 
        bucket: 'holiday', 
        reason: isMonthEndSunday 
          ? 'Sunday treated as Holiday (Month-end weekend compliance Sat-Mon cross-month)' 
          : 'Sunday treated as Holiday (Weekend compliance)', 
        netHHMM: '00:00', 
        netHours: 0, 
        flags: ['sunday_special_holiday'] 
      };
    }
  }

  // Else mark Sunday as absent if no attendance log or no holiday
  if (holidaysMap.has(isoDate)) {
    return { bucket: 'holiday', reason: `Paid Holiday: ${holidaysMap.get(isoDate).name}`, netHHMM: '00:00', netHours: 0, flags: ['paid_holiday'] };
  }

  return { 
    bucket: 'absent', 
    reason: isMonthEndSunday 
      ? 'Sunday Month-end (Absent - Sat/Mon criteria not met)' 
      : 'Sunday (Absent due to criteria not met)', 
    netHHMM: '00:00', 
    netHours: 0, 
    flags: ['sunday_absent'] 
  };
}

if (log?.leave_type?.toLowerCase().includes('earned') && netHours >= 4) {
  return { bucket: 'fullday_and_earned_leave', reason: 'Earned Leave (Half-Day) + Worked > 4h = Full Day', netHHMM, netHours, flags: ['earned_leave_fullday_override'] };
}

if (weekday === 0) return { bucket: 'holiday', reason: 'Sunday (Holiday)', netHHMM: '00:00', netHours: 0, flags: ['sunday'] };

if (holidaysMap.has(isoDate)) {
  return { bucket: 'holiday', reason: `Paid Holiday: ${holidaysMap.get(isoDate).name}`, netHHMM: '00:00', netHours: 0, flags: ['paid_holiday'] };
}

if (leaveStatus && (leaveStatus === 'Pending' || leaveStatus === 'Rejected')) {
  if (!log || !log.office_in || !log.office_out) {
    return { bucket: 'absent', reason: `Leave ${leaveStatus.toLowerCase()} - treated as absent with grace`, netHHMM: '00:00', netHours: 0, flags: ['grace_absent', `leave_${leaveStatus.toLowerCase()}`] };
  }
}

if (log?.leave_type?.toLowerCase().includes('earned')) {
  return { bucket: 'paidleave', reason: `Paid Leave: ${log.leave_type}`, netHHMM: '00:00', netHours: 0, flags: ['paid_leave'] };
}

if (log?.leave_type && !log.leave_type.toLowerCase().includes('earned')) {
  return { bucket: 'absent', reason: `${log.leave_type} (unpaid)`, netHHMM: '00:00', netHours: 0, flags: ['unpaid_leave'] };
}

if (!log?.office_in || !log?.office_out) {
  return { bucket: 'absent', reason: 'No attendance log', netHHMM: '00:00', netHours: 0, flags: [] };
}


    const logoutTime = parseTime(log.office_out);
    const logoutCutoff = parseTime(LOGOUT_CUTOFF);

    const logoutBefore = logoutTime && logoutCutoff && logoutTime < logoutCutoff;
    const logoutAfter = logoutTime && logoutCutoff && logoutTime >= logoutCutoff;

    if (logoutAfter && netHours >= 4 && netHours < 8) {
        return { bucket: 'halfday', reason: 'Worked 4–8 hours and logged out at/after 7 PM (Half Day)', netHHMM, netHours, flags: ['logout_after7pm_halfday'] };
    }

    if (logoutBefore) {
        if (netHours >= 8) return { bucket: 'halfday', reason: 'Worked >8h but logged out before 7 PM (Half Day)', netHHMM, netHours, flags: ['early_logout_halfday'] };
        if (netHours < 4) return { bucket: 'absent', reason: 'Worked <4h + logout before 7 PM (Absent)', netHHMM, netHours, flags: ['early_logout_absent'] };
    }

    if ((lateInfo.isLate && lateInfo.isWithinGrace && isExceededLate) || (lateInfo.isLate && lateInfo.isBeyondGrace)) {
        if (netHours >= 8) return { bucket: 'halfday', reason: 'Late beyond limit (Half Day)', netHHMM, netHours, flags: ['late_exceeded_or_beyond_grace'] };
        return { bucket: 'absent', reason: 'Late beyond limit + <8h (Absent)', netHHMM, netHours, flags: ['absent_late_less_than_8h'] };
    }

    if (netHours < 4) return { bucket: 'absent', reason: 'Worked <4h (Absent)', netHHMM, netHours, flags: ['lt4h'] };
    if (netHours < 8) {
        if (qualifiesHalfDayPresentBySlot(log)) return { bucket: 'halfday', reason: 'Half-Day slot satisfied', netHHMM, netHours, flags: ['half_day_slot_present'] };
        return { bucket: 'halfday', reason: 'Worked 4–8h', netHHMM, netHours, flags: ['ge4_lt8_no_slot'] };
    }
    return { bucket: 'fullday', reason: 'Full Day Present', netHHMM, netHours, flags: [] };
}

// --- Get cell style ---
const dayStyles = {
    fullday: { background: '#b9f6ca' },
    halfday: { background: '#ffe082' },
    absent: { background: '#ffcdd2' },
    holiday: { background: '#90caf9' },
    paidleave: { background: '#ce93d8' },
    fullday_and_earned_leave: { background: 'linear-gradient(to right, #ffe082, #ce93d8)' },
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
    return { status: 'LATE', text: `Lunch In is late (after ${toIndianTime(LUNCH_IN_LIMIT)})` };
}

function isActionAllowed(action, todayLog) {
    if (todayLog?.office_out) return false;
    if (action === 'office_in') return !(todayLog && todayLog.office_in);
    if (action === 'office_out') return todayLog?.office_in && !todayLog.office_out;
    if (action === 'break_in') return todayLog?.office_in && !todayLog.break_out && !todayLog.break_in;
    if (action === 'break_out') return todayLog?.office_in && todayLog.break_in && !todayLog.break_out;
    if (action === 'break_in_2') return todayLog?.office_in && todayLog.break_out && !todayLog.break_in_2 && !todayLog.break_out_2;
    if (action === 'break_out_2') return todayLog?.office_in && todayLog.break_in_2 && !todayLog.break_out_2;
    if (action === 'lunch_in') return todayLog?.office_in && !todayLog.lunch_out && !todayLog.lunch_in;
    if (action === 'lunch_out') return todayLog?.office_in && todayLog.lunch_in && !todayLog.lunch_out;

    // Additional actions for multiple extra breaks
    if (action === 'extra_break_in') {
        // Only allow if office_in exists and 
        // either extra_break_ins not set or length <= extra_break_outs length (allow next break_in)
        if (!todayLog?.office_in) return false;
        const insLen = todayLog.extra_break_ins ? todayLog.extra_break_ins.length : 0;
        const outsLen = todayLog.extra_break_outs ? todayLog.extra_break_outs.length : 0;
        return insLen === outsLen;
    }
    if (action === 'extra_break_out') {
        // Allow only if extra_break_outs length < extra_break_ins length
        if (!todayLog?.office_in || !todayLog.extra_break_ins) return false;
        const insLen = todayLog.extra_break_ins.length;
        const outsLen = todayLog.extra_break_outs ? todayLog.extra_break_outs.length : 0;
        return outsLen < insLen;
    }
    return false;
}

// --- Attendance Dashboard Component ---
export default function AttendanceDashboard() {
  const [logs, setLogs] = useState([]);
  const [holidays, setHolidays] = useState(new Map());
  const [message, setMessage] = useState('');
  const [lunchMessage, setLunchMessage] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => currentYearMonth());
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);

  useEffect(() => {
    fetchAttendance();
    fetchHolidays();
  }, [selectedMonth]);

  useEffect(() => {
    applyDateFilter();
  }, [logs, fromDate, toDate]);

  function fetchAttendance() {
    if (!selectedMonth) return;
    axios
      .get(`${baseUrl}/my-attendance?month=${selectedMonth}`, { withCredentials: true })
      .then((res) => {
        setLogs(Array.isArray(res.data) ? res.data : []);
        setMessage('');
      })
      .catch(() => setMessage('❌ Failed to fetch attendance logs'));
  }

  function fetchHolidays() {
    if (!selectedMonth) return;
    axios
      .get(`${baseUrl}/holidays?month=${selectedMonth}`, { withCredentials: true })
      .then((res) => {
        const map = new Map();
        res.data.forEach((h) => {
          if (h.date && h.name) {
            map.set(h.date, { name: h.name, isPaid: h.is_paid });
          }
        });
        setHolidays(map);
        setMessage('');
      })
      .catch((error) => {
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
      setFilteredLogs([...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10));
      return;
    }
    let filtered = logs;
    if (fromDate) filtered = filtered.filter((log) => dateStrGTE(log.date, fromDate));
    if (toDate) filtered = filtered.filter((log) => dateStrLTE(log.date, toDate));
    setFilteredLogs([...filtered].sort((a, b) => a.date.localeCompare(b.date)));
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
      logsByDate,  // pass here
    });
    result.set(iso, classification);
  }
  return result;
}, [daysInMonth, logsByDate, holidays, monthlyLateStats]);


  // Key change here: only consider days up to today's date in selected month for summary calculations
  const calculateTotalDays = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);

    // Filter daysInMonth to those <= today only - skip future dates
    const validDays = daysInMonth.filter((d) => d.iso <= todayISO);

    let halfDays = 0,
      fullDays = 0,
      paidLeaves = 0,
      absentDays = 0,
      sundaysAndHolidays = 0;

    for (const { iso } of validDays) {
      const classification = dayClassifications.get(iso);
      if (!classification) {
        absentDays++;
        continue;
      }
      switch (classification.bucket) {
        case 'fullday':
        case 'fullday_and_earned_leave':
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

    const extraFullDaysFromHalfs = Math.floor(halfDays / 2);
    const remainingHalfDays = halfDays % 2;
    fullDays += extraFullDaysFromHalfs;
    halfDays = remainingHalfDays;

    const totalWorkingDays = fullDays + halfDays * 0.5 + paidLeaves + sundaysAndHolidays;
    const totalDays = validDays.length;
    const totalPossibleWorkingDays =
      totalDays -
      validDays.filter((d) => d.date.getDay() === 0 || holidays.has(d.iso)).length;
    const average =
      totalPossibleWorkingDays > 0
        ? ((fullDays + halfDays * 0.5 + paidLeaves) / totalPossibleWorkingDays).toFixed(2)
        : 0;
    const sundays = validDays.filter((d) => d.date.getDay() === 0).length;
    const paidHolidays = [...holidays.values()].filter((h) => h.isPaid).length;

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
      await axios.post(
        `${baseUrl}/save-attendance-summary`,
        {
          month: selectedMonth,
          summary,
        },
        { withCredentials: true }
      );
    } catch (error) {
      // failed silently
    }
  }

  useEffect(() => {
    if (calculateTotalDays && selectedMonth) {
      saveAttendanceSummary(calculateTotalDays, selectedMonth);
    }
  }, [calculateTotalDays, selectedMonth]);

  function getTodayLog() {
    const todayStr = new Date().toISOString().slice(0, 10);
    return logsByDate.get(todayStr) || {};
  }

  async function sendAction(actionParam) {
    playClickSound();
    const todayLog = getTodayLog();

    if (actionParam === 'extra_break_in' || actionParam === 'extra_break_out') {
      if (!isActionAllowed(actionParam, todayLog)) {
        setMessage('⛔ Action not permitted at current state.');
        return;
      }
      try {
        const d = new Date();
        const pad = (x) => x.toString().padStart(2, '0');
        const nowTime = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        const res = await axios.post(
          `${baseUrl}/attendance`,
          new URLSearchParams({ action: actionParam, time: nowTime }),
          { withCredentials: true }
        );
        setMessage('✅ ' + res.data.message);
        await fetchAttendance();
      } catch (err) {
        setMessage('❌ ' + (err.response?.data?.message || 'Something went wrong'));
      }
      return;
    }

    if (!isActionAllowed(actionParam, todayLog)) {
      setMessage('⛔ Action not permitted at current state.');
      return;
    }
    try {
      const res = await axios.post(
        `${baseUrl}/attendance`,
        new URLSearchParams({ action: actionParam }),
        { withCredentials: true }
      );
      setMessage('✅ ' + res.data.message);
      await fetchAttendance();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Something went wrong'));
    }
  }

  const filteredRows = useMemo(() => {
    const sorted = [...(filteredLogs || [])].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((log) => {
      const netMillis = calculateNetWorkMillis(log);
      const netHrs = millisToDecimalHours(netMillis);
      const netWorkedHrsMin = fmtHrsMinFromMillis(netMillis);
      const iso = log.date;
      const cls = dayClassifications.get(iso);
      const remarks = cls?.reason || '';

      // Safe parser for array fields
      const extraBreakIns = Array.isArray(log.extra_break_ins) ? log.extra_break_ins : [];
      const extraBreakOuts = Array.isArray(log.extra_break_outs) ? log.extra_break_outs : [];

      const extraBreakInsDisplay =
        extraBreakIns.length > 0 ? extraBreakIns.map((t, i) => <div key={`in-${i}`}>{toIndianTime(t)}</div>) : '';

      const extraBreakOutsDisplay =
        extraBreakOuts.length > 0 ? extraBreakOuts.map((t, i) => <div key={`out-${i}`}>{toIndianTime(t)}</div>) : '';

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
        extraBreakInsDisplay,
        extraBreakOutsDisplay,
        remarks,
      };
    });
  }, [filteredLogs, dayClassifications]);

  // eslint-disable-next-line no-unused-vars
  function handleLunchInClick(lunchInTime) {
    const status = lunchInStatus(lunchInTime);
    setLunchMessage(status.text);
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

    if (log.extra_break_ins && log.extra_break_outs) {
      for (let i = 0; i < Math.min(log.extra_break_ins.length, log.extra_break_outs.length); i++) {
        tooltip += `Extra Break ${i + 1}: ${toIndianTime(log.extra_break_ins[i]) || '-'} → ${toIndianTime(log.extra_break_outs[i]) || '-'}\n`;
      }
    }
    if (log.lunch_in || log.lunch_out) tooltip += `Lunch: ${toIndianTime(log.lunch_in) || '-'} → ${toIndianTime(log.lunch_out) || '-'}\n`;
    return tooltip.trimEnd();
  }

  function getBucketClass(bucket) {
    switch (bucket) {
      case 'fullday':
        return 'fullday';
      case 'halfday':
        return 'halfday';
      case 'absent':
        return 'absent';
      case 'holiday':
        return 'holiday';
      case 'paidleave':
        return 'paidleave';
      case 'fullday_and_earned_leave':
        return 'fullday_and_earned_leave';
      default:
        return '';
    }
  }

  return (
    <div className="page">
      <h2 className="header">📅 Attendance Calendar</h2>
      <div className="summary-container">
        <div className="summary-item">
          <strong>Total Days:</strong> {calculateTotalDays.totalDays}
        </div>
        <div className="summary-item">
          <strong>Sundays:</strong> {calculateTotalDays.sundays}
        </div>
        <div className="summary-item">
          <strong>Full Days:</strong> {calculateTotalDays.fullDays}
        </div>
        <div className="summary-item">
          <strong>Half Days:</strong> {calculateTotalDays.halfDays}
        </div>
        <div className="summary-item">
          <strong>Paid Leaves & Holidays:</strong> {calculateTotalDays.paidLeaves + calculateTotalDays.paidHolidays}
        </div>
        <div className="summary-item">
          <strong>Absent Days:</strong> {calculateTotalDays.absentDays}
        </div>
        <div className="summary-item">
          <strong>Work Days (Total):</strong> {calculateTotalDays.totalWorkingDays}
        </div>
        <div className="summary-item">
          <strong>Avg. Per Day:</strong> {calculateTotalDays.average}
        </div>
      </div>

      <div className="action-section">
        {/* CONSOLIDATED premium-button-grid for all essential actions */}
        <div className="premium-button-grid" style={{ gridTemplateColumns: 'repeat(4, auto)', gap: '15px' }}>
          {['office_in', 'office_out'].map((action) => (
            <button
              key={action}
              className="premium-button"
              style={{
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
          <div className="late-info-pill" title="Late logins info">
            <span role="img" aria-label="clock">
              ⏰
            </span>{' '}
            <strong>Late Logins:</strong> {monthlyLateStats.permittedLateCount} / {monthlyLateStats.maxPermitted} (Remaining{' '}
            {monthlyLateStats.remaining})
          </div>
          <button
            className="premium-button"
            style={{
              opacity: isActionAllowed('extra_break_in', getTodayLog()) ? 1 : 0.5,
              cursor: isActionAllowed('extra_break_in', getTodayLog()) ? 'pointer' : 'not-allowed',
            }}
            onClick={() => sendAction('extra_break_in')}
            disabled={!isActionAllowed('extra_break_in', getTodayLog())}
            title="EXTRA BREAK IN"
          >
            BREAK IN 3
          </button>

          <button
            className="premium-button"
            style={{
              opacity: isActionAllowed('extra_break_out', getTodayLog()) ? 1 : 0.5,
              cursor: isActionAllowed('extra_break_out', getTodayLog()) ? 'pointer' : 'not-allowed',
            }}
            onClick={() => sendAction('extra_break_out')}
            disabled={!isActionAllowed('extra_break_out', getTodayLog())}
            title="EXTRA BREAK OUT"
          >
            BREAK OUT 3
          </button>
        </div>
      </div>

      <div className="filter-row">
        <label htmlFor="select-month" className="filter-label">
          Select Month:
        </label>
        <input
          id="select-month"
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="month-input"
        />
      </div>

      <div className="calendar-grid" aria-label="Attendance calendar grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
          <div key={dayName} className="weekday-header">
            {dayName}
          </div>
        ))}
        {Array(daysInMonth[0].date.getDay())
          .fill(null)
          .map((_, i) => (
            <div key={'blank-' + i} className="day-cell" />
          ))}
        {daysInMonth.map((day) => {
          const iso = day.iso;
          const cls = dayClassifications.get(iso);
          const bucketClass = getBucketClass(cls?.bucket);
          const tooltip = buildTooltip(iso);
          return (
            <div key={iso} className={`day-cell ${bucketClass}`} title={tooltip} style={{ cursor: 'default' }}>
              <div className="day-cell-date">{day.date.getDate()}</div>
            </div>
          );
        })}
      </div>

      <div className="legend" aria-label="Legend for attendance calendar colors">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#90caf9' }} /> Sunday &amp; Holiday
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#b9f6ca' }} /> Full Day
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ffe082' }} /> Half Day
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ffcdd2' }} /> Absent / &lt;4h Worked
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ce93d8' }} /> Paid Leave
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: 'linear-gradient(to right, #ffe082, #ce93d8)' }} /> Half day &amp; Paid leave Day
        </div>
      </div>

      <h3 className="history-header">🗂️ Attendance History</h3>
      <div className="history-filter-container">
        <div className="history-filter-group">
          <label className="filter-label">From:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="date-input" />
        </div>
        <div className="history-filter-group">
          <label className="filter-label">To:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="date-input" />
        </div>
        <button className="filter-button" onClick={applyDateFilter}>
          Apply Filter
        </button>
        <button
          className="filter-button"
          style={{ backgroundColor: '#b0bec5' }}
          onClick={() => {
            setFromDate('');
            setToDate('');
            applyDateFilter();
          }}
        >
          Reset
        </button>
      </div>

      {filteredRows.length > 0 ? (
        <div className="table-container">
          <table className="attendance-table" aria-label="Attendance logs table">
            <thead>
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Login</th>
                <th className="table-header">B.In</th>
                <th className="table-header">B.Out</th>
                <th className="table-header">L.In</th>
                <th className="table-header">L.Out</th>
                <th className="table-header">B2.In</th>
                <th className="table-header">B2.Out</th>
                <th className="table-header" style={{ textAlign: 'left' }}>
                  Extra Break Ins
                </th>
                <th className="table-header" style={{ textAlign: 'left' }}>
                  Extra Break Outs
                </th>
                <th className="table-header">Logout</th>
                <th className="table-header">Net</th>
                <th className="table-header" style={{ textAlign: 'left' }}>
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((log, index) => {
                const cls = dayClassifications.get(log.date);
                const rowStyle = {
                  backgroundColor: index % 2 ? '#f7fbff' : '#fff',
                  borderBottom: '1px solid #eeeeee',
                };

                return (
                  <tr
                    key={log.date || index}
                    style={rowStyle}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e3f2fd')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = index % 2 ? '#f7fbff' : '#fff')}
                  >
                    <td className="cell-date">{log.date}</td>
                    <td className="cell-mono">{log.office_in_disp}</td>
                    <td className="cell-mono">{log.break_in_disp}</td>
                    <td className="cell-mono">{log.break_out_disp}</td>
                    <td className="cell-mono">{log.lunch_in_disp}</td>
                    <td className="cell-mono">{log.lunch_out_disp}</td>
                    <td className="cell-mono">{log.break_in_2_disp}</td>
                    <td className="cell-mono">{log.break_out_2_disp}</td>
                    <td className="cell-mono" style={{ whiteSpace: 'normal', textAlign: 'left' }}>
                      {log.extraBreakInsDisplay}
                    </td>
                    <td className="cell-mono" style={{ whiteSpace: 'normal', textAlign: 'left' }}>
                      {log.extraBreakOutsDisplay}
                    </td>
                    <td className="cell-mono">{log.office_out_disp}</td>
                    <td className="cell-mono" style={{ borderLeft: '1px dotted #e0e0e0' }}>
                      <span
                        className="worked-pill"
                        style={{
                          background: getHoursCellStyle(cls?.bucket).background,
                          border: '1px solid #ccc',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                      >
                        {log.netWorkedHrsMin}
                      </span>
                    </td>
                    <td className="remarks-cell" title={log.remarks}>
                      {log.remarks}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-logs-message">No attendance logs found.</p>
      )}

      <div className="button-grid">
        {['break_in', 'break_out', 'break_in_2', 'break_out_2', 'lunch_in', 'lunch_out'].map((action) => (
          <button
            key={action}
            onClick={() => sendAction(action)}
            disabled={!isActionAllowed(action, getTodayLog())}
            className="button"
            style={{
              opacity: isActionAllowed(action, getTodayLog()) ? 1 : 0.47,
              cursor: isActionAllowed(action, getTodayLog()) ? 'pointer' : 'not-allowed',
            }}
          >
            {action.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {lunchMessage && <p className="message">{lunchMessage}</p>}
      <p className="message">{message}</p>
    </div>
  );
}