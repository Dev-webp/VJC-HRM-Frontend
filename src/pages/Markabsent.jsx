import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function MarkHolidayPanel({ onHolidayMarked }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [holidays, setHolidays] = useState([]);

  // Backend URL logic
  const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://backend.vjcoverseas.com';

  // Generate a list of years for the dropdown (e.g., 2023 to 2030)
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 2; i <= currentYear + 2; i++) {
    yearOptions.push(i.toString());
  }

  // Fetch holidays for the chosen year
  const fetchHolidays = useCallback(() => {
    if (!selectedYear) return;

    axios.get(`${backendUrl}/holidays?month=${selectedYear}`, { withCredentials: true })
      .then(res => {
        setHolidays(res.data);
        setMsg('');
      })
      .catch((error) => {
        console.error('Failed to fetch holidays', error);
        setMsg('Failed to fetch holidays for ' + selectedYear);
        setHolidays([]);
      });
  }, [selectedYear, backendUrl]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  function markHoliday() {
    if (!date || !name.trim()) {
      setMsg('⚠️ Please enter both date and holiday name.');
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
        setMsg('❌ Failed to mark holiday.');
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
        setMsg('❌ Failed to delete holiday.');
      });
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Manage Holidays</h2>

      {/* --- Year Selection Dropdown --- */}
      <div style={styles.selectorRow}>
        <label style={styles.label}>Select Year: </label>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(e.target.value)}
          style={styles.selectInput}
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div style={styles.formRow}>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={styles.dateInput}
        />
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Holiday name"
          style={styles.textInput}
        />
        <button onClick={markHoliday} style={styles.markButton}>Mark</button>
      </div>

      {msg && <div style={styles.message}>{msg}</div>}

      <h3 style={styles.subheading}>{selectedYear} Holiday List</h3>

      {holidays.length === 0 ? (
        <p style={styles.noHolidays}>No holidays found for {selectedYear}.</p>
      ) : (
        <ul style={styles.holidayList}>
          {holidays.map(({ date: hDate, name: hName }) => (
            <li key={hDate} style={styles.holidayItem}>
              <span><strong>{hDate}</strong> - {hName}</span>
              <button onClick={() => deleteHoliday(hDate)} style={styles.deleteButton}>×</button>
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
    fontFamily: '"Segoe UI", sans-serif',
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  heading: {
    fontSize: 26,
    marginBottom: 15,
    color: '#f97316',
    textAlign: 'center',
    fontWeight: '700',
  },
  selectorRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    padding: '10px',
    backgroundColor: '#fff7ed',
    borderRadius: 8,
  },
  label: {
    fontWeight: '600',
    color: '#4b5563',
  },
  selectInput: {
    padding: '8px',
    fontSize: 16,
    borderRadius: 6,
    border: '1.5px solid #f97316',
    cursor: 'pointer',
  },
  formRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  dateInput: {
    flex: '1',
    padding: '10px',
    borderRadius: 6,
    border: '1.5px solid #60aaff',
  },
  textInput: {
    flex: '2',
    padding: '10px',
    borderRadius: 6,
    border: '1.5px solid #60aaff',
  },
  markButton: {
    padding: '10px 20px',
    backgroundColor: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  message: {
    textAlign: 'center',
    color: '#16a34a',
    margin: '10px 0',
    fontWeight: '600',
  },
  subheading: {
    fontSize: 20,
    borderBottom: '2px solid #f97316',
    paddingBottom: 5,
    marginTop: 25,
    color: '#374151',
  },
  noHolidays: {
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 20,
    fontStyle: 'italic',
  },
  holidayList: {
    listStyle: 'none',
    padding: 0,
    marginTop: 10,
  },
  holidayItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 15px',
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ef4444',
    fontSize: 22,
    cursor: 'pointer',
  }
};

export default MarkHolidayPanel;