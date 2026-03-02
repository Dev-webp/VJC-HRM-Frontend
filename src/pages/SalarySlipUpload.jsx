import React, { useState, useRef } from "react";
import axios from "axios";

const API_BASE =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

export default function SalarySlipUpload() {
  const [email, setEmail]       = useState("");
  const [file, setFile]         = useState(null);
  const [status, setStatus]     = useState(null);
  const [isLoading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const isValid = email.trim() && file;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!isValid) {
      setStatus({ message: "❌ Please enter a valid employee email and select a file.", type: "error" });
      return;
    }

    const payload = new FormData();
    payload.append("email", email);
    payload.append("salarySlip", file);

    setLoading(true);
    setStatus(null);

    try {
      const res = await axios.post(`${API_BASE}/upload-salary-slip`, payload, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus({ message: res.data?.message || "✅ Salary slip uploaded successfully!", type: "success" });
      // Reset form
      setEmail("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to upload salary slip.";
      setStatus({ message: `❌ ${msg}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.card}>
      <div style={S.header}>
        <span style={S.icon}>📄</span>
        <h3 style={{ margin: 0 }}>Upload Salary Slip</h3>
      </div>
      <p style={S.subtext}>Upload a salary slip for an employee by email.</p>

      <form onSubmit={handleUpload} style={S.form}>
        <div style={S.inputGroup}>
          <label style={S.label}>Employee Email</label>
          <input
            type="email"
            placeholder="e.g., john.doe@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={S.input}
          />
        </div>

        <div style={S.inputGroup}>
          <label style={S.label}>Select File</label>
          <div style={S.fileBox}>
            <label htmlFor="salary-file-input" style={S.chooseBtn}>
              Choose File
            </label>
            {/* FIX: no key prop — use ref to reset after upload instead */}
            <input
              id="salary-file-input"
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={e => setFile(e.target.files[0] || null)}
              style={{ display: "none" }}
            />
            <span style={S.fileName}>
              {file ? file.name : "No file chosen"}
            </span>
            {file && (
              <button
                type="button"
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                style={S.clearBtn}
                title="Remove file"
              >✕</button>
            )}
          </div>
          {file && (
            <div style={S.fileInfo}>
              📎 {(file.size / 1024).toFixed(1)} KB · {file.type || "unknown type"}
            </div>
          )}
        </div>

        <button
          type="submit"
          style={{ ...S.btn, opacity: isLoading || !isValid ? 0.6 : 1 }}
          disabled={isLoading || !isValid}
        >
          {isLoading ? "Uploading…" : "⬆️ Upload Slip"}
        </button>
      </form>

      {status && (
        <p style={{ ...S.status, color: status.type === "success" ? "#16a34a" : "#dc2626" }}>
          {status.message}
        </p>
      )}
    </div>
  );
}

const S = {
  card: {
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 15,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    maxWidth: 450,
  },
  header: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
  },
  icon: { fontSize: 28 },
  subtext: { color: "#6c757d", fontSize: 14, marginBottom: 20, marginTop: 4 },
  form: { display: "flex", flexDirection: "column", gap: 20 },
  inputGroup: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 14, fontWeight: "bold", color: "#495057" },
  input: {
    padding: "12px 15px", borderRadius: 8, border: "1px solid #ced4da",
    fontSize: 14, outline: "none",
  },
  fileBox: {
    display: "flex", alignItems: "center", gap: 10,
    padding: 10, borderRadius: 8,
    border: "1px dashed #ced4da", backgroundColor: "#f8f9fa",
  },
  chooseBtn: {
    cursor: "pointer", padding: "8px 16px", borderRadius: 6,
    border: "1px solid #007bff", backgroundColor: "#e9f5ff",
    color: "#007bff", fontSize: 14, fontWeight: "bold", flexShrink: 0,
  },
  fileName: {
    fontSize: 14, color: "#6c757d", flex: 1,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  clearBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#dc2626", fontSize: 16, padding: "0 4px", flexShrink: 0,
  },
  fileInfo: {
    fontSize: 11, color: "#6c757d", marginTop: 4, paddingLeft: 4,
  },
  btn: {
    padding: "12px 24px", borderRadius: 8, border: "none",
    fontWeight: "bold", color: "#fff",
    background: "linear-gradient(45deg, #28a745, #198754)",
    cursor: "pointer", fontSize: 16,
    boxShadow: "0 4px 10px rgba(40,167,69,0.2)",
  },
  status: {
    marginTop: 16, textAlign: "center", fontWeight: "bold", fontSize: 14,
  },
};