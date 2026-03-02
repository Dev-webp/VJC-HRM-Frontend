import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

// ── Helper ────────────────────────────────────────────────
function toBoolean(value) {
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}
// ─────────────────────────────────────────────────────────

const premiumStyles = {
  contentBoxNoMargin: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 15,
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
    position: "relative",
  },
  sectionTitle: { fontSize: "1.5rem", fontWeight: "600", color: "#333", marginBottom: 20, paddingBottom: 10 },
  message: { fontWeight: "600", marginBottom: 15, padding: 12, borderRadius: 8, textAlign: "center", color: "#fff", backgroundColor: "#2ecc71" },
  emptyText: { fontStyle: "italic", color: "#666", textAlign: "center", padding: 40, backgroundColor: "#f5f5f5", borderRadius: 8, fontSize: "1.1rem" },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 10px",
    headerRow: { backgroundColor: "#eef2f7", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" },
    headerCell: { padding: 15, border: "none", fontSize: 14, fontWeight: 700, color: "#2c3e50", textAlign: "left" },
    dataRow: { backgroundColor: "#f9f9f9", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", borderRadius: 8 },
    dataCell: { padding: 15, border: "none", fontSize: 14, verticalAlign: "middle", textAlign: "left" },
  },
  btn: { cursor: "pointer", padding: "8px 15px", borderRadius: 8, border: "none", fontWeight: "600", color: "#fff", transition: "background-color 0.3s ease", fontSize: 13 },
  input: { padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 13, outlineColor: "#3498db", width: "100%", boxSizing: "border-box" },
  approvedColor: { color: "#2ecc71" },
  rejectedColor: { color: "#e74c3c" },
  pendingColor: { color: "#f39c12" },
};

const filterAndPaginate = (requests, search, fromIndex = 0, pageSize = 10) => {
  const filtered = requests.filter(
    (req) =>
      (req.employee_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (req.employee_email || "").toLowerCase().includes(search.toLowerCase())
  );
  return { filtered, paged: filtered.slice(fromIndex, fromIndex + pageSize), total: filtered.length };
};

export default function LeaveRequestsContainer({ leaveRequests: parentLeaveRequests, onRefresh }) {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageStart, setPageStart] = useState(0);
  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const lastSoundTime = useRef(0);

  useEffect(() => {
    if (parentLeaveRequests && parentLeaveRequests.length >= 0) {
      setLeaveRequests(parentLeaveRequests.map((req) => ({ ...req, remarksInput: "" })));
    }
  }, [parentLeaveRequests]);

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
    try {
      const res = await axios.get(`${baseUrl}/all-leave-requests`, { withCredentials: true });
      setLeaveRequests(res.data.map((req) => ({ ...req, remarksInput: "" })));
      setMessage("");
      setPageStart(0);
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to load leave requests. Check backend connection.");
    }
  }

  // ── KEY FIX: extract half_day/full_day from the request itself ──
  async function handleLeaveAction(id, action, remarks) {
    if (!remarks.trim()) {
      setMessage("❌ Remarks are required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Find the original request so we can send its half_day/full_day flags
    const req = leaveRequests.find((r) => r.id === id);
    const halfDay = req ? toBoolean(req.half_day) : false;
    const fullDay  = req ? toBoolean(req.full_day)  : true;

    setMessage(`⏳ Processing ${action}...`);
    try {
      await axios.post(
        `${baseUrl}/leave-action`,
        {
          id,
          action,
          remarks,
          half_day: halfDay,   // ← always send correct flag
          full_day: fullDay,   // ← always send correct flag
        },
        { withCredentials: true }
      );
      setMessage(`✅ Leave request ${action}d`);
      setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
      if (onRefresh) setTimeout(() => onRefresh(), 100);
      if (socketRef.current) socketRef.current.emit("leaveActionTaken", { id, action });
    } catch (error) {
      console.error("Error in leave action", error);
      setMessage("❌ Failed to update leave request");
      if (onRefresh) onRefresh();
    }
  }

  async function deleteLeaveRequest(id) {
    if (!window.confirm("Are you sure you want to delete this leave request?")) return;
    setMessage("⏳ Deleting request...");
    try {
      await axios.delete(`${baseUrl}/delete-leave-request/${id}`, { withCredentials: true });
      setMessage("✅ Leave request deleted");
      setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
      if (onRefresh) setTimeout(() => onRefresh(), 100);
      if (socketRef.current) socketRef.current.emit("leaveActionTaken", { id, action: "delete" });
    } catch (error) {
      console.error("Failed to delete leave request", error);
      setMessage("❌ Failed to delete leave request");
      if (onRefresh) onRefresh();
    }
  }

  function updateRemarks(index, value) {
    setLeaveRequests((prev) => {
      const updated = [...prev];
      updated[index].remarksInput = value;
      return updated;
    });
  }

  const showNotification = React.useCallback((data) => {
    const now = Date.now();
    if (now - lastSoundTime.current > 3000 && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => console.warn("Sound blocked:", err));
      lastSoundTime.current = now;
    }
    setToast({ message: `🆕 New leave request received from ${data.name || "an employee"}` });
    setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    async function init() {
      await fetchCurrentUser();
      await fetchLeaveRequests();
    }
    init();

    const socketUrl = window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://backend.vjcoverseas.com";

    socketRef.current = io(socketUrl, {
      path: "/socket.io/",
      transports: ["polling", "websocket"],
      withCredentials: true,
      reconnection: true,
    });

    socketRef.current.on("connect", () => console.log("✅ Connected to Socket.IO"));

    socketRef.current.on("newLeaveRequest", (data) => {
      console.log("📩 New leave request:", data);
      showNotification(data);
      fetchLeaveRequests();
    });

    socketRef.current.on("leaveActionTaken", (data) => {
      console.log("🔄 Leave action taken by another user:", data);
      setLeaveRequests((prev) => prev.filter((r) => r.id !== data.id));
    });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [showNotification]);

  const filteredLeaveRequests =
    userRole.toLowerCase() === "manager"
      ? leaveRequests.filter(
          (req) =>
            req.location &&
            userLocation &&
            req.location.toLowerCase() === userLocation.toLowerCase()
        )
      : leaveRequests;

  const { paged, total } = filterAndPaginate(filteredLeaveRequests, searchTerm, pageStart, 10);
  const showPrev = pageStart > 0;
  const showNext = pageStart + 10 < total;

  const statusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "approved": return premiumStyles.approvedColor;
      case "rejected": return premiumStyles.rejectedColor;
      case "pending":  return premiumStyles.pendingColor;
      default:         return {};
    }
  };

  return (
    <div style={premiumStyles.contentBoxNoMargin}>
      <audio ref={audioRef} src="/new-request.mp3" preload="auto" />

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#2563eb", color: "white", padding: "12px 18px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 9999, fontWeight: 600 }}>
          {toast.message}
        </div>
      )}

      <h3 style={{ ...premiumStyles.sectionTitle, borderBottom: "none" }}>
        📝 Pending Leave Requests ({filteredLeaveRequests.filter((r) => r.status.toLowerCase() === "pending").length})
      </h3>

      {message && (
        <p style={{ ...premiumStyles.message, backgroundColor: message.startsWith("❌") ? "#e74c3c" : message.startsWith("⏳") ? "#3498db" : "#2ecc71" }}>
          {message}
        </p>
      )}

      <input
        type="search"
        placeholder="Search by name or mail id"
        value={searchTerm}
        onChange={(e) => { setSearchTerm(e.target.value); setPageStart(0); }}
        style={{ ...premiumStyles.input, maxWidth: 320, fontSize: 15, fontWeight: 500, borderColor: "#e67e22", background: "#fff8f1", marginBottom: 20 }}
      />

      {paged.length === 0 ? (
        <p style={premiumStyles.emptyText}>No leave requests at the moment.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={premiumStyles.table}>
              <thead>
                <tr style={premiumStyles.table.headerRow}>
                  <th style={premiumStyles.table.headerCell}>Employee</th>
                  <th style={premiumStyles.table.headerCell}>Type</th>
                  <th style={premiumStyles.table.headerCell}>Day Type</th>
                  <th style={premiumStyles.table.headerCell}>Start</th>
                  <th style={premiumStyles.table.headerCell}>End</th>
                  <th style={premiumStyles.table.headerCell}>Reason</th>
                  <th style={premiumStyles.table.headerCell}>Status</th>
                  <th style={premiumStyles.table.headerCell}>Remarks</th>
                  <th style={premiumStyles.table.headerCell}>Actioned By</th>
                  <th style={premiumStyles.table.headerCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((req, idx) => {
                  const halfDay = toBoolean(req.half_day);
                  return (
                    <tr key={req.id} style={premiumStyles.table.dataRow}>
                      <td style={premiumStyles.table.dataCell}>
                        <strong>{req.employee_name}</strong><br />
                        {req.employee_email}<br />
                        <small>ID: {req.employee_id}</small>
                      </td>
                      <td style={premiumStyles.table.dataCell}>{req.leave_type}</td>
                      <td style={premiumStyles.table.dataCell}>
                        {req.leave_type === "Earned Leave"
                          ? (halfDay ? "Half Day" : "Full Day")
                          : "-"}
                      </td>
                      <td style={premiumStyles.table.dataCell}>{req.start_date}</td>
                      <td style={premiumStyles.table.dataCell}>{req.end_date}</td>
                      <td style={premiumStyles.table.dataCell}>{req.reason || "-"}</td>
                      <td style={{ ...premiumStyles.table.dataCell, ...statusColor(req.status), fontWeight: "bold" }}>
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
                          </span>
                        )}
                      </td>
                      <td style={premiumStyles.table.dataCell}>
                        {req.status.toLowerCase() === "pending" ? (
                          <span style={{ fontSize: "0.85em", color: "#999", fontStyle: "italic" }}>Pending...</span>
                        ) : (
                          <div>
                            <strong style={{ color: "#2c3e50" }}>{req.actioned_by_name || req.chairman_name || "Admin"}</strong>
                            <br />
                            <small style={{ color: "#666" }}>
                              {req.actioned_at ? new Date(req.actioned_at).toLocaleDateString("en-IN") : ""}
                            </small>
                          </div>
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
                              style={{ ...premiumStyles.btn, backgroundColor: "#e74c3c", marginLeft: 6 }}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 15, gap: 10 }}>
            <button
              disabled={!showPrev}
              onClick={() => setPageStart(Math.max(0, pageStart - 10))}
              style={{ ...premiumStyles.btn, backgroundColor: showPrev ? "#e67e22" : "#eee", cursor: showPrev ? "pointer" : "not-allowed", color: showPrev ? "#fff" : "#999" }}
            >
              ◀ Prev
            </button>
            <button
              disabled={!showNext}
              onClick={() => setPageStart(Math.min(pageStart + 10, total - 10))}
              style={{ ...premiumStyles.btn, backgroundColor: showNext ? "#e67e22" : "#eee", cursor: showNext ? "pointer" : "not-allowed", color: showNext ? "#fff" : "#999" }}
            >
              Next ▶
            </button>
          </div>
        </>
      )}
    </div>
  );
}