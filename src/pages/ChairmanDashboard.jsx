/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from "react";
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

// ✅ Auto-detect environment
const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

export default function ChairmanDashboard() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("DASHBOARD");
  const [toast, setToast] = useState(null);
  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const lastSoundTimeRef = useRef(0);

  // ✅ Fetch all leave requests
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

  // ✅ Toast + sound on new request
  const showNotification = useCallback((data) => {
    const now = Date.now();
    if (now - lastSoundTimeRef.current > 3000 && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      lastSoundTimeRef.current = now;
    }
    setToast({
      message: `🔔 New leave request from ${data.name || "an employee"}`,
    });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ✅ SOCKET.IO Setup
  useEffect(() => {
    fetchLeaveRequests();

    const socketUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://backend.vjcoverseas.com";

    socketRef.current = io(socketUrl, {
      transports: ["websocket"], // force websocket
      secure: window.location.protocol === "https:",
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000,
      path: "/socket.io/",
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connected:", socketRef.current.id);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.warn("⚠️ Socket disconnected:", reason);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
    });

    socketRef.current.on("newLeaveRequest", (data) => {
      showNotification(data);
      fetchLeaveRequests();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [showNotification]);

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
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Segoe UI', sans-serif",
        color: "#111827",
      }}
    >
      <audio ref={audioRef} src="/new-request.mp3" preload="auto" />

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "linear-gradient(90deg, #2563eb 0%, #f97316 100%)",
            color: "white",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            fontWeight: 600,
            zIndex: 9999,
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: "250px",
          background: "linear-gradient(180deg, #60a5fa 0%, #fb923c 100%)",
          color: "black",
          display: "flex",
          flexDirection: "column",
          boxShadow: "4px 0 10px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "25px 10px 15px",
            borderBottom: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.2)",
          }}
        >
          <img
            src="/logo192.png"
            alt="Logo"
            style={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              background: "white",
              padding: 5,
              boxShadow: "0 0 8px rgba(0,0,0,0.1)",
            }}
          />
          <h3
            style={{
              marginTop: 10,
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "#111827",
            }}
          >
            VJC OVERSEAS HRM
          </h3>
        </div>

        <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 20px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.95rem",
                background:
                  activeTab === item.id
                    ? "rgba(255,255,255,0.8)"
                    : "transparent",
                color: activeTab === item.id ? "#111827" : "#1f2937",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.6)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  activeTab === item.id
                    ? "rgba(255,255,255,0.8)"
                    : "transparent")
              }
            >
              <span style={{ fontSize: "1.2rem", marginRight: "10px" }}>
                {item.icon}
              </span>
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <header
          style={{
            background: "linear-gradient(90deg, #60a5fa 0%, #fb923c 100%)",
            color: "white",
            padding: "20px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontWeight: 700 }}>
              Good Day, Dr. V. Mani 👋
            </h2>
            <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.9 }}>
              Chairman's Administrative Portal
            </p>
          </div>
          <div style={{ fontWeight: 600 }}>
            🕒 {new Date().toLocaleTimeString()}
          </div>
        </header>

        {/* Main Section */}
        <main
          style={{
            flex: 1,
            padding: "25px 35px",
            overflowY: "auto",
            background: "linear-gradient(135deg, #f9fafb 0%, #f1f5f9 100%)",
          }}
        >
          {activeTab === "DASHBOARD" && (
            <>
              {/* Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "20px",
                  marginBottom: "25px",
                }}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #60a5fa 0%, #fb923c 100%)",
                    color: "white",
                    padding: "20px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: "2rem" }}>
                      {pendingCount}
                    </h3>
                    <p style={{ margin: 0 }}>Pending Leave Requests</p>
                  </div>
                  <span style={{ fontSize: "2rem" }}>🔔</span>
                </div>
              </div>

              {/* Logs */}
              <div
                style={{
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                  height: "auto",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    marginBottom: "15px",
                    color: "#111827",
                    borderBottom: "2px solid #60a5fa",
                    paddingBottom: "8px",
                  }}
                >
                  System Logs & Attendance
                </h3>
                <AttendanceChatLogs />
              </div>
            </>
          )}

          {/* Other Tabs */}
          {activeTab !== "DASHBOARD" && (
            <div>
              {activeTab === "SHOW_USERS" && <ShowAllUsers />}
              {activeTab === "CREATE_USER" && <CreateUser />}
              {activeTab === "OFFER_LETTER" && <Offerletter />}
              {activeTab === "PAYROLL" && <Payroll />}
              {activeTab === "SALARY_UPLOAD" && <SalaryUpload />}
              {activeTab === "MARK_ABSENT" && <Markabsent />}
              {activeTab === "AUTO_SALARY_SLIPS" && <Chairmanautosalaryslips />}
              {activeTab === "LEAVE_REQUESTS" && (
                <LeaveRequestsSection
                  leaveRequests={leaveRequests}
                  message={message}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
