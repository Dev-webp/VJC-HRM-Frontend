import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MarkHolidayPanel({ selectedMonth: propSelectedMonth, onHolidayMarked }) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [holidays, setHolidays] = useState([]);

  // Hardcoded backend base URL - change this to your production or local URL
  // For production:
  // const backendBaseUrl = "https://backend.vjcoverseas.com";
  // For local development, uncomment the next line and comment above:
  // const backendBaseUrl = "http://localhost:5000";

  // Example to auto switch based on window.location.hostname:
  let backendBaseUrl = "https://backend.vjcoverseas.com";
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    backendBaseUrl = "http://localhost:5000";
  }

  // Default to current month if prop not provided
  const selectedMonth = propSelectedMonth || (() => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  })();

  useEffect(() => {
    fetchHolidays();
    // eslint-disable-next-line
  }, [selectedMonth]);

  function fetchHolidays() {
  if (!selectedMonth) return;
  axios.get(`${backendBaseUrl}/holidays?month=${selectedMonth}`, { withCredentials: true })
    .then(res => {
      setHolidays(res.data);
      setMsg('');
    })
    .catch(error => {
      console.error('Failed to fetch holidays:', error.response || error);
      setMsg('Failed to fetch holidays. See console for details.');
    });
}


  function markHoliday() {
    if (!date || !name.trim()) {
      setMsg('Please enter both date and holiday name.');
      return;
    }
    axios.post(`${backendBaseUrl}/mark-holiday`, { date, name }, { withCredentials: true })
      .then(res => {
        setMsg(res.data.message || "Holiday marked successfully!");
        setDate('');
        setName('');
        fetchHolidays();
        if (onHolidayMarked) onHolidayMarked();
      })
      .catch(() => setMsg("Failed to mark holiday."));
  }

  function deleteHoliday(dateToDelete) {
    if (!window.confirm(`Are you sure you want to delete holiday on ${dateToDelete}?`)) return;
    axios.delete(`${backendBaseUrl}/delete-holiday/${dateToDelete}`, { withCredentials: true })
      .then(res => {
        setMsg(res.data.message || "Holiday deleted.");
        fetchHolidays();
        if (onHolidayMarked) onHolidayMarked();
      })
      .catch(() => setMsg('Failed to delete holiday.'));
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Mark Paid Holiday</h2>
      <div style={styles.formRow}>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={styles.dateInput}
          aria-label="Select Holiday Date"
        />
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Holiday Name"
          style={styles.textInput}
          aria-label="Enter Holiday Name"
        />
        <button onClick={markHoliday} style={styles.markButton}>Mark</button>
      </div>

      {msg && <div style={styles.message}>{msg}</div>}

      <h3 style={styles.subheading}>Existing Holidays</h3>
      {holidays.length === 0 ? (
        <p style={styles.noHolidays}>No holidays found</p>
      ) : (
        <ul style={styles.holidayList}>
          {holidays.map(({ date, name }) => (
            <li key={date} style={styles.holidayItem}>
              <span>
                <strong>{date}</strong> - {name}
              </span>
              <button
                onClick={() => deleteHoliday(date)}
                style={styles.deleteButton}
                aria-label={`Delete holiday on ${date}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 500,
    margin: 'auto',
    padding: 20,
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    background: '#f9f9f9',
    borderRadius: 8,
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  },
  heading: {
    fontSize: 24,
    marginBottom: 15,
    color: '#333',
  },
  formRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  dateInput: {
    flexShrink: 0,
    width: 150,
    padding: '8px 10px',
    fontSize: 16,
    borderRadius: 4,
    border: '1px solid #ccc',
  },
  textInput: {
    flexGrow: 1,
    padding: '8px 10px',
    fontSize: 16,
    borderRadius: 4,
    border: '1px solid #ccc',
  },
  markButton: {
    padding: '9px 18px',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.3s ease',
  },
  message: {
    marginTop: 12,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  subheading: {
    marginTop: 30,
    fontSize: 20,
    borderBottom: '2px solid #764ba2',
    paddingBottom: 6,
    color: '#444',
  },
  noHolidays: {
    fontStyle: 'italic',
    color: '#666',
    marginTop: 12,
  },
  holidayList: {
    listStyle: 'none',
    padding: 0,
    marginTop: 10,
  },
  holidayItem: {
    background: 'white',
    marginBottom: 8,
    padding: '10px 15px',
    borderRadius: 6,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    fontSize: 16,
  },
  deleteButton: {
    background: 'transparent',
    border: 'none',
    color: '#c62828',
    cursor: 'pointer',
    fontSize: 20,
    lineHeight: 1,
    padding: 0,
    transition: 'color 0.3s ease',
  }
};

export default MarkHolidayPanel;
