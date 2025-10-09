import React, { useState, useEffect } from "react";
import axios from "axios";
import SalaryUpload from "./SalarySlipUpload";
import UserManagement from "./UserManagement";
import Markabsent from "./Markabsent";
import Payroll from "./Payroll";
import AttendanceChatLogs from "./AttendanceChatLogs";
import ManagerAssignment from "./ManagerAssignment"; 
const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

// --- UserMenu Component ---
function UserMenu({ name = "User" }) {
  const [open, setOpen] = useState(false);
  const toggleDropdown = () => setOpen((o) => !o);

  const handleLogout = async () => {
    try {
      await axios.get(`${baseUrl}/logout`, { withCredentials: true });
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
      alert("Logout failed");
    }
  };

  const handleSwitchUser = () => {
    window.location.href = "/";
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!e.target.closest(".usermenu-container")) setOpen(false);
    };
    window.addEventListener("click", onClickOutside);
    return () => window.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div className="usermenu-container" style={premiumStyles.userMenu.container}>
      <div style={premiumStyles.userMenu.avatar} onClick={toggleDropdown} title={name}>
        {name[0]?.toUpperCase() || "U"}
      </div>
      {open && (
        <div style={premiumStyles.userMenu.dropdown}>
          <div style={premiumStyles.userMenu.dropdownItem} onClick={handleLogout}>
            🚪 Logout
          </div>
          <div style={premiumStyles.userMenu.dropdownItem} onClick={handleSwitchUser}>
            🔄 Switch User
          </div>
        </div>
      )}
    </div>
  );
}

// --- Navigation Items and Content Mapping ---
const navItems = {
  LEAVE_REQUESTS: { label: "📝 Leave Requests", component: LeaveRequestsSection },
  PAYROLL: { label: "💰 Payroll Processing", component: Payroll },
  SALARY_UPLOAD: { label: "📤 Salary Slip Upload", component: SalaryUpload },
  MARK_ABSENT: { label: "📅 Mark Holiday", component: Markabsent },
};

// Component to render based on active tab
const ComponentRenderer = ({
  activeTab,
  leaveRequests,
  message,
  updateRemarks,
  handleLeaveAction,
  deleteLeaveRequest,
  statusColor,
}) => {
  const ActiveComponent = navItems[activeTab].component;

  if (activeTab === "LEAVE_REQUESTS") {
    return (
      <ActiveComponent
        leaveRequests={leaveRequests}
        message={message}
        updateRemarks={updateRemarks}
        handleLeaveAction={handleLeaveAction}
        deleteLeaveRequest={deleteLeaveRequest}
        statusColor={statusColor}
        premiumStyles={premiumStyles}
      />
    );
  }

  return <ActiveComponent />;
};

// --- Leave Requests Section ---
function LeaveRequestsSection({
  leaveRequests,
  message,
  updateRemarks,
  handleLeaveAction,
  deleteLeaveRequest,
  statusColor,
  premiumStyles,
}) {
  return (
    <div style={premiumStyles.contentBoxNoMargin}>
      <h3 style={{ ...premiumStyles.sectionTitle, borderBottom: "none" }}>📝 Pending Leave Requests</h3>
      {message && <p style={premiumStyles.message}>{message}</p>}
      {leaveRequests.length === 0 ? (
        <p style={premiumStyles.emptyText}>No leave requests at the moment.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={premiumStyles.table}>
            <thead>
              <tr style={premiumStyles.table.headerRow}>
                <th style={premiumStyles.table.headerCell}>Employee</th>
                <th style={premiumStyles.table.headerCell}>Type</th>
                <th style={premiumStyles.table.headerCell}>Start</th>
                <th style={premiumStyles.table.headerCell}>End</th>
                <th style={premiumStyles.table.headerCell}>Reason</th>
                <th style={premiumStyles.table.headerCell}>Status</th>
                <th style={premiumStyles.table.headerCell}>Remarks</th>
                <th style={premiumStyles.table.headerCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((req, idx) => (
                <tr key={req.id} style={premiumStyles.table.dataRow}>
                  <td style={premiumStyles.table.dataCell}>
                    <strong>{req.employee_name}</strong>
                    <br />
                    {req.employee_email}
                    <br />
                    <small>ID: {req.employee_id}</small>
                  </td>
                  <td style={premiumStyles.table.dataCell}>{req.leave_type}</td>
                  <td style={premiumStyles.table.dataCell}>{req.start_date}</td>
                  <td style={premiumStyles.table.dataCell}>{req.end_date}</td>
                  <td style={premiumStyles.table.dataCell}>{req.reason || "-"}</td>
                  <td
                    style={{
                      ...premiumStyles.table.dataCell,
                      ...statusColor(req.status),
                      fontWeight: "bold",
                    }}
                  >
                    {req.status}
                  </td>
                  <td style={premiumStyles.table.dataCell}>
                    {req.status.toLowerCase() === "pending" ? (
                      <input
                        type="text"
                        value={req.remarksInput}
                        placeholder="Remarks"
                        onChange={(e) => updateRemarks(idx, e.target.value)}
                        style={premiumStyles.input}
                      />
                    ) : (
                      req.chairman_remarks || "-"
                    )}
                  </td>
                  <td style={{ ...premiumStyles.table.dataCell, whiteSpace: "nowrap" }}>
                    {req.status.toLowerCase() === "pending" && (
                      <>
                        <button
                          style={{ ...premiumStyles.btn, backgroundColor: "#2ecc71" }}
                          onClick={() => handleLeaveAction(req.id, "approve", req.remarksInput)}
                        >
                          Approve
                        </button>
                        <button
                          style={{
                            ...premiumStyles.btn,
                            backgroundColor: "#e74c3c",
                            marginLeft: 6,
                          }}
                          onClick={() => handleLeaveAction(req.id, "reject", req.remarksInput)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      style={{ ...premiumStyles.btn, backgroundColor: "#6c757d", marginLeft: 6 }}
                      onClick={() => deleteLeaveRequest(req.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- ChairmanDashboard Main Component ---
export default function ChairmanDashboard() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("LEAVE_REQUESTS"); // Default active tab

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  // Fetch leave requests
  async function fetchLeaveRequests() {
    try {
      const res = await axios.get(`${baseUrl}/all-leave-requests`, {
        withCredentials: true,
      });
      setLeaveRequests(res.data.map((req) => ({ ...req, remarksInput: "" })));
    } catch (error) {
      console.error(error);
      setMessage("Failed to load leave requests");
    }
  }

  // Handle leave approve/reject action
  async function handleLeaveAction(id, action, remarks) {
    if (!remarks.trim()) {
      setMessage("❌ Remarks are required");
      return;
    }
    try {
      await axios.post(
        `${baseUrl}/leave-action`,
        { id, action, remarks },
        { withCredentials: true }
      );
      setMessage(`✅ Leave request ${action}d`);
      fetchLeaveRequests();
    } catch (error) {
      console.error("Error in leave action", error);
      setMessage("❌ Failed to update leave request");
    }
  }

  // Delete a leave request
  async function deleteLeaveRequest(id) {
    if (!window.confirm("Are you sure you want to delete this leave request?")) return;
    try {
      await axios.delete(`${baseUrl}/delete-leave-request/${id}`, {
        withCredentials: true,
      });
      setMessage("✅ Leave request deleted");
      setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Failed to delete leave request", error);
      setMessage("❌ Failed to delete leave request");
    }
  }

  // Update remarks input for a leave request
  function updateRemarks(index, value) {
    setLeaveRequests((prev) => {
      const updated = [...prev];
      updated[index].remarksInput = value;
      return updated;
    });
  }

  // Returns style for status text color
  function statusColor(status) {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "approved":
        return premiumStyles.approvedColor;
      case "rejected":
        return premiumStyles.rejectedColor;
      case "pending":
        return premiumStyles.pendingColor;
      default:
        return {};
    }
  }

  // --- Render ---
  return (
    <div style={premiumStyles.container}>
      <UserMenu name="Chairman" />

      {/* Logo and Title Header Section */}
      <div style={premiumStyles.headerSection}>
        <div style={premiumStyles.logoContainer}>
          {/* Replace with your actual logo path */}
          <img
            src="/logo192.png"
            alt="VJC-OVERSEAS Logo"
            style={premiumStyles.logoImage}
          />
        </div>
        <h2 style={premiumStyles.title}> Chairman VJC-OVERSEAS</h2>
      </div>
      {/* END HEADER */}

      {/* 1. TOP PRIORITY: ATTENDANCE CHAT LOGS */}
      <AttendanceChatLogs />

      {/* 2. SECOND PRIORITY: USER MANAGEMENT */}
      <div style={premiumStyles.contentBoxStack}>
        <UserManagement />
      </div>
      <ManagerAssignment 
      baseUrl={baseUrl} 
      premiumStyles={premiumStyles} // <-- 🛑 This prop is critical and was likely missing 
    />

      <div style={premiumStyles.separator} />

      {/* Main Navigation Bar */}
      <div style={premiumStyles.navBar}>
        {Object.keys(navItems).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              ...premiumStyles.navItem,
              ...(activeTab === key ? premiumStyles.activeNavItem : {}),
            }}
          >
            {navItems[key].label}
          </button>
        ))}
      </div>

      {/* Dynamic Content Area */}
      <div style={premiumStyles.dynamicContent}>
        <ComponentRenderer
          activeTab={activeTab}
          leaveRequests={leaveRequests}
          message={message}
          updateRemarks={updateRemarks}
          handleLeaveAction={handleLeaveAction}
          deleteLeaveRequest={deleteLeaveRequest}
          statusColor={statusColor}
        />
      </div>
    </div>
  );
}

// --- Premium Styles ---
const premiumStyles = {
  container: {
    padding: 40,
    fontFamily: "'Inter', sans-serif",
    backgroundColor: "#f0f2f5",
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
  },

  // Header styles
  headerSection: {
    display: "flex",
    alignItems: "center",
    marginBottom: 40,
    paddingLeft: 10,
  },
  logoContainer: {
    marginRight: 15,
    width: 160,
    height: 100,
    flexShrink: 0,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    borderRadius: "16px",
  },
  title: {
    fontSize: "2.8rem",
    fontWeight: "800",
    color: "#2c3e50",
    textAlign: "left",
    letterSpacing: "-1px",
    margin: 0,
  },

  // Content box styles
  contentBoxStack: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 15,
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    marginBottom: 25,
    boxSizing: "border-box",
    width: "100%",
  },
  contentBoxNoMargin: {
    backgroundColor: "#fff",
    borderRadius: 15,
    boxSizing: "border-box",
  },

  separator: {
    borderBottom: "1px solid #dcdfe4",
    marginBottom: 30,
    marginTop: -5,
  },

  // Navigation bar styles
  navBar: {
    display: "flex",
    justifyContent: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: "10px 10px 0 0",
    padding: "0 10px",
    borderBottom: "3px solid #e0e0e0",
    overflowX: "auto",
  },
  navItem: {
    padding: "15px 25px",
    cursor: "pointer",
    border: "none",
    backgroundColor: "transparent",
    fontSize: "1rem",
    fontWeight: "600",
    color: "#7f8c8d",
    transition: "color 0.3s, border-bottom 0.3s",
    margin: "0 10px",
    position: "relative",
    whiteSpace: "nowrap",
  },
  activeNavItem: {
    color: "#3498db",
    borderBottom: "3px solid #3498db",
    zIndex: 10,
    transform: "translateY(1px)",
  },
  dynamicContent: {
    backgroundColor: "#fff",
    padding: 30,
    paddingTop: 40,
    borderRadius: "0 0 15px 15px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
  },

  // Section title styling
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
    borderBottom: "2px solid #e2f0ff",
    paddingBottom: 10,
  },

  // Table styles
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 10px",
    headerRow: {
      backgroundColor: "#eef2f7",
      boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
    },
    headerCell: {
      padding: 15,
      border: "none",
      fontSize: 14,
      fontWeight: 700,
      color: "#2c3e50",
      textAlign: "left",
    },
    dataRow: {
      backgroundColor: "#f9f9f9",
      boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
      borderRadius: 8,
    },
    dataCell: {
      padding: 15,
      border: "none",
      fontSize: 14,
      verticalAlign: "middle",
      textAlign: "left",
    },
  },

  // Buttons and inputs
  btn: {
    cursor: "pointer",
    padding: "8px 15px",
    borderRadius: 8,
    border: "none",
    fontWeight: "600",
    color: "#fff",
    transition: "background-color 0.3s ease, transform 0.1s ease",
    fontSize: 13,
  },
  input: {
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 13,
    outlineColor: "#3498db",
    width: "100%",
    boxSizing: "border-box",
  },

  emptyText: {
    fontStyle: "italic",
    color: "#666",
    textAlign: "center",
    padding: 40,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    fontSize: "1.1rem",
  },

  message: {
    fontWeight: "600",
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
    textAlign: "center",
    color: "#fff",
    backgroundColor: "#e74c3c",
  },

  // Status text colors
  approvedColor: {
    color: "#2ecc71",
  },
  rejectedColor: {
    color: "#e74c3c",
  },
  pendingColor: {
    color: "#f39c12",
  },

  // User menu styles
  userMenu: {
    container: {
      position: "fixed",
      top: 30,
      right: 40,
      zIndex: 1000,
      userSelect: "none",
    },
    avatar: {
      backgroundColor: "#3498db",
      color: "#fff",
      width: 50,
      height: 50,
      borderRadius: "50%",
      fontSize: 22,
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      transition: "transform 0.2s ease-in-out",
    },
    dropdown: {
      position: "absolute",
      top: "calc(100% + 10px)",
      right: 0,
      background: "#fff",
      borderRadius: 10,
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      overflow: "hidden",
      minWidth: 160,
      animation: "fadeIn 0.3s ease-in-out",
      listStyle: "none",
      padding: 0,
      margin: 0,
    },
    dropdownItem: {
      padding: 12,
      cursor: "pointer",
      fontWeight: "500",
      color: "#333",
      borderBottom: "1px solid #f0f2f5",
      transition: "background-color 0.2s",
      // Note: ':hover' cannot be applied here inline. Use CSS or a library for hover.
    },
  },
};
