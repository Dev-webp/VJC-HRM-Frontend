// ============================================================
// ATTENDANCE EXCEL DOWNLOAD UTILITY
// npm install xlsx
// ============================================================
// KEY FIX: Uses manual wc() cell writing instead of aoa_to_sheet()
// so that cell styles (colours, fonts, borders) are preserved.
// aoa_to_sheet creates plain cells that lose .s style properties.
// ============================================================

import * as XLSX from "xlsx";

export function downloadAttendanceExcel(userLogs, month) {

  // ── Calendar dates ────────────────────────────────────────────────────────
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, mon - 1, i + 1);
    return {
      day: i + 1,
      dow: DOW[d.getDay()],
      iso: d.toISOString().slice(0, 10),
    };
  });

  // ── Safe field readers (handles any backend field name) ───────────────────
  function getField(log, ...keys) {
    if (!log) return null;
    for (const k of keys) {
      const v = log[k];
      if (v != null && String(v).trim().length >= 4) return String(v).trim().slice(0, 5);
    }
    return null;
  }

  const getLoginTime  = (log) => getField(log, "office_in",  "officeIn",  "login",   "log_in",  "in_time",  "inTime");
  const getLogoutTime = (log) => getField(log, "office_out", "officeOut", "logout",  "log_out", "out_time", "outTime");

  // ── Colour palette ────────────────────────────────────────────────────────
  const C = {
    gold        : "FFD700",
    black       : "000000",
    white       : "FFFFFF",
    navy        : "1E3A8A",
    subHeader   : "BFD7FF",
    inOutHeader : "93C5FD",
    sunBg       : "1E40AF",
    absentBg    : "FF4444",
    absentFont  : "FFFFFF",
    lateBg      : "FFA040",
    presentBg   : "C6EFCE",
    presentFont : "1A5C1A",
    logoutBg    : "E0F2FE",   // sky blue  — has logout
    logoutFont  : "0369A1",
    noOutBg     : "FEE2E2",   // light red — missing logout
    noOutFont   : "991B1B",
    halfBg      : "FFF3CD",
    halfFont    : "92400E",
    rowWhite    : "FFFFFF",
    rowAlt      : "EFF6FF",
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const thinBorder = {
    top    : { style: "thin", color: { rgb: "CCCCCC" } },
    bottom : { style: "thin", color: { rgb: "CCCCCC" } },
    left   : { style: "thin", color: { rgb: "CCCCCC" } },
    right  : { style: "thin", color: { rgb: "CCCCCC" } },
  };
  const hdrBorder = {
    top    : { style: "thin", color: { rgb: "999999" } },
    bottom : { style: "thin", color: { rgb: "999999" } },
    left   : { style: "thin", color: { rgb: "999999" } },
    right  : { style: "thin", color: { rgb: "999999" } },
  };

  function makeStyle(bg, fontRgb = "000000", bold = false, alignLeft = false, isHeader = false) {
    return {
      font      : { bold, color: { rgb: fontRgb }, name: "Arial", sz: bold ? 10 : 9 },
      fill      : { fgColor: { rgb: bg } },
      alignment : { horizontal: alignLeft ? "left" : "center", vertical: "center", wrapText: true },
      border    : isHeader ? hdrBorder : thinBorder,
    };
  }

  // ── Write cell — ALWAYS writes value AND style together ───────────────────
  function wc(ws, r, c, value, style) {
    const ref  = XLSX.utils.encode_cell({ r, c });
    const type = typeof value === "number" ? "n" : value == null ? "z" : "s";
    ws[ref] = { t: type, v: value ?? "", s: style };
  }

  // ── Fixed columns ─────────────────────────────────────────────────────────
  const FIXED_LABELS = ["S.NO", "Name", "Employee Designation", "Late P", "Absent"];
  const FIXED        = FIXED_LABELS.length; // 5
  const totalCols    = FIXED + dates.length * 2;

  // ── Build worksheet ───────────────────────────────────────────────────────
  const ws = {};
  ws["!merges"] = [];

  // ── ROW 0: fixed labels + DOW (merged across IN+OUT) ─────────────────────
  FIXED_LABELS.forEach((label, c) => {
    wc(ws, 0, c, label, makeStyle(C.gold, C.black, true, false, true));
  });
  dates.forEach((d, i) => {
    const col   = FIXED + i * 2;
    const isSun = d.dow === "Sun";
    wc(ws, 0, col,     d.dow, makeStyle(isSun ? C.sunBg : C.gold, isSun ? C.white : C.black, true, false, true));
    wc(ws, 0, col + 1, "",    makeStyle(isSun ? C.sunBg : C.gold, isSun ? C.white : C.black, true, false, true));
    ws["!merges"].push({ s: { r: 0, c: col }, e: { r: 0, c: col + 1 } });
  });

  // ── ROW 1: empty fixed + day numbers (merged across IN+OUT) ──────────────
  FIXED_LABELS.forEach((_, c) => {
    wc(ws, 1, c, "", makeStyle(C.subHeader, C.navy, true, false, true));
  });
  dates.forEach((d, i) => {
    const col   = FIXED + i * 2;
    const isSun = d.dow === "Sun";
    wc(ws, 1, col,     d.day, makeStyle(isSun ? C.sunBg : C.subHeader, isSun ? C.white : C.navy, true, false, true));
    wc(ws, 1, col + 1, "",    makeStyle(isSun ? C.sunBg : C.subHeader, isSun ? C.white : C.navy, true, false, true));
    ws["!merges"].push({ s: { r: 1, c: col }, e: { r: 1, c: col + 1 } });
  });

  // ── ROW 2: "IN" | "OUT" sub-headers ──────────────────────────────────────
  FIXED_LABELS.forEach((_, c) => {
    wc(ws, 2, c, "", makeStyle(C.inOutHeader, C.navy, true, false, true));
  });
  dates.forEach((d, i) => {
    const col   = FIXED + i * 2;
    const isSun = d.dow === "Sun";
    wc(ws, 2, col,     "IN",  makeStyle(isSun ? C.sunBg : C.inOutHeader, isSun ? C.white : C.navy,      true, false, true));
    wc(ws, 2, col + 1, "OUT", makeStyle(isSun ? C.sunBg : C.logoutBg,    isSun ? C.white : C.logoutFont, true, false, true));
  });

  // ── DATA ROWS (start at excel row 3) ─────────────────────────────────────
  const filteredUsers = userLogs.filter((u) => u.role !== "chairman");

  filteredUsers.forEach((user, idx) => {
    const excelRow = idx + 3;
    const isAlt    = idx % 2 === 1;
    const rowBg    = isAlt ? C.rowAlt : C.rowWhite;

    // Build date → log lookup (support any key name backend uses)
    const logByDate = {};
    (user.attendance || []).forEach((log) => {
      const key = log.date || log.iso || log.attendance_date || log.day;
      if (key) logByDate[key] = log;
    });

    // Compute late + absent counts
    let lateCount = 0, absentCount = 0;
    dates.forEach(({ iso, dow }) => {
      if (dow === "Sun") return;
      const log       = logByDate[iso];
      const loginTime = getLoginTime(log);
      if (!log || !loginTime) {
        absentCount++;
      } else {
        const [h, m] = loginTime.split(":").map(Number);
        if (h > 10 || (h === 10 && m > 5)) lateCount++;
      }
    });

    // ── Fixed columns ───────────────────────────────────────────────────────
    wc(ws, excelRow, 0, idx + 1,                                  makeStyle(rowBg, C.navy, true));
    wc(ws, excelRow, 1, user.name || user.email,                  makeStyle(rowBg, C.navy, false, true));
    wc(ws, excelRow, 2, user.designation || user.role || "",      makeStyle(rowBg, "374151", false, true));
    wc(ws, excelRow, 3, lateCount,                                makeStyle(lateCount   > 0 ? C.lateBg   : rowBg, lateCount   > 0 ? C.black   : C.black, lateCount   > 0));
    wc(ws, excelRow, 4, absentCount,                              makeStyle(absentCount > 0 ? C.absentBg : rowBg, absentCount > 0 ? C.white   : C.black, absentCount > 0));

    // ── Day IN + OUT columns ────────────────────────────────────────────────
    dates.forEach(({ iso, dow }, i) => {
      const colIN  = FIXED + i * 2;
      const colOUT = FIXED + i * 2 + 1;
      const log    = logByDate[iso];

      // ── Sunday ─────────────────────────────────────────────────────────
      if (dow === "Sun") {
        wc(ws, excelRow, colIN,  "S", makeStyle(C.sunBg, C.white, true));
        wc(ws, excelRow, colOUT, "S", makeStyle(C.sunBg, C.white, true));
        return;
      }

      const loginTime  = getLoginTime(log);
      const logoutTime = getLogoutTime(log);

      // ── No log at all / Absent ──────────────────────────────────────────
      if (!log || !loginTime) {
        wc(ws, excelRow, colIN,  "A",      makeStyle(C.absentBg, C.absentFont, true));
        wc(ws, excelRow, colOUT, "No Out", makeStyle(C.absentBg, C.absentFont, false));
        return;
      }

      // ── Half day ────────────────────────────────────────────────────────
      const reason  = log.paid_leave_reason || log.reason || "";
      const isHalf  = /half|1\/2/i.test(reason);
      if (isHalf) {
        wc(ws, excelRow, colIN,  loginTime  || "½ Day", makeStyle(C.halfBg, C.halfFont, true));
        wc(ws, excelRow, colOUT, logoutTime || "No Out",
          logoutTime
            ? makeStyle(C.logoutBg, C.logoutFont, false)
            : makeStyle(C.noOutBg,  C.noOutFont,  true)
        );
        return;
      }

      // ── Present ─────────────────────────────────────────────────────────
      const [h, m] = loginTime.split(":").map(Number);
      const isLate = !isNaN(h) && (h > 10 || (h === 10 && m > 5));

      // IN cell
      wc(ws, excelRow, colIN, loginTime,
        makeStyle(
          isLate ? C.lateBg    : C.presentBg,
          isLate ? C.black     : C.presentFont,
          isLate
        )
      );

      // OUT cell — sky blue if logged out, red tint "No Out" if missing
      if (logoutTime) {
        wc(ws, excelRow, colOUT, logoutTime, makeStyle(C.logoutBg, C.logoutFont, false));
      } else {
        wc(ws, excelRow, colOUT, "No Out",   makeStyle(C.noOutBg,  C.noOutFont,  true));
      }
    });
  });

  // ── Worksheet range ───────────────────────────────────────────────────────
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: filteredUsers.length + 2, c: totalCols - 1 },
  });

  // ── Column widths ─────────────────────────────────────────────────────────
  ws["!cols"] = [
    { wch: 5  }, // S.NO
    { wch: 30 }, // Name
    { wch: 28 }, // Designation
    { wch: 7  }, // Late P
    { wch: 7  }, // Absent
    ...dates.flatMap(() => [{ wch: 7 }, { wch: 7 }]),
  ];

  // ── Row heights ───────────────────────────────────────────────────────────
  ws["!rows"] = [
    { hpt: 22 },
    { hpt: 18 },
    { hpt: 16 },
    ...filteredUsers.map(() => ({ hpt: 18 })),
  ];

  // ── Write workbook ────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Attendance ${month}`);
  XLSX.writeFile(wb, `Attendance_${month}.xlsx`);
}