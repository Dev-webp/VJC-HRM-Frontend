import React, { useState, useEffect } from 'react';
import axios from 'axios';

const baseUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://backend.vjcoverseas.com';

const styles = {
  container: { fontFamily: 'system-ui, sans-serif', backgroundColor: '#fff4e5', padding: 30, borderRadius: 12 },
  sectionTitle: { fontSize: '1.75rem', fontWeight: '700', color: '#d35400', borderBottom: '3px solid #e67e22', paddingBottom: 8, marginBottom: 20 },
  formContainer: { backgroundColor: '#fff9f0', padding: 25, borderRadius: 10, boxShadow: '0 2px 10px rgba(230,126,34,0.2)' },
  formGroup: { display: 'flex', flexDirection: 'column', marginBottom: 15 },
  label: { fontWeight: '600', marginBottom: 5, color: '#d35400' },
  input: { padding: 12, borderRadius: 6, border: '1px solid #f39c12', fontSize: '1rem', backgroundColor: '#fff8f1' },
  submitBtn: { padding: 12, backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: 6, fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.3s ease' },
  tableWrapper: { overflowX: 'auto', marginTop: 20 },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#e67e22', color: 'white', textAlign: 'left', padding: 12, borderRadius: '8px 8px 0 0' },
  tableRow: { backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(230,126,34,0.07)', borderRadius: 8, transition: 'background 0.23s', cursor: 'pointer' },
  tableRowHover: { backgroundColor: '#ffecd6' },
  tableCell: { padding: 15, border: 'none' },
  remarksInput: { padding: 8, width: '100%', boxSizing: 'border-box', border: '1px solid #f39c12', borderRadius: 4, backgroundColor: '#fff8f1' },
  actionBtn: { padding: '8px 12px', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', marginRight: 8 },
  approved: { color: '#27ae60' },
  rejected: { color: '#c0392b' },
  pending: { color: '#f39c12' },
  radioGroup: { display: 'flex', gap: 15, marginBottom: 15, alignItems: 'center' }
};

// ── Helpers ──────────────────────────────────────────────
function toBoolean(value) {
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

function diffDays(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.floor((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
}

function calculateApprovedEarnedLeaveThisMonth(requests) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let used = 0;
  for (const req of requests) {
    if (req.leave_type === 'Earned Leave' && req.status?.toLowerCase() === 'approved') {
      const start = new Date(req.start_date);
      if (start.getMonth() === month && start.getFullYear() === year) {
        used += toBoolean(req.half_day) ? 0.5 : diffDays(req.start_date, req.end_date);
      }
    }
  }
  return used;
}
// ─────────────────────────────────────────────────────────

export default function LeaveApplication({ onMessage }) {
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [paidLeaves, setPaidLeaves] = useState(0);
  const [dayType, setDayType] = useState('full');
  const [hoverIdx, setHoverIdx] = useState(-1);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: auth } = await axios.get(`${baseUrl}/check-auth`, { withCredentials: true });
        setUserRole(auth.role || '');
        const { data: meData } = await axios.get(`${baseUrl}/me`, { withCredentials: true });
        setPaidLeaves(meData.paidLeaves || 0);
        const url = auth.role === 'chairman' ? '/all-leave-requests' : '/my-leave-requests';
        const res = await axios.get(`${baseUrl}${url}`, { withCredentials: true });
        setLeaveRequests(res.data.map(r => ({ ...r, remarksInput: '' })));
      } catch {
        onMessage('❌ Failed to load leave requests or role');
      }
    }
    fetchData();
  }, [onMessage]);

  const earnedThisMonth = calculateApprovedEarnedLeaveThisMonth(leaveRequests);
  const remainingPaidLeaves = Math.max(0, +(paidLeaves - earnedThisMonth).toFixed(2));
  const isEarnedLeave = leaveType === 'Earned Leave';
  const isHalfDay = isEarnedLeave && dayType === 'half';

  const applyLeave = async () => {
    if (!leaveStart || !leaveReason.trim() || (!isHalfDay && !leaveEnd))
      return onMessage('❌ Please fill all fields');

    if (!isHalfDay && new Date(leaveEnd) < new Date(leaveStart))
      return onMessage('❌ End date cannot be before start date');

    const totalDays = isHalfDay ? 0.5 : Math.max(diffDays(leaveStart, leaveEnd), 0);

    if (isEarnedLeave) {
      if (totalDays > remainingPaidLeaves)
        return onMessage(`❌ Only ${remainingPaidLeaves} paid leave day(s) available this month`);
      if (!isHalfDay && diffDays(leaveStart, leaveEnd) !== 1)
        return onMessage('❌ Earned Leave (Full Day) must be a single day (start = end)');
    }

    try {
      await axios.post(`${baseUrl}/apply-leave`, {
        leave_type: leaveType,
        start_date: leaveStart,
        end_date: isHalfDay ? leaveStart : leaveEnd,
        reason: leaveReason,
        half_day: isHalfDay,        // true only for earned half day
        full_day: !isHalfDay        // true for everything else
      }, { withCredentials: true });

      onMessage('✅ Leave request submitted');
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
      setDayType('full');
      await refreshRequests();
    } catch {
      onMessage('❌ Failed to submit leave request');
    }
  };

  const refreshRequests = async () => {
    try {
      const url = userRole === 'chairman' ? '/all-leave-requests' : '/my-leave-requests';
      const res = await axios.get(`${baseUrl}${url}`, { withCredentials: true });
      setLeaveRequests(res.data.map(r => ({ ...r, remarksInput: '' })));
    } catch {
      onMessage('❌ Failed to refresh requests');
    }
  };

  const updateRemarks = (idx, val) => {
    setLeaveRequests(prev => {
      const copy = [...prev];
      copy[idx].remarksInput = val;
      return copy;
    });
  };

  const takeAction = async (idx, action) => {
    const req = leaveRequests[idx];
    if (!req.remarksInput.trim()) return onMessage('❌ Add remarks to proceed');

    // ── KEY FIX: always send half_day and full_day from the original request ──
    const halfDay = toBoolean(req.half_day);
    const fullDay = toBoolean(req.full_day);

    try {
      await axios.post(`${baseUrl}/leave-action`, {
        id: req.id,
        action,
        remarks: req.remarksInput,
        half_day: halfDay,
        full_day: fullDay,
      }, { withCredentials: true });

      onMessage(`✅ Leave ${action}d`);
      await refreshRequests();
    } catch {
      onMessage(`❌ Failed to ${action} leave`);
    }
  };

  const deleteRequest = async (id) => {
    if (!window.confirm('Delete this leave request?')) return;
    try {
      await axios.delete(`${baseUrl}/delete-leave-request/${id}`, { withCredentials: true });
      setLeaveRequests(prev => prev.filter(r => r.id !== id));
      onMessage('✅ Deleted successfully');
    } catch {
      onMessage('❌ Failed to delete leave request');
    }
  };

  const getStatusStyle = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved': return styles.approved;
      case 'rejected': return styles.rejected;
      case 'pending':  return styles.pending;
      default:         return {};
    }
  };

  const getLeaveDayType = (req) => {
    if (req.leave_type === 'Earned Leave') {
      return toBoolean(req.half_day) ? 'Half Day' : 'Full Day';
    }
    return '-';
  };

  return (
    <div style={styles.container}>
      {userRole !== 'chairman' && (
        <>
          <h3 style={styles.sectionTitle}>Apply for Leave</h3>
          <div style={styles.formContainer}>
            <p>
              <strong>Fixed Paid Leaves (per month):</strong> {paidLeaves}<br />
              <strong>Remaining Paid Leaves This Month:</strong> {remainingPaidLeaves}
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Type</label>
              <select
                value={leaveType}
                onChange={e => { setLeaveType(e.target.value); setDayType('full'); setLeaveEnd(''); }}
                style={styles.input}
              >
                <option>Casual Leave</option>
                <option>Sick Leave</option>
                <option>Earned Leave</option>
                <option>Work From Home</option>
              </select>
            </div>

            {isEarnedLeave && (
              <div style={styles.radioGroup}>
                <label style={styles.label}>
                  <input type="radio" name="dayType" value="full" checked={dayType === 'full'} onChange={() => setDayType('full')} />
                  {' '}Full Day
                </label>
                <label style={styles.label}>
                  <input type="radio" name="dayType" value="half" checked={dayType === 'half'} onChange={() => setDayType('half')} />
                  {' '}Half Day
                </label>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>{isHalfDay ? 'Date' : 'Start Date'}</label>
              <input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} style={styles.input} />
            </div>

            {!isHalfDay && (
              <div style={styles.formGroup}>
                <label style={styles.label}>End Date</label>
                <input
                  type="date"
                  value={leaveEnd}
                  onChange={e => setLeaveEnd(e.target.value)}
                  style={styles.input}
                  min={isEarnedLeave && leaveStart ? leaveStart : undefined}
                  max={isEarnedLeave && leaveStart ? leaveStart : undefined}
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Reason</label>
              <textarea
                value={leaveReason}
                onChange={e => setLeaveReason(e.target.value)}
                style={{ ...styles.input, height: 80 }}
                placeholder="Reason for leave"
              />
            </div>

            <button onClick={applyLeave} style={styles.submitBtn}>Submit</button>
          </div>
        </>
      )}

      <h3 style={{ ...styles.sectionTitle, marginTop: 40 }}>
        {userRole === 'chairman' ? 'All Leave Requests' : 'Your Leave Requests'}
      </h3>

      {leaveRequests.length ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th>Type</th>
                <th>Day Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Remarks</th>
                {userRole === 'chairman' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((req, idx) => {
                const halfDay = toBoolean(req.half_day);
                return (
                  <tr
                    key={req.id}
                    style={hoverIdx === idx ? { ...styles.tableRow, ...styles.tableRowHover } : styles.tableRow}
                    onMouseEnter={() => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx(-1)}
                  >
                    <td style={styles.tableCell}>
                      {req.leave_type === 'Earned Leave'
                        ? `Earned Leave (${halfDay ? 'Half Day' : 'Full Day'})`
                        : req.leave_type}
                    </td>
                    <td style={styles.tableCell}>{getLeaveDayType(req)}</td>
                    <td style={styles.tableCell}>{req.start_date}</td>
                    <td style={styles.tableCell}>{req.end_date}</td>
                    <td style={styles.tableCell}>{req.reason || '-'}</td>
                    <td style={{ ...styles.tableCell, fontWeight: 'bold', ...getStatusStyle(req.status) }}>
                      {req.status}
                    </td>
                    <td style={styles.tableCell}>
                      {userRole === 'chairman' && req.status.toLowerCase() === 'pending' ? (
                        <input
                          type="text"
                          value={req.remarksInput}
                          onChange={e => updateRemarks(idx, e.target.value)}
                          placeholder="Enter remarks"
                          style={styles.remarksInput}
                        />
                      ) : (
                        <span style={{ fontSize: '0.95em', color: '#333' }}>
                          {req.chairman_remarks || '-'}
                          {(req.actioned_by_role || req.actioned_by_name) && (
                            <>
                              <br />
                              <span style={{ color: '#777', fontSize: '0.85em', fontStyle: 'italic' }}>
                                {req.status?.toLowerCase() === 'approved'
                                  ? `Approved By: ${req.actioned_by_role || ''}${req.actioned_by_name ? ' - ' + req.actioned_by_name : ''}`
                                  : req.status?.toLowerCase() === 'rejected'
                                    ? `Rejected By: ${req.actioned_by_role || ''}${req.actioned_by_name ? ' - ' + req.actioned_by_name : ''}`
                                    : `By: ${req.actioned_by_role || ''}${req.actioned_by_name ? ' - ' + req.actioned_by_name : ''}`}
                              </span>
                            </>
                          )}
                        </span>
                      )}
                    </td>
                    {userRole === 'chairman' && (
                      <td style={styles.tableCell}>
                        {req.status.toLowerCase() === 'pending' && (
                          <>
                            <button onClick={() => takeAction(idx, 'approve')} style={{ ...styles.actionBtn, backgroundColor: '#27ae60' }}>
                              Approve
                            </button>
                            <button onClick={() => takeAction(idx, 'reject')} style={{ ...styles.actionBtn, backgroundColor: '#c0392b' }}>
                              Reject
                            </button>
                          </>
                        )}
                        <button onClick={() => deleteRequest(req.id)} style={{ ...styles.actionBtn, backgroundColor: '#7f8c8d' }}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No leave requests found.</p>
      )}
    </div>
  );
}