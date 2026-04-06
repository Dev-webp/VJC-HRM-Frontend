/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://backend.vjcoverseas.com";

const LEAD_SOURCE_OPTIONS = [
  "Walk-in", "Website", "Social Media", "Referral", "Cold Call",
  "Email Campaign", "Event / Expo", "Advertisement", "WhatsApp", "Other"
];
const SERVICE_OPTIONS = [
  "Study Abroad", "Work Permit", "PR / Immigration", "Tourist Visa",
  "Business Visa", "Language Training", "Document Services", "Other"
];

// ── Duplicate state shape ─────────────────────────────────────────────────
// { contact: null | { lead } , email: null | { lead } }
const emptyDup = { contact: null, email: null };

export default function CreateLeadPage({ onCreated, navigate }) {
  const [employees,  setEmployees]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [err,        setErr]        = useState("");
  const [dup,        setDup]        = useState(emptyDup);   // per-field dup state
  const [success,    setSuccess]    = useState(false);

  const [form, setForm] = useState({
    name: "", contact: "", email: "", education: "", experience: "",
    domain: "", age: "", calling_city: "", service_interested: "",
    lead_source: "", additional_comments: "", assigned_to: "",
  });

  // refs so blur handlers always have fresh values
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    axios.get(`${BASE}/leads/employees`, { withCredentials: true })
      .then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    // Clear dup warning for the field being typed in
    if (k === "contact" || k === "email") {
      setDup(d => ({ ...d, [k]: null }));
    }
  };

  // ── Real-time duplicate check on blur ────────────────────────────────────
  const checkDuplicate = async (field) => {
    const value = formRef.current[field]?.trim();
    if (!value) return;

    try {
      const params = { field, [field]: value };
      const res = await axios.get(`${BASE}/leads/check-duplicate`, {
        params,
        withCredentials: true,
      });
      if (res.data.exists) {
        setDup(d => ({ ...d, [field]: res.data.lead }));
      } else {
        setDup(d => ({ ...d, [field]: null }));
      }
    } catch {
      // silently fail — server-side guard will catch it on submit
    }
  };

  const hasDuplicate = dup.contact || dup.email;

  const submit = async () => {
    // Block submit if there's an unresolved duplicate
    if (hasDuplicate) {
      setErr("Please resolve the duplicate entries highlighted below before saving.");
      return;
    }

    setLoading(true);
    setErr("");
    try {
      await axios.post(`${BASE}/leads/create`, {
        ...form,
        age:         form.age         ? parseInt(form.age)         : null,
        experience:  form.experience  ? parseInt(form.experience)  : null,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
      }, { withCredentials: true });
      setSuccess(true);
      if (onCreated) onCreated();
    } catch (e) {
      const data = e.response?.data;
      if (e.response?.status === 409 && data?.duplicate_field) {
        // Server caught a race-condition duplicate — surface it inline
        setDup(d => ({ ...d, [data.duplicate_field]: data.existing }));
        setErr(data.message || "Duplicate entry detected.");
      } else {
        setErr(data?.message || "Error creating lead");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={S.page}>
        <div style={S.successBox}>
          <div style={S.successIcon}>✓</div>
          <h2 style={{ color: "#1e3a8a", margin: "0 0 6px 0", fontSize: 20 }}>Lead Added Successfully</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>The lead has been saved to the system.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button style={S.btnPrimary} onClick={() => {
              setSuccess(false);
              setForm({ name:"",contact:"",email:"",education:"",experience:"",
                domain:"",age:"",calling_city:"",service_interested:"",
                lead_source:"",additional_comments:"",assigned_to:"" });
              setDup(emptyDup);
            }}>
              + Add Another Lead
            </button>
            <button style={S.btnSecondary} onClick={() => navigate ? navigate(-1) : window.history.back()}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{HOVER_EFFECTS}</style>

      {/* NAV */}
      <div style={S.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div style={S.brandBadge}>VJ</div>
          <h1 style={S.navTitle}>New Lead Entry</h1>
        </div>
        <button style={S.closeBtn} onClick={() => navigate ? navigate(-1) : window.history.back()}>✕ Discard</button>
      </div>

      <div style={S.main}>
        {/* TOP BAR */}
        <div style={S.actionBar}>
          <span style={S.instruction}>
            Fields marked <span style={{ color: "#f87171" }}>*</span> are required
          </span>
          {err && <div style={S.inlineErr}>⚠ {err}</div>}
        </div>

        <div style={S.formContainer}>

          {/* SECTION 1: IDENTITY */}
          <SectionLabel>Identification & Contact</SectionLabel>
          <div style={S.denseGrid}>
            <F label="Full Name" req>
              <input style={S.input} value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Full name" />
            </F>

            {/* CONTACT — with duplicate warning */}
            <F label="Mobile Number" req>
              <input
                style={{
                  ...S.input,
                  borderColor: dup.contact ? "#ef4444" : undefined,
                  background:  dup.contact ? "#fef2f2" : undefined,
                }}
                value={form.contact}
                onChange={e => set("contact", e.target.value)}
                onBlur={() => checkDuplicate("contact")}
                placeholder="10-digit mobile"
                type="tel"
              />
              {dup.contact && (
                <DupWarning field="mobile" lead={dup.contact} />
              )}
            </F>

            {/* EMAIL — with duplicate warning */}
            <F label="Email Address" req>
              <input
                style={{
                  ...S.input,
                  borderColor: dup.email ? "#ef4444" : undefined,
                  background:  dup.email ? "#fef2f2" : undefined,
                }}
                value={form.email}
                onChange={e => set("email", e.target.value)}
                onBlur={() => checkDuplicate("email")}
                placeholder="email@example.com"
                type="email"
              />
              {dup.email && (
                <DupWarning field="email" lead={dup.email} />
              )}
            </F>

            <F label="Age" req>
              <input style={S.input} type="number" min="16" max="80"
                value={form.age} onChange={e => set("age", e.target.value)}
                placeholder="Age in years" />
            </F>
          </div>

          {/* SECTION 2: BACKGROUND */}
          <SectionLabel>Background & Location</SectionLabel>
          <div style={S.denseGrid}>
            <F label="Education" req>
              <input style={S.input} value={form.education}
                onChange={e => set("education", e.target.value)}
                placeholder="e.g. B.Tech, MBA" />
            </F>
            <F label="Experience (years)" req>
              <input style={S.input} type="number" min="0" max="50"
                value={form.experience}
                onChange={e => set("experience", e.target.value)}
                placeholder="Years of experience" />
            </F>
            <F label="Domain / Field" req>
              <input style={S.input} value={form.domain}
                onChange={e => set("domain", e.target.value)}
                placeholder="e.g. IT, Sales, Healthcare" />
            </F>
            <F label="Calling City" req>
              <input style={S.input} value={form.calling_city}
                onChange={e => set("calling_city", e.target.value)}
                placeholder="City" />
            </F>
          </div>

          {/* SECTION 3: INTENT & ROUTING */}
          <SectionLabel>Lead Intent & Routing</SectionLabel>
          <div style={S.denseGrid}>
            <F label="Service Interested" req>
              <select style={S.input} value={form.service_interested}
                onChange={e => set("service_interested", e.target.value)}>
                <option value="">Select Service</option>
                {SERVICE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </F>
            <F label="Lead Source" req>
              <select style={S.input} value={form.lead_source}
                onChange={e => set("lead_source", e.target.value)}>
                <option value="">Select Source</option>
                {LEAD_SOURCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </F>
            <F label="Assign To">
              <select style={S.input} value={form.assigned_to}
                onChange={e => set("assigned_to", e.target.value)}>
                <option value="">— Assign later —</option>
                {employees.map(emp => (
                  <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>
                ))}
              </select>
            </F>
          </div>

          <div style={{ marginTop: 15 }}>
            <F label="Comments / Notes">
              <textarea style={{ ...S.input, height: 72, resize: "vertical" }}
                value={form.additional_comments}
                onChange={e => set("additional_comments", e.target.value)}
                placeholder="Any additional notes about this lead…" />
            </F>
          </div>
        </div>

        {/* FOOTER */}
        <div style={S.footer}>
          {hasDuplicate && (
            <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, alignSelf: "center" }}>
              ⚠ Duplicate found — fix highlighted fields
            </span>
          )}
          <button style={S.btnSecondaryFt}
            onClick={() => navigate ? navigate(-1) : window.history.back()}>
            Discard
          </button>
          <button
            style={{ ...S.btnPrimary, opacity: hasDuplicate ? 0.5 : 1, cursor: hasDuplicate ? "not-allowed" : "pointer" }}
            onClick={submit}
            disabled={loading || !!hasDuplicate}
          >
            {loading ? "Saving…" : "Save Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Duplicate warning card ────────────────────────────────────────────────
function DupWarning({ field, lead }) {
  return (
    <div style={W.box}>
      <div style={W.header}>⚠ Duplicate {field} detected</div>
      <div style={W.body}>
        An existing lead <strong>{lead.name}</strong> already has this {field}.
        <br />
        Status: <span style={{ fontWeight: 600 }}>{lead.status}</span>
        {" · "}Contact: {lead.contact}
      </div>
    </div>
  );
}

const W = {
  box: {
    marginTop: 6, background: "#fef2f2", border: "1px solid #fca5a5",
    borderRadius: 6, padding: "8px 10px",
  },
  header: { fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 2 },
  body: { fontSize: 11, color: "#7f1d1d", lineHeight: 1.5 },
};

// ── Section label ─────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={S.sectionLabel}>{children}</div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────
function F({ label, req, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={S.label}>
        {label}{req && <span style={{ color: "#3b82f6", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const S = {
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: "'Segoe UI', Roboto, sans-serif" },

  nav: {
    background: "#1e3a8a", color: "#fff", padding: "12px 24px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
  },
  brandBadge: {
    background: "#3b82f6", padding: "4px 9px", borderRadius: 4,
    fontWeight: 900, fontSize: 12,
  },
  navTitle: { fontSize: 16, fontWeight: 600, margin: 0 },
  closeBtn: {
    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff", padding: "5px 14px", borderRadius: 5, cursor: "pointer",
    fontSize: 12, fontWeight: 600,
  },

  main: { maxWidth: 1100, margin: "24px auto", padding: "0 20px" },
  actionBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
  },
  instruction: { fontSize: 12, color: "#64748b" },
  inlineErr: {
    color: "#ef4444", fontSize: 12, fontWeight: 600,
    background: "#fef2f2", padding: "5px 12px", borderRadius: 6,
    border: "1px solid #fca5a5",
  },

  formContainer: {
    background: "#fff", border: "1px solid #e2e8f0",
    borderRadius: 10, padding: "24px 28px",
  },
  sectionLabel: {
    fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#1e3a8a",
    letterSpacing: "1.2px", marginBottom: 14, marginTop: 8,
    borderLeft: "3px solid #3b82f6", paddingLeft: 8,
  },
  denseGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 16, marginBottom: 22,
  },

  label: { fontSize: 12, fontWeight: 600, color: "#475569" },
  input: {
    padding: "10px 12px", borderRadius: 7, border: "1px solid #cbd5e1",
    fontSize: 13, color: "#1e293b", outline: "none", background: "#fff",
    transition: "border-color 0.15s, box-shadow 0.15s",
    width: "100%", boxSizing: "border-box",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },

  footer: {
    marginTop: 20, display: "flex", justifyContent: "flex-end",
    alignItems: "center", gap: 12,
    background: "#f1f5f9", padding: "14px 20px", borderRadius: 8,
  },
  btnPrimary: {
    background: "#1e3a8a", color: "#fff", border: "none",
    padding: "10px 28px", borderRadius: 7, fontWeight: 700,
    fontSize: 14, cursor: "pointer",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  btnSecondary: {
    background: "#e2e8f0", color: "#475569", border: "none",
    padding: "10px 20px", borderRadius: 7, fontWeight: 600,
    fontSize: 13, cursor: "pointer",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  btnSecondaryFt: {
    background: "transparent", color: "#94a3b8", border: "none",
    fontWeight: 600, cursor: "pointer", fontSize: 13,
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },

  successBox: {
    maxWidth: 420, margin: "100px auto", textAlign: "center",
    background: "#fff", padding: "48px 40px", borderRadius: 14,
    border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  },
  successIcon: {
    width: 56, height: 56, borderRadius: "50%", background: "#ecfdf5",
    color: "#10b981", fontSize: 28, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
  },
};

const HOVER_EFFECTS = `
  input:focus, select:focus, textarea:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    background: #fff !important;
  }
  button:hover { filter: brightness(1.08); }
`;