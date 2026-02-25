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

const BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

const SECTIONS = [
  { title: null, items: [{ id: "DASHBOARD", label: "Executive Dashboard", emoji: "🏛️" }] },
  {
    title: "👥 People Management",
    items: [
      { id: "SHOW_USERS", label: "All Employees", emoji: "👥" },
      { id: "CREATE_USER", label: "Add Employee", emoji: "👤" },
      { id: "OFFER_LETTER", label: "Offer Letters", emoji: "✉️" },
      { id: "LEAVE_REQUESTS", label: "Leave Requests", emoji: "📝", badge: true },
    ],
  },
  {
    title: "💰 Finance Control",
    items: [
      { id: "PAYROLL", label: "Payroll", emoji: "💰" },
      { id: "SALARY_UPLOAD", label: "Upload Slips", emoji: "📤" },
      { id: "AUTO_SALARY_SLIPS", label: "Auto Slips", emoji: "🤖" },
      { id: "SALES_MANAGEMENT", label: "Sales", emoji: "📈" },
    ],
  },
  { title: "⚙️ Admin Tools", items: [{ id: "MARK_ABSENT", label: "Holiday Planner", emoji: "📅" }] },
];

export default function ChairmanDashboard() {
  const [tab, setTab] = useState("DASHBOARD");
  const [leaves, setLeaves] = useState([]);
  const [toast, setToast] = useState(null);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(new Date());
  const [notifPerm, setNotifPerm] = useState("default");

  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const soundTs = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(setNotifPerm);
    } else if ("Notification" in window) setNotifPerm(Notification.permission);
  }, []);

  const fetchLeaves = useCallback(async () => {
    try {
      const r = await axios.get(`${BASE}/all-leave-requests`, { withCredentials: true });
      setLeaves(r.data.map((x) => ({ ...x, remarksInput: "" })));
    } catch (e) {
      console.error("Failed to fetch leaves:", e);
    }
  }, []);

  const showToast = useCallback((data) => {
    const t = Date.now();
    if (t - soundTs.current > 3000 && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      soundTs.current = t;
    }
    setToast(`🔔 New leave request from ${data.employee_name || "Employee"}`);
    setTimeout(() => setToast(null), 5000);
  }, []);

  const showDesktopNotif = useCallback(
    (data) => {
      if ("Notification" in window && Notification.permission === "granted") {
        const notif = new Notification("🔔 New Leave Request", {
          body: `${data.employee_name || "Employee"} requests leave`,
          icon: "/logo192.png",
          tag: "leave-request",
        });
        setTimeout(() => notif.close(), 8000);
        notif.onclick = () => {
          window.focus();
          setTab("LEAVE_REQUESTS");
          notif.close();
        };
      }
    },
    [setTab]
  );

  useEffect(() => {
    fetchLeaves();
    const socket = io(BASE, {
      path: "/socket.io/",
      transports: ["polling", "websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => setLive(true));
    socket.on("disconnect", () => setLive(false));
    socket.on("newLeaveRequest", (data) => {
      showToast(data);
      showDesktopNotif(data);
      fetchLeaves();
    });
    socket.on("leaveActionTaken", () => fetchLeaves());
    return () => socket.disconnect();
  }, [fetchLeaves, showToast, showDesktopNotif]);

  const pending = useMemo(
    () => leaves.filter((r) => (r.status || "").toLowerCase() === "pending").length,
    [leaves]
  );

  const activeItem = SECTIONS.flatMap((s) => s.items).find((i) => i.id === tab);
  const greeting =
    now.getHours() < 12
      ? "Good Morning"
      : now.getHours() < 17
      ? "Good Afternoon"
      : "Good Evening";

  return (
    <>
      <style>{CSS}</style>
      <audio ref={audioRef} src="/new-request.mp3" preload="auto" />
      {toast && <div className="toast">{toast}</div>}

      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <img src="/logo192.png" alt="VJC" className="brand-img" />
            <div>
              <div className="brand-name">VJC Overseas</div>
              <div className="brand-sub">CHAIRMAN PORTAL</div>
            </div>
          </div>
          <nav className="nav">
            {SECTIONS.map((sec) => (
              <div key={sec.title}>
                {sec.title && <div className="nav-section-title">{sec.title}</div>}
                {sec.items.map((item) => (
                  <button
                    key={item.id}
                    className={`nav-item ${tab === item.id ? "nav-item--active" : ""}`}
                    onClick={() => setTab(item.id)}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                    {item.badge && pending > 0 && <span className="nav-count">{pending}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sf-avatar">VM</div>
            <div>
              <div className="sf-name">Dr. V. Mani</div>
              <div className="sf-role">Chairman & CEO</div>
            </div>
            <div className={`sf-dot ${live ? "sf-dot--live" : "sf-dot--off"}`} />
          </div>
        </aside>

        <div className="body">
          <header className="topbar">
            <div className="tb-left">
              <div className="tb-title">{activeItem?.label || "Dashboard"}</div>
              <div className="tb-date">
                {now.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="tb-right">
              {pending > 0 && (
                <div className="tb-badge" onClick={() => setTab("LEAVE_REQUESTS")}>
                  {pending} Pending
                </div>
              )}
              <div className="tb-greet">{greeting}, Dr. Mani</div>
              <div className="tb-time">
                {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </header>

          <main className="content">
            {tab === "DASHBOARD" ? (
              <div className="stack-dash">
                <div className="hero-centered">
                  <h1>Welcome Back, Dr. Mani 👋</h1>
                  <p>
                    {pending > 0
                      ? `${pending} leave requests awaiting review.`
                      : "All systems running smoothly and efficiently."}
                  </p>
                </div>

               

                <div className="stack-section">
                  <h3>📊 Recent Attendance Logs</h3>
                  <div style={{ marginTop: 16 }}>
                    <AttendanceChatLogs />
                  </div>
                </div>

                <div className="stack-section">
                  <h3>📁 Full Employee Data</h3>
                  <div style={{ marginTop: 16 }}>
                    <Fulldata />
                  </div>
                </div>
              </div>
            ) : (
              <div className="page-container">
                {tab === "SHOW_USERS" && <ShowAllUsers />}
                {tab === "CREATE_USER" && <CreateUser />}
                {tab === "OFFER_LETTER" && <Offerletter />}
                {tab === "SALES_MANAGEMENT" && <SalesManagement />}
                {tab === "PAYROLL" && <Payroll />}
                {tab === "SALARY_UPLOAD" && <SalaryUpload />}
                {tab === "MARK_ABSENT" && <Markabsent />}
                {tab === "AUTO_SALARY_SLIPS" && <Chairmanautosalaryslips />}
                {tab === "LEAVE_REQUESTS" && (
                  <LeaveRequestsSection leaveRequests={leaves} onRefresh={fetchLeaves} />
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
const CSS = `
*{font-family:"Times New Roman",Times,serif;box-sizing:border-box}
body{margin:0;background:#f8fafc;color:#1e293b;overflow:hidden}
.shell{display:flex;height:100vh;width:100vw}
.sidebar{width:260px;background:linear-gradient(180deg,#1e3a8a 0%,#1e40af 100%);color:#fff;display:flex;flex-direction:column}
.brand{padding:28px 20px;display:flex;align-items:center;gap:14px;border-bottom:1px solid rgba(255,255,255,0.1)}
.brand-img{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.25);padding:4px}
.brand-name{font-weight:800;font-size:18px}
.brand-sub{font-size:11px;color:#93c5fd;text-transform:uppercase}
.nav{flex:1;padding:20px}
.nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border:none;border-radius:12px;color:#bfdbfe;background:transparent;font-weight:600;cursor:pointer;margin-bottom:6px;transition:0.25s}
.nav-item:hover{background:rgba(255,255,255,0.1);color:#fff;transform:translateX(4px)}
.nav-item--active{background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;transform:translateX(6px)}
.nav-count{margin-left:auto;background:rgba(255,255,255,0.9);color:#f97316;font-size:11px;font-weight:800;padding:3px 8px;border-radius:10px}
.sidebar-footer{padding:20px;border-top:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;gap:10px}
.sf-avatar{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#f97316,#fb923c);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
.sf-name{font-size:14px;font-weight:700}
.sf-role{font-size:11px;color:#93c5fd}
.sf-dot{width:9px;height:9px;border-radius:50%;margin-left:auto}
.sf-dot--live{background:#10b981;box-shadow:0 0 8px #10b981;animation:pulse 2s infinite}
.sf-dot--off{background:#f87171}
.body{flex:1;display:flex;flex-direction:column}
.topbar{height:80px;padding:0 40px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.8);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,0,0,0.05)}
.tb-left{display:flex;align-items:center;gap:16px}
.tb-title{font-size:24px;font-weight:800;background:linear-gradient(135deg,#1e3a8a,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.tb-right{display:flex;align-items:center;gap:20px}
.tb-badge{background:linear-gradient(135deg,#ffedd5,#fed7aa);color:#f97316;padding:6px 16px;border-radius:25px;font-weight:700;cursor:pointer;border:1px solid rgba(249,115,22,0.3)}
.tb-badge:hover{transform:scale(1.05)}
.tb-greet{font-weight:700}
.tb-time{font-weight:600;color:#64748b;min-width:70px;text-align:right}
.content{flex:1;overflow-y:auto;padding:30px 40px}
.stack-dash{display:flex;flex-direction:column;gap:40px;align-items:center;width:100%}
.hero-centered{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#f97316 100%);padding:50px 70px;border-radius:36px;color:#fff;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,0.1);max-width:900px;width:100%}
.hero-centered h1{font-size:34px;margin-bottom:12px}
.hero-centered p{font-size:17px;opacity:0.95}
.stack-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;max-width:1000px;width:100%}
.stack-card{background:rgba(255,255,255,0.9);backdrop-filter:blur(10px);padding:28px;border-radius:24px;text-align:center;box-shadow:0 8px 25px rgba(0,0,0,0.05);transition:0.3s}
.stack-card:hover{transform:translateY(-6px)}
.sc-icon{font-size:28px;margin-bottom:10px}
.sc-val{font-size:22px;font-weight:800}
.sc-label{font-size:14px;color:#64748b}
/* ▶ Updated full-width sections */
.stack-section{background:#fff;padding:40px;border-radius:28px;width:100%;box-shadow:0 8px 20px rgba(0,0,0,0.05)}
.stack-section h3{font-size:20px;font-weight:800;color:#1e293b;margin-bottom:20px}
.toast{position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:14px 20px;border-radius:16px;font-weight:600;box-shadow:0 10px 20px rgba(249,115,22,0.3)}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.3)}}
`;
