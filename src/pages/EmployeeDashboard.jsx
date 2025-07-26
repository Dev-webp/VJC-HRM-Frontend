import React, { useState, useEffect } from 'react';
import axios from 'axios';

function EmployeeDashboard() {
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState('');
  const [imageInput, setImageInput] = useState('');

  useEffect(() => {
    axios.get('https://pgadmin-backend.onrender.com/me', { withCredentials: true })
      .then((res) => {
        console.log("✅ Profile loaded", res.data);
        setProfile(res.data);
        setImageInput(res.data.image || '');
      })
      .catch((err) => {
        console.log("❌ Failed to load profile", err.response?.data || err.message);
        setMessage('❌ Failed to fetch profile');
      });

    axios.get('https://pgadmin-backend.onrender.com/my-attendance', { withCredentials: true })
      .then((res) => setLogs(res.data))
      .catch(() => setMessage('❌ Failed to fetch attendance logs'));
  }, []);

  const sendAction = async (action) => {
    try {
      const res = await axios.post(
        'https://pgadmin-backend.onrender.com/attendance',
        new URLSearchParams({ action }),
        { withCredentials: true }
      );
      setMessage('✅ ' + res.data.message);
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Something went wrong'));
    }
  };

  const saveProfileImage = async () => {
    try {
      await axios.post(
        'https://pgadmin-backend.onrender.com/update-profile-image',
        new URLSearchParams({ image: imageInput }),
        { withCredentials: true }
      );
      setProfile({ ...profile, image: imageInput });
      setMessage('✅ Image URL updated successfully');
    } catch (err) {
      setMessage('❌ Failed to update image');
    }
  };

  return (
    <div style={styles.page}>
      {/* Profile */}
      {profile ? (
        <div style={styles.profileCard}>
          <img
            src={profile.image || 'https://via.placeholder.com/120'}
            alt="Profile"
            style={styles.avatar}
          />
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: 5 }}>{profile.name}</h2>
            <p><strong>Employee ID:</strong> #{profile.id}</p>
            <p><strong>Email:</strong> {profile.email}</p>

            <div style={{ marginTop: 10 }}>
              <input
                type="text"
                placeholder="Paste image URL"
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                style={{ padding: '6px', width: '80%' }}
              />
              <button onClick={saveProfileImage} style={{ marginLeft: 10, ...styles.button }}>Save</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...styles.profileCard, justifyContent: 'center' }}>
          <p>Loading profile...</p>
        </div>
      )}

      {/* Buttons */}
      <div style={styles.buttonGrid}>
        {['office_in', 'break_out', 'break_in', 'lunch_out', 'lunch_in', 'office_out'].map((action) => (
          <button key={action} style={styles.button} onClick={() => sendAction(action)}>
            {action.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <p style={styles.message}>{message}</p>

      {/* Attendance Logs */}
      <h3 style={{ marginTop: 30 }}>🗂️ Attendance History</h3>
      {logs.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Login</th>
                <th>Break Out</th>
                <th>Break In</th>
                <th>Lunch Out</th>
                <th>Lunch In</th>
                <th>Logout</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index}>
                  <td>{log.date}</td>
                  <td>{log.office_in || '-'}</td>
                  <td>{log.break_out || '-'}</td>
                  <td>{log.break_in || '-'}</td>
                  <td>{log.lunch_out || '-'}</td>
                  <td>{log.lunch_in || '-'}</td>
                  <td>{log.office_out || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: 'center', marginTop: 10 }}>No attendance logs found.</p>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    fontFamily: 'Segoe UI, sans-serif',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh',
  },
  profileCard: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 30,
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    gap: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    border: '3px solid #007bff',
    objectFit: 'cover',
  },
  buttonGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    padding: '10px 18px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: '#fff',
  },
  message: {
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 20,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    boxShadow: '0 0 10px rgba(0,0,0,0.05)',
  },
};

export default EmployeeDashboard;
