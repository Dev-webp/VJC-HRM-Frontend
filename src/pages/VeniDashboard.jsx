import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { io } from "socket.io-client";

import SalaryUpload from "./SalarySlipUpload";
import Markabsent from "./Markabsent";
import Payroll from "./Payroll";
import AttendanceChatLogs from "./AttendanceChatLogs";
import LeaveRequestsSection from "./LeaveRequestsSection";
import CreateUser from "./CreateUser";
import ShowAllUsers from "./ShowAllUsers";
import Offerletter from "./Offerletter";

import Chairmanautosalaryslips from "./Chairmanautosalaryslips";
import SalesManagement from "./SalesManagement"; // ✅ ensure file name matches exactly

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

export default function VeniDashboard() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("DASHBOARD");
  const [toast, setToast] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState("default");
  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const lastSoundTimeRef = useRef(0);

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
          console.log("🔔 Notification permission:", permission);
        });
      } else {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  const showDesktopNotification = useCallback((data) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("🔔 New Leave Request", {
        body: `${data.employee_name || data.name || "An employee"} has submitted a leave request`,
        icon: "/logo192.png",
        badge: "/logo192.png",
        tag: "leave-request",
        requireInteraction: true,
        silent: false,
      });

      setTimeout(() => notification.close(), 10000);

      notification.onclick = () => {
        window.focus();
        setActiveTab("LEAVE_REQUESTS");
        notification.close();
      };
    }
  }, []);

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

  const showNotification = useCallback(
    (data) => {
      const now = Date.now();
      if (now - lastSoundTimeRef.current > 3000 && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        lastSoundTimeRef.current = now;
      }

      setToast({
        message: `🔔 New leave request from ${data.employee_name || data.name || "an employee"}`,
      });
      setTimeout(() => setToast(null), 5000);
      showDesktopNotification(data);
    },
    [showDesktopNotification]
  );

  useEffect(() => {
    fetchLeaveRequests();

    const socketUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://backend.vjcoverseas.com";

    console.log("🔌 Connecting to Socket.IO server:", socketUrl);

    socketRef.current = io(socketUrl, {
      path: "/socket.io/",
      transports: ["polling", "websocket"],
      withCredentials: true,
      secure: window.location.protocol === "https:",
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      upgrade: true,
      rememberUpgrade: false,
      autoConnect: true,
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket.IO connected! ID:", socketRef.current.id);
      setSocketConnected(true);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setSocketConnected(false);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.warn("⚠️ Socket disconnected. Reason:", reason);
      setSocketConnected(false);
      if (reason === "io server disconnect") {
        socketRef.current.connect();
      }
    });

    socketRef.current.on("reconnect", (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setSocketConnected(true);
      fetchLeaveRequests();
    });

    socketRef.current.on("newLeaveRequest", (data) => {
      console.log("📩 New leave request received:", data);
      showNotification(data);
      fetchLeaveRequests();
    });

    socketRef.current.on("leaveActionTaken", (data) => {
      console.log("🔄 Leave action taken:", data);
      setLeaveRequests((prev) => prev.filter((r) => r.id !== data.id));
      setTimeout(() => fetchLeaveRequests(), 500);
    });

    return () => {
      if (socketRef.current) {
        console.log("🔌 Disconnecting socket...");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [showNotification]);

  const pendingCount = useMemo(() => {
    return leaveRequests.filter(
      (r) => (r.status || "").toLowerCase() === "pending"
    ).length;
  }, [leaveRequests]);

  const navItems = [
    { id: "DASHBOARD", label: "Executive Overview", icon: "🏛️" },
    { id: "SHOW_USERS", label: "Employee List", icon: "👥" },
    { id: "CREATE_USER", label: "Create User", icon: "👤" },
    { id: "OFFER_LETTER", label: "Offer Letters", icon: "✉️" },
    { id: "LEAVE_REQUESTS", label: "Leave Requests", icon: "📝" },
    { id: "SALES_MANAGEMENT", label: "Sales Management", icon: "📈" },
    { id: "PAYROLL", label: "Payroll Control", icon: "💰" },
    { id: "SALARY_UPLOAD", label: "Upload Slips", icon: "📤" },
    { id: "MARK_ABSENT", label: "Holiday Planner", icon: "📅" },
    { id: "AUTO_SALARY_SLIPS", label: "Auto Salary Slips", icon: "🤖" },
  ];

  return (
    <div style={styles.container}>
      <audio ref={audioRef} src="/new-request.mp3" preload="auto" />
      {toast && <div style={styles.toast}>{toast.message}</div>}
      {notificationPermission === "denied" && (
        <div style={styles.permissionBanner}>
          ⚠️ Desktop notifications are blocked. Please enable them in your browser settings to
          receive leave request alerts.
        </div>
      )}

      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <img src="/logo192.png" alt="Logo" style={styles.logo} />
          <div style={styles.brandText}>VJC OVERSEAS HRM</div>
          <div style={styles.socketStatus}>
            <span
              style={{
                ...styles.socketDot,
                background: socketConnected ? "#22c55e" : "#ef4444",
              }}
            />
            {socketConnected ? "Live Updates ON" : "Connecting..."}
          </div>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                ...styles.navItem,
                background: activeTab === item.id ? "rgba(255,255,255,0.9)" : "transparent",
                color: activeTab === item.id ? "#1f2937" : "#374151",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.7)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  activeTab === item.id ? "rgba(255,255,255,0.9)" : "transparent")
              }
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "LEAVE_REQUESTS" && pendingCount > 0 && (
                <span style={styles.badge}>{pendingCount}</span>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <div style={styles.mainWrapper}>
        <header style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>Good Day, Miss Veni 👋</h2>
            <p style={styles.headerSubtitle}>Executive Administrative Portal</p>
          </div>
          <div style={styles.headerTime}>🕒 {new Date().toLocaleTimeString()}</div>
        </header>

        <main style={styles.mainContent}>
          {activeTab === "DASHBOARD" && (
            <div style={styles.dashboardContent}>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div>
                    <h3 style={styles.statNumber}>{pendingCount}</h3>
                    <p style={styles.statLabel}>Pending Leave Requests</p>
                  </div>
                  <span style={styles.statIcon}>🔔</span>
                </div>
              </div>

              <div style={styles.logsCard}>
                <h3 style={styles.logsTitle}>System Logs & Attendance</h3>
                <div style={styles.logsContent}>
                  <AttendanceChatLogs />
                </div>
              </div>
            </div>
          )}

          {activeTab !== "DASHBOARD" && (
            <div style={styles.tabContent}>
              {activeTab === "SHOW_USERS" && <ShowAllUsers />}
              {activeTab === "CREATE_USER" && <CreateUser />}
              {activeTab === "OFFER_LETTER" && <Offerletter />}
              {activeTab === "SALES_MANAGEMENT" && <SalesManagement />}
              {activeTab === "PAYROLL" && <Payroll />}
              {activeTab === "SALARY_UPLOAD" && <SalaryUpload />}
              {activeTab === "MARK_ABSENT" && <Markabsent />}
              {activeTab === "AUTO_SALARY_SLIPS" && <Chairmanautosalaryslips />}
              {activeTab === "LEAVE_REQUESTS" && (
                <LeaveRequestsSection
                  leaveRequests={leaveRequests}
                  onRefresh={fetchLeaveRequests}
                />
              )}
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        * {
          overflow-x: hidden !important;
        }

        *::-webkit-scrollbar {
          width: 8px;
          height: 0px;
        }
        *::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.2);
          border-radius: 4px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.3);
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.2) transparent;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "110vh",
    width: "100vw",
    overflow: "hidden",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#111827",
  },
  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    background: "linear-gradient(90deg, #f8a02e 0%, #2563eb 100%)",
    color: "white",
    padding: "12px 20px",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    fontWeight: 600,
    zIndex: 9999,
    animation: "slideIn 0.3s ease-out",
  },
  permissionBanner: {
    position: "fixed",
    top: 80,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#fef3c7",
    color: "#92400e",
    padding: "12px 24px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    fontSize: "0.9rem",
    fontWeight: 600,
    zIndex: 9998,
    maxWidth: "90%",
    textAlign: "center",
  },
  sidebar: {
    width: "250px",
    background: "linear-gradient(180deg, #f8a02e 0%, #2563eb 100%)",
    color: "black",
    display: "flex",
    flexDirection: "column",
    boxShadow: "4px 0 10px rgba(0,0,0,0.08)",
    overflow: "hidden",
    flexShrink: 0,
  },
  sidebarHeader: {
    textAlign: "center",
    padding: "25px 10px 15px",
    borderBottom: "1px solid rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.2)",
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    background: "white",
    padding: 5,
    boxShadow: "0 0 8px rgba(0,0,0,0.1)",
  },
  brandText: {
    marginTop: 10,
    fontWeight: 700,
    fontSize: "1.1rem",
    color: "#111827",
  },
  socketStatus: {
    marginTop: 8,
    fontSize: "0.75rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  socketDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  nav: {
    flex: 1,
    padding: "10px 0",
    overflowY: "auto",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.95rem",
    transition: "all 0.3s ease",
    position: "relative",
  },
  navIcon: {
    fontSize: "1.2rem",
    marginRight: "10px",
  },
  badge: {
    marginLeft: "auto",
    background: "#ef4444",
    color: "white",
    borderRadius: "50%",
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  mainWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "110vh",
    overflow: "hidden",
  },
  header: {
    background: "linear-gradient(90deg, #f8a02e 0%, #2563eb 100%)",
    color: "white",
    padding: "20px 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    minHeight: "80px",
  },
  headerTitle: { margin: 0, fontWeight: 700, fontSize: "1.5rem" },
  headerSubtitle: { margin: 0, fontSize: "0.9rem", opacity: 0.9 },
  headerTime: { fontWeight: 600, fontSize: "1rem" },
  mainContent: {
    flex: 1,
    padding: "25px 35px",
    background: "linear-gradient(135deg, #f0f6ff 0%, #e6f0ff 100%)",
    overflowY: "auto", // ✅ allow vertical scroll
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  dashboardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
  },
  statCard: {
    background: "linear-gradient(135deg, #f8a02e 0%, #2563eb 100%)",
    color: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statNumber: { margin: 0, fontSize: "2rem", fontWeight: 700 },
  statLabel: { margin: 0, fontSize: "0.95rem" },
  statIcon: { fontSize: "2rem" },
  logsCard: {
    borderRadius: "12px",
    background: "white",
    padding: "20px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    maxHeight: "600px",
  },
  logsTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    marginBottom: "15px",
    marginTop: 0,
    color: "#111827",
    borderBottom: "2px solid #f8a02e",
    paddingBottom: "8px",
  },
  logsContent: {
    flex: 1,
    overflowY: "auto",
  },
  tabContent: {
    flex: 1,
    background: "white",
    borderRadius: "12px",
    padding: "25px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    overflowY: "auto",
  },
};
