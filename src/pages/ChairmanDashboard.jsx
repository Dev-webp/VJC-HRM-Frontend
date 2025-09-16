import React, { useState, useEffect } from "react";
import axios from "axios";
import SalaryUpload from "./SalarySlipUpload";
import UserManagement from "./UserManagement";
import Markabsent from "./Markabsent";
import Payroll from "./Payroll";

// Add dynamic baseUrl for API requests depending on environment
const baseUrl = window.location.hostname === "localhost"
  ? "http://localhost:5000" // local development backend URL (adjust port if needed)
  : "https://backend.vjcoverseas.com"; // remote backend production URL

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
    return () => {
      window.removeEventListener("click", onClickOutside);
    };
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

export default function ChairmanDashboard() {
  const [logs, setLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [searchEmail] = useState("");
  const [, setFilteredLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
    fetchLeaveRequests();
  }, []);

  useEffect(() => {
    if (!searchEmail.trim()) {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(
        logs.filter((log) =>
          log.email.toLowerCase().includes(searchEmail.trim().toLowerCase())
        )
      );
    }
  }, [searchEmail, logs]);

  async function fetchLogs() {
    try {
      const res = await axios.get(`${baseUrl}/dashboard-data`, {
        withCredentials: true,
      });
      setLogs(res.data);
      setFilteredLogs(res.data);
    } catch (error) {
      alert("Failed to load attendance data.");
      console.error(error);
    }
  }

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

  async function deleteLeaveRequest(id) {
    if (!window.confirm("Are you sure you want to delete this leave request?")) return;

    console.log("Deleting leave request ID:", id);
    try {
      const res = await axios.delete(`${baseUrl}/delete-leave-request/${id}`, {
        withCredentials: true,
      });
      console.log("Delete response:", res.data);
      setMessage("✅ Leave request deleted");
      setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Failed to delete leave request", error);
      setMessage("❌ Failed to delete leave request");
    }
  }

  function updateRemarks(index, value) {
    setLeaveRequests((prev) => {
      const updated = [...prev];
      updated[index].remarksInput = value;
      return updated;
    });
  }

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

  return (
    <div style={premiumStyles.container}>
      <UserMenu name="Chairman" />

      <h2 style={premiumStyles.title}>👔 Chairman Dashboard</h2>

      <div style={premiumStyles.section}>
        <UserManagement />
      </div>

      <div style={premiumStyles.section}>
        <h3 style={premiumStyles.sectionTitle}>📝 Leave Requests</h3>
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
                            style={{ ...premiumStyles.btn, backgroundColor: "#28a745" }}
                            onClick={() => handleLeaveAction(req.id, "approve", req.remarksInput)}
                          >
                            Approve
                          </button>
                          <button
                            style={{
                              ...premiumStyles.btn,
                              backgroundColor: "#dc3545",
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
      <Payroll />
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
  <div style={{ flex: "1 1 400px", minWidth: 300 }}>
    <SalaryUpload />
  </div>
  <div style={{ flex: "1 1 400px", minWidth: 300 }}>
    <Markabsent />
  </div>
</div>

    </div>
  );
}

const premiumStyles = {
  container: {
    padding: 40,
    fontFamily:
      "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    backgroundColor: "#f0f2f5",
    minHeight: "100vh",
    maxWidth: 1400,
    margin: "0 auto",
  },
  title: {
    marginBottom: 35,
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "#1a202c",
    textAlign: "center",
    letterSpacing: "-0.5px",
  },
  section: {
    marginBottom: 30,
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 15,
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
    borderBottom: "2px solid #e2f0ff",
    paddingBottom: 10,
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 10px",
  },

  tableRow: {
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    borderRadius: 8,
  },
  tableCell: {
    padding: 15,
    border: "none",
  },
  btn: {
    cursor: "pointer",
    padding: "10px 18px",
    borderRadius: 8,
    border: "none",
    fontWeight: "600",
    color: "#fff",
    transition: "background-color 0.3s ease, transform 0.1s ease",
  },
  input: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 14,
    outlineColor: "#3b82f6",
    width: "100%",
    boxSizing: "border-box",
  },
  emptyText: {
    fontStyle: "italic",
    color: "#666",
    textAlign: "center",
    padding: 20,
    backgroundColor: "#fafafa",
    borderRadius: 8,
  },
  message: {
    fontWeight: "600",
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
    textAlign: "center",
    color: "#fff",
    backgroundColor: "#d9534f",
  },
  approvedColor: {
    color: "#28a745",
  },
  rejectedColor: {
    color: "#dc3545",
  },
  pendingColor: {
    color: "#ffc107",
  },
  userMenu: {
    container: {
      position: "fixed",
      top: 30,
      right: 40,
      zIndex: 1000,
      userSelect: "none",
    },
    avatar: {
      backgroundColor: "#4c556a",
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
    },
  },
};
