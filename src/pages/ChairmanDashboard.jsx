import React, { useEffect, useState } from 'react';
import axios from 'axios';

function timeDiff(start, end) {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}m`;
}

function ChairmanDashboard() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    axios.get('https://pgadmin-backend.onrender.com/dashboard-data', { withCredentials: true })
      .then((res) => setLogs(res.data))
      .catch(() => alert('⚠️ Failed to fetch logs'));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>👔 Chairman Dashboard</h2>
      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Date</th>
            <th>Login</th>
            <th>Logout</th>
            <th>Working Hours</th>
            <th>Late?</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => {
            const workHours = timeDiff(log.office_in, log.office_out);
            const late = log.office_in && log.office_in > '10:00:00';
            const hours = parseInt(workHours.split('h')[0]);
            const lessTime = isNaN(hours) || hours < 8;
            return (
              <tr key={i} style={{ background: lessTime ? '#ffe5e5' : 'white' }}>
                <td>{log.name}</td>
                <td>{log.email}</td>
                <td>{log.date}</td>
                <td>{log.office_in || '-'}</td>
                <td>{log.office_out || '-'}</td>
                <td>{workHours}</td>
                <td>{late ? 'Yes' : 'No'}</td>
                <td style={{ color: lessTime ? 'red' : 'green' }}>{lessTime ? 'Incomplete' : 'Complete'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ChairmanDashboard;
