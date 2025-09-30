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
        // console.error('Failed to convert time:', isoTimeStr, e);
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

    // Adjust office_in time if earlier than 10:00
    let actualOfficeIn = office_in;
    const loginTime = parseTime(office_in);
    const officeStartTime = parseTime(OFFICE_START);
    if (loginTime && officeStartTime && loginTime < officeStartTime) {
        actualOfficeIn = OFFICE_START;
    }

    const grossMillis = diffMillis(actualOfficeIn, office_out);
    let breaks = 0;
    if (break_out && break_in) breaks += diffMillis(break_out, break_in);
    if (break_out_2 && break_in_2) breaks += diffMillis(break_out_2, break_in_2);
    if (lunch_out && lunch_in) breaks += diffMillis(lunch_out, lunch_in);

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
function classifyDayPolicy({ isoDate, weekday, log, holidaysMap, monthlyLateStats, leaveStatus }) {
    const netMillis = calculateNetWorkMillis(log || {});
    const netHours = millisToDecimalHours(netMillis);
    const netHHMM = fmtHrsMinFromMillis(netMillis);
    const lateInfo = evaluateLateLogin(log);
    const isExceededLate = monthlyLateStats.exceededDates?.includes(isoDate);

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

    // New rule: after 7PM and between 4–8 hrs worked
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
            // Default behavior: show last 10 logs
            setFilteredLogs([...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10));
            return;
        }
        let filtered = logs;
        if (fromDate) filtered = filtered.filter(log => dateStrGTE(log.date, fromDate));
        if (toDate) filtered = filtered.filter(log => dateStrLTE(log.date, toDate));
        
        // Sort the filtered logs by date (ascending)
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
            });
            result.set(iso, classification);
        }
        return result;
    }, [daysInMonth, logsByDate, holidays, monthlyLateStats]);

    // New function to handle half-day conversion
    const calculateTotalDays = useMemo(() => {
        let halfDays = 0;
        let fullDays = 0;
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

        // Convert two half days to one full day
        const extraFullDaysFromHalfs = Math.floor(halfDays / 2);
        const remainingHalfDays = halfDays % 2;
        fullDays += extraFullDaysFromHalfs;
        halfDays = remainingHalfDays;

        const totalWorkingDays = fullDays + (halfDays * 0.5) + paidLeaves + sundaysAndHolidays;
        const totalDays = daysInMonth.length;
        const totalPossibleWorkingDays = totalDays - daysInMonth.filter(d => d.date.getDay() === 0 || holidays.has(d.iso)).length;
        const average = totalPossibleWorkingDays > 0 ? ((fullDays + (halfDays * 0.5) + paidLeaves) / totalPossibleWorkingDays).toFixed(2) : 0;
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
            // console.error("Failed to save attendance summary:", error);
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
        if (log.lunch_in || log.lunch_out) tooltip += `Lunch: ${toIndianTime(log.lunch_in) || '-'} → ${toIndianTime(log.lunch_out) || '-'}\n`;
        return tooltip.trimEnd();
    }

    return (
        <div style={styles.page}>
            <h2 style={styles.header}>📅 Attendance Calendar</h2>
            <div style={styles.summaryContainer}>
                <div style={styles.summaryItem}><strong>Total Days:</strong> {calculateTotalDays.totalDays}</div>
                <div style={styles.summaryItem}><strong>Sundays:</strong> {calculateTotalDays.sundays}</div>
                <div style={styles.summaryItem}><strong>Full Days:</strong> {calculateTotalDays.fullDays}</div>
                <div style={styles.summaryItem}><strong>Half Days:</strong> {calculateTotalDays.halfDays}</div>
                <div style={styles.summaryItem}><strong>Paid Leaves & Holidays:</strong> {calculateTotalDays.paidLeaves + calculateTotalDays.paidHolidays}</div>
                <div style={styles.summaryItem}><strong>Absent Days:</strong> {calculateTotalDays.absentDays}</div>
                <div style={styles.summaryItem}><strong>Work Days (Total):</strong> {calculateTotalDays.totalWorkingDays}</div>
                <div style={styles.summaryItem}><strong>Avg. Per Day:</strong> {calculateTotalDays.average}</div>
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
                            <div style={styles.dayCellDate}>{day.date.getDate()}</div>
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
                <div style={styles.legendItem}>
                    <span style={{ ...styles.legendColor, background: 'linear-gradient(to right, #ffe082, #ce93d8)' }} /> Half day &amp; Paid leave Day
                </div>
            </div>

            {/* --- Attendance History Section (The focus of the style enhancement) --- */}
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
                <button style={styles.filterButton} onClick={applyDateFilter}>Apply Filter</button>
                <button
                    style={{ ...styles.filterButton, backgroundColor: '#b0bec5' }}
                    onClick={() => {
                        setFromDate('');
                        setToDate('');
                        applyDateFilter(); // Re-apply default filter
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
                                const rowStyle = {
                                    backgroundColor: index % 2 ? '#f7fbff' : '#fff',
                                    borderBottom: '1px solid #eeeeee', // Neat row divider
                                };
                                return (
                                    <tr
                                        key={log.date || index}
                                        style={rowStyle}
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
                                        <td style={{ ...styles.cellMono, borderLeft: styles.cellMono.borderLeft }}>
                                            <span style={{
                                                ...styles.workedPill,
                                                background: getHoursCellStyle(cls?.bucket).background,
                                                border: '1px solid #ccc',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
            {lunchMessage && <p style={styles.message}>{lunchMessage}</p>}
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
        // '@media (min-width: 768px)': { padding: '2rem', } // Non-standard in inline styles
    },
    header: {
        textAlign: 'center',
        fontSize: '1.5rem',
        color: '#2c3e50',
        marginBottom: '1rem',
        // '@media (min-width: 768px)': { fontSize: '2rem', }
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
        // '@media (min-width: 768px)': { gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', padding: '1.5rem', marginBottom: '1.5rem', }
    },
    summaryItem: {
        fontSize: '0.9rem',
        fontWeight: '500',
        padding: '8px',
        borderRadius: '8px',
        background: '#f8f9fa',
        border: '1px solid #e9ecef',
        // '@media (min-width: 768px)': { fontSize: '1rem', padding: '10px', }
    },
    actionSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '1rem',
        // '@media (min-width: 768px)': { flexDirection: 'row', justifyContent: 'space-between', gap: '20px', marginBottom: '1.5rem', }
    },
    premiumButtonGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '8px',
        // '@media (min-width: 768px)': { gap: '10px', }
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
        // '@media (min-width: 768px)': { padding: '12px 20px', fontSize: '1rem', }
    },
    lateInfoPill: {
        backgroundColor: '#fff',
        padding: '10px 15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        fontWeight: '600',
        fontSize: '0.9rem',
        textAlign: 'center',
        // '@media (min-width: 768px)': { padding: '12px 18px', fontSize: '1rem', }
    },
    filterRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
    },
    filterLabel: {
        fontSize: '1rem',
        marginRight: '8px',
        fontWeight: '500',
        color: '#555',
    },
    monthInput: {
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        fontSize: '1rem',
        cursor: 'pointer',
    },
    calendarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '5px',
        backgroundColor: '#ffffff',
        padding: '1rem',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    },
    weekdayHeader: {
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '10px 0',
        color: '#333',
        backgroundColor: '#e9e9e9',
        borderRadius: '4px',
        fontSize: '0.8rem',
        // '@media (min-width: 768px)': { fontSize: '1rem', }
    },
    dayCell: {
        height: 'auto',
        width: '100%',
        paddingTop: '35%',
        paddingBottom: '5%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        borderRadius: '8px',
        boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s',
        fontSize: '0.9rem',
        userSelect: 'none',
        border: '1px solid #f0f0f0',
        color: '#555',
        position: 'relative',
        // '@media (min-width: 768px)': { fontSize: '1.2rem', },
    },
    dayCellDate: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
    },
    legend: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '10px',
        marginTop: '1rem',
        fontSize: '0.9rem',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        fontWeight: '500',
        color: '#555',
    },
    legendColor: {
        width: '18px',
        height: '18px',
        borderRadius: '4px',
        border: '1px solid #ccc',
    },
    historyHeader: {
        textAlign: 'center',
        fontSize: '1.5rem',
        color: '#2c3e50',
        marginTop: '2rem',
        marginBottom: '1rem',
        // PREMIUM LINES
        borderTop: '2px solid #00c1e8',
        borderBottom: '2px solid #00c1e8',
        padding: '15px 0',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
    },
    historyFilterContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    },
    historyFilterGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    dateInput: {
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        fontSize: '1rem',
    },
    filterButton: {
        padding: '10px 15px',
        fontSize: '1rem',
        fontWeight: '600',
        borderRadius: '8px',
        border: '1px solid #007bff',
        backgroundColor: '#007bff',
        color: '#fff',
        cursor: 'pointer',
        transition: 'background-color 0.2s, color 0.2s',
        // ':hover': { backgroundColor: '#0056b3', },
    },
    tableContainer: {
        overflowX: 'auto',
        overflowY: 'scroll', // Make the table scrollable
        maxHeight: '400px', // Set a fixed height for scrolling
        marginBottom: '1rem',
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)', // More premium shadow
        border: '1px solid #e0e0e0', // Overall table border
    },
    attendanceTable: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'center',
        fontSize: '0.9rem',
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    tableHeader: {
        padding: '12px 6px',
        backgroundColor: '#eef2f7',
        color: '#2c3e50',
        fontWeight: '700',
        borderBottom: '2px solid #c8e6c9', // Premium header line
        textTransform: 'uppercase',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        whiteSpace: 'nowrap',
    },
    cellDate: {
        padding: '12px 8px',
        fontWeight: '600',
        color: '#333',
        whiteSpace: 'nowrap',
        minWidth: '100px',
        textAlign: 'center',
        borderLeft: '1px dotted #e0e0e0', // Vertical line
    },
    cellMono: {
        padding: '12px 6px',
        fontFamily: 'monospace',
        color: '#555',
        whiteSpace: 'nowrap',
        fontSize: '0.85rem',
        minWidth: '70px',
        borderLeft: '1px dotted #e0e0e0', // Vertical line
    },
    remarksCell: {
        padding: '12px 10px',
        textAlign: 'left',
        fontSize: '0.9rem',
        color: '#777',
        whiteSpace: 'normal',
        maxWidth: '300px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        borderLeft: '1px dotted #e0e0e0', // Vertical line
    },
    workedPill: {
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '15px',
        fontWeight: 'bold',
        color: '#333',
        fontSize: '0.8em',
        minWidth: '55px',
    },
    noLogsMessage: {
        textAlign: 'center',
        color: '#888',
        fontSize: '1rem',
        marginTop: '2rem',
    },
    buttonGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '10px',
        marginTop: '1.5rem',
    },
    button: {
        padding: '12px 8px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        borderRadius: '8px',
        border: 'none',
        color: '#fff',
        backgroundColor: '#4a90e2',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        // ':hover': { backgroundColor: '#3a72b8', },
        whiteSpace: 'nowrap',
    },
    message: {
        textAlign: 'center',
        marginTop: '1rem',
        fontWeight: 'bold',
        fontSize: '1rem',
    },
};
