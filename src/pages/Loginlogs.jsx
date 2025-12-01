/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import axios from "axios";

const LoginLogs = () => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backendBaseUrl =
    window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://backend.vjcoverseas.com";

  // Load logs on page load
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${backendBaseUrl}/login-logs`, {
        withCredentials: true,
      });
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error("Error loading logs:", err);
      setError("Failed to load login logs. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  // Live Search
  const filteredLogs = logs.filter((row) =>
    Object.values(row || {}).some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  );

  return (
    <div style={styles.pageContainer}>
      {/* Header Section */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🔐 Login Activity Dashboard</h1>
          <p style={styles.subtitle}>
            Track all user login attempts with detailed device &amp; location info
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          style={styles.refreshBtn}
        >
          {loading ? "🔄 Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Error Alert */}
      {error && <div style={styles.errorAlert}>❌ {error}</div>}

      {/* Search & Stats */}
      <div style={styles.searchStatsContainer}>
        <input
          type="text"
          placeholder="🔍 Search by User ID, Name, Email, City, IP, Browser..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />

        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{logs.length}</span>
            <span style={styles.statLabel}>Total Logs</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{filteredLogs.length}</span>
            <span style={styles.statLabel}>Filtered</span>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p>Loading login logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📊</div>
            <h3>No login logs found</h3>
            <p>
              {search
                ? `No results match "${search}"`
                : "No login activity recorded yet."}
            </p>
            <button onClick={fetchLogs} style={styles.emptyBtn}>
              Refresh Data
            </button>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                
                  <th style={styles.th}>👤 User</th>
                    <th style={styles.th}>ID</th>
                  <th style={styles.th}>📧 Email</th>
                  <th style={styles.th}>🕒 Time</th>
                  <th style={styles.th}>🌍 Location</th>
                  <th style={styles.th}>📱 Device</th>
                  <th style={styles.th}>🌐 IP</th>
                  <th style={styles.th}>✅ Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((row) => (
                  <tr key={row.id} style={styles.tr(row.success)}>
                    

                    {/* USER NAME + USER ID */}
                    <td style={styles.td}>
                      <strong>{row.user_name || "N/A"}</strong>
                      </td>
                      <td style={styles.td}>
                      <small>ID: {row.user_id ?? "—"}</small>
                    </td>

                    {/* EMAIL */}
                    <td style={styles.td}>
                      <span>{row.user_email || row.email_id || "N/A"}</span>
                    </td>

                    {/* TIME */}
                    <td style={styles.td}>
                      {row.login_time
                        ? new Date(row.login_time).toLocaleString("en-IN")
                        : "—"}
                    </td>

                    {/* LOCATION */}
                    <td style={styles.td}>
                      <div>
                        <strong>
                          {row.city || "N/A"}, {row.country || "N/A"}
                        </strong>
                        <br />
                        <small>{row.isp_org || "Unknown ISP"}</small>
                      </div>
                    </td>

                    {/* DEVICE */}
                    <td style={styles.td}>
                      <div>
                        <strong>{row.os_name || "N/A"}</strong>
                        <br />
                        <small>
                          {(row.browser_name || "Browser")} on{" "}
                          {row.device_name || "Device"}
                        </small>
                      </div>
                    </td>

                    {/* IP */}
                    <td style={styles.td}>
                      <code style={styles.ip}>{row.ip_address || "—"}</code>
                    </td>

                    {/* STATUS */}
                    <td style={styles.statusCell}>
                      <span style={styles.statusBadge(row.success)}>
                        {row.success ? "✅ Success" : "❌ Failed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Modern, User-Friendly Styles
const styles = {
  pageContainer: {
    padding: "30px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    background: "rgba(255,255,255,0.95)",
    padding: "25px 30px",
    borderRadius: "20px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
    marginBottom: "30px",
    backdropFilter: "blur(10px)",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: "32px",
    fontWeight: "900",
    margin: 0,
    background: "linear-gradient(135deg, #FF8C1A, #FF6B35)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    lineHeight: 1.2,
  },
  subtitle: {
    color: "#64748b",
    fontSize: "16px",
    margin: "10px 0 0 0",
    fontWeight: "500",
  },
  refreshBtn: {
    background: "linear-gradient(135deg, #FF8C1A, #FF6B35)",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 8px 25px rgba(255,140,26,0.3)",
    transition: "all 0.3s ease",
  },
  errorAlert: {
    background: "#fee2e2",
    color: "#dc2626",
    padding: "15px 20px",
    borderRadius: "12px",
    marginBottom: "25px",
    borderLeft: "5px solid #dc2626",
    fontWeight: "500",
  },
  searchStatsContainer: {
    background: "rgba(255,255,255,0.95)",
    padding: "25px 30px",
    borderRadius: "20px",
    boxShadow: "0 15px 35px rgba(0,0,0,0.08)",
    marginBottom: "30px",
    backdropFilter: "blur(10px)",
  },
  searchInput: {
    width: "100%",
    padding: "16px 20px",
    fontSize: "16px",
    border: "2px solid #e2e8f0",
    borderRadius: "15px",
    outline: "none",
    transition: "all 0.3s ease",
    background: "white",
    boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
  },
  stats: {
    display: "flex",
    gap: "30px",
    marginTop: "20px",
  },
  statItem: {
    textAlign: "center",
  },
  statNumber: {
    display: "block",
    fontSize: "28px",
    fontWeight: "900",
    color: "#FF8C1A",
    lineHeight: 1,
  },
  statLabel: {
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "500",
  },
  tableContainer: {
    background: "rgba(255,255,255,0.95)",
    borderRadius: "20px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.1)",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  },
  tableWrapper: {
    overflowX: "auto",
    maxHeight: "70vh",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  tableHeaderRow: {
    background: "linear-gradient(135deg, #FF8C1A, #FF6B35)",
  },
  th: {
    padding: "20px 15px",
    color: "white",
    fontWeight: "700",
    textAlign: "left",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
  tr: (success) => ({
    borderBottom: "1px solid #f1f5f9",
    transition: "all 0.2s ease",
    background: success ? "#f0fdf4" : "#fef2f2",
  }),
  td: {
    padding: "18px 15px",
    verticalAlign: "top",
    borderBottom: "1px solid #f8fafc",
  },
  tdSmall: {
    padding: "18px 15px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#475569",
    width: "60px",
  },
  ip: {
    background: "#f8fafc",
    padding: "4px 8px",
    borderRadius: "6px",
    fontFamily: "monospace",
    fontSize: "13px",
  },
  statusCell: {
    padding: "18px 15px",
    textAlign: "center",
  },
  statusBadge: (success) => ({
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "700",
    background: success ? "#dcfce7" : "#fecaca",
    color: success ? "#166534" : "#dc2626",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  }),
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    color: "#64748b",
  },
  loadingSpinner: {
    width: 50,
    height: 50,
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #FF8C1A",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  emptyState: {
    textAlign: "center",
    padding: "80px 40px",
    color: "#64748b",
  },
  emptyIcon: {
    fontSize: "64px",
    marginBottom: "20px",
    opacity: 0.5,
  },
  emptyBtn: {
    background: "linear-gradient(135deg, #FF8C1A, #FF6B35)",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "12px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "20px",
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default LoginLogs;
