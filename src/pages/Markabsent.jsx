import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MarkHolidayPanel({ selectedYear: propSelectedYear, onHolidayMarked }) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [holidayCount, setHolidayCount] = useState(0);

  // Backend URL auto-switching
  const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://backend.vjcoverseas.com';

  const selectedYear = propSelectedYear || new Date().getFullYear().toString();

  useEffect(() => {
    fetchHolidays();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  function fetchHolidays() {
    if (!selectedYear) {
      setHolidays([]);
      setHolidayCount(0);
      return;
    }
    axios.get(`${backendUrl}/holidays?month=${selectedYear}`, { withCredentials: true })
      .then(res => {
        setHolidays(res.data);
        setMsg('');
        updateHolidayCount(selectedYear);
      })
      .catch((error) => {
        console.error('Failed to fetch holidays', error);
        setMsg('Failed to fetch holidays. Please try again later.');
        setHolidayCount(0);
      });
  }

  function updateHolidayCount(month) {
    axios.post(`${backendUrl}/update-holiday-count`, { month }, { withCredentials: true })
      .then(res => {
        setHolidayCount(res.data.count || 0);
      })
      .catch(() => {
        setHolidayCount(0);
      });
  }

  function markHoliday() {
    if (!date || !name.trim()) {
      setMsg('Please enter both date and holiday name.');
      return;
    }
    axios.post(`${backendUrl}/mark-holiday`, { date, name }, { withCredentials: true })
      .then(() => {
        setMsg('✅ Holiday marked successfully.');
        setDate('');
        setName('');
        fetchHolidays();
        if (onHolidayMarked) onHolidayMarked();
      })
      .catch(() => {
        setMsg('Failed to mark holiday.');
      });
  }

  function deleteHoliday(dateToDelete) {
    if (!window.confirm(`Are you sure you want to delete the holiday on ${dateToDelete}?`)) return;
    axios.delete(`${backendUrl}/delete-holiday/${dateToDelete}`, { withCredentials: true })
      .then(() => {
        setMsg('✅ Holiday deleted successfully.');
        fetchHolidays();
        if (onHolidayMarked) onHolidayMarked();
      })
      .catch(() => {
        setMsg('Failed to delete holiday.');
      });
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
          aria-label="Select holiday date"
        />
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Holiday name"
          style={styles.textInput}
          aria-label="Enter holiday name"
        />
        <button onClick={markHoliday} style={styles.markButton}>Mark</button>
      </div>
      {msg && <div style={styles.message}>{msg}</div>}
      <h3 style={styles.subheading}>Existing Holidays ({holidayCount} {holidayCount === 1 ? 'holiday' : 'holidays'})</h3>
      {holidays.length === 0 ? (
        <p style={styles.noHolidays}>No holidays found.</p>
      ) : (
        <ul style={styles.holidayList}>
          {holidays.map(({ date, name }) => (
            <li key={date} style={styles.holidayItem}>
              <span><strong>{date}</strong> - {name}</span>
              <button onClick={() => deleteHoliday(date)} style={styles.deleteButton} aria-label={`Delete holiday on ${date}`}>×</button>
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
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
  },
  heading: {
    fontSize: 28,
    marginBottom: 20,
    color: '#f97316',
    fontWeight: '700',
    textAlign: 'center',
    userSelect: 'none',
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
    border: '1.5px solid #60aaff',
    outlineColor: '#60aaff',
  },
  textInput: {
    flexGrow: 1,
    padding: '10px 12px',
    fontSize: 17,
    borderRadius: 6,
    border: '1.5px solid #60aaff',
    outlineColor: '#60aaff',
  },
  markButton: {
    padding: '11px 22px',
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#f97316',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.3s ease',
  },
  message: {
    marginTop: 14,
    color: '#16a34a',
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
    backgroundColor: 'rgba(96, 170, 255, 0.2)',
    marginBottom: 10,
    padding: '12px 18px',
    borderRadius: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 17,
    fontWeight: 500,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: 22,
    lineHeight: 1,
    padding: 0,
    transition: 'color 0.3s ease',
  },
};

export default MarkHolidayPanel;
