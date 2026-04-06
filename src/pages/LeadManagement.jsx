/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";

const BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

// ─────────────────────────────────────────────────────────────────────────────
//  Access model (enforced by backend, reflected here for UI decisions):
//
//  Chairman        → full access: create, assign, reshuffle, delete, manage access
//  Manager         → create, assign, reshuffle (no delete, no manage access)
//  Lead Creator    → same as Manager: create, assign, reshuffle, full stats view
//  Regular employee→ only their assigned leads, remarks only — NO create/delete
//
//  Delete button is shown ONLY to chairman.
//  Stats table view is shown to chairman + manager + lead creator.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  Pending:     { color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d", icon: "⏳" },
  Called:      { color: "#10b981", bg: "#ecfdf5", border: "#6ee7b7", icon: "📞" },
  "No Answer": { color: "#6366f1", bg: "#eef2ff", border: "#a5b4fc", icon: "📵" },
  "Follow Up": { color: "#3b82f6", bg: "#eff6ff", border: "#93c5fd", icon: "🔁" },
  Converted:   { color: "#16a34a", bg: "#f0fdf4", border: "#86efac", icon: "✅" },
  Dropped:     { color: "#ef4444", bg: "#fef2f2", border: "#fca5a5", icon: "❌" },
};

const DONE_STATUSES = ["Called", "Converted", "Dropped"];

// ── Countdown hook ─────────────────────────────────────────────────────────
function useCountdown(deadlineIso, hasActivity) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!deadlineIso || hasActivity) return;
    const tick = () => {
      const diff = new Date(deadlineIso) - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineIso, hasActivity]);

  if (hasActivity) return { label: "Updated", urgent: false, expired: false, done: true };
  if (remaining === null) return { label: "—", urgent: false, expired: false };
  if (remaining === 0)    return { label: "EXPIRED", urgent: true, expired: true };
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return {
    label: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    urgent: remaining < 10 * 60000,
    expired: false, done: false,
  };
}

function CountdownCell({ deadlineIso, status, hasActivity }) {
  const activityDone = hasActivity || DONE_STATUSES.includes(status);
  const { label, urgent, expired, done } = useCountdown(deadlineIso, activityDone);
  if (done || activityDone)
    return <span style={{ color: "#10b981", fontSize: 12, fontWeight: 700 }}>✓ Updated</span>;
  return (
    <span style={{
      fontFamily: "monospace", fontWeight: 700, fontSize: 13,
      color: expired ? "#ef4444" : urgent ? "#f59e0b" : "#10b981",
      background: expired ? "#fef2f2" : urgent ? "#fffbeb" : "#ecfdf5",
      padding: "3px 10px", borderRadius: 20,
      animation: urgent && !expired ? "pulse 1.2s infinite" : "none",
    }}>{label}</span>
  );
}

// ── Delete Confirm Modal — CHAIRMAN ONLY ───────────────────────────────────
function DeleteConfirmModal({ lead, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const confirm = async () => {
    setLoading(true); setErr("");
    try {
      await axios.delete(`${BASE}/leads/${lead.id}`, { withCredentials: true });
      onDeleted();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || "Delete failed");
      setLoading(false);
    }
  };

  return (
    <div style={{ ...S.overlay, zIndex: 7000 }} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalHead, background: "linear-gradient(135deg,#7f1d1d,#dc2626)" }}>
          <div>
            <div style={S.modalTag}>Danger Zone</div>
            <h2 style={{ ...S.modalTitle, fontSize: 18 }}>Delete Lead?</h2>
          </div>
          <button style={S.modalClose} onClick={onClose}>×</button>
        </div>
        <div style={S.modalBody}>
          <div style={{
            background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10,
            padding: "14px 16px", marginBottom: 16
          }}>
            <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>
              ⚠ This action cannot be undone
            </div>
            <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.6 }}>
              You are about to permanently delete the lead for{" "}
              <strong>{lead.name}</strong> ({lead.contact}).
              All remarks and assignment history will be lost forever.
            </div>
          </div>
          {err && <div style={S.errBox}>{err}</div>}
          <div style={S.modalActions}>
            <button style={S.btnGhost} onClick={onClose}>Cancel</button>
            <button
              style={{ ...S.btnPrimary, background: "linear-gradient(135deg,#dc2626,#ef4444)" }}
              onClick={confirm} disabled={loading}
            >
              {loading ? "Deleting…" : "🗑️ Yes, Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Full History Panel ─────────────────────────────────────────────────────
function FullHistoryPanel({ leadId, leadName, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${BASE}/leads/${leadId}/history`, { withCredentials: true })
      .then(r => setData(r.data))
      .catch(() => setData({ assignments: [], remarks: [] }))
      .finally(() => setLoading(false));
  }, [leadId]);

  const timeline = React.useMemo(() => {
    if (!data) return [];
    const items = [
      ...data.assignments.map(a => ({ ...a, _type: "assignment", _ts: a.assigned_at })),
      ...data.remarks.map(r => ({ ...r, _type: "remark", _ts: r.created_at })),
    ];
    return items.sort((a, b) => new Date(a._ts) - new Date(b._ts));
  }, [data]);

  const fmt = (ts) => new Date(ts).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div style={{ ...S.overlay, zIndex: 6000 }} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 660 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHead}>
          <div>
            <div style={S.modalTag}>Complete Lead Timeline</div>
            <h2 style={{ ...S.modalTitle, fontSize: 18 }}>{leadName}</h2>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
              Every assignment + every remark — nothing is ever deleted
            </div>
          </div>
          <button style={S.modalClose} onClick={onClose}>×</button>
        </div>
        <div style={{ ...S.modalBody, maxHeight: "65vh", overflowY: "auto" }}>
          {loading ? (
            <div style={S.emptyState}>Loading history…</div>
          ) : timeline.length === 0 ? (
            <div style={S.emptyState}>No history recorded yet.</div>
          ) : (
            <div style={S.timeline}>
              {timeline.map((item, i) =>
                item._type === "assignment" ? (
                  <div key={`a-${i}`} style={S.tlAssignment}>
                    <div style={S.tlLine} />
                    <div style={S.tlDotAssign} />
                    <div style={{ flex: 1, paddingLeft: 16 }}>
                      <div style={S.tlAssignTitle}>
                        🔀 Assigned to{" "}
                        <span style={{ fontWeight: 700, color: "#1e3a8a" }}>
                          {item.assignee_name || "Unknown"}
                        </span>
                        {item.assigned_by_name && (
                          <span style={{ color: "#64748b", fontWeight: 400 }}>
                            {" "}— by {item.assigned_by_name}
                          </span>
                        )}
                        {item.is_current && <span style={S.currentBadge}>Current</span>}
                      </div>
                      <div style={S.tlTime}>{fmt(item._ts)}</div>
                    </div>
                  </div>
                ) : (
                  <div key={`r-${i}`} style={S.tlRemarkRow}>
                    <div style={S.tlLine} />
                    <div style={S.tlDotRemark} />
                    <div style={{ flex: 1, paddingLeft: 16 }}>
                      <div style={S.tlRemarkMeta}>
                        <span style={S.tlRemarkAuthor}>💬 {item.author_name || "Unknown"}</span>
                        {item.status_at_time && (
                          <span style={{
                            ...S.badge, fontSize: 10,
                            background:  STATUS_CFG[item.status_at_time]?.bg     || "#f8fafc",
                            color:       STATUS_CFG[item.status_at_time]?.color   || "#64748b",
                            borderColor: STATUS_CFG[item.status_at_time]?.border  || "#e2e8f0",
                          }}>
                            {STATUS_CFG[item.status_at_time]?.icon} {item.status_at_time}
                          </span>
                        )}
                        <span style={S.tlTime}>{fmt(item._ts)}</span>
                      </div>
                      <div style={S.tlRemarkText}>{item.remark}</div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Update Modal ───────────────────────────────────────────────────────────
function UpdateLeadModal({ lead, isChairman, canCreate, employees, onClose, onUpdated }) {
  const [status,    setStatus]    = useState(lead.status);
  const [newRemark, setNewRemark] = useState("");
  const [assignTo,  setAssignTo]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState("");
  const [showHist,  setShowHist]  = useState(false);

  // Both chairman and lead creators can reassign
  const canReassign = isChairman || canCreate;

  const submit = async () => {
    if (!newRemark.trim() && status === lead.status && !assignTo) {
      setErr("Please update the status, add a remark, or reassign."); return;
    }
    setLoading(true); setErr("");
    try {
      const payload = { status };
      if (canReassign && assignTo) payload.assigned_to = parseInt(assignTo);
      await axios.put(`${BASE}/leads/${lead.id}`, payload, { withCredentials: true });
      if (newRemark.trim()) {
        await axios.post(`${BASE}/leads/${lead.id}/remarks`, {
          remark: newRemark.trim(), status_at_time: status,
        }, { withCredentials: true });
      }
      onUpdated(); onClose();
    } catch (e) {
      setErr(e.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={S.overlay} onClick={onClose}>
        <div style={{ ...S.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
          <div style={S.modalHead}>
            <div style={{ flex: 1 }}>
              <div style={S.modalTag}>
                {lead.assigned_by_name ? `Assigned by: ${lead.assigned_by_name}` : "Update Lead"}
              </div>
              <h2 style={{ ...S.modalTitle, fontSize: 18 }}>{lead.name}</h2>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                📞 {lead.contact} · ✉️ {lead.email}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
              <button style={S.modalClose} onClick={onClose}>×</button>
              <button style={S.histBtn} onClick={() => setShowHist(true)}>📜 Full History</button>
            </div>
          </div>
          <div style={S.modalBody}>
            <label style={S.label}>Status</label>
            <div style={S.statusGrid}>
              {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                <button key={key} onClick={() => setStatus(key)}
                  style={{
                    ...S.statusBtn,
                    borderColor: status === key ? cfg.color : "#e2e8f0",
                    background:  status === key ? cfg.bg    : "#fff",
                    color:       status === key ? cfg.color : "#64748b",
                    fontWeight:  status === key ? 700 : 500,
                  }}>
                  {cfg.icon} {key}
                </button>
              ))}
            </div>

            <label style={{ ...S.label, marginTop: 18 }}>
              Add Remark
              <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 6, fontSize: 11 }}>
                (permanently saved — never deleted)
              </span>
            </label>
            <textarea style={{ ...S.input, minHeight: 100, resize: "vertical" }}
              placeholder="What was discussed? Client's response? Next steps?"
              value={newRemark} onChange={e => setNewRemark(e.target.value)} />

            {/* Reassign — only for chairman / lead creators */}
            {canReassign && (
              <>
                <label style={{ ...S.label, marginTop: 16 }}>
                  Reassign / Shuffle To
                  <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 6, fontSize: 11 }}>
                    (full history stays intact for new assignee)
                  </span>
                </label>
                <select style={S.input} value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                  <option value="">— Keep current: {lead.assignee_name || "Unassigned"} —</option>
                  {employees.filter(e => e.user_id !== lead.assigned_to).map(emp => (
                    <option key={emp.user_id} value={emp.user_id}>
                      {emp.name} ({emp.location || "N/A"})
                    </option>
                  ))}
                </select>
                <div style={S.hint}>New assignee gets a fresh 45-min timer and sees full history from day 1.</div>
              </>
            )}

            {lead.remarks_count > 0 && (
              <div style={S.prevRemarksBox}>
                <div style={S.prevRemarksHead}>
                  💬 {lead.remarks_count} remark{lead.remarks_count !== 1 ? "s" : ""} on record
                  <button style={S.viewAllBtn} onClick={() => setShowHist(true)}>View all →</button>
                </div>
                <div style={S.prevRemarksLatest}>Latest: {lead.latest_remark}</div>
              </div>
            )}

            {err && <div style={S.errBox}>{err}</div>}
            <div style={S.modalActions}>
              <button style={S.btnGhost} onClick={onClose}>Cancel</button>
              <button style={S.btnPrimary} onClick={submit} disabled={loading}>
                {loading ? "Saving…" : "💾 Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showHist && (
        <FullHistoryPanel leadId={lead.id} leadName={lead.name} onClose={() => setShowHist(false)} />
      )}
    </>
  );
}

// ── Manage Access Modal — CHAIRMAN ONLY ───────────────────────────────────
function ManageAccessModal({ employees, onClose }) {
  const [creators, setCreators] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(null);

  useEffect(() => {
    axios.get(`${BASE}/leads/creators`, { withCredentials: true })
      .then(r => setCreators(r.data.map(c => c.user_id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (userId) => {
    setSaving(userId);
    try {
      if (creators.includes(userId)) {
        await axios.delete(`${BASE}/leads/creators/${userId}`, { withCredentials: true });
        setCreators(c => c.filter(id => id !== userId));
      } else {
        await axios.post(`${BASE}/leads/creators`, { user_id: userId }, { withCredentials: true });
        setCreators(c => [...c, userId]);
      }
    } catch {}
    setSaving(null);
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHead}>
          <div>
            <div style={S.modalTag}>Access Control · Chairman Only</div>
            <h2 style={{ ...S.modalTitle, fontSize: 18 }}>Lead Creator Access</h2>
          </div>
          <button style={S.modalClose} onClick={onClose}>×</button>
        </div>
        <div style={S.modalBody}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4, lineHeight: 1.6 }}>
            <strong>Lead Creators</strong> can:
          </div>
          <ul style={{ fontSize: 13, color: "#64748b", lineHeight: 1.8, marginBottom: 16, paddingLeft: 18 }}>
            <li>✅ Create new leads</li>
            <li>✅ Assign and reshuffle leads to any employee</li>
            <li>✅ View all leads with full stats (table view)</li>
            <li>❌ Cannot delete leads (chairman only)</li>
          </ul>

          {loading ? <div style={S.emptyState}>Loading…</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {employees.map(emp => {
                const isCreator = creators.includes(emp.user_id);
                return (
                  <div key={emp.user_id} style={S.accessRow}>
                    <div style={S.accessInfo}>
                      <div style={S.accessAvatar}>{(emp.name || "?")[0].toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{emp.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{emp.role} · {emp.location || "N/A"}</div>
                      </div>
                    </div>
                    <button
                      style={{
                        ...S.toggleBtn,
                        background:  isCreator ? "#ede9fe" : "#f1f5f9",
                        color:       isCreator ? "#6d28d9" : "#64748b",
                        borderColor: isCreator ? "#c4b5fd" : "#e2e8f0",
                      }}
                      onClick={() => toggle(emp.user_id)}
                      disabled={saving === emp.user_id}
                    >
                      {saving === emp.user_id ? "…" : isCreator ? "✓ Creator" : "Grant Access"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ ...S.modalActions, marginTop: 20 }}>
            <button style={S.btnPrimary} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lead Card (employee card view — no create/delete access) ──────────────
function LeadCard({ lead, onUpdate, onHistory }) {
  const cfg = STATUS_CFG[lead.status] || STATUS_CFG.Pending;
  const hasActivity = (lead.remarks_count > 0) || lead.status !== "Pending";

  return (
    <div style={{ ...S.card, borderLeft: `4px solid ${cfg.color}`, background: cfg.bg }}>
      <div style={S.cardTop}>
        <div style={S.cardLeft}>
          <div style={S.cardName}>{lead.name}</div>
          <div style={S.cardMeta}>
            {lead.age        != null && <span>🎂 {lead.age} yrs</span>}
            {lead.experience != null && <span>💼 {lead.experience} yrs exp</span>}
            <span>📞 {lead.contact}</span>
            <span>✉️ {lead.email}</span>
          </div>
          <div style={{ ...S.cardMeta, marginTop: 4 }}>
            {lead.education    && <span>🎓 {lead.education}</span>}
            {lead.domain       && <span>🏢 {lead.domain}</span>}
            {lead.calling_city && <span>📍 {lead.calling_city}</span>}
          </div>
          <div style={{ ...S.cardMeta, marginTop: 4 }}>
            {lead.service_interested && <span style={{ color: "#6366f1", fontWeight: 600 }}>🎯 {lead.service_interested}</span>}
            {lead.lead_source        && <span>🔗 {lead.lead_source}</span>}
          </div>
          {lead.assigned_by_name && (
            <div style={S.assignedByBadge}>Assigned by: <strong>{lead.assigned_by_name}</strong></div>
          )}
        </div>
        <div style={S.cardRight}>
          <span style={{ ...S.badge, background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
            {cfg.icon} {lead.status}
          </span>
          <CountdownCell deadlineIso={lead.deadline_at} status={lead.status} hasActivity={hasActivity} />
        </div>
      </div>
      {lead.additional_comments && (
        <div style={S.cardNotes}>📋 {lead.additional_comments}</div>
      )}
      {lead.latest_remark && (
        <div style={S.cardRemarks}>
          <span style={{ fontWeight: 600 }}>Latest remark:</span> {lead.latest_remark}
          {lead.remarks_count > 1 && (
            <span style={{ color: "#6366f1", marginLeft: 6, fontSize: 11 }}>+{lead.remarks_count - 1} more</span>
          )}
        </div>
      )}
      <div style={S.cardActions}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          Created {new Date(lead.created_at).toLocaleString("en-IN")}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...S.btnSm, background: "#e0f2fe", color: "#0369a1" }} onClick={() => onHistory(lead)}>
            📜 History
          </button>
          <button style={S.btnSm} onClick={() => onUpdate(lead)}>✏️ Update</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function LeadManagement({ isChairman = false }) {
  const navigate = useNavigate();
  const { employeeName } = useParams();

  const addLeadPath = isChairman
    ? "/chairman/addlead"
    : `/employee/${employeeName}/addlead`;

  const [leads,      setLeads]      = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [myProfile,  setMyProfile]  = useState(null);
  const [canCreate,  setCanCreate]  = useState(false);  // true for chairman, manager, lead creator
  const [loading,    setLoading]    = useState(true);
  const [editLead,   setEditLead]   = useState(null);
  const [histLead,   setHistLead]   = useState(null);
  const [deleteLead, setDeleteLead] = useState(null);
  const [showAccess, setShowAccess] = useState(false);
  const [filter,     setFilter]     = useState("All");
  const [search,     setSearch]     = useState("");
  const [notifBell,  setNotifBell]  = useState([]);

  const socketRef = useRef(null);
  const audioRef  = useRef(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/leads`, { withCredentials: true });
      setLeads(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/leads/employees`, { withCredentials: true });
      setEmployees(res.data);
    } catch {}
  }, []);

  const fetchAccess = useCallback(async () => {
    if (isChairman) { setCanCreate(true); fetchEmployees(); return; }
    try {
      const res = await axios.get(`${BASE}/leads/my-access`, { withCredentials: true });
      setCanCreate(res.data.canCreate || false);
      if (res.data.canCreate) fetchEmployees();
    } catch {}
  }, [isChairman, fetchEmployees]);

  const fetchMe = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/me`, { withCredentials: true });
      setMyProfile(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchMe(); fetchAccess(); fetchLeads(); }, [fetchMe, fetchAccess, fetchLeads]);

  useEffect(() => {
    const socket = io(BASE, { path: "/socket.io/", transports: ["polling", "websocket"], withCredentials: true });
    socketRef.current = socket;
    socket.on("connect", () => {
      if (myProfile?.id) socket.emit("join_user_room", { user_id: myProfile.id });
    });
    socket.on("new_lead_assigned", (data) => {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
      setNotifBell(prev => [{
        id: Date.now(),
        msg: `🎯 "${data.lead_name || "A lead"}" assigned to you by ${data.assigned_by_name || "someone"} — Call within 45 min!`,
        time: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 5));
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("🎯 New Lead Assigned!", {
          body: `${data.lead_name || "Lead"} — by ${data.assigned_by_name || "Chairman"} — 45 min to call!`,
          icon: "/logo192.png",
        });
      }
      fetchLeads();
    });
    return () => socket.disconnect();
  }, [myProfile, fetchLeads]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default")
      Notification.requestPermission();
  }, []);

  const filtered = leads.filter(l => {
    const matchFilter = filter === "All" || l.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.name?.toLowerCase().includes(q)
      || l.email?.toLowerCase().includes(q)
      || l.contact?.toLowerCase().includes(q)
      || l.assignee_name?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const stats = Object.keys(STATUS_CFG).reduce((acc, k) => {
    acc[k] = leads.filter(l => l.status === k).length;
    return acc;
  }, {});
  const total   = leads.length;
  const pending = stats["Pending"] || 0;
  const overdue = leads.filter(l =>
    l.status === "Pending" && l.deadline_at && new Date(l.deadline_at) < new Date()
    && (l.remarks_count || 0) === 0
  ).length;

  // ── Access flags ─────────────────────────────────────────────────────────
  const canShowCreate = isChairman || canCreate;  // chairman + manager + lead creator
  const canDelete     = isChairman;               // CHAIRMAN ONLY — never lead creators

  return (
    <div style={S.root}>
      <style>{ANIM}</style>
      <audio ref={audioRef} src="/new-request.mp3" preload="auto" />

      {notifBell.length > 0 && (
        <div style={S.notifPanel}>
          {notifBell.map(n => (
            <div key={n.id} style={S.notifItem}>
              <span style={{ lineHeight: 1.5 }}>{n.msg}</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{n.time}</span>
                <button style={S.notifClose} onClick={() => setNotifBell(p => p.filter(x => x.id !== n.id))}>
                  × Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={S.header}>
        <div>
          <h1 style={S.heading}>🎯 Lead Management</h1>
          <p style={S.subheading}>
            {isChairman
              ? "Full access — create, assign, reshuffle, and delete leads."
              : canCreate
                ? "You can create leads and assign / reshuffle them. Stats visible. Delete is chairman-only."
                : "Your assigned leads — update status and add remarks. Contact within 45 min of assignment."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Manage Access button — chairman only */}
          {isChairman && (
            <button style={S.btnSecondaryAction} onClick={() => setShowAccess(true)}>
              👥 Manage Access
            </button>
          )}
          {/* Add Lead button — chairman + lead creators */}
          {canShowCreate && (
            <button style={S.btnPrimary} onClick={() => navigate(addLeadPath)}>
              + Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Stats bar — shown to everyone (employees see their own counts) */}
      <div style={S.statsBar}>
        {[
          { label: "Total",     val: total,                    color: "#6366f1" },
          { label: "Pending",   val: pending,                  color: "#f59e0b" },
          { label: "Overdue",   val: overdue,                  color: "#ef4444" },
          { label: "Converted", val: stats["Converted"] || 0, color: "#10b981" },
          { label: "Follow Up", val: stats["Follow Up"] || 0, color: "#3b82f6" },
          { label: "Dropped",   val: stats["Dropped"]   || 0, color: "#94a3b8" },
        ].map(({ label, val, color }) => (
          <div key={label} style={S.statChip}>
            <div style={{ ...S.statVal, color }}>{val}</div>
            <div style={S.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      <div style={S.toolbar}>
        <div style={S.filterRow}>
          {["All", ...Object.keys(STATUS_CFG)].map(f => (
            <button key={f}
              style={{
                ...S.filterBtn,
                background:  filter === f ? (STATUS_CFG[f]?.bg     || "#ede9fe") : "transparent",
                color:       filter === f ? (STATUS_CFG[f]?.color  || "#6366f1") : "#64748b",
                fontWeight:  filter === f ? 700 : 500,
                borderColor: filter === f ? (STATUS_CFG[f]?.border || "#a5b4fc") : "#e2e8f0",
              }}
              onClick={() => setFilter(f)}>
              {STATUS_CFG[f]?.icon || "📋"} {f}
              {f !== "All" && stats[f] > 0 && <span style={S.filterCount}>{stats[f]}</span>}
            </button>
          ))}
        </div>
        <input style={S.searchBox} placeholder="🔍  Search name, email, contact…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={S.emptyState}>Loading leads…</div>
      ) : filtered.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div style={{ fontWeight: 700, color: "#334155" }}>No leads found</div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
            {canShowCreate ? "Click '+ Add Lead' to create your first lead." : "No leads assigned to you yet."}
          </div>
        </div>

      // ── TABLE VIEW: chairman + manager + lead creator ───────────────────
      ) : canShowCreate ? (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Lead", "Contact / Email", "Education & Exp", "Domain / City",
                  "Service / Source", "Assigned To", "Assigned By", "Status",
                  "⏱ Timer", "Remarks", "Actions"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const cfg = STATUS_CFG[lead.status] || STATUS_CFG.Pending;
                const hasActivity = (lead.remarks_count > 0) || lead.status !== "Pending";
                return (
                  <tr key={lead.id} style={S.tr}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{lead.name}</div>
                      {lead.age != null && <div style={{ fontSize: 11, color: "#94a3b8" }}>🎂 {lead.age} yrs old</div>}
                    </td>
                    <td style={S.td}>
                      <div>📞 {lead.contact}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>✉️ {lead.email}</div>
                    </td>
                    <td style={S.td}>
                      {lead.education && <div style={{ fontSize: 12 }}>🎓 {lead.education}</div>}
                      {lead.experience != null && <div style={{ fontSize: 11, color: "#64748b" }}>💼 {lead.experience} yrs exp</div>}
                    </td>
                    <td style={S.td}>
                      {lead.domain && <div style={{ fontSize: 12 }}>🏢 {lead.domain}</div>}
                      {lead.calling_city && <div style={{ fontSize: 11, color: "#64748b" }}>📍 {lead.calling_city}</div>}
                    </td>
                    <td style={S.td}>
                      {lead.service_interested && <div style={{ fontSize: 12 }}>🎯 {lead.service_interested}</div>}
                      {lead.lead_source && <div style={{ fontSize: 11, color: "#64748b" }}>🔗 {lead.lead_source}</div>}
                    </td>
                    <td style={S.td}>
                      {lead.assignee_name
                        ? <span style={S.assigneePill}>{lead.assignee_name}</span>
                        : <span style={{ color: "#94a3b8", fontSize: 12 }}>Unassigned</span>}
                    </td>
                    <td style={S.td}>
                      {lead.assigned_by_name
                        ? <span style={S.creatorPill}>{lead.assigned_by_name}</span>
                        : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                        {cfg.icon} {lead.status}
                      </span>
                    </td>
                    <td style={S.td}>
                      <CountdownCell deadlineIso={lead.deadline_at} status={lead.status} hasActivity={hasActivity} />
                    </td>
                    <td style={{ ...S.td, maxWidth: 200 }}>
                      {lead.latest_remark ? (
                        <div>
                          <div style={{ fontSize: 12, color: "#475569" }}>
                            {lead.latest_remark.slice(0, 80)}{lead.latest_remark.length > 80 ? "…" : ""}
                          </div>
                          {lead.remarks_count > 0 && (
                            <div style={{ fontSize: 11, color: "#6366f1", marginTop: 2 }}>
                              {lead.remarks_count} remark{lead.remarks_count !== 1 ? "s" : ""} total
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#cbd5e1", fontSize: 12 }}>No remarks yet</span>
                      )}
                    </td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button style={{ ...S.btnSm, background: "#e0f2fe", color: "#0369a1" }}
                          onClick={() => setHistLead(lead)}>📜 Timeline</button>
                        <button style={S.btnSm} onClick={() => setEditLead(lead)}>✏️ Edit</button>
                        {/* Delete — CHAIRMAN ONLY */}
                        {canDelete && (
                          <button style={{ ...S.btnSm, background: "#fef2f2", color: "#dc2626" }}
                            onClick={() => setDeleteLead(lead)}>🗑️ Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      // ── CARD VIEW: regular employees (no create/delete) ─────────────────
      ) : (
        <div style={S.cardGrid}>
          {filtered.map(lead => (
            <LeadCard key={lead.id} lead={lead} onUpdate={setEditLead} onHistory={setHistLead} />
          ))}
        </div>
      )}

      {editLead && (
        <UpdateLeadModal
          lead={editLead} isChairman={isChairman} canCreate={canCreate} employees={employees}
          onClose={() => setEditLead(null)}
          onUpdated={() => { fetchLeads(); setEditLead(null); }}
        />
      )}
      {histLead && (
        <FullHistoryPanel leadId={histLead.id} leadName={histLead.name} onClose={() => setHistLead(null)} />
      )}
      {deleteLead && (
        <DeleteConfirmModal
          lead={deleteLead} onClose={() => setDeleteLead(null)}
          onDeleted={() => { fetchLeads(); setDeleteLead(null); }}
        />
      )}
      {showAccess && isChairman && (
        <ManageAccessModal employees={employees} onClose={() => setShowAccess(false)} />
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  root: { fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", color: "#0f172a", minHeight: 400, position: "relative" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  heading: { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 },
  subheading: { fontSize: 13, color: "#64748b", margin: "4px 0 0" },
  statsBar: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 },
  statChip: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 20px", textAlign: "center", flex: 1, minWidth: 90 },
  statVal: { fontSize: 22, fontWeight: 800 },
  statLabel: { fontSize: 10, color: "#94a3b8", marginTop: 2, fontWeight: 600, textTransform: "uppercase" },
  toolbar: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 20 },
  filterRow: { display: "flex", gap: 6, flexWrap: "wrap", flex: 1 },
  filterBtn: { display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  filterCount: { background: "rgba(0,0,0,0.08)", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 },
  searchBox: { padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", minWidth: 250, fontFamily: "'DM Sans',sans-serif" },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "12px 14px", textAlign: "left", background: "#f8fafc", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "11px 14px", verticalAlign: "top" },
  cardGrid: { display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 18px" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  cardMeta: { display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#64748b" },
  cardRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 },
  cardNotes: { marginTop: 10, fontSize: 12, color: "#475569", background: "#f8fafc", borderRadius: 8, padding: "8px 12px" },
  cardRemarks: { marginTop: 8, fontSize: 12, color: "#334155", background: "#eff6ff", borderRadius: 8, padding: "8px 12px" },
  cardActions: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9" },
  assignedByBadge: { fontSize: 11, color: "#6d28d9", background: "#ede9fe", padding: "2px 8px", borderRadius: 20, marginTop: 6, display: "inline-block" },
  badge: { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", border: "1px solid", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  assigneePill: { background: "#ede9fe", color: "#6d28d9", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  creatorPill: { background: "#e0f2fe", color: "#0369a1", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  btnPrimary: { padding: "10px 22px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  btnSecondaryAction: { padding: "10px 18px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  btnGhost: { padding: "10px 20px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  btnSm: { padding: "5px 12px", background: "#ede9fe", color: "#6d28d9", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5000, padding: 20 },
  modal: { background: "#fff", borderRadius: 20, maxWidth: 640, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" },
  modalHead: { padding: "24px 28px", background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderRadius: "20px 20px 0 0" },
  modalTag: { fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 4 },
  modalTitle: { fontSize: 22, fontWeight: 800, margin: 0, color: "#fff" },
  modalClose: { background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 22, width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  histBtn: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" },
  modalBody: { padding: "24px 28px" },
  label: { fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 },
  input: { padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif" },
  hint: { fontSize: 11, color: "#94a3b8", marginTop: 5 },
  errBox: { background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginTop: 12 },
  modalActions: { display: "flex", gap: 12, marginTop: 20 },
  statusGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 },
  statusBtn: { padding: "8px 6px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  prevRemarksBox: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginTop: 16 },
  prevRemarksHead: { fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  prevRemarksLatest: { fontSize: 12, color: "#64748b", fontStyle: "italic", lineHeight: 1.5 },
  viewAllBtn: { background: "none", border: "none", color: "#6366f1", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  accessRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: "1px solid #f1f5f9", borderRadius: 10, background: "#fafafa" },
  accessInfo: { display: "flex", alignItems: "center", gap: 10 },
  accessAvatar: { width: 36, height: 36, borderRadius: "50%", background: "#ede9fe", color: "#6d28d9", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" },
  toggleBtn: { padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", color: "#94a3b8", fontSize: 14 },
  notifPanel: { position: "fixed", top: 80, right: 24, zIndex: 9000, display: "flex", flexDirection: "column", gap: 8, width: 380 },
  notifItem: { background: "#fff", border: "1px solid #e2e8f0", borderLeft: "4px solid #f59e0b", borderRadius: 10, padding: "12px 14px", boxShadow: "0 6px 20px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500, color: "#0f172a", animation: "slideInRight .3s ease" },
  notifClose: { background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#6366f1", fontWeight: 600, fontFamily: "'DM Sans',sans-serif", padding: 0 },

  // Timeline styles
  timeline: { display: "flex", flexDirection: "column", gap: 0 },
  tlAssignment: { display: "flex", alignItems: "flex-start", position: "relative", paddingBottom: 20 },
  tlRemarkRow: { display: "flex", alignItems: "flex-start", position: "relative", paddingBottom: 20 },
  tlLine: { position: "absolute", left: 11, top: 22, bottom: 0, width: 1, background: "#e2e8f0" },
  tlDotAssign: { width: 22, height: 22, borderRadius: "50%", background: "#1e3a8a", flexShrink: 0, marginTop: 2 },
  tlDotRemark: { width: 22, height: 22, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 2 },
  tlAssignTitle: { fontSize: 13, color: "#0f172a" },
  tlTime: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  tlRemarkMeta: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  tlRemarkAuthor: { fontWeight: 700, fontSize: 13, color: "#0f172a" },
  tlRemarkText: { fontSize: 13, color: "#334155", lineHeight: 1.6 },
  currentBadge: { background: "#dcfce7", color: "#16a34a", fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20, marginLeft: 6 },
};

const ANIM = `
@keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
`;