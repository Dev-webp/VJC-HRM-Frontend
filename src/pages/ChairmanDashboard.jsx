/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Fulldata from "./Fulldata";
import SalaryUpload from "./SalarySlipUpload";
import Markabsent from "./Markabsent";
import Payroll from "./Payroll";
import AttendanceChatLogs from "./AttendanceChatLogs";
import LeaveRequestsSection from "./LeaveRequestsSection";
import CreateUser from "./CreateUser";
import ShowAllUsers from "./ShowAllUsers";
import Offerletter from "./Offerletter";
import Chairmanautosalaryslips from "./Chairmanautosalaryslips";
import SalesManagement from "./SalesManagement";
import LeadManagement from "./LeadManagement";
import ChatSystem from "./ChatSystem";
import ChairmanAccessPanel from "./ChairmanAccessPanel";
import ResumeUsageDashboard from "./ResumeUsageDashboard";
const BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

const SECTIONS = [
  {
    title: null,
    items: [{ id: "DASHBOARD", label: "Executive Dashboard", emoji: "🏛️" }],
  },
  {
    title: "People Management",
    items: [
      { id: "SHOW_USERS",     label: "All Employees",  emoji: "👥" },
      { id: "CREATE_USER",    label: "Add Employee",   emoji: "👤" },
      { id: "OFFER_LETTER",   label: "Offer Letters",  emoji: "✉️" },
      { id: "LEAVE_REQUESTS", label: "Leave Requests", emoji: "📝", badge: true },
    ],
  },
  {
    title: "Finance Control",
    items: [
      { id: "PAYROLL",           label: "Payroll",      emoji: "💰" },
      { id: "SALARY_UPLOAD",     label: "Upload Slips", emoji: "📤" },
      { id: "AUTO_SALARY_SLIPS", label: "Auto Slips",   emoji: "🤖" },
      { id: "SALES_MANAGEMENT",  label: "Sales",        emoji: "📈" },
    ],
  },
  {
    title: "Admin Tools",
    items: [
      { id: "MARK_ABSENT",      label: "Holiday Planner",  emoji: "📅" },
      { id: "LEAD_MANAGEMENT",  label: "Lead Management",  emoji: "🎯" },
      { id: "CHAT",             label: "Team Chat",        emoji: "💬", chatBadge: true },
      { id: "ACCESS_PANEL",     label: "Access Control",   emoji: "🔐" },
      { id: "RESUME_USAGE",     label: "Resume Usage",     emoji: "📄" },
    ],
  },
];

export default function ChairmanDashboard() {
  const [tab, setTab]               = useState("DASHBOARD");
  const [leaves, setLeaves]         = useState([]);
  const [toast, setToast]           = useState(null);
  const [live, setLive]             = useState(false);
  const [now, setNow]               = useState(new Date());
  const [collapsed, setCollapsed]   = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [profile, setProfile]       = useState({ id: null, name: "Dr. V. Mani" });

  const socketRef = useRef(null);
  const audioRef  = useRef(null);
  const soundTs   = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default")
      Notification.requestPermission();
  }, []);

  useEffect(() => {
    axios.get(`${BASE}/me`, { withCredentials: true })
      .then(r => setProfile({ id: r.data.id, name: r.data.name || "Dr. V. Mani" }))
      .catch(() => {});
  }, []);

  const fetchChatUnread = useCallback(async () => {
    try {
      const r = await axios.get(`${BASE}/chat/rooms`, { withCredentials: true });
      const total = r.data.reduce((s, rm) => s + (rm.unread_count || 0), 0);
      setChatUnread(total);
    } catch {}
  }, []);

  useEffect(() => {
    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchChatUnread]);

  const fetchLeaves = useCallback(async () => {
    try {
      const r = await axios.get(`${BASE}/all-leave-requests`, { withCredentials: true });
      setLeaves(r.data.map((x) => ({ ...x, remarksInput: "" })));
    } catch (e) { console.error(e); }
  }, []);

  const showToast = useCallback((data) => {
    const t = Date.now();
    if (t - soundTs.current > 3000 && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      soundTs.current = t;
    }
    setToast(`New leave request from ${data.employee_name || "Employee"}`);
    setTimeout(() => setToast(null), 5000);
  }, []);

  const showDesktopNotif = useCallback((data) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const notif = new Notification("New Leave Request", {
        body: `${data.employee_name || "Employee"} requests leave`,
        icon: "/logo192.png",
        tag: "leave-request",
      });
      setTimeout(() => notif.close(), 8000);
      notif.onclick = () => { window.focus(); setTab("LEAVE_REQUESTS"); notif.close(); };
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
    const socket = io(BASE, {
      path: "/socket.io/",
      transports: ["polling", "websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;
    socket.on("connect",          () => setLive(true));
    socket.on("disconnect",       () => setLive(false));
    socket.on("newLeaveRequest",  (data) => { showToast(data); showDesktopNotif(data); fetchLeaves(); });
    socket.on("leaveActionTaken", fetchLeaves);
    socket.on("new_message",      () => {
      setChatUnread(prev => tab !== "CHAT" ? prev + 1 : prev);
    });
    return () => socket.disconnect();
  }, [fetchLeaves, showToast, showDesktopNotif]);

  const pending = useMemo(
    () => leaves.filter((r) => (r.status || "").toLowerCase() === "pending").length,
    [leaves]
  );

  const greeting = now.getHours() < 12 ? "Good Morning" : now.getHours() < 17 ? "Good Afternoon" : "Good Evening";
  const activeItem = SECTIONS.flatMap((s) => s.items).find((i) => i.id === tab);

  const handleTabChange = (id) => {
    setTab(id);
    if (id === "CHAT") setChatUnread(0);
  };

  const isChat = tab === "CHAT";

  return (
    <>
      <style>{CSS}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:wght@600;700&display=swap"
        rel="stylesheet"
      />
      <audio ref={audioRef} src="/new-request.mp3" preload="auto" />

      {toast && (
        <div className="toast-notif">
          <span className="toast-icon">🔔</span>
          <span>{toast}</span>
        </div>
      )}

      <div className={`shell ${collapsed ? "shell--col" : ""}`}>

        {/* ═══════════ SIDEBAR ═══════════ */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-logo">
              <img src="/logo192.png" alt="VJC" className="brand-img" />
            </div>
            {!collapsed && (
              <div className="brand-text">
                <div className="brand-name">VJC Overseas</div>
                <div className="brand-sub">Chairman Portal</div>
              </div>
            )}
            <button className="toggle-btn" onClick={() => setCollapsed(c => !c)}>
              {collapsed ? "»" : "«"}
            </button>
          </div>

          {!collapsed && (
            <div className="status-strip">
              <span className={`s-dot ${live ? "s-dot--live" : "s-dot--off"}`} />
              <span className="s-txt">{live ? "Connected" : "Offline"}</span>
              <span className="s-time">
                {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}

          <nav className="nav">
            {SECTIONS.map((sec, si) => (
              <div key={si} className="nav-group">
                {sec.title && !collapsed && (
                  <div className="nav-section-title">{sec.title}</div>
                )}
                {sec.items.map((item) => {
                  const badgeVal = item.badge ? pending : item.chatBadge ? chatUnread : 0;
                  return (
                    <button
                      key={item.id}
                      className={`nav-item ${tab === item.id ? "nav-item--active" : ""}`}
                      onClick={() => handleTabChange(item.id)}
                      title={collapsed ? item.label : ""}
                    >
                      <span className="ni-emoji">{item.emoji}</span>
                      {!collapsed && <span className="ni-label">{item.label}</span>}
                      {badgeVal > 0 && <span className="ni-badge">{badgeVal}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sb-foot">
            <div className="foot-ava">VM</div>
            {!collapsed && (
              <div className="foot-info">
                <div className="foot-name">Dr. V. Mani</div>
                <div className="foot-role">Chairman & CEO</div>
              </div>
            )}
          </div>
        </aside>

        {/* ═══════════ MAIN BODY ═══════════ */}
        <div className="main-body">

          {/* Topbar */}
          <header className="topbar">
            <div className="tb-left">
              <span className="tb-indicator" />
              <span className="tb-title">{activeItem?.label || "Dashboard"}</span>
            </div>
            <div className="tb-right">
              {pending > 0 && (
                <button className="pending-pill" onClick={() => handleTabChange("LEAVE_REQUESTS")}>
                  🔴 {pending} Pending Leaves
                </button>
              )}
              {chatUnread > 0 && tab !== "CHAT" && (
                <button className="pending-pill chat-pill" onClick={() => handleTabChange("CHAT")}>
                  💬 {chatUnread} New Messages
                </button>
              )}
              <span className="tb-greet">{greeting}, Dr. Mani</span>
              <span className="tb-date">
                {now.toLocaleDateString("en-IN", {
                  weekday: "short", day: "numeric", month: "short", year: "numeric",
                })}
              </span>
            </div>
          </header>

          {/* Content area */}
          <main className={`content ${isChat ? "content--chat" : ""}`}>

            {tab === "DASHBOARD" && (
              <div className="dash">
                {/* Hero */}
                <div className="hero">
                  <div className="hero-left">
                    <div className="hero-eyebrow">Executive Overview</div>
                    <h1 className="hero-title">Welcome Back, Dr. Mani 👋</h1>
                    <p className="hero-sub">
                      {pending > 0
                        ? `You have ${pending} leave request${pending > 1 ? "s" : ""} awaiting your review.`
                        : "All systems running smoothly. Have a great day."}
                    </p>
                    {pending > 0 && (
                      <button className="hero-btn" onClick={() => handleTabChange("LEAVE_REQUESTS")}>
                        Review Now →
                      </button>
                    )}
                  </div>
                  <div className="hero-stats">
                    <div className="hstat">
                      <div className="hstat-val">{pending}</div>
                      <div className="hstat-lbl">Pending Leaves</div>
                    </div>
                    <div className="hstat-sep" />
                    <div className="hstat">
                      <div className="hstat-val">{chatUnread}</div>
                      <div className="hstat-lbl">Unread Msgs</div>
                    </div>
                    <div className="hstat-sep" />
                    <div className="hstat">
                      <div className={`hstat-val ${live ? "c-green" : "c-red"}`}>●</div>
                      <div className="hstat-lbl">{live ? "Live" : "Offline"}</div>
                    </div>
                    <div className="hstat-sep" />
                    <div className="hstat">
                      <div className="hstat-val hstat-sm">
                        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="hstat-lbl">Local Time</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="section-head">Quick Actions</div>
                <div className="quick-row">
                  {[
                    { id: "SHOW_USERS",      label: "All Employees",  emoji: "👥", color: "#2563eb" },
                    { id: "LEAVE_REQUESTS",  label: "Leave Requests", emoji: "📝", color: "#f59e0b", count: pending },
                    { id: "PAYROLL",         label: "Payroll",        emoji: "💰", color: "#10b981" },
                    { id: "LEAD_MANAGEMENT", label: "Lead Mgmt",      emoji: "🎯", color: "#8b5cf6" },
                    { id: "CHAT",            label: "Team Chat",      emoji: "💬", color: "#6366f1", count: chatUnread },
                    { id: "ACCESS_PANEL",    label: "Access Control", emoji: "🔐", color: "#0891b2" },
                  ].map((q) => (
                    <button key={q.id} className="qcard" onClick={() => handleTabChange(q.id)} style={{ "--qc": q.color }}>
                      <div className="qcard-head">
                        <span className="qcard-emoji">{q.emoji}</span>
                        {q.count > 0 && <span className="qcard-badge">{q.count}</span>}
                      </div>
                      <div className="qcard-label">{q.label}</div>
                      <div className="qcard-arrow">→</div>
                    </button>
                  ))}
                </div>

                <div className="section-head">📊 Recent Attendance Logs</div>
                <div className="panel"><AttendanceChatLogs /></div>

                <div className="section-head">📁 Full Employee Data</div>
                <div className="panel"><Fulldata /></div>
              </div>
            )}

            {/* CHAT: fills content area perfectly */}
            {tab === "CHAT" && (
              <div className="chat-container">
                <ChatSystem
                  currentUser={{ id: profile.id, name: profile.name }}
                  isChairman={true}
                />
              </div>
            )}

            {/* All other tabs */}
            {tab !== "DASHBOARD" && tab !== "CHAT" && (
              <div className="page-wrap">
                {tab === "SHOW_USERS"        && <ShowAllUsers />}
                {tab === "CREATE_USER"       && <CreateUser />}
                {tab === "OFFER_LETTER"      && <Offerletter />}
                {tab === "RESUME_USAGE"      && <ResumeUsageDashboard />}
                {tab === "SALES_MANAGEMENT"  && <SalesManagement />}
                {tab === "PAYROLL"           && <Payroll />}
                {tab === "SALARY_UPLOAD"     && <SalaryUpload />}
                {tab === "MARK_ABSENT"       && <Markabsent />}
                {tab === "AUTO_SALARY_SLIPS" && <Chairmanautosalaryslips />}
                {tab === "LEAD_MANAGEMENT"   && <LeadManagement isChairman={true} />}
                {tab === "LEAVE_REQUESTS"    && (
                  <LeaveRequestsSection leaveRequests={leaves} onRefresh={fetchLeaves} />
                )}
                {tab === "ACCESS_PANEL" && (
                  <ChairmanAccessPanel currentUser={{ id: profile.id, name: profile.name }} />
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════
   STYLES
════════════════════════════════════════════ */
const CSS = `
  :root {
    --sb-w:   250px;
    --sb-col:  66px;
    --tb-h:    62px;
    --white:   #ffffff;
    --bg:      #f1f5fb;
    --border:  #e2e8f0;
    --navy:    #1e3a8a;
    --blue:    #2563eb;
    --orange:  #f97316;
    --text:    #0f172a;
    --text2:   #475569;
    --text3:   #94a3b8;
    --green:   #16a34a;
    --red:     #dc2626;
    --radius:  14px;
    --shadow:  0 2px 10px rgba(0,0,0,0.07);
    --shadowL: 0 8px 30px rgba(0,0,0,0.1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ✅ FIX: pin html/body/root to viewport, no overflow */
  html, body, #root {
    height: 100%;
    overflow: hidden;
  }

  body {
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
  }

  /* ── Shell: full viewport flex row ── */
  .shell {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: var(--sb-w);
    min-width: var(--sb-w);
    height: 100vh;
    background: var(--navy);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    transition: width .26s cubic-bezier(.4,0,.2,1), min-width .26s cubic-bezier(.4,0,.2,1);
    overflow: hidden;
    position: relative;
    z-index: 20;
    box-shadow: 2px 0 12px rgba(0,0,0,0.1);
  }
  .shell--col .sidebar { width: var(--sb-col); min-width: var(--sb-col); }

  .brand {
    display: flex; align-items: center; gap: 10px; padding: 18px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; min-height: 68px;
  }
  .brand-logo {
    width: 36px; height: 36px; border-radius: 9px; background: rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .brand-img { width: 26px; height: 26px; border-radius: 5px; }
  .brand-text { flex: 1; overflow: hidden; }
  .brand-name { font-family: 'Lora', serif; font-size: 15px; font-weight: 700; color: #fff; white-space: nowrap; }
  .brand-sub { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-top: 2px; }
  .toggle-btn {
    width: 26px; height: 26px; border: 1px solid rgba(255,255,255,0.18); border-radius: 7px;
    background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.65); cursor: pointer;
    font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: .2s;
  }
  .toggle-btn:hover { background: rgba(255,255,255,0.18); color: #fff; }

  .status-strip {
    display: flex; align-items: center; gap: 7px; padding: 8px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
  }
  .s-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .s-dot--live { background: #4ade80; box-shadow: 0 0 6px #4ade80; animation: blink 2s infinite; }
  .s-dot--off  { background: #f87171; }
  .s-txt  { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.55); }
  .s-time { font-size: 11px; color: rgba(255,255,255,0.3); margin-left: auto; font-variant-numeric: tabular-nums; }

  .nav { flex: 1; padding: 10px 8px; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
  .nav::-webkit-scrollbar { display: none; }
  .nav-group { margin-bottom: 4px; }
  .nav-section-title {
    font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
    color: rgba(255,255,255,0.3); padding: 12px 10px 5px;
  }
  .nav-item {
    position: relative; display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 10px; border: none; border-radius: 10px; background: transparent;
    color: rgba(255,255,255,0.58); font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px; font-weight: 500; cursor: pointer; margin-bottom: 2px;
    transition: all .17s ease; text-align: left; white-space: nowrap; overflow: hidden;
  }
  .nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .nav-item--active { background: rgba(255,255,255,0.14); color: #fff; font-weight: 700; }
  .nav-item--active::after {
    content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 55%; background: var(--orange); border-radius: 4px 0 0 4px;
  }
  .ni-emoji { font-size: 16px; flex-shrink: 0; }
  .ni-label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
  .ni-badge {
    background: var(--orange); color: #fff; font-size: 10px; font-weight: 800;
    padding: 2px 7px; border-radius: 20px; flex-shrink: 0; margin-left: auto;
  }

  .sb-foot {
    padding: 12px 10px; border-top: 1px solid rgba(255,255,255,0.1);
    display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  }
  .foot-ava {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg,var(--orange),#ea580c);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0;
  }
  .foot-info { overflow: hidden; }
  .foot-name { font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap; }
  .foot-role { font-size: 10px; color: rgba(255,255,255,0.38); }

  /* ── Main body ── */
  /* ✅ KEY FIX: removed height:100vh, use min-height:0 instead */
  .main-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--bg);
  }

  /* ── Topbar ── */
  .topbar {
    height: var(--tb-h);
    padding: 0 26px;
    background: var(--white);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    gap: 16px;
    box-shadow: var(--shadow);
  }
  .tb-left { display: flex; align-items: center; gap: 10px; }
  .tb-indicator { width: 10px; height: 10px; border-radius: 50%; background: linear-gradient(135deg,var(--navy),var(--blue)); }
  .tb-title { font-family: 'Lora', serif; font-size: 20px; font-weight: 700; color: var(--text); }
  .tb-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .pending-pill {
    background: #fff7ed; border: 1px solid #fed7aa; color: var(--orange);
    padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
    cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: .2s; white-space: nowrap;
  }
  .pending-pill:hover { background: #ffedd5; }
  .chat-pill { border-color: #c7d2fe !important; color: #6366f1 !important; background: #eef2ff !important; }
  .chat-pill:hover { background: #e0e7ff !important; }
  .tb-greet { font-size: 13px; font-weight: 600; color: var(--text2); white-space: nowrap; }
  .tb-date {
    font-size: 12px; color: var(--text3); background: var(--bg);
    border: 1px solid var(--border); padding: 5px 12px; border-radius: 20px; white-space: nowrap;
  }

  /* ── Content area ── */
  /* Default: scrollable for dashboard/other tabs */
  .content {
    flex: 1;
    min-height: 0;      /* ✅ critical */
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px 26px;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  .content::-webkit-scrollbar { width: 5px; }
  .content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  /* ✅ Chat mode: NO scroll, NO padding — chat manages its own layout */
  .content--chat {
    overflow: hidden !important;
    padding: 0 !important;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* ✅ Chat container fills content area exactly */
  .chat-container {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Dashboard ── */
  .dash { display: flex; flex-direction: column; gap: 20px; width: 100%; }

  /* ── Hero ── */
  .hero {
    background: linear-gradient(118deg, var(--navy) 0%, var(--blue) 65%, #1d4ed8 100%);
    border-radius: var(--radius); padding: 30px 34px;
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 20px; flex-wrap: wrap; box-shadow: var(--shadowL); position: relative; overflow: hidden;
  }
  .hero::after {
    content: ''; position: absolute; top: -70px; right: -30px; width: 280px; height: 280px;
    background: radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%);
    border-radius: 50%; pointer-events: none;
  }
  .hero-left { flex: 1; min-width: 200px; position: relative; z-index: 1; }
  .hero-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 8px; }
  .hero-title { font-family: 'Lora', serif; font-size: clamp(20px, 2.4vw, 30px); font-weight: 700; color: #fff; line-height: 1.25; margin-bottom: 8px; }
  .hero-sub { font-size: 13px; color: rgba(255,255,255,0.72); max-width: 420px; line-height: 1.6; margin-bottom: 18px; }
  .hero-btn {
    background: var(--orange); color: #fff; border: none; padding: 10px 22px;
    border-radius: 10px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px;
    font-weight: 700; cursor: pointer; transition: .2s; box-shadow: 0 4px 14px rgba(249,115,22,.4);
  }
  .hero-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(249,115,22,.5); }

  .hero-stats {
    display: flex; align-items: center; background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.14); border-radius: 12px; padding: 14px 20px;
    flex-shrink: 0; position: relative; z-index: 1;
  }
  .hstat { text-align: center; padding: 0 14px; }
  .hstat-sep { width: 1px; height: 34px; background: rgba(255,255,255,0.18); }
  .hstat-val { font-family: 'Lora', serif; font-size: 24px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
  .hstat-sm  { font-size: 18px; }
  .c-green   { color: #4ade80; }
  .c-red     { color: #f87171; }
  .hstat-lbl { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }

  .section-head {
    font-size: 12px; font-weight: 700; color: var(--text2); text-transform: uppercase;
    letter-spacing: 1.2px; display: flex; align-items: center; gap: 8px;
  }
  .section-head::before { content: ''; width: 3px; height: 16px; background: var(--orange); border-radius: 3px; display: inline-block; }

  .quick-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
  @media (max-width: 1100px) { .quick-row { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 700px)  { .quick-row { grid-template-columns: repeat(2, 1fr); } }

  .qcard {
    background: var(--white); border: 1.5px solid var(--border); border-radius: var(--radius);
    padding: 16px 14px 12px; cursor: pointer; text-align: left;
    font-family: 'Plus Jakarta Sans', sans-serif; transition: all .2s ease; position: relative; overflow: hidden;
  }
  .qcard:hover { border-color: var(--qc); box-shadow: 0 6px 22px rgba(0,0,0,0.1); transform: translateY(-3px); }
  .qcard::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
    background: var(--qc); transform: scaleX(0); transition: .2s; transform-origin: left;
  }
  .qcard:hover::after { transform: scaleX(1); }
  .qcard-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .qcard-emoji { font-size: 26px; }
  .qcard-badge { background: var(--orange); color: #fff; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 20px; }
  .qcard-label { font-size: 13px; font-weight: 700; color: var(--text); }
  .qcard-arrow { font-size: 14px; color: var(--text3); margin-top: 5px; display: block; transition: .18s; }
  .qcard:hover .qcard-arrow { color: var(--qc); transform: translateX(4px); }

  .panel {
    background: var(--white); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 20px; width: 100%; box-shadow: var(--shadow); overflow: auto;
  }

  .page-wrap { width: 100%; }

  .toast-notif {
    position: fixed; top: 18px; right: 22px; display: flex; align-items: center; gap: 10px;
    background: #fff; border: 1px solid var(--border); border-left: 4px solid var(--orange);
    padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 600; color: var(--text);
    box-shadow: var(--shadowL); z-index: 9999; animation: slideIn .3s ease;
  }
  .toast-icon { font-size: 16px; }

  @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.3)} }
  @keyframes slideIn { from{transform:translateX(18px);opacity:0} to{transform:translateX(0);opacity:1} }
`;