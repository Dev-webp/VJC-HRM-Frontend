/* eslint-disable */
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

// ── Section definitions ───────────────────────────────────────────────────────
const ALL_SECTIONS = [
  { key: "attendance", label: "Attendance",      emoji: "🕒", color: "#3b82f6" },
  { key: "leave",      label: "Leave",           emoji: "📅", color: "#f59e0b" },
  { key: "salary",     label: "Salary & Payroll",emoji: "💰", color: "#10b981" },
  { key: "chat",       label: "Team Chat",       emoji: "💬", color: "#6366f1" },
  { key: "leads",      label: "My Leads",        emoji: "🎯", color: "#ec4899" },
  { key: "sales",      label: "Sales Stats",     emoji: "📈", color: "#f97316" },
  { key: "chatlogs",   label: "Chat Logs",       emoji: "📋", color: "#8b5cf6" },
  { key: "fulldata",   label: "Full Data",       emoji: "📊", color: "#0ea5e9" },
];

// ── Department definitions (mirrors CreateUser) ───────────────────────────────
const DEFAULT_DEPARTMENTS = [
  "CEO", "Director", "Branch Manager",
  "Team Manager Sales-Immigration/Study/Visit",
  "Team Manager Process-Immigration/Study/Visit",
  "Sales-Immigration/Study/Visit",
  "Process-Immigration/Study/Visit/RMS",
  "Digital Marketing", "MIS", "Developers-IT", "Reception-Hyd/Bgl",
];

const LOCATIONS = ["Bangalore", "Hyderabad", "Chennai", "Mumbai", "Delhi"];

// ─────────────────────────────────────────────────────────────────────────────
// Reusable UI
// ─────────────────────────────────────────────────────────────────────────────
function AccessChip({ section, enabled, onClick, saving }) {
  return (
    <div
      onClick={() => !saving && onClick()}
      title={saving ? "Saving…" : `${enabled ? "Disable" : "Enable"} ${section.label}`}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "7px 11px", borderRadius: 9,
        cursor: saving ? "not-allowed" : "pointer",
        border: `1.5px solid ${enabled ? section.color + "55" : "#e5e7eb"}`,
        background: enabled ? section.color + "0e" : "#f9fafb",
        transition: "all .15s", userSelect: "none", opacity: saving ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 14 }}>{section.emoji}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: enabled ? "#111827" : "#9ca3af", whiteSpace: "nowrap" }}>
        {section.label}
      </span>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: saving ? "#f59e0b" : enabled ? "#22c55e" : "#e5e7eb",
        transition: "background .15s",
      }} />
    </div>
  );
}

function EditInput({ label, value, onChange, type = "text", as = "input", options = [] }) {
  const [focused, setFocused] = React.useState(false);
  const base = {
    padding: "8px 10px", borderRadius: 8, fontSize: 13,
    border: `1.5px solid ${focused ? "#4f6ef7" : "#e5e7eb"}`,
    boxShadow: focused ? "0 0 0 3px rgba(79,110,247,0.08)" : "none",
    outline: "none", background: "#fff", color: "#111827",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
    transition: "border-color .15s",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      {as === "select" ? (
        <select value={value || ""} onChange={onChange} style={base}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value || ""} onChange={onChange} style={base}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #f9fafb" }}>
      <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#374151", fontWeight: 500, wordBreak: "break-word" }}>{value || "—"}</span>
    </div>
  );
}

// ── Searchable Department Select ──────────────────────────────────────────────
function DeptSelect({ value, onChange, departments, isChairman, onAddDept }) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newDept, setNewDept] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setAddMode(false); setSearch(""); } }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = departments.filter(d => d.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position: "relative", flex: "1 1 160px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Department</div>
      <div onClick={() => { setOpen(o => !o); setSearch(""); }}
        style={{
          padding: "8px 10px", borderRadius: 8, fontSize: 13,
          border: `1.5px solid ${open ? "#4f6ef7" : "#e5e7eb"}`,
          background: "#fff", cursor: "pointer", userSelect: "none",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          color: value ? "#111827" : "#9ca3af",
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontSize: 13 }}>
          {value || "Select dept"}
        </span>
        <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 9999,
          background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)", maxHeight: 240, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…" style={{
              padding: "8px 12px", border: "none", borderBottom: "1px solid #f3f4f6",
              outline: "none", fontSize: 12, fontFamily: "inherit", flexShrink: 0,
            }} />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map(d => (
              <div key={d} onClick={() => { onChange(d); setOpen(false); setSearch(""); }}
                style={{
                  padding: "8px 12px", fontSize: 12, cursor: "pointer",
                  background: value === d ? "#eef0fe" : "transparent",
                  color: value === d ? "#4f46e5" : "#111827",
                  fontWeight: value === d ? 700 : 400,
                }}
                onMouseEnter={e => { if (value !== d) e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={e => { if (value !== d) e.currentTarget.style.background = "transparent"; }}
              >{d}</div>
            ))}
            {filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af" }}>No results</div>}
          </div>
          {isChairman && (
            <div style={{ borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
              {addMode ? (
                <div style={{ padding: "8px 10px", display: "flex", gap: 6 }}>
                  <input autoFocus value={newDept} onChange={e => setNewDept(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { if (newDept.trim()) { onAddDept(newDept.trim()); onChange(newDept.trim()); } setOpen(false); setAddMode(false); setNewDept(""); }
                      if (e.key === "Escape") setAddMode(false);
                    }}
                    placeholder="New department…" style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1.5px solid #e5e7eb", fontSize: 11, fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => { if (newDept.trim()) { onAddDept(newDept.trim()); onChange(newDept.trim()); } setOpen(false); setAddMode(false); setNewDept(""); }}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#4f6ef7", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Add</button>
                  <button onClick={() => setAddMode(false)} style={{ padding: "5px 8px", borderRadius: 6, border: "1.5px solid #e5e7eb", background: "#fff", color: "#6b7280", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <div onClick={() => setAddMode(true)}
                  style={{ padding: "8px 12px", fontSize: 11, color: "#4f6ef7", fontWeight: 700, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#eef0fe"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  ＋ Add New Department
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ShowAllUsers() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [visible, setVisible]         = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch]           = useState("");
  const [activeTab, setActiveTab]     = useState("active");
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);

  // Edit state
  const [editingEmail, setEditingEmail]   = useState(null);
  const [editedUser, setEditedUser]       = useState({});
  const [newPassword, setNewPassword]     = useState("");
  const [showPwd, setShowPwd]             = useState({});
  const [showOldPwd, setShowOldPwd]       = useState({});

  // Role assign state
  const [assigningEmail, setAssigningEmail] = useState(null);
  const [assignRole, setAssignRole]         = useState("");
  const [assignLocation, setAssignLocation] = useState("");

  // Employment status state
  const [statusAction, setStatusAction]   = useState({});
  const [statusRemarks, setStatusRemarks] = useState({});

  // Access panel state
  const [sectionMap, setSectionMap]       = useState({});
  const [savingSection, setSavingSection] = useState(null);
  const [accessOpen, setAccessOpen]       = useState({});

  const isChairman = currentUser?.role?.toLowerCase() === "chairman";
  const isManager  = currentUser?.role?.toLowerCase() === "manager";

  // Fetch current user
  useEffect(() => {
    axios.get(`${baseUrl}/me`, { withCredentials: true })
      .then(r => setCurrentUser(r.data))
      .catch(() => {});

    // Fetch custom departments
    axios.get(`${baseUrl}/departments`, { withCredentials: true })
      .then(r => {
        const custom = (r.data || []).map(d => d.name || d);
        setDepartments([...DEFAULT_DEPARTMENTS, ...custom.filter(n => !DEFAULT_DEPARTMENTS.includes(n))]);
      })
      .catch(() => {});
  }, []);

  // Fetch all users + their section access
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/all-attendance?include_inactive=true`, { withCredentials: true });
      const formatted = Object.entries(res.data).map(([email, info]) => ({
        email,
        name:              info.name || "",
        role:              info.role || "",
        location:          info.location || "",
        employeeId:        info.employeeId || "",
        salary:            info.salary || "",
        bankAccount:       info.bankAccount || info.bank_account || "",
        department:        info.department || "",
        dob:               info.dob || "",
        doj:               info.doj || "",
        panNo:             info.panNo || info.pan_no || "",
        ifscCode:          info.ifscCode || info.ifsc_code || "",
        paidLeaves:        info.paidLeaves || "",
        password:          info.password || "",
        employment_status: info.employment_status || "active",
        status_remarks:    info.status_remarks || "",
        status_changed_at: info.status_changed_at || "",
      }));
      setUsers(formatted);

      // Fetch section access in parallel
      const accessResults = await Promise.all(
        formatted.map(async (u) => {
          try {
            const r = await axios.get(`${baseUrl}/chat/access/get/${encodeURIComponent(u.email)}`, { withCredentials: true });
            return { email: u.email, sections: r.data.sections || [] };
          } catch {
            return { email: u.email, sections: ["attendance", "leave", "salary", "chat"] };
          }
        })
      );
      const map = {};
      accessResults.forEach(({ email, sections }) => { map[email] = sections; });
      setSectionMap(map);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (visible) fetchUsers(); }, [visible, fetchUsers]);

  // Save single section toggle
  const toggleSection = async (email, sectionKey, newState) => {
    const key = `${email}_${sectionKey}`;
    setSavingSection(key);
    const prev = sectionMap[email] || [];
    const updated = newState ? [...new Set([...prev, sectionKey])] : prev.filter(s => s !== sectionKey);
    setSectionMap(m => ({ ...m, [email]: updated }));
    try {
      await axios.post(`${baseUrl}/chat/access/set`, { email, sections: updated }, { withCredentials: true });
    } catch {
      setSectionMap(m => ({ ...m, [email]: prev }));
    } finally {
      setSavingSection(null);
    }
  };

  // Bulk enable/disable
  const bulkAccess = async (email, enable) => {
    const sections = enable ? ALL_SECTIONS.map(s => s.key) : [];
    setSectionMap(m => ({ ...m, [email]: sections }));
    try {
      await axios.post(`${baseUrl}/chat/access/set`, { email, sections }, { withCredentials: true });
    } catch { fetchUsers(); }
  };

  // Edit save
  const handleSave = async () => {
    try {
      const payload = {
        name: editedUser.name, role: editedUser.role, location: editedUser.location,
        department: editedUser.department, employee_id: editedUser.employeeId,
        salary: editedUser.salary, bank_account: editedUser.bankAccount,
        pan_no: editedUser.panNo, ifsc_code: editedUser.ifscCode,
        dob: editedUser.dob, doj: editedUser.doj, paidLeaves: editedUser.paidLeaves,
      };
      if (newPassword.trim()) payload.password = newPassword.trim();
      await axios.put(`${baseUrl}/update-user/${encodeURIComponent(editingEmail)}`, payload, { withCredentials: true });
      setEditingEmail(null); setNewPassword(""); setShowOldPwd({});
      fetchUsers();
    } catch (err) {
      alert("❌ Update failed: " + (err.response?.data?.message || err.message));
    }
  };

  // Role assignment
  const saveAssignment = async () => {
    if (!assignRole) return alert("Select a role");
    try {
      await axios.put(`${baseUrl}/update-user/${encodeURIComponent(assigningEmail)}`,
        { role: assignRole, ...(assignRole === "manager" ? { location: assignLocation } : {}) },
        { withCredentials: true }
      );
      setAssigningEmail(null); fetchUsers();
    } catch { alert("❌ Failed to assign role."); }
  };

  const removeRole = async (email) => {
    if (!window.confirm("Remove this user's role?")) return;
    try {
      await axios.put(`${baseUrl}/update-user/${encodeURIComponent(email)}`, { role: "" }, { withCredentials: true });
      fetchUsers();
    } catch { alert("❌ Failed to remove role."); }
  };

  // Employment status
  const handleStatusAction = async (email, newStatus) => {
    const remarks = statusRemarks[email] || "";
    if (!remarks.trim() && newStatus !== "active") return alert("Please add a reason.");
    try {
      await axios.put(`${baseUrl}/update-employment-status/${encodeURIComponent(email)}`,
        { employment_status: newStatus, remarks }, { withCredentials: true }
      );
      setUsers(prev => prev.map(u => u.email === email
        ? { ...u, employment_status: newStatus, status_remarks: remarks, status_changed_at: new Date().toISOString() }
        : u
      ));
      setStatusAction(p => ({ ...p, [email]: null }));
      setStatusRemarks(p => ({ ...p, [email]: "" }));
      setActiveTab(newStatus === "active" ? "active" : newStatus);
    } catch (err) {
      alert("❌ Action failed: " + (err.response?.data?.message || err.message));
    }
  };

  // Add custom department
  const handleAddDept = async (name) => {
    if (!departments.includes(name)) {
      setDepartments(prev => [...prev, name]);
      try {
        await axios.post(`${baseUrl}/departments`, { name }, { withCredentials: true });
      } catch { /* non-fatal */ }
    }
  };

  // Filtered lists
  const getVisible = (list) => {
    if (!currentUser) return list;
    const r = currentUser.role?.toLowerCase();
    if (r === "chairman") return list;
    if (r === "manager") return list.filter(u => u.location === currentUser.location);
    return [];
  };

  const tabUsers = getVisible(users).filter(u => (u.employment_status || "active") === activeTab);
  const filtered = tabUsers.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.department || "").toLowerCase().includes(search.toLowerCase())
  );

  const tabCount = (status) => getVisible(users).filter(u => (u.employment_status || "active") === status).length;

  const TABS = [
    { id: "active",     label: "Active",     icon: "✓", activeColor: "#16a34a", activeBg: "#dcfce7", borderColor: "#86efac" },
    { id: "terminated", label: "Terminated", icon: "✕", activeColor: "#dc2626", activeBg: "#fee2e2", borderColor: "#fca5a5" },
    { id: "resigned",   label: "Resigned",   icon: "→", activeColor: "#ea580c", activeBg: "#ffedd5", borderColor: "#fdba74" },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .su-card { animation: fadeUp .2s ease; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── TOGGLE BUTTON ── */}
        <button
          onClick={() => setVisible(v => !v)}
          style={{
            background: "linear-gradient(135deg,#1a237e,#4f6ef7)", color: "#fff",
            border: "none", borderRadius: 10, padding: "11px 22px",
            fontWeight: 700, fontSize: 14, cursor: "pointer",
            fontFamily: "inherit", marginBottom: 20,
            boxShadow: "0 4px 14px rgba(79,110,247,0.3)",
          }}
        >{visible ? "👁 Hide Employees" : "👥 Show All Employees"}</button>

        {visible && (
          <>
            {/* ── HEADER ── */}
            <div style={{
              background: "linear-gradient(118deg,#1a237e 0%,#4f6ef7 65%,#6d28d9 100%)",
              borderRadius: 18, padding: "22px 28px", marginBottom: 22,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -50, right: -30, width: 200, height: 200,
                borderRadius: "50%", background: "radial-gradient(circle,rgba(255,255,255,0.07),transparent 70%)",
                pointerEvents: "none",
              }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>People Management</div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>
                    👥 All Employees
                    {isManager && currentUser?.location && (
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginLeft: 10, fontWeight: 500 }}>· {currentUser.location}</span>
                    )}
                  </h2>
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  {TABS.map(t => (
                    <div key={t.id} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{tabCount(t.id)}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600, textTransform: "uppercase" }}>{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SEARCH ── */}
            <div style={{ position: "relative", marginBottom: 16, maxWidth: 420 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 15 }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email or department…"
                style={{
                  width: "100%", padding: "10px 14px 10px 38px", borderRadius: 10,
                  border: "1.5px solid #e5e7eb", fontSize: 13, outline: "none",
                  background: "#fff", color: "#111827", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>

            {/* ── STATUS TABS ── */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f3f4f6", borderRadius: 11, padding: 4, width: "fit-content" }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                  background: activeTab === tab.id ? tab.activeBg : "transparent",
                  color: activeTab === tab.id ? tab.activeColor : "#6b7280",
                  transition: "all .15s",
                }}>
                  {tab.icon} {tab.label}
                  <span style={{
                    marginLeft: 7, fontSize: 11, fontWeight: 800,
                    background: activeTab === tab.id ? tab.activeColor + "22" : "#e5e7eb",
                    color: activeTab === tab.id ? tab.activeColor : "#9ca3af",
                    borderRadius: 99, padding: "1px 7px",
                  }}>{tabCount(tab.id)}</span>
                </button>
              ))}
            </div>

            {/* ── INACTIVE BANNER ── */}
            {activeTab !== "active" && filtered.length > 0 && (
              <div style={{
                marginBottom: 16, padding: "12px 16px", borderRadius: 10,
                background: activeTab === "terminated" ? "#fee2e2" : "#ffedd5",
                border: `1px solid ${activeTab === "terminated" ? "#fca5a5" : "#fdba74"}`,
                fontSize: 13, color: activeTab === "terminated" ? "#b91c1c" : "#c2410c", fontWeight: 500,
              }}>
                {activeTab === "terminated" ? "🚫" : "📤"} {filtered.length} employee{filtered.length > 1 ? "s" : ""} {activeTab}.
                {isChairman && " Data preserved — use Rejoin to restore."}
              </div>
            )}

            {/* ── LOADING ── */}
            {loading && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: "3px solid #4f6ef7", borderRadius: "50%", margin: "0 auto 12px", animation: "spin .8s linear infinite" }} />
                <div>Loading employees…</div>
              </div>
            )}

            {/* ── EMPTY ── */}
            {!loading && filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", background: "#fff", borderRadius: 14, border: "1.5px solid #e5e7eb" }}>
                No {activeTab} employees{search ? ` matching "${search}"` : ""}.
              </div>
            )}

            {/* ── EMPLOYEE CARDS GRID ── */}
            {!loading && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(370px, 1fr))", gap: 16 }}>
                {filtered.map(user => {
                  const isEditing    = editingEmail === user.email;
                  const isAssigning  = assigningEmail === user.email;
                  const empStatus    = user.employment_status || "active";
                  const isActive     = empStatus === "active";
                  const curStatusAct = statusAction[user.email];
                  const sections     = sectionMap[user.email] || [];
                  const isAccessOpen = accessOpen[user.email];

                  const statusColor = empStatus === "terminated" ? "#ef4444" : empStatus === "resigned" ? "#f97316" : "#22c55e";
                  const roleBg    = user.role === "manager" ? "#dbeafe" : user.role === "mis-execuitve" ? "#fef9c3" : "#f3f4f6";
                  const roleColor = user.role === "manager" ? "#1d4ed8" : user.role === "mis-execuitve" ? "#92400e" : "#4b5563";

                  return (
                    <div key={user.email} className="su-card" style={{
                      background: "#fff", border: "1.5px solid #e5e7eb",
                      borderTop: `3px solid ${statusColor}`,
                      borderRadius: 14, overflow: "hidden",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    }}>

                      {/* ── Card header ── */}
                      <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid #f3f4f6" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                            background: "linear-gradient(135deg,#1a237e,#4f6ef7)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontWeight: 800, fontSize: 17,
                          }}>{(user.name || "?")[0].toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {user.name || "No Name"}
                            </div>
                            <div style={{ fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {user.email}
                            </div>
                            {user.department && (
                              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                🏷 {user.department}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                            {user.role && (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: roleBg, color: roleColor }}>
                                {user.role}
                              </span>
                            )}
                            {!isActive && (
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
                                background: empStatus === "terminated" ? "#fee2e2" : "#ffedd5",
                                color: statusColor,
                              }}>{empStatus === "terminated" ? "✕ Terminated" : "→ Resigned"}</span>
                            )}
                          </div>
                        </div>

                        {/* Status info for inactive */}
                        {!isActive && (
                          <div style={{
                            marginTop: 10, padding: "9px 12px", borderRadius: 8,
                            background: empStatus === "terminated" ? "#fee2e2" : "#ffedd5",
                            border: `1px solid ${empStatus === "terminated" ? "#fca5a5" : "#fdba74"}`,
                            fontSize: 12,
                          }}>
                            {user.status_changed_at && (
                              <span style={{ color: "#6b7280" }}>
                                {new Date(user.status_changed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            )}
                            {user.status_remarks && (
                              <div style={{ marginTop: 3, color: "#374151" }}>
                                <strong>Reason:</strong> {user.status_remarks}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Details (view / edit) ── */}
                      <div style={{ padding: "14px 18px" }}>
                        {isEditing ? (
                          <>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                              <EditInput label="Name"        value={editedUser.name}        onChange={e => setEditedUser({ ...editedUser, name: e.target.value })} />
                              <EditInput label="Role"        value={editedUser.role}        onChange={e => setEditedUser({ ...editedUser, role: e.target.value })} as="select" options={["employee","manager","mis-execuitve"]} />
                              <EditInput label="Location"    value={editedUser.location}    onChange={e => setEditedUser({ ...editedUser, location: e.target.value })} as="select" options={LOCATIONS} />
                              {/* Department searchable */}
                              <DeptSelect
                                value={editedUser.department}
                                onChange={v => setEditedUser({ ...editedUser, department: v })}
                                departments={departments}
                                isChairman={isChairman}
                                onAddDept={handleAddDept}
                              />
                              <EditInput label="Employee ID" value={editedUser.employeeId}  onChange={e => setEditedUser({ ...editedUser, employeeId: e.target.value })} />
                              <EditInput label="Salary"      value={editedUser.salary}      onChange={e => setEditedUser({ ...editedUser, salary: e.target.value })}      type="number" />
                              <EditInput label="Bank Account" value={editedUser.bankAccount} onChange={e => setEditedUser({ ...editedUser, bankAccount: e.target.value })} />
                              <EditInput label="PAN No"      value={editedUser.panNo}       onChange={e => setEditedUser({ ...editedUser, panNo: e.target.value })} />
                              <EditInput label="IFSC Code"   value={editedUser.ifscCode}    onChange={e => setEditedUser({ ...editedUser, ifscCode: e.target.value })} />
                              <EditInput label="Date of Birth"    value={editedUser.dob} onChange={e => setEditedUser({ ...editedUser, dob: e.target.value })}    type="date" />
                              <EditInput label="Date of Joining"  value={editedUser.doj} onChange={e => setEditedUser({ ...editedUser, doj: e.target.value })}    type="date" />
                              <EditInput label="Paid Leaves" value={editedUser.paidLeaves}  onChange={e => setEditedUser({ ...editedUser, paidLeaves: e.target.value })} type="number" />
                            </div>

                            {/* Password section */}
                            <div style={{ background: "#f9fafb", borderRadius: 9, padding: "12px 14px", marginBottom: 12, border: "1px solid #e5e7eb" }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>🔐 Password</div>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Current</div>
                                  <div style={{ padding: "8px 10px", background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#4b5563", display: "flex", alignItems: "center" }}>
                                    <span style={{ flex: 1 }}>{showOldPwd[user.email] ? (editedUser.password || "—") : "••••••••"}</span>
                                    <button onClick={() => setShowOldPwd(p => ({ ...p, [user.email]: !p[user.email] }))}
                                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 0 }}>
                                      {showOldPwd[user.email] ? "🙈" : "👁️"}
                                    </button>
                                  </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>New (leave blank to keep)</div>
                                  <input
                                    type="text" value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13, border: "1.5px solid #e5e7eb", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={handleSave} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                                💾 Save Changes
                              </button>
                              <button onClick={() => { setEditingEmail(null); setNewPassword(""); setShowOldPwd({}); }}
                                style={{ padding: "9px 16px", borderRadius: 9, border: "1.5px solid #e5e7eb", background: "#fff", color: "#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ marginBottom: 12 }}>
                              <InfoRow label="Department"  value={user.department} />
                              <InfoRow label="Location"    value={user.location} />
                              <InfoRow label="Employee ID" value={user.employeeId} />
                              <InfoRow label="Salary"      value={user.salary ? `₹${Number(user.salary).toLocaleString("en-IN")}` : ""} />
                              <InfoRow label="Bank A/c"    value={user.bankAccount} />
                              <InfoRow label="PAN"         value={user.panNo} />
                              <InfoRow label="IFSC"        value={user.ifscCode} />
                              <InfoRow label="DOB"         value={user.dob} />
                              <InfoRow label="DOJ"         value={user.doj} />
                              <InfoRow label="Paid Leaves" value={user.paidLeaves} />
                              <div style={{ display: "flex", gap: 8, padding: "5px 0", alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, minWidth: 110 }}>Password</span>
                                <span style={{ fontSize: 12, color: "#374151", fontFamily: "'DM Mono', monospace" }}>
                                  {showPwd[user.email] ? (user.password || "—") : "••••••••"}
                                </span>
                                <button onClick={() => setShowPwd(p => ({ ...p, [user.email]: !p[user.email] }))}
                                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 0 }}>
                                  {showPwd[user.email] ? "🙈" : "👁️"}
                                </button>
                              </div>
                            </div>
                            {isActive && (
                              <button onClick={() => { setEditingEmail(user.email); setEditedUser({ ...user }); setNewPassword(""); }}
                                style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#eef0fe", color: "#4f46e5", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                ✏️ Edit Details
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* ── Access Panel (chairman only) ── */}
                      {isChairman && (
                        <div style={{ borderTop: "1px solid #f3f4f6" }}>
                          <button
                            onClick={() => setAccessOpen(p => ({ ...p, [user.email]: !p[user.email] }))}
                            style={{
                              width: "100%", padding: "11px 18px",
                              background: isAccessOpen ? "#eef0fe" : "#f9fafb",
                              border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                              color: isAccessOpen ? "#4f46e5" : "#6b7280",
                              textAlign: "left", fontFamily: "inherit",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                            }}
                          >
                            <span>🔐 Dashboard Access ({sections.length}/{ALL_SECTIONS.length} sections)</span>
                            <span style={{ fontSize: 14 }}>{isAccessOpen ? "▲" : "▼"}</span>
                          </button>

                          {isAccessOpen && (
                            <div style={{ padding: "12px 18px", borderTop: "1px solid #f3f4f6", background: "#fafbfc" }}>
                              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                                <button onClick={() => bulkAccess(user.email, true)} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7, border: "1.5px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", cursor: "pointer", fontFamily: "inherit" }}>✅ All</button>
                                <button onClick={() => bulkAccess(user.email, false)} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>🔒 None</button>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 7 }}>
                                {ALL_SECTIONS.map(sec => (
                                  <AccessChip
                                    key={sec.key}
                                    section={sec}
                                    enabled={sections.includes(sec.key)}
                                    saving={savingSection === `${user.email}_${sec.key}`}
                                    onClick={() => toggleSection(user.email, sec.key, !sections.includes(sec.key))}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Role Assignment (chairman + active) ── */}
                      {isChairman && isActive && (
                        <div style={{ borderTop: "1px solid #f3f4f6", padding: "12px 18px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                            👔 Role Assignment
                          </div>
                          {isAssigning ? (
                            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                              <select
                                value={assignRole}
                                onChange={e => { setAssignRole(e.target.value); if (e.target.value !== "manager") setAssignLocation(""); }}
                                style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 12, fontFamily: "inherit", outline: "none" }}
                              >
                                <option value="">Select Role</option>
                                <option value="manager">Manager</option>
                                <option value="mis-execuitve">MIS Executive</option>
                              </select>
                              {assignRole === "manager" && (
                                <select
                                  value={assignLocation}
                                  onChange={e => setAssignLocation(e.target.value)}
                                  style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 12, fontFamily: "inherit", outline: "none" }}
                                >
                                  <option value="">Select Location</option>
                                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              )}
                              <button onClick={saveAssignment} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                              <button onClick={() => setAssigningEmail(null)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                            </div>
                          ) : user.role && !["employee"].includes(user.role) ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 12, color: "#4b5563" }}>
                                <strong>{user.role}</strong>{user.role === "manager" && user.location ? ` (${user.location})` : ""}
                              </span>
                              <button onClick={() => removeRole(user.email)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fee2e2", color: "#dc2626", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAssigningEmail(user.email); setAssignRole(""); setAssignLocation(""); }}
                              style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                            >+ Assign Role</button>
                          )}
                        </div>
                      )}

                      {/* ── Employment Status (chairman only) ── */}
                      {isChairman && (
                        <div style={{ borderTop: "1px solid #f3f4f6", padding: "12px 18px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                            📋 Employment Status
                          </div>

                          {isActive && !curStatusAct && (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => setStatusAction(p => ({ ...p, [user.email]: "terminated" }))}
                                style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fee2e2", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                🚫 Terminate
                              </button>
                              <button onClick={() => setStatusAction(p => ({ ...p, [user.email]: "resigned" }))}
                                style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #fdba74", background: "#ffedd5", color: "#ea580c", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                📤 Resigned
                              </button>
                            </div>
                          )}

                          {isActive && curStatusAct && (
                            <div style={{
                              padding: "12px", borderRadius: 10,
                              background: curStatusAct === "terminated" ? "#fee2e2" : "#ffedd5",
                              border: `1px solid ${curStatusAct === "terminated" ? "#fca5a5" : "#fdba74"}`,
                            }}>
                              <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 12, color: curStatusAct === "terminated" ? "#dc2626" : "#ea580c" }}>
                                {curStatusAct === "terminated" ? "🚫 Confirm Termination" : "📤 Confirm Resignation"}
                              </p>
                              <textarea
                                rows={2}
                                placeholder={curStatusAct === "terminated" ? "Reason for termination…" : "Resignation reason…"}
                                value={statusRemarks[user.email] || ""}
                                onChange={e => setStatusRemarks(p => ({ ...p, [user.email]: e.target.value }))}
                                style={{ width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 12, border: `1px solid ${curStatusAct === "terminated" ? "#fca5a5" : "#fdba74"}`, marginBottom: 8, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                              />
                              <div style={{ display: "flex", gap: 7 }}>
                                <button onClick={() => handleStatusAction(user.email, curStatusAct)}
                                  style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: curStatusAct === "terminated" ? "#dc2626" : "#ea580c", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                  Confirm
                                </button>
                                <button onClick={() => { setStatusAction(p => ({ ...p, [user.email]: null })); setStatusRemarks(p => ({ ...p, [user.email]: "" })); }}
                                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {!isActive && (
                            <button onClick={() => handleStatusAction(user.email, "active")}
                              style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #86efac", background: "#dcfce7", color: "#16a34a", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                              🔄 Rejoin Employee
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}