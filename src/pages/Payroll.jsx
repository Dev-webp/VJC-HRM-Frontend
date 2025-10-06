/* eslint-disable */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";

// =================================================================
// 1. PROFESSIONAL STYLES DEFINITION
// =================================================================

const colors = {
  primary: "#0047b3", // Deep Corporate Blue
  secondary: "#007bff",
  text: "#222b48",
  background: "#f7f9fc", // Lightest Grey/Blue
  border: "#e0e0e0",
  success: "#28a745",
  danger: "#dc3545",
  warning: "#ffc107"
};

const styles = {
  // Global/Table Styles
  td: {
    padding: 15,
    borderBottom: `1px solid ${colors.border}`,
    color: colors.text,
    fontWeight: 500,
    fontSize: 15,
    background: "#ffffff",
  },
  th: {
    padding: 15,
    textAlign: "left",
    fontWeight: 700,
    fontSize: 14,
    color: "#ffffff", // White text for header
    background: colors.primary, // Solid corporate blue header
    borderBottom: `2px solid ${colors.primary}`
  },
  premiumTable: {
    width: "100%",
    borderCollapse: "collapse", // No border spacing for professional look
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)" // Subtle shadow
  },

  // Main Dashboard Layout
  mainSection: {
    marginBottom: 40,
    background: "#ffffff",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
    minHeight: 580
  },
  header: {
    fontSize: 30,
    marginBottom: 20,
    color: colors.primary,
    fontWeight: "900",
    letterSpacing: "0.02em",
    borderBottom: `3px solid ${colors.border}`,
    paddingBottom: 15
  },
  
  // Controls/Input Styles
  flexRow: {
    display: "flex",
    alignItems: "center",
    gap: 25,
    flexWrap: "wrap",
    marginBottom: 20
  },
  label: {
    fontWeight: 600,
    fontSize: 16,
    color: colors.text
  },
  monthInput: {
    fontWeight: "600",
    padding: "8px 15px",
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    fontSize: 16,
    color: colors.text,
    cursor: "pointer",
    backgroundColor: "#ffffff"
  },
  holidayCount: {
    fontWeight: 600,
    fontSize: 16,
    color: colors.text,
  },
  searchInput: {
    padding: 12,
    fontSize: 16,
    width: "100%",
    maxWidth: 400,
    marginBottom: 25,
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    outline: "none",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
    transition: "border-color 0.2s"
  },
  
  // Action Button (Neutral/Professional)
  effectButton: {
    cursor: "pointer",
    background: colors.secondary,
    color: "#fff",
    border: "none",
    outline: "none",
    borderRadius: 4,
    padding: "8px 18px",
    fontSize: 15,
    fontWeight: 600,
    transition: "background-color .2s",
    boxShadow: "0 2px 6px rgba(0, 123, 255, 0.3)",
    minWidth: 120
  },

  // Modal Styles
  overlayStyles: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    background: "rgba(10, 25, 47, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modalStyles: {
    minWidth: 420,
    maxWidth: 600,
    background: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
    padding: "30px",
    position: "relative",
  },
  closeXStyles: {
    position: "absolute",
    top: 15, right: 15,
    fontSize: 30,
    background: "none",
    border: "none",
    color: colors.danger,
    cursor: "pointer",
    fontWeight: 800,
    transition: "color .18s",
    zIndex: 10
  },
  summaryDetailRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 16,
    padding: "10px 0",
    borderBottom: `1px solid ${colors.border}`,
    fontWeight: 500,
    color: colors.text
  },
  summaryNumber: (color = colors.secondary, weight = 700) => ({
    fontFamily: "Arial, sans-serif",
    fontWeight: weight,
    color: color,
    fontSize: 16
  }),
};

// =================================================================
// 2. UTILITY FUNCTIONS
// =================================================================

// Dynamically set baseUrl
const baseUrl = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://backend.vjcoverseas.com";

// Helper: days in month from "YYYY-MM"
function daysInMonth(month) {
  const [year, mon] = month.split("-");
  return new Date(parseInt(year), parseInt(mon), 0).getDate();
}

// =================================================================
// 3. MODAL COMPONENT (Extracted for cleaner main component)
// =================================================================

function AttendanceSummaryModal({
  attendanceSummary,
  selectedUser,
  selectedMonth,
  holidaysCount,
  userSalary,
  netSalary,
  calculatedAbsentDays,
  closeModal
}) {
  if (!attendanceSummary || !selectedUser) return null;

  return (
    <div style={styles.overlayStyles} onClick={closeModal}>
      <div
        style={styles.modalStyles}
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
      >
        <button style={styles.closeXStyles} onClick={closeModal} title="Close Modal">×</button>
        <h2 style={{
          fontWeight: 700, fontSize: 24, color: colors.primary,
          marginBottom: 5
        }}>
          Payroll Summary - {selectedMonth}
        </h2>
        <p style={{
          fontWeight: 600, color: colors.text, marginBottom: 20, fontSize: 16
        }}>
          Employee: {selectedUser.name} <span style={{ color: colors.secondary }}>({selectedUser.email})</span>
        </p>

        <div style={{ padding: "0 0 10px 0" }}>
          <div style={styles.summaryDetailRow}>
            <span>Total Days in Month:</span>
            <span style={styles.summaryNumber()}>{daysInMonth(selectedMonth)}</span>
          </div>
          <div style={styles.summaryDetailRow}>
            <span>Total Sundays:</span>
            <span style={styles.summaryNumber()}>{attendanceSummary.sundays ?? 0}</span>
          </div>
          <div style={styles.summaryDetailRow}>
            <span>Company Holidays:</span>
            <span style={styles.summaryNumber()}>{holidaysCount}</span>
          </div>
          <div style={styles.summaryDetailRow}>
            <span>Full Attendance Days:</span>
            <span style={styles.summaryNumber(colors.secondary)}>{attendanceSummary.fullDays ?? 0}</span>
          </div>
          <div style={styles.summaryDetailRow}>
            <span>Half Days :</span>
            <span style={styles.summaryNumber(colors.secondary)}>{attendanceSummary.halfDays ?? 0}</span>
          </div>
          <div style={styles.summaryDetailRow}>
            <span>Paid Leaves Applied:</span>
            <span style={styles.summaryNumber(colors.success)}>{attendanceSummary.paidLeaves ?? 0}</span>
          </div>
        </div>
        
        <div style={{ padding: "15px 0", borderTop: `2px solid ${colors.border}` }}>
          <div style={styles.summaryDetailRow}>
            <span style={{ fontWeight: 700 }}>Total Working Days:</span>
            <span style={styles.summaryNumber(colors.success, 700)}>{attendanceSummary.workDays ?? 0}</span>
          </div>
          <div style={{ ...styles.summaryDetailRow, borderBottom: `2px solid ${colors.border}` }}>
            <span style={{ fontWeight: 700 }}>Total Absent Days:</span>
            <span style={styles.summaryNumber(colors.danger, 700)}>{calculatedAbsentDays}</span>
          </div>

          <div style={{ ...styles.summaryDetailRow, marginTop: 15 }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Gross Monthly Salary:</span>
            <span style={{ ...styles.summaryNumber(colors.primary, 800), fontSize: 18 }}>
              ₹ {userSalary.toLocaleString()}
            </span>
          </div>
          <div style={styles.summaryDetailRow}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Net Salary Payable:</span>
            <span style={{ ...styles.summaryNumber("#d9534f", 800), fontSize: 18 }}>
              ₹ {netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        
        <button
          style={{
            ...styles.effectButton,
            marginTop: 25,
            float: 'right',
            background: colors.danger,
            boxShadow: "0 2px 6px rgba(220, 53, 69, 0.4)"
          }}
          onClick={closeModal}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// =================================================================
// 4. MAIN COMPONENT
// =================================================================

export default function ChairmanDashboard() {
  // State Hooks
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");
  const [holidaysCount, setHolidaysCount] = useState(0);
  const [userSalary, setUserSalary] = useState(0);
  const [netSalary, setNetSalary] = useState(0);
  const [calculatedAbsentDays, setCalculatedAbsentDays] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Helper Functions for API calls
  const fetchHolidays = useCallback(async (month) => {
    try {
      const res = await axios.get(`${baseUrl}/holidays-count?month=${month}`, { withCredentials: true });
      const count = res.data.count ?? 0;
      setHolidaysCount(count);
      return count;
    } catch (error) {
      console.error("Failed to fetch holidays count", error);
      setHolidaysCount(0);
      return 0;
    }
  }, []);

  const fetchAttendanceSummary = useCallback(async (user, month) => {
    if (!user || !month) return;

    try {
      const attendanceRes = await axios.post(
        `${baseUrl}/get-attendance-summary`,
        { email: user.email, month },
        { withCredentials: true }
      );

      const summary = attendanceRes.data;
      const salary = user.salary ?? 0;
      const holidayCount = await fetchHolidays(month); 

      const totalDays = daysInMonth(month);
      const workDays = summary?.workDays ?? 0;
      
      // Calculate absent days (Total days - Paid days)
      const absentsCalc = totalDays - workDays;
      const finalAbsentDays = absentsCalc > 0 ? absentsCalc : 0;
      
      const perDaySalary = salary / totalDays;
      const net = salary - finalAbsentDays * perDaySalary;

      setAttendanceSummary(summary);
      setSelectedUser(user);
      setUserSalary(salary);
      setNetSalary(net >= 0 ? net : 0);
      setCalculatedAbsentDays(finalAbsentDays);
      setModalOpen(true);
    } catch (error) {
      console.error("Failed to fetch attendance summary", error);
      alert("Error fetching attendance summary.");
    }
  }, [fetchHolidays]);

  // Effect to fetch initial user list
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await axios.get(`${baseUrl}/all-attendance`, { withCredentials: true });
        const data = res.data;
        const usersList = Object.entries(data).map(([email, info]) => ({
          email,
          name: info.name,
          role: info.role,
          salary: info.salary ?? 0,
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Failed to fetch users", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  // Effect to refetch summary when the month changes, if a user is already selected
  useEffect(() => {
    if (selectedUser && selectedMonth) {
      // Re-fetch the summary for the already selected user when month changes
      fetchAttendanceSummary(selectedUser, selectedMonth);
    } else {
      // Just fetch holidays if no user is selected
      fetchHolidays(selectedMonth);
    }
    // eslint-disable-next-line
  }, [selectedMonth]); 

  // Memoized function for filtered users
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(({ email, name }) => {
      return (
        email.toLowerCase().includes(term) ||
        (name && name.toLowerCase().includes(term))
      );
    });
  }, [users, searchTerm]);

  // Handler to open the summary modal
  function openSummaryPopup(user) {
    fetchAttendanceSummary(user, selectedMonth);
  }

  return (
    <section style={styles.mainSection}>
      {/* Header Section */}
      <h2 style={styles.header}>
        📊 Payroll & Attendance Summary
      </h2>
      
      {/* Controls Section */}
      <div style={styles.flexRow}>
        <span style={styles.label}>Select Month:</span>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={styles.monthInput}
        />
        <span style={styles.holidayCount}>
          Public Holidays: <span style={styles.summaryNumber(colors.danger)}>{holidaysCount}</span>
        </span>
      </div>

      <input
        type="text"
        placeholder="🔍 Search Employee by Email or Name..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        style={styles.searchInput}
      />
      
      <p style={{ color: colors.text, fontSize: 15, marginTop: -15, marginBottom: 30 }}>
        Select an employee to view their detailed attendance and payroll calculation for **{selectedMonth}**.
      </p>

      {/* Employee Table Section */}
      {loading ? (
        <p style={{ padding: 30, textAlign: "center", fontSize: 18, color: "#555" }}>Loading employee data...</p>
      ) : (
        <table style={styles.premiumTable}>
          <thead>
            <tr>
              <th style={{ ...styles.th, borderTopLeftRadius: 8 }}>Email</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Role</th>
              <th style={{ ...styles.th, textAlign: "center", borderTopRightRadius: 8 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length ? (
              filteredUsers.map((user) => (
                <tr key={user.email} style={{ transition: 'background-color 0.15s' }}>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>{user.name}</td>
                  <td style={styles.td}>{user.role}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button
                      style={styles.effectButton}
                      onClick={() => openSummaryPopup(user)}
                    >
                      View Summary
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={{ ...styles.td, textAlign: "center", padding: 20 }} colSpan={4}>
                  No employees found matching the search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Pop-up Modal Component */}
      {modalOpen && (
        <AttendanceSummaryModal
          attendanceSummary={attendanceSummary}
          selectedUser={selectedUser}
          selectedMonth={selectedMonth}
          holidaysCount={holidaysCount}
          userSalary={userSalary}
          netSalary={netSalary}
          calculatedAbsentDays={calculatedAbsentDays}
          closeModal={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}