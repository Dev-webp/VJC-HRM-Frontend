import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

// ─────────────────────────────────────────────────────────────────────────────
// TIME UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function toMins(t) {
  if (!t || typeof t !== "string") return null;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function minsToHM(mins) {
  if (mins === null || mins === undefined || isNaN(mins)) return "-";
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  return `${sign}${Math.floor(abs / 60)}h ${abs % 60}m`;
}

const fmt = (t) => (t ? String(t).slice(0, 5) : "-");

function computeWorkMins(log) {
  if (!log) return { gross: null, deductions: null, net: null };
  const inM  = toMins(log.office_in);
  const outM = toMins(log.office_out);
  if (inM === null || outM === null) return { gross: null, deductions: null, net: null };
  const gross = outM - inM;
  let ded = 0;
  [[log.break_in, log.break_out],[log.lunch_in, log.lunch_out],[log.break_in_2, log.break_out_2]].forEach(([a, b]) => {
    const ai = toMins(a), bi = toMins(b);
    if (ai !== null && bi !== null && bi > ai) ded += bi - ai;
  });
  const ebIns = log.extra_break_ins || [], ebOuts = log.extra_break_outs || [];
  for (let i = 0; i < Math.min(ebIns.length, ebOuts.length); i++) {
    const ei = toMins(ebIns[i]), eo = toMins(ebOuts[i]);
    if (ei !== null && eo !== null && eo > ei) ded += eo - ei;
  }
  return { gross, deductions: ded, net: gross - ded };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL DOWNLOAD
// ─────────────────────────────────────────────────────────────────────────────
function downloadAttendanceExcel(userLogs, month) {
  const wb = XLSX.utils.book_new();
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, mon - 1, i + 1);
    return { day: i + 1, dow: DOW[d.getDay()], iso: d.toISOString().slice(0, 10) };
  });

  const filteredUsers = userLogs.filter((u) => u.role !== "chairman");

  // ── COLOURS ───────────────────────────────────────────────────────────────
  const C = {
    gold        : "FFD700",
    navy        : "1E3A8A",
    navyDark    : "1E40AF",
    white       : "FFFFFF",
    black       : "000000",
    sunBg       : "2563EB",
    absentBg    : "FF4444",
    absentFont  : "FFFFFF",
    lateBg      : "FFA040",
    presentBg   : "C6EFCE",
    presentFont : "1A5C1A",
    logoutBg    : "E0F2FE",   // sky blue  — has logout time
    logoutFont  : "0369A1",
    noOutBg     : "FEE2E2",   // light red — no logout recorded
    noOutFont   : "991B1B",
    halfBg      : "FFF3CD",
    halfFont    : "92400E",
    underHourBg : "FF6666",
    underHourFont: "7B0000",
    subHeaderBg : "DBEAFE",
    inOutHdr    : "93C5FD",
    rowWhite    : "FFFFFF",
    rowAlt      : "EFF6FF",
    breakBg     : "FFF3CD",
    remarkFont  : "6B21A8",
    totalRowBg  : "1E3A8A",
  };

  const thin      = { style: "thin",   color: { rgb: "CCCCCC" } };
  const med       = { style: "medium", color: { rgb: "1E40AF" } };
  const hdrThin   = { style: "thin",   color: { rgb: "999999" } };
  const thinBorder = { top: thin,    bottom: thin,    left: thin,    right: thin    };
  const medBorder  = { top: med,     bottom: med,     left: med,     right: med     };
  const hdrBorder  = { top: hdrThin, bottom: hdrThin, left: hdrThin, right: hdrThin };

  function cs(bg, fontRgb = "000000", bold = false, alignLeft = false) {
    return {
      font      : { bold, color: { rgb: fontRgb }, name: "Arial", sz: 9 },
      fill      : { fgColor: { rgb: bg } },
      alignment : { horizontal: alignLeft ? "left" : "center", vertical: "center", wrapText: true },
      border    : thinBorder,
    };
  }

  function wc(ws, r, c, value, style) {
    const ref  = XLSX.utils.encode_cell({ r, c });
    const type = typeof value === "number" ? "n" : value == null ? "z" : "s";
    ws[ref] = { t: type, v: value ?? "", s: style };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 1 — OVERVIEW  (each day = 2 sub-cols: IN | OUT)
  // ═══════════════════════════════════════════════════════════════════════════
  (() => {
    const ws = {};
    ws["!merges"] = [];

    // Fixed columns: S.NO | Name | Designation | Late Days | Absent Days | Avg Work Hrs
    const FIXED_LABELS = ["S.NO", "Name", "Designation", "Late Days", "Absent Days", "Avg Work Hrs"];
    const FIXED = FIXED_LABELS.length; // 6
    const totalCols = FIXED + dates.length * 2;

    // ── Row 0: fixed labels + DOW (merged over IN+OUT) ──────────────────────
    FIXED_LABELS.forEach((label, c) => {
      wc(ws, 0, c, label, { ...cs(C.gold, C.black, true), border: hdrBorder });
    });
    dates.forEach((d, i) => {
      const col   = FIXED + i * 2;
      const isSun = d.dow === "Sun";
      wc(ws, 0, col,     d.dow, { ...cs(isSun ? C.sunBg : C.gold, isSun ? C.white : C.black, true), border: hdrBorder });
      wc(ws, 0, col + 1, "",    { ...cs(isSun ? C.sunBg : C.gold, isSun ? C.white : C.black, true), border: hdrBorder });
      // Merge DOW label across IN+OUT
      ws["!merges"].push({ s: { r: 0, c: col }, e: { r: 0, c: col + 1 } });
    });

    // ── Row 1: fixed empty + day numbers (merged over IN+OUT) ───────────────
    FIXED_LABELS.forEach((_, c) => {
      wc(ws, 1, c, "", { ...cs(C.subHeaderBg, C.navy, true), border: hdrBorder });
    });
    dates.forEach((d, i) => {
      const col   = FIXED + i * 2;
      const isSun = d.dow === "Sun";
      wc(ws, 1, col,     d.day, { ...cs(isSun ? C.sunBg : C.subHeaderBg, isSun ? C.white : C.navy, true), border: hdrBorder });
      wc(ws, 1, col + 1, "",    { ...cs(isSun ? C.sunBg : C.subHeaderBg, isSun ? C.white : C.navy, true), border: hdrBorder });
      ws["!merges"].push({ s: { r: 1, c: col }, e: { r: 1, c: col + 1 } });
    });

    // ── Row 2: fixed empty + "IN" | "OUT" sub-headers ───────────────────────
    FIXED_LABELS.forEach((_, c) => {
      wc(ws, 2, c, "", { ...cs(C.inOutHdr, C.navy, true), border: hdrBorder });
    });
    dates.forEach((d, i) => {
      const col   = FIXED + i * 2;
      const isSun = d.dow === "Sun";
      wc(ws, 2, col,     "IN",  { ...cs(isSun ? C.sunBg : C.inOutHdr,  isSun ? C.white : C.navy,       true), border: hdrBorder });
      wc(ws, 2, col + 1, "OUT", { ...cs(isSun ? C.sunBg : C.logoutBg,  isSun ? C.white : C.logoutFont, true), border: hdrBorder });
    });

    // ── Data rows (start at excel row 3) ────────────────────────────────────
    filteredUsers.forEach((user, idx) => {
      const logByDate = {};
      (user.attendance || []).forEach((l) => { logByDate[l.date] = l; });

      let lateCount = 0, absentCount = 0, totalNet = 0, workDays = 0;

      // Build per-day IN+OUT pairs
      const dayCells = dates.map(({ iso, dow }) => {
        const log    = logByDate[iso];
        const isSun  = dow === "Sun";

        if (isSun) return { inV: "S", outV: "S", inBg: C.sunBg, outBg: C.sunBg, inFont: C.white, outFont: C.white, bold: false };

        if (!log || !log.office_in) {
          absentCount++;
          return { inV: "A", outV: "-", inBg: C.absentBg, outBg: C.absentBg, inFont: C.white, outFont: C.white, bold: true };
        }

        // Half day check
        const isHalf = !!(log.paid_leave_reason?.toLowerCase().match(/half|1\/2/));

        const [h, m] = log.office_in.split(":").map(Number);
        const isLate = h > 10 || (h === 10 && m > 5);
        if (isLate) lateCount++;

        const { net } = computeWorkMins(log);
        if (net !== null) { totalNet += net; workDays++; }
        const under8 = net !== null && net < 480;

        // Logout value
        const logoutVal = log.office_out ? fmt(log.office_out) : "No Out";
        const hasLogout = !!(log.office_out);

        // IN cell colour
        let inBg   = under8 ? C.underHourBg : isLate ? C.lateBg : C.presentBg;
        let inFont = under8 ? C.underHourFont : isLate ? C.black : C.presentFont;
        if (isHalf) { inBg = C.halfBg; inFont = C.halfFont; }

        // OUT cell colour
        let outBg   = hasLogout ? C.logoutBg  : C.noOutBg;
        let outFont = hasLogout ? C.logoutFont : C.noOutFont;

        return {
          inV  : fmt(log.office_in),
          outV : logoutVal,
          inBg, inFont,
          outBg, outFont,
          bold : under8,
        };
      });

      const avgMins = workDays > 0 ? Math.round(totalNet / workDays) : null;
      const excelRow = idx + 3; // rows 0,1,2 are headers
      const rowBg    = idx % 2 === 0 ? C.rowWhite : C.rowAlt;

      // Fixed columns
      wc(ws, excelRow, 0, idx + 1,                                   cs(rowBg, C.navy, true));
      wc(ws, excelRow, 1, user.name || user.email,                   cs(rowBg, C.navy, true, true));
      wc(ws, excelRow, 2, user.designation || user.role || "",       cs(rowBg, "374151", false, true));
      wc(ws, excelRow, 3, lateCount,                                  cs(lateCount   > 0 ? C.lateBg   : rowBg, lateCount   > 0 ? C.black : C.black,   lateCount   > 0));
      wc(ws, excelRow, 4, absentCount,                                cs(absentCount > 0 ? C.absentBg : rowBg, absentCount > 0 ? C.white : C.black,   absentCount > 0));
      wc(ws, excelRow, 5, avgMins !== null ? minsToHM(avgMins) : "-", cs(avgMins !== null && avgMins < 480 ? C.underHourBg : rowBg, avgMins !== null && avgMins < 480 ? C.underHourFont : C.black));

      // Day IN+OUT columns
      dayCells.forEach(({ inV, outV, inBg, inFont, outBg, outFont, bold }, i) => {
        const col = FIXED + i * 2;
        wc(ws, excelRow, col,     inV,  cs(inBg,  inFont,  bold));
        wc(ws, excelRow, col + 1, outV, cs(outBg, outFont, false));
      });
    });

    // ── Column widths ────────────────────────────────────────────────────────
    ws["!cols"] = [
      { wch: 5  }, // S.NO
      { wch: 28 }, // Name
      { wch: 26 }, // Designation
      { wch: 9  }, // Late Days
      { wch: 10 }, // Absent Days
      { wch: 12 }, // Avg Work Hrs
      ...dates.flatMap(() => [{ wch: 7 }, { wch: 7 }]),
    ];

    // ── Row heights ──────────────────────────────────────────────────────────
    ws["!rows"] = [{ hpt: 22 }, { hpt: 18 }, { hpt: 16 }, ...filteredUsers.map(() => ({ hpt: 18 }))];

    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: filteredUsers.length + 2, c: totalCols - 1 },
    });

    XLSX.utils.book_append_sheet(wb, ws, "📊 Overview");
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 2+ — ONE DETAILED SHEET PER EMPLOYEE
  // Cols: Date|Day|Login|Break IN|Break OUT|Lunch IN|Lunch OUT|
  //       Break2 IN|Break2 OUT|Extra B.INs|Extra B.OUTs|Logout|
  //       Gross Hrs|Break Deducted|Net Work Hrs|Status|Late?|Remarks
  // ═══════════════════════════════════════════════════════════════════════════
  filteredUsers.forEach((user) => {
    const ws = {};
    ws["!merges"] = [];
    let row  = 0;
    const COLS = 18;

    const logByDate = {};
    (user.attendance || []).forEach((l) => { logByDate[l.date] = l; });

    // ── Title ─────────────────────────────────────────────────────────────
    const titleRef = XLSX.utils.encode_cell({ r: row, c: 0 });
    ws[titleRef] = {
      t: "s",
      v: `👤  ${user.name || user.email}   |   ${user.designation || user.role || "—"}   |   Month: ${month}`,
      s: { font: { bold: true, color: { rgb: C.white }, name: "Arial", sz: 13 }, fill: { fgColor: { rgb: C.navyDark } }, alignment: { horizontal: "left", vertical: "center" }, border: medBorder },
    };
    ws["!merges"].push({ s: { r: row, c: 0 }, e: { r: row, c: COLS - 1 } });
    row++;

    // ── Legend ────────────────────────────────────────────────────────────
    const legends = [
      { t: "< 8h Work ⚠️",    bg: C.underHourBg, f: C.underHourFont },
      { t: "Late Login",       bg: C.lateBg,      f: C.black         },
      { t: "Absent",           bg: C.absentBg,    f: C.white         },
      { t: "Half Day",         bg: C.halfBg,       f: C.halfFont     },
      { t: "Present OK",       bg: C.presentBg,   f: C.presentFont   },
      { t: "Break/Deducted",   bg: C.breakBg,     f: C.black         },
    ];
    legends.forEach(({ t, bg, f }, i) => {
      wc(ws, row, i * 3,     t,  { ...cs(bg, f, true, true), border: medBorder });
      wc(ws, row, i * 3 + 1, "", cs(bg, f));
      wc(ws, row, i * 3 + 2, "", cs(bg, f));
      ws["!merges"].push({ s: { r: row, c: i * 3 }, e: { r: row, c: i * 3 + 2 } });
    });
    row++;

    // ── Column headers ────────────────────────────────────────────────────
    const headers = [
      "Date","Day","Login","Break IN","Break OUT","Lunch IN","Lunch OUT",
      "Break2 IN","Break2 OUT","Extra Breaks IN","Extra Breaks OUT","Logout",
      "Gross Hrs","Break Deducted","Net Work Hrs","Status","Late?","Remarks",
    ];
    const hStyle = {
      font: { bold: true, color: { rgb: C.white }, name: "Arial", sz: 10 },
      fill: { fgColor: { rgb: C.navyDark } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: medBorder,
    };
    headers.forEach((h, c) => {
      const ref = XLSX.utils.encode_cell({ r: row, c });
      ws[ref] = { t: "s", v: h, s: hStyle };
    });
    row++;

    // ── Accumulators ──────────────────────────────────────────────────────
    let monthGross = 0, monthDed = 0, monthNet = 0;
    let workDays = 0, lateDays = 0, absentDays = 0, halfDays = 0;

    // ── One row per calendar day ──────────────────────────────────────────
    dates.forEach(({ iso, dow }) => {
      const log    = logByDate[iso] || null;
      const isSun  = dow === "Sun";
      const { gross, deductions, net } = computeWorkMins(log);

      let status = "Sunday";
      let isLate = false, isAbsent = false, isHalf = false;

      if (!isSun) {
        if (!log || !log.office_in) {
          isAbsent = true; absentDays++; status = "Absent";
        } else {
          const [h, m] = log.office_in.split(":").map(Number);
          isLate = h > 10 || (h === 10 && m > 5);
          if (isLate) lateDays++;
          isHalf = !!(log.paid_leave_reason?.toLowerCase().match(/half|1\/2/));
          if (isHalf) halfDays++;
          workDays++;
          if (net !== null) { monthGross += gross; monthDed += deductions; monthNet += net; }
          status = isHalf ? "Half Day" : "Present";
        }
      }

      const under8 = !isSun && !isAbsent && net !== null && net < 480;

      // Row background
      let rowBg = row % 2 === 0 ? C.rowWhite : C.rowAlt;
      if (isSun)    rowBg = C.subHeaderBg;
      if (isAbsent) rowBg = C.absentBg;
      if (isHalf)   rowBg = C.halfBg;
      if (under8)   rowBg = C.underHourBg;

      const rowFont = isAbsent ? C.white : under8 ? C.underHourFont : C.black;
      const rowBold = under8 || isAbsent;

      const base  = (bg, f, b, al) => cs(bg ?? rowBg, f ?? rowFont, b ?? rowBold, al);

      // Logout value — ALWAYS show something meaningful
      const logoutRaw = log?.office_out;
      const logoutVal = logoutRaw ? fmt(logoutRaw) : (isAbsent || isSun ? "-" : "No Out");
      const logoutStyle = logoutRaw
        ? cs(C.logoutBg, C.logoutFont, false)        // has logout → sky blue
        : isAbsent || isSun
          ? base()                                    // absent/sunday → row colour
          : cs(C.noOutBg, C.noOutFont, true);         // present but no logout → red tint

      const eBins  = (log?.extra_break_ins  || []).join(" | ") || "-";
      const eBouts = (log?.extra_break_outs || []).join(" | ") || "-";

      wc(ws, row, 0,  iso,                                          base());
      wc(ws, row, 1,  dow,                                          base(isSun ? C.sunBg : null, isSun ? C.white : null, isSun));
      wc(ws, row, 2,  log ? fmt(log.office_in)  : "-",             base());
      wc(ws, row, 3,  log ? fmt(log.break_in)   : "-",             base(C.breakBg, C.black, false));
      wc(ws, row, 4,  log ? fmt(log.break_out)  : "-",             base(C.breakBg, C.black, false));
      wc(ws, row, 5,  log ? fmt(log.lunch_in)   : "-",             base(C.breakBg, C.black, false));
      wc(ws, row, 6,  log ? fmt(log.lunch_out)  : "-",             base(C.breakBg, C.black, false));
      wc(ws, row, 7,  log ? fmt(log.break_in_2) : "-",             base(C.breakBg, C.black, false));
      wc(ws, row, 8,  log ? fmt(log.break_out_2): "-",             base(C.breakBg, C.black, false));
      wc(ws, row, 9,  eBins,                                        base(C.breakBg, C.black, false));
      wc(ws, row, 10, eBouts,                                       base(C.breakBg, C.black, false));
      wc(ws, row, 11, logoutVal,                                    logoutStyle);  // ← LOGOUT
      wc(ws, row, 12, gross   !== null ? minsToHM(gross)       : "-", base());
      wc(ws, row, 13, deductions !== null ? minsToHM(deductions) : "-", base(C.breakBg, C.black, false));
      wc(ws, row, 14, net !== null ? minsToHM(net) : "-",
        cs(under8 ? C.underHourBg : net !== null ? C.presentBg : rowBg,
           under8 ? C.underHourFont : net !== null ? C.presentFont : rowFont, under8)
      );
      wc(ws, row, 15, status,
        cs(isAbsent ? C.absentBg : isHalf ? C.halfBg : isSun ? C.subHeaderBg : C.presentBg,
           isAbsent ? C.white : C.navy, true)
      );
      wc(ws, row, 16,
        isLate ? "⚠️ LATE" : (isSun || isAbsent) ? "—" : "✅ OK",
        cs(isLate ? C.lateBg : rowBg, isLate ? C.black : rowFont)
      );
      wc(ws, row, 17, log?.paid_leave_reason || log?.reason || "-",
        { ...cs(rowBg, C.remarkFont, false, true) }
      );

      row++;
    });

    // ── Spacer ────────────────────────────────────────────────────────────
    row++;

    // ── Monthly summary ───────────────────────────────────────────────────
    const avgNet   = workDays > 0 ? Math.round(monthNet / workDays) : null;
    const avgUnder = avgNet !== null && avgNet < 480;

    const summaryRows = [
      ["📋 MONTHLY SUMMARY",       "",                  C.navyDark,                         C.gold  ],
      ["Work Days (excl. Sunday)", workDays,             C.navy,                              C.white ],
      ["Late Days",                lateDays,             lateDays   > 0 ? C.lateBg : C.navy, lateDays   > 0 ? C.black : C.white],
      ["Absent Days",              absentDays,           absentDays > 0 ? C.absentBg:C.navy, absentDays > 0 ? C.white : C.white],
      ["Half Days",                halfDays,             halfDays   > 0 ? C.halfBg : C.navy, halfDays   > 0 ? C.halfFont : C.white],
      ["Total Gross Hours",        minsToHM(monthGross), C.navy,                              C.white ],
      ["Total Break Deducted",     minsToHM(monthDed),   C.breakBg,                           C.black ],
      ["Total Net Work Hours",     minsToHM(monthNet),   C.navy,                              C.gold  ],
      ["Avg Daily Work Hrs",       avgNet !== null ? minsToHM(avgNet) : "-", avgUnder ? C.underHourBg : C.navy, avgUnder ? C.underHourFont : C.gold],
    ];

    summaryRows.forEach(([label, value, vBg, vFont]) => {
      const lStyle = { font: { bold: true, color: { rgb: C.white }, name: "Arial", sz: 10 }, fill: { fgColor: { rgb: C.totalRowBg } }, alignment: { horizontal: "right", vertical: "center" }, border: medBorder };
      const vStyle = { font: { bold: true, color: { rgb: vFont },   name: "Arial", sz: 11 }, fill: { fgColor: { rgb: vBg         } }, alignment: { horizontal: "center",vertical: "center" }, border: medBorder };
      wc(ws, row, 0, label, lStyle);
      wc(ws, row, 1, value, vStyle);
      for (let c = 2; c < COLS; c++) {
        wc(ws, row, c, "", { font: { color: { rgb: C.white } }, fill: { fgColor: { rgb: C.navy } }, border: thinBorder });
      }
      ws["!merges"].push({ s: { r: row, c: 2 }, e: { r: row, c: COLS - 1 } });
      row++;
    });

    // ── Warning banner ────────────────────────────────────────────────────
    if (avgUnder) {
      const wRef = XLSX.utils.encode_cell({ r: row, c: 0 });
      ws[wRef] = {
        t: "s",
        v: `⚠️  WARNING: ${user.name || user.email} averages ${minsToHM(avgNet)}/day — BELOW required 8 hours. Red rows = under-hour days.`,
        s: { font: { bold: true, color: { rgb: C.underHourFont }, name: "Arial", sz: 12 }, fill: { fgColor: { rgb: C.underHourBg } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: medBorder },
      };
      ws["!merges"].push({ s: { r: row, c: 0 }, e: { r: row, c: COLS - 1 } });
      row++;
    }

    ws["!cols"] = [
      { wch: 12 },{ wch: 5 },{ wch: 8 },{ wch: 9 },{ wch: 9 },
      { wch: 9  },{ wch: 9 },{ wch: 9 },{ wch: 9 },{ wch: 18 },
      { wch: 18 },{ wch: 9 },{ wch: 10},{ wch: 14},{ wch: 12 },
      { wch: 11 },{ wch: 10},{ wch: 30},
    ];
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: COLS - 1 } });

    const sheetName = (user.name || user.email || "Emp").replace(/[\\/?*[\]:]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `Attendance_${month}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AttendanceChatLogs() {
  const [attendanceData, setAttendanceData]     = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState("");
  const [expandedUserEmail, setExpandedUserEmail] = useState(null);
  const [showCards, setShowCards]               = useState(false);
  const [currentUserRole, setCurrentUserRole]   = useState(null);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  const [editLogUserEmail, setEditLogUserEmail] = useState(null);
  const [editLogData, setEditLogData]           = useState({});
  const [editSaving, setEditSaving]             = useState(false);
  const [editedFields, setEditedFields]         = useState({});
  const [lastSavedDate, setLastSavedDate]       = useState(null);
  const [historyLogs, setHistoryLogs]           = useState({});
  const [historyLoading, setHistoryLoading]     = useState(false);
  const [changedFieldsByDate, setChangedFieldsByDate] = useState({});
  const [activeInputId, setActiveInputId]       = useState(null);
  const modalScrollRef                          = useRef(0);
  const [isScrollingHandled, setIsScrollingHandled] = useState(false);

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const res = await axios.get(`${baseUrl}/me`, { withCredentials: true });
        setCurrentUserRole(res.data.role);
        setCurrentUserLocation(res.data.location);
      } catch (err) { console.error("Failed to fetch user info", err); }
    }
    fetchUserInfo();
  }, []);

  const todayDate     = new Date();
  const todayStr      = todayDate.toISOString().slice(0, 10);
  const formattedToday = todayDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const month         = todayStr.slice(0, 7);
  const formatTime    = (t) => (t ? t.slice(0, 5) : "-");

  const formatLogValue = (val) => {
    if (Array.isArray(val)) return (val || []).map((v) => (v ? v.slice(0, 5) : "-")).sort().join(",");
    return val ? val.slice(0, 5) : "-";
  };

  const compareLogs = (currentLog, oldLog) => {
    const changes = {}; let hasChanges = false;
    ["office_in","break_in","break_out","lunch_in","lunch_out","break_in_2","break_out_2","office_out","extra_break_ins","extra_break_outs"].forEach((field) => {
      if (formatLogValue(currentLog[field]) !== formatLogValue(oldLog[field])) { changes[field] = true; hasChanges = true; }
    });
    const cr = currentLog.paid_leave_reason || currentLog.reason || "-";
    const or = oldLog.paid_leave_reason     || oldLog.reason     || "-";
    if (cr.trim() !== or.trim()) { changes["paid_leave_reason"] = true; hasChanges = true; }
    return hasChanges ? changes : null;
  };

  const fetchAttendanceLogs = async () => {
    setLoading(true); setError("");
    try {
      const res      = await axios.get(`${baseUrl}/all-attendance?month=${month}`, { withCredentials: true });
      const usersObj = res.data || {};
      setAttendanceData(Object.entries(usersObj).map(([email, user]) => ({ email, ...user })));
      return usersObj;
    } catch {
      setError("Failed to fetch attendance logs");
      setAttendanceData([]);
      return {};
    } finally { setLoading(false); }
  };

  const fetchHistoryLogs = async (userEmail, logsToCompare) => {
    setHistoryLoading(true); setHistoryLogs({}); setChangedFieldsByDate({});
    try {
      const res     = await axios.get(`${baseUrl}/attendance-history/${encodeURIComponent(userEmail)}?month=${month}`, { withCredentials: true });
      const history = res.data.history || {};
      setHistoryLogs(history);
      const newChangedFields = {};
      logsToCompare.forEach((log) => {
        const last = history[log.date]?.[0];
        if (last) { const ch = compareLogs(log, last); if (ch) newChangedFields[log.date] = ch; }
      });
      setChangedFieldsByDate(newChangedFields);
    } catch (err) { console.error("Failed to fetch history logs:", err); }
    setHistoryLoading(false);
  };

  useEffect(() => { fetchAttendanceLogs(); }, []); // eslint-disable-line

  useEffect(() => {
    if (lastSavedDate) { const t = setTimeout(() => setLastSavedDate(null), 3500); return () => clearTimeout(t); }
  }, [lastSavedDate]);

  const userLogs = useMemo(() => {
    const filtered = attendanceData.filter((user) => {
      if (currentUserRole === "chairman" || currentUserRole === "mis-execuitve") return true;
      if (currentUserRole === "manager") return user.location === currentUserLocation;
      return false;
    });
    return filtered
      .map((user) => ({ ...user, todayAttendance: (user.attendance || []).find((a) => a.date === todayStr) || {} }))
      .sort((a, b) => {
        if (a.todayAttendance.office_in && !b.todayAttendance.office_in) return -1;
        if (!a.todayAttendance.office_in && b.todayAttendance.office_in) return 1;
        return (a.name || a.email).localeCompare(b.name || b.email);
      });
  }, [attendanceData, currentUserRole, currentUserLocation, todayStr]);

  const startEditLogs = (user) => {
    setEditLogUserEmail(user.email); setEditedFields({}); setChangedFieldsByDate({});
    modalScrollRef.current = 0; setIsScrollingHandled(false); setActiveInputId(null);
    const editObj = {};
    (user.attendance || []).forEach((log) => {
      editObj[log.date] = { ...log, extra_break_ins: log.extra_break_ins || [], extra_break_outs: log.extra_break_outs || [] };
    });
    setEditLogData(editObj);
  };

  const handleLogFieldChange = useCallback((date, field, value) => {
    setLastSavedDate(null);
    const mc = document.getElementById("expanded-modal-content");
    if (mc) modalScrollRef.current = mc.scrollTop;
    setIsScrollingHandled(true);
    setEditedFields((prev) => ({ ...prev, [date]: { ...prev[date], [field]: true } }));
    setEditLogData((prev)   => ({ ...prev, [date]: { ...prev[date], [field]: value } }));
  }, []);

  const saveEditedLogs = async (userEmail) => {
    setEditSaving(true);
    try {
      await axios.put(`${baseUrl}/edit-attendance/${encodeURIComponent(userEmail)}`, { logs: Object.values(editLogData) }, { withCredentials: true });
      const datesEdited    = Object.keys(editLogData);
      const lastEditedDate = datesEdited[datesEdited.length - 1];
      setEditLogUserEmail(null); setEditLogData({}); setEditedFields({});
      setIsScrollingHandled(false); setActiveInputId(null);
      if (lastEditedDate) setLastSavedDate(lastEditedDate);
      const updated     = await fetchAttendanceLogs();
      const updatedUser = updated[userEmail];
      if (updatedUser) fetchHistoryLogs(userEmail, updatedUser.attendance || []);
    } catch { alert("Failed to save edits."); }
    setEditSaving(false);
  };

  const handleOpenExpandedLog = (userEmail) => {
    setExpandedUserEmail(userEmail);
    const user = userLogs.find((u) => u.email === userEmail);
    modalScrollRef.current = 0; setIsScrollingHandled(false); setActiveInputId(null);
    if (user) fetchHistoryLogs(userEmail, user.attendance || []);
  };

  const handleInputFocus = useCallback((e, date, field) => {
    setActiveInputId(`${date}-${field}`);
    if (e.target.scrollIntoView) e.target.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
  }, []);

  // ── SUB-COMPONENTS ──────────────────────────────────────────────────────────

  const AttendanceHistorySection = React.memo(({ date, historyLogs }) => {
    const history   = historyLogs[date] || [];
    const editCount = history.length;
    const [isExpanded, setIsExpanded] = useState(false);
    if (editCount === 0) return null;
    return (
      <div style={S.historyContainer}>
        <button style={S.historyToggleButton} onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? "❌ Hide Edit History" : `📝 View Edit History (${editCount} ${editCount === 1 ? "Time" : "Times"} Edited)`}
        </button>
        {isExpanded && history.map((oldLog, index) => (
          <div key={index} style={{ ...S.historyLogItem, marginTop: index > 0 ? 15 : 10, border: index === 0 ? "1px dashed #ef4444" : "1px dashed #fca5a5" }}>
            <div style={S.historyHeader}>
              <span>Log State <strong>Before Edit #{editCount - index}</strong></span>
              <span>Edited By: {oldLog.edited_by_email || oldLog.edited_by_user_id}</span>
              <span>Edited On: <strong>{new Date(oldLog.edited_at).toLocaleString()}</strong></span>
            </div>
            <table style={S.historyTable}>
              <thead><tr>{["Login","B.IN","B.OUT","L.IN","L.OUT","B2.IN","B2.OUT","Logout","Extra B.INs","Extra B.OUTs","Remarks"].map(h => <th key={h} style={S.historyTh}>{h}</th>)}</tr></thead>
              <tbody>
                <tr>
                  {[oldLog.office_in,oldLog.break_in,oldLog.break_out,oldLog.lunch_in,oldLog.lunch_out,oldLog.break_in_2,oldLog.break_out_2,oldLog.office_out].map((v,i)=><td key={i} style={S.historyTd}>{fmt(v)}</td>)}
                  <td style={S.historyTd}>{(oldLog.extra_break_ins||[]).join("\n")||"-"}</td>
                  <td style={S.historyTd}>{(oldLog.extra_break_outs||[]).join("\n")||"-"}</td>
                  <td style={S.historyTd}>{oldLog.paid_leave_reason||oldLog.reason||"-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
        {isExpanded && <div style={{textAlign:"center",fontSize:12,color:"#6b7280",marginTop:8}}>⬆️ THE ROW ABOVE (IN THE BLUE TABLE) IS THE <strong>CURRENT</strong> LOG.</div>}
      </div>
    );
  });

  const ExpandedLogTableContent = React.memo(({ user, isEditing, editLogData, handleLogFieldChange, lastSavedDate, editedFields, changedFieldsByDate, historyLogs, historyLoading, handleInputFocus, activeInputId }) => {
    const inputRefs = useRef({});
    useEffect(() => {
      if (activeInputId && inputRefs.current[activeInputId]) {
        requestAnimationFrame(() => { inputRefs.current[activeInputId].focus({ preventScroll: true }); });
      }
    }, [editLogData, activeInputId]);

    return (
      <div style={S.tableWrapper}>
        <table style={S.table}>
          <thead>
            <tr>{["DATE","LOGIN","B.IN","B.OUT","L.IN","L.OUT","B2.IN","B2.OUT","LOGOUT","EXTRA BREAK INS","EXTRA BREAK OUTS","REMARKS"].map(h=><th key={h} style={S.tableTh}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {historyLoading ? (
              <tr><td colSpan={12} style={{textAlign:"center",padding:20,color:"#6b7280"}}>Loading history...</td></tr>
            ) : (
              (user.attendance || []).map((log) => {
                const rowIsLastSaved  = log.date === lastSavedDate;
                const rowData         = isEditing && editLogData[log.date] ? editLogData[log.date] : log;
                const rowEditedFields = editedFields[log.date]      || {};
                const rowChangedFields= changedFieldsByDate[log.date]|| {};
                return (
                  <React.Fragment key={log.date}>
                    <tr style={rowIsLastSaved ? S.savedHighlightRow : S.tableBodyRow}>
                      <td style={{...S.tableTd,fontWeight:700,color:"#1e40af"}}>{log.date}</td>
                      {["office_in","break_in","break_out","lunch_in","lunch_out","break_in_2","break_out_2","office_out"].map(field => {
                        const id = `${log.date}-${field}`;
                        return (
                          <td key={field} style={{...S.tableTd,...(isEditing&&rowEditedFields[field]?S.cellEditHighlight:{}),...(!isEditing&&rowChangedFields[field]?S.cellHistoryChangeHighlight:{})}}>
                            {isEditing
                              ? <input type="time" ref={el=>inputRefs.current[id]=el} value={rowData[field]?rowData[field].slice(0,5):""} onChange={e=>handleLogFieldChange(log.date,field,e.target.value)} onFocus={e=>handleInputFocus(e,log.date,field)} style={{width:86}} />
                              : fmt(log[field])}
                          </td>
                        );
                      })}
                      <td style={S.tableTd}>
                        {isEditing
                          ? <input type="text" ref={el=>inputRefs.current[`${log.date}-extra_break_ins`]=el} style={{width:"100px"}} value={(rowData.extra_break_ins||[]).join(",")} placeholder="09:00,16:24" onChange={e=>handleLogFieldChange(log.date,"extra_break_ins",e.target.value.split(",").map(v=>v.trim()).filter(Boolean))} onFocus={e=>handleInputFocus(e,log.date,"extra_break_ins")} />
                          : log.extra_break_ins?.length>0 ? log.extra_break_ins.map(t=>t||"-").join("\n") : "-"}
                      </td>
                      <td style={S.tableTd}>
                        {isEditing
                          ? <input type="text" ref={el=>inputRefs.current[`${log.date}-extra_break_outs`]=el} style={{width:"100px"}} value={(rowData.extra_break_outs||[]).join(",")} placeholder="12:00,18:02" onChange={e=>handleLogFieldChange(log.date,"extra_break_outs",e.target.value.split(",").map(v=>v.trim()).filter(Boolean))} onFocus={e=>handleInputFocus(e,log.date,"extra_break_outs")} />
                          : log.extra_break_outs?.length>0 ? log.extra_break_outs.map(t=>t||"-").join("\n") : "-"}
                      </td>
                      <td style={S.tableTd}>
                        {isEditing
                          ? <input type="text" ref={el=>inputRefs.current[`${log.date}-paid_leave_reason`]=el} style={{width:140}} value={rowData.paid_leave_reason||rowData.reason||""} placeholder="Remarks" onChange={e=>handleLogFieldChange(log.date,"paid_leave_reason",e.target.value)} onFocus={e=>handleInputFocus(e,log.date,"paid_leave_reason")} />
                          : log.paid_leave_reason||log.reason||"-"}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={12} style={{padding:0,border:"none",backgroundColor:"#fafafa"}}>
                        <AttendanceHistorySection date={log.date} historyLogs={historyLogs} />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  });

  const ExpandedLogSection = ({ user, isScrollingHandled, setIsScrollingHandled }) => {
    const isEditing        = editLogUserEmail === user.email;
    const modalContentRef  = useRef(null);
    useEffect(() => {
      if (isScrollingHandled && modalContentRef.current) {
        requestAnimationFrame(() => { setTimeout(() => { if (modalContentRef.current) { modalContentRef.current.scrollTop = modalScrollRef.current; setIsScrollingHandled(false); } }, 0); });
      }
    }, [editLogData]); // eslint-disable-line
    return (
      <div style={S.expandedModalBackdrop}>
        <div id="expanded-modal-content" ref={modalContentRef} style={S.expandedModalContent}>
          <div style={S.modalHeader}>
            <span>Monthly Attendance Log for <span style={{color:"#2563eb"}}>{user.name||user.email}</span></span>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              {!isEditing && <button style={S.editButton} onClick={()=>startEditLogs(user)}>Edit</button>}
              {isEditing && <>
                <button style={S.saveButton} onClick={()=>saveEditedLogs(user.email)}>{editSaving?"Saving...":"Save"}</button>
                <button style={S.cancelButton} onClick={()=>{setEditLogUserEmail(null);setEditLogData({});setEditedFields({});setIsScrollingHandled(false);setActiveInputId(null);}}>Cancel Edit</button>
              </>}
              <button style={S.modalCloseButton} onClick={()=>{setExpandedUserEmail(null);setEditLogUserEmail(null);setEditLogData({});setHistoryLogs({});setEditedFields({});setChangedFieldsByDate({});setIsScrollingHandled(false);setActiveInputId(null);}}>×</button>
            </div>
          </div>
          <ExpandedLogTableContent user={user} isEditing={isEditing} editLogData={editLogData} handleLogFieldChange={handleLogFieldChange} lastSavedDate={lastSavedDate} editedFields={editedFields} changedFieldsByDate={changedFieldsByDate} historyLogs={historyLogs} historyLoading={historyLoading} handleInputFocus={handleInputFocus} activeInputId={activeInputId} />
        </div>
      </div>
    );
  };

  const expandedUser  = userLogs.find((u) => u.email === expandedUserEmail);
  const noChairman    = userLogs.filter((u) => u.role !== "chairman");
  const totalUsers    = noChairman.length;
  const presentUsers  = noChairman.filter((u) => u.todayAttendance.office_in).length;
  const absentUsers   = totalUsers - presentUsers;

  return (
    <div style={S.container}>
      <div style={S.summaryBar}>
        <div style={S.dateDisplay}>📅 {formattedToday}</div>
        <div style={S.statsGroup}>
          <div style={S.summaryItem}><span style={S.statLabel}>Total Employees:</span><span style={S.statValue}>{totalUsers}</span></div>
          <div style={S.summaryItem}><span style={S.statLabel}>Present Today:</span><span style={S.statValue}>{presentUsers}</span></div>
          <div style={S.summaryItem}><span style={S.statLabel}>Absent Today:</span><span style={S.statValue}>{absentUsers}</span></div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button style={S.showUsersButton} onClick={()=>setShowCards(!showCards)}>
            {showCards ? "Hide User Cards" : "Show User Cards"}
          </button>
          <button
            style={{...S.showUsersButton,backgroundColor:"#10b981",boxShadow:"0 5px 10px rgb(16 185 129 / 0.4)"}}
            onClick={()=>downloadAttendanceExcel(userLogs, month)}
          >
            ⬇️ Download Excel
          </button>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? (
        <div style={S.loading}>Loading attendance records...</div>
      ) : (
        showCards && (
          <div style={S.cardsContainer}>
            {userLogs.filter((u)=>u.role!=="chairman").map((user)=>{
              const isPresent = user.todayAttendance.office_in;
              return (
                <div key={user.email} style={S.card}>
                  <div style={S.cardContent}>
                    <div>
                      <div style={S.cardName}>{user.name||"Unknown Employee"}</div>
                      <div style={S.cardEmail}>{user.email}</div>
                    </div>
                    <button style={S.viewLogButton} onClick={()=>handleOpenExpandedLog(user.email)}>View Logs</button>
                  </div>
                  <div>
                    <span style={{fontWeight:700}}>{isPresent?"🟢 Present Today":"🔴 Absent Today"}</span>
                    {isPresent
                      ? <div style={S.todayAttendance}>Login: {formatTime(user.todayAttendance.office_in)}</div>
                      : <div style={S.todayAttendance}>Status: {user.todayAttendance.paid_leave_reason||user.todayAttendance.reason||"Not Logged In"}</div>}
                    {user.todayAttendance.office_out && <div style={S.todayAttendance}>Logout: {formatTime(user.todayAttendance.office_out)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {expandedUser && <ExpandedLogSection user={expandedUser} isScrollingHandled={isScrollingHandled} setIsScrollingHandled={setIsScrollingHandled} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  historyContainer:{width:"100%",padding:"10px 0",boxSizing:"border-box"},
  historyToggleButton:{background:"#e0f2f1",color:"#047857",border:"none",borderRadius:6,padding:"6px 15px",fontSize:13,fontWeight:600,cursor:"pointer",display:"block",margin:"5px auto",boxShadow:"0 2px 4px rgba(0,0,0,0.1)",userSelect:"none"},
  historyLogItem:{marginTop:10,padding:15,border:"1px dashed #fca5a5",borderRadius:8,backgroundColor:"#fef2f2",boxShadow:"0 2px 5px rgba(252,165,165,0.4)"},
  historyHeader:{display:"flex",justifyContent:"space-between",marginBottom:10,paddingBottom:5,borderBottom:"1px solid #fecaca",fontSize:12,color:"#991b1b",fontWeight:500,flexWrap:"wrap",gap:8},
  historyTable:{width:"100%",borderCollapse:"collapse",fontSize:12},
  historyTh:{padding:6,textAlign:"center",backgroundColor:"#fecaca",color:"#991b1b",fontWeight:700,border:"1px solid #fca5a5"},
  historyTd:{padding:6,textAlign:"center",border:"1px solid #fecaca",color:"#991b1b",whiteSpace:"pre-wrap"},
  cellHistoryChangeHighlight:{backgroundColor:"#ffadad",border:"2px solid #b91c1c",fontWeight:"700",color:"#991b1b"},
  cellEditHighlight:{backgroundColor:"#fffbeb",border:"1px solid #f59e0b"},
  savedHighlightRow:{backgroundColor:"#ccfbf1",boxShadow:"0 0 10px rgba(16,185,129,0.8)",transition:"background-color 0.4s ease-out,box-shadow 0.4s ease-out"},
  container:{width:"100%",fontFamily:"'Inter',sans-serif",minHeight:"auto",height:"auto",padding:"30px 20px"},
  summaryBar:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 25px",backgroundColor:"#1e40af",borderRadius:12,color:"#f9fafb",marginBottom:30,boxShadow:"0 4px 20px rgb(30 64 175 / 0.3)",flexWrap:"wrap",border:"none",boxSizing:"border-box",fontSize:"1.1rem",fontWeight:"700",letterSpacing:"0.04em"},
  dateDisplay:{display:"flex",alignItems:"center",fontWeight:600,color:"#e0e7ff",paddingRight:30,marginRight:20,borderRight:"2px solid #3b82f6",letterSpacing:"0.05em"},
  statsGroup:{display:"flex",gap:60,justifyContent:"flex-start",alignItems:"center",paddingLeft:20,flexGrow:1},
  summaryItem:{display:"flex",gap:10,alignItems:"baseline"},
  statLabel:{fontSize:17,fontWeight:600,color:"rgba(255,255,255,0.8)",whiteSpace:"nowrap"},
  statValue:{fontSize:25,fontWeight:900,color:"#fbbf24",textShadow:"1px 1px 2px #444"},
  showUsersButton:{backgroundColor:"#fbbf24",color:"#1e40af",fontWeight:700,border:"none",borderRadius:8,padding:"12px 28px",fontSize:15,cursor:"pointer",transition:"background-color 0.3s ease",boxShadow:"0 5px 10px rgb(251 191 36 / 0.4)",userSelect:"none"},
  error:{color:"#b22222",backgroundColor:"#ffd4d4",borderRadius:6,padding:12,marginBottom:20,fontWeight:600,textAlign:"center",fontSize:15},
  loading:{textAlign:"center",fontWeight:"bold",color:"#444",padding:50,fontSize:18,fontStyle:"italic"},
  cardsContainer:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:25,justifyContent:"center"},
  card:{backgroundColor:"#ffffff",borderRadius:14,padding:22,boxShadow:"0 10px 30px rgb(0 0 0 / 0.1)",boxSizing:"border-box",transition:"transform 0.25s ease,box-shadow 0.25s ease",cursor:"default"},
  cardContent:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18},
  cardName:{fontWeight:800,fontSize:20,color:"#1e3a8a",userSelect:"text"},
  cardEmail:{fontSize:13,fontStyle:"italic",color:"#667085",marginTop:3},
  viewLogButton:{backgroundColor:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 6px 12px rgb(37 99 235 / 0.4)",transition:"background-color 0.3s ease",userSelect:"none"},
  todayAttendance:{fontSize:14,color:"#006affff",marginTop:10},
  expandedModalBackdrop:{position:"fixed",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(30,64,175,0.85)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:1100,padding:20},
  expandedModalContent:{backgroundColor:"#ffffff",borderRadius:16,boxShadow:"0 20px 40px rgba(30,64,175,0.7)",width:"95%",maxWidth:"1200px",maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column",position:"relative"},
  modalHeader:{padding:"20px 30px",borderBottom:"2px solid #f3f4f6ff",display:"flex",justifyContent:"space-between",alignItems:"center",backgroundColor:"#dbeafe",fontWeight:"700",fontSize:22,color:"#1e40af",position:"sticky",top:0,zIndex:1000},
  modalCloseButton:{background:"#ef4444",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,fontSize:26,cursor:"pointer",lineHeight:"28px",padding:0,fontWeight:"bold"},
  editButton:{background:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:14,fontWeight:700,cursor:"pointer"},
  saveButton:{background:"#10b981",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:14,fontWeight:700,cursor:"pointer"},
  cancelButton:{background:"#f59e0b",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:14,fontWeight:700,cursor:"pointer"},
  tableWrapper:{overflowX:"auto",padding:10,flexGrow:1},
  table:{width:"100%",minWidth:1020,borderCollapse:"collapse"},
  tableTh:{padding:12,textAlign:"center",backgroundColor:"#2563eb",color:"#ffffff",fontWeight:700,position:"sticky",zIndex:100,borderRight:"1px solid rgba(255,255,255,0.15)",borderBottom:"2px solid #1e3a8a"},
  tableTd:{padding:10,textAlign:"center",border:"1px solid #e5e7eb",backgroundColor:"#f9fafb",color:"#374151",transition:"background-color 0.1s ease-in-out,border 0.1s ease-in-out"},
  tableBodyRow:{backgroundColor:"#ffffff",transition:"background-color 0.2s ease-in-out"},
};