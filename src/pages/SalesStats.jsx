import React, { useState, useEffect } from 'react';
import axios from 'axios';

const baseUrl =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://backend.vjcoverseas.com";

function SalesStats({ employeeEmail, isChairman = false }) {
    const [stats, setStats] = useState(null);
    const [salesEntries, setSalesEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Chairman edit mode
    const [editMode, setEditMode] = useState(false);
    const [targetAmount, setTargetAmount] = useState('');
    
    // Employee sales entry form
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [saleAmount, setSaleAmount] = useState('');
    const [saleCompany, setSaleCompany] = useState('');
    const [clientName, setClientName] = useState('');
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState('');
    
    // View period
    const [viewPeriod, setViewPeriod] = useState('current');

    useEffect(() => {
        if (employeeEmail) {
            fetchStats();
            fetchSalesEntries();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeEmail]);

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${baseUrl}/sales-stats/${employeeEmail}`, {
                withCredentials: true
            });
            setStats(res.data);
            setTargetAmount(res.data.target || '');
        } catch (err) {
            console.error('Failed to fetch sales stats', err);
            setStats({ target: 0, current_sales: 0 });
        } finally {
            setLoading(false);
        }
    };

    const fetchSalesEntries = async () => {
        try {
            const res = await axios.get(`${baseUrl}/sales-entries/${employeeEmail}`, {
                withCredentials: true
            });
            setSalesEntries(res.data);
        } catch (err) {
            console.error('Failed to fetch sales entries', err);
        }
    };

    const handleSaveTarget = async () => {
        if (!targetAmount) {
            alert('Please enter target amount');
            return;
        }

        try {
            await axios.post(
                `${baseUrl}/update-sales-target`,
                new URLSearchParams({
                    employee_email: employeeEmail,
                    target: targetAmount
                }),
                { withCredentials: true }
            );
            alert('✅ Target updated successfully');
            fetchStats();
            setEditMode(false);
        } catch (err) {
            alert('❌ Failed to update target: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleAddSalesEntry = async () => {
        if (!saleAmount || !saleCompany || !clientName || !saleDate) {
            alert('Please fill all required fields');
            return;
        }

        try {
            await axios.post(
                `${baseUrl}/add-sales-entry`,
                new URLSearchParams({
                    employee_email: employeeEmail,
                    amount: saleAmount,
                    company: saleCompany,
                    client_name: clientName,
                    sale_date: saleDate,
                    remarks: remarks || ''
                }),
                { withCredentials: true }
            );
            
            alert('✅ Sales entry added successfully');
            
            // Reset form
            setSaleAmount('');
            setSaleCompany('');
            setClientName('');
            setRemarks('');
            setSaleDate(new Date().toISOString().split('T')[0]);
            setShowEntryForm(false);
            
            // Refresh data
            fetchStats();
            fetchSalesEntries();
        } catch (err) {
            alert('❌ Failed to add sales entry: ' + (err.response?.data?.error || err.message));
        }
    };

    if (loading) {
        return <div style={styles.loading}>Loading sales stats...</div>;
    }

    const target = parseFloat(stats?.target || 0);
    const current = parseFloat(stats?.current_sales || 0);
    const percentage = target > 0 ? (current / target) * 100 : 0;
    const remaining = Math.max(0, target - current);

    // Calculate salary eligibility
    let salaryPercentage = 0;
    let salaryStatus = '';
    let statusColor = '';

    if (percentage >= 100) {
        salaryPercentage = 100;
        salaryStatus = '✅ Full Salary Eligible';
        statusColor = '#28a745';
    } else if (percentage >= 75) {
        salaryPercentage = 75;
        salaryStatus = '⚠️ 75% Salary Eligible';
        statusColor = '#ffc107';
    } else if (percentage >= 50) {
        salaryPercentage = 50;
        salaryStatus = '⚠️ 50% Salary Eligible';
        statusColor = '#fd7e14';
    } else if (percentage >= 25) {
        salaryPercentage = 25;
        salaryStatus = '⚠️ 25% Salary Eligible';
        statusColor = '#dc3545';
    } else {
        salaryPercentage = 0;
        salaryStatus = '❌ No Salary Eligible';
        statusColor = '#6c757d';
    }

    // Get comparison data
    const getComparisonData = () => {
        if (salesEntries.length === 0) return null;

        const now = new Date();
        let compareData = [];

        if (viewPeriod === '10days') {
            const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
            compareData = salesEntries.filter(e => new Date(e.sale_date) >= tenDaysAgo);
        } else if (viewPeriod === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            compareData = salesEntries.filter(e => new Date(e.sale_date) >= startOfMonth);
        }

        if (compareData.length === 0) return null;

        const totalSales = compareData.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
        const avgSale = totalSales / compareData.length;

        return {
            totalSales,
            count: compareData.length,
            avgSale,
            period: viewPeriod === '10days' ? 'Last 10 Days' : 'This Month'
        };
    };

    const comparisonData = getComparisonData();

    // Group sales by company
    const salesByCompany = salesEntries.reduce((acc, entry) => {
        const company = entry.company || 'Other';
        if (!acc[company]) {
            acc[company] = { total: 0, count: 0 };
        }
        acc[company].total += parseFloat(entry.amount || 0);
        acc[company].count += 1;
        return acc;
    }, {});

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>📊 Sales Performance Dashboard</h2>
                <div style={styles.headerButtons}>
                    {isChairman && (
                        <button
                            onClick={() => setEditMode(!editMode)}
                            style={styles.editButton}
                        >
                            {editMode ? '❌ Cancel' : '✏️ Edit Target'}
                        </button>
                    )}
                    {!isChairman && (
                        <button
                            onClick={() => setShowEntryForm(!showEntryForm)}
                            style={styles.addButton}
                        >
                            {showEntryForm ? '❌ Cancel' : '➕ Add Sales Entry'}
                        </button>
                    )}
                </div>
            </div>

            {/* Chairman Edit Target */}
            {editMode && isChairman && (
                <div style={styles.editForm}>
                    <h4 style={styles.formTitle}>Set Sales Target</h4>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Monthly Target (₹)</label>
                        <input
                            type="number"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(e.target.value)}
                            style={styles.input}
                            placeholder="Enter target amount (e.g., 100000)"
                        />
                    </div>
                    <button onClick={handleSaveTarget} style={styles.saveButton}>
                        💾 Save Target
                    </button>
                </div>
            )}

            {/* Employee Add Sales Entry */}
            {showEntryForm && !isChairman && (
                <div style={styles.salesEntryForm}>
                    <h4 style={styles.formTitle}>➕ Add New Sales Entry</h4>
                    
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Sale Amount (₹) *</label>
                            <input
                                type="number"
                                value={saleAmount}
                                onChange={(e) => setSaleAmount(e.target.value)}
                                style={styles.input}
                                placeholder="Enter amount (e.g., 50000)"
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Company/Service *</label>
                            <select
                                value={saleCompany}
                                onChange={(e) => setSaleCompany(e.target.value)}
                                style={styles.input}
                                required
                            >
                                <option value="">-- Select Company --</option>
                                <option value="JSS">JSS</option>
                                <option value="PR">PR (Public Relations)</option>
                                <option value="Study">Study Visa</option>
                                <option value="Work Visa">Work Visa</option>
                                <option value="Tourist Visa">Tourist Visa</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Client Name *</label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                style={styles.input}
                                placeholder="Enter client name"
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Sale Date *</label>
                            <input
                                type="date"
                                value={saleDate}
                                onChange={(e) => setSaleDate(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Remarks (Optional)</label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                            placeholder="Add any additional notes or details..."
                        />
                    </div>

                    <button onClick={handleAddSalesEntry} style={styles.saveButton}>
                        💾 Add Sales Entry
                    </button>
                </div>
            )}

            {/* Period Selector */}
            <div style={styles.periodSelector}>
                <button
                    onClick={() => setViewPeriod('current')}
                    style={{
                        ...styles.periodButton,
                        ...(viewPeriod === 'current' ? styles.periodButtonActive : {})
                    }}
                >
                    📊 Current Stats
                </button>
                <button
                    onClick={() => setViewPeriod('10days')}
                    style={{
                        ...styles.periodButton,
                        ...(viewPeriod === '10days' ? styles.periodButtonActive : {})
                    }}
                >
                    📈 Last 10 Days
                </button>
                <button
                    onClick={() => setViewPeriod('month')}
                    style={{
                        ...styles.periodButton,
                        ...(viewPeriod === 'month' ? styles.periodButtonActive : {})
                    }}
                >
                    📅 This Month
                </button>
            </div>

            {/* Comparison Card */}
            {viewPeriod !== 'current' && comparisonData && (
                <div style={styles.comparisonCard}>
                    <h3 style={styles.comparisonTitle}>📈 Sales Analysis - {comparisonData.period}</h3>
                    <div style={styles.comparisonGrid}>
                        <div style={styles.comparisonItem}>
                            <div style={styles.comparisonLabel}>Total Sales</div>
                            <div style={styles.comparisonValue}>₹ {comparisonData.totalSales.toLocaleString('en-IN')}</div>
                        </div>
                        <div style={styles.comparisonItem}>
                            <div style={styles.comparisonLabel}>Number of Sales</div>
                            <div style={styles.comparisonValue}>{comparisonData.count}</div>
                        </div>
                        <div style={styles.comparisonItem}>
                            <div style={styles.comparisonLabel}>Average per Sale</div>
                            <div style={styles.comparisonValue}>₹ {comparisonData.avgSale.toLocaleString('en-IN')}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Monthly Target</div>
                    <div style={styles.statValue}>₹ {target.toLocaleString('en-IN')}</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total Sales</div>
                    <div style={styles.statValue}>₹ {current.toLocaleString('en-IN')}</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Remaining</div>
                    <div style={{...styles.statValue, color: remaining > 0 ? '#dc3545' : '#28a745'}}>
                        ₹ {remaining.toLocaleString('en-IN')}
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Achievement</div>
                    <div style={styles.statValue}>{percentage.toFixed(1)}%</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={styles.progressContainer}>
                <div style={styles.progressLabel}>Sales Progress</div>
                <div style={styles.progressBar}>
                    <div
                        style={{
                            ...styles.progressFill,
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: percentage >= 75 ? '#28a745' : percentage >= 50 ? '#ffc107' : '#dc3545'
                        }}
                    >
                        {percentage > 10 && <span style={styles.progressText}>{percentage.toFixed(1)}%</span>}
                    </div>
                </div>
            </div>

            {/* Visual Chart */}
            <div style={styles.chartContainer}>
                <h4 style={styles.chartTitle}>📊 Visual Progress</h4>
                <div style={styles.barChart}>
                    <div style={styles.barWrapper}>
                        <div style={styles.barLabel}>Target</div>
                        <div style={styles.barOuter}>
                            <div style={{...styles.barInner, width: '100%', backgroundColor: '#e9ecef', color: '#495057'}}>
                                ₹{target.toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                    <div style={styles.barWrapper}>
                        <div style={styles.barLabel}>Current</div>
                        <div style={styles.barOuter}>
                            <div style={{
                                ...styles.barInner, 
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: percentage >= 75 ? '#28a745' : percentage >= 50 ? '#ffc107' : '#dc3545'
                            }}>
                                ₹{current.toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales by Company Breakdown */}
            {Object.keys(salesByCompany).length > 0 && (
                <div style={styles.breakdownCard}>
                    <h4 style={styles.chartTitle}>💼 Sales Breakdown by Company</h4>
                    {Object.entries(salesByCompany).map(([company, data]) => {
                        const companyPercent = target > 0 ? (data.total / target) * 100 : 0;
                        return (
                            <div key={company} style={styles.breakdownItem}>
                                <div style={styles.breakdownHeader}>
                                    <span style={styles.breakdownCompany}>{company}</span>
                                    <span style={styles.breakdownValue}>
                                        ₹{data.total.toLocaleString('en-IN')} ({data.count} sales)
                                    </span>
                                </div>
                                <div style={styles.breakdownBar}>
                                    <div style={{
                                        ...styles.breakdownBarFill,
                                        width: `${Math.min(companyPercent, 100)}%`
                                    }}>
                                        {companyPercent.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Salary Eligibility */}
            <div style={{...styles.salaryCard, borderColor: statusColor}}>
                <div style={styles.salaryHeader}>
                    <span style={{...styles.salaryStatus, color: statusColor}}>
                        {salaryStatus}
                    </span>
                </div>
                <div style={styles.salaryDetails}>
                    <div style={styles.salaryRow}>
                        <span>Salary Percentage:</span>
                        <strong style={{color: statusColor}}>{salaryPercentage}%</strong>
                    </div>
                </div>
            </div>

            {/* Sales Entries Table */}
            {salesEntries.length > 0 && (
                <div style={styles.entriesSection}>
                    <h4 style={styles.entriesTitle}>📋 Sales Entries ({salesEntries.length})</h4>
                    <div style={styles.entriesTable}>
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
                                {salesEntries.map((entry, idx) => (
                                    <tr key={idx} style={styles.tableRow}>
                                        <td style={styles.td}>
                                            {new Date(entry.sale_date).toLocaleDateString('en-IN')}
                                        </td>
                                        <td style={styles.td}>{entry.client_name}</td>
                                        <td style={styles.td}>
                                            <span style={styles.companyBadge}>
                                                {entry.company}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <strong style={{color: '#28a745'}}>
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

            {/* Salary Rules */}
            <div style={styles.rulesCard}>
                <h4 style={styles.rulesTitle}>📋 Salary Eligibility Rules</h4>
                <ul style={styles.rulesList}>
                    <li style={styles.ruleItem}>
                        <span style={{color: '#28a745'}}>✓</span> 100% Target = 100% Salary
                    </li>
                    <li style={styles.ruleItem}>
                        <span style={{color: '#ffc107'}}>⚠</span> 75-99% Target = 75% Salary
                    </li>
                    <li style={styles.ruleItem}>
                        <span style={{color: '#fd7e14'}}>⚠</span> 50-74% Target = 50% Salary
                    </li>
                    <li style={styles.ruleItem}>
                        <span style={{color: '#dc3545'}}>✗</span> Below 25% Target = No Salary
                    </li>
                </ul>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: '0',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e9ecef',
        flexWrap: 'wrap',
        gap: '15px'
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: '700',
        color: '#2c3e50',
        margin: 0
    },
    headerButtons: {
        display: 'flex',
        gap: '10px'
    },
    editButton: {
        padding: '10px 20px',
        backgroundColor: '#3498db',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '0.95rem',
        transition: 'background-color 0.2s'
    },
    addButton: {
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '0.95rem',
        transition: 'background-color 0.2s'
    },
    editForm: {
        backgroundColor: '#e3f2fd',
        border: '2px solid #2196f3',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '25px'
    },
    salesEntryForm: {
        backgroundColor: '#e8f5e9',
        border: '2px solid #4caf50',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '25px'
    },
    formTitle: {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginTop: 0,
        marginBottom: '20px'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        marginBottom: '15px'
    },
    formGroup: {
        marginBottom: '15px'
    },
    label: {
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
        padding: '12px 24px',
        backgroundColor: '#28a745',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '700',
        cursor: 'pointer',
        fontSize: '1rem',
        width: '100%',
        marginTop: '10px'
    },
    periodSelector: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
    },
    periodButton: {
        flex: 1,
        padding: '10px',
        border: '2px solid #dee2e6',
        borderRadius: '6px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.9rem',
        transition: 'all 0.2s'
    },
    periodButtonActive: {
        backgroundColor: '#3498db',
        color: '#fff',
        borderColor: '#3498db'
    },
    comparisonCard: {
        backgroundColor: '#f0f9ff',
        border: '3px solid #3498db',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px'
    },
    comparisonTitle: {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginTop: 0,
        marginBottom: '15px'
    },
    comparisonGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px'
    },
    comparisonItem: {
        textAlign: 'center',
        padding: '15px',
        backgroundColor: '#fff',
        borderRadius: '8px'
    },
    comparisonLabel: {
        fontSize: '0.85rem',
        color: '#6c757d',
        marginBottom: '5px'
    },
    comparisonValue: {
        fontSize: '1.3rem',
        fontWeight: '700',
        color: '#2c3e50'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '25px'
    },
    statCard: {
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #e9ecef',
        transition: 'transform 0.2s, box-shadow 0.2s'
    },
    statLabel: {
        fontSize: '0.9rem',
        color: '#6c757d',
        fontWeight: '500',
        marginBottom: '8px'
    },
    statValue: {
        fontSize: '1.8rem',
        fontWeight: '700',
        color: '#2c3e50'
    },
    progressContainer: {
        marginBottom: '25px'
    },
    progressLabel: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#495057',
        marginBottom: '10px'
    },
    progressBar: {
        width: '100%',
        height: '35px',
        backgroundColor: '#e9ecef',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative'
    },
    progressFill: {
        height: '100%',
        transition: 'width 0.5s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '20px'
    },
    progressText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: '0.9rem'
    },
    chartContainer: {
        backgroundColor: '#fff',
        border: '2px solid #e9ecef',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px'
    },
    chartTitle: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginTop: 0,
        marginBottom: '15px'
    },
    barChart: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    barWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },
    barLabel: {
        minWidth: '70px',
        fontWeight: '600',
        fontSize: '0.9rem',
        color: '#495057'
    },
    barOuter: {
        flex: 1,
        height: '40px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #dee2e6'
    },
    barInner: {
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: '600',
        fontSize: '0.85rem',
        transition: 'width 0.5s ease-in-out',
        minWidth: '80px'
    },
    breakdownCard: {
        backgroundColor: '#fff',
        border: '2px solid #e9ecef',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px'
    },
    breakdownItem: {
        marginBottom: '15px'
    },
    breakdownHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px'
    },
    breakdownCompany: {
        fontWeight: '600',
        color: '#2c3e50'
    },
    breakdownValue: {
        fontWeight: '600',
        color: '#495057'
    },
    breakdownBar: {
        width: '100%',
        height: '25px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #dee2e6'
    },
    breakdownBarFill: {
        height: '100%',
        backgroundColor: '#3498db',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '0.8rem',
        fontWeight: '600',
        transition: 'width 0.5s ease-in-out'
    },
    salaryCard: {
        backgroundColor: '#fff',
        border: '3px solid',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px'
    },
    salaryHeader: {
        marginBottom: '15px'
    },
    salaryStatus: {
        fontSize: '1.3rem',
        fontWeight: '700'
    },
    salaryDetails: {
        fontSize: '1rem'
    },
    salaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0'
    },
    entriesSection: {
        marginBottom: '25px'
    },
    entriesTitle: {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: '15px',
        marginTop: 0
    },
    entriesTable: {
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
        padding: '12px',
        textAlign: 'left',
        fontWeight: '600',
        color: '#495057',
        fontSize: '0.85rem',
        textTransform: 'uppercase'
    },
    tableRow: {
        borderBottom: '1px solid #e9ecef'
    },
    td: {
        padding: '12px',
        fontSize: '0.9rem',
        color: '#495057'
    },
    companyBadge: {
        padding: '4px 10px',
        borderRadius: '12px',
        backgroundColor: '#e3f2fd',
        color: '#1976d2',
        fontWeight: '600',
        fontSize: '0.8rem',
        display: 'inline-block'
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
    loading: {
        textAlign: 'center',
        padding: '40px',
        fontSize: '1.1rem',
        color: '#6c757d'
    }
};

export default SalesStats;