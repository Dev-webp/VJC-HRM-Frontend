/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import LeaveApplication from "./LeaveApplication";
import AttendanceDashboard from "./AttendanceDashboard";
import SalarySlips from "./SalarySlips";
import PayrollSlip from "./PayrollSlip";
import AttendanceChatLogs from "./AttendanceChatLogs";
import SalesStats from "./SalesStats";
import AttendanceAnalytics from './Attendanceanalytics.jsx';
import Fulldata from "./Fulldata.jsx";
import LeadManagement from "./LeadManagement";
import ChatSystem from "./ChatSystem";
import ResumeMarketing from "./ResumeMarketing";

const baseUrl =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://backend.vjcoverseas.com";

// ── Inject Google Font ──────────────────────────────────────────────
const injectFont = () => {
    if (document.getElementById("emp-dash-font")) return;
    const s = document.createElement("style");
    s.id = "emp-dash-font";
    s.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`;
    document.head.appendChild(s);
};
injectFont();

// ─── Sidebar Nav Item ───────────────────────────────────────────────
function NavItem({ icon, label, tabKey, activeTab, setActiveTab, badge, onClick }) {
    const isActive = activeTab === tabKey;
    return (
        <button
            onClick={() => { setActiveTab(tabKey); onClick && onClick(); }}
            style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "11px 12px",
                borderRadius: 11, border: "none",
                background: isActive ? "linear-gradient(135deg, #eef2ff, #e0e9ff)" : "transparent",
                cursor: "pointer", fontSize: 13.5, fontWeight: isActive ? 700 : 600,
                color: isActive ? "#3b6cf8" : "#64748b",
                textAlign: "left", marginBottom: 2,
                transition: "background 0.15s, color 0.15s, transform 0.15s",
                position: "relative",
                boxShadow: isActive ? "0 2px 12px rgba(59,108,248,0.1)" : "none",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                ...(isActive ? { borderLeft: "3.5px solid #3b6cf8", paddingLeft: "8.5px" } : { borderLeft: "3.5px solid transparent" }),
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "#f1f5ff"; e.currentTarget.style.color = "#3b6cf8"; e.currentTarget.style.transform = "translateX(3px)"; }}}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.transform = "translateX(0)"; }}}
        >
            <span style={{
                width: 30, height: 30, borderRadius: 8, fontSize: 15,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isActive ? "#fff" : "#f8faff",
                boxShadow: isActive ? "0 2px 8px rgba(59,108,248,0.15)" : "none",
                flexShrink: 0, transition: "all 0.2s",
            }}>{icon}</span>
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
            {badge && (
                <span style={{
                    background: "#ef4444", color: "#fff", fontSize: 10,
                    padding: "2px 7px", borderRadius: 20, fontWeight: 700,
                }}>{badge}</span>
            )}
        </button>
    );
}

// ─── User Avatar Menu ───────────────────────────────────────────────
function UserAvatarMenu({ name = "User", role = "employee" }) {
    const [open, setOpen] = useState(false);
    const ref = useRef();

    const handleLogout = async () => {
        try { await axios.get(`${baseUrl}/logout`, { withCredentials: true }); }
        catch { alert("Logout failed"); }
        window.location.href = "/";
    };

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <div
                onClick={() => setOpen(o => !o)}
                title={name}
                style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b6cf8, #6e8efb)",
                    color: "#fff", fontWeight: 800, fontSize: 15,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", border: "2.5px solid #fff",
                    boxShadow: "0 4px 14px rgba(59,108,248,0.3)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
            >
                {name[0]?.toUpperCase() || "U"}
            </div>
            {open && (
                <div style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0,
                    background: "#fff", borderRadius: 14,
                    border: "1px solid #eaecf5",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.13)",
                    minWidth: 200, overflow: "hidden", zIndex: 200,
                }}>
                    <div style={{
                        padding: "16px 18px",
                        background: "linear-gradient(135deg, #3b6cf8, #6e8efb)",
                        color: "#fff",
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{name}</div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{role}</div>
                    </div>
                    {[
                        { label: "🚪 Logout",      action: handleLogout },
                        { label: "🔄 Switch User", action: () => window.location.href = "/" },
                    ].map(({ label, action }) => (
                        <div
                            key={label}
                            onClick={action}
                            style={{
                                padding: "12px 18px", fontSize: 13, color: "#334155",
                                cursor: "pointer", fontWeight: 600,
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                transition: "background 0.15s",
                                borderBottom: "1px solid #f8faff",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#f1f5ff"; e.currentTarget.style.color = "#3b6cf8"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#334155"; }}
                        >{label}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Toast ─────────────────────────────────────────────────────────
function Toast({ toast }) {
    if (!toast) return null;
    const colors = { info: "#3b6cf8", success: "#10b981", error: "#ef4444", warning: "#f59e0b" };
    return (
        <div style={{
            position: "fixed", top: 20, right: 24,
            color: "#fff", fontWeight: 600, fontSize: 13,
            padding: "12px 22px", borderRadius: 12, zIndex: 9999,
            boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
            background: colors[toast.type] || colors.info,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
            {toast.msg}
        </div>
    );
}

// ─── Section label ──────────────────────────────────────────────────
function NavLabel({ children }) {
    return (
        <div style={{
            fontSize: 10, fontWeight: 700, color: "#c0c8d8",
            letterSpacing: "0.1em", textTransform: "uppercase",
            padding: "12px 12px 4px",
        }}>{children}</div>
    );
}

// ─── Main Dashboard ─────────────────────────────────────────────────
function EmployeeDashboard({ defaultTab, openAddLead }) {
    const { employeeName } = useParams();
    const navigate = useNavigate();

    const [profile, setProfile]             = useState(null);
    const [salarySlips, setSalarySlips]     = useState([]);
    const [toast, setToast]                 = useState(null);
    const [activeTab, setActiveTab]         = useState(defaultTab || "overview");
    const [sidebarOpen, setSidebarOpen]     = useState(true);
    const [visibleSections, setVisibleSections] = useState(["attendance","leave","salary","chat"]);

    const [editMode, setEditMode]           = useState(false);
    const [editName, setEditName]           = useState("");
    const [imageFile, setImageFile]         = useState(null);
    const [localProfileImage, setLocalProfileImage] = useState(null);

    const [showInstructions, setShowInstructions]   = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword]             = useState("");
    const [confirmPassword, setConfirmPassword]     = useState("");

    const [hasSalesTarget, setHasSalesTarget]       = useState(false);
    const [checkingSalesTarget, setCheckingSalesTarget] = useState(true);

    const [canCreate, setCanCreate]         = useState(false);
    const [hasLeads, setHasLeads]           = useState(false);
    const [leadBadge, setLeadBadge]         = useState(0);
    const [leadAccessChecked, setLeadAccessChecked] = useState(false);

    const [chatUnread, setChatUnread]       = useState(0);

    const showLeadTab = canCreate || hasLeads;

    const showToast = (msg, type = "info") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        axios.get(`${baseUrl}/me`, { withCredentials: true })
            .then((res) => {
                setProfile(res.data);
                const secs = res.data.visibleSections;
                if (Array.isArray(secs) && secs.length > 0) setVisibleSections(secs);
                if (!employeeName && res.data.name) {
                    const urlName = res.data.name.toLowerCase().replace(/\s+/g, "-");
                    navigate(`/employee/${urlName}`, { replace: true });
                }
            })
            .catch(() => showToast("❌ Failed to fetch profile", "error"));
        const storedImg = localStorage.getItem("userProfileImage");
        if (storedImg) setLocalProfileImage(storedImg);
    }, [employeeName, navigate]);

    useEffect(() => {
        if (profile?.email) {
            axios.get(`${baseUrl}/sales-stats/${profile.email}`, { withCredentials: true })
                .then((res) => setHasSalesTarget(parseFloat(res.data.target || 0) > 0))
                .catch(() => setHasSalesTarget(false))
                .finally(() => setCheckingSalesTarget(false));
        }
    }, [profile]);

    useEffect(() => {
        if (profile) {
            axios.get(`${baseUrl}/my-salary-slips`, { withCredentials: true })
                .then((res) => setSalarySlips(res.data))
                .catch(() => {});
        }
    }, [profile]);

    useEffect(() => {
        if (!profile) return;
        axios.get(`${baseUrl}/leads/my-access`, { withCredentials: true })
            .then((res) => { setCanCreate(!!res.data.canCreate); setHasLeads(!!res.data.hasLeads); })
            .catch(() => { setCanCreate(false); setHasLeads(false); })
            .finally(() => setLeadAccessChecked(true));
    }, [profile]);

    useEffect(() => {
        if (!showLeadTab) return;
        axios.get(`${baseUrl}/leads`, { withCredentials: true })
            .then((res) => setLeadBadge(res.data.filter(l => l.status === "Pending").length))
            .catch(() => {});
    }, [showLeadTab]);

    const fetchChatUnread = useCallback(async () => {
        if (!visibleSections.includes("chat")) return;
        try {
            const r = await axios.get(`${baseUrl}/chat/rooms`, { withCredentials: true });
            setChatUnread(r.data.reduce((s, rm) => s + (rm.unread_count || 0), 0));
        } catch {}
    }, [visibleSections]);

    useEffect(() => {
        fetchChatUnread();
        const interval = setInterval(fetchChatUnread, 30000);
        return () => clearInterval(interval);
    }, [fetchChatUnread]);

    useEffect(() => {
        if (leadAccessChecked && activeTab === "leads" && !showLeadTab) setActiveTab("overview");
    }, [leadAccessChecked, activeTab, showLeadTab]);

    useEffect(() => {
        if (activeTab === "chat" && !visibleSections.includes("chat")) setActiveTab("overview");
    }, [activeTab, visibleSections]);

    const isMISExecutive = profile?.role?.toLowerCase().includes("mis-execuitve") ||
        profile?.role?.toLowerCase() === "mis-execuitve";

    const canSeeSection = (key) => visibleSections.includes(key);

    const handleSaveProfile = async () => {
        let changes = [];
        if (imageFile) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                localStorage.setItem("userProfileImage", reader.result);
                setLocalProfileImage(reader.result);
                changes.push("image");
                await saveNameAndPassword(changes);
            };
            reader.readAsDataURL(imageFile);
            return;
        }
        await saveNameAndPassword(changes);
    };

    const saveNameAndPassword = async (changes) => {
        let updatedProfile = { ...profile };
        if (editName && editName !== profile.name) {
            try {
                await axios.post(`${baseUrl}/update-profile-name`,
                    new URLSearchParams({ name: editName }), { withCredentials: true });
                updatedProfile.name = editName;
                changes.push("name");
                navigate(`/employee/${editName.toLowerCase().replace(/\s+/g, "-")}`, { replace: true });
            } catch { showToast("❌ Failed to update name", "error"); }
        }
        setProfile(updatedProfile);
        setEditMode(false);
        if (changes.length > 0) showToast(`✅ Updated ${changes.join(", ")}`, "success");
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) return showToast("❌ Fill both fields", "error");
        if (newPassword !== confirmPassword) return showToast("❌ Passwords don't match", "error");
        if (newPassword.length < 6) return showToast("❌ Min 6 characters", "error");
        try {
            await axios.post(`${baseUrl}/update-password`,
                new URLSearchParams({ password: newPassword }), { withCredentials: true });
            showToast("✅ Password updated", "success");
            setShowPasswordModal(false);
            setNewPassword(""); setConfirmPassword("");
        } catch { showToast("❌ Failed to update password", "error"); }
    };

    const pageTitles = {
        overview: "Overview", attendance: "Attendance", leave: "Leave",
        salary: "Salary & Payroll", sales: "Sales Stats",
        chatlogs: "Chat Logs", fulldata: "Full Data",
        leads: "My Leads", chat: "Team Chat",
    };

    const handleTabChange = (t) => {
        setActiveTab(t);
        if (t === "chat") setChatUnread(0);
        if (t === "leads") setLeadBadge(0);
    };

    const goToManagerDashboard = () => {
        const urlName = employeeName || profile?.name?.toLowerCase().replace(/\s+/g, "-");
        navigate(`/employee/${urlName}/manager-dashboard`);
    };

    const SIDEBAR_W = sidebarOpen ? 252 : 68;

    return (
        <div style={{
            display: "flex", height: "100vh", overflow: "hidden",
            background: "#f5f6fa",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
            <Toast toast={toast} />

            {/* ── SIDEBAR ── */}
            <aside style={{
                width: SIDEBAR_W, flexShrink: 0,
                background: "#fff",
                borderRight: "1px solid #eaecf5",
                display: "flex", flexDirection: "column",
                height: "100vh", overflow: "hidden",
                transition: "width 0.25s cubic-bezier(.4,0,.2,1)",
                boxShadow: "4px 0 20px rgba(59,108,248,0.04)",
                zIndex: 50,
            }}>

                {/* Brand */}
                <div style={{ padding: "20px 14px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 11, overflow: "hidden",
                            border: "1.5px solid #e0e7ff", flexShrink: 0,
                            boxShadow: "0 4px 12px rgba(59,108,248,0.1)",
                        }}>
                            <img src="/logo512.png" alt="VJC" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        </div>
                        {sidebarOpen && (
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", whiteSpace: "nowrap" }}>VJC Overseas</div>
                                <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>HRM Portal</div>
                            </div>
                        )}
                    </div>

                    {/* Profile mini — only when open */}
                    {sidebarOpen && (
                        <div style={{
                            marginTop: 14, padding: "14px 12px",
                            background: "linear-gradient(135deg, #f8faff, #eef2ff)",
                            borderRadius: 12, border: "1px solid #e0e7ff",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        }}>
                            <div style={{ position: "relative" }}>
                                <img
                                    src={localProfileImage || (profile?.image ? `${baseUrl}${profile.image}` : "https://placehold.co/64x64?text=Me")}
                                    alt="avatar"
                                    style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "3px solid #c7d7fd" }}
                                />
                                {editMode && (
                                    <label htmlFor="profile-upload" style={{
                                        position: "absolute", bottom: 0, right: 0,
                                        width: 22, height: 22, background: "#3b6cf8",
                                        borderRadius: "50%", display: "flex",
                                        alignItems: "center", justifyContent: "center",
                                        fontSize: 11, cursor: "pointer", border: "2px solid #fff",
                                    }}>📷</label>
                                )}
                                <input id="profile-upload" type="file" accept="image/*" style={{ display: "none" }}
                                    onChange={(e) => {
                                        setImageFile(e.target.files[0]);
                                        if (e.target.files[0]) setLocalProfileImage(URL.createObjectURL(e.target.files[0]));
                                    }} disabled={!editMode} />
                            </div>

                            {!editMode ? (
                                <>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", textAlign: "center" }}>{profile?.name || "Loading..."}</div>
                                    <div style={{ fontSize: 11, color: "#6366f1", background: "#ede9fe", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{profile?.role || "Employee"}</div>
                                    <div style={{ display: "flex", gap: 6, marginTop: 2, width: "100%" }}>
                                        <button
                                            style={{ flex: 1, fontSize: 11, fontWeight: 700, padding: "6px 0", background: "transparent", border: "1.5px solid #3b6cf8", borderRadius: 8, color: "#3b6cf8", cursor: "pointer" }}
                                            onClick={() => { setEditName(profile?.name || ""); setEditMode(true); }}
                                        >✏️ Edit</button>
                                        <button
                                            style={{ flex: 1, fontSize: 11, fontWeight: 700, padding: "6px 0", background: "transparent", border: "1.5px solid #10b981", borderRadius: 8, color: "#10b981", cursor: "pointer" }}
                                            onClick={() => setShowPasswordModal(true)}
                                        >🔐 Pwd</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <input
                                        type="text" value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1.5px solid #e0e7ff", borderRadius: 8, outline: "none", boxSizing: "border-box" }}
                                        placeholder="Your name"
                                    />
                                    <div style={{ display: "flex", gap: 6, width: "100%" }}>
                                        <button style={{ flex: 1, fontSize: 11, fontWeight: 700, padding: "6px 0", background: "#3b6cf8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }} onClick={handleSaveProfile}>💾 Save</button>
                                        <button style={{ flex: 1, fontSize: 11, fontWeight: 700, padding: "6px 0", background: "transparent", border: "1.5px solid #e2e8f0", borderRadius: 8, color: "#64748b", cursor: "pointer" }} onClick={() => setEditMode(false)}>✕</button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
                    {sidebarOpen && <NavLabel>Main</NavLabel>}
                    <NavItem icon="🏠" label="Overview"       tabKey="overview"    activeTab={activeTab} setActiveTab={handleTabChange} />
                    {canSeeSection("attendance") && <NavItem icon="🕒" label="Attendance"    tabKey="attendance"  activeTab={activeTab} setActiveTab={handleTabChange} />}
                    {canSeeSection("leave")      && <NavItem icon="📅" label="Leave"         tabKey="leave"       activeTab={activeTab} setActiveTab={handleTabChange} />}
                    {canSeeSection("salary")     && <NavItem icon="💰" label="Salary"        tabKey="salary"      activeTab={activeTab} setActiveTab={handleTabChange} />}
                    {canSeeSection("chat")       && <NavItem icon="💬" label="Team Chat"     tabKey="chat"        activeTab={activeTab} setActiveTab={handleTabChange} badge={chatUnread > 0 ? chatUnread : null} />}
                    {canSeeSection("leads") && showLeadTab && <NavItem icon="🎯" label="My Leads" tabKey="leads" activeTab={activeTab} setActiveTab={handleTabChange} badge={leadBadge > 0 ? leadBadge : null} />}
                    {canSeeSection("sales") && hasSalesTarget && !checkingSalesTarget && <NavItem icon="📈" label="Sales Stats" tabKey="sales" activeTab={activeTab} setActiveTab={handleTabChange} />}
                    {canSeeSection("resume") && (
  <NavItem icon="📄" label="Resume Marketing" tabKey="resume" activeTab={activeTab} setActiveTab={handleTabChange} />
)}
                    {(canSeeSection("chatlogs") || isMISExecutive) && (
                        <>
                            {sidebarOpen && <NavLabel>MIS Executive</NavLabel>}
                            <NavItem icon="📋" label="Chat Logs" tabKey="chatlogs" activeTab={activeTab} setActiveTab={handleTabChange} />
                        </>
                    )}
                    {(canSeeSection("fulldata") || isMISExecutive) && (
                        <NavItem icon="📊" label="Full Data" tabKey="fulldata" activeTab={activeTab} setActiveTab={handleTabChange} />
                    )}
                </nav>

                {/* Footer actions */}
                <div style={{ padding: "10px 10px 14px", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    {profile?.role === "manager" && (
                        <button
                            onClick={goToManagerDashboard}
                            style={{
                                display: "flex", alignItems: "center", gap: 10,
                                width: "100%", padding: "11px 12px",
                                border: "1.5px solid #e0e7ff", borderRadius: 11,
                                background: "linear-gradient(135deg, #f8faff, #eef2ff)",
                                cursor: "pointer", fontSize: 13, fontWeight: 700,
                                color: "#3b6cf8", textAlign: "left",
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                transition: "all 0.15s", overflow: "hidden",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#e0e9ff"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, #f8faff, #eef2ff)"; }}
                        >
                            <span style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: "linear-gradient(135deg, #3b6cf8, #6e8efb)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, flexShrink: 0, color: "#fff",
                            }}>👔</span>
                            {sidebarOpen && "Manager Dashboard"}
                        </button>
                    )}

                    <button
                        onClick={() => setShowInstructions(true)}
                        style={{
                            display: "flex", alignItems: "center", gap: 10,
                            width: "100%", padding: "10px 12px",
                            border: "none", borderRadius: 10, background: "transparent",
                            cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                            color: "#64748b", textAlign: "left",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            overflow: "hidden",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#f1f5ff"; e.currentTarget.style.color = "#3b6cf8"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}
                    >
                        <span style={{ fontSize: 15, flexShrink: 0 }}>📋</span>
                        {sidebarOpen && "Instructions"}
                    </button>

                    <button
                        onClick={() => axios.get(`${baseUrl}/logout`, { withCredentials: true }).then(() => window.location.href = "/")}
                        style={{
                            display: "flex", alignItems: "center", gap: 10,
                            width: "100%", padding: "10px 12px",
                            border: "none", borderRadius: 10, background: "transparent",
                            cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                            color: "#ef4444", textAlign: "left",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            overflow: "hidden",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                        <span style={{ fontSize: 15, flexShrink: 0 }}>🚪</span>
                        {sidebarOpen && "Logout"}
                    </button>
                </div>
            </aside>

            {/* ── MAIN ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, height: "100vh" }}>

                {/* Top bar */}
                <header style={{
                    height: 60, flexShrink: 0,
                    background: "#fff", borderBottom: "1px solid #eaecf5",
                    display: "flex", alignItems: "center",
                    padding: "0 28px", gap: 14, zIndex: 50,
                    boxShadow: "0 2px 10px rgba(59,108,248,0.05)",
                }}>
                    <button
                        onClick={() => setSidebarOpen(o => !o)}
                        style={{
                            width: 34, height: 34, borderRadius: 9,
                            border: "1px solid #eaecf5", background: "#f8faff",
                            cursor: "pointer", fontSize: 13, color: "#64748b",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}
                        title={sidebarOpen ? "Collapse" : "Expand"}
                    >{sidebarOpen ? "◀" : "▶"}</button>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: 9, fontSize: 16,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "linear-gradient(135deg, #eef2ff, #e0e9ff)",
                            border: "1px solid #c7d7fd", flexShrink: 0,
                        }}>
                            {{ overview:"🏠", attendance:"🕒", leave:"📅", salary:"💰", chat:"💬", leads:"🎯", sales:"📈", chatlogs:"📋", fulldata:"📊" }[activeTab] || "📄"}
                        </div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{pageTitles[activeTab] || "Dashboard"}</div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {chatUnread > 0 && activeTab !== "chat" && canSeeSection("chat") && (
                            <button
                                onClick={() => handleTabChange("chat")}
                                style={{
                                    background: "#eef2ff", border: "1px solid #c7d2fe",
                                    color: "#3b6cf8", padding: "6px 14px",
                                    borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}
                            >💬 {chatUnread} new</button>
                        )}
                        <div style={{
                            padding: "5px 12px", borderRadius: 20,
                            background: "#f8faff", border: "1px solid #e0e7ff",
                            fontSize: 11.5, color: "#6b83c9", fontWeight: 600,
                        }}>
                            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                        </div>
                        <UserAvatarMenu name={profile?.name || "User"} role={profile?.role || "employee"} />
                    </div>
                </header>

                {/* Content area */}
                <main style={{ flex: 1, overflowY: "auto", padding: 28, height: 0 }}>

                    {/* ── OVERVIEW ── */}
                    {activeTab === "overview" && (
                        <div>
                            {/* Welcome banner */}
                            <div style={{
                                background: "linear-gradient(135deg, #3b6cf8 0%, #6e8efb 100%)",
                                borderRadius: 18, padding: "28px 32px", color: "#fff", marginBottom: 20,
                                boxShadow: "0 8px 32px rgba(59,108,248,0.25)",
                            }}>
                                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    Welcome back, {profile?.name?.split(" ")[0] || "there"} 👋
                                </h2>
                                <p style={{ fontSize: 14, opacity: 0.88, margin: "6px 0 0" }}>Here's your snapshot for today.</p>
                            </div>

                            {/* ── Info chips — SINGLE BLOCK (fixed duplicate) ── */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
                                {[
                                    { icon: "📧", label: "Email",       val: profile?.email      || "—" },
                                    { icon: "💼", label: "Department",  val: profile?.department || "N/A" },
                                    { icon: "📍", label: "Location",    val: profile?.location   || "N/A" },
                                    { icon: "🆔", label: "Employee ID", val: profile?.employeeId || profile?.id || "—" },
                                ].map(({ icon, label, val }) => (
                                    <div key={label} style={{
                                        background: "#fff", borderRadius: 14,
                                        border: "1px solid #eaecf5", padding: "14px 16px",
                                        display: "flex", alignItems: "center", gap: 12,
                                        boxShadow: "0 2px 8px rgba(59,108,248,0.04)",
                                    }}>
                                        <span style={{
                                            fontSize: 20, width: 40, height: 40,
                                            background: "#f0f4ff", borderRadius: 10,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            flexShrink: 0,
                                        }}>{icon}</span>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2, fontWeight: 700 }}>{label}</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", wordBreak: "break-word" }}>{val}</div>
                                        </div>
                                    </div>
                                ))}

                                {/* Offer Letter — VIEW mode (no download attribute) */}
                                {profile?.offer_letter_url && (
                                    <a
                                        href={`${baseUrl}${profile.offer_letter_url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                            background: "#fff", borderRadius: 14,
                                            border: "1px solid #eaecf5", padding: "14px 16px",
                                            display: "flex", alignItems: "center", gap: 12,
                                            boxShadow: "0 2px 8px rgba(59,108,248,0.04)",
                                            textDecoration: "none",
                                            cursor: "pointer",
                                            transition: "box-shadow 0.15s, transform 0.15s",
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(59,108,248,0.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,108,248,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
                                    >
                                        <span style={{
                                            fontSize: 20, width: 40, height: 40,
                                            background: "#f0f4ff", borderRadius: 10,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            flexShrink: 0,
                                        }}>📄</span>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2, fontWeight: 700 }}>Offer Letter</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#3b6cf8" }}>👁 View</div>
                                        </div>
                                    </a>
                                )}
                            </div>

                            {/* Analytics */}
                            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #eaecf5", padding: 24, boxShadow: "0 2px 8px rgba(59,108,248,0.04)" }}>
                                <AttendanceAnalytics />
                            </div>
                        </div>
                    )}

                    {/* ── OTHER TABS ── */}
                    {[
                        { key: "attendance", sec: "attendance", el: <AttendanceDashboard /> },
                        { key: "leave",      sec: "leave",      el: <LeaveApplication onMessage={(msg) => showToast(msg, "info")} /> },
                        { key: "chatlogs",   sec: null,         el: <AttendanceChatLogs />,   extra: canSeeSection("chatlogs") || isMISExecutive },
                        { key: "fulldata",   sec: null,         el: <Fulldata />,              extra: canSeeSection("fulldata") || isMISExecutive },
                        { key: "leads",      sec: "leads",      el: <LeadManagement isChairman={false} />, extra: showLeadTab },
                        { key: "resume", sec: "resume", el: <ResumeMarketing /> },
                        
                    ].map(({ key, sec, el, extra }) => {
                        const show = activeTab === key && (sec ? canSeeSection(sec) : extra !== false);
                        return show ? (
                            <div key={key} style={{ background: "#fff", borderRadius: 16, border: "1px solid #eaecf5", padding: 24, boxShadow: "0 2px 8px rgba(59,108,248,0.04)" }}>
                                {el}
                            </div>
                        ) : null;
                    })}

                    {/* Salary — two cards */}
                    {activeTab === "salary" && canSeeSection("salary") && (
                        <>
                            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #eaecf5", padding: 24, marginBottom: 20, boxShadow: "0 2px 8px rgba(59,108,248,0.04)" }}>
                                <SalarySlips salarySlips={salarySlips} />
                            </div>
                            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #eaecf5", padding: 24, boxShadow: "0 2px 8px rgba(59,108,248,0.04)" }}>
                                <PayrollSlip />
                            </div>
                        </>
                    )}

                    {/* Team Chat — full height */}
                    {activeTab === "chat" && canSeeSection("chat") && (
                        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #eaecf5", overflow: "hidden", height: "calc(100vh - 116px)", boxShadow: "0 2px 8px rgba(59,108,248,0.04)" }}>
                            <ChatSystem currentUser={{ id: profile?.id, name: profile?.name }} isChairman={false} />
                        </div>
                    )}

                    {/* Sales */}
                    {activeTab === "sales" && canSeeSection("sales") && hasSalesTarget && (
                        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #eaecf5", padding: 24, boxShadow: "0 2px 8px rgba(59,108,248,0.04)" }}>
                            <SalesStats employeeEmail={profile?.email} isChairman={false} />
                        </div>
                    )}

                    {/* Access denied */}
                    {activeTab !== "overview" && activeTab !== "chatlogs" && activeTab !== "fulldata" && !canSeeSection(activeTab) && (
                        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #eaecf5", padding: 60, textAlign: "center", boxShadow: "0 2px 8px rgba(59,108,248,0.04)" }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Access Restricted</div>
                            <div style={{ fontSize: 13, color: "#94a3b8" }}>This section has not been enabled for your account.</div>
                        </div>
                    )}
                </main>
            </div>

            {/* ── INSTRUCTIONS MODAL ── */}
            {showInstructions && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5000, padding: 20 }}
                    onClick={() => setShowInstructions(false)}>
                    <div style={{ background: "#fff", borderRadius: 20, maxWidth: 680, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ padding: "24px 28px", background: "linear-gradient(135deg, #3b6cf8, #6e8efb)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "20px 20px 0 0" }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>📋 Dashboard Instructions</h3>
                            <button onClick={() => setShowInstructions(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 22, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ padding: 28 }}>
                            {[
                                { title: "🏠 Overview",      text: "View your profile summary, employee ID, role, department, and attendance analytics at a glance." },
                                canSeeSection("attendance") && { title: "🕒 Attendance",  text: "Mark daily attendance and view history. Office hours start at 10:00 AM. After 10:15 AM is late." },
                                canSeeSection("leave")      && { title: "📅 Leave",       text: "Apply for leave and check history. Unapproved leave = full-day absence." },
                                canSeeSection("salary")     && { title: "💰 Salary",      text: "View salary slips, download payroll documents, and track payment history." },
                                canSeeSection("chat")       && { title: "💬 Team Chat",   text: "Message your team in department channels or direct messages." },
                                showLeadTab && canSeeSection("leads") && { title: "🎯 My Leads", text: "Leads assigned to you appear here. You have 45 minutes to call each lead." },
                                hasSalesTarget && canSeeSection("sales") && { title: "📈 Sales Stats", text: "Track your sales performance, add entries, view targets and achievement %." },
                            ].filter(Boolean).map(({ title, text }) => (
                                <div key={title} style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h4>
                                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{text}</p>
                                </div>
                            ))}
                            <div style={{ marginBottom: 18 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>⚠️ Important Rules</h4>
                                <ul style={{ margin: 0, paddingLeft: 18, color: "#64748b", fontSize: 13, lineHeight: 2 }}>
                                    <li>Grace: 6 late logins/month before penalties</li>
                                    <li>Minimum 8 hours for a full day</li>
                                    <li>Forgot to logout = marked absent</li>
                                    <li>Partial attendance in slots = half-day</li>
                                    <li>Contact Developer (nuthan-full-stack-dev) for issues</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PASSWORD MODAL ── */}
            {showPasswordModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5000, padding: 20 }}
                    onClick={() => setShowPasswordModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 20, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ padding: "24px 28px", background: "linear-gradient(135deg, #3b6cf8, #6e8efb)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "20px 20px 0 0" }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>🔐 Change Password</h3>
                            <button onClick={() => setShowPasswordModal(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 22, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ padding: 28 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>New Password</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e0e7ff", borderRadius: 10, outline: "none", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                placeholder="Enter new password" autoComplete="new-password" />
                            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", margin: "16px 0 8px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Confirm Password</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e0e7ff", borderRadius: 10, outline: "none", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                placeholder="Confirm new password" autoComplete="new-password" />
                            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                                <button onClick={handleChangePassword}
                                    style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #3b6cf8, #6e8efb)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    💾 Update Password
                                </button>
                                <button onClick={() => { setShowPasswordModal(false); setNewPassword(""); setConfirmPassword(""); }}
                                    style={{ flex: 1, padding: "12px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmployeeDashboard;