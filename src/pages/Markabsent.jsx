import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MarkHolidayPanel({ selectedYear: propSelectedYear, onHolidayMarked }) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [holidays, setHolidays] = useState([]);

  // Backend base URL auto-switch
  let backendBaseUrl = "https://backend.vjcoverseas.com";
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    backendBaseUrl = "http://localhost:5000";
  }

  // Default to current year if prop not provided (YYYY)
  const selectedYear = propSelectedYear || (() => {
    const now = new Date();
    return now.getFullYear().toString();
  })();

  useEffect(() => {
    console.log(`Fetching holidays for year: ${selectedYear}`);
    fetchHolidays();
    // eslint-disable-next-line
  }, [selectedYear]);

  function fetchHolidays() {
    if (!selectedYear) return;
    axios.get(`${backendBaseUrl}/holidays?month=${selectedYear}`, { withCredentials: true })  // month param used as year
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
    maxWidth: 520,
    margin: '30px auto',
    padding: 20,
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
  },
  heading: {
    fontSize: 28,
    marginBottom: 20,
    color: '#f97316', // Orange-500
    userSelect: 'none',
    fontWeight: 700,
    textAlign: 'center',
  },
  formRow: {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  dateInput: {
    flexShrink: 0,
    width: 160,
    padding: '10px 12px',
    fontSize: 17,
    borderRadius: 6,
    border: '1.5px solid #60a5fa', // Blue-400 border
    outlineColor: '#60a5fa',
  },
  textInput: {
    flexGrow: 1,
    padding: '10px 12px',
    fontSize: 17,
    borderRadius: 6,
    border: '1.5px solid #60a5fa',
    outlineColor: '#60a5fa',
  },
  markButton: {
    padding: '11px 22px',
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
    backgroundColor: '#f97316',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.3s ease',
  },
  message: {
    marginTop: 14,
    color: '#16a34a', // Green-600
    fontWeight: '600',
    textAlign: 'center',
  },
  subheading: {
    marginTop: 36,
    fontSize: 22,
    borderBottom: '3px solid #f97316',
    paddingBottom: 6,
    color: '#374151',
    userSelect: 'none',
  },
  noHolidays: {
    fontStyle: 'italic',
    color: '#6b7280',
    marginTop: 14,
    textAlign: 'center',
  },
  holidayList: {
    listStyle: 'none',
    padding: 0,
    marginTop: 12,
  },
  holidayItem: {
    background: '#60a5fa33', // light Blue-400 transparent background
    marginBottom: 10,
    padding: '12px 18px',
    borderRadius: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 17,
    fontWeight: '500',
  },
  deleteButton: {
    background: 'transparent',
    border: 'none',
    color: '#ef4444', // Red-500
    cursor: 'pointer',
    fontSize: 22,
    lineHeight: 1,
    padding: 0,
    transition: 'color 0.3s ease',
  },
};

export default MarkHolidayPanel;
