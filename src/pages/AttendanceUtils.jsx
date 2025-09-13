// --- Policy constants ---
export const OFFICE_START = '10:00:00';
export const TEA_BREAK_1_MIN = 15;
export const TEA_BREAK_2_MIN = 15;
export const LUNCH_BREAK_MIN = 30;
export const STANDARD_BREAK_MIN = TEA_BREAK_1_MIN + TEA_BREAK_2_MIN + LUNCH_BREAK_MIN;
export const LATE_GRACE_LIMIT = '10:15:00';
export const MAX_PERMITTED_LATES_PER_MONTH = 6;
export const HALF_SLOT_A_START = '10:00:00';
export const HALF_SLOT_A_END = '14:30:00';
export const HALF_SLOT_B_START = '14:30:00';
export const HALF_SLOT_B_END = '19:00:00';
export const MISUSE_GRACE_MIN = 10;
export const LUNCH_IN_LIMIT = '14:00:00';

// --- Utility functions ---
export function parseTime(timeStr) {
  if (!timeStr) return null;
  const cleaned = timeStr.split('.')[0];
  const parts = cleaned.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const s = parseInt(parts[2] || '0', 10);
  if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
  return new Date(Date.UTC(1970, 0, 1, h, m, s));
}

export function diffMillis(startStr, endStr) {
  const a = parseTime(startStr), b = parseTime(endStr);
  if (!a || !b || b < a) return 0;
  return b - a;
}

export function fmtHrsMinFromMillis(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}hrs ${m}min`;
}

export function millisToDecimalHours(ms) {
  return ms / (1000 * 60 * 60);
}

export function dateStrLTE(a, b) {
  return a <= b;
}

export function dateStrGTE(a, b) {
  return a >= b;
}

export function getWeekdayFromISO(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCDay();
}

export function currentYearMonth() {
  const now = new Date();
  return now.toISOString().slice(0, 7);
}

export function addDaysISO(isoDate, delta) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function getMonthDays(year, monthIndex0) {
  const res = [];
  const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(Date.UTC(year, monthIndex0, d));
    res.push({ date, iso: date.toISOString().slice(0, 10) });
  }
  return res;
}

// --- Core policy functions ---
export function calculateNetWorkMillis(log) {
  const { office_in, office_out, break_out, break_in, break_out_2, break_in_2, lunch_out, lunch_in } = log || {};
  if (!office_in || !office_out) return 0;
  const grossMillis = diffMillis(office_in, office_out);
  let explicitBreakMillis = 0;
  if (break_in && break_out) explicitBreakMillis += diffMillis(break_out, break_in);
  if (break_in_2 && break_out_2) explicitBreakMillis += diffMillis(break_out_2, break_in_2);
  if (lunch_in && lunch_out) explicitBreakMillis += diffMillis(lunch_out, lunch_in);
  let net = grossMillis - explicitBreakMillis;
  if (net < 0) net = 0;
  return net;
}

export function evaluateLateLogin(log) {
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

export function qualifiesHalfDayPresentBySlot(log) {
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

export function detectMisuseAfterLogin(log) {
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

export function classifyDayPolicy({ isoDate, weekday, log, onePlusOneAbsentSet, saturdayMondayAbuseSet }) {
  if (weekday === 0) {
    return { bucket: 'holiday', reason: 'Sunday (Holiday)', netHHMM: '00:00', netHours: 0, flags: [] };
  }
  const netMillis = calculateNetWorkMillis(log || {});
  const netHours = millisToDecimalHours(netMillis);
  const netHHMM = fmtHrsMinFromMillis(netMillis);
  const flags = [];
  let leaveLabel = null;
  if (log && log.leave_type) {
    const lt = String(log.leave_type || '').toLowerCase();
    const hasProof = !!log.medical_proof;
    const sudden = !!log.sudden_leave;
    const extension = !!log.leave_extension;
    if (lt === 'medical') {
      if (hasProof) {
        leaveLabel = 'Leave: Medical (Approved)';
        flags.push('medical_approved');
      } else {
        leaveLabel = 'Leave: Medical (No proof)';
        flags.push('medical_without_proof');
      }
    } else if (['annual', 'casual', 'unpaid', 'sudden', 'extension'].includes(lt)) {
      if (sudden) flags.push('sudden_leave');
      if (extension) flags.push('leave_extension');
      leaveLabel = `Leave: ${lt.charAt(0).toUpperCase() + lt.slice(1)}`;
    } else {
      leaveLabel = `Leave: ${log.leave_type}`;
    }
  }
  if (onePlusOneAbsentSet && onePlusOneAbsentSet.has(isoDate)) {
    return {
      bucket: 'fullabsent',
      reason: leaveLabel ? `${leaveLabel} (1+1 Policy Applied)` : '1+1 Policy Absent',
      netHHMM,
      netHours,
      flags: [...flags, 'one_plus_one'],
    };
  }
  if (saturdayMondayAbuseSet && saturdayMondayAbuseSet.has(isoDate)) {
    return {
      bucket: 'fullabsent',
      reason: leaveLabel ? `${leaveLabel} (Sat/Mon abuse 1+1)` : 'Sat/Mon leave abuse (1+1)',
      netHHMM,
      netHours,
      flags: [...flags, 'sat_mon_abuse'],
    };
  }
  if (leaveLabel && flags.includes('medical_approved')) {
    return { bucket: 'present', reason: leaveLabel, netHHMM, netHours, flags: [...flags] };
  }
  if (leaveLabel && !flags.includes('medical_approved')) {
    return { bucket: 'fullabsent', reason: leaveLabel, netHHMM, netHours, flags: [...flags] };
  }
  if (!log || !log.office_in || !log.office_out) {
    return { bucket: 'absent', reason: 'No attendance log', netHHMM: '00:00', netHours: 0, flags: [] };
  }
  if (netHours < 4) {
    return { bucket: 'fullabsent', reason: 'Worked less than 4 hours', netHHMM, netHours, flags: ['lt4h'] };
  }
  const { isLate, isBeyondGrace } = evaluateLateLogin(log);
  if (isBeyondGrace) {
    return { bucket: 'halfabsent', reason: 'Late login beyond 10:15 AM', netHHMM, netHours, flags: ['late_beyond_grace'] };
  }
  const misuse = detectMisuseAfterLogin(log);
  if (misuse) {
    return { bucket: 'halfabsent', reason: 'Misuse of time after login', netHHMM, netHours, flags: ['misuse_after_login'] };
  }
  if (netHours < 8) {
    if (qualifiesHalfDayPresentBySlot(log)) {
      return { bucket: 'present', reason: 'Half-Day Present slot satisfied', netHHMM, netHours, flags: ['half_day_slot_present'] };
    }
    return { bucket: 'halfabsent', reason: 'Worked 4–8 hours without valid half-day slot', netHHMM, netHours, flags: ['ge4_lt8_no_slot'] };
  }
  return {
    bucket: 'present',
    reason: isLate ? 'Late within grace (counts toward monthly late)' : 'Present',
    netHHMM,
    netHours,
    flags: isLate ? ['late_within_grace'] : [],
  };
}

export function buildMonthlyPolicySets({ logsByDate, monthDays }) {
  const onePlusOne = new Set();
  const satMonAbuse = new Set();
  const satMonLeaveDates = [];
  let permittedLateCount = 0;
  for (const { iso } of monthDays) {
    const log = logsByDate.get(iso);
    if (log) {
      const late = evaluateLateLogin(log);
      if (late.isLate && late.isWithinGrace) permittedLateCount += 1;
    }
    if (log && log.leave_type) {
      const lt = String(log.leave_type || '').toLowerCase();
      const hasProof = !!log.medical_proof;
      const sudden = !!log.sudden_leave;
      const extension = !!log.leave_extension;
      const weekday = getWeekdayFromISO(iso);
      if (weekday === 6 || weekday === 1) satMonLeaveDates.push(iso);
      if (sudden || extension || (lt === 'medical' && !hasProof)) {
        onePlusOne.add(iso);
        onePlusOne.add(addDaysISO(iso, 1));
      }
    }
  }
  if (satMonLeaveDates.length > 1) {
    satMonLeaveDates.sort();
    for (let i = 1; i < satMonLeaveDates.length; i++) {
      const d = satMonLeaveDates[i];
      satMonAbuse.add(d);
      onePlusOne.add(d);
      onePlusOne.add(addDaysISO(d, 1));
    }
  }
  return {
    onePlusOneAbsentSet: onePlusOne,
    saturdayMondayAbuseSet: satMonAbuse,
    monthlyLateStats: {
      permittedLateCount,
      maxPermitted: MAX_PERMITTED_LATES_PER_MONTH,
      remaining: Math.max(0, MAX_PERMITTED_LATES_PER_MONTH - permittedLateCount),
    },
  };
}