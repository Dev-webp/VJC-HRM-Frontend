import React, { useState, useEffect } from 'react';
import axios from 'axios';

const baseUrl =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://backend.vjcoverseas.com";

function SalaryCalculator({ employeeEmail, employeeSalary }) {
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [totalWorkingDays, setTotalWorkingDays] = useState(0);
    const [daysPresent, setDaysPresent] = useState(0);
    const [salesData, setSalesData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [calculatedData, setCalculatedData] = useState(null);

    // Initialize with current month/year
    useEffect(() => {
        const now = new Date();
        setSelectedMonth(String(now.getMonth() + 1).padStart(2, '0'));
        setSelectedYear(String(now.getFullYear()));
    }, []);

    // Calculate working days in a month (excluding Sundays)
    const calculateWorkingDays = (year, month) => {
        const daysInMonth = new Date(year, month, 0).getDate();
        let workingDays = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            // Exclude Sundays (0 = Sunday)
            if (date.getDay() !== 0) {
                workingDays++;
            }
        }
        
        return workingDays;
    };

    // Auto-calculate working days when month/year changes
    useEffect(() => {
        if (selectedMonth && selectedYear) {
            const workDays = calculateWorkingDays(parseInt(selectedYear), parseInt(selectedMonth));
            setTotalWorkingDays(workDays);
            setDaysPresent(workDays); // Default to full attendance
        }
    }, [selectedMonth, selectedYear]);

    const fetchSalesForMonth = async () => {
        if (!selectedMonth || !selectedYear) {
            alert('Please select month and year');
            return;
        }

        setLoading(true);
        try {
            // Fetch sales stats
            const statsRes = await axios.get(`${baseUrl}/sales-stats/${employeeEmail}`, {
                withCredentials: true
            });

            // Fetch sales entries
            const entriesRes = await axios.get(`${baseUrl}/sales-entries/${employeeEmail}`, {
                withCredentials: true
            });

            // Filter entries for selected month
            const filteredEntries = entriesRes.data.filter(entry => {
                const entryDate = new Date(entry.sale_date);
                return entryDate.getMonth() + 1 === parseInt(selectedMonth) && 
                       entryDate.getFullYear() === parseInt(selectedYear);
            });

            // Calculate total sales for the month
            const monthSales = filteredEntries.reduce((sum, entry) => 
                sum + parseFloat(entry.amount || 0), 0
            );

            setSalesData({
                target: parseFloat(statsRes.data.target || 0),
                sales: monthSales,
                entries: filteredEntries
            });

            calculateSalary(monthSales, parseFloat(statsRes.data.target || 0));

        } catch (err) {
            console.error('Failed to fetch sales data', err);
            alert('❌ Failed to fetch sales data');
        } finally {
            setLoading(false);
        }
    };

    const calculateSalary = (monthSales, baseTarget) => {
        const baseSalary = parseFloat(employeeSalary || 0);
        
        if (totalWorkingDays === 0 || daysPresent === 0) {
            alert('Please enter valid working days');
            return;
        }

        // Step 1: Calculate per day salary
        const perDaySalary = baseSalary / totalWorkingDays;

        // Step 2: Calculate pro-rated salary based on attendance
        const proratedSalary = perDaySalary * daysPresent;

        // Step 3: Calculate adjusted target based on working days
        const adjustedTarget = (baseTarget / totalWorkingDays) * daysPresent;

        // Step 4: Calculate achievement percentage
        const achievementPercent = adjustedTarget > 0 ? (monthSales / adjustedTarget) * 100 : 0;

        // Step 5: Calculate final salary based on achievement
        let finalSalary = 0;
        let salaryPercentage = 0;
        let salaryStatus = '';
        let statusColor = '';

        if (achievementPercent >= 100) {
            salaryPercentage = 100;
            finalSalary = proratedSalary;
            salaryStatus = '✅ Full Salary Eligible';
            statusColor = '#28a745';
        } else if (achievementPercent >= 75) {
            salaryPercentage = 75;
            finalSalary = proratedSalary * 0.75;
            salaryStatus = '⚠️ 75% Salary Eligible';
            statusColor = '#ffc107';
        } else if (achievementPercent >= 50) {
            salaryPercentage = 50;
            finalSalary = proratedSalary * 0.50;
            salaryStatus = '⚠️ 50% Salary Eligible';
            statusColor = '#fd7e14';
        } else if (achievementPercent >= 25) {
            salaryPercentage = 25;
            finalSalary = proratedSalary * 0.25;
            salaryStatus = '⚠️ 25% Salary Eligible';
            statusColor = '#dc3545';
        } else {
            salaryPercentage = 0;
            finalSalary = 0;
            salaryStatus = '❌ No Salary Eligible';
            statusColor = '#6c757d';
        }

        setCalculatedData({
            baseSalary,
            perDaySalary,
            proratedSalary,
            adjustedTarget,
            monthSales,
            achievementPercent,
            salaryPercentage,
            finalSalary,
            salaryStatus,
            statusColor,
            daysAbsent: totalWorkingDays - daysPresent
        });
    };

    const months = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>💰 Salary Calculator</h2>
                <p style={styles.subtitle}>Calculate pro-rated salary based on attendance and sales performance</p>
            </div>

            {/* Input Section */}
            <div style={styles.inputSection}>
                <div style={styles.inputGrid}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Select Month *</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">-- Select Month --</option>
                            {months.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Select Year *</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">-- Select Year --</option>
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Total Working Days</label>
                        <input
                            type="number"
                            value={totalWorkingDays}
                            onChange={(e) => setTotalWorkingDays(parseInt(e.target.value) || 0)}
                            style={styles.input}
                            placeholder="Auto-calculated"
                        />
                        <small style={styles.helpText}>Excludes Sundays</small>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Days Present *</label>
                        <input
                            type="number"
                            value={daysPresent}
                            onChange={(e) => setDaysPresent(parseInt(e.target.value) || 0)}
                            style={styles.input}
                            max={totalWorkingDays}
                            placeholder="Enter days present"
                        />
                    </div>
                </div>

                <button 
                    onClick={fetchSalesForMonth}
                    disabled={loading || !selectedMonth || !selectedYear || !daysPresent}
                    style={{
                        ...styles.calculateButton,
                        opacity: loading || !selectedMonth || !selectedYear || !daysPresent ? 0.6 : 1,
                        cursor: loading || !selectedMonth || !selectedYear || !daysPresent ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? '⏳ Calculating...' : '🧮 Calculate Salary'}
                </button>
            </div>

            {/* Results Section */}
            {calculatedData && (
                <div style={styles.resultsSection}>
                    {/* Attendance Summary */}
                    <div style={styles.summaryCard}>
                        <h3 style={styles.cardTitle}>📅 Attendance Summary</h3>
                        <div style={styles.summaryGrid}>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Total Working Days</span>
                                <span style={styles.summaryValue}>{totalWorkingDays} days</span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Days Present</span>
                                <span style={{...styles.summaryValue, color: '#28a745'}}>{daysPresent} days</span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Days Absent</span>
                                <span style={{...styles.summaryValue, color: '#dc3545'}}>{calculatedData.daysAbsent} days</span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Attendance %</span>
                                <span style={styles.summaryValue}>
                                    {((daysPresent / totalWorkingDays) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Salary Breakdown */}
                    <div style={styles.breakdownCard}>
                        <h3 style={styles.cardTitle}>💵 Salary Breakdown</h3>
                        <div style={styles.breakdownList}>
                            <div style={styles.breakdownRow}>
                                <span style={styles.breakdownLabel}>Base Monthly Salary</span>
                                <span style={styles.breakdownValue}>₹ {calculatedData.baseSalary.toLocaleString('en-IN')}</span>
                            </div>
                            <div style={styles.breakdownRow}>
                                <span style={styles.breakdownLabel}>Per Day Salary</span>
                                <span style={styles.breakdownValue}>
                                    ₹ {calculatedData.perDaySalary.toFixed(2).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div style={styles.breakdownRow}>
                                <span style={styles.breakdownLabel}>Pro-rated Salary ({daysPresent} days)</span>
                                <span style={{...styles.breakdownValue, color: '#3498db', fontWeight: '700'}}>
                                    ₹ {calculatedData.proratedSalary.toFixed(2).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Target Adjustment */}
                    <div style={styles.targetCard}>
                        <h3 style={styles.cardTitle}>🎯 Adjusted Sales Target</h3>
                        <div style={styles.targetComparison}>
                            <div style={styles.targetItem}>
                                <div style={styles.targetLabel}>Original Monthly Target</div>
                                <div style={styles.targetValue}>₹ {salesData.target.toLocaleString('en-IN')}</div>
                            </div>
                            <div style={styles.targetArrow}>→</div>
                            <div style={styles.targetItem}>
                                <div style={styles.targetLabel}>Adjusted Target ({daysPresent}/{totalWorkingDays} days)</div>
                                <div style={{...styles.targetValue, color: '#e74c3c'}}>
                                    ₹ {calculatedData.adjustedTarget.toFixed(2).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                        <div style={styles.targetNote}>
                            <strong>Note:</strong> Target is pro-rated based on your working days
                        </div>
                    </div>

                    {/* Sales Performance */}
                    <div style={styles.performanceCard}>
                        <h3 style={styles.cardTitle}>📊 Sales Performance</h3>
                        <div style={styles.performanceGrid}>
                            <div style={styles.performanceItem}>
                                <div style={styles.performanceLabel}>Total Sales</div>
                                <div style={{...styles.performanceValue, color: '#28a745'}}>
                                    ₹ {calculatedData.monthSales.toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div style={styles.performanceItem}>
                                <div style={styles.performanceLabel}>Achievement</div>
                                <div style={styles.performanceValue}>
                                    {calculatedData.achievementPercent.toFixed(1)}%
                                </div>
                            </div>
                            <div style={styles.performanceItem}>
                                <div style={styles.performanceLabel}>Remaining Target</div>
                                <div style={{...styles.performanceValue, color: '#dc3545'}}>
                                    ₹ {Math.max(0, calculatedData.adjustedTarget - calculatedData.monthSales).toFixed(2).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={styles.progressContainer}>
                            <div style={styles.progressBar}>
                                <div
                                    style={{
                                        ...styles.progressFill,
                                        width: `${Math.min(calculatedData.achievementPercent, 100)}%`,
                                        backgroundColor: calculatedData.achievementPercent >= 75 ? '#28a745' : 
                                                       calculatedData.achievementPercent >= 50 ? '#ffc107' : '#dc3545'
                                    }}
                                >
                                    {calculatedData.achievementPercent > 10 && (
                                        <span style={styles.progressText}>{calculatedData.achievementPercent.toFixed(1)}%</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Final Salary */}
                    <div style={{...styles.finalSalaryCard, borderColor: calculatedData.statusColor}}>
                        <div style={styles.finalSalaryHeader}>
                            <h3 style={{...styles.finalSalaryTitle, color: calculatedData.statusColor}}>
                                {calculatedData.salaryStatus}
                            </h3>
                        </div>
                        <div style={styles.finalSalaryBody}>
                            <div style={styles.finalSalaryRow}>
                                <span style={styles.finalSalaryLabel}>Pro-rated Salary</span>
                                <span style={styles.finalSalaryValue}>
                                    ₹ {calculatedData.proratedSalary.toFixed(2).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div style={styles.finalSalaryRow}>
                                <span style={styles.finalSalaryLabel}>Eligible Percentage</span>
                                <span style={{...styles.finalSalaryValue, color: calculatedData.statusColor}}>
                                    {calculatedData.salaryPercentage}%
                                </span>
                            </div>
                            <div style={styles.finalSalaryDivider}></div>
                            <div style={styles.finalSalaryRow}>
                                <span style={{...styles.finalSalaryLabel, fontSize: '1.2rem', fontWeight: '700'}}>
                                    Net Payable Salary
                                </span>
                                <span style={{
                                    ...styles.finalSalaryValue,
                                    fontSize: '1.8rem',
                                    fontWeight: '700',
                                    color: calculatedData.statusColor
                                }}>
                                    ₹ {calculatedData.finalSalary.toFixed(2).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Calculation Formula */}
                    <div style={styles.formulaCard}>
                        <h3 style={styles.cardTitle}>📐 Calculation Formula</h3>
                        <div style={styles.formulaSteps}>
                            <div style={styles.formulaStep}>
                                <strong>Step 1:</strong> Per Day Salary = Base Salary ÷ Total Working Days
                                <div style={styles.formulaExample}>
                                    ₹{calculatedData.perDaySalary.toFixed(2)} = ₹{calculatedData.baseSalary} ÷ {totalWorkingDays}
                                </div>
                            </div>
                            <div style={styles.formulaStep}>
                                <strong>Step 2:</strong> Pro-rated Salary = Per Day Salary × Days Present
                                <div style={styles.formulaExample}>
                                    ₹{calculatedData.proratedSalary.toFixed(2)} = ₹{calculatedData.perDaySalary.toFixed(2)} × {daysPresent}
                                </div>
                            </div>
                            <div style={styles.formulaStep}>
                                <strong>Step 3:</strong> Adjusted Target = (Monthly Target ÷ Total Working Days) × Days Present
                                <div style={styles.formulaExample}>
                                    ₹{calculatedData.adjustedTarget.toFixed(2)} = (₹{salesData.target} ÷ {totalWorkingDays}) × {daysPresent}
                                </div>
                            </div>
                            <div style={styles.formulaStep}>
                                <strong>Step 4:</strong> Achievement % = (Actual Sales ÷ Adjusted Target) × 100
                                <div style={styles.formulaExample}>
                                    {calculatedData.achievementPercent.toFixed(1)}% = (₹{calculatedData.monthSales} ÷ ₹{calculatedData.adjustedTarget.toFixed(2)}) × 100
                                </div>
                            </div>
                            <div style={styles.formulaStep}>
                                <strong>Step 5:</strong> Final Salary = Pro-rated Salary × Salary Percentage
                                <div style={styles.formulaExample}>
                                    ₹{calculatedData.finalSalary.toFixed(2)} = ₹{calculatedData.proratedSalary.toFixed(2)} × {calculatedData.salaryPercentage}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Salary Rules */}
                    <div style={styles.rulesCard}>
                        <h3 style={styles.cardTitle}>📋 Salary Eligibility Rules</h3>
                        <ul style={styles.rulesList}>
                            <li style={styles.ruleItem}>
                                <span style={{color: '#28a745'}}>✓</span> 100%+ Achievement = 100% of Pro-rated Salary
                            </li>
                            <li style={styles.ruleItem}>
                                <span style={{color: '#ffc107'}}>⚠</span> 75-99% Achievement = 75% of Pro-rated Salary
                            </li>
                            <li style={styles.ruleItem}>
                                <span style={{color: '#fd7e14'}}>⚠</span> 50-74% Achievement = 50% of Pro-rated Salary
                            </li>
                            <li style={styles.ruleItem}>
                                <span style={{color: '#dc3545'}}>⚠</span> 25-49% Achievement = 25% of Pro-rated Salary
                            </li>
                            <li style={styles.ruleItem}>
                                <span style={{color: '#6c757d'}}>✗</span> Below 25% Achievement = No Salary
                            </li>
                        </ul>
                    </div>

                    {/* Sales Entries for the Month */}
                    {salesData.entries.length > 0 && (
                        <div style={styles.entriesSection}>
                            <h3 style={styles.cardTitle}>📋 Sales Entries ({salesData.entries.length})</h3>
                            <div style={styles.tableWrapper}>
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
                                        {salesData.entries.map((entry, idx) => (
                                            <tr key={idx} style={styles.tableRow}>
                                                <td style={styles.td}>
                                                    {new Date(entry.sale_date).toLocaleDateString('en-IN')}
                                                </td>
                                                <td style={styles.td}>{entry.client_name}</td>
                                                <td style={styles.td}>
                                                    <span style={styles.companyBadge}>{entry.company}</span>
                                                </td>
                                                <td style={styles.td}>
                                                    <strong style={{color: '#28a745'}}>
                                                        ₹ {parseFloat(entry.amount).toLocaleString('en-IN')}
                                                    </strong>
                                                </td>
                                                <td style={styles.td}>{entry.remarks || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        backgroundColor: '#f8f9fa',
        borderRadius: '12px'
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '3px solid #3498db'
    },
    title: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#2c3e50',
        margin: '0 0 10px 0'
    },
    subtitle: {
        fontSize: '1rem',
        color: '#6c757d',
        margin: 0
    },
    inputSection: {
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '30px',
        border: '2px solid #e9ecef'
    },
    inputGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column'
    },
    label: {
        fontWeight: '600',
        color: '#495057',
        marginBottom: '8px',
        fontSize: '0.95rem'
    },
    select: {
        padding: '12px',
        border: '2px solid #dee2e6',
        borderRadius: '8px',
        fontSize: '1rem',
        backgroundColor: '#fff',
        cursor: 'pointer'
    },
    input: {
        padding: '12px',
        border: '2px solid #dee2e6',
        borderRadius: '8px',
        fontSize: '1rem'
    },
    helpText: {
        fontSize: '0.8rem',
        color: '#6c757d',
        marginTop: '4px'
    },
    calculateButton: {
        padding: '15px',
        backgroundColor: '#3498db',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1.1rem',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    resultsSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    summaryCard: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #e9ecef'
    },
    cardTitle: {
        fontSize: '1.3rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginTop: 0,
        marginBottom: '15px'
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px'
    },
    summaryItem: {
        display: 'flex',
        flexDirection: 'column',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
    },
    summaryLabel: {
        fontSize: '0.85rem',
        color: '#6c757d',
        marginBottom: '5px'
    },
    summaryValue: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#2c3e50'
    },
    breakdownCard: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #e9ecef'
    },
    breakdownList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    breakdownRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px'
    },
    breakdownLabel: {
        fontSize: '1rem',
        color: '#495057'
    },
    breakdownValue: {
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#2c3e50'
    },
    targetCard: {
        backgroundColor: '#fff3cd',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #ffc107'
    },
    targetComparison: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '15px'
    },
    targetItem: {
        textAlign: 'center',
        flex: 1,
        minWidth: '200px'
    },
    targetLabel: {
        fontSize: '0.9rem',
        color: '#6c757d',
        marginBottom: '8px'
    },
    targetValue: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#2c3e50'
    },
    targetArrow: {
        fontSize: '2rem',
        color: '#3498db',
        fontWeight: '700'
    },
    targetNote: {
        fontSize: '0.9rem',
        color: '#856404',
        backgroundColor: '#fff',
        padding: '10px',
        borderRadius: '6px',
        textAlign: 'center'
    },
    performanceCard: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #e9ecef'
    },
    performanceGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
    },
    performanceItem: {
        textAlign: 'center',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
    },
    performanceLabel: {
        fontSize: '0.85rem',
        color: '#6c757d',
        marginBottom: '5px'
    },
    performanceValue: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#2c3e50'
    },
    progressContainer: {
        marginTop: '15px'
    },
    progressBar: {
        width: '100%',
        height: '35px',
        backgroundColor: '#e9ecef',
        borderRadius: '20px',
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'width 0.5s ease-in-out',
        borderRadius: '20px'
    },
    progressText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: '0.9rem'
    },
    finalSalaryCard: {
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '12px',
        border: '4px solid'
    },
    finalSalaryHeader: {
        textAlign: 'center',
        marginBottom: '20px'
    },
    finalSalaryTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        margin: 0
    },
    finalSalaryBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    finalSalaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    finalSalaryLabel: {
        fontSize: '1rem',
        color: '#495057'
    },
    finalSalaryValue: {
        fontSize: '1.2rem',
        fontWeight: '600'
    },
    finalSalaryDivider: {
        height: '2px',
        backgroundColor: '#e9ecef',
        margin: '10px 0'
    },
    formulaCard: {
        backgroundColor: '#e3f2fd',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #2196f3'
    },
    formulaSteps: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    formulaStep: {
        padding: '15px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        fontSize: '0.95rem',
        color: '#495057'
    },
    formulaExample: {
        marginTop: '8px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        color: '#2c3e50'
    },
    rulesCard: {
        backgroundColor: '#fff3cd',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #ffc107'
    },
    rulesList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    ruleItem: {
        padding: '10px',
        fontSize: '0.95rem',
        color: '#495057',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#fff',
        borderRadius: '6px'
    },
    entriesSection: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #e9ecef'
    },
    tableWrapper: {
        overflowX: 'auto'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
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
    }
};

export default SalaryCalculator;