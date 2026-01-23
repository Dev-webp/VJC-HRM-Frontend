import React, { useState } from "react";

export default function LeaveRequestsSection({
  leaveRequests,
  message,
  updateRemarks,
  handleLeaveAction,
  deleteLeaveRequest,
  statusColor,
  premiumStyles,
}) {
  const [search, setSearch] = useState("");
  const [scrollIdx, setScrollIdx] = useState(0);

  const filteredRequests = leaveRequests.filter((req) =>
    (req.employee_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (req.employee_email || "").toLowerCase().includes(search.toLowerCase())
  );

  const visibleRequests = filteredRequests.slice(scrollIdx, scrollIdx + 10);
  const showPrev = scrollIdx > 0;
  const showNext = scrollIdx + 10 < filteredRequests.length;

  return (
    <div style={premiumStyles.contentBoxNoMargin}>
      <h3 style={{ ...premiumStyles.sectionTitle, borderBottom: "none" }}>📝 Leave Requests Management</h3>
      {message && <p style={premiumStyles.message}>{message}</p>}

      {/* Search Section */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setScrollIdx(0); }}
          style={{ ...premiumStyles.input, maxWidth: 320, borderColor: "#e67e22", background: "#fff8f1" }}
          placeholder="Search by name or email"
        />
        <span style={{ fontSize: 13, color: "#999" }}>
          Showing {visibleRequests.length} of {filteredRequests.length}
        </span>
      </div>

      {visibleRequests.length === 0 ? (
        <p style={premiumStyles.emptyText}>No leave requests found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={premiumStyles.table}>
            <thead>
              <tr style={premiumStyles.table.headerRow}>
                <th style={premiumStyles.table.headerCell}>Employee Details</th>
                <th style={premiumStyles.table.headerCell}>Leave Type</th>
                <th style={premiumStyles.table.headerCell}>Duration</th>
                <th style={premiumStyles.table.headerCell}>Reason</th>
                <th style={premiumStyles.table.headerCell}>Status</th>
                <th style={premiumStyles.table.headerCell}>Remarks & History</th>
                <th style={premiumStyles.table.headerCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((req, idx) => (
                <tr key={req.id} style={premiumStyles.table.dataRow}>
                  <td style={premiumStyles.table.dataCell}>
                    <strong>{req.employee_name}</strong><br />
                    <small>{req.employee_email}</small><br />
                    <small style={{color: '#888'}}>ID: {req.employee_id}</small>
                  </td>
                  <td style={premiumStyles.table.dataCell}>{req.leave_type}</td>
                  <td style={premiumStyles.table.dataCell}>
                    {req.start_date} <br/> to <br/> {req.end_date}
                  </td>
                  <td style={premiumStyles.table.dataCell}>{req.reason || "-"}</td>
                  <td style={{ ...premiumStyles.table.dataCell, ...statusColor(req.status), fontWeight: "bold" }}>
                    {req.status}
                  </td>

                  {/* REMARKS & ACTIONED BY LOGIC - EXACTLY AS PER YOUR ORIGINAL REQUEST */}
                  <td style={premiumStyles.table.dataCell}>
                    {req.status.toLowerCase() === "pending" ? (
                      <input
                        type="text"
                        value={req.remarksInput}
                        placeholder="Enter remarks..."
                        onChange={(e) => updateRemarks(idx + scrollIdx, e.target.value)}
                        style={premiumStyles.input}
                      />
                    ) : (
                      <div style={{ lineHeight: "1.4" }}>
                        <span style={{ fontSize: "0.9em", color: "#333", fontWeight: "500" }}>
                          {req.chairman_remarks || "-"}
                        </span>
                        {(req.actioned_by_role || req.actioned_by_name) && (
                          <div style={{ marginTop: "4px" }}>
                            <span style={{ color: "#e67e22", fontSize: "0.8em", fontStyle: "italic", fontWeight: "600" }}>
                              {req.status.toLowerCase() === "approved" ? "✅ Approved By: " : "❌ Rejected By: "}
                              {req.actioned_by_role || ""}
                              {req.actioned_by_name ? ` - ${req.actioned_by_name}` : ""}
                            </span>
                          </div>
                        )}
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
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px 0" }}>
            <button 
              disabled={!showPrev} 
              onClick={() => setScrollIdx(scrollIdx - 10)} 
              style={{ ...premiumStyles.btn, backgroundColor: showPrev ? "#34495e" : "#eee", width: 100 }}
            >
              ◀ Previous
            </button>
            <span style={{ margin: "0 20px", fontWeight: "600", color: "#7f8c8d" }}>
              Page {Math.floor(scrollIdx / 10) + 1}
            </span>
            <button 
              disabled={!showNext} 
              onClick={() => setScrollIdx(scrollIdx + 10)} 
              style={{ ...premiumStyles.btn, backgroundColor: showNext ? "#34495e" : "#eee", width: 100 }}
            >
              Next ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}