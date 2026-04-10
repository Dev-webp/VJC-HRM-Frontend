import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import SalaryUpload from "./SalarySlipUpload";
import CreateUser from "./CreateUser";
import ShowAllUsers from "./ShowAllUsers";
import Offerletter from "./Offerletter";
import Payroll from "./Payroll";
import AttendanceChatLogs from "./AttendanceChatLogs";
import Fulldata from "./Fulldata.jsx";
import LeaveRequestsSection from "./LeaveRequestsSection";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

// ── Inject styles ──────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: #f5f6fa; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-6px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideRight {
    from { opacity: 0; transform: translateX(18px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .sidebar-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 13px 16px;
    border: none;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13.5px;
    font-weight: 600;
    color: #64748b;
    text-align: left;
    transition: background 0.18s, color 0.18s, transform 0.15s;
    position: relative;
  }
  .sidebar-btn:hover {
    background: #f1f5ff;
    color: #3b6cf8;
    transform: translateX(3px);
  }
  .sidebar-btn.active {
    background: linear-gradient(135deg, #eef2ff 0%, #e0e9ff 100%);
    color: #3b6cf8;
    box-shadow: 0 2px 12px rgba(59,108,248,0.12);
  }
  .sidebar-btn.active::before {
    content: '';
    position: absolute;
    left: 0; top: 20%; bottom: 20%;
    width: 3.5px;
    border-radius: 0 4px 4px 0;
    background: #3b6cf8;
  }

  .content-panel {
    animation: slideRight 0.3s ease both;
  }

  .usermenu-dropdown-item:hover {
    background: #f1f5ff;
    color: #3b6cf8;
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #f5f6fa; }
  ::-webkit-scrollbar-thumb { background: #dde1ee; border-radius: 4px; }
`;

if (!document.getElementById("mgr-dash-css")) {
  const tag = document.createElement("style");
  tag.id = "mgr-dash-css";
  tag.innerHTML = css;
  document.head.appendChild(tag);
}

// ── Nav config ─────────────────────────────────────────────────────
const NAV = [
  { key: "ATTENDANCE",     icon: "💬", label: "Attendance Logs",    component: AttendanceChatLogs },
  { key: "CREATE_USER",    icon: "➕", label: "Create User",        component: CreateUser,   group: "User Management" },
  { key: "SHOW_USERS",     icon: "👥", label: "All Users",          component: ShowAllUsers, group: "User Management" },
  { key: "OFFER_LETTER",   icon: "📄", label: "Offer Letter",       component: Offerletter,  group: "User Management" },
  { key: "LEAVE_REQUESTS", icon: "📝", label: "Leave Requests",     component: LeaveRequestsSection },
  { key: "PAYROLL",        icon: "💰", label: "Payroll",            component: Payroll },
  { key: "SALARY_UPLOAD",  icon: "📤", label: "Salary Upload",      component: SalaryUpload },
  { key: "FULL_DATA",      icon: "📊", label: "Full Data",          component: Fulldata },
];

// ── UserMenu ───────────────────────────────────────────────────────
function UserMenu({ name = "User" }) {
  const [open, setOpen] = useState(false);

  const logout = async () => {
    try { await axios.get(`${baseUrl}/logout`, { withCredentials: true }); }
    catch (e) { /* ignore */ }
    window.location.href = "/";
  };

  useEffect(() => {
    const h = (e) => { if (!e.target.closest(".um-wrap")) setOpen(false); };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  return (
    <div className="um-wrap" style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        title={name}
        style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg, #3b6cf8 0%, #6e8efb 100%)",
          color: "#fff", fontWeight: 800,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 16, display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer",
          boxShadow: "0 4px 14px rgba(59,108,248,0.35)",
          border: "2.5px solid #fff",
          flexShrink: 0,
        }}
      >
        {name[0]?.toUpperCase() || "U"}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          background: "#fff", borderRadius: 14,
          boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
          border: "1px solid #eaecf5",
          overflow: "hidden", minWidth: 190, zIndex: 999,
          animation: "fadeIn 0.18s ease",
        }}>
          <div style={{
            padding: "10px 16px 8px",
            fontSize: 11, color: "#94a3b8", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            borderBottom: "1px solid #f1f5f9",
          }}>
            {name}
          </div>
          {[
            { icon: "🚪", label: "Logout",      action: logout },
            { icon: "🔄", label: "Switch User", action: () => (window.location.href = "/") },
          ].map(({ icon, label, action }) => (
            <div
              key={label}
              className="usermenu-dropdown-item"
              onClick={action}
              style={{
                padding: "12px 16px", cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600, fontSize: 13.5, color: "#374151",
                display: "flex", alignItems: "center", gap: 10,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {icon} {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────
export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState("ATTENDANCE");
  const [managerData, setManagerData] = useState({ name: "", location: "" });
  const navigate = useNavigate();
  const { employeeName } = useParams();

  useEffect(() => {
    axios.get(`${baseUrl}/me`, { withCredentials: true })
      .then((r) => setManagerData({
        name: r.data.name || "Branch Manager",
        location: r.data.location || "BANGALORE",
      }))
      .catch(() => setManagerData({ name: "Branch Manager", location: "BANGALORE" }));
  }, []);

  const { name, location } = managerData;

  if (!location) {
    return (
      <div style={{
        minHeight: "100vh", background: "#f5f6fa",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: "3px solid #e0e7ff",
          borderTopColor: "#3b6cf8",
          borderRadius: "50%",
          animation: "spin 0.75s linear infinite",
        }} />
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#94a3b8", fontSize: 13 }}>
          Loading dashboard…
        </p>
      </div>
    );
  }

  const ActiveComponent = NAV.find((n) => n.key === activeTab)?.component;
  const activeNav = NAV.find((n) => n.key === activeTab);

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "#f5f6fa",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside style={{
        width: 252, flexShrink: 0,
        background: "#ffffff",
        borderRight: "1px solid #eaecf5",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        boxShadow: "4px 0 20px rgba(59,108,248,0.04)",
        overflowY: "auto",
      }}>

        {/* Brand */}
        <div style={{ padding: "26px 20px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, overflow: "hidden",
              border: "1.5px solid #e0e7ff", flexShrink: 0,
              boxShadow: "0 4px 12px rgba(59,108,248,0.1)",
            }}>
              <img src="/logo192.png" alt="VJC" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1e293b", lineHeight: 1.3 }}>VJC Overseas</div>
              <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>Manager Portal</div>
            </div>
          </div>

          {/* Manager chip */}
          <div style={{
            background: "linear-gradient(135deg, #eef2ff, #e0e9ff)",
            borderRadius: 10, padding: "10px 14px",
            border: "1px solid #c7d7fd",
          }}>
            <div style={{ fontSize: 12.5, color: "#1e3a8a", fontWeight: 700, marginBottom: 3 }}>{name}</div>
            <div style={{
              fontSize: 11, color: "#6b83c9", fontWeight: 600,
              letterSpacing: "0.06em", textTransform: "uppercase",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#22c55e", display: "inline-block",
                boxShadow: "0 0 6px rgba(34,197,94,0.5)",
              }} />
              {location}
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div style={{
          padding: "16px 20px 8px",
          fontSize: 10.5, fontWeight: 700, color: "#cbd5e1",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          Menu
        </div>

        {/* Buttons */}
        <nav style={{ padding: "0 10px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          {(() => {
            const rendered = [];
            let lastGroup = null;
            NAV.forEach(({ key, icon, label, group }) => {
              // Top-level section label (non-grouped)
              if (!group && lastGroup !== null) lastGroup = null;

              // If this item belongs to a group, show group header once
              if (group && group !== lastGroup) {
                lastGroup = group;
                rendered.push(
                  <div key={`grp-${group}`} style={{
                    margin: "10px 6px 4px",
                    fontSize: 10, fontWeight: 700, color: "#c0c8d8",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ flex: 1, height: 1, background: "#eaecf5" }} />
                    👥 {group}
                    <span style={{ flex: 1, height: 1, background: "#eaecf5" }} />
                  </div>
                );
              } else if (!group) {
                lastGroup = null;
              }

              rendered.push(
                <button
                  key={key}
                  className={`sidebar-btn${activeTab === key ? " active" : ""}`}
                  onClick={() => setActiveTab(key)}
                  style={{ paddingLeft: group ? 28 : 16 }}
                >
                  <span style={{
                    width: group ? 28 : 32,
                    height: group ? 28 : 32,
                    borderRadius: group ? 7 : 8,
                    fontSize: group ? 13 : 15,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: activeTab === key ? "#fff" : "#f8faff",
                    boxShadow: activeTab === key ? "0 2px 8px rgba(59,108,248,0.15)" : "none",
                    flexShrink: 0, transition: "all 0.2s",
                  }}>
                    {icon}
                  </span>
                  {label}
                </button>
              );
            });
            return rendered;
          })()}
        </nav>

        {/* Footer */}
        <div style={{
          padding: "12px 10px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}>
          {/* Back to Employee Dashboard */}
          <button
            onClick={() => navigate(employeeName ? `/employee/${employeeName}` : "/employee")}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "11px 14px",
              border: "1.5px solid #e0e7ff", borderRadius: 12,
              background: "#f8faff", cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 700, color: "#3b6cf8",
              transition: "background 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#eef2ff"; e.currentTarget.style.transform = "translateX(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f8faff"; e.currentTarget.style.transform = "translateX(0)"; }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #eef2ff, #e0e9ff)",
              border: "1px solid #c7d7fd",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, flexShrink: 0,
            }}>←</span>
            Back to My Dashboard
          </button>

          <div style={{ fontSize: 10.5, color: "#cbd5e1", textAlign: "center", fontWeight: 500, padding: "4px 0" }}>
            VJC Overseas © {new Date().getFullYear()}
          </div>
        </div>
      </aside>

      {/* ── RIGHT CONTENT ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>

        {/* Top bar */}
        <header style={{
          background: "#fff",
          borderBottom: "1px solid #eaecf5",
          padding: "0 32px",
          height: 66,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
          boxShadow: "0 2px 10px rgba(59,108,248,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, fontSize: 17,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, #eef2ff, #e0e9ff)",
              border: "1px solid #c7d7fd",
            }}>
              {activeNav?.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{activeNav?.label}</div>
              <div style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 500 }}>
                Branch: <strong style={{ color: "#3b6cf8" }}>{location}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              padding: "6px 14px", borderRadius: 20,
              background: "#f8faff", border: "1px solid #e0e7ff",
              fontSize: 12, color: "#6b83c9", fontWeight: 600,
            }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </div>
            <UserMenu name={`${name} · ${location}`} />
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto", height: 0 }}>
          <div className="content-panel" key={activeTab}>
            <div style={{
              background: "#fff",
              borderRadius: 18,
              border: "1px solid #eaecf5",
              padding: "28px 32px",
              boxShadow: "0 4px 24px rgba(59,108,248,0.06)",
              minHeight: "calc(100vh - 180px)",
            }}>
              {ActiveComponent && (
                <ActiveComponent
                  managerLocation={location}
                  baseUrl={baseUrl}
                  premiumStyles={premiumStyles}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── premiumStyles passed to child components ───────────────────────
export const premiumStyles = {
  container: {
    padding: 32, fontFamily: "'Plus Jakarta Sans', sans-serif",
    backgroundColor: "#f5f6fa", minHeight: "100vh",
    width: "100%", boxSizing: "border-box",
  },
  headerSection: { display: "flex", alignItems: "center", marginBottom: 28 },
  logoContainer: { marginRight: 14, width: 56, height: 56, flexShrink: 0 },
  logoImage: { width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 },
  title: {
    fontSize: "1.8rem", fontWeight: 800, color: "#1e293b",
    fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0,
  },
  contentBoxStack: {
    background: "#fff", border: "1px solid #eaecf5",
    padding: "24px 28px", borderRadius: 16,
    boxShadow: "0 4px 20px rgba(59,108,248,0.06)",
    marginBottom: 20, width: "100%",
  },
  contentBoxNoMargin: { background: "#fff", borderRadius: 14 },
  separator: { borderBottom: "1px solid #eaecf5", margin: "20px 0" },
  sectionTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "13px", fontWeight: 700, color: "#1e293b",
    letterSpacing: "0.05em", textTransform: "uppercase",
    marginBottom: 18, paddingBottom: 12,
    borderBottom: "1px solid #eaecf5",
    display: "flex", alignItems: "center", gap: 8,
  },
  table: {
    width: "100%", borderCollapse: "separate", borderSpacing: "0 6px",
    headerRow: { background: "#f8faff" },
    headerCell: {
      padding: "12px 16px", border: "none",
      fontSize: 11, fontWeight: 700, color: "#94a3b8",
      textAlign: "left", textTransform: "uppercase", letterSpacing: "0.07em",
    },
    dataRow: { background: "#fafbff", borderRadius: 10 },
    dataCell: {
      padding: "13px 16px", border: "none",
      fontSize: 13.5, verticalAlign: "middle", textAlign: "left", color: "#374151",
    },
  },
  btn: {
    cursor: "pointer", padding: "9px 20px", borderRadius: 10,
    border: "none", fontWeight: 700, color: "#fff",
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
    background: "linear-gradient(135deg, #3b6cf8 0%, #6e8efb 100%)",
    boxShadow: "0 4px 14px rgba(59,108,248,0.3)",
    transition: "opacity 0.2s, transform 0.15s",
  },
  input: {
    padding: "10px 14px", borderRadius: 10,
    border: "1.5px solid #e0e7ff", fontSize: 13.5,
    background: "#fafbff", color: "#1e293b",
    outline: "none", width: "100%",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "border-color 0.2s",
  },
  emptyText: {
    fontStyle: "italic", color: "#94a3b8", textAlign: "center",
    padding: 40, background: "#f8faff", borderRadius: 12, fontSize: "0.95rem",
  },
  message: {
    fontWeight: 600, marginBottom: 15, padding: "12px 16px",
    borderRadius: 10, textAlign: "center", color: "#fff",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
  },
  approvedColor: { color: "#16a34a" },
  rejectedColor: { color: "#dc2626" },
  pendingColor:  { color: "#d97706" },
  navBar: {
    display: "flex", background: "#fff",
    borderBottom: "1px solid #eaecf5", overflowX: "auto", padding: 0,
  },
  navItem: {
    padding: "13px 22px", cursor: "pointer", border: "none",
    background: "transparent", fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13, fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
  },
  activeNavItem: { color: "#3b6cf8", borderBottom: "2.5px solid #3b6cf8" },
  dynamicContent: {
    background: "#fff", border: "1px solid #eaecf5",
    borderTop: "none", borderRadius: "0 0 16px 16px",
    padding: "28px 32px",
    boxShadow: "0 8px 24px rgba(59,108,248,0.06)",
  },
  userMenu: {
    container: { position: "fixed", top: 16, right: 28, zIndex: 1000 },
    avatar: {
      width: 40, height: 40, borderRadius: "50%",
      background: "linear-gradient(135deg, #3b6cf8, #6e8efb)",
      color: "#fff", fontWeight: 800, fontSize: 16,
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", border: "2.5px solid #fff",
      boxShadow: "0 4px 14px rgba(59,108,248,0.35)",
    },
    dropdown: {
      position: "absolute", top: "calc(100% + 10px)", right: 0,
      background: "#fff", borderRadius: 14,
      boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
      border: "1px solid #eaecf5",
      overflow: "hidden", minWidth: 190,
      animation: "fadeIn 0.18s ease",
    },
    dropdownItem: {
      padding: "12px 16px", cursor: "pointer",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600, fontSize: 13.5, color: "#374151",
      display: "flex", alignItems: "center", gap: 10,
      transition: "background 0.15s, color 0.15s",
    },
  },
};