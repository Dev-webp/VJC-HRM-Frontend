/* eslint-disable */
import React, { useEffect, useState } from "react";
import axios from "axios";

const styles = {
  section: {
    marginBottom: 40,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
  },
  btn: {
    cursor: "pointer",
    padding: "8px 14px",
    borderRadius: 5,
    border: "none",
    fontWeight: "600",
    color: "#fff",
    backgroundColor: "#007bff",
    transition: "background-color 0.3s ease",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
  },
  td: {
    border: "1px solid #ddd",
    padding: 8,
  },
  summaryBox: {
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 5px 10px rgba(0,0,0,0.1)",
    maxWidth: 600,
    marginTop: 30,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  monthSelector: {
    marginBottom: 20,
    fontWeight: "600",
    fontSize: 16,
  },
  monthInput: {
    marginLeft: 12,
    padding: 6,
    fontSize: 16,
  },
  searchInput: {
    padding: 8,
    fontSize: 16,
    width: "100%",
    maxWidth: 400,
    marginBottom: 20,
    borderRadius: 5,
    border: "1px solid #ccc",
  },
  closeBtn: {
    marginTop: 15,
    backgroundColor: "#dc3545",
  },
};

export default function ChairmanDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch employees list
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await axios.get("https://backend.vjcoverseas.com/all-attendance", {
          withCredentials: true,
        });
        const data = res.data;
        const usersList = Object.entries(data).map(([email, info]) => ({
          email,
          name: info.name,
          role: info.role,
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

  // Fetch attendance summary for selected employee and month
  async function fetchAttendanceSummary(email, month) {
    try {
      if (!email) {
        alert("Please select an employee");
        return;
      }
      if (!month) {
        alert("Please select a month");
        return;
      }
      const res = await axios.post(
        "https://backend.vjcoverseas.com/get-attendance-summary",
        { email, month },
        { withCredentials: true }
      );
      setAttendanceSummary(res.data);
      setSelectedUserEmail(email);
    } catch (error) {
      console.error("Failed to fetch attendance summary", error);
      setAttendanceSummary(null);
      setSelectedUserEmail(null);
      alert("Error fetching attendance summary.");
    }
  }

  // Re-fetch attendance summary when selectedUserEmail OR selectedMonth changes
  useEffect(() => {
    if (selectedUserEmail && selectedMonth) {
      fetchAttendanceSummary(selectedUserEmail, selectedMonth);
    }
  }, [selectedUserEmail, selectedMonth]);

  // Filter users by search term (match email or name)
  const filteredUsers = users.filter(({ email, name }) => {
    const term = searchTerm.toLowerCase();
    return (
      email.toLowerCase().includes(term) ||
      (name && name.toLowerCase().includes(term))
    );
  });

  // Close attendance summary
  const closeSummary = () => {
    setAttendanceSummary(null);
    setSelectedUserEmail(null);
  };

  return (
    <section style={styles.section}>
      <h2>👤 Chairman Dashboard - Attendance Summary</h2>

      {/* Month selector */}
      <div style={styles.monthSelector}>
        Select Month:{" "}
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={styles.monthInput}
        />
      </div>

      {/* Search input */}
      <input
        type="text"
        placeholder="Search by Email or Name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={styles.searchInput}
      />

      <p>
        Select an employee to view attendance summary for <b>{selectedMonth}</b>.
      </p>

      <div>
        <h3>Employee List</h3>
        {loading ? (
          <p>Loading employees...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.td}>Email</th>
                <th style={styles.td}>Name</th>
                <th style={styles.td}>Role</th>
                <th style={styles.td}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length ? (
                filteredUsers.map(({ email, name, role }) => (
                  <tr key={email}>
                    <td style={styles.td}>{email}</td>
                    <td style={styles.td}>{name}</td>
                    <td style={styles.td}>{role}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.btn}
                        onClick={() => fetchAttendanceSummary(email, selectedMonth)}
                      >
                        View Summary
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={styles.td} colSpan={4} align="center">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {attendanceSummary && (
        <div style={styles.summaryBox}>
          <h3>Attendance Summary for {selectedUserEmail}</h3>
          <div style={styles.summaryRow}>
            <span>Total Days:</span>
            <span>{attendanceSummary?.totalDays ?? 0}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Sundays:</span>
            <span>{attendanceSummary?.sundays ?? 0}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Full Days:</span>
            <span>{attendanceSummary?.fullDays ?? 0}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Half Days:</span>
            <span>{attendanceSummary?.halfDays ?? 0}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Paid Leaves:</span>
            <span>{attendanceSummary?.paidLeaves ?? 0}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Absent Days:</span>
            <span>{attendanceSummary?.absentDays ?? 0}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Work Days:</span>
            <span>{attendanceSummary?.workDays ?? 0}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Average Per Day:</span>
            <span>
              {attendanceSummary && attendanceSummary.totalDays > 0
                ? attendanceSummary.averagePerDay?.toFixed(4)
                : "0.0000"}
            </span>
          </div>
          <button style={{ ...styles.btn, ...styles.closeBtn }} onClick={closeSummary}>
            Close Summary
          </button>
        </div>
      )}
    </section>
  );
}
