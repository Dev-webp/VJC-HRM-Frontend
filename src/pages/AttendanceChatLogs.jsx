import React, { useEffect, useState } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

export default function AttendanceChatLogs() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedUserEmail, setExpandedUserEmail] = useState(null);
  const [showCards, setShowCards] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);

  // Edit states
  const [editLogUserEmail, setEditLogUserEmail] = useState(null);
  const [editLogData, setEditLogData] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Fetch logged in user's role and location
  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const res = await axios.get(`${baseUrl}/me`, {
          withCredentials: true,
        });
        setCurrentUserRole(res.data.role);
        setCurrentUserLocation(res.data.location);
      } catch (err) {
        console.error("Failed to fetch user info", err);
      }
    }
    fetchUserInfo();
  }, []);

  const fetchAttendanceLogs = async () => {
    setLoading(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    try {
      const res = await axios.get(`${baseUrl}/all-attendance?month=${month}`, {
        withCredentials: true,
      });
      const usersObj = res.data || {};
      const usersArray = Object.entries(usersObj).map(([email, user]) => ({
        email,
        ...user,
      }));
      setAttendanceData(usersArray);
    } catch (error) {
      setError("Failed to fetch attendance logs");
      setAttendanceData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendanceLogs();
  }, []);

  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);
  const formattedToday = todayDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatTime = (t) => (t ? t.slice(0, 5) : "-");

  // Filter attendance data based on role and location
  const filteredAttendanceData = attendanceData.filter((user) => {
    if (currentUserRole === "chairman" || currentUserRole === "front-desk") {
      return true;
    } else if (currentUserRole === "manager") {
      return user.location === currentUserLocation;
    }
    return false;
  });

  const userLogs = filteredAttendanceData
    .map((user) => {
      const todayAttendance = (user.attendance || []).find(
        (a) => a.date === todayStr
      ) || {};
      return { ...user, todayAttendance };
    })
    .sort((a, b) => {
      if (a.todayAttendance.office_in && !b.todayAttendance.office_in)
        return -1;
      if (!a.todayAttendance.office_in && b.todayAttendance.office_in)
        return 1;
      const nameA = a.name || a.email;
      const nameB = b.name || b.email;
      return nameA.localeCompare(nameB);
    });

const userLogsNoChairman = userLogs.filter(user => user.role !== "chairman");
const totalUsers = userLogsNoChairman.length;
const presentUsers = userLogsNoChairman.filter(u => u.todayAttendance.office_in).length;
const absentUsers = totalUsers - presentUsers;


  // Edit logic
  const startEditLogs = (user) => {
    setEditLogUserEmail(user.email);
    const editObj = {};
    (user.attendance || []).forEach((log) => {
      editObj[log.date] = { ...log };
    });
    setEditLogData(editObj);
  };

  const handleLogFieldChange = (date, field, value) => {
    setEditLogData((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: value,
      },
    }));
  };

  // Save attendance edits
  const saveEditedLogs = async (userEmail) => {
    setEditSaving(true);
    try {
      await axios.put(
        `${baseUrl}/edit-attendance/${encodeURIComponent(userEmail)}`,
        { logs: Object.values(editLogData) },
        { withCredentials: true }
      );
      setEditLogUserEmail(null);
      setEditLogData({});
      fetchAttendanceLogs();
    } catch (e) {
      alert("Failed to save edits.");
    }
    setEditSaving(false);
  };

  const ExpandedLogSection = ({ user }) => {
    const isEditing = editLogUserEmail === user.email;
    return (
      <div style={premiumStyles.expandedModalBackdrop}>
        <div style={premiumStyles.expandedModalContent}>
          <div style={premiumStyles.modalHeader}>
            <h2>
              Monthly Attendance Log for{" "}
              <span style={{ color: premiumStyles.viewLogButton.backgroundColor }}>
                {user.name || user.email}
              </span>
            </h2>
            <div>
              {!isEditing && (
                <button
                  style={{ ...premiumStyles.viewLogButton, marginRight: 10 }}
                  onClick={() => startEditLogs(user)}
                >
                  Edit
                </button>
              )}
              {isEditing && (
                <button
                  style={{ ...premiumStyles.viewLogButton, marginRight: 10, background: "#10b981" }}
                  disabled={editSaving}
                  onClick={() => saveEditedLogs(user.email)}
                >
                  {editSaving ? "Saving..." : "Save"}
                </button>
              )}
              <button
                style={premiumStyles.modalCloseButton}
                onClick={() => {
                  setExpandedUserEmail(null);
                  setEditLogUserEmail(null);
                  setEditLogData({});
                }}
              >
                &times;
              </button>
            </div>
          </div>
          <div style={premiumStyles.tableWrapper}>
            <table style={premiumStyles.table}>
              <thead>
                <tr style={premiumStyles.tableHeaderRow}>
                  <th style={premiumStyles.tableTh}>DATE</th>
                  <th style={premiumStyles.tableTh}>LOGIN</th>
                  <th style={premiumStyles.tableTh}>B.IN</th>
                  <th style={premiumStyles.tableTh}>B.OUT</th>
                  <th style={premiumStyles.tableTh}>L.IN</th>
                  <th style={premiumStyles.tableTh}>L.OUT</th>
                  <th style={premiumStyles.tableTh}>B2.IN</th>
                  <th style={premiumStyles.tableTh}>B2.OUT</th>
                   <th style={premiumStyles.tableTh}>LOGOUT</th>
                  <th style={premiumStyles.tableTh}>EXTRA BREAK INS</th>
                  <th style={premiumStyles.tableTh}>EXTRA BREAK OUTS</th>
                 
                  <th style={premiumStyles.tableTh}>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {(user.attendance || []).map((log) => {
                  const rowIsToday = log.date === todayStr;
                  const rowData =
                    isEditing && editLogData[log.date]
                      ? editLogData[log.date]
                      : log;
                  return (
                    <tr
                      key={log.date}
                      style={{
                        ...premiumStyles.tableBodyRow,
                        ...(rowIsToday ? premiumStyles.highlightRow : {}),
                      }}
                    >
                      <td style={premiumStyles.tableTd}>{log.date}</td>
                      {[
                        "office_in",
                        "break_in",
                        "break_out",
                        "lunch_in",
                        "lunch_out",
                        "break_in_2",
                        "break_out_2",
                        "office_out",
                      ].map((field) => (
                        <td style={premiumStyles.tableTd} key={field}>
                          {isEditing ? (
                            <input
                              type="time"
                              value={
                                rowData[field] ? rowData[field].slice(0, 5) : ""
                              }
                              onChange={(e) =>
                                handleLogFieldChange(
                                  log.date,
                                  field,
                                  e.target.value
                                )
                              }
                              style={{ width: 86 }}
                            />
                          ) : (
                            formatTime(log[field])
                          )}
                        </td>
                      ))}
                      <td
                        style={{
                          ...premiumStyles.tableTd,
                          whiteSpace: "pre-wrap",
                          textAlign: "center",
                          fontSize: 12,
                        }}
                      >
                        {isEditing ? (
                          <input
                            style={{ width: "100px" }}
                            value={(rowData.extra_break_ins || []).join(",")}
                            placeholder="09:00,16:24"
                            onChange={(e) =>
                              handleLogFieldChange(
                                log.date,
                                "extra_break_ins",
                                e.target.value
                                  .split(",")
                                  .map((v) => v.trim())
                                  .filter(Boolean)
                              )
                            }
                          />
                        ) : log.extra_break_ins && log.extra_break_ins.length > 0 ? (
                          log.extra_break_ins.map((t) => t || "-").join("\n")
                        ) : (
                          "-"
                        )}
                      </td>
                      <td
                        style={{
                          ...premiumStyles.tableTd,
                          whiteSpace: "pre-wrap",
                          textAlign: "center",
                          fontSize: 12,
                        }}
                      >
                        {isEditing ? (
                          <input
                            style={{ width: "100px" }}
                            value={(rowData.extra_break_outs || []).join(",")}
                            placeholder="12:00,18:02"
                            onChange={(e) =>
                              handleLogFieldChange(
                                log.date,
                                "extra_break_outs",
                                e.target.value
                                  .split(",")
                                  .map((v) => v.trim())
                                  .filter(Boolean)
                              )
                            }
                          />
                        ) : log.extra_break_outs && log.extra_break_outs.length > 0 ? (
                          log.extra_break_outs.map((t) => t || "-").join("\n")
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={premiumStyles.tableTd}>
                        {isEditing ? (
                          <input
                            style={{ width: 140 }}
                            value={rowData.paid_leave_reason || rowData.reason || ""}
                            placeholder="Remarks"
                            onChange={(e) =>
                              handleLogFieldChange(
                                log.date,
                                rowData.paid_leave_reason
                                  ? "paid_leave_reason"
                                  : "reason",
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          log.paid_leave_reason || log.reason || "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const expandedUser = userLogs.find((u) => u.email === expandedUserEmail);

  return (
    <div style={premiumStyles.container}>
      <div style={premiumStyles.summaryBar}>
        <div style={premiumStyles.dateDisplay}>
          <span style={{ fontSize: "1.2rem", marginRight: 10 }}>📅</span>
          <strong>{formattedToday}</strong>
        </div>

        <div style={premiumStyles.statsGroup}>
          <div style={premiumStyles.summaryItem}>
            <span style={premiumStyles.statLabel}>Total Employees:</span>
            <span style={premiumStyles.statValue}>{totalUsers}</span>
          </div>
          <div style={{ ...premiumStyles.summaryItem, color: "#10b981" }}>
            <span style={premiumStyles.statLabel}>Present Today:</span>
            <span style={premiumStyles.statValue}>{presentUsers}</span>
          </div>
          <div style={{ ...premiumStyles.summaryItem, color: "#ef4444" }}>
            <span style={premiumStyles.statLabel}>Absent Today:</span>
            <span style={premiumStyles.statValue}>{absentUsers}</span>
          </div>
        </div>

        <button
          style={premiumStyles.showUsersButton}
          onClick={() => setShowCards(!showCards)}
        >
          {showCards ? "Hide User Cards" : "Show User Cards"}
        </button>
      </div>

      {error && <div style={premiumStyles.error}>{error}</div>}

      {loading ? (
        <div style={premiumStyles.loading}>Loading attendance records...</div>
      ) : (
        showCards && (
          <div style={premiumStyles.cardsContainer}>
          {userLogs
  .filter(user => user.role !== "chairman") // hide chairman user card ONLY
  .map((user) => {
    const isPresent = user.todayAttendance.office_in;
    return (
      <div
        key={user.email}
                  style={{
                    ...premiumStyles.card,
                    borderLeft: isPresent
                      ? "5px solid #10b981"
                      : "5px solid #ef4444",
                  }}
                >
                  <div style={premiumStyles.cardContent}>
                    <div>
                      <span style={premiumStyles.cardName}>
                        {user.name || "Unknown Employee"}
                      </span>
                      <div style={premiumStyles.cardEmail}>{user.email}</div>
                    </div>
                    <button
                      style={premiumStyles.viewLogButton}
                      onClick={() => setExpandedUserEmail(user.email)}
                    >
                      View Logs
                    </button>
                  </div>

                  <div style={premiumStyles.todayAttendance}>
                    <div
                      style={{
                        color: isPresent ? "#10b981" : "#ef4444",
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      {isPresent ? "🟢 Present Today" : "🔴 Absent Today"}
                    </div>
                    {isPresent ? (
                      <div style={premiumStyles.logLine}>
                        <span style={premiumStyles.logLabel}>Login:</span>
                        <span style={premiumStyles.logTime}>
                          {formatTime(user.todayAttendance.office_in)}
                        </span>
                      </div>
                    ) : (
                      <div style={premiumStyles.logLine}>
                        <span style={premiumStyles.logLabel}>Status:</span>
                        <span style={premiumStyles.logTime}>
                          {user.todayAttendance.paid_leave_reason ||
                            user.todayAttendance.reason ||
                            "Not Logged In"}
                        </span>
                      </div>
                    )}
                    {user.todayAttendance.office_out && (
                      <div style={premiumStyles.logLine}>
                        <span style={premiumStyles.logLabel}>Logout:</span>
                        <span style={premiumStyles.logTime}>
                          {formatTime(user.todayAttendance.office_out)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {expandedUser && <ExpandedLogSection user={expandedUser} />}
    </div>
  );
}

const premiumStyles = {
  container: {
    width: "100%",
    fontFamily: "'Inter', sans-serif",
    minHeight: "auto",
    height: "auto",
    padding: "30px 20px",
  },
  summaryBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 25px",
    backgroundColor: "#1e40af",
    borderRadius: 12,
    color: "#f9fafb",
    marginBottom: 30,
    boxShadow: "0 4px 20px rgb(30 64 175 / 0.3)",
    flexWrap: "wrap",
    border: "none",
    boxSizing: "border-box",
    fontSize: "1.1rem",
    fontWeight: "700",
    letterSpacing: "0.04em",
  },
  dateDisplay: {
    display: "flex",
    alignItems: "center",
    fontWeight: 600,
    color: "#e0e7ff",
    paddingRight: 30,
    marginRight: 20,
    borderRight: "2px solid #3b82f6",
    letterSpacing: "0.05em",
  },
  statsGroup: {
    display: "flex",
    gap: 60,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingLeft: 20,
    flexGrow: 1,
  },
  summaryItem: {
    display: "flex",
    gap: 10,
    alignItems: "baseline",
  },
  statLabel: {
    fontSize: 17,
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.8)",
    whiteSpace: "nowrap",
  },
  statValue: {
    fontSize: 25,
    fontWeight: 900,
    color: "#fbbf24",
    textShadow: "1px 1px 2px #444",
  },
  showUsersButton: {
    backgroundColor: "#fbbf24",
    color: "#1e40af",
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    padding: "12px 28px",
    fontSize: 15,
    cursor: "pointer",
    transition: "background-color 0.3s ease",
    boxShadow: "0 5px 10px rgb(251 191 36 / 0.4)",
    userSelect: "none",
  },
  error: {
    color: "#b22222",
    backgroundColor: "#ffd4d4",
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
    fontWeight: 600,
    textAlign: "center",
    fontSize: 15,
  },
  loading: {
    textAlign: "center",
    fontWeight: "bold",
    color: "#444",
    padding: 50,
    fontSize: 18,
    fontStyle: "italic",
  },
  cardsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 25,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 10px 30px rgb(0 0 0 / 0.1)",
    boxSizing: "border-box",
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
    cursor: "default",
  },
  cardContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  cardName: {
    fontWeight: 800,
    fontSize: 20,
    color: "#1e3a8a",
    userSelect: "text",
  },
  cardEmail: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#667085",
    marginTop: 3,
  },
  viewLogButton: {
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 12px rgb(37 99 235 / 0.4)",
    transition: "background-color 0.3s ease",
    userSelect: "none",
  },
  todayAttendance: {
    fontSize: 14,
    color: "#334155",
    marginTop: 10,
  },
  expandedModalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(30, 64, 175, 0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1100,
    padding: 20,
  },
  expandedModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    boxShadow: "0 20px 40px rgba(30,64,175,0.7)",
    width: "95%",
    maxWidth: "1200px",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  modalHeader: {
    padding: "20px 30px",
    borderBottom: "2px solid #2563eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    fontWeight: "700",
    fontSize: 22,
    color: "#1e40af",
  },
  modalCloseButton: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 36,
    height: 36,
    fontSize: 26,
    cursor: "pointer",
    lineHeight: "28px",
    padding: 0,
    fontWeight: "bold",
  },
  tableWrapper: {
    overflowX: "auto",
    padding: 15,
    flexGrow: 1,
  },
  table: {
    width: "100%",
    minWidth: 1020,
    borderCollapse: "collapse",
  },
  tableTh: {
    padding: 12,
    textAlign: "center",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontWeight: 700,
    position: "sticky",
    top: 0,
    zIndex: 100,
    borderRight: "1px solid rgba(255, 255, 255, 0.15)",
    borderBottom: "2px solid #1e3a8a",
  },
  tableTd: {
    padding: 10,
    textAlign: "center",
    borderRight: "1px solid #f3f4f6",
    borderBottom: "1px solid #e0e7ff",
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.5,
  },
  highlightRow: {
    backgroundColor: "#bfdbfe",
    fontWeight: "bold",
    color: "#1e40af",
  },
};

