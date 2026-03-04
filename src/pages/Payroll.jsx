/* eslint-disable */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .chair-wrap {
    font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 100vh;
    background: #f0f2f8;
  }
  .chair-header {
    background: #fff; border-bottom: 1px solid #e4e8f0; padding: 18px 24px;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 14px; position: sticky; top: 0; z-index: 100;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }
  .chair-header-left .eyebrow {
    font-size: 10px; font-weight: 700; color: #1d5bd4;
    letter-spacing: 0.12em; text-transform: uppercase;
  }
  .chair-header-left h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(18px, 4vw, 26px); font-weight: 900; color: #111827; line-height: 1.1;
  }
  .chair-header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .month-picker-wrap label {
    display: block; font-size: 9px; font-weight: 700; color: #999;
    letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 3px;
  }
  .month-picker-wrap input[type="month"] {
    padding: 8px 12px; border-radius: 8px; border: 1.5px solid #e0e6f0;
    font-size: 14px; font-weight: 700; color: #111827; background: #fafbff;
    cursor: pointer; outline: none; font-family: 'DM Sans', sans-serif; transition: border-color .2s;
  }
  .month-picker-wrap input[type="month"]:focus { border-color: #1d5bd4; }
  .holiday-badge {
    background: #fff3f3; border: 1.5px solid #ffd5d5; border-radius: 10px; padding: 8px 14px; text-align: center;
  }
  .holiday-badge .hb-label { font-size: 9px; color: #e53935; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .holiday-badge .hb-val { font-size: 22px; font-weight: 900; color: #e53935; line-height: 1; }
  .chair-body { padding: 28px 20px; max-width: 1400px; margin: 0 auto; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .stat-card {
    background: #fff; border-radius: 16px; padding: 20px 22px;
    box-shadow: 0 2px 14px rgba(0,0,0,0.06); border-top: 4px solid var(--accent);
    display: flex; flex-direction: column; gap: 6px; transition: transform .18s, box-shadow .18s;
  }
  .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
  .stat-card .sc-icon { font-size: 24px; }
  .stat-card .sc-label { font-size: 10px; font-weight: 700; color: #999; letter-spacing: 0.1em; text-transform: uppercase; }
  .stat-card .sc-val {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(17px, 2.5vw, 22px); font-weight: 900; color: #111827; line-height: 1.15; word-break: break-word;
  }
  .stat-card .sc-sub { font-size: 11px; color: var(--accent); font-weight: 600; }
  .table-section { background: #fff; border-radius: 20px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); overflow: hidden; }
  .table-toolbar {
    padding: 22px 24px 18px; display: flex; align-items: flex-start;
    justify-content: space-between; flex-wrap: wrap; gap: 14px; border-bottom: 1px solid #f0f0f0;
  }
  .table-toolbar h2 { font-size: 17px; font-weight: 800; color: #111827; }
  .table-toolbar p { font-size: 12px; color: #888; margin-top: 2px; }
  .search-box {
    padding: 10px 16px; border-radius: 10px; border: 1.5px solid #e8ecf4;
    font-size: 14px; color: #333; width: 100%; max-width: 300px;
    outline: none; background: #fafbff; font-family: 'DM Sans', sans-serif; transition: border-color .2s;
  }
  .search-box:focus { border-color: #1d5bd4; }
  .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .emp-table { width: 100%; border-collapse: collapse; min-width: 680px; }
  .emp-table thead tr { background: #fafbff; }
  .emp-table th {
    padding: 12px 18px; font-size: 10px; font-weight: 700; color: #999;
    letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 2px solid #f0f0f0; white-space: nowrap;
  }
  .emp-table th.right { text-align: right; }
  .emp-table th.center { text-align: center; }
  .emp-table td { padding: 13px 18px; border-bottom: 1px solid #f5f6fa; vertical-align: middle; }
  .emp-table td.right { text-align: right; }
  .emp-table td.center { text-align: center; }
  .emp-table tbody tr { transition: background .12s; }
  .emp-table tbody tr:hover { background: #f0f5ff !important; }
  .emp-table tfoot tr { background: #f7f9ff; border-top: 2px solid #e8ecf4; }
  .emp-table tfoot td { padding: 13px 18px; font-weight: 800; font-size: 14px; }
  .emp-name { font-weight: 700; font-size: 14px; color: #111827; }
  .emp-loc { font-size: 11px; color: #1d5bd4; font-weight: 600; margin-top: 1px; }
  .emp-email { font-size: 13px; color: #555; }
  .role-badge { display: inline-block; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; white-space: nowrap; }
  .net-val { font-weight: 800; font-size: 14px; color: #1d5bd4; }
  .net-saved { font-size: 10px; color: #e67e22; font-weight: 600; margin-top: 1px; }
  .prev-val { font-weight: 700; font-size: 14px; color: #27ae60; }
  .tot-label { font-size: 12px; font-weight: 700; color: #888; }
  .view-btn {
    background: #1d5bd4; color: #fff; border: none; border-radius: 8px;
    padding: 8px 16px; font-size: 12px; font-weight: 700; cursor: pointer;
    font-family: 'DM Sans', sans-serif; box-shadow: 0 2px 8px rgba(29,91,212,0.25);
    transition: background .15s, transform .12s; white-space: nowrap;
  }
  .view-btn:hover { background: #1447a8; transform: scale(1.03); }
  .view-btn:active { transform: scale(0.97); }
  .loading-state { padding: 60px; text-align: center; color: #aaa; font-size: 16px; }
  .emp-cards { display: none; padding: 12px; }
  .emp-card {
    background: #fff; border-radius: 14px; padding: 16px 18px; margin-bottom: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06); border-left: 4px solid #1d5bd4;
  }
  .emp-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
  .emp-card-meta { flex: 1; min-width: 0; }
  .emp-card-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px;
  }
  .emp-card-row:last-of-type { border-bottom: none; }
  .eck-label { color: #888; font-weight: 600; font-size: 12px; }
  .eck-val { font-weight: 700; color: #111827; }
  @media (max-width: 700px) {
    .chair-body { padding: 16px 12px; }
    .table-scroll { display: none; }
    .emp-cards { display: block; }
    .table-section { overflow: visible; background: transparent; box-shadow: none; border-radius: 0; }
    .table-toolbar { background: #fff; border-radius: 14px; margin-bottom: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); padding: 18px 16px; }
    .search-box { max-width: 100%; }
    .stat-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat-card { padding: 16px; }
  }
  @media (max-width: 400px) {
    .stat-grid { grid-template-columns: 1fr; }
    .chair-header { flex-direction: column; align-items: flex-start; }
  }
  .modal-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(10,20,50,0.55); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .modal-box {
    background: #fff; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    padding: 32px 28px; width: 100%; max-width: 500px; max-height: 92vh;
    overflow-y: auto; position: relative; font-family: 'DM Sans', sans-serif;
  }
  .modal-close {
    position: absolute; top: 14px; right: 16px; background: none; border: none;
    font-size: 22px; color: #bbb; cursor: pointer; line-height: 1; transition: color .15s;
  }
  .modal-close:hover { color: #e53935; }
  .modal-eyebrow { font-size: 10px; color: #1d5bd4; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
  .modal-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 900; color: #111827; }
  .modal-subtitle { font-size: 13px; color: #888; margin-top: 2px; margin-bottom: 20px; }
  .modal-table { width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid #f0f0f0; margin-bottom: 18px; }
  .modal-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; font-size: 14px; }
  .modal-row:nth-child(even) { background: #fafbff; }
  .mr-label { color: #555; font-weight: 500; }
  .mr-val { font-weight: 700; }
  .modal-section { background: #f7f9ff; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; }
  .modal-section .modal-row { padding: 8px 0; border-bottom: 1px solid #eef0f8; background: transparent !important; }
  .modal-section .modal-row:last-child { border-bottom: none; }
  .modal-payout {
    background: linear-gradient(135deg, #1d5bd4, #4a90e2); border-radius: 12px;
    padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
  }
  .mp-label { color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 700; }
  .mp-val { color: #fff; font-size: 22px; font-weight: 900; font-family: 'Playfair Display', serif; }
  .modal-deduct { display: flex; justify-content: space-between; padding: 10px 4px; border-bottom: 1px solid #f0f0f0; }
  .modal-close-btn {
    width: 100%; margin-top: 18px; padding: 12px; background: #f5f5f5;
    border: none; border-radius: 8px; font-size: 14px; font-weight: 700;
    color: #555; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background .15s;
  }
  .modal-close-btn:hover { background: #ebebeb; }
`;

function injectStyles() {
  if (document.getElementById("chair-css")) return;
  const s = document.createElement("style");
  s.id = "chair-css";
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

function daysInMonth(month) {
  const [year, mon] = month.split("-");
  return new Date(parseInt(year), parseInt(mon), 0).getDate();
}
function fmt(n) {
  return Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(n) {
  return Number(n ?? 0).toLocaleString("en-IN");
}
function getPrevMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

// ✅ FIXED: Takes raw workDays + salary values, parses them safely
function calcNet(workDays, month, salary) {
  const wd  = parseFloat(workDays);  // handles "21.00" string from Python Decimal
  const sal = parseFloat(salary);    // handles null, "45000.00", 45000
  if (isNaN(wd) || isNaN(sal) || sal <= 0) return null;
  const total  = daysInMonth(month);
  const absent = Math.max(total - wd, 0);
  const net    = sal - absent * (sal / total);
  return net >= 0 ? Math.round(net * 100) / 100 : 0;
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="stat-card" style={{ "--accent": accent }}>
      <div className="sc-icon">{icon}</div>
      <div className="sc-label">{label}</div>
      <div className="sc-val">{value}</div>
      {sub && <div className="sc-sub">{sub}</div>}
    </div>
  );
}

function RoleBadge({ role }) {
  const r = (role || "").toLowerCase();
  const map = {
    chairman: { bg: "#e8efff", color: "#1d5bd4" },
    manager:  { bg: "#e8fff0", color: "#27ae60" },
  };
  const style = map[r] || { bg: "#f5f5f5", color: "#666" };
  return <span className="role-badge" style={{ background: style.bg, color: style.color }}>{role || "—"}</span>;
}

function AttendanceSummaryModal({ attendanceSummary, selectedUser, selectedMonth, holidaysCount, userSalary, netSalary, calculatedAbsentDays, closeModal }) {
  if (!attendanceSummary || !selectedUser) return null;
  const saved = userSalary - netSalary;
  const rows = [
    { label: "Total Days in Month",  value: daysInMonth(selectedMonth),      color: "#111827" },
    { label: "Total Sundays",        value: attendanceSummary.sundays   ?? 0, color: "#888"    },
    { label: "Company Holidays",     value: holidaysCount,                    color: "#e53935" },
    { label: "Full Attendance Days", value: attendanceSummary.fullDays  ?? 0, color: "#1d5bd4" },
    { label: "Half Days",            value: attendanceSummary.halfDays  ?? 0, color: "#1d5bd4" },
    { label: "Paid Leaves Applied",  value: attendanceSummary.paidLeaves ?? 0, color: "#27ae60" },
  ];
  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal}>✕</button>
        <div className="modal-eyebrow">Payroll Summary · {selectedMonth}</div>
        <div className="modal-title">{selectedUser.name}</div>
        <div className="modal-subtitle">{selectedUser.email}</div>
        <div className="modal-table">
          {rows.map((r, i) => (
            <div className="modal-row" key={i}>
              <span className="mr-label">{r.label}</span>
              <span className="mr-val" style={{ color: r.color }}>{r.value}</span>
            </div>
          ))}
        </div>
        <div className="modal-section">
          <div className="modal-row">
            <span className="mr-label" style={{ fontWeight: 700, color: "#111827" }}>Total Working Days</span>
            <span className="mr-val" style={{ color: "#27ae60", fontSize: 16 }}>{attendanceSummary.workDays ?? 0}</span>
          </div>
          <div className="modal-row">
            <span className="mr-label" style={{ fontWeight: 700, color: "#111827" }}>Total Absent Days</span>
            <span className="mr-val" style={{ color: "#e53935", fontSize: 16 }}>{calculatedAbsentDays}</span>
          </div>
        </div>
        <div className="modal-deduct">
          <span style={{ fontSize: 15, color: "#555", fontWeight: 600 }}>Gross Monthly Salary</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>₹ {fmtInt(userSalary)}</span>
        </div>
        <div className="modal-deduct" style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 15, color: "#555", fontWeight: 600 }}>Amount Deducted</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#e67e22" }}>– ₹ {fmt(saved)}</span>
        </div>
        <div className="modal-payout">
          <span className="mp-label">Net Salary Payable</span>
          <span className="mp-val">₹ {fmt(netSalary)}</span>
        </div>
        <button className="modal-close-btn" onClick={closeModal}>Close</button>
      </div>
    </div>
  );
}

export default function ChairmanDashboard() {
  injectStyles();

  const [users,                setUsers]                = useState([]);
  const [loading,              setLoading]              = useState(false);
  const [selectedUser,         setSelectedUser]         = useState(null);
  const [attendanceSummary,    setAttendanceSummary]    = useState(null);
  const [selectedMonth,        setSelectedMonth]        = useState(() => new Date().toISOString().slice(0, 7));
  const [searchTerm,           setSearchTerm]           = useState("");
  const [holidaysCount,        setHolidaysCount]        = useState(0);
  const [userSalary,           setUserSalary]           = useState(0);
  const [netSalary,            setNetSalary]            = useState(0);
  const [calculatedAbsentDays, setCalculatedAbsentDays] = useState(0);
  const [modalOpen,            setModalOpen]            = useState(false);
  const [userRole,             setUserRole]             = useState("");
  const [userLocation,         setUserLocation]         = useState("");
  const [allSummaries,         setAllSummaries]         = useState({});
  const [statsLoading,         setStatsLoading]         = useState(false);

  useEffect(() => {
    axios.get(`${baseUrl}/me`, { withCredentials: true })
      .then(res => { setUserRole(res.data.role || ""); setUserLocation(res.data.location || ""); })
      .catch(() => {});
  }, []);

  const fetchHolidays = useCallback(async (month) => {
    try {
      const res = await axios.get(`${baseUrl}/holidays-count?month=${month}`, { withCredentials: true });
      const count = res.data.count ?? 0;
      setHolidaysCount(count);
      return count;
    } catch { setHolidaysCount(0); return 0; }
  }, []);

  const fetchAttendanceSummary = useCallback(async (user, month) => {
    if (!user || !month) return;
    try {
      const attendanceRes = await axios.post(
        `${baseUrl}/get-attendance-summary`,
        { email: user.email, month },
        { withCredentials: true }
      );
      const summary  = attendanceRes.data;
      // ✅ Always parse salary safely
      const salary   = parseFloat(user.salary) || 0;
      await fetchHolidays(month);
      const totalDays       = daysInMonth(month);
      const workDays        = parseFloat(summary?.workDays) || 0;
      const finalAbsentDays = Math.max(totalDays - workDays, 0);
      const net             = salary > 0 ? salary - finalAbsentDays * (salary / totalDays) : 0;
      setAttendanceSummary(summary);
      setSelectedUser(user);
      setUserSalary(salary);
      setNetSalary(net >= 0 ? net : 0);
      setCalculatedAbsentDays(finalAbsentDays);
      setModalOpen(true);
    } catch {
      alert("No attendance summary found for this employee for the selected month.");
    }
  }, [fetchHolidays]);

  // ─── Main data fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await axios.get(`${baseUrl}/all-attendance`, { withCredentials: true });

        const usersList = Object.entries(res.data).map(([email, info]) => ({
          email,
          name:     info.name,
          role:     info.role,
          location: info.location || "",
          // ✅ KEY FIX: salary from /all-attendance comes as a Postgres Decimal string e.g. "45000.00"
          // parseFloat handles: "45000.00" → 45000, null → NaN → fallback 0
          salary: info.salary != null ? parseFloat(info.salary) : 0,
        }));

        setUsers(usersList);
        setStatsLoading(true);

        const curMonth = new Date().toISOString().slice(0, 7);
        const prv      = getPrevMonth();
        const summaries = {};

        await Promise.all(
          usersList.map(async (u) => {

            // Fetch one month's summary — returns null on any error/404
            const fetchOne = async (month) => {
              try {
                const r = await axios.post(
                  `${baseUrl}/get-attendance-summary`,
                  { email: u.email, month },
                  { withCredentials: true }
                );
                // ✅ workDays may be a string "21.00" from Python Decimal serialisation
                return calcNet(r.data?.workDays, month, u.salary);
              } catch {
                return null; // 404 or no data → show "—"
              }
            };

            const [current, prev] = await Promise.all([
              fetchOne(curMonth),
              fetchOne(prv),
            ]);

            summaries[u.email] = { current, prev, gross: u.salary };
          })
        );

        setAllSummaries(summaries);
        setStatsLoading(false);
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser && selectedMonth) fetchAttendanceSummary(selectedUser, selectedMonth);
    else fetchHolidays(selectedMonth);
    // eslint-disable-next-line
  }, [selectedMonth]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let filtered = users.filter(({ email, name }) =>
      email.toLowerCase().includes(term) || (name && name.toLowerCase().includes(term))
    );
    if (userRole.toLowerCase() === "manager" && userLocation)
      filtered = filtered.filter(u => u.location?.toLowerCase() === userLocation.toLowerCase());
    return filtered;
  }, [users, searchTerm, userRole, userLocation]);

  const totalCurrentNet = useMemo(() =>
    Object.values(allSummaries).reduce((s, v) => s + (v.current ?? 0), 0),
  [allSummaries]);
  const totalPrevNet = useMemo(() =>
    Object.values(allSummaries).reduce((s, v) => s + (v.prev ?? 0), 0),
  [allSummaries]);

  const filtTotalCur  = filteredUsers.reduce((s, u) => s + (allSummaries[u.email]?.current ?? 0), 0);
  const filtTotalPrev = filteredUsers.reduce((s, u) => s + (allSummaries[u.email]?.prev    ?? 0), 0);

  return (
    <div className="chair-wrap">
      <header className="chair-header">
        <div className="chair-header-left">
          <div className="eyebrow">VJC Overseas</div>
          <h1>Chairman Payroll Portal</h1>
        </div>
        <div className="chair-header-right">
          <div className="month-picker-wrap">
            <label>Select Month</label>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          </div>
          <div className="holiday-badge">
            <div className="hb-label">Holidays</div>
            <div className="hb-val">{holidaysCount}</div>
          </div>
        </div>
      </header>

      <div className="chair-body">
        <div className="stat-grid">
          <StatCard icon="👥" label="Total Employees" value={users.length} sub={`${filteredUsers.length} shown`} accent="#1d5bd4" />
        </div>

        <div className="table-section">
          <div className="table-toolbar">
            <div>
              <h2>Employee Directory</h2>
              <p>Tap "View Summary" for full payroll breakdown — <b>{selectedMonth}</b></p>
            </div>
            <input
              className="search-box"
              type="text"
              placeholder="🔍  Search name or email…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading-state">Loading employee data…</div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="table-scroll">
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th className="center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length ? filteredUsers.map((user, idx) => (
                      <tr key={user.email} style={{ background: idx % 2 === 0 ? "#fff" : "#fafbff" }}>
                        <td>
                          <div className="emp-name">{user.name}</div>
                          {user.location && <div className="emp-loc">{user.location}</div>}
                        </td>
                        <td><span className="emp-email">{user.email}</span></td>
                        <td><RoleBadge role={user.role} /></td>
                        <td className="center">
                          <button className="view-btn" onClick={() => fetchAttendanceSummary(user, selectedMonth)}>
                            View Summary
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#aaa" }}>
                          No employees found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="emp-cards">
                {filteredUsers.length ? filteredUsers.map(user => (
                  <div className="emp-card" key={user.email}>
                    <div className="emp-card-top">
                      <div className="emp-card-meta">
                        <div className="emp-name">{user.name}</div>
                        <div className="emp-email" style={{ marginTop: 2 }}>{user.email}</div>
                        {user.location && <div className="emp-loc">{user.location}</div>}
                      </div>
                      <RoleBadge role={user.role} />
                    </div>
                    <button
                      className="view-btn"
                      style={{ marginTop: 4, width: "100%", padding: "11px", fontSize: 13 }}
                      onClick={() => fetchAttendanceSummary(user, selectedMonth)}
                    >
                      View Full Summary
                    </button>
                  </div>
                )) : (
                  <div style={{ textAlign: "center", color: "#aaa", padding: "30px 12px" }}>
                    No employees found.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <AttendanceSummaryModal
          attendanceSummary={attendanceSummary}
          selectedUser={selectedUser}
          selectedMonth={selectedMonth}
          holidaysCount={holidaysCount}
          userSalary={userSalary}
          netSalary={netSalary}
          calculatedAbsentDays={calculatedAbsentDays}
          closeModal={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}