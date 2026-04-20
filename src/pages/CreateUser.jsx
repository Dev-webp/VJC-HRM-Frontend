/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

// ── Location config ───────────────────────────────────────────────────────────
const LOCATION_PREFIX_MAP = {
  Bangalore: "VJC-BNG",
  Hyderabad: "VJC-HYD",
  Chennai:   "VJC-CHN",
  Mumbai:    "VJC-MUM",
  Delhi:     "VJC-DEL",
};
const LOCATIONS = Object.keys(LOCATION_PREFIX_MAP);

// ── Default departments with location hints ───────────────────────────────────
const DEFAULT_DEPARTMENTS = [
  // Leadership
  { name: "CEO",            locations: [] },
  { name: "Director",       locations: [] },
  { name: "Branch Manager", locations: ["Hyderabad", "Bangalore"] },

  // Team Managers — Sales
  { name: "Team Manager Sales-Immigration", locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },
  { name: "Team Manager Sales-Study",       locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },
  { name: "Team Manager Sales-Visit",       locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },

  // Team Managers — Process
  { name: "Team Manager Process-Immigration", locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },
  { name: "Team Manager Process-Study",       locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },
  { name: "Team Manager Process-Visit",       locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },

  // Sales Executives
  { name: "Sales-Immigration", locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },
  { name: "Sales-Study",       locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },
  { name: "Sales-Visit",       locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },

  // Process Executives
  { name: "Process-Immigration", locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },
  { name: "Process-Study",       locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },
  { name: "Process-Visit/RMS",   locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi"] },

  // Support
  { name: "Digital Marketing",   locations: ["Hyderabad", "Bangalore"] },
  { name: "MIS",                 locations: ["Hyderabad", "Bangalore"] },
  { name: "Developers-IT",       locations: ["Hyderabad", "Bangalore"] },
  { name: "Reception-Hyd/Bgl",   locations: ["Hyderabad", "Bangalore"] },
];

// ── Section definitions ───────────────────────────────────────────────────────
const ALL_SECTIONS = [
  { key: "attendance", label: "Attendance",      emoji: "🕒", color: "#3b82f6", desc: "Daily punch-in/out" },
  { key: "leave",      label: "Leave",           emoji: "📅", color: "#f59e0b", desc: "Apply & track leave" },
  { key: "salary",     label: "Salary & Payroll",emoji: "💰", color: "#10b981", desc: "Slips & payroll docs" },
  { key: "chat",       label: "Team Chat",       emoji: "💬", color: "#6366f1", desc: "Internal messaging" },
  { key: "leads",      label: "My Leads",        emoji: "🎯", color: "#ec4899", desc: "Lead assignments" },
  { key: "sales",      label: "Sales Stats",     emoji: "📈", color: "#f97316", desc: "Targets & performance" },
  { key: "chatlogs",   label: "Chat Logs",       emoji: "📋", color: "#8b5cf6", desc: "MIS: chat log viewer" },
  { key: "fulldata",   label: "Full Data",       emoji: "📊", color: "#0ea5e9", desc: "MIS: employee table" },
  { key: "resume", label: "Resume Marketing", emoji: "📄", color: "#7c3aed", desc: "CV builder & JD matcher" },
];

const DEFAULT_SECTIONS_BY_ROLE = {
  employee:        ["attendance", "leave", "salary", "chat"],
  manager:         ["attendance", "leave", "salary", "chat", "leads"],
  "mis-execuitve": ["attendance", "leave", "salary", "chat", "chatlogs", "fulldata"],
  default:         ["attendance", "leave", "salary", "chat"],
};

const EMPTY_USER = {
  name: "", email: "", password: "", role: "employee",
  location: "", employeeId: "", salary: "", bankAccount: "",
  dob: "", doj: "", panNo: "", ifscCode: "", department: "", paidLeaves: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable UI primitives
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, required, hint, children, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 200px", ...style }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: "#9ca3af" }}>{hint}</span>}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder, disabled, style = {}, autoComplete }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete={autoComplete}
      style={{
        padding: "10px 13px", borderRadius: 9, fontSize: 13,
        border: `1.5px solid ${focused ? "#4f6ef7" : "#e5e7eb"}`,
        boxShadow: focused ? "0 0 0 3px rgba(79,110,247,0.1)" : "none",
        outline: "none", background: disabled ? "#f9fafb" : "#fff",
        color: "#111827", fontFamily: "inherit", width: "100%",
        boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s",
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function Select({ value, onChange, children, style = {} }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        padding: "10px 13px", borderRadius: 9, fontSize: 13,
        border: `1.5px solid ${focused ? "#4f6ef7" : "#e5e7eb"}`,
        boxShadow: focused ? "0 0 0 3px rgba(79,110,247,0.1)" : "none",
        outline: "none", background: "#fff", color: "#111827",
        fontFamily: "inherit", cursor: "pointer",
        width: "100%", boxSizing: "border-box", transition: "border-color .15s",
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}

// ── Card & Row — defined OUTSIDE main component so React doesn't remount on every render ──
function Card({ title, subtitle, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1.5px solid #e5e7eb",
      padding: "24px 26px", marginBottom: 18,
      boxShadow: "0 2px 16px rgba(79,110,247,0.07)",
    }}>
      {title && (
        <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Row({ children }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
      {children}
    </div>
  );
}

// ── Department searchable dropdown ────────────────────────────────────────────
function DeptDropdown({ value, onChange, departments, isChairman, onAddDept }) {
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState("");
  const [addMode, setAddMode]     = useState(false);
  const [newDept, setNewDept]     = useState("");
  const ref                       = useRef(null);
  const searchRef                 = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false); setAddMode(false); setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 60);
  }, [open]);

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  function pick(dept) {
    onChange(dept);
    setOpen(false); setSearch(""); setAddMode(false);
  }

  function addNew() {
    const trimmed = newDept.trim();
    if (!trimmed) return;
    onAddDept(trimmed);
    pick({ name: trimmed, locations: [], isCustom: true });
    setNewDept("");
    setAddMode(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <div
        onClick={() => { setOpen(o => !o); setSearch(""); setAddMode(false); }}
        style={{
          padding: "10px 13px", borderRadius: 9, fontSize: 13,
          border: `1.5px solid ${open ? "#4f6ef7" : "#e5e7eb"}`,
          boxShadow: open ? "0 0 0 3px rgba(79,110,247,0.1)" : "none",
          background: "#fff", cursor: "pointer", userSelect: "none",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          color: value ? "#111827" : "#9ca3af", transition: "border-color .15s",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {value || "Select department"}
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 9999,
          background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,0.13)", maxHeight: 300, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* Search */}
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search departments…"
            style={{
              padding: "10px 14px", border: "none", borderBottom: "1px solid #f3f4f6",
              outline: "none", fontSize: 13, fontFamily: "inherit", flexShrink: 0,
            }}
          />

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: "16px 14px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                No departments found
              </div>
            )}
            {filtered.map(dept => {
              const sel = value === dept.name;
              return (
                <div
                  key={dept.name}
                  onClick={() => pick(dept)}
                  style={{
                    padding: "10px 14px", fontSize: 13, cursor: "pointer",
                    background: sel ? "#eef0fe" : "transparent",
                    color: sel ? "#4f46e5" : "#111827",
                    fontWeight: sel ? 700 : 400,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 8, transition: "background .1s",
                  }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#f9fafb"; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {dept.isCustom && <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 99, marginRight: 6, fontWeight: 700 }}>CUSTOM</span>}
                    {dept.name}
                  </span>
                  {dept.locations && dept.locations.length > 0 && (
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 99,
                      background: "#f3f4f6", color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
                    }}>
                      {dept.locations.length === 1 ? dept.locations[0] : `${dept.locations.length} cities`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add new — chairman only */}
          {isChairman && (
            <div style={{ borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
              {addMode ? (
                <div style={{ padding: "10px 12px", display: "flex", gap: 8 }}>
                  <input
                    autoFocus
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addNew(); if (e.key === "Escape") setAddMode(false); }}
                    placeholder="New department name…"
                    style={{
                      flex: 1, padding: "7px 10px", borderRadius: 8,
                      border: "1.5px solid #e5e7eb", fontSize: 12,
                      fontFamily: "inherit", outline: "none",
                    }}
                  />
                  <button onClick={addNew} style={{
                    padding: "7px 14px", borderRadius: 8, border: "none",
                    background: "#4f6ef7", color: "#fff", fontWeight: 700,
                    fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  }}>Add</button>
                  <button onClick={() => { setAddMode(false); setNewDept(""); }} style={{
                    padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb",
                    background: "#fff", color: "#6b7280", fontWeight: 700,
                    fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  }}>✕</button>
                </div>
              ) : (
                <div
                  onClick={() => setAddMode(true)}
                  style={{
                    padding: "10px 14px", fontSize: 12, color: "#4f6ef7",
                    fontWeight: 700, cursor: "pointer", display: "flex",
                    alignItems: "center", gap: 8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#eef0fe"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
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

// ── Section chip ──────────────────────────────────────────────────────────────
function SectionChip({ section, enabled, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "9px 13px", borderRadius: 10, cursor: "pointer",
        border: `1.5px solid ${enabled ? section.color + "55" : "#e5e7eb"}`,
        background: enabled ? section.color + "0d" : "#f9fafb",
        transition: "all .15s", userSelect: "none",
      }}
    >
      <span style={{ fontSize: 16 }}>{section.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: enabled ? "#111827" : "#9ca3af" }}>
          {section.label}
        </div>
        <div style={{ fontSize: 11, color: "#d1d5db" }}>{section.desc}</div>
      </div>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
        background: enabled ? section.color : "#e5e7eb",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, color: "#fff", fontWeight: 800, transition: "background .15s",
      }}>
        {enabled ? "✓" : ""}
      </div>
    </div>
  );
}

// ── Step bar ──────────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ["Basic Info", "Role & Location", "Financial", "Permissions"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
      {steps.map((s, i) => {
        const num = i + 1;
        const done = step > num, active = step === num;
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 13, transition: "all .25s",
                background: done ? "#22c55e" : active ? "#4f6ef7" : "#e5e7eb",
                color: (done || active) ? "#fff" : "#9ca3af",
                boxShadow: active ? "0 0 0 4px rgba(79,110,247,0.18)" : "none",
              }}>
                {done ? "✓" : num}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                color: done ? "#22c55e" : active ? "#4f6ef7" : "#9ca3af",
              }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: "0 6px", marginBottom: 22,
                background: done ? "#22c55e" : "#e5e7eb", transition: "background .3s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function CreateUser() {
  const currentYear = new Date().getFullYear();

  const [step, setStep]                   = useState(1);
  const [user, setUser]                   = useState(EMPTY_USER);
  const [loadingId, setLoadingId]         = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [msg, setMsg]                     = useState(null);
  const [selectedSections, setSelectedSections] = useState([...DEFAULT_SECTIONS_BY_ROLE.employee]);
  const [showPassword, setShowPassword]   = useState(false);
  const [departments, setDepartments]     = useState(DEFAULT_DEPARTMENTS);
  const [isChairman, setIsChairman]       = useState(false);

  // Fetch current user role + custom departments on mount
  useEffect(() => {
    axios.get(`${baseUrl}/me`, { withCredentials: true })
      .then(r => setIsChairman(r.data.role === "chairman"))
      .catch(() => {});

    axios.get(`${baseUrl}/departments`, { withCredentials: true })
      .then(r => {
        const custom = (r.data || []).map(d => ({
          name: d.name,
          locations: d.locations || [],
          isCustom: true,
        }));
        setDepartments([...DEFAULT_DEPARTMENTS, ...custom]);
      })
      .catch(() => {});
  }, []);

  // Auto-generate employee ID
  useEffect(() => {
    if (!user.location) { setUser(u => ({ ...u, employeeId: "" })); return; }
    const prefix = LOCATION_PREFIX_MAP[user.location];
    if (!prefix) return;
    setLoadingId(true);
    axios.get(`${baseUrl}/all-attendance`, { withCredentials: true })
      .then(res => {
        const pattern = `${prefix}-${currentYear}-`;
        let maxSeq = 0;
        Object.values(res.data).forEach(u => {
          const id = u.employeeId || "";
          if (id.startsWith(pattern)) {
            const seq = parseInt(id.replace(pattern, ""), 10);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
          }
        });
        setUser(u => ({ ...u, employeeId: `${pattern}${String(maxSeq + 1).padStart(3, "0")}` }));
      })
      .catch(() => setUser(u => ({ ...u, employeeId: `${prefix}-${currentYear}-001` })))
      .finally(() => setLoadingId(false));
  }, [user.location, currentYear]);

  // Default sections when role changes
  useEffect(() => {
    setSelectedSections([...(DEFAULT_SECTIONS_BY_ROLE[user.role] || DEFAULT_SECTIONS_BY_ROLE.default)]);
  }, [user.role]);

  const set = (key) => (e) => setUser(u => ({ ...u, [key]: e.target.value }));

  // Handle department pick — also auto-fill location if only 1 option
  function handleDeptChange(dept) {
    setUser(u => {
      const next = { ...u, department: dept.name };
      if (dept.locations && dept.locations.length === 1 && !u.location) {
        next.location = dept.locations[0];
      }
      return next;
    });
  }

  // Add custom department (save to backend)
  async function handleAddDept(name) {
    const newD = { name, locations: [], isCustom: true };
    setDepartments(prev => [...prev, newD]);
    try {
      await axios.post(`${baseUrl}/departments`, { name }, { withCredentials: true });
    } catch { /* non-fatal */ }
  }

  const toggleSection = (key) => {
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const canGoNext = () => {
    if (step === 1) return user.name.trim() && user.email.trim() && user.password.trim();
    if (step === 2) return user.role && user.location && user.employeeId && !loadingId;
    if (step === 3) return !!user.salary;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true); setMsg(null);
    try {
      await axios.post(`${baseUrl}/create-user`, {
        name: user.name, email: user.email, password: user.password,
        role: user.role, location: user.location, employee_id: user.employeeId,
        salary: user.salary, bank_account: user.bankAccount, dob: user.dob,
        doj: user.doj, pan_no: user.panNo, ifsc_code: user.ifscCode,
        department: user.department, paidLeaves: user.paidLeaves,
      }, { withCredentials: true });

      await axios.post(`${baseUrl}/chat/access/set`, {
        email: user.email, sections: selectedSections,
      }, { withCredentials: true });

      setMsg({ text: "✅ Employee created successfully with permissions!", type: "success" });
      setUser(EMPTY_USER);
      setSelectedSections([...DEFAULT_SECTIONS_BY_ROLE.employee]);
      setStep(1);
    } catch (err) {
      setMsg({ text: "❌ " + (err.response?.data?.message || err.message), type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Location hint banner ──────────────────────────────────────────────────
  const deptObj = departments.find(d => d.name === user.department);
  const locHint = deptObj?.locations || [];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .cu-anim { animation: fadeUp .25s ease; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 860, margin: "0 auto", padding: "0 4px" }}>

        {/* ── HEADER ── */}
        <div style={{
          background: "linear-gradient(118deg,#1a237e 0%,#4f6ef7 65%,#6d28d9 100%)",
          borderRadius: 20, padding: "28px 32px", marginBottom: 28,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -70, right: -50, width: 260, height: 260,
            borderRadius: "50%", background: "radial-gradient(circle,rgba(255,255,255,0.08),transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
            <div style={{
              width: 54, height: 54, borderRadius: 15, flexShrink: 0,
              background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>👤</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
                Employee Management
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, color: "#fff" }}>Add New Employee</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
                Fill details across 4 steps — permissions configured in the last step.
              </div>
            </div>
          </div>
        </div>

        {/* ── STEP BAR ── */}
        <StepBar step={step} />

        {/* ══════════════ STEP 1 ══════════════ */}
        {step === 1 && (
          <div className="cu-anim">
            <Card title="👤 Basic Information" subtitle="Name, login credentials and department">
              <Row>
                <Field label="Full Name" required>
                  <Input value={user.name} onChange={set("name")} placeholder="e.g. Rahul Sharma" autoComplete="off" />
                </Field>
                <Field label="Email Address" required>
                  <Input type="email" value={user.email} onChange={set("email")} placeholder="rahul@vjcoverseas.com" autoComplete="off" />
                </Field>
              </Row>
              <Row>
                <Field label="Password" required>
                  <div style={{ position: "relative" }}>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={user.password} onChange={set("password")}
                      placeholder="Set a strong password"
                      style={{ paddingRight: 42 }}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 0,
                      }}
                    >{showPassword ? "🙈" : "👁️"}</button>
                  </div>
                </Field>
                <Field label="Department" hint="Select from list — Chairman can add new">
                  <DeptDropdown
                    value={user.department}
                    onChange={handleDeptChange}
                    departments={departments}
                    isChairman={isChairman}
                    onAddDept={handleAddDept}
                  />
                </Field>
              </Row>
            </Card>
          </div>
        )}

        {/* ══════════════ STEP 2 ══════════════ */}
        {step === 2 && (
          <div className="cu-anim">
            <Card title="🏢 Role & Location" subtitle="Determines permission defaults and employee ID format">
              <Row>
                <Field label="Role" required>
                  <Select value={user.role} onChange={set("role")}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="mis-execuitve">MIS Executive</option>
                  </Select>
                </Field>
                <Field label="Location" required>
                  <Select value={user.location} onChange={e => setUser(u => ({ ...u, location: e.target.value, employeeId: "" }))}>
                    <option value="">Select Location</option>
                    {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </Select>
                </Field>
              </Row>

              {/* Location hint from department */}
              {user.department && locHint.length > 0 && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                  background: "#eff6ff", border: "1px solid #bfdbfe",
                  fontSize: 12, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <span>
                    Department <strong>"{user.department}"</strong> works in:{" "}
                    {locHint.map((loc, i) => (
                      <React.Fragment key={loc}>
                        <span
                          onClick={() => setUser(u => ({ ...u, location: loc, employeeId: "" }))}
                          style={{
                            fontWeight: 700, textDecoration: "underline", cursor: "pointer",
                            color: user.location === loc ? "#16a34a" : "#1d4ed8",
                          }}
                        >{loc}{user.location === loc ? " ✓" : ""}</span>
                        {i < locHint.length - 1 ? ", " : ""}
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              )}

              {/* Employee ID */}
              <Row>
                <Field label="Employee ID" hint={user.location ? `Auto-generated for ${user.location}` : "Select a location first"}>
                  <div style={{
                    padding: "10px 13px", borderRadius: 9,
                    border: "1.5px solid #4f6ef7", background: "#eef2ff",
                    color: "#1e3a8a", fontWeight: 700, fontFamily: "'DM Mono', monospace",
                    display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.5px", fontSize: 13,
                  }}>
                    {loadingId ? (
                      <span style={{ color: "#9ca3af", fontWeight: 400, fontFamily: "inherit" }}>⏳ Generating…</span>
                    ) : user.employeeId ? (
                      <>
                        {user.employeeId}
                        <span style={{
                          fontSize: 10, background: "#4f6ef7", color: "#fff",
                          padding: "2px 8px", borderRadius: 99, fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 700, letterSpacing: 1,
                        }}>AUTO</span>
                      </>
                    ) : (
                      <span style={{ color: "#9ca3af", fontWeight: 400, fontFamily: "inherit" }}>Select location to generate</span>
                    )}
                  </div>
                </Field>
              </Row>

              {/* Role info banner */}
              {user.role && (() => {
                const cfg = {
                  manager:        { bg: "#eff6ff", border: "#bfdbfe", icon: "👔", text: "Will have access to their location's employee data and lead management." },
                  "mis-execuitve":{ bg: "#f5f3ff", border: "#ddd6fe", icon: "📊", text: "Will have access to full data table, chat logs, attendance & salary." },
                  employee:       { bg: "#f0fdf4", border: "#bbf7d0", icon: "👤", text: "Standard employee — will see only sections enabled in Step 4." },
                }[user.role] || {};
                return (
                  <div style={{
                    padding: "12px 16px", borderRadius: 10, marginTop: 4,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    fontSize: 13, color: "#374151",
                  }}>
                    <strong>{cfg.icon} {user.role === "manager" ? "Manager" : user.role === "mis-execuitve" ? "MIS Executive" : "Employee"}</strong>
                    <span style={{ color: "#6b7280", marginLeft: 8 }}>{cfg.text}</span>
                  </div>
                );
              })()}
            </Card>
          </div>
        )}

        {/* ══════════════ STEP 3 ══════════════ */}
        {step === 3 && (
          <div className="cu-anim">
            <Card title="💰 Financial Details" subtitle="Salary, bank account, and personal IDs">
              <Row>
                <Field label="Salary (₹/month)" required>
                  <Input type="number" value={user.salary} onChange={set("salary")} placeholder="e.g. 35000" />
                </Field>
                <Field label="Paid Leaves">
                  <Input type="number" value={user.paidLeaves} onChange={set("paidLeaves")} placeholder="e.g. 12" />
                </Field>
              </Row>
              <Row>
                <Field label="Bank Account No">
                  <Input value={user.bankAccount} onChange={set("bankAccount")} placeholder="Account number" />
                </Field>
                <Field label="IFSC Code">
                  <Input value={user.ifscCode} onChange={set("ifscCode")} placeholder="e.g. SBIN0001234" />
                </Field>
              </Row>
              <Row>
                <Field label="PAN Number">
                  <Input value={user.panNo} onChange={set("panNo")} placeholder="e.g. ABCDE1234F" />
                </Field>
              </Row>
              <Row>
                <Field label="Date of Birth">
                  <Input type="date" value={user.dob} onChange={set("dob")} />
                </Field>
                <Field label="Date of Joining">
                  <Input type="date" value={user.doj} onChange={set("doj")} />
                </Field>
              </Row>
            </Card>
          </div>
        )}

        {/* ══════════════ STEP 4 ══════════════ */}
        {step === 4 && (
          <div className="cu-anim">
            {/* Permissions */}
            <Card
              title="🔐 Dashboard Permissions"
              subtitle="Choose which sections this employee can see. You can change these later from the Access Panel."
            >
              {/* Role note + bulk buttons */}
              <div style={{
                padding: "11px 15px", borderRadius: 9, marginBottom: 18,
                background: "#f9fafb", border: "1px solid #e5e7eb",
                fontSize: 13, color: "#4b5563", display: "flex", alignItems: "center", gap: 10,
                flexWrap: "wrap",
              }}>
                <span style={{ fontSize: 18 }}>
                  {user.role === "manager" ? "👔" : user.role === "mis-execuitve" ? "📊" : "👤"}
                </span>
                <span style={{ flex: 1, minWidth: 160 }}>
                  <strong>{user.role === "manager" ? "Manager" : user.role === "mis-execuitve" ? "MIS Executive" : "Employee"}</strong>
                  {" "}— default sections pre-selected. Customise as needed.
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: "✅ All",   fn: () => setSelectedSections(ALL_SECTIONS.map(s => s.key)), bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a" },
                    { label: "🔒 None",  fn: () => setSelectedSections([]),                            bg: "#fef2f2", border: "#fecaca", color: "#dc2626" },
                    { label: "↺ Reset", fn: () => setSelectedSections([...(DEFAULT_SECTIONS_BY_ROLE[user.role] || DEFAULT_SECTIONS_BY_ROLE.default)]), bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb" },
                  ].map(b => (
                    <button key={b.label} onClick={b.fn} style={{
                      padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${b.border}`,
                      background: b.bg, color: b.color, fontWeight: 700, fontSize: 12,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>{b.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
                {ALL_SECTIONS.map(sec => (
                  <SectionChip
                    key={sec.key}
                    section={sec}
                    enabled={selectedSections.includes(sec.key)}
                    onClick={() => toggleSection(sec.key)}
                  />
                ))}
              </div>

              <div style={{
                marginTop: 16, padding: "10px 14px", borderRadius: 9,
                background: "#f9fafb", border: "1px solid #e5e7eb",
                fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>📌</span>
                <span><strong>{selectedSections.length}</strong> of {ALL_SECTIONS.length} sections enabled for this employee.</span>
              </div>
            </Card>

            {/* Summary */}
            <Card title="📋 Summary — Review Before Creating">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                {[
                  { label: "Name",        val: user.name },
                  { label: "Email",       val: user.email },
                  { label: "Role",        val: user.role },
                  { label: "Location",    val: user.location },
                  { label: "Employee ID", val: user.employeeId },
                  { label: "Department",  val: user.department || "—" },
                  { label: "Salary",      val: user.salary ? `₹${Number(user.salary).toLocaleString("en-IN")}` : "—" },
                  { label: "Date of Joining", val: user.doj || "—" },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: "#f9fafb", borderRadius: 9, padding: "10px 13px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", wordBreak: "break-word" }}>{val || "—"}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── NAV BUTTONS ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            style={{
              padding: "11px 24px", borderRadius: 10, border: "1.5px solid #e5e7eb",
              background: step === 1 ? "#f9fafb" : "#fff",
              color: step === 1 ? "#d1d5db" : "#4b5563",
              fontWeight: 700, fontSize: 13, cursor: step === 1 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >← Back</button>

          {step < 4 ? (
            <button
              onClick={() => canGoNext() && setStep(s => s + 1)}
              style={{
                padding: "11px 28px", borderRadius: 10, border: "none",
                background: canGoNext() ? "linear-gradient(135deg,#1a237e,#4f6ef7)" : "#e5e7eb",
                color: canGoNext() ? "#fff" : "#9ca3af",
                fontWeight: 700, fontSize: 13,
                cursor: canGoNext() ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                boxShadow: canGoNext() ? "0 4px 14px rgba(79,110,247,0.3)" : "none",
                transition: "all .15s",
              }}
            >Next →</button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "12px 32px", borderRadius: 10, border: "none",
                background: submitting ? "#e5e7eb" : "linear-gradient(135deg,#16a34a,#15803d)",
                color: submitting ? "#9ca3af" : "#fff",
                fontWeight: 800, fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                boxShadow: submitting ? "none" : "0 4px 14px rgba(22,163,74,0.35)",
              }}
            >{submitting ? "⏳ Creating…" : "✅ Create Employee"}</button>
          )}
        </div>

        {/* ── RESULT MESSAGE ── */}
        {msg && (
          <div style={{
            marginTop: 16, padding: "13px 18px", borderRadius: 10,
            background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            color: msg.type === "success" ? "#15803d" : "#dc2626",
            fontSize: 13, fontWeight: 600,
          }}>{msg.text}</div>
        )}
      </div>
    </>
  );
}