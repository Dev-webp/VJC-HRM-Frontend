import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

// Import all the same components
import SalaryUpload from "./SalarySlipUpload";
import Markabsent from "./Markabsent";
import Payroll from "./Payroll";
import AttendanceChatLogs from "./AttendanceChatLogs";
import LeaveRequestsSection from "./LeaveRequestsSection";
import CreateUser from "./CreateUser";
import ShowAllUsers from "./ShowAllUsers";
import Offerletter from "./Offerletter";
import { premiumStyles } from "./DashboardStyles";
import Chairmanautosalaryslips from "./Chairmanautosalaryslips";
const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

export default function VeniDashboard() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("DASHBOARD");
  const [toast, setToast] = useState(null);
  const socketRef = useRef(null);
  const audioRef = useRef(null);
  let lastSoundTime = 0;

  async function fetchLeaveRequests() {
    try {
      const res = await axios.get(`${baseUrl}/all-leave-requests`, {
        withCredentials: true,
      });
      setLeaveRequests(res.data.map((req) => ({ ...req, remarksInput: "" })));
    } catch (error) {
      console.error("❌ Failed to load leave requests", error);
      setMessage("Failed to load leave requests");
    }
  }

  const showNotification = (data) => {
    const now = Date.now();
    if (now - lastSoundTime > 3000 && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      lastSoundTime = now;
    }
    setToast({
      message: `🔔 New leave request received from ${data.name || "an employee"}`,
    });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchLeaveRequests();
    socketRef.current = io(baseUrl, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current.on("newLeaveRequest", (data) => {
      showNotification(data);
      fetchLeaveRequests();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = leaveRequests.filter(
    (r) => (r.status || "").toLowerCase() === "pending"
  ).length;

  const navItems = [
    { id: "DASHBOARD", label: "Executive Overview", icon: "🏛️" },
    { id: "SHOW_USERS", label: "Employee List", icon: "👥" },
    { id: "CREATE_USER", label: "Create User", icon: "👤" },
    { id: "OFFER_LETTER", label: "Offer Letters", icon: "✉️" },
    { id: "LEAVE_REQUESTS", label: "Leave Requests", icon: "📝" },
    { id: "PAYROLL", label: "Payroll Control", icon: "💰" },
    { id: "SALARY_UPLOAD", label: "Upload Slips", icon: "📤" },
    { id: "MARK_ABSENT", label: "Holiday Planner", icon: "📅" },
     { id: "AUTO_SALARY_SLIPS", label: "Auto Salary Slips", icon: "🤖" },
  ];

  return (
    <div style={{ ...premiumStyles.mainLayout, minHeight: "100vh", display: "flex", background: "linear-gradient(135deg, rgba(240,246,255,1) 0%, rgba(230,240,255,1) 100%)" }}>
      <audio ref={audioRef} src="/new-request.mp3" preload="auto" />
      
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#2563eb", color: "white", padding: "12px 18px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 9999, fontWeight: 600 }}>
          {toast.message}
        </div>
      )}

      {/* Sidebar - Same Power as Chairman */}
      <aside style={{ ...premiumStyles.sidebar, height: "100vh", overflowY: "auto" }}>
        <div style={premiumStyles.sidebarBrand}>
          <img src="/logo192.png" alt="Logo" style={premiumStyles.sidebarLogo} />
          <div style={premiumStyles.brandText}>VJC OVERSEAS</div>
        </div>
        <nav style={premiumStyles.sideNav}>
          {navItems.map((item) => (
            <div key={item.id} onClick={() => setActiveTab(item.id)} style={{ ...premiumStyles.sideNavItem, ...(activeTab === item.id ? premiumStyles.activeSideItem : {}) }}>
              <span style={{ fontSize: "1.2rem", marginRight: "8px" }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <div style={{ ...premiumStyles.contentWrapper, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Personalized Header for Miss Veni */}
        <header style={{ ...premiumStyles.topHeader, background: "linear-gradient(90deg, #f8a02e 0%, #2563eb 100%)", color: "white", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <h2 style={premiumStyles.welcomeText}>Good Day, Miss Veni</h2>
            <p style={premiumStyles.subText}>Executive Administrative Portal</p>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            🕒 {new Date().toLocaleTimeString()}
          </div>
        </header>

        <main style={{ ...premiumStyles.mainContent, flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
          {activeTab === "DASHBOARD" && (
            <>
              <div style={premiumStyles.statsGrid}>
                <div style={premiumStyles.statCard}>
                  <div style={premiumStyles.statIcon}>🔔</div>
                  <div>
                    <h4 style={premiumStyles.statValue}>{pendingCount}</h4>
                    <p style={premiumStyles.statLabel}>Pending Requests</p>
                  </div>
                </div>
              </div>
              <div style={premiumStyles.glassContainer}>
                <h3 style={premiumStyles.sectionTitle}>System Logs & Attendance</h3>
                <AttendanceChatLogs />
              </div>
            </>
          )}

          {activeTab !== "DASHBOARD" && (
            <div style={premiumStyles.glassContainer}>
              {activeTab === "SHOW_USERS" && <ShowAllUsers />}
              {activeTab === "CREATE_USER" && <CreateUser />}
              {activeTab === "OFFER_LETTER" && <Offerletter />}
              {activeTab === "PAYROLL" && <Payroll />}
              {activeTab === "SALARY_UPLOAD" && <SalaryUpload />}
              {activeTab === "AUTO_SALARY_SLIPS" && <Chairmanautosalaryslips />}
              {activeTab === "MARK_ABSENT" && <Markabsent />}
              {activeTab === "LEAVE_REQUESTS" && (
                <LeaveRequestsSection leaveRequests={leaveRequests} message={message} premiumStyles={premiumStyles} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}