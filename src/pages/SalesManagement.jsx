import React, { useState, useEffect } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

function SalesManagement() {
  const [allEmployees, setAllEmployees] = useState([]);
  const [salesStats, setSalesStats] = useState({});
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const [targetAmount, setTargetAmount] = useState("");
  const [currentSales, setCurrentSales] = useState("");
  
  // New: Sales entries for selected employee
  const [salesEntries, setSalesEntries] = useState([]);
  const [viewPeriod, setViewPeriod] = useState('all');

  useEffect(() => {
    fetchAllEmployees();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllEmployees = async () => {
    try {
      const res = await axios.get(`${baseUrl}/all-attendance`, {
        withCredentials: true,
      });

      const employeesArray = Object.entries(res.data).map(([email, data]) => ({
        email,
        name: data.name,
        role: data.role,
        department: data.department,
        salary: data.salary,
        employeeId: data.employeeId,
      }));

      setAllEmployees(employeesArray);
      await fetchAllSalesStats();
    } catch (err) {
      console.error("Failed to fetch employees", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSalesStats = async () => {
    try {
      const res = await axios.get(`${baseUrl}/all-sales-stats-chairman`, {
        withCredentials: true,
      });

      const statsMap = {};
      res.data.forEach((stat) => {
        statsMap[stat.email] = stat;
      });
      setSalesStats(statsMap);
    } catch (err) {
      console.error("Failed to fetch sales stats", err);
    }
  };

  const handleSelectEmployee = async (email) => {
    setSelectedEmail(email);
    const emp = allEmployees.find((e) => e.email === email);
    setSelectedEmployee(emp);

    try {
      // Fetch sales stats
      const res = await axios.get(`${baseUrl}/sales-stats/${email}`, {
        withCredentials: true,
      });
      const data = res.data;
      setTargetAmount(data.target || "");
      setCurrentSales(data.current_sales || "");
      
      // Fetch sales entries
      const entriesRes = await axios.get(`${baseUrl}/sales-entries/${email}`, {
        withCredentials: true,
      });
      setSalesEntries(entriesRes.data || []);
    } catch {
      setTargetAmount("");
      setCurrentSales("");
      setSalesEntries([]);
    }
  };

  const handleSaveStats = async () => {
    if (!selectedEmail || !targetAmount) {
      alert("Please enter target amount");
      return;
    }

    try {
      await axios.post(
        `${baseUrl}/update-sales-target`,
        new URLSearchParams({
          employee_email: selectedEmail,
          target: targetAmount,
        }),
        { withCredentials: true }
      );

      alert("✅ Sales target updated successfully");

      await fetchAllSalesStats();
      await handleSelectEmployee(selectedEmail);
    } catch (err) {
      alert(
        "❌ Failed to update sales target: " +
          (err.response?.data?.error || err.message)
      );
    }
  };

  const calculateSalary = () => {
    if (!selectedEmployee || !targetAmount) return null;

    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentSales) || 0;
    const baseSalary = parseFloat(selectedEmployee.salary) || 0;

    if (target === 0) return { percentage: 0, payable: 0, salaryPercentage: 0 };

    const percentage = (current / target) * 100;

    let salaryPercentage = 0;
    if (percentage >= 100) salaryPercentage = 100;
    else if (percentage >= 75) salaryPercentage = 75;
    else if (percentage >= 50) salaryPercentage = 50;
    else if (percentage >= 25) salaryPercentage = 25;
    else salaryPercentage = 0;

    const payable = baseSalary * (salaryPercentage / 100);

    return {
      percentage: percentage.toFixed(1),
      salaryPercentage,
      payable: payable.toFixed(2),
      baseSalary: baseSalary.toFixed(2),
    };
  };

  const salaryInfo = calculateSalary();
  
  // Filter sales entries based on period
  const getFilteredEntries = () => {
    if (viewPeriod === 'all') return salesEntries;
    
    const now = new Date();
    let filteredEntries = [];
    
    if (viewPeriod === '10days') {
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      filteredEntries = salesEntries.filter(e => new Date(e.sale_date) >= tenDaysAgo);
    } else if (viewPeriod === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredEntries = salesEntries.filter(e => new Date(e.sale_date) >= startOfMonth);
    }
    
    return filteredEntries;
  };
  
  const filteredEntries = getFilteredEntries();
  
  // Sales breakdown by company
  const salesByCompany = filteredEntries.reduce((acc, entry) => {
    const company = entry.company || 'Other';
    if (!acc[company]) {
      acc[company] = { total: 0, count: 0 };
    }
    acc[company].total += parseFloat(entry.amount || 0);
    acc[company].count += 1;
    return acc;
  }, {});

  if (loading) {
    return <div style={styles.loading}>Loading employees...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.mainTitle}>📈 Sales Target Management</h2>
          <p style={styles.subtitle}>
            Set sales targets, track performance, and view detailed sales entries
          </p>
        </div>
      </div>

      <div style={styles.selectionSection}>
        <label style={styles.label}>Select Employee:</label>
        <select
          style={styles.select}
          onChange={(e) => handleSelectEmployee(e.target.value)}
          value={selectedEmail}
        >
          <option value="">-- Select Employee --</option>
          {allEmployees.map((emp) => (
            <option key={emp.email} value={emp.email}>
              {emp.name} ({emp.email}) - {emp.role || "Employee"}
            </option>
          ))}
        </select>
      </div>

      {selectedEmployee ? (
        <div style={styles.statsSection}>
          <div style={styles.employeeHeader}>
            <h3 style={styles.employeeName}>{selectedEmployee.name}</h3>
            <div style={styles.employeeMeta}>
              <span>{selectedEmployee.email}</span>
              <span style={styles.divider}>•</span>
              <span>{selectedEmployee.role || "Employee"}</span>
              <span style={styles.divider}>•</span>
              <span>ID: {selectedEmployee.employeeId}</span>
            </div>
          </div>

          {salaryInfo && (
            <div style={styles.salaryCard}>
              <h4 style={styles.salaryCardTitle}>💰 Salary Calculation</h4>
              <div style={styles.salaryRow}>
                <span style={styles.salaryLabel}>Base Salary:</span>
                <span style={styles.salaryValue}>
                  ₹{" "}
                  {parseFloat(selectedEmployee.salary || 0).toLocaleString(
                    "en-IN"
                  )}
                </span>
              </div>
              {targetAmount && (
                <>
                  <div style={styles.salaryRow}>
                    <span style={styles.salaryLabel}>Achievement:</span>
                    <span style={styles.salaryValue}>
                      {salaryInfo.percentage}%
                    </span>
                  </div>
                  <div style={styles.salaryRow}>
                    <span style={styles.salaryLabel}>Salary Percentage:</span>
                    <span
                      style={{
                        ...styles.salaryValue,
                        color: getSalaryColor(salaryInfo.salaryPercentage),
                      }}
                    >
                      {salaryInfo.salaryPercentage}%
                    </span>
                  </div>
                  <div style={{ ...styles.salaryRow, ...styles.netPayableRow }}>
                    <span style={styles.netPayableLabel}>Net Payable:</span>
                    <span style={styles.netPayableValue}>
                      ₹ {parseFloat(salaryInfo.payable).toLocaleString("en-IN")}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          <div style={styles.editForm}>
            <h4 style={styles.formTitle}>Set Sales Target</h4>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Sales Target (₹)</label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                style={styles.input}
                placeholder="Enter target amount (e.g., 100000)"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Current Sales (₹)</label>
              <input
                type="number"
                value={currentSales}
                onChange={(e) => setCurrentSales(e.target.value)}
                style={styles.input}
                placeholder="Enter current sales (e.g., 75000)"
                readOnly
              />
            </div>

            <button onClick={handleSaveStats} style={styles.saveButton}>
              💾 Save Target & Update Net Pay
            </button>
          </div>

          {/* Sales Entries Section */}
          {salesEntries.length > 0 && (
            <div style={styles.entriesSection}>
              <div style={styles.entriesHeader}>
                <h4 style={styles.entriesTitle}>📋 Sales Entries ({filteredEntries.length})</h4>
                
                <div style={styles.periodSelector}>
                  <button
                    onClick={() => setViewPeriod('all')}
                    style={{
                      ...styles.periodButton,
                      ...(viewPeriod === 'all' ? styles.periodButtonActive : {})
                    }}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => setViewPeriod('10days')}
                    style={{
                      ...styles.periodButton,
                      ...(viewPeriod === '10days' ? styles.periodButtonActive : {})
                    }}
                  >
                    Last 10 Days
                  </button>
                  <button
                    onClick={() => setViewPeriod('month')}
                    style={{
                      ...styles.periodButton,
                      ...(viewPeriod === 'month' ? styles.periodButtonActive : {})
                    }}
                  >
                    This Month
                  </button>
                </div>
              </div>
              
              {/* Sales Breakdown by Company */}
              {Object.keys(salesByCompany).length > 0 && (
                <div style={styles.breakdownCard}>
                  <h4 style={styles.breakdownTitle}>💼 Sales Breakdown by Company</h4>
                  <div style={styles.breakdownGrid}>
                    {Object.entries(salesByCompany).map(([company, data]) => {
                      const totalSales = parseFloat(currentSales) || 0;
                      const companyPercent = totalSales > 0 ? (data.total / totalSales) * 100 : 0;
                      return (
                        <div key={company} style={styles.breakdownItem}>
                          <div style={styles.breakdownHeader}>
                            <span style={styles.breakdownCompany}>{company}</span>
                            <span style={styles.breakdownValue}>
                              ₹{data.total.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div style={styles.breakdownMeta}>
                            {data.count} sales • {companyPercent.toFixed(1)}% of total
                          </div>
                          <div style={styles.breakdownBar}>
                            <div style={{
                              ...styles.breakdownBarFill,
                              width: `${Math.min(companyPercent, 100)}%`
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Sales Entries Table */}
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Client</th>
                      <th style={styles.th}>Company</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.td}>
                          {new Date(entry.sale_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td style={styles.td}>
                          <strong>{entry.client_name}</strong>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.companyBadge}>
                            {entry.company}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <strong style={{color: '#28a745', fontSize: '1.05rem'}}>
                            ₹ {parseFloat(entry.amount).toLocaleString('en-IN')}
                          </strong>
                        </td>
                        <td style={styles.td}>
                          {entry.remarks || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={styles.rulesCard}>
            <h4 style={styles.rulesTitle}>📋 Salary Eligibility Rules</h4>
            <ul style={styles.rulesList}>
              <li style={styles.ruleItem}>
                <span style={{ color: "#28a745", fontWeight: "bold" }}>✓</span>{" "}
                100% Target = 100% Salary
              </li>
              <li style={styles.ruleItem}>
                <span style={{ color: "#ffc107", fontWeight: "bold" }}>⚠</span>{" "}
                75-99% Target = 75% Salary
              </li>
              <li style={styles.ruleItem}>
                <span style={{ color: "#fd7e14", fontWeight: "bold" }}>⚠</span>{" "}
                50-74% Target = 50% Salary
              </li>
              <li style={styles.ruleItem}>
                <span style={{ color: "#dc3545", fontWeight: "bold" }}>✗</span>{" "}
                Below 25% Target = No Salary
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div style={styles.noSelection}>
          <p style={styles.noSelectionText}>
            👆 Select an employee above to set their sales target, view net
            payable salary, and see all sales entries
          </p>
        </div>
      )}

      {Object.keys(salesStats).length > 0 && (
        <div style={styles.overviewSection}>
          <h3 style={styles.overviewTitle}>
            Sales Overview - All Employees with Targets
          </h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Target</th>
                  <th style={styles.th}>Current Sales</th>
                  <th style={styles.th}>Achievement</th>
                  <th style={styles.th}>Base Salary</th>
                  <th style={styles.th}>Net Payable</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(salesStats).map(([email, stats]) => {
                  const emp = allEmployees.find((e) => e.email === email);
                  if (!emp) return null;

                  return (
                    <tr
                      key={email}
                      style={styles.tableRow}
                      onClick={() => handleSelectEmployee(email)}
                    >
                      <td style={styles.td}>
                        <div style={styles.employeeCell}>
                          <div style={styles.employeeCellName}>{emp.name}</div>
                          <div style={styles.employeeCellEmail}>{email}</div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        ₹ {parseFloat(stats.target || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={styles.td}>
                        ₹{" "}
                        {parseFloat(stats.current_sales || 0).toLocaleString(
                          "en-IN"
                        )}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor:
                              stats.percentage >= 75
                                ? "#28a745"
                                : stats.percentage >= 50
                                ? "#ffc107"
                                : "#dc3545",
                          }}
                        >
                          {stats.percentage}%
                        </span>
                      </td>
                      <td style={styles.td}>
                        ₹{" "}
                        {parseFloat(stats.base_salary || 0).toLocaleString(
                          "en-IN"
                        )}
                      </td>
                      <td style={styles.td}>
                        <strong
                          style={{ color: "#28a745", fontSize: "1.1rem" }}
                        >
                          ₹{" "}
                          {parseFloat(stats.payable_salary || 0).toLocaleString(
                            "en-IN"
                          )}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function getSalaryColor(percentage) {
  if (percentage >= 100) return "#28a745";
  if (percentage >= 75) return "#ffc107";
  if (percentage >= 50) return "#fd7e14";
  return "#dc3545";
}

const styles = {
    container: {
        padding: '0',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    header: {
        marginBottom: '30px',
    },
    mainTitle: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: '10px',
        marginTop: 0
    },
    subtitle: {
        fontSize: '1rem',
        color: '#6c757d',
        marginBottom: 0,
        marginTop: 0
    },
    selectionSection: {
        marginBottom: '30px',
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #e9ecef'
    },
    label: {
        display: 'block',
        fontWeight: '600',
        color: '#495057',
        marginBottom: '10px',
        fontSize: '1rem'
    },
    select: {
        width: '100%',
        padding: '12px',
        border: '2px solid #dee2e6',
        borderRadius: '8px',
        fontSize: '1rem',
        backgroundColor: '#fff',
        cursor: 'pointer',
        transition: 'border-color 0.2s'
    },
    statsSection: {
        marginBottom: '40px'
    },
    employeeHeader: {
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e9ecef'
    },
    employeeName: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: '8px',
        marginTop: 0
    },
    employeeMeta: {
        fontSize: '0.95rem',
        color: '#6c757d'
    },
    divider: {
        margin: '0 10px',
        color: '#dee2e6'
    },
    salaryCard: {
        backgroundColor: '#e3f2fd',
        border: '3px solid #2196f3',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px'
    },
    salaryCardTitle: {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginTop: 0,
        marginBottom: '15px'
    },
    salaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0'
    },
    salaryLabel: {
        fontSize: '1rem',
        color: '#6c757d',
        fontWeight: '500'
    },
    salaryValue: {
        fontSize: '1.1rem',
        color: '#2c3e50',
        fontWeight: '600'
    },
    netPayableRow: {
        borderTop: '2px solid #2196f3',
        marginTop: '10px',
        paddingTop: '15px'
    },
    netPayableLabel: {
        fontSize: '1.3rem',
        color: '#2c3e50',
        fontWeight: '700'
    },
    netPayableValue: {
        fontSize: '1.6rem',
        color: '#28a745',
        fontWeight: '700'
    },
    editForm: {
        backgroundColor: '#fff',
        border: '2px solid #e9ecef',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '25px'
    },
    formTitle: {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginTop: 0,
        marginBottom: '20px'
    },
    formGroup: {
        marginBottom: '20px'
    },
    formLabel: {
        display: 'block',
        fontWeight: '600',
        color: '#495057',
        marginBottom: '8px',
        fontSize: '0.95rem'
    },
    input: {
        width: '100%',
        padding: '12px',
        border: '2px solid #dee2e6',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s'
    },
    saveButton: {
        width: '100%',
        padding: '14px',
        backgroundColor: '#28a745',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '700',
        cursor: 'pointer',
        fontSize: '1.1rem',
        transition: 'background-color 0.2s'
    },
    noSelection: {
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '2px dashed #dee2e6',
        marginBottom: '40px'
    },
    noSelectionText: {
        fontSize: '1.1rem',
        color: '#6c757d',
        margin: 0
    },
    rulesCard: {
        backgroundColor: '#fff3cd',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #ffc107'
    },
    rulesTitle: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: '15px',
        marginTop: 0
    },
    rulesList: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    ruleItem: {
        padding: '8px 0',
        fontSize: '0.95rem',
        color: '#495057',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    overviewSection: {
        marginTop: '40px'
    },
    overviewTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: '20px',
        marginTop: 0
    },
    
    // Sales Entries Section
    entriesSection: {
        marginBottom: '30px',
        backgroundColor: '#fff',
        border: '2px solid #e9ecef',
        borderRadius: '12px',
        padding: '25px',
    },
    entriesHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
    },
    entriesTitle: {
        fontSize: '1.3rem',
        fontWeight: '700',
        color: '#2c3e50',
        margin: 0
    },
    periodSelector: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    periodButton: {
        padding: '8px 16px',
        border: '2px solid #dee2e6',
        borderRadius: '6px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.85rem',
        transition: 'all 0.2s',
        color: '#495057'
    },
    periodButtonActive: {
        backgroundColor: '#3498db',
        color: '#fff',
        borderColor: '#3498db'
    },
    
    // Breakdown Card
    breakdownCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '25px'
    },
    breakdownTitle: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginTop: 0,
        marginBottom: '15px'
    },
    breakdownGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '15px'
    },
    breakdownItem: {
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '15px',
        border: '1px solid #e9ecef'
    },
    breakdownHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '5px'
    },
    breakdownCompany: {
        fontWeight: '700',
        color: '#2c3e50',
        fontSize: '0.95rem'
    },
    breakdownValue: {
        fontWeight: '700',
        color: '#28a745',
        fontSize: '0.95rem'
    },
    breakdownMeta: {
        fontSize: '0.8rem',
        color: '#6c757d',
        marginBottom: '10px'
    },
    breakdownBar: {
        width: '100%',
        height: '8px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    breakdownBarFill: {
        height: '100%',
        backgroundColor: '#3498db',
        transition: 'width 0.5s ease-in-out',
        borderRadius: '4px'
    },
    
    tableContainer: {
        overflowX: 'auto',
        border: '2px solid #e9ecef',
        borderRadius: '12px'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: '#fff'
    },
    tableHeader: {
        backgroundColor: '#f8f9fa',
        borderBottom: '2px solid #e9ecef'
    },
    th: {
        padding: '15px',
        textAlign: 'left',
        fontWeight: '600',
        color: '#495057',
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    tableRow: {
        borderBottom: '1px solid #e9ecef',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    td: {
        padding: '15px',
        fontSize: '0.95rem',
        color: '#495057'
    },
    employeeCell: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    employeeCellName: {
        fontWeight: '600',
        color: '#2c3e50'
    },
    employeeCellEmail: {
        fontSize: '0.85rem',
        color: '#6c757d'
    },
    companyBadge: {
        padding: '5px 12px',
        borderRadius: '20px',
        backgroundColor: '#e3f2fd',
        color: '#1976d2',
        fontWeight: '600',
        fontSize: '0.85rem',
        display: 'inline-block'
    },
    badge: {
        padding: '4px 12px',
        borderRadius: '20px',
        color: '#fff',
        fontWeight: '600',
        fontSize: '0.85rem',
        display: 'inline-block'
    },
    loading: {
        textAlign: 'center',
        padding: '40px',
        fontSize: '1.1rem',
        color: '#6c757d'
    }
};

export default SalesManagement;