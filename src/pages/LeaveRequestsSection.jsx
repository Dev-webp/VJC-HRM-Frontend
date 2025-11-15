import React, { useState, useEffect } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

const premiumStyles = {
  contentBoxNoMargin: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 15,
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
    paddingBottom: 10,
  },
  message: {
    fontWeight: "600",
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
    textAlign: "center",
    color: "#fff",
    backgroundColor: "#2ecc71",
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
  btn: {
    cursor: "pointer",
    padding: "8px 15px",
    borderRadius: 8,
    border: "none",
    fontWeight: "600",
    color: "#fff",
    transition: "background-color 0.3s ease",
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
  approvedColor: { color: "#2ecc71" },
  rejectedColor: { color: "#e74c3c" },
  pendingColor: { color: "#f39c12" },
};

const filterAndPaginate = (requests, search, fromIndex = 0, pageSize = 10) => {
  const filtered = requests.filter((req) =>
    (req.employee_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (req.employee_email || "").toLowerCase().includes(search.toLowerCase())
  );
  return {
    filtered,
    paged: filtered.slice(fromIndex, fromIndex + pageSize),
    total: filtered.length,
  };
};

export default function LeaveRequestsContainer() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageStart, setPageStart] = useState(0);

  async function fetchCurrentUser() {
    try {
      const res = await axios.get(`${baseUrl}/me`, { withCredentials: true });
      setUserRole(res.data.role || "");
      setUserLocation(res.data.location || "");
    } catch (error) {
      console.error("Failed to fetch user info from /me", error);
      setMessage("❌ Failed to fetch user info");
    }
  }

  async function fetchLeaveRequests() {
    setMessage("⏳ Loading leave requests...");
    try {
      const res = await axios.get(`${baseUrl}/all-leave-requests`, {
        withCredentials: true,
      });
      setLeaveRequests(res.data.map((req) => ({ ...req, remarksInput: "" })));
      setMessage("✅ Leave requests loaded");
      setPageStart(0);
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to load leave requests. Check backend connection.");
    }
  }

  async function handleLeaveAction(id, action, remarks) {
    if (!remarks.trim()) {
      setMessage("❌ Remarks are required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setMessage(`⏳ Processing ${action}...`);
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
    if (!window.confirm("Are you sure you want to delete this leave request?"))
      return;
    setMessage("⏳ Deleting request...");
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

  function updateRemarks(index, value) {
    setLeaveRequests((prev) => {
      const updated = [...prev];
      updated[index].remarksInput = value;
      return updated;
    });
  }

  useEffect(() => {
    async function init() {
      await fetchCurrentUser();
      await fetchLeaveRequests();
    }
    init();
  }, []);

  const filteredLeaveRequests =
    userRole.toLowerCase() === "manager"
      ? leaveRequests.filter(
          (req) =>
            req.location &&
            userLocation &&
            req.location.toLowerCase() === userLocation.toLowerCase()
        )
      : leaveRequests;

  // eslint-disable-next-line no-unused-vars
  const { filtered, paged, total } = filterAndPaginate(
    filteredLeaveRequests,
    searchTerm,
    pageStart,
    10
  );

  const showPrev = pageStart > 0;
  const showNext = pageStart + 10 < total;

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
    <div style={premiumStyles.contentBoxNoMargin}>
      <h3 style={{ ...premiumStyles.sectionTitle, borderBottom: "none" }}>
        📝 Pending Leave Requests
      </h3>

      {message && (
        <p
          style={{
            ...premiumStyles.message,
            backgroundColor: message.startsWith("❌")
              ? "#e74c3c"
              : message.startsWith("⏳")
              ? "#3498db"
              : "#2ecc71",
          }}
        >
          {message}
        </p>
      )}

      <input
        type="search"
        placeholder="Search by name or mail id"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setPageStart(0);
        }}
        style={{
          ...premiumStyles.input,
          maxWidth: 320,
          fontSize: 15,
          fontWeight: 500,
          borderColor: "#e67e22",
          background: "#fff8f1",
          marginBottom: 20,
        }}
      />

      {paged.length === 0 && !message.startsWith("⏳") ? (
        <p style={premiumStyles.emptyText}>No leave requests at the moment.</p>
      ) : (
        <>
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
                {paged.map((req, idx) => (
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
                          onChange={(e) => updateRemarks(pageStart + idx, e.target.value)}
                          style={premiumStyles.input}
                        />
                      ) : (
                        <span style={{ fontSize: "0.85em", color: "#333" }}>
                          {req.chairman_remarks || "-"}
                          {(req.actioned_by_role || req.actioned_by_name) && (
                            <>
                              <br />
                              <span
                                style={{
                                  color: "#888",
                                  fontSize: "0.8em",
                                  fontStyle: "italic",
                                }}
                              >
                                {req.status.toLowerCase() === "approved"
                                  ? `Approved By: ${
                                      req.actioned_by_role || ""
                                    }${req.actioned_by_name ? " - " + req.actioned_by_name : ""}`
                                  : req.status.toLowerCase() === "rejected"
                                  ? `Rejected By: ${
                                      req.actioned_by_role || ""
                                    }${req.actioned_by_name ? " - " + req.actioned_by_name : ""}`
                                  : `By: ${
                                      req.actioned_by_role || ""
                                    }${req.actioned_by_name ? " - " + req.actioned_by_name : ""}`}
                              </span>
                            </>
                          )}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        ...premiumStyles.table.dataCell,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {req.status.toLowerCase() === "pending" && (
                        <>
                          <button
                            style={{
                              ...premiumStyles.btn,
                              backgroundColor: "#2ecc71",
                            }}
                            onClick={() =>
                              handleLeaveAction(req.id, "approve", req.remarksInput)
                            }
                          >
                            Approve
                          </button>
                          <button
                            style={{
                              ...premiumStyles.btn,
                              backgroundColor: "#e74c3c",
                              marginLeft: 6,
                            }}
                            onClick={() =>
                              handleLeaveAction(req.id, "reject", req.remarksInput)
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        style={{
                          ...premiumStyles.btn,
                          backgroundColor: "#6c757d",
                          marginLeft: 6,
                        }}
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
          {/* Pagination Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 15,
              gap: 10,
            }}
          >
            <button
              disabled={!showPrev}
              onClick={() => setPageStart(Math.max(0, pageStart - 10))}
              style={{
                ...premiumStyles.btn,
                backgroundColor: showPrev ? "#e67e22" : "#eee",
                cursor: showPrev ? "pointer" : "not-allowed",
                color: showPrev ? "#fff" : "#999",
              }}
            >
              ◀ Prev
            </button>
            <button
              disabled={!showNext}
              onClick={() => setPageStart(Math.min(pageStart + 10, total - 10))}
              style={{
                ...premiumStyles.btn,
                backgroundColor: showNext ? "#e67e22" : "#eee",
                cursor: showNext ? "pointer" : "not-allowed",
                color: showNext ? "#fff" : "#999",
              }}
            >
              Next ▶
            </button>
          </div>
        </>
      )}
    </div>
  );
}
