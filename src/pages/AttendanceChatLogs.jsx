import React, { useEffect, useLayoutEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

// ─────────────────────────────────────────────────────────────────────────────
// POLICY CONSTANTS — must match AttendanceDashboard exactly
// ─────────────────────────────────────────────────────────────────────────────
const OFFICE_START        = "10:00:00";
const LATE_GRACE_LIMIT    = "10:15:00";
const MAX_PERMITTED_LATES = 6;
const HALF_SLOT_A_START   = "10:00:00";
const HALF_SLOT_A_END     = "14:30:00";
const HALF_SLOT_B_START   = "14:30:00";
const HALF_SLOT_B_END     = "19:00:00";
const LOGOUT_CUTOFF       = "19:00:00";

// ─────────────────────────────────────────────────────────────────────────────
// TIME UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function parseTime(timeStr) {
  if (!timeStr) return null;
  const cleaned = timeStr.split(".")[0];
  const parts = cleaned.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}

function diffMillis(startStr, endStr) {
  const a = parseTime(startStr), b = parseTime(endStr);
  if (!a || !b || b < a) return 0;
  return b - a;
}

function fmtHrsMin(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function millisToHours(ms) { return ms / (1000 * 60 * 60); }
const fmt = (t) => (t ? String(t).slice(0, 5) : "-");

// ─────────────────────────────────────────────────────────────────────────────
// NET WORK MILLIS
// ─────────────────────────────────────────────────────────────────────────────
function calculateNetWorkMillis(log) {
  const {
    office_in, office_out,
    break_in, break_out, break_in_2, break_out_2,
    lunch_in, lunch_out,
    extra_break_ins = [], extra_break_outs = [],
  } = log || {};
  if (!office_in || !office_out) return 0;

  const loginTime = parseTime(office_in);
  const officeStartTime = parseTime(OFFICE_START);
  let actualOfficeIn = office_in;
  if (loginTime && officeStartTime && loginTime < officeStartTime) actualOfficeIn = OFFICE_START;

  const officeOutTime = parseTime(office_out);
  const cutoffTime = parseTime(LOGOUT_CUTOFF);
  let adjustedOfficeOut = office_out;
  if (officeOutTime && cutoffTime && officeOutTime > cutoffTime) adjustedOfficeOut = LOGOUT_CUTOFF;

  const gross = diffMillis(actualOfficeIn, adjustedOfficeOut);
  let breaks = 0;
  if (break_in && break_out)     breaks += diffMillis(break_in, break_out);
  if (break_in_2 && break_out_2) breaks += diffMillis(break_in_2, break_out_2);
  if (lunch_in && lunch_out)     breaks += diffMillis(lunch_in, lunch_out);
  for (let i = 0; i < Math.min(extra_break_ins.length, extra_break_outs.length); i++) {
    if (extra_break_ins[i] && extra_break_outs[i])
      breaks += diffMillis(extra_break_ins[i], extra_break_outs[i]);
  }
  const net = gross - breaks;
  return net < 0 ? 0 : net;
}

// ─────────────────────────────────────────────────────────────────────────────
// LATE LOGIN EVALUATION
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// HALF DAY SLOT CHECK
// ─────────────────────────────────────────────────────────────────────────────
function qualifiesHalfDayBySlot(log) {
  const { office_in, office_out } = log || {};
  if (!office_in || !office_out) return false;
  const inT  = parseTime(office_in);
  const outT = parseTime(office_out);
  if (!inT || !outT || outT <= inT) return false;
  const slotAStart = parseTime(HALF_SLOT_A_START);
  const slotAEnd   = parseTime(HALF_SLOT_A_END);
  const slotBStart = parseTime(HALF_SLOT_B_START);
  const slotBEnd   = parseTime(HALF_SLOT_B_END);
  const adjustedInT = (inT && slotAStart && inT < slotAStart) ? slotAStart : inT;
  const coversA = adjustedInT <= slotAStart && outT >= slotAEnd;
  const coversB = adjustedInT <= slotBStart && outT >= slotBEnd;
  const netHours = millisToHours(calculateNetWorkMillis(log));
  return netHours >= 4 && (coversA || coversB);
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY LATE STATS
// ─────────────────────────────────────────────────────────────────────────────
function buildMonthlyLateStats(logsByDate, daysInMonth) {
  let permittedLateCount = 0;
  const exceededDates = [];
  for (const { iso } of daysInMonth) {
    const log = logsByDate.get(iso);
    if (log) {
      const lateInfo = evaluateLateLogin(log);
      if (lateInfo.isLate && lateInfo.isWithinGrace) {
        permittedLateCount++;
        if (permittedLateCount > MAX_PERMITTED_LATES) exceededDates.push(iso);
      }
    }
  }
  return {
    permittedLateCount,
    exceededDates,
    maxPermitted: MAX_PERMITTED_LATES,
    remaining: Math.max(0, MAX_PERMITTED_LATES - permittedLateCount),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────
function classifyDayPolicy({ isoDate, weekday, log, holidaysMap, monthlyLateStats, leaveStatus, logsByDate }) {
  const netMillis = calculateNetWorkMillis(log || {});
  const netHours  = millisToHours(netMillis);
  const netHHMM   = fmtHrsMin(netMillis);
  const lateInfo  = evaluateLateLogin(log);
  const isExceededLate = monthlyLateStats.exceededDates?.includes(isoDate);

  if (weekday === 1) {
    const officeInTime = parseTime(log?.office_in);
    const cutoffTime   = parseTime("14:00:00");
    if (officeInTime && cutoffTime && officeInTime > cutoffTime) {
      return { bucket: "absent", reason: "Monday login after 2:00 PM — full day absent per policy", netHHMM: "0h 0m", netHours: 0, flags: ["monday_late_full_absent"] };
    }
  }

  // Sunday — cross-month safe
  if (weekday === 0) {
    const dateObj      = new Date(isoDate + "T00:00:00Z");
    const currentMonth = dateObj.getUTCMonth();
    const nextDay      = new Date(dateObj);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const isMonthEndSunday   = nextDay.getUTCMonth() !== currentMonth;
    const isMonthStartSunday = dateObj.getUTCDate() === 1;

    const saturdayDate = new Date(dateObj);
    saturdayDate.setUTCDate(saturdayDate.getUTCDate() - 1);
    const saturdayStr = saturdayDate.toISOString().slice(0, 10);

    const mondayDate = new Date(dateObj);
    mondayDate.setUTCDate(mondayDate.getUTCDate() + 1);
    const mondayStr = mondayDate.toISOString().slice(0, 10);

    const saturdayLog = logsByDate.get(saturdayStr) || {};
    const mondayLog   = logsByDate.get(mondayStr)   || {};

    const logoutSatTime    = parseTime(saturdayLog.office_out);
    const cutoffLogoutTime = parseTime(LOGOUT_CUTOFF);
    const loginMondayTime  = parseTime(mondayLog.office_in);
    const lateGraceTime    = parseTime(LATE_GRACE_LIMIT);

    const satConditionMet =
      (logoutSatTime && cutoffLogoutTime && logoutSatTime >= cutoffLogoutTime) ||
      (saturdayLog.leave_type &&
        (saturdayLog.leave_type.toLowerCase().includes("paid") ||
         saturdayLog.leave_type.toLowerCase().includes("half") ||
         saturdayLog.leave_type.toLowerCase().includes("earned")));

    const monLoggedInOnTime = loginMondayTime && lateGraceTime && loginMondayTime <= lateGraceTime;
    const monIsEarnedLeave  = mondayLog.leave_type && mondayLog.leave_type.toLowerCase().includes("earned");
    const monConditionMet   = monLoggedInOnTime || monIsEarnedLeave;

    if (isMonthStartSunday) {
      if (monConditionMet) {
        if (holidaysMap.has(isoDate)) {
          return { bucket: "holiday", reason: `Paid Holiday: ${holidaysMap.get(isoDate).name}`, netHHMM: "0h 0m", netHours: 0, flags: ["paid_holiday"] };
        }
        return { bucket: "holiday", reason: "Sunday Holiday (Month starts on Sunday — only Monday checked)", netHHMM: "0h 0m", netHours: 0, flags: ["sunday_special_holiday", "month_start_sunday"] };
      }
    } else {
      if (satConditionMet && monConditionMet) {
        if (holidaysMap.has(isoDate)) {
          return { bucket: "holiday", reason: `Paid Holiday: ${holidaysMap.get(isoDate).name}`, netHHMM: "0h 0m", netHours: 0, flags: ["paid_holiday"] };
        }
        return {
          bucket: "holiday",
          reason: isMonthEndSunday
            ? "Sunday Holiday (Month-end Sat ≥7PM or Leave & Mon ≤10:15AM or Earned Leave)"
            : "Sunday Holiday (Weekend Sat ≥7PM or Leave & Mon ≤10:15AM or Earned Leave)",
          netHHMM: "0h 0m", netHours: 0, flags: ["sunday_special_holiday"],
        };
      }
    }

    if (holidaysMap.has(isoDate)) {
      return { bucket: "holiday", reason: `Paid Holiday: ${holidaysMap.get(isoDate).name}`, netHHMM: "0h 0m", netHours: 0, flags: ["paid_holiday"] };
    }

    return {
      bucket: "absent",
      reason: isMonthStartSunday
        ? `Sunday Absent (Month-start Sunday, Mon:${monConditionMet ? "✅" : "❌"})`
        : `Sunday Absent (Sat:${satConditionMet ? "✅" : "❌"} Mon:${monConditionMet ? "✅" : "❌"})`,
      netHHMM: "0h 0m", netHours: 0, flags: ["sunday_absent"],
    };
  }

  if (log?.leave_type?.toLowerCase().includes("earned") && netHours >= 4) {
    return { bucket: "fullday_and_earned_leave", reason: "Earned Leave (Half-Day) + Worked > 4h = Full Day", netHHMM, netHours, flags: ["earned_leave_fullday_override"] };
  }
  if (holidaysMap.has(isoDate)) {
    return { bucket: "holiday", reason: `Paid Holiday: ${holidaysMap.get(isoDate).name}`, netHHMM: "0h 0m", netHours: 0, flags: ["paid_holiday"] };
  }
  if (leaveStatus && (leaveStatus === "Pending" || leaveStatus === "Rejected")) {
    if (!log || !log.office_in || !log.office_out) {
      return { bucket: "absent", reason: `Leave ${leaveStatus.toLowerCase()} - treated as absent with grace`, netHHMM: "0h 0m", netHours: 0, flags: ["grace_absent", `leave_${leaveStatus.toLowerCase()}`] };
    }
  }
  if (log?.leave_type?.toLowerCase().includes("earned")) {
    return { bucket: "paidleave", reason: `Paid Leave: ${log.leave_type}`, netHHMM: "0h 0m", netHours: 0, flags: ["paid_leave"] };
  }
  if (log?.leave_type && !log.leave_type.toLowerCase().includes("earned")) {
    return { bucket: "absent", reason: `${log.leave_type} (unpaid)`, netHHMM: "0h 0m", netHours: 0, flags: ["unpaid_leave"] };
  }
  if (!log?.office_in || !log?.office_out) {
    return { bucket: "absent", reason: "No attendance log", netHHMM: "0h 0m", netHours: 0, flags: [] };
  }

  const logoutTime   = parseTime(log.office_out);
  const logoutCutoff = parseTime(LOGOUT_CUTOFF);
  const logoutBefore = logoutTime && logoutCutoff && logoutTime < logoutCutoff;
  const logoutAfter  = logoutTime && logoutCutoff && logoutTime >= logoutCutoff;

  if (logoutAfter && netHours >= 4 && netHours < 8) {
    return { bucket: "halfday", reason: "Worked 4–8 hours and logged out at/after 7 PM (Half Day)", netHHMM, netHours, flags: ["logout_after7pm_halfday"] };
  }
  if (logoutBefore) {
    if (netHours >= 8) return { bucket: "halfday", reason: "Worked >8h but logged out before 7 PM (Half Day)", netHHMM, netHours, flags: ["early_logout_halfday"] };
    if (netHours < 4)  return { bucket: "absent",  reason: "Worked <4h + logout before 7 PM (Absent)",        netHHMM, netHours, flags: ["early_logout_absent"] };
  }
  if ((lateInfo.isLate && lateInfo.isWithinGrace && isExceededLate) || (lateInfo.isLate && lateInfo.isBeyondGrace)) {
    if (netHours >= 8) return { bucket: "halfday", reason: "Late beyond limit (Half Day)",     netHHMM, netHours, flags: ["late_exceeded_or_beyond_grace"] };
    return {            bucket: "absent",  reason: "Late beyond limit + <8h (Absent)",         netHHMM, netHours, flags: ["absent_late_less_than_8h"] };
  }
  if (netHours < 4) return { bucket: "absent",  reason: "Worked <4h (Absent)", netHHMM, netHours, flags: ["lt4h"] };
  if (netHours < 8) {
    if (qualifiesHalfDayBySlot(log)) return { bucket: "halfday", reason: "Half-Day slot satisfied", netHHMM, netHours, flags: ["half_day_slot_present"] };
    return { bucket: "halfday", reason: "Worked 4–8h", netHHMM, netHours, flags: ["ge4_lt8_no_slot"] };
  }
  return { bucket: "fullday", reason: "Full Day Present", netHHMM, netHours, flags: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTH DAYS BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function getMonthDays(yearMonth) {
  const [year, mon] = yearMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return Array.from({ length: lastDay }, (_, i) => {
    const d = new Date(Date.UTC(year, mon - 1, i + 1));
    return { day: i + 1, dow: DOW[d.getUTCDay()], iso: d.toISOString().slice(0, 10), weekday: d.getUTCDay(), date: d };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL ANALYSIS FOR ONE USER
// ─────────────────────────────────────────────────────────────────────────────
function analyzeUser(user, month, holidaysMap = new Map()) {
  const daysInMonth = getMonthDays(month);
  const logsByDate = new Map();
  (user.attendance || []).forEach((l) => { if (l?.date) logsByDate.set(l.date, l); });
  const monthlyLateStats = buildMonthlyLateStats(logsByDate, daysInMonth);

  const dayResults = daysInMonth.map(({ iso, weekday, dow, day, date }) => {
    const log = logsByDate.get(iso);
    const cls = classifyDayPolicy({ isoDate: iso, weekday, log, holidaysMap, monthlyLateStats, leaveStatus: log?.leave_status || null, logsByDate });
    const netMs = calculateNetWorkMillis(log || {});
    return { iso, weekday, dow, day, date, log, netMs, ...cls };
  });

  const todayISO = new Date().toISOString().slice(0, 10);
  let fullDays = 0, halfDays = 0, paidLeaves = 0, absentDays = 0, holidayDays = 0;
  let totalNetMillis = 0, workDayCount = 0, lateCount = 0;

  for (const d of dayResults) {
    if (d.iso > todayISO) continue;
    switch (d.bucket) {
      case "fullday":
      case "fullday_and_earned_leave": fullDays++;    break;
      case "halfday":                  halfDays++;    break;
      case "paidleave":                paidLeaves++;  break;
      case "holiday":                  holidayDays++; break;
      default:                         absentDays++;  break;
    }
    if (d.netMs > 0) { totalNetMillis += d.netMs; workDayCount++; }
    if (evaluateLateLogin(d.log).isLate) lateCount++;
  }

  const extraFullFromHalfs = Math.floor(halfDays / 2);
  fullDays  += extraFullFromHalfs;
  halfDays   = halfDays % 2;
  const avgNetMillis = workDayCount > 0 ? Math.round(totalNetMillis / workDayCount) : null;

  return { dayResults, logsByDate, monthlyLateStats, fullDays, halfDays, paidLeaves, absentDays, holidayDays, lateCount, totalNetMillis, avgNetMillis, workDayCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUCKET COLOURS
// ─────────────────────────────────────────────────────────────────────────────
const BUCKET_COLORS = {
  fullday:                  { bg: "#b9f6ca", color: "#1B5E20", label: "Full Day ✅" },
  fullday_and_earned_leave: { bg: "#f3e5f5", color: "#6A1B9A", label: "Full+PL 🟣" },
  halfday:                  { bg: "#ffe082", color: "#5D4037", label: "Half Day 🌓" },
  paidleave:                { bg: "#ce93d8", color: "#4A148C", label: "Paid Leave 🟣" },
  holiday:                  { bg: "#90caf9", color: "#1E3A8A", label: "Holiday 🔵" },
  absent:                   { bg: "#ffcdd2", color: "#B71C1C", label: "Absent ❌" },
};

const BUCKET_XL = {
  fullday:                  { bg: "B9F6CA", font: "1B5E20" },
  fullday_and_earned_leave: { bg: "F3E5F5", font: "6A1B9A" },
  halfday:                  { bg: "FFE082", font: "5D4037" },
  paidleave:                { bg: "CE93D8", font: "4A148C" },
  holiday:                  { bg: "90CAF9", font: "1E3A8A" },
  absent:                   { bg: "FFCDD2", font: "B71C1C" },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL DOWNLOAD
// ─────────────────────────────────────────────────────────────────────────────
function downloadAttendanceExcel(userLogs, month, holidaysMap = new Map()) {
  const wb    = XLSX.utils.book_new();
  const dates = getMonthDays(month);
  const filteredUsers = userLogs.filter((u) => u.role !== "chairman");

  const C = {
    gold: "FFD700", navy: "1E3A8A", navyDark: "1E40AF",
    white: "FFFFFF", black: "000000",
    lateBg: "FFA040",
    logoutBg: "E0F2FE", logoutFont: "0369A1",
    noOutBg: "FEE2E2", noOutFont: "991B1B",
    rowWhite: "FFFFFF", rowAlt: "EFF6FF",
    breakBg: "FFF3CD", remarkFont: "6B21A8",
    totalRowBg: "1E3A8A", subHeaderBg: "DBEAFE", inOutHdr: "93C5FD",
  };
  const thinB = { style: "thin",   color: { rgb: "CCCCCC" } };
  const medB  = { style: "medium", color: { rgb: "1E40AF" } };
  const hdrB  = { style: "thin",   color: { rgb: "999999" } };
  const tb    = { top: thinB, bottom: thinB, left: thinB, right: thinB };
  const mb    = { top: medB,  bottom: medB,  left: medB,  right: medB  };
  const hb    = { top: hdrB,  bottom: hdrB,  left: hdrB,  right: hdrB  };

  function cs(bg, fontRgb = "000000", bold = false, alignLeft = false, border = tb) {
    return {
      font: { bold, color: { rgb: fontRgb }, name: "Arial", sz: 9 },
      fill: { fgColor: { rgb: bg } },
      alignment: { horizontal: alignLeft ? "left" : "center", vertical: "center", wrapText: true },
      border,
    };
  }
  function wc(ws, r, c, value, style) {
    const ref = XLSX.utils.encode_cell({ r, c });
    ws[ref] = { t: typeof value === "number" ? "n" : value == null ? "z" : "s", v: value ?? "", s: style };
  }

  // SHEET 1: OVERVIEW
  (() => {
    const ws = {};
    ws["!merges"] = [];
    const FL = ["S.NO","Name","Designation","Late Logins","Full Days","Half Days","Paid Leave","Absent Days","Avg Net Work"];
    const FX = FL.length;
    const totalCols = FX + dates.length * 2;

    FL.forEach((label, c) => { wc(ws, 0, c, label, { ...cs(C.gold, C.black, true), border: hb }); });
    dates.forEach((d, i) => {
      const col = FX + i * 2;
      const isSpecial = d.weekday === 0 || holidaysMap.has(d.iso);
      const bg = isSpecial ? BUCKET_XL.holiday.bg : C.gold;
      const fg = isSpecial ? BUCKET_XL.holiday.font : C.black;
      wc(ws, 0, col, d.dow, { ...cs(bg, fg, true), border: hb });
      wc(ws, 0, col + 1, "", { ...cs(bg, fg, true), border: hb });
      ws["!merges"].push({ s: { r: 0, c: col }, e: { r: 0, c: col + 1 } });
    });

    FL.forEach((_, c) => { wc(ws, 1, c, "", { ...cs(C.subHeaderBg, C.navy, true), border: hb }); });
    dates.forEach((d, i) => {
      const col = FX + i * 2;
      const isSpecial = d.weekday === 0 || holidaysMap.has(d.iso);
      const bg = isSpecial ? BUCKET_XL.holiday.bg : C.subHeaderBg;
      wc(ws, 1, col, d.day, { ...cs(bg, C.navy, true), border: hb });
      wc(ws, 1, col + 1, "", { ...cs(bg, C.navy, true), border: hb });
      ws["!merges"].push({ s: { r: 1, c: col }, e: { r: 1, c: col + 1 } });
    });

    FL.forEach((_, c) => { wc(ws, 2, c, "", { ...cs(C.inOutHdr, C.navy, true), border: hb }); });
    dates.forEach((d, i) => {
      const col = FX + i * 2;
      const isSpecial = d.weekday === 0 || holidaysMap.has(d.iso);
      const bg = isSpecial ? BUCKET_XL.holiday.bg : C.inOutHdr;
      wc(ws, 2, col, "IN",  { ...cs(bg, C.navy, true), border: hb });
      wc(ws, 2, col + 1, "OUT", { ...cs(isSpecial ? BUCKET_XL.holiday.bg : C.logoutBg, isSpecial ? C.navy : C.logoutFont, true), border: hb });
    });

    filteredUsers.forEach((user, idx) => {
      const { dayResults, fullDays, halfDays, paidLeaves, absentDays, lateCount, avgNetMillis } = analyzeUser(user, month, holidaysMap);
      const excelRow = idx + 3;
      const rowBg    = idx % 2 === 0 ? C.rowWhite : C.rowAlt;

      wc(ws, excelRow, 0, idx + 1,                             cs(rowBg, C.navy, true));
      wc(ws, excelRow, 1, user.name || user.email,             cs(rowBg, C.navy, true, true));
      wc(ws, excelRow, 2, user.designation || user.role || "", cs(rowBg, "374151", false, true));
      wc(ws, excelRow, 3, lateCount,  cs(lateCount > 0 ? C.lateBg : rowBg, C.black, lateCount > 0));
      wc(ws, excelRow, 4, fullDays,   cs(fullDays > 0 ? BUCKET_XL.fullday.bg : rowBg, fullDays > 0 ? BUCKET_XL.fullday.font : C.black, fullDays > 0));
      wc(ws, excelRow, 5, halfDays,   cs(halfDays > 0 ? BUCKET_XL.halfday.bg : rowBg, halfDays > 0 ? BUCKET_XL.halfday.font : C.black, halfDays > 0));
      wc(ws, excelRow, 6, paidLeaves, cs(paidLeaves > 0 ? BUCKET_XL.paidleave.bg : rowBg, paidLeaves > 0 ? BUCKET_XL.paidleave.font : C.black, paidLeaves > 0));
      wc(ws, excelRow, 7, absentDays, cs(absentDays > 0 ? BUCKET_XL.absent.bg : rowBg, absentDays > 0 ? BUCKET_XL.absent.font : C.black, absentDays > 0));
      wc(ws, excelRow, 8, avgNetMillis !== null ? fmtHrsMin(avgNetMillis) : "-",
        cs(avgNetMillis !== null && avgNetMillis < 28800000 ? BUCKET_XL.absent.bg : rowBg,
           avgNetMillis !== null && avgNetMillis < 28800000 ? BUCKET_XL.absent.font : C.black));

      dayResults.forEach((d, i) => {
        const col = FX + i * 2;
        const xl  = BUCKET_XL[d.bucket] || BUCKET_XL.absent;
        const log = d.log;
        const hasLogout = !!(log?.office_out);

        if (d.bucket === "holiday") {
          const label = holidaysMap.has(d.iso) ? "HOL" : (d.weekday === 0 ? "SUN" : "HOL");
          wc(ws, excelRow, col, label, cs(xl.bg, xl.font, true));
          wc(ws, excelRow, col + 1, "-", cs(xl.bg, xl.font));
          return;
        }
        if (d.bucket === "paidleave") {
          wc(ws, excelRow, col, "PL", cs(xl.bg, xl.font, true));
          wc(ws, excelRow, col + 1, "-", cs(xl.bg, xl.font));
          return;
        }
        if (d.bucket === "absent") {
          const lbl = d.flags?.includes("lt4h") ? "<4h" : d.flags?.includes("sunday_absent") ? "SUN" : "A";
          wc(ws, excelRow, col, lbl, cs(xl.bg, xl.font, true));
          wc(ws, excelRow, col + 1, "-", cs(xl.bg, xl.font));
          return;
        }
        const loginVal  = log?.office_in  ? fmt(log.office_in)  : "?";
        const logoutVal = hasLogout ? fmt(log.office_out) : "No Out";
        wc(ws, excelRow, col, loginVal, cs(xl.bg, xl.font, d.bucket === "halfday"));
        wc(ws, excelRow, col + 1, logoutVal, cs(hasLogout ? C.logoutBg : C.noOutBg, hasLogout ? C.logoutFont : C.noOutFont));
      });
    });

    ws["!cols"] = [
      { wch: 5 }, { wch: 28 }, { wch: 26 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 13 },
      ...dates.flatMap(() => [{ wch: 7 }, { wch: 7 }]),
    ];
    ws["!rows"] = [{ hpt: 22 }, { hpt: 18 }, { hpt: 16 }, ...filteredUsers.map(() => ({ hpt: 18 }))];
    ws["!ref"]  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: filteredUsers.length + 2, c: totalCols - 1 } });

    const legendRow = filteredUsers.length + 4;
    wc(ws, legendRow - 1, 0, "📌 LEGEND — Colours match your Attendance Dashboard calendar", { ...cs(C.subHeaderBg, C.navy, true, true), border: mb });
    const legs = [
      ["🟢 Full Day (8h+ / full slot)",      BUCKET_XL.fullday.bg,    BUCKET_XL.fullday.font],
      ["🌓 Half Day (4–8h)",                 BUCKET_XL.halfday.bg,    BUCKET_XL.halfday.font],
      ["❌ Absent (<4h / no log / late>lim)", BUCKET_XL.absent.bg,    BUCKET_XL.absent.font],
      ["🟣 Paid Leave (Earned)",              BUCKET_XL.paidleave.bg, BUCKET_XL.paidleave.font],
      ["🔵 Sunday / Holiday",                BUCKET_XL.holiday.bg,   BUCKET_XL.holiday.font],
      ["🟠 Late Login",                       C.lateBg,               C.black],
      ["🟦 Has Logout",                       C.logoutBg,             C.logoutFont],
      ["🔺 No Logout",                        C.noOutBg,              C.noOutFont],
    ];
    legs.forEach(([label, bg, font], i) => { wc(ws, legendRow, i, label, { ...cs(bg, font, true, true), border: mb }); });
    XLSX.utils.book_append_sheet(wb, ws, "📊 Overview");
  })();

  // SHEET PER EMPLOYEE
  filteredUsers.forEach((user) => {
    const ws = {};
    ws["!merges"] = [];
    let row = 0;
    const COLS = 19;
    const { dayResults, monthlyLateStats, fullDays, halfDays, paidLeaves, absentDays, totalNetMillis, avgNetMillis, workDayCount } = analyzeUser(user, month, holidaysMap);

    const tRef = XLSX.utils.encode_cell({ r: row, c: 0 });
    ws[tRef] = {
      t: "s",
      v: `👤  ${user.name || user.email}   |   ${user.designation || user.role || "—"}   |   Month: ${month}`,
      s: { font: { bold: true, color: { rgb: C.white }, name: "Arial", sz: 13 }, fill: { fgColor: { rgb: C.navyDark } }, alignment: { horizontal: "left", vertical: "center" }, border: mb },
    };
    ws["!merges"].push({ s: { r: row, c: 0 }, e: { r: row, c: COLS - 1 } });
    row++;

    const legs = [
      { t: "Full Day 🟢 (8h+)",        bg: BUCKET_XL.fullday.bg,    f: BUCKET_XL.fullday.font },
      { t: "Half Day 🌓 (4–8h)",       bg: BUCKET_XL.halfday.bg,    f: BUCKET_XL.halfday.font },
      { t: "Absent ❌ (<4h / no log)", bg: BUCKET_XL.absent.bg,     f: BUCKET_XL.absent.font },
      { t: "Paid Leave 🟣",            bg: BUCKET_XL.paidleave.bg,  f: BUCKET_XL.paidleave.font },
      { t: "Holiday/Sunday 🔵",        bg: BUCKET_XL.holiday.bg,    f: BUCKET_XL.holiday.font },
      { t: "Late Login 🟠",            bg: C.lateBg,                f: C.black },
    ];
    legs.forEach(({ t, bg, f }, i) => {
      wc(ws, row, i * 3, t, { ...cs(bg, f, true, true), border: mb });
      [1, 2].forEach((o) => { wc(ws, row, i * 3 + o, "", cs(bg, f)); });
      ws["!merges"].push({ s: { r: row, c: i * 3 }, e: { r: row, c: i * 3 + 2 } });
    });
    row++;

    const hdrs = ["Date","Day","Status","Login","Break IN","Break OUT","Lunch IN","Lunch OUT","Break2 IN","Break2 OUT","Extra Breaks IN","Extra Breaks OUT","Logout","Gross Work","Break Deducted","Net Work Hrs","Late?","Classification","Remarks"];
    const hS = { font: { bold: true, color: { rgb: C.white }, name: "Arial", sz: 10 }, fill: { fgColor: { rgb: C.navyDark } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: mb };
    hdrs.forEach((h, c) => { const ref = XLSX.utils.encode_cell({ r: row, c }); ws[ref] = { t: "s", v: h, s: hS }; });
    row++;

    let totalGrossMs = 0;
    dayResults.forEach((d) => {
      const { iso, dow, bucket, reason, log } = d;
      const isLate = evaluateLateLogin(log).isLate;
      const netMs  = d.netMs;
      let grossMs = 0, deductMs = 0;
      if (log?.office_in && log?.office_out) {
        const lT = parseTime(log.office_in), oT = parseTime(OFFICE_START);
        const aI = (lT && oT && lT < oT) ? OFFICE_START : log.office_in;
        const ouT = parseTime(log.office_out), cT = parseTime(LOGOUT_CUTOFF);
        const aO = (ouT && cT && ouT > cT) ? LOGOUT_CUTOFF : log.office_out;
        grossMs  = diffMillis(aI, aO);
        deductMs = Math.max(0, grossMs - netMs);
        totalGrossMs += grossMs;
      }
      const xl    = BUCKET_XL[bucket] || BUCKET_XL.absent;
      const rowBg = row % 2 === 0 ? C.rowWhite : C.rowAlt;
      const base  = (bg, f, b, al) => cs(bg ?? rowBg, f ?? C.black, b ?? false, al ?? false);
      const logoutVal = log?.office_out ? fmt(log.office_out) : (bucket === "absent" || bucket === "holiday" || bucket === "paidleave") ? "-" : "No Out";
      const logoutSt  = log?.office_out ? cs(C.logoutBg, C.logoutFont, false) : (bucket === "absent" || bucket === "holiday" || bucket === "paidleave") ? base() : cs(C.noOutBg, C.noOutFont, true);
      const eI = (log?.extra_break_ins  || []).join(" | ") || "-";
      const eO = (log?.extra_break_outs || []).join(" | ") || "-";
      let netBg = rowBg, netFont = C.black, netBold = false;
      if (netMs > 0) {
        if      (netMs < 14400000) { netBg = xl.bg; netFont = xl.font; netBold = true; }
        else if (netMs < 28800000) { netBg = BUCKET_XL.halfday.bg; netFont = BUCKET_XL.halfday.font; netBold = true; }
        else                       { netBg = BUCKET_XL.fullday.bg; netFont = BUCKET_XL.fullday.font; }
      }
      wc(ws, row, 0,  iso,                                    base());
      wc(ws, row, 1,  dow,                                    base(bucket === "holiday" ? xl.bg : rowBg, bucket === "holiday" ? xl.font : C.black, bucket === "holiday"));
      wc(ws, row, 2,  BUCKET_COLORS[bucket]?.label || bucket, cs(xl.bg, xl.font, true));
      wc(ws, row, 3,  log ? fmt(log.office_in)  : "-",        base(isLate ? C.lateBg : null, isLate ? C.black : null, isLate));
      wc(ws, row, 4,  log ? fmt(log.break_in)   : "-",        base(C.breakBg, C.black));
      wc(ws, row, 5,  log ? fmt(log.break_out)  : "-",        base(C.breakBg, C.black));
      wc(ws, row, 6,  log ? fmt(log.lunch_in)   : "-",        base(C.breakBg, C.black));
      wc(ws, row, 7,  log ? fmt(log.lunch_out)  : "-",        base(C.breakBg, C.black));
      wc(ws, row, 8,  log ? fmt(log.break_in_2) : "-",        base(C.breakBg, C.black));
      wc(ws, row, 9,  log ? fmt(log.break_out_2): "-",        base(C.breakBg, C.black));
      wc(ws, row, 10, eI,                                     base(C.breakBg, C.black));
      wc(ws, row, 11, eO,                                     base(C.breakBg, C.black));
      wc(ws, row, 12, logoutVal,                              logoutSt);
      wc(ws, row, 13, grossMs > 0 ? fmtHrsMin(grossMs) : "-", base());
      wc(ws, row, 14, deductMs > 0 ? `-${fmtHrsMin(deductMs)}` : (grossMs > 0 ? "None" : "-"), base(C.breakBg, C.black));
      wc(ws, row, 15, netMs > 0 ? fmtHrsMin(netMs) : "-",    cs(netBg, netFont, netBold));
      wc(ws, row, 16, isLate ? "⚠️ LATE" : (bucket === "holiday" || bucket === "absent") ? "—" : "✅ OK", cs(isLate ? C.lateBg : rowBg, C.black));
      wc(ws, row, 17, BUCKET_COLORS[bucket]?.label || bucket, cs(xl.bg, xl.font, true));
      wc(ws, row, 18, reason || log?.paid_leave_reason || log?.reason || "-", { ...cs(rowBg, C.remarkFont, false, true) });
      row++;
    });
    row++;

    const totalDeductMs = Math.max(0, totalGrossMs - totalNetMillis);
    const sRows = [
      ["📋 MONTHLY SUMMARY (matches your Dashboard)",    "",                                          C.navyDark, C.gold],
      ["📅 Work Days Recorded",                          workDayCount,                                C.navy,     C.white],
      [`⏰ Late Logins (grace ≤${MAX_PERMITTED_LATES})`, `${monthlyLateStats.permittedLateCount}/${MAX_PERMITTED_LATES} (${monthlyLateStats.remaining} left)`, C.navy, C.white],
      ["🟢 Full Days (incl. paired halves)",             fullDays,  BUCKET_XL.fullday.bg,  BUCKET_XL.fullday.font],
      ["🌓 Half Days (unpaired)",                        halfDays,  halfDays > 0 ? BUCKET_XL.halfday.bg : C.navy,    halfDays > 0 ? BUCKET_XL.halfday.font : C.white],
      ["🟣 Paid Leaves",                                 paidLeaves, paidLeaves > 0 ? BUCKET_XL.paidleave.bg : C.navy, paidLeaves > 0 ? BUCKET_XL.paidleave.font : C.white],
      ["❌ Absent Days",                                 absentDays, absentDays > 0 ? BUCKET_XL.absent.bg : C.navy,   absentDays > 0 ? BUCKET_XL.absent.font : C.white],
      ["⏱ Total Gross Work Hours",                       fmtHrsMin(totalGrossMs), C.navy, C.white],
      ["☕ Total Break + Lunch Deducted",                 `-${fmtHrsMin(totalDeductMs)}`, C.breakBg, C.black],
      ["🕐 Total Net Work Hours",                        fmtHrsMin(totalNetMillis), C.navy, C.gold],
      ["📊 Avg Daily Net Work",                          avgNetMillis !== null ? fmtHrsMin(avgNetMillis) : "-", avgNetMillis !== null && avgNetMillis < 28800000 ? BUCKET_XL.absent.bg : C.navy, avgNetMillis !== null && avgNetMillis < 28800000 ? BUCKET_XL.absent.font : C.gold],
    ];
    sRows.forEach(([label, value, vBg, vFont]) => {
      const lSt = { font: { bold: true, color: { rgb: C.white }, name: "Arial", sz: 10 }, fill: { fgColor: { rgb: C.totalRowBg } }, alignment: { horizontal: "right", vertical: "center" }, border: mb };
      const vSt = { font: { bold: true, color: { rgb: vFont }, name: "Arial", sz: 11 }, fill: { fgColor: { rgb: vBg } }, alignment: { horizontal: "center", vertical: "center" }, border: mb };
      wc(ws, row, 0, label, lSt);
      wc(ws, row, 1, value, vSt);
      for (let c = 2; c < COLS; c++) wc(ws, row, c, "", { font: { color: { rgb: C.white } }, fill: { fgColor: { rgb: C.navy } }, border: tb });
      ws["!merges"].push({ s: { r: row, c: 2 }, e: { r: row, c: COLS - 1 } });
      row++;
    });

    if (monthlyLateStats.permittedLateCount > MAX_PERMITTED_LATES) {
      const ref = XLSX.utils.encode_cell({ r: row, c: 0 });
      ws[ref] = {
        t: "s",
        v: `🔶  LATE RULE: ${user.name || user.email} used ${monthlyLateStats.permittedLateCount} grace late logins (max ${MAX_PERMITTED_LATES}). Exceeded dates: ${monthlyLateStats.exceededDates.join(", ")}`,
        s: { font: { bold: true, color: { rgb: "7C3E00" }, name: "Arial", sz: 11 }, fill: { fgColor: { rgb: C.lateBg } }, alignment: { horizontal: "left", vertical: "center", wrapText: true }, border: mb },
      };
      ws["!merges"].push({ s: { r: row, c: 0 }, e: { r: row, c: COLS - 1 } });
      row++;
    }

    ws["!cols"] = [
      { wch: 12 }, { wch: 5 }, { wch: 14 }, { wch: 8 }, { wch: 9 }, { wch: 9 },
      { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 },
      { wch: 18 }, { wch: 18 }, { wch: 9 },
      { wch: 11 }, { wch: 16 }, { wch: 13 },
      { wch: 10 }, { wch: 14 }, { wch: 36 },
    ];
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: COLS - 1 } });
    XLSX.utils.book_append_sheet(wb, ws, (user.name || user.email || "Emp").replace(/[\\/?*[\]:]/g, "").slice(0, 31));
  });

  XLSX.writeFile(wb, `Attendance_${month}.xlsx`);
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE-LEVEL COMPONENTS (unchanged)
// ═════════════════════════════════════════════════════════════════════════════

function HistoryRow({ date, historyLogs }) {
  const history   = historyLogs[date] || [];
  const editCount = history.length;
  const [open, setOpen] = useState(false);
  if (editCount === 0) return <div style={{ display: "none" }} />;
  return (
    <div style={CS.historyWrap}>
      <button style={CS.historyBtn} onClick={() => setOpen((v) => !v)}>
        {open ? "▲ Hide Edit History" : `📝 ${editCount} edit${editCount > 1 ? "s" : ""} — View History`}
      </button>
      {open && history.map((h, i) => (
        <div key={i} style={CS.historyCard}>
          <div style={CS.historyMeta}>
            <b>Before edit #{editCount - i}</b>
            <span>By: {h.edited_by_email || h.edited_by_user_id}</span>
            <span>{new Date(h.edited_at).toLocaleString()}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={CS.historyTable}>
              <thead><tr>
                {["Login","B.IN","B.OUT","L.IN","L.OUT","B2.IN","B2.OUT","Logout","Extra INs","Extra OUTs","Remarks"].map((col) =>
                  <th key={col} style={CS.historyTh}>{col}</th>
                )}
              </tr></thead>
              <tbody><tr>
                {[h.office_in,h.break_in,h.break_out,h.lunch_in,h.lunch_out,h.break_in_2,h.break_out_2,h.office_out].map((v, j) =>
                  <td key={j} style={CS.historyTd}>{fmt(v)}</td>
                )}
                <td style={CS.historyTd}>{(h.extra_break_ins||[]).join(", ")||"-"}</td>
                <td style={CS.historyTd}>{(h.extra_break_outs||[]).join(", ")||"-"}</td>
                <td style={CS.historyTd}>{h.paid_leave_reason||h.reason||"-"}</td>
              </tr></tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function LogTable({
  attendance, isEditing, editData, editedFields, changedFields,
  historyLogs, historyLoading, lastSavedDate, activeInputId,
  onFieldChange, onFocus, todayStr, month, holidaysMap,
}) {
  const refs = useRef({});
  useEffect(() => {
    if (activeInputId) {
      const el = refs.current[activeInputId];
      if (el) el.focus({ preventScroll: true });
    }
  }, [activeInputId]);

  const dayClassMap = useMemo(() => {
    const { dayResults } = analyzeUser({ attendance: attendance || [] }, month, holidaysMap || new Map());
    const m = {};
    dayResults.forEach((d) => { m[d.iso] = d; });
    return m;
  }, [attendance, month, holidaysMap]);

  return (
    <div style={CS.tableScroll}>
      <table style={CS.table}>
        <thead>
          <tr>
            {["DATE","STATUS","LOGIN","B.IN","B.OUT","L.IN","L.OUT","B2.IN","B2.OUT","LOGOUT","GROSS","BREAK DED.","NET WORK","EXTRA B.INS","EXTRA B.OUTS","REMARKS"].map((h) =>
              <th key={h} style={CS.th}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {historyLoading ? (
            <tr><td colSpan={16} style={CS.loadingTd}>Loading history…</td></tr>
          ) : (attendance || []).map((log, idx) => {
            const dayInfo = dayClassMap[log.date] || {};
            const bucket  = dayInfo.bucket || "absent";
            const bStyle  = BUCKET_COLORS[bucket] || BUCKET_COLORS.absent;
            const isLate  = evaluateLateLogin(log).isLate;
            const netMs   = calculateNetWorkMillis(log);

            let grossMs = 0, deductMs = 0;
            if (log.office_in && log.office_out) {
              const lT = parseTime(log.office_in), oT = parseTime(OFFICE_START);
              const aI = (lT && oT && lT < oT) ? OFFICE_START : log.office_in;
              const ouT = parseTime(log.office_out), cT = parseTime(LOGOUT_CUTOFF);
              const aO = (ouT && cT && ouT > cT) ? LOGOUT_CUTOFF : log.office_out;
              grossMs  = diffMillis(aI, aO);
              deductMs = Math.max(0, grossMs - netMs);
            }

            const saved   = log.date === lastSavedDate;
            const rowData = isEditing && editData[log.date] ? editData[log.date] : log;
            const edF     = editedFields[log.date] || {};
            const chF     = changedFields[log.date] || {};
            const rowBg   = saved ? "#d1fae5" : idx % 2 === 0 ? "#fff" : "#f8faff";

            let netBg = "inherit", netColor = "#374151", netBold = false;
            if (netMs > 0) {
              if (netMs < 14400000)      { netBg = BUCKET_COLORS.absent.bg;  netColor = BUCKET_COLORS.absent.color;  netBold = true; }
              else if (netMs < 28800000) { netBg = BUCKET_COLORS.halfday.bg; netColor = BUCKET_COLORS.halfday.color; netBold = true; }
              else                       { netBg = BUCKET_COLORS.fullday.bg; netColor = BUCKET_COLORS.fullday.color; }
            }

            return (
              <React.Fragment key={log.date}>
                <tr style={{ background: rowBg }}>
                  <td style={CS.dateCell}>{log.date}</td>
                  <td style={CS.td}>
                    <span style={{ ...CS.statusPill, background: bStyle.bg, color: bStyle.color }}>{bStyle.label}</span>
                  </td>
                  {["office_in","break_in","break_out","lunch_in","lunch_out","break_in_2","break_out_2","office_out"].map((field) => {
                    const id = `${log.date}-${field}`;
                    let tdBg = {};
                    if (field === "office_in" && isLate) tdBg = { background: "#ffa040" };
                    if (field === "office_out" && log.office_out) tdBg = { background: "#e0f2fe" };
                    if (field === "office_out" && !log.office_out && log.office_in) tdBg = { background: "#fee2e2" };
                    return (
                      <td key={field} style={{ ...CS.td, ...tdBg, ...(isEditing && edF[field] ? CS.cellEdited : !isEditing && chF[field] ? CS.cellChanged : {}) }}>
                        {isEditing
                          ? <input type="time" ref={(el) => { refs.current[id] = el; }}
                              value={rowData[field] ? rowData[field].slice(0, 5) : ""}
                              onChange={(e) => onFieldChange(log.date, field, e.target.value)}
                              onFocus={() => onFocus(log.date, field)}
                              style={CS.timeInput} />
                          : <span style={CS.timeVal}>{fmt(log[field])}</span>
                        }
                      </td>
                    );
                  })}
                  <td style={{ ...CS.td, fontWeight: 600 }}>{grossMs > 0 ? fmtHrsMin(grossMs) : "-"}</td>
                  <td style={{ ...CS.td, color: "#b45309", fontWeight: 600, background: deductMs > 0 ? "#fef3c7" : "inherit" }}>
                    {deductMs > 0 ? `-${fmtHrsMin(deductMs)}` : grossMs > 0 ? "None" : "-"}
                  </td>
                  <td style={{ ...CS.td, fontWeight: netBold ? 700 : 400, background: netBg, color: netColor }}>
                    {netMs > 0 ? fmtHrsMin(netMs) : "-"}
                  </td>
                  <td style={CS.td}>
                    {isEditing
                      ? <input type="text" ref={(el) => { refs.current[`${log.date}-ebi`] = el; }}
                          style={CS.txtInput} value={(rowData.extra_break_ins||[]).join(",")}
                          placeholder="09:00,16:00"
                          onChange={(e) => onFieldChange(log.date,"extra_break_ins",e.target.value.split(",").map((v)=>v.trim()).filter(Boolean))}
                          onFocus={() => onFocus(log.date,"extra_break_ins")} />
                      : <span style={CS.timeVal}>{(log.extra_break_ins||[]).join(", ")||"-"}</span>
                    }
                  </td>
                  <td style={CS.td}>
                    {isEditing
                      ? <input type="text" ref={(el) => { refs.current[`${log.date}-ebo`] = el; }}
                          style={CS.txtInput} value={(rowData.extra_break_outs||[]).join(",")}
                          placeholder="12:00,18:00"
                          onChange={(e) => onFieldChange(log.date,"extra_break_outs",e.target.value.split(",").map((v)=>v.trim()).filter(Boolean))}
                          onFocus={() => onFocus(log.date,"extra_break_outs")} />
                      : <span style={CS.timeVal}>{(log.extra_break_outs||[]).join(", ")||"-"}</span>
                    }
                  </td>
                  <td style={CS.td}>
                    {isEditing
                      ? <input type="text" ref={(el) => { refs.current[`${log.date}-rem`] = el; }}
                          style={{ ...CS.txtInput, width: 150 }}
                          value={rowData.paid_leave_reason||rowData.reason||""}
                          placeholder="Remarks…"
                          onChange={(e) => onFieldChange(log.date,"paid_leave_reason",e.target.value)}
                          onFocus={() => onFocus(log.date,"paid_leave_reason")} />
                      : <span style={{ ...CS.timeVal, color: "#7c3aed", fontStyle: "italic" }}>
                          {dayInfo.reason || log.paid_leave_reason || log.reason || "—"}
                        </span>
                    }
                  </td>
                </tr>
                <tr>
                  <td colSpan={16} style={{ padding: 0, border: "none", background: "#fafbff" }}>
                    <HistoryRow date={log.date} historyLogs={historyLogs} />
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LogModal({
  user, isEditing, editSaving,
  editData, editedFields, changedFields,
  historyLogs, historyLoading, lastSavedDate, activeInputId,
  todayStr, scrollObj, month, holidaysMap,
  onFieldChange, onFocus,
  onStartEdit, onSave, onCancelEdit, onClose,
}) {
  const bodyRef = useRef(null);
  useLayoutEffect(() => {
    if (scrollObj.needRestore && bodyRef.current) {
      bodyRef.current.scrollTop = scrollObj.saved;
      scrollObj.needRestore = false;
    }
  });

  const summary = useMemo(() => analyzeUser(user, month, holidaysMap || new Map()), [user, month, holidaysMap]);

  return (
    <div style={CS.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={CS.modal}>
        <div style={CS.modalHead}>
          <div>
            <div style={CS.modalEye}>Monthly Attendance Log</div>
            <div style={CS.modalName}>{user.name || user.email}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {[
                [`🟢 Full: ${summary.fullDays}`,    summary.fullDays > 0 ? BUCKET_COLORS.fullday.bg : "rgba(255,255,255,.15)",    summary.fullDays > 0 ? BUCKET_COLORS.fullday.color : "#fff"],
                [`🌓 Half: ${summary.halfDays}`,    summary.halfDays > 0 ? BUCKET_COLORS.halfday.bg : "rgba(255,255,255,.15)",    summary.halfDays > 0 ? BUCKET_COLORS.halfday.color : "#fff"],
                [`❌ Absent: ${summary.absentDays}`, summary.absentDays > 0 ? BUCKET_COLORS.absent.bg : "rgba(255,255,255,.15)", summary.absentDays > 0 ? BUCKET_COLORS.absent.color : "#fff"],
                [`🟣 PL: ${summary.paidLeaves}`,    summary.paidLeaves > 0 ? BUCKET_COLORS.paidleave.bg : "rgba(255,255,255,.15)", summary.paidLeaves > 0 ? BUCKET_COLORS.paidleave.color : "#fff"],
                [`⏰ Late: ${summary.lateCount}`,   summary.lateCount > 0 ? "#ffa040" : "rgba(255,255,255,.15)", "#000"],
                [`⏱ Avg: ${summary.avgNetMillis !== null ? fmtHrsMin(summary.avgNetMillis) : "-"}`,
                  summary.avgNetMillis !== null && summary.avgNetMillis < 28800000 ? BUCKET_COLORS.absent.bg : "rgba(255,255,255,.15)",
                  summary.avgNetMillis !== null && summary.avgNetMillis < 28800000 ? BUCKET_COLORS.absent.color : "#fff"],
              ].map(([label, bg, color]) => (
                <span key={label} style={{ background: bg, color, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{label}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!isEditing && <button style={CS.btnEdit} onClick={onStartEdit}>✏️ Edit</button>}
            {isEditing && <>
              <button style={CS.btnSave} onClick={onSave}>{editSaving ? "Saving…" : "✅ Save"}</button>
              <button style={CS.btnCancel} onClick={onCancelEdit}>✕ Cancel</button>
            </>}
            <button style={CS.btnClose} onClick={onClose}>✕</button>
          </div>
        </div>
        <div ref={bodyRef} data-modal-body="1" style={CS.modalBody}
          onScroll={() => { if (!scrollObj.needRestore && bodyRef.current) scrollObj.saved = bodyRef.current.scrollTop; }}>
          <LogTable
            attendance={user.attendance}
            isEditing={isEditing}
            editData={editData}
            editedFields={editedFields}
            changedFields={changedFields}
            historyLogs={historyLogs}
            historyLoading={historyLoading}
            lastSavedDate={lastSavedDate}
            activeInputId={activeInputId}
            onFieldChange={onFieldChange}
            onFocus={onFocus}
            todayStr={todayStr}
            month={month}
            holidaysMap={holidaysMap}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AttendanceChatLogs() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [holidaysMap, setHolidaysMap]       = useState(new Map());
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [expandedEmail, setExpandedEmail]   = useState(null);
  const [showCards, setShowCards]           = useState(false);
  const [myRole, setMyRole]                 = useState(null);
  const [myLocation, setMyLocation]         = useState(null);
  const [editEmail, setEditEmail]           = useState(null);
  const [editData, setEditData]             = useState({});
  const [editSaving, setEditSaving]         = useState(false);
  const [editedFields, setEditedFields]     = useState({});
  const [lastSavedDate, setLastSavedDate]   = useState(null);
  const [historyLogs, setHistoryLogs]       = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [changedFields, setChangedFields]   = useState({});
  const [activeInputId, setActiveInputId]   = useState(null);

  const todayDate      = new Date();
  const todayStr       = todayDate.toISOString().slice(0, 10);
  const currentMonth   = todayStr.slice(0, 7);
  const formattedToday = todayDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // ── Single month selector — controls cards view, modal AND download ──
  const [selectedMonth, setSelectedMonth]     = useState(currentMonth);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const month = selectedMonth;

  const scrollObj = useRef({ saved: 0, needRestore: false }).current;

  useEffect(() => {
    axios.get(`${baseUrl}/me`, { withCredentials: true })
      .then((r) => { setMyRole(r.data.role); setMyLocation(r.data.location); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    axios.get(`${baseUrl}/holidays?month=${month}`, { withCredentials: true })
      .then((res) => {
        const map = new Map();
        (res.data || []).forEach((h) => { if (h.date && h.name) map.set(h.date, { name: h.name, isPaid: h.is_paid }); });
        setHolidaysMap(map);
      })
      .catch(console.error);
  }, [month]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await axios.get(`${baseUrl}/all-attendance?month=${month}`, { withCredentials: true });
      const obj = res.data || {};
      setAttendanceData(Object.entries(obj).map(([email, u]) => ({ email, ...u })));
      return obj;
    } catch { setError("Failed to fetch attendance"); setAttendanceData([]); return {}; }
    finally { setLoading(false); }
  }, [month]);

  const fetchHistory = useCallback(async (email, logs) => {
    setHistoryLoading(true);
    try {
      const res  = await axios.get(`${baseUrl}/attendance-history/${encodeURIComponent(email)}?month=${month}`, { withCredentials: true });
      const hist = res.data.history || {};
      setHistoryLogs(hist);
      setChangedFields({});
      const fmtV = (v) => Array.isArray(v) ? (v||[]).map((x) => x ? x.slice(0,5) : "-").sort().join(",") : (v ? v.slice(0,5) : "-");
      const ch = {};
      logs.forEach((log) => {
        const prev = hist[log.date]?.[0]; if (!prev) return;
        const diff = {}; let any = false;
        ["office_in","break_in","break_out","lunch_in","lunch_out","break_in_2","break_out_2","office_out","extra_break_ins","extra_break_outs"].forEach((f) => {
          if (fmtV(log[f]) !== fmtV(prev[f])) { diff[f] = true; any = true; }
        });
        const cr = log.paid_leave_reason||log.reason||"-", pr = prev.paid_leave_reason||prev.reason||"-";
        if (cr.trim() !== pr.trim()) { diff.paid_leave_reason = true; any = true; }
        if (any) ch[log.date] = diff;
      });
      setChangedFields(ch);
    } catch (e) { console.error(e); }
    setHistoryLoading(false);
  }, [month]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  useEffect(() => {
    if (lastSavedDate) { const t = setTimeout(() => setLastSavedDate(null), 3500); return () => clearTimeout(t); }
  }, [lastSavedDate]);

  const userLogs = useMemo(() => {
    const f = attendanceData.filter((u) => {
      if (myRole === "chairman" || myRole === "mis-execuitve") return true;
      if (myRole === "manager") return u.location === myLocation;
      return false;
    });
    return f
      .map((u) => ({ ...u, todayAtt: (u.attendance || []).find((a) => a.date === todayStr) || {} }))
      .sort((a, b) => {
        if (a.todayAtt.office_in && !b.todayAtt.office_in) return -1;
        if (!a.todayAtt.office_in && b.todayAtt.office_in) return 1;
        return (a.name || a.email).localeCompare(b.name || b.email);
      });
  }, [attendanceData, myRole, myLocation, todayStr]);

  const openLog = useCallback((email) => {
    setHistoryLogs({}); setChangedFields({});
    setExpandedEmail(email);
    scrollObj.saved = 0; scrollObj.needRestore = false;
    setActiveInputId(null);
    const u = userLogs.find((x) => x.email === email);
    if (u) fetchHistory(email, u.attendance || []);
  }, [userLogs, fetchHistory, scrollObj]);

  const startEdit = useCallback((user) => {
    const obj = {};
    (user.attendance || []).forEach((log) => {
      obj[log.date] = { ...log, extra_break_ins: log.extra_break_ins || [], extra_break_outs: log.extra_break_outs || [] };
    });
    setEditData(obj); setEditedFields({}); setChangedFields({});
    setEditEmail(user.email); setActiveInputId(null);
    scrollObj.needRestore = false;
  }, [scrollObj]);

  const onFieldChange = useCallback((date, field, value) => {
    const body = document.querySelector("[data-modal-body='1']");
    if (body) scrollObj.saved = body.scrollTop;
    scrollObj.needRestore = true;
    setLastSavedDate(null);
    setEditedFields((prev) => ({ ...prev, [date]: { ...prev[date], [field]: true } }));
    setEditData((prev) => ({ ...prev, [date]: { ...prev[date], [field]: value } }));
  }, [scrollObj]);

  const onFocus = useCallback((date, field) => { setActiveInputId(`${date}-${field}`); }, []);

  const saveEdits = useCallback(async () => {
    if (!editEmail) return;
    setEditSaving(true);
    try {
      await axios.put(`${baseUrl}/edit-attendance/${encodeURIComponent(editEmail)}`, { logs: Object.values(editData) }, { withCredentials: true });
      const last = Object.keys(editData).slice(-1)[0];
      setEditEmail(null); setEditData({}); setEditedFields({});
      scrollObj.needRestore = false; setActiveInputId(null);
      if (last) setLastSavedDate(last);
      const updated = await fetchAttendance();
      const upUser  = updated[editEmail];
      if (upUser) fetchHistory(editEmail, upUser.attendance || []);
    } catch { alert("Failed to save edits."); }
    setEditSaving(false);
  }, [editEmail, editData, fetchAttendance, fetchHistory, scrollObj]);

  const cancelEdit = useCallback(() => {
    setEditEmail(null); setEditData({}); setEditedFields({});
    scrollObj.needRestore = false; setActiveInputId(null);
  }, [scrollObj]);

  const closeModal = useCallback(() => {
    setExpandedEmail(null); setEditEmail(null); setEditData({});
    setHistoryLogs({}); setEditedFields({}); setChangedFields({});
    scrollObj.needRestore = false; setActiveInputId(null);
  }, [scrollObj]);

  const noChairman   = userLogs.filter((u) => u.role !== "chairman");
  const totalUsers   = noChairman.length;
  const presentUsers = noChairman.filter((u) => u.todayAtt.office_in).length;
  const absentUsers  = totalUsers - presentUsers;
  const expandedUser = userLogs.find((u) => u.email === expandedEmail);

  return (
    <div style={CS.root}>
      <div style={CS.headerBar}>
        <div style={CS.headerLeft}>
          <div style={CS.headerIcon}>📋</div>
          <div>
            <div style={CS.headerTitle}>Attendance Overview</div>
            <div style={CS.headerDate}>{formattedToday}</div>
          </div>
        </div>
        <div style={CS.statsRow}>
          {[["Total", totalUsers, "#1e3a8a"], ["Present", presentUsers, "#16a34a"], ["Absent", absentUsers, "#dc2626"]].map(([lbl, val, clr]) => (
            <div key={lbl} style={CS.statCard}>
              <div style={{ ...CS.statVal, color: clr }}>{val}</div>
              <div style={CS.statLbl}>{lbl}</div>
            </div>
          ))}
        </div>
        <div style={CS.headerActions}>
          <button style={CS.btnToggle} onClick={() => setShowCards((v) => !v)}>
            {showCards ? "👁 Hide Cards" : "👥 Show Cards"}
          </button>

          {/* ── Month selector — controls view + download ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 10, padding: "6px 12px" }}>
            <span style={{ color: "rgba(255,255,255,.7)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>📅 Month:</span>
            <input
              type="month"
              value={selectedMonth}
              max={currentMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setExpandedEmail(null); }}
              style={{ background: "transparent", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, outline: "none", cursor: "pointer" }}
            />
          </div>
          <button
            style={{ ...CS.btnExcel, opacity: downloadLoading ? 0.7 : 1 }}
            onClick={async () => {
              setDownloadLoading(true);
              try {
                const [attRes, holRes] = await Promise.all([
                  axios.get(`${baseUrl}/all-attendance?month=${selectedMonth}`, { withCredentials: true }),
                  axios.get(`${baseUrl}/holidays?month=${selectedMonth}`, { withCredentials: true }),
                ]);
                const logsForMonth = Object.entries(attRes.data || {}).map(([email, u]) => ({ email, ...u }));
                const holMap = new Map();
                (holRes.data || []).forEach((h) => { if (h.date && h.name) holMap.set(h.date, { name: h.name, isPaid: h.is_paid }); });
                downloadAttendanceExcel(logsForMonth, selectedMonth, holMap);
              } catch { alert("Failed to fetch data for selected month"); }
              setDownloadLoading(false);
            }}
            disabled={downloadLoading}
          >
            {downloadLoading ? "⏳ Loading…" : "⬇️ Excel"}
          </button>
        </div>
      </div>

      {error && <div style={CS.errorBar}>{error}</div>}
      {loading && <div style={CS.loadingWrap}><div style={CS.spin} /><span style={CS.loadingTxt}>Loading…</span></div>}

      {!loading && showCards && (
        <div style={CS.cardsGrid}>
          {noChairman.map((user) => {
            const att       = user.todayAtt;
            const hasLogin  = !!att.office_in;
            const hasLogout = !!att.office_out;
            const netMs     = calculateNetWorkMillis(att);
            let label, badgeBg, badgeClr, borderClr;
            if (!hasLogin)       { label = "● Absent";    badgeBg = BUCKET_COLORS.absent.bg;  badgeClr = BUCKET_COLORS.absent.color;  borderClr = "#dc2626"; }
            else if (!hasLogout) { label = "● No Logout"; badgeBg = "#fef3c7";                badgeClr = "#92400e";                   borderClr = "#f59e0b"; }
            else                 { label = "● Present";   badgeBg = BUCKET_COLORS.fullday.bg; badgeClr = BUCKET_COLORS.fullday.color; borderClr = "#16a34a"; }
            return (
              <div key={user.email} style={{ ...CS.card, borderTop: `3px solid ${borderClr}` }}>
                <div style={CS.cardTop}>
                  <div style={CS.avatar}>{(user.name || user.email).charAt(0).toUpperCase()}</div>
                  <div style={CS.cardInfo}>
                    <div style={CS.cardName}>{user.name || "Unknown"}</div>
                    <div style={CS.cardEmail}>{user.email}</div>
                    {user.designation && <div style={CS.cardRole}>{user.designation}</div>}
                  </div>
                  <span style={{ ...CS.statusBadge, background: badgeBg, color: badgeClr }}>{label}</span>
                </div>
                <div style={CS.cardStats}>
                  {hasLogin ? <>
                    <div style={CS.cardStat}><span style={CS.cardStatLbl}>Login</span><b>{att.office_in?.slice(0,5)}</b></div>
                    <div style={CS.cardStat}><span style={CS.cardStatLbl}>Logout</span><b style={{ color: hasLogout ? "#0f172a" : "#dc2626" }}>{hasLogout ? att.office_out?.slice(0,5) : "—"}</b></div>
                    {netMs > 0 && <div style={CS.cardStat}><span style={CS.cardStatLbl}>Net Work</span><b style={{ color: netMs < 28800000 ? "#dc2626" : "#16a34a" }}>{fmtHrsMin(netMs)}</b></div>}
                  </> : (
                    <div style={CS.cardStat}><span style={CS.cardStatLbl}>Status</span><b style={{ color: "#dc2626" }}>{att.paid_leave_reason || att.reason || "Not Logged In"}</b></div>
                  )}
                </div>
                <button style={CS.viewBtn} onClick={() => openLog(user.email)}>View Full Log →</button>
              </div>
            );
          })}
        </div>
      )}

      {expandedUser && (
        <LogModal
          user={expandedUser}
          isEditing={editEmail === expandedUser.email}
          editSaving={editSaving}
          editData={editData}
          editedFields={editedFields}
          changedFields={changedFields}
          historyLogs={historyLogs}
          historyLoading={historyLoading}
          lastSavedDate={lastSavedDate}
          activeInputId={activeInputId}
          todayStr={todayStr}
          scrollObj={scrollObj}
          month={month}
          holidaysMap={holidaysMap}
          onFieldChange={onFieldChange}
          onFocus={onFocus}
          onStartEdit={() => startEdit(expandedUser)}
          onSave={saveEdits}
          onCancelEdit={cancelEdit}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const CS = {
  root: { width: "100%", fontFamily: "'DM Sans','Segoe UI',sans-serif" },
  headerBar: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(120deg,#1e3a8a,#2563eb)", borderRadius: 16, padding: "18px 24px", marginBottom: 24, boxShadow: "0 8px 24px rgba(37,99,235,.25)", flexWrap: "wrap", gap: 16 },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  headerIcon: { fontSize: 32 },
  headerTitle: { fontSize: 18, fontWeight: 800, color: "#fff" },
  headerDate: { fontSize: 12, color: "rgba(255,255,255,.65)", marginTop: 2 },
  statsRow: { display: "flex", gap: 8 },
  statCard: { background: "rgba(255,255,255,.12)", borderRadius: 12, padding: "10px 18px", textAlign: "center", border: "1px solid rgba(255,255,255,.18)", minWidth: 72 },
  statVal: { fontSize: 22, fontWeight: 900 },
  statLbl: { fontSize: 10, color: "rgba(255,255,255,.7)", marginTop: 3, fontWeight: 600, textTransform: "uppercase" },
  headerActions: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  btnToggle: { background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", color: "#fff", padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnExcel: { background: "#10b981", border: "none", color: "#fff", padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,.4)" },
  errorBar: { background: "#fef2f2", border: "1px solid #fecaca", borderLeft: "4px solid #ef4444", borderRadius: 10, padding: "12px 18px", marginBottom: 16, fontSize: 13, fontWeight: 600, color: "#dc2626" },
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 16 },
  loadingTxt: { fontSize: 14, color: "#64748b" },
  spin: { width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", animation: "acl-spin .8s linear infinite" },
  cardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 },
  card: { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,.06)", overflow: "hidden", display: "flex", flexDirection: "column" },
  cardTop: { display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 16px 12px" },
  avatar: { width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "#fff", fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 14, fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardEmail: { fontSize: 11, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardRole: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 },
  cardStats: { display: "flex", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" },
  cardStat: { flex: 1, padding: "10px 12px", textAlign: "center", borderRight: "1px solid #f1f5f9" },
  cardStatLbl: { display: "block", fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 },
  viewBtn: { display: "block", width: "100%", padding: 12, border: "none", background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  backdrop: { position: "fixed", inset: 0, background: "rgba(15,23,42,.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20, backdropFilter: "blur(4px)" },
  modal: { background: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,.35)", width: "97%", maxWidth: 1500, height: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "18px 28px", background: "linear-gradient(120deg,#1e3a8a,#2563eb)", borderRadius: "20px 20px 0 0", flexShrink: 0 },
  modalEye: { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.6)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 3 },
  modalName: { fontSize: 20, fontWeight: 800, color: "#fff" },
  modalBody: { flex: 1, overflowY: "auto", overflowX: "hidden" },
  btnEdit:   { background: "#f97316", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnSave:   { background: "#10b981", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnCancel: { background: "#f59e0b", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnClose:  { width: 34, height: 34, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  tableScroll: { overflowX: "auto", padding: 16 },
  table: { width: "100%", minWidth: 1500, borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "11px 9px", textAlign: "center", fontSize: 11, fontWeight: 700, background: "#1e3a8a", color: "#fff", borderRight: "1px solid rgba(255,255,255,.1)", whiteSpace: "nowrap" },
  td: { padding: "8px 7px", textAlign: "center", border: "1px solid #f1f5f9", color: "#374151", verticalAlign: "middle" },
  dateCell: { padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", border: "1px solid #f1f5f9", fontSize: 12, whiteSpace: "nowrap" },
  statusPill: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" },
  cellEdited:  { background: "#fffbeb", border: "1.5px solid #f59e0b" },
  cellChanged: { background: "#fee2e2", border: "1.5px solid #ef4444", fontWeight: 700, color: "#991b1b" },
  timeVal:   { fontSize: 12, fontWeight: 600 },
  timeInput: { width: 86, padding: "3px 5px", border: "1.5px solid #93c5fd", borderRadius: 6, fontSize: 12, fontFamily: "inherit" },
  txtInput:  { width: 108, padding: "3px 5px", border: "1.5px solid #93c5fd", borderRadius: 6, fontSize: 12, fontFamily: "inherit" },
  loadingTd: { textAlign: "center", padding: 40, color: "#64748b" },
  historyWrap:  { padding: "6px 14px 6px 28px" },
  historyBtn:   { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "block", margin: "4px auto" },
  historyCard:  { marginTop: 8, padding: 10, borderRadius: 8, background: "#fff5f5", border: "1px dashed #fca5a5" },
  historyMeta:  { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#991b1b", fontWeight: 600, marginBottom: 6, flexWrap: "wrap", gap: 4 },
  historyTable: { width: "100%", borderCollapse: "collapse", fontSize: 11 },
  historyTh:    { padding: "5px 8px", background: "#fee2e2", color: "#991b1b", fontWeight: 700, border: "1px solid #fecaca", textAlign: "center" },
  historyTd:    { padding: "5px 8px", border: "1px solid #fecaca", textAlign: "center", color: "#991b1b" },
};

if (typeof document !== "undefined" && !document.getElementById("acl-kf")) {
  const s = document.createElement("style"); s.id = "acl-kf";
  s.textContent = "@keyframes acl-spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(s);
}