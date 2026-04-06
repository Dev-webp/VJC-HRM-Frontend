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

const baseUrl =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://backend.vjcoverseas.com";

// ─── Sidebar Nav Item ───────────────────────────────────────────────
function NavItem({ icon, label, tabKey, activeTab, setActiveTab, badge, onClick }) {
    const isActive = activeTab === tabKey;
    return (
        <button
            onClick={() => { setActiveTab(tabKey); onClick && onClick(); }}
            style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) }}
        >
            <span style={styles.navIcon}>{icon}</span>
            <span style={styles.navLabel}>{label}</span>
            {badge && <span style={styles.navBadge}>{badge}</span>}
        </button>
    );
}

// ─── User Avatar Menu ───────────────────────────────────────────────
function UserAvatarMenu({ name = "User", role = "employee" }) {
    const [open, setOpen] = useState(false);
    const ref = useRef();

    const handleLogout = async () => {
        try {
            await axios.get(`${baseUrl}/logout`, { withCredentials: true });
            window.location.href = "/";
        } catch { alert("Logout failed"); }
    };

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <div onClick={() => setOpen(o => !o)} style={styles.avatarCircle} title={name}>
                {name[0]?.toUpperCase() || "U"}
            </div>
            {open && (
                <div style={styles.avatarDropdown}>
                    <div style={styles.avatarDropdownHeader}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{role}</div>
                    </div>
                    <div style={styles.avatarDropdownItem} onClick={handleLogout}>🚪 Logout</div>
                    <div style={styles.avatarDropdownItem} onClick={() => window.location.href = "/"}>🔄 Switch User</div>
                </div>
            )}
        </div>
    );
}

// ─── Toast ─────────────────────────────────────────────────────────
function Toast({ toast }) {
    if (!toast) return null;
    const colors = { info: "#3b82f6", success: "#10b981", error: "#ef4444", warning: "#f59e0b" };
    return (
        <div style={{ ...styles.toast, background: colors[toast.type] || colors.info }}>
            {toast.msg}
        </div>
    );
}

// ─── Main Dashboard ─────────────────────────────────────────────────
function EmployeeDashboard() {
    const { employeeName } = useParams();
    const navigate = useNavigate();

    const [profile, setProfile]             = useState(null);
    const [salarySlips, setSalarySlips]     = useState([]);
    const [toast, setToast]                 = useState(null);
    const [activeTab, setActiveTab]         = useState("overview");
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

    // ── Load profile + visible sections ──
    useEffect(() => {
        axios.get(`${baseUrl}/me`, { withCredentials: true })
            .then((res) => {
                setProfile(res.data);
                // Read visibleSections from backend (set by chairman)
                const secs = res.data.visibleSections;
                if (Array.isArray(secs) && secs.length > 0) {
                    setVisibleSections(secs);
                }
                if (!employeeName && res.data.name) {
                    const urlName = res.data.name.toLowerCase().replace(/\s+/g, "-");
                    navigate(`/employee/${urlName}`, { replace: true });
                }
            })
            .catch(() => showToast("❌ Failed to fetch profile", "error"));

        const storedImg = localStorage.getItem("userProfileImage");
        if (storedImg) setLocalProfileImage(storedImg);
    }, [employeeName, navigate]);

    // ── Check sales target ──
    useEffect(() => {
        if (profile?.email) {
            axios.get(`${baseUrl}/sales-stats/${profile.email}`, { withCredentials: true })
                .then((res) => setHasSalesTarget(parseFloat(res.data.target || 0) > 0))
                .catch(() => setHasSalesTarget(false))
                .finally(() => setCheckingSalesTarget(false));
        }
    }, [profile]);

    // ── Load salary slips ──
    useEffect(() => {
        if (profile) {
            axios.get(`${baseUrl}/my-salary-slips`, { withCredentials: true })
                .then((res) => setSalarySlips(res.data))
                .catch(() => {});
        }
    }, [profile]);

    // ── Check lead access ──
    useEffect(() => {
        if (!profile) return;
        axios.get(`${baseUrl}/leads/my-access`, { withCredentials: true })
            .then((res) => {
                setCanCreate(!!res.data.canCreate);
                setHasLeads(!!res.data.hasLeads);
            })
            .catch(() => { setCanCreate(false); setHasLeads(false); })
            .finally(() => setLeadAccessChecked(true));
    }, [profile]);

    // ── Fetch lead badge ──
    useEffect(() => {
        if (!showLeadTab) return;
        axios.get(`${baseUrl}/leads`, { withCredentials: true })
            .then((res) => {
                const pending = res.data.filter(l => l.status === "Pending").length;
                setLeadBadge(pending);
            })
            .catch(() => {});
    }, [showLeadTab]);

    // ── Fetch chat unread count ──
    const fetchChatUnread = useCallback(async () => {
        if (!visibleSections.includes("chat")) return;
        try {
            const r = await axios.get(`${baseUrl}/chat/rooms`, { withCredentials: true });
            const total = r.data.reduce((s, rm) => s + (rm.unread_count || 0), 0);
            setChatUnread(total);
        } catch {}
    }, [visibleSections]);

    useEffect(() => {
        fetchChatUnread();
        const interval = setInterval(fetchChatUnread, 30000);
        return () => clearInterval(interval);
    }, [fetchChatUnread]);

    // ── Fallback: revoked tab ──
    useEffect(() => {
        if (leadAccessChecked && activeTab === "leads" && !showLeadTab) setActiveTab("overview");
    }, [leadAccessChecked, activeTab, showLeadTab]);

    useEffect(() => {
        if (activeTab === "chat" && !visibleSections.includes("chat")) setActiveTab("overview");
    }, [activeTab, visibleSections]);

    const isMISExecutive = profile?.role?.toLowerCase().includes("mis-execuitve") ||
        profile?.role?.toLowerCase() === "mis-execuitve";

    const canSeeSection = (key) => visibleSections.includes(key);

    // ── Profile edit ──
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

    return (
        <div style={styles.shell}>
            <Toast toast={toast} />

            {/* ── SIDEBAR ─────────────────────────────────── */}
            <aside style={{ ...styles.sidebar, ...(sidebarOpen ? {} : styles.sidebarCollapsed) }}>
                {/* Logo */}
                <div style={styles.sidebarTop}>
                    <div style={styles.logoRow}>
                        <img src="/logo512.png" alt="Logo" style={styles.logoImg} />
                        {sidebarOpen && (
                            <div>
                                <div style={styles.logoName}>VJC Overseas</div>
                                <div style={styles.logoSub}>HRM Portal</div>
                            </div>
                        )}
                    </div>

                    {/* Profile mini card */}
                    {sidebarOpen && (
                        <div style={styles.profileMini}>
                            <div style={{ position: "relative" }}>
                                <img
                                    src={localProfileImage || (profile?.image ? `${baseUrl}${profile.image}` : "https://placehold.co/64x64?text=Me")}
                                    alt="avatar"
                                    style={styles.profileMiniImg}
                                />
                                {editMode && (
                                    <label htmlFor="profile-upload" style={styles.profileMiniEdit}>📷</label>
                                )}
                                <input id="profile-upload" type="file" accept="image/*" style={{ display: "none" }}
                                    onChange={(e) => {
                                        setImageFile(e.target.files[0]);
                                        if (e.target.files[0]) setLocalProfileImage(URL.createObjectURL(e.target.files[0]));
                                    }} disabled={!editMode} />
                            </div>

                            {!editMode ? (
                                <>
                                    <div style={styles.profileMiniName}>{profile?.name || "Loading..."}</div>
                                    <div style={styles.profileMiniRole}>{profile?.role || "Employee"}</div>
                                    <div style={styles.profileMiniBtns}>
                                        <button style={styles.miniBtn} onClick={() => { setEditName(profile?.name || ""); setEditMode(true); }}>
                                            ✏️ Edit
                                        </button>
                                        <button style={{ ...styles.miniBtn, color: "#10b981", borderColor: "#10b981" }}
                                            onClick={() => setShowPasswordModal(true)}>
                                            🔐 Password
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        style={styles.editInput}
                                        placeholder="Your name"
                                    />
                                    <div style={styles.profileMiniBtns}>
                                        <button style={{ ...styles.miniBtn, background: "#6366f1", color: "#fff", borderColor: "#6366f1" }}
                                            onClick={handleSaveProfile}>💾 Save</button>
                                        <button style={styles.miniBtn} onClick={() => setEditMode(false)}>✕ Cancel</button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <nav style={styles.nav}>
                    {sidebarOpen && <div style={styles.navSectionLabel}>Main</div>}

                    {/* Overview — always visible */}
                    <NavItem icon="◻" label="Overview" tabKey="overview" activeTab={activeTab} setActiveTab={handleTabChange} />

                    {/* Sections controlled by chairman */}
                    {canSeeSection("attendance") && (
                        <NavItem icon="🕒" label="Attendance" tabKey="attendance" activeTab={activeTab} setActiveTab={handleTabChange} />
                    )}
                    {canSeeSection("leave") && (
                        <NavItem icon="📅" label="Leave" tabKey="leave" activeTab={activeTab} setActiveTab={handleTabChange} />
                    )}
                    {canSeeSection("salary") && (
                        <NavItem icon="💰" label="Salary & Payroll" tabKey="salary" activeTab={activeTab} setActiveTab={handleTabChange} />
                    )}
                    {canSeeSection("chat") && (
                        <NavItem
                            icon="💬" label="Team Chat" tabKey="chat" activeTab={activeTab}
                            setActiveTab={handleTabChange}
                            badge={chatUnread > 0 ? chatUnread : null}
                        />
                    )}
                    {canSeeSection("leads") && showLeadTab && (
                        <NavItem
                            icon="🎯" label="My Leads" tabKey="leads" activeTab={activeTab}
                            setActiveTab={handleTabChange}
                            badge={leadBadge > 0 ? leadBadge : null}
                        />
                    )}
                    {canSeeSection("sales") && hasSalesTarget && !checkingSalesTarget && (
                        <NavItem icon="📈" label="Sales Stats" tabKey="sales" activeTab={activeTab} setActiveTab={handleTabChange} />
                    )}

                    {/* MIS Executive extras */}
                    {(canSeeSection("chatlogs") || isMISExecutive) && (
                        <>
                            {sidebarOpen && <div style={{ ...styles.navSectionLabel, marginTop: 16 }}>MIS Executive</div>}
                            <NavItem icon="💬" label="Chat Logs" tabKey="chatlogs" activeTab={activeTab} setActiveTab={handleTabChange} />
                        </>
                    )}
                    {(canSeeSection("fulldata") || isMISExecutive) && (
                        <NavItem icon="📊" label="Full Data" tabKey="fulldata" activeTab={activeTab} setActiveTab={handleTabChange} />
                    )}
                </nav>

                {/* Footer actions */}
                <div style={styles.sidebarFooter}>
                    <button style={styles.footerBtn} onClick={() => setShowInstructions(true)}>
                        📋 {sidebarOpen && "Instructions"}
                    </button>
                    {profile?.role === "manager" && (
                        <button style={styles.footerBtn} onClick={() => window.location.href = "/manager-dashboard"}>
                            👔 {sidebarOpen && "Manager Dashboard"}
                        </button>
                    )}
                    <button style={{ ...styles.footerBtn, color: "#ef4444" }}
                        onClick={() => axios.get(`${baseUrl}/logout`, { withCredentials: true }).then(() => window.location.href = "/")}>
                        🚪 {sidebarOpen && "Logout"}
                    </button>
                </div>
            </aside>

            {/* ── MAIN ─────────────────────────────────────── */}
            <div style={styles.main}>

                {/* Top bar */}
                <header style={styles.topbar}>
                    <button style={styles.collapseBtn} onClick={() => setSidebarOpen(o => !o)}
                        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
                        {sidebarOpen ? "◀" : "▶"}
                    </button>
                    <span style={styles.pageTitle}>{pageTitles[activeTab] || "Dashboard"}</span>
                    <div style={styles.topbarRight}>
                        {chatUnread > 0 && activeTab !== "chat" && canSeeSection("chat") && (
                            <button
                                onClick={() => handleTabChange("chat")}
                                style={{ ...styles.chatPill }}>
                                💬 {chatUnread} new
                            </button>
                        )}
                        <UserAvatarMenu name={profile?.name || "User"} role={profile?.role || "employee"} />
                    </div>
                </header>

                {/* Content area */}
                <main style={styles.content}>

                    {/* ── OVERVIEW TAB ── */}
                    {activeTab === "overview" && (
                        <div>
                            <div style={styles.welcomeBanner}>
                                <div>
                                    <h2 style={styles.welcomeTitle}>Welcome back, {profile?.name?.split(" ")[0] || "there"} 👋</h2>
                                    <p style={styles.welcomeSub}>Here's your snapshot for today.</p>
                                </div>
                            </div>

                            {/* Quick info cards */}
                            <div style={styles.infoStrip}>
                                {[
                                    { icon: "📧", label: "Email",       val: profile?.email      || "—" },
                                    { icon: "💼", label: "Department",  val: profile?.department || "N/A" },
                                    { icon: "📍", label: "Location",    val: profile?.location   || "N/A" },
                                    { icon: "🆔", label: "Employee ID", val: profile?.employeeId || profile?.id || "—" },
                                ].map(({ icon, label, val }) => (
                                    <div key={label} style={styles.infoChip}>
                                        <span style={styles.infoChipIcon}>{icon}</span>
                                        <div>
                                            <div style={styles.infoChipLabel}>{label}</div>
                                            <div style={styles.infoChipVal}>{val}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Quick action tiles based on what's visible */}
                            <div style={styles.quickGrid}>
                                {canSeeSection("attendance") && (
                                    <div style={styles.quickTile} onClick={() => handleTabChange("attendance")}>
                                        <span style={styles.quickTileIcon}>🕒</span>
                                        <span style={styles.quickTileLabel}>Attendance</span>
                                    </div>
                                )}
                                {canSeeSection("leave") && (
                                    <div style={styles.quickTile} onClick={() => handleTabChange("leave")}>
                                        <span style={styles.quickTileIcon}>📅</span>
                                        <span style={styles.quickTileLabel}>Apply Leave</span>
                                    </div>
                                )}
                                {canSeeSection("salary") && (
                                    <div style={styles.quickTile} onClick={() => handleTabChange("salary")}>
                                        <span style={styles.quickTileIcon}>💰</span>
                                        <span style={styles.quickTileLabel}>Salary</span>
                                    </div>
                                )}
                                {canSeeSection("chat") && (
                                    <div style={{ ...styles.quickTile, position: "relative" }} onClick={() => handleTabChange("chat")}>
                                        <span style={styles.quickTileIcon}>💬</span>
                                        <span style={styles.quickTileLabel}>Team Chat</span>
                                        {chatUnread > 0 && (
                                            <span style={styles.quickTileBadge}>{chatUnread}</span>
                                        )}
                                    </div>
                                )}
                                {canSeeSection("leads") && showLeadTab && (
                                    <div style={styles.quickTile} onClick={() => handleTabChange("leads")}>
                                        <span style={styles.quickTileIcon}>🎯</span>
                                        <span style={styles.quickTileLabel}>My Leads</span>
                                    </div>
                                )}
                            </div>

                            {/* Attendance analytics */}
                            <div style={styles.sectionCard}>
                                <AttendanceAnalytics />
                            </div>
                        </div>
                    )}

                    {/* ── ATTENDANCE TAB ── */}
                    {activeTab === "attendance" && canSeeSection("attendance") && (
                        <div style={styles.sectionCard}><AttendanceDashboard /></div>
                    )}

                    {/* ── LEAVE TAB ── */}
                    {activeTab === "leave" && canSeeSection("leave") && (
                        <div style={styles.sectionCard}>
                            <LeaveApplication onMessage={(msg) => showToast(msg, "info")} />
                        </div>
                    )}

                    {/* ── SALARY TAB ── */}
                    {activeTab === "salary" && canSeeSection("salary") && (
                        <>
                            <div style={styles.sectionCard}><SalarySlips salarySlips={salarySlips} /></div>
                            <div style={{ ...styles.sectionCard, marginTop: 20 }}><PayrollSlip /></div>
                        </>
                    )}

                    {/* ── TEAM CHAT TAB ── */}
                    {activeTab === "chat" && canSeeSection("chat") && (
                        <div style={{ ...styles.sectionCard, padding: 0, overflow: "hidden", height: "calc(100vh - 130px)" }}>
                            <ChatSystem
                                currentUser={{ id: profile?.id, name: profile?.name }}
                                isChairman={false}
                            />
                        </div>
                    )}

                    {/* ── MY LEADS TAB ── */}
                    {activeTab === "leads" && canSeeSection("leads") && showLeadTab && (
                        <div style={styles.sectionCard}>
                            <LeadManagement isChairman={false} />
                        </div>
                    )}

                    {/* ── SALES TAB ── */}
                    {activeTab === "sales" && canSeeSection("sales") && hasSalesTarget && (
                        <div style={styles.sectionCard}>
                            <SalesStats employeeEmail={profile?.email} isChairman={false} />
                        </div>
                    )}

                    {/* ── CHAT LOGS TAB ── */}
                    {activeTab === "chatlogs" && (canSeeSection("chatlogs") || isMISExecutive) && (
                        <div style={styles.sectionCard}><AttendanceChatLogs /></div>
                    )}

                    {/* ── FULL DATA TAB ── */}
                    {activeTab === "fulldata" && (canSeeSection("fulldata") || isMISExecutive) && (
                        <div style={styles.sectionCard}><Fulldata /></div>
                    )}

                    {/* ── ACCESS DENIED ── (tab exists but section hidden) */}
                    {activeTab !== "overview" && activeTab !== "chatlogs" && activeTab !== "fulldata" &&
                     !canSeeSection(activeTab) && (
                        <div style={styles.sectionCard}>
                            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                                <div style={{ fontSize: 16, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Access Restricted</div>
                                <div style={{ fontSize: 13 }}>This section has not been enabled for your account. Contact your administrator.</div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ── INSTRUCTIONS MODAL ── */}
            {showInstructions && (
                <div style={styles.overlay} onClick={() => setShowInstructions(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>📋 Dashboard Instructions</h3>
                            <button style={styles.modalClose} onClick={() => setShowInstructions(false)}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            {[
                                { title: "🎯 Overview",       text: "View your profile summary, employee ID, role, department, and attendance analytics at a glance." },
                                canSeeSection("attendance") && { title: "🕒 Attendance",   text: "Mark daily attendance and view history. Office hours start at 10:00 AM. After 10:15 AM is late." },
                                canSeeSection("leave")      && { title: "📅 Leave",        text: "Apply for leave and check history. Use earned leave for paid leaves. Unapproved leave = full-day absence." },
                                canSeeSection("salary")     && { title: "💰 Salary",       text: "View salary slips, download payroll documents, and track payment history." },
                                canSeeSection("chat")       && { title: "💬 Team Chat",    text: "Message your team in department channels, group chats, or direct messages. Like Microsoft Teams inside your HRM." },
                                showLeadTab && canSeeSection("leads") && { title: "🎯 My Leads",   text: "Leads assigned to you appear here. You have 45 minutes to call each lead after it is assigned." },
                                hasSalesTarget && canSeeSection("sales") && { title: "📈 Sales Stats", text: "Track your sales performance, add entries, view targets and achievement %." },
                                isMISExecutive && { title: "💬 Chat Logs",  text: "Access attendance-related chat logs. Available for MIS Executive role." },
                            ].filter(Boolean).map(({ title, text }) => (
                                <div key={title} style={styles.instructionBlock}>
                                    <h4 style={styles.instructionTitle}>{title}</h4>
                                    <p style={styles.instructionText}>{text}</p>
                                </div>
                            ))}
                            <div style={styles.instructionBlock}>
                                <h4 style={styles.instructionTitle}>⚠️ Important Rules</h4>
                                <ul style={styles.instructionList}>
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
                <div style={styles.overlay} onClick={() => setShowPasswordModal(false)}>
                    <div style={{ ...styles.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>🔐 Change Password</h3>
                            <button style={styles.modalClose} onClick={() => setShowPasswordModal(false)}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <label style={styles.fieldLabel}>New Password</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                style={styles.fieldInput} placeholder="Enter new password" autoComplete="new-password" />
                            <label style={{ ...styles.fieldLabel, marginTop: 16 }}>Confirm Password</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                style={styles.fieldInput} placeholder="Confirm new password" autoComplete="new-password" />
                            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                                <button style={styles.btnPrimary} onClick={handleChangePassword}>💾 Update Password</button>
                                <button style={styles.btnSecondary} onClick={() => { setShowPasswordModal(false); setNewPassword(""); setConfirmPassword(""); }}>
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

// ─── Styles ─────────────────────────────────────────────────────────
const SIDEBAR_W = 240;
const SIDEBAR_COLLAPSED_W = 64;
const TOPBAR_H = 56;
const ACCENT = "#6366f1";

const styles = {
    shell: { display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", backgroundColor: "#f1f5f9" },
    sidebar: { width: SIDEBAR_W, flexShrink: 0, backgroundColor: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", transition: "width 0.25s cubic-bezier(.4,0,.2,1)", overflow: "hidden", zIndex: 100 },
    sidebarCollapsed: { width: SIDEBAR_COLLAPSED_W },
    sidebarTop: { padding: "20px 12px 12px", flexShrink: 0 },
    logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, overflow: "hidden" },
    logoImg: { width: 36, height: 36, borderRadius: 8, flexShrink: 0 },
    logoName: { fontSize: 13, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" },
    logoSub: { fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" },
    profileMini: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 12px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" },
    profileMiniImg: { width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: "3px solid #e0e7ff" },
    profileMiniEdit: { position: "absolute", bottom: 0, right: 0, width: 22, height: 22, background: ACCENT, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer", border: "2px solid #fff" },
    profileMiniName: { fontSize: 14, fontWeight: 700, color: "#1e293b", textAlign: "center" },
    profileMiniRole: { fontSize: 11, color: "#64748b", background: "#ede9fe", padding: "2px 10px", borderRadius: 20 },
    profileMiniBtns: { display: "flex", gap: 6, marginTop: 4, width: "100%" },
    miniBtn: { flex: 1, fontSize: 11, fontWeight: 600, padding: "5px 0", background: "transparent", border: `1px solid ${ACCENT}`, borderRadius: 7, color: ACCENT, cursor: "pointer" },
    editInput: { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", boxSizing: "border-box" },
    nav: { flex: 1, overflowY: "auto", padding: "4px 8px" },
    navSectionLabel: { fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", padding: "10px 8px 4px" },
    navItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 10px", borderRadius: 9, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#64748b", textAlign: "left", marginBottom: 2, transition: "background 0.15s, color 0.15s" },
    navItemActive: { background: "#ede9fe", color: "#5b21b6", fontWeight: 700 },
    navIcon: { fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 },
    navLabel: { flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    navBadge: { background: "#ef4444", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 700 },
    sidebarFooter: { padding: "12px 8px", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 4 },
    footerBtn: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, color: "#64748b", background: "transparent", border: "none", borderRadius: 8, padding: "8px 10px", cursor: "pointer", textAlign: "left", whiteSpace: "nowrap", overflow: "hidden" },
    main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
    topbar: { height: TOPBAR_H, flexShrink: 0, backgroundColor: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, zIndex: 50 },
    collapseBtn: { background: "transparent", border: "none", fontSize: 14, color: "#94a3b8", cursor: "pointer", padding: "4px 8px", borderRadius: 6 },
    pageTitle: { flex: 1, fontSize: 16, fontWeight: 700, color: "#1e293b" },
    topbarRight: { display: "flex", alignItems: "center", gap: 12 },
    chatPill: { background: "#eef2ff", border: "1px solid #c7d2fe", color: "#6366f1", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer" },
    avatarCircle: { width: 36, height: 36, borderRadius: "50%", background: ACCENT, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, cursor: "pointer" },
    avatarDropdown: { position: "absolute", top: "calc(100% + 10px)", right: 0, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 200, overflow: "hidden", zIndex: 200 },
    avatarDropdownHeader: { padding: "16px 18px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" },
    avatarDropdownItem: { padding: "12px 18px", fontSize: 13, color: "#334155", cursor: "pointer", fontWeight: 500 },
    content: { flex: 1, overflowY: "auto", padding: 28 },
    welcomeBanner: { background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", borderRadius: 16, padding: "28px 32px", color: "#fff", marginBottom: 20 },
    welcomeTitle: { fontSize: 22, fontWeight: 800, margin: 0 },
    welcomeSub: { fontSize: 14, opacity: 0.88, margin: "6px 0 0" },
    infoStrip: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 },
    infoChip: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 },
    infoChipIcon: { fontSize: 22, width: 40, height: 40, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    infoChipLabel: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 },
    infoChipVal: { fontSize: 13, fontWeight: 600, color: "#1e293b", wordBreak: "break-word" },
    quickGrid: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 },
    quickTile: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 22px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, cursor: "pointer", minWidth: 90, transition: "all 0.15s" },
    quickTileIcon: { fontSize: 26 },
    quickTileLabel: { fontSize: 11, fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" },
    quickTileBadge: { position: "absolute", top: 8, right: 8, background: "#ef4444", color: "#fff", fontSize: 10, padding: "1px 5px", borderRadius: 10, fontWeight: 700 },
    sectionCard: { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24, minHeight: 200 },
    toast: { position: "fixed", top: 20, right: 24, color: "#fff", fontWeight: 600, fontSize: 13, padding: "12px 22px", borderRadius: 12, zIndex: 9999, boxShadow: "0 6px 20px rgba(0,0,0,0.18)" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5000, padding: 20 },
    modal: { background: "#fff", borderRadius: 20, maxWidth: 680, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" },
    modalHeader: { padding: "24px 28px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "20px 20px 0 0" },
    modalTitle: { fontSize: 18, fontWeight: 700, margin: 0 },
    modalClose: { background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 22, width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    modalBody: { padding: "28px" },
    instructionBlock: { marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid #f1f5f9" },
    instructionTitle: { fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6 },
    instructionText: { fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 },
    instructionList: { margin: "8px 0 0", paddingLeft: 18, color: "#64748b", fontSize: 13, lineHeight: 1.9 },
    fieldLabel: { display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 },
    fieldInput: { width: "100%", padding: "11px 14px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 10, outline: "none", boxSizing: "border-box" },
    btnPrimary: { flex: 1, padding: "12px 20px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
    btnSecondary: { flex: 1, padding: "12px 20px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
};

export default EmployeeDashboard;