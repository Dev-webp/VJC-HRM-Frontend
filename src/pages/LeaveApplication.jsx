import React, { useState, useEffect } from 'react';
import axios from 'axios';

const styles = {
  container: { fontFamily: 'system-ui, sans-serif', backgroundColor: '#f0f2f5', padding: 30, borderRadius: 12, },
  sectionTitle: { fontSize: '1.75rem', fontWeight: '700', color: '#333', borderBottom: '3px solid #007bff', paddingBottom: 8, marginBottom: 20, },
  formContainer: { backgroundColor: '#fff', padding: 25, borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', },
  formGroup: { display: 'flex', flexDirection: 'column', marginBottom: 15, },
  label: { fontWeight: '600', marginBottom: 5, color: '#555', },
  input: { padding: 12, borderRadius: 6, border: '1px solid #ddd', fontSize: '1rem', },
  submitBtn: { padding: 12, backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 6, fontWeight: '600', cursor: 'pointer', },
  tableWrapper: { overflowX: 'auto', marginTop: 20, },
  table: { width: '100%', borderCollapse: 'collapse', },
  tableHeader: { backgroundColor: '#007bff', color: 'white', textAlign: 'left', padding: 12, borderRadius: '8px 8px 0 0', },
  tableRow: { backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderRadius: 8, },
  tableCell: { padding: 15, border: 'none', },
  remarksInput: { padding: 8, width: '100%', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: 4, },
  actionBtn: { padding: '8px 12px', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', marginRight: 8, },
  approved: { color: '#28a745' },
  rejected: { color: '#dc3545' },
  pending: { color: '#ffc107' },
};

export default function LeaveApplication({ onMessage }) {
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: auth } = await axios.get('http://localhost:5000/check-auth', { withCredentials: true });
        setUserRole(auth.role || '');
        const url = auth.role === 'chairman' ? '/all-leave-requests' : '/my-leave-requests';
        const res = await axios.get(`http://localhost:5000${url}`, { withCredentials: true });
        setLeaveRequests(res.data.map(r => ({ ...r, remarksInput: '' })));
      } catch {
        onMessage('❌ Failed to load leave requests or role');
      }
    }
    fetchData();
  }, [onMessage]);

  const applyLeave = async () => {
    if (!leaveStart || !leaveEnd || !leaveReason.trim()) return onMessage('❌ Please fill all fields');
    if (new Date(leaveEnd) < new Date(leaveStart)) return onMessage('❌ End date cannot be before start date');
    try {
      await axios.post('http://localhost:5000/apply-leave', {
        leave_type: leaveType,
        start_date: leaveStart,
        end_date: leaveEnd,
        reason: leaveReason,
      }, { withCredentials: true });
      onMessage('✅ Leave request submitted');
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
      await refreshRequests();
    } catch {
      onMessage('❌ Failed to submit leave request');
    }
  };

  const refreshRequests = async () => {
    try {
      const url = userRole === 'chairman' ? '/all-leave-requests' : '/my-leave-requests';
      const res = await axios.get(`http://localhost:5000${url}`, { withCredentials: true });
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
    try {
      await axios.post('http://localhost:5000/leave-action', {
        id: req.id,
        action,
        remarks: req.remarksInput,
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
      await axios.delete(`http://localhost:5000/delete-leave/${id}`, { withCredentials: true });
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
      case 'pending': return styles.pending;
      default: return {};
    }
  };

  return (
    <div style={styles.container}>
      {userRole !== 'chairman' && (
        <>
          <h3 style={styles.sectionTitle}>Apply for Leave</h3>
          <div style={styles.formContainer}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Type</label>
              <select value={leaveType} onChange={e => setLeaveType(e.target.value)} style={styles.input}>
                <option>Casual Leave</option>
                <option>Paid Leave</option>
                <option>Earned Leave</option>
                <option>Work From Home</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Start Date</label>
              <input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} style={styles.input}/>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>End Date</label>
              <input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} style={styles.input}/>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Reason</label>
              <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} style={{...styles.input, height: 80}} placeholder="Reason for leave"/>
            </div>
            <button onClick={applyLeave} style={styles.submitBtn}>Submit</button>
          </div>
        </>
      )}

      <h3 style={{...styles.sectionTitle, marginTop: 40}}>{userRole === 'chairman' ? "All Leave Requests" : "Your Leave Requests"}</h3>

      {leaveRequests.length ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={{backgroundColor: '#007bff', color: 'white'}}>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Remarks</th>
                {userRole === 'chairman' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((req, idx) => (
                <tr key={req.id} style={styles.tableRow}>
                  <td>{req.leave_type}</td>
                  <td>{req.start_date}</td>
                  <td>{req.end_date}</td>
                  <td>{req.reason || '-'}</td>
                  <td style={{...styles.tableCell, fontWeight: 'bold', ...getStatusStyle(req.status)}}>
                    {req.status}
                  </td>
                  <td>
                    {userRole === 'chairman' && req.status.toLowerCase() === 'pending' ? (
                      <input
                        type="text"
                        value={req.remarksInput}
                        onChange={e => updateRemarks(idx, e.target.value)}
                        placeholder="Enter remarks"
                        style={styles.remarksInput}
                      />
                    ) : req.chairman_remarks || '-'}
                  </td>
                  {userRole === 'chairman' && (
                    <td>
                      {req.status.toLowerCase() === 'pending' && (
                        <>
                          <button onClick={() => takeAction(idx, 'approve')} style={{...styles.actionBtn, backgroundColor: '#28a745'}}>Approve</button>
                          <button onClick={() => takeAction(idx, 'reject')} style={{...styles.actionBtn, backgroundColor: '#dc3545'}}>Reject</button>
                        </>
                      )}
                      <button onClick={() => deleteRequest(req.id)} style={{...styles.actionBtn, backgroundColor: '#6c757d'}}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No leave requests found.</p>
      )}
    </div>
  );
}
