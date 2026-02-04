import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

export default function AttendanceChatLogs() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedUserEmail, setExpandedUserEmail] = useState(null);
  const [showCards, setShowCards] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);

  // Edit states
  const [editLogUserEmail, setEditLogUserEmail] = useState(null);
  const [editLogData, setEditLogData] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editedFields, setEditedFields] = useState({}); 

  // Row highlight state for recently saved row
  const [lastSavedDate, setLastSavedDate] = useState(null);
  
  // History logs and historical change state
  const [historyLogs, setHistoryLogs] = useState({}); 
  const [historyLoading, setHistoryLoading] = useState(false);
  const [changedFieldsByDate, setChangedFieldsByDate] = useState({}); 

  // CRITICAL: State to hold the ID of the currently focused input (date-field)
  const [activeInputId, setActiveInputId] = useState(null);
  
  // CRITICAL: Ref to hold the scroll position of the modal's content area
  const modalScrollRef = useRef(0); 
  // State to signal that scrolling is being handled internally
  const [isScrollingHandled, setIsScrollingHandled] = useState(false); 


  // --- Initial Data Fetch ---
  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const res = await axios.get(`${baseUrl}/me`, {
          withCredentials: true,
        });
        setCurrentUserRole(res.data.role);
        setCurrentUserLocation(res.data.location);
      } catch (err) {
        console.error("Failed to fetch user info", err);
      }
    }
    fetchUserInfo();
  }, []);

  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);
  const formattedToday = todayDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const month = todayStr.slice(0, 7);
  const formatTime = (t) => (t ? t.slice(0, 5) : "-");
  
  // --- Core Utility Functions (Omitted for brevity) ---

  const formatLogValue = (val) => {
    if (Array.isArray(val)) {
        return (val || []).map(v => v ? v.slice(0, 5) : '-').sort().join(',');
    }
    return val ? val.slice(0, 5) : '-';
  }

  const compareLogs = (currentLog, oldLog) => {
      const changes = {};
      let hasChanges = false;
      const TIME_FIELDS = [
          "office_in", "break_in", "break_out", "lunch_in", "lunch_out", 
          "break_in_2", "break_out_2", "office_out"
      ];
      TIME_FIELDS.forEach(field => {
          const currentVal = formatLogValue(currentLog[field]);
          const oldVal = formatLogValue(oldLog[field]);
          if (currentVal !== oldVal) { changes[field] = true; hasChanges = true; }
      });
      const EXTRA_BREAKS_FIELDS = ["extra_break_ins", "extra_break_outs"];
      EXTRA_BREAKS_FIELDS.forEach(field => {
          const currentVal = formatLogValue(currentLog[field]); 
          const oldVal = formatLogValue(oldLog[field]);
          if (currentVal !== oldVal) { changes[field] = true; hasChanges = true; }
      });
      const currentRemark = currentLog.paid_leave_reason || currentLog.reason || '-';
      const oldRemark = oldLog.paid_leave_reason || oldLog.reason || '-';
      if (currentRemark.trim() !== oldRemark.trim()) {
           changes["paid_leave_reason"] = true; hasChanges = true;
      }
      return hasChanges ? changes : null; 
  };


  const fetchAttendanceLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${baseUrl}/all-attendance?month=${month}`, { withCredentials: true });
      const usersObj = res.data || {};
      const usersArray = Object.entries(usersObj).map(([email, user]) => ({ email, ...user }));
      setAttendanceData(usersArray);
      return usersObj; 
    } catch (error) {
      setError("Failed to fetch attendance logs");
      setAttendanceData([]);
      return {};
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryLogs = async (userEmail, logsToCompare) => {
    setHistoryLoading(true);
    setHistoryLogs({});
    setChangedFieldsByDate({}); 
    try {
      const res = await axios.get(`${baseUrl}/attendance-history/${encodeURIComponent(userEmail)}?month=${month}`, { withCredentials: true });
      const history = res.data.history || {};
      setHistoryLogs(history); 
      const newChangedFields = {};
      logsToCompare.forEach(log => {
          const date = log.date;
          const lastHistoryLog = history[date] ? history[date][0] : null;
          if (lastHistoryLog) {
              const changes = compareLogs(log, lastHistoryLog);
              if (changes) {
                  newChangedFields[date] = changes;
              }
          }
      });
      setChangedFieldsByDate(newChangedFields);
    } catch (error) {
      console.error("Failed to fetch history logs:", error);
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchAttendanceLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      if (lastSavedDate) {
          const timer = setTimeout(() => {
              setLastSavedDate(null);
          }, 3500); 
          return () => clearTimeout(timer);
      }
  }, [lastSavedDate]);

  const userLogs = useMemo(() => {
    const filtered = attendanceData.filter((user) => {
        if (currentUserRole === "chairman" || currentUserRole === "mis-execuitve") { return true; } 
        else if (currentUserRole === "manager") { return user.location === currentUserLocation; }
        return false;
    });
    return filtered
        .map((user) => {
            const todayAttendance = (user.attendance || []).find((a) => a.date === todayStr) || {};
            return { ...user, todayAttendance };
        })
        .sort((a, b) => {
            if (a.todayAttendance.office_in && !b.todayAttendance.office_in) return -1;
            if (!a.todayAttendance.office_in && b.todayAttendance.office_in) return 1;
            const nameA = a.name || a.email;
            const nameB = b.name || b.email;
            return nameA.localeCompare(nameB);
        });
  }, [attendanceData, currentUserRole, currentUserLocation, todayStr]);


  // --- Edit Logic ---

  const startEditLogs = (user) => {
    setEditLogUserEmail(user.email);
    setEditedFields({}); 
    setChangedFieldsByDate({}); 
    modalScrollRef.current = 0; 
    setIsScrollingHandled(false); 
    setActiveInputId(null); 
    
    const editObj = {};
    (user.attendance || []).forEach((log) => {
      editObj[log.date] = { 
        ...log,
        extra_break_ins: log.extra_break_ins || [],
        extra_break_outs: log.extra_break_outs || []
      };
    });
    setEditLogData(editObj);
  };

  const handleLogFieldChange = useCallback((date, field, value) => {
    setLastSavedDate(null); 

    // Capture scroll position
    const modalContent = document.getElementById('expanded-modal-content');
    if (modalContent) {
        modalScrollRef.current = modalContent.scrollTop;
    }
    
    // Signal scroll restoration is needed
    setIsScrollingHandled(true); 

    setEditedFields(prev => ({
        ...prev,
        [date]: {
            ...prev[date],
            [field]: true, 
        }
    }));

    // Trigger state change which causes re-render
    setEditLogData((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: value,
      },
    }));
  }, []);


  const saveEditedLogs = async (userEmail) => {
    setEditSaving(true);
    try {
      const logsToSave = Object.values(editLogData);
      await axios.put(
        `${baseUrl}/edit-attendance/${encodeURIComponent(userEmail)}`,
        { logs: logsToSave },
        { withCredentials: true }
      );
      
      const datesEdited = Object.keys(editLogData);
      const lastEditedDate = datesEdited[datesEdited.length - 1]; 

      setEditLogUserEmail(null);
      setEditLogData({});
      setEditedFields({}); 
      setIsScrollingHandled(false); 
      setActiveInputId(null); 
      
      if (lastEditedDate) { setLastSavedDate(lastEditedDate); }

      const updatedLogsObject = await fetchAttendanceLogs(); 
      const updatedUser = updatedLogsObject[userEmail];
      if (updatedUser) { fetchHistoryLogs(userEmail, updatedUser.attendance || []); }

    } catch (e) {
      alert("Failed to save edits.");
    }
    setEditSaving(false);
  };

  const handleOpenExpandedLog = (userEmail) => {
    setExpandedUserEmail(userEmail);
    const user = userLogs.find(u => u.email === userEmail);
    modalScrollRef.current = 0; 
    setIsScrollingHandled(false);
    setActiveInputId(null);
    if (user) { fetchHistoryLogs(userEmail, user.attendance || []); }
  };
  
  // CRITICAL: Handle Focus with Scroll Suppression
  const handleInputFocus = useCallback((e, date, field) => {
      const inputId = `${date}-${field}`;
      setActiveInputId(inputId);

      // Prevent the browser's default scroll-into-view behavior
      if (e.target.scrollIntoView) {
          e.target.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
      }
  }, []);


  // --- Components ---
  const AttendanceHistorySection = React.memo(({ date, historyLogs }) => {
    // (History section component remains the same, omitted for brevity)
    const history = historyLogs[date] || []; 
    const editCount = history.length; 
    const [isExpanded, setIsExpanded] = useState(false);
    const formatTime = (t) => (t ? t.slice(0, 5) : "-");

    if (editCount === 0) { return null; }
    
    return (
        <div style={premiumStyles.historyContainer}>
            <button 
                style={{
                    ...premiumStyles.historyToggleButton, 
                    backgroundColor: isExpanded ? '#fca5a5' : '#e0f2f1',
                    color: isExpanded ? '#b91c1c' : '#047857',
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded 
                    ? `❌ Hide Edit History` 
                    : `📝 View Edit History (${editCount} ${editCount === 1 ? 'Time' : 'Times'} Edited)`
                }
            </button>
            {isExpanded && history.map((oldLog, index) => ( 
                <div key={index} style={{ ...premiumStyles.historyLogItem, marginTop: index > 0 ? 15 : 10, border: index === 0 ? '1px dashed #ef4444' : '1px dashed #fca5a5' }}>
                    <div style={premiumStyles.historyHeader}>
                        <span style={{fontWeight: 700}}>Log State **Before Edit #{editCount - index}** </span>
                        <span>Edited By: <strong style={{color: '#10b981'}}>{oldLog.edited_by_email || oldLog.edited_by_user_id}</strong></span>
                        <span>Edited On: **{new Date(oldLog.edited_at).toLocaleString()}**</span>
                    </div>
                    <table style={premiumStyles.historyTable}>
                        <thead>
                            <tr style={{backgroundColor: '#e0f2f1'}}>
                                {['Login', 'B.IN', 'B.OUT', 'L.IN', 'L.OUT', 'B2.IN', 'B2.OUT', 'Logout', 'Extra B.INs', 'Extra B.OUTs', 'Remarks'].map(h => (
                                    <th key={h} style={premiumStyles.historyTh}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={premiumStyles.historyTd}>{formatTime(oldLog.office_in)}</td>
                                <td style={premiumStyles.historyTd}>{formatTime(oldLog.break_in)}</td>
                                <td style={premiumStyles.historyTd}>{formatTime(oldLog.break_out)}</td>
                                <td style={premiumStyles.historyTd}>{formatTime(oldLog.lunch_in)}</td>
                                <td style={premiumStyles.historyTd}>{formatTime(oldLog.lunch_out)}</td>
                                <td style={premiumStyles.historyTd}>{formatTime(oldLog.break_in_2)}</td>
                                <td style={premiumStyles.historyTd}>{formatTime(oldLog.break_out_2)}</td>
                                <td style={premiumStyles.historyTd}>{formatTime(oldLog.office_out)}</td>
                                <td style={premiumStyles.historyTd}>{(oldLog.extra_break_ins || []).join('\n') || '-'}</td>
                                <td style={premiumStyles.historyTd}>{(oldLog.extra_break_outs || []).join('\n') || '-'}</td>
                                <td style={premiumStyles.historyTd}>{oldLog.paid_leave_reason || oldLog.reason || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ))}
            {isExpanded && (
                <div style={{...premiumStyles.historyHeader, marginTop: 15, borderTop: '2px solid #10b981', paddingTop: 8, textAlign: 'center', justifyContent: 'center'}}>
                     <span style={{fontWeight: 900, fontSize: 14, color: '#047857'}}>⬆️ THE ROW ABOVE (IN THE BLUE TABLE) IS THE **CURRENT** LOG.</span>
                </div>
            )}
        </div>
    );
  });


  const ExpandedLogTableContent = React.memo(({ 
    user, isEditing, editLogData, handleLogFieldChange, 
    lastSavedDate, editedFields, changedFieldsByDate, historyLogs, historyLoading, 
    handleInputFocus, activeInputId
  }) => {
    const formatTime = (t) => (t ? t.slice(0, 5) : "-");

    // Ref object to hold all input refs
    const inputRefs = useRef({}); 
    // Effect to re-focus the active input *without* scrolling after render
    useEffect(() => {
        if (activeInputId && inputRefs.current[activeInputId]) {
             requestAnimationFrame(() => {
                // Focus with preventScroll: true to completely disable browser auto-scrolling
                inputRefs.current[activeInputId].focus({ preventScroll: true }); 
             });
        }
    }, [editLogData, activeInputId]); 


    return (
        <div style={premiumStyles.tableWrapper}>
            <table style={premiumStyles.table}>
              <thead>
                <tr style={premiumStyles.tableHeaderRow}>
                  <th style={premiumStyles.tableTh}>DATE</th>
                  <th style={premiumStyles.tableTh}>LOGIN</th>
                  <th style={premiumStyles.tableTh}>B.IN</th>
                  <th style={premiumStyles.tableTh}>B.OUT</th>
                  <th style={premiumStyles.tableTh}>L.IN</th>
                  <th style={premiumStyles.tableTh}>L.OUT</th>
                  <th style={premiumStyles.tableTh}>B2.IN</th>
                  <th style={premiumStyles.tableTh}>B2.OUT</th>
                    <th style={premiumStyles.tableTh}>LOGOUT</th>
                  <th style={premiumStyles.tableTh}>EXTRA BREAK INS</th>
                  <th style={premiumStyles.tableTh}>EXTRA BREAK OUTS</th>
                  <th style={premiumStyles.tableTh}>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                    <tr><td colSpan="12" style={{textAlign: 'center', padding: '20px', fontStyle: 'italic'}}>Loading history...</td></tr>
                ) : (user.attendance || []).map((log) => {
                  const rowIsToday = log.date === todayStr;
                  const rowIsLastSaved = log.date === lastSavedDate;
                  const rowData = isEditing && editLogData[log.date] ? editLogData[log.date] : log;
                  const rowEditedFields = editedFields[log.date] || {};
                  const rowChangedFields = changedFieldsByDate[log.date] || {};

                  return (
                    <React.Fragment key={log.date}>
                        <tr
                            style={{
                                ...premiumStyles.tableBodyRow,
                                ...(rowIsToday ? premiumStyles.highlightRow : {}),
                                ...(rowIsLastSaved ? premiumStyles.savedHighlightRow : {}),
                            }}
                        >
                            <td style={premiumStyles.tableTd}>{log.date}</td>
                            {[
                            "office_in", "break_in", "break_out", "lunch_in", "lunch_out", 
                            "break_in_2", "break_out_2", "office_out",
                            ].map((field) => {
                                const isFieldEdited = isEditing && rowEditedFields[field];
                                const isFieldChanged = !isEditing && !!rowChangedFields[field];
                                const inputId = `${log.date}-${field}`;

                                return (
                                    <td 
                                        style={{
                                            ...premiumStyles.tableTd,
                                            ...(isFieldEdited ? premiumStyles.cellEditHighlight : {}),
                                            ...(isFieldChanged ? premiumStyles.cellHistoryChangeHighlight : {}),
                                        }} 
                                        key={field}
                                    >
                                        {isEditing ? (
                                            <input
                                                type="time"
                                                // **FIX:** Disable prediction/autocomplete 
                                                // which interferes when typing time manually
                                                autocomplete="off" 
                                                key={inputId} 
                                                ref={el => inputRefs.current[inputId] = el} 
                                                value={rowData[field] ? rowData[field].slice(0, 5) : ""}
                                                onChange={(e) => handleLogFieldChange(log.date, field, e.target.value)}
                                                onFocus={(e) => handleInputFocus(e, log.date, field)} 
                                                style={{ width: 86 }}
                                            />
                                        ) : (
                                            formatTime(log[field])
                                        )}
                                    </td>
                                );
                            })}
                            
                            {/* EXTRA BREAK INS */}
                            <td style={{ ...premiumStyles.tableTd, whiteSpace: "pre-wrap", textAlign: "center", fontSize: 12, ...(isEditing && rowEditedFields.extra_break_ins ? premiumStyles.cellEditHighlight : {}), ...(!isEditing && rowChangedFields.extra_break_ins ? premiumStyles.cellHistoryChangeHighlight : {})}}>
                                {isEditing ? (
                                    <input
                                        type="text" // Changed to text to better handle comma separation
                                        autocomplete="off" // **FIX**
                                        key={`${log.date}-extra_break_ins`}
                                        ref={el => inputRefs.current[`${log.date}-extra_break_ins`] = el}
                                        style={{ width: "100px" }}
                                        value={(rowData.extra_break_ins || []).join(",")}
                                        placeholder="09:00,16:24"
                                        onChange={(e) => handleLogFieldChange(log.date, "extra_break_ins", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
                                        onFocus={(e) => handleInputFocus(e, log.date, "extra_break_ins")}
                                    />
                                ) : log.extra_break_ins && log.extra_break_ins.length > 0 ? (log.extra_break_ins.map((t) => t || "-").join("\n")) : ("-")}
                            </td>

                            {/* EXTRA BREAK OUTS */}
                            <td style={{ ...premiumStyles.tableTd, whiteSpace: "pre-wrap", textAlign: "center", fontSize: 12, ...(isEditing && rowEditedFields.extra_break_outs ? premiumStyles.cellEditHighlight : {}), ...(!isEditing && rowChangedFields.extra_break_outs ? premiumStyles.cellHistoryChangeHighlight : {})}}>
                                {isEditing ? (
                                    <input
                                        type="text" // Changed to text to better handle comma separation
                                        autocomplete="off" // **FIX**
                                        key={`${log.date}-extra_break_outs`}
                                        ref={el => inputRefs.current[`${log.date}-extra_break_outs`] = el}
                                        style={{ width: "100px" }}
                                        value={(rowData.extra_break_outs || []).join(",")}
                                        placeholder="12:00,18:02"
                                        onChange={(e) => handleLogFieldChange(log.date, "extra_break_outs", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
                                        onFocus={(e) => handleInputFocus(e, log.date, "extra_break_outs")}
                                    />
                                ) : log.extra_break_outs && log.extra_break_outs.length > 0 ? (log.extra_break_outs.map((t) => t || "-").join("\n")) : ("-")}
                            </td>
                            
                            {/* REMARKS/REASON */}
                            <td style={{ ...premiumStyles.tableTd, ...(isEditing && rowEditedFields.paid_leave_reason ? premiumStyles.cellEditHighlight : {}), ...(!isEditing && rowChangedFields.paid_leave_reason ? premiumStyles.cellHistoryChangeHighlight : {})}}>
                                {isEditing ? (
                                    <input
                                        type="text" // Changed to text for standard input behavior
                                        autocomplete="off" // **FIX**
                                        key={`${log.date}-paid_leave_reason`}
                                        ref={el => inputRefs.current[`${log.date}-paid_leave_reason`] = el}
                                        style={{ width: 140 }}
                                        value={rowData.paid_leave_reason || rowData.reason || ""}
                                        placeholder="Remarks"
                                        onChange={(e) => handleLogFieldChange(log.date, "paid_leave_reason", e.target.value)}
                                        onFocus={(e) => handleInputFocus(e, log.date, "paid_leave_reason")}
                                    />
                                ) : (log.paid_leave_reason || log.reason || "-")}
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="12" style={{padding: '0 10px', backgroundColor: '#f0f9ff', borderBottom: '2px solid #e0e7ff'}}>
                                <AttendanceHistorySection date={log.date} historyLogs={historyLogs} />
                            </td>
                        </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
        </div>
    );
  });
  
  const ExpandedLogSection = ({ user, isScrollingHandled, setIsScrollingHandled }) => {
    const isEditing = editLogUserEmail === user.email;
    const modalContentRef = useRef(null);

    // CRITICAL FIX: Re-apply scroll position after render using a safer sequence
    useEffect(() => {
        if (isScrollingHandled && modalContentRef.current) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (modalContentRef.current) {
                        modalContentRef.current.scrollTop = modalScrollRef.current;
                        setIsScrollingHandled(false); // Reset the flag
                    }
                }, 0);
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editLogData]); // Rerun this effect anytime the edit data changes

    return (
      <div style={premiumStyles.expandedModalBackdrop}>
        <div 
            ref={modalContentRef} 
            id="expanded-modal-content" // Set the ID here for the handler to find it
            style={premiumStyles.expandedModalContent}
        >
          <div style={premiumStyles.modalHeader}>
            <h2>
              Monthly Attendance Log for{" "}
              <span style={{ color: premiumStyles.viewLogButton.backgroundColor }}>{user.name || user.email}</span>
            </h2>
            <div>
              {!isEditing && (
                <button style={{ ...premiumStyles.viewLogButton, marginRight: 10 }} onClick={() => startEditLogs(user)}>Edit</button>
              )}
              {isEditing && (
                <>
                  <button style={{ ...premiumStyles.viewLogButton, marginRight: 10, background: "#10b981" }} disabled={editSaving} onClick={() => saveEditedLogs(user.email)}>
                    {editSaving ? "Saving..." : "Save"}
                  </button>
                  <button style={{ ...premiumStyles.viewLogButton, marginRight: 10, background: "#f97316" }} onClick={() => {
                        setEditLogUserEmail(null);
                        setEditLogData({});
                        setEditedFields({}); 
                        setIsScrollingHandled(false); 
                        setActiveInputId(null);
                    }}>Cancel Edit</button>
                </>
              )}
              <button style={premiumStyles.modalCloseButton} onClick={() => {
                  setExpandedUserEmail(null); setEditLogUserEmail(null); setEditLogData({}); setHistoryLogs({}); setEditedFields({}); setChangedFieldsByDate({}); setIsScrollingHandled(false); setActiveInputId(null);
                }}>&times;</button>
            </div>
          </div>
          
          <ExpandedLogTableContent
            user={user}
            isEditing={isEditing}
            editLogData={editLogData}
            handleLogFieldChange={handleLogFieldChange}
            lastSavedDate={lastSavedDate}
            editedFields={editedFields}
            changedFieldsByDate={changedFieldsByDate}
            historyLogs={historyLogs}
            historyLoading={historyLoading}
            handleInputFocus={handleInputFocus} 
            activeInputId={activeInputId} 
          />

        </div>
      </div>
    );
  };

  const expandedUser = userLogs.find((u) => u.email === expandedUserEmail);
  const userLogsNoChairman = userLogs.filter(user => user.role !== "chairman");
  const totalUsers = userLogsNoChairman.length;
  const presentUsers = userLogsNoChairman.filter(u => u.todayAttendance.office_in).length;
  const absentUsers = totalUsers - presentUsers;

  // --- Main Render (Omitted for brevity) ---
  return (
    <div style={premiumStyles.container}>
      
      <div style={premiumStyles.summaryBar}>
        <div style={premiumStyles.dateDisplay}><span style={{ fontSize: "1.2rem", marginRight: 10 }}>📅</span><strong>{formattedToday}</strong></div>
        <div style={premiumStyles.statsGroup}>
          <div style={premiumStyles.summaryItem}><span style={premiumStyles.statLabel}>Total Employees:</span><span style={premiumStyles.statValue}>{totalUsers}</span></div>
          <div style={{ ...premiumStyles.summaryItem, color: "#10b981" }}><span style={premiumStyles.statLabel}>Present Today:</span><span style={premiumStyles.statValue}>{presentUsers}</span></div>
          <div style={{ ...premiumStyles.summaryItem, color: "#ef4444" }}><span style={premiumStyles.statLabel}>Absent Today:</span><span style={premiumStyles.statValue}>{absentUsers}</span></div>
        </div>
        <button style={premiumStyles.showUsersButton} onClick={() => setShowCards(!showCards)}>
          {showCards ? "Hide User Cards" : "Show User Cards"}
        </button>
      </div>

      {error && <div style={premiumStyles.error}>{error}</div>}

      {loading ? (
        <div style={premiumStyles.loading}>Loading attendance records...</div>
      ) : (
        showCards && (
          <div style={premiumStyles.cardsContainer}>
          {userLogs
            .filter(user => user.role !== "chairman")
            .map((user) => {
              const isPresent = user.todayAttendance.office_in;
              return (
                <div key={user.email} style={{ ...premiumStyles.card, borderLeft: isPresent ? "5px solid #10b981" : "5px solid #ef4444" }}>
                  <div style={premiumStyles.cardContent}>
                    <div><span style={premiumStyles.cardName}>{user.name || "Unknown Employee"}</span><div style={premiumStyles.cardEmail}>{user.email}</div></div>
                    <button style={premiumStyles.viewLogButton} onClick={() => handleOpenExpandedLog(user.email)}>View Logs</button>
                  </div>
                  <div style={premiumStyles.todayAttendance}>
                    <div style={{ color: isPresent ? "#10b981" : "#ef4444", fontWeight: 700, marginBottom: 8 }}>{isPresent ? "🟢 Present Today" : "🔴 Absent Today"}</div>
                    {isPresent ? (
                      <div style={premiumStyles.logLine}><span style={premiumStyles.logLabel}>Login:</span><span style={premiumStyles.logTime}>{formatTime(user.todayAttendance.office_in)}</span></div>
                    ) : (
                      <div style={premiumStyles.logLine}><span style={premiumStyles.logLabel}>Status:</span><span style={premiumStyles.logTime}>{user.todayAttendance.paid_leave_reason || user.todayAttendance.reason || "Not Logged In"}</span></div>
                    )}
                    {user.todayAttendance.office_out && (<div style={premiumStyles.logLine}><span style={premiumStyles.logLabel}>Logout:</span><span style={premiumStyles.logTime}>{formatTime(user.todayAttendance.office_out)}</span></div>)}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {expandedUser && <ExpandedLogSection 
          user={expandedUser} 
          isScrollingHandled={isScrollingHandled} 
          setIsScrollingHandled={setIsScrollingHandled} 
        />}
    </div>
  );
}

// --- Styles (Omitted for brevity) ---
const historyStyles = {
    historyContainer: { width: '100%', padding: '10px 0', boxSizing: 'border-box' },
    historyToggleButton: { background: '#e0f2f1', color: '#047857', border: 'none', borderRadius: 6, padding: '6px 15px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s', display: 'block', margin: '5px auto', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', userSelect: 'none' },
    historyLogItem: { marginTop: 10, padding: 15, border: '1px dashed #fca5a5', borderRadius: 8, backgroundColor: '#fef2f2', boxShadow: '0 2px 5px rgba(252,165,165,0.4)' },
    historyHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 5, borderBottom: '1px solid #fecaca', fontSize: 12, color: '#991b1b', fontWeight: 500, flexWrap: 'wrap', gap: 8 },
    historyTable: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
    historyTh: { padding: 6, textAlign: 'center', backgroundColor: '#fecaca', color: '#991b1b', fontWeight: 700, border: '1px solid #fca5a5' },
    historyTd: { padding: 6, textAlign: 'center', border: '1px solid #fecaca', color: '#991b1b', whiteSpace: 'pre-wrap' },
}

const premiumStyles = {
    ...historyStyles, 
    cellHistoryChangeHighlight: { backgroundColor: '#ffadad !important', border: '2px solid #b91c1c !important', fontWeight: '700', color: '#991b1b' },
    cellEditHighlight: { backgroundColor: '#fffbeb !important', border: '1px solid #f59e0b !important' },
    savedHighlightRow: { backgroundColor: '#ccfbf1 !important', boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)', transition: 'background-color 0.4s ease-out, box-shadow 0.4s ease-out' },
    container: { width: "100%", fontFamily: "'Inter', sans-serif", minHeight: "auto", height: "auto", padding: "30px 20px" },
    summaryBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 25px", backgroundColor: "#1e40af", borderRadius: 12, color: "#f9fafb", marginBottom: 30, boxShadow: "0 4px 20px rgb(30 64 175 / 0.3)", flexWrap: "wrap", border: "none", boxSizing: "border-box", fontSize: "1.1rem", fontWeight: "700", letterSpacing: "0.04em" },
    dateDisplay: { display: "flex", alignItems: "center", fontWeight: 600, color: "#e0e7ff", paddingRight: 30, marginRight: 20, borderRight: "2px solid #3b82f6", letterSpacing: "0.05em" },
    statsGroup: { display: "flex", gap: 60, justifyContent: "flex-start", alignItems: "center", paddingLeft: 20, flexGrow: 1 },
    summaryItem: { display: "flex", gap: 10, alignItems: "baseline" },
    statLabel: { fontSize: 17, fontWeight: 600, color: "rgba(255, 255, 255, 0.8)", whiteSpace: "nowrap" },
    statValue: { fontSize: 25, fontWeight: 900, color: "#fbbf24", textShadow: "1px 1px 2px #444" },
    showUsersButton: { backgroundColor: "#fbbf24", color: "#1e40af", fontWeight: 700, border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 15, cursor: "pointer", transition: "background-color 0.3s ease", boxShadow: "0 5px 10px rgb(251 191 36 / 0.4)", userSelect: "none" },
    error: { color: "#b22222", backgroundColor: "#ffd4d4", borderRadius: 6, padding: 12, marginBottom: 20, fontWeight: 600, textAlign: "center", fontSize: 15 },
    loading: { textAlign: "center", fontWeight: "bold", color: "#444", padding: 50, fontSize: 18, fontStyle: "italic" },
    cardsContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 25, justifyContent: "center" },
    card: { backgroundColor: "#ffffff", borderRadius: 14, padding: 22, boxShadow: "0 10px 30px rgb(0 0 0 / 0.1)", boxSizing: "border-box", transition: "transform 0.25s ease, box-shadow 0.25s ease", cursor: "default" },
    cardContent: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
    cardName: { fontWeight: 800, fontSize: 20, color: "#1e3a8a", userSelect: "text" },
    cardEmail: { fontSize: 13, fontStyle: "italic", color: "#667085", marginTop: 3 },
    viewLogButton: { backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 12px rgb(37 99 235 / 0.4)", transition: "background-color 0.3s ease", userSelect: "none" },
    todayAttendance: { fontSize: 14, color: "#006affff", marginTop: 10 },
    expandedModalBackdrop: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(30, 64, 175, 0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1100, padding: 20 },
    expandedModalContent: { backgroundColor: "#ffffff", borderRadius: 16, boxShadow: "0 20px 40px rgba(30,64,175,0.7)", width: "95%", maxWidth: "1200px", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", position: "relative" },
    modalHeader: { padding: "20px 30px", borderBottom: "2px solid #f3f4f6ff", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#dbeafe", fontWeight: "700", fontSize: 22, color: "#1e40af", position: 'sticky', top: 0, zIndex: 1000 },
    modalCloseButton: { background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: 36, height: 36, fontSize: 26, cursor: "pointer", lineHeight: "28px", padding: 0, fontWeight: "bold" },
    tableWrapper: { overflowX: "auto", padding: 10, flexGrow: 1 },
    table: { width: "100%", minWidth: 1020, borderCollapse: "collapse" },
    tableTh: { padding: 12, textAlign: "center", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: 700, position: "sticky", zIndex: 100, borderRight: "1px solid rgba(255, 255, 255, 0.15)", borderBottom: "2px solid #1e3a8a" },
    tableTd: { padding: 10, textAlign: "center", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", color: "#374151", transition: 'background-color 0.1s ease-in-out, border 0.1s ease-in-out' },
    tableBodyRow: { backgroundColor: "#ffffff", transition: 'background-color 0.2s ease-in-out' },
    highlightRow: { backgroundColor: "#f3f4f6" },
    logLine: { display: "flex", justifyContent: "space-between", marginBottom: 3 },
    logLabel: { color: "#4b5563" },
    logTime: { fontWeight: 600, color: "#1f2937" },
};