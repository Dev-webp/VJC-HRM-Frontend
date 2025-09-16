import React, { useState } from "react";
import axios from "axios";

export default function SalarySlipUpload() {
  const [formData, setFormData] = useState({
    email: "",
    file: null,
  });
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = formData.email.trim() && formData.file;

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!isFormValid) {
      setStatus({
        message: "❌ Please enter a valid employee email and select a file.",
        type: "error",
      });
      return;
    }

    const payload = new FormData();
    payload.append("email", formData.email);
    payload.append("salarySlip", formData.file);

    setIsLoading(true);
    setStatus(null);

    try {
      const res = await axios.post("https://backend.vjcoverseas.com/upload-salary-slip", payload, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus({
        message: res.data?.message || "✅ Salary slip uploaded successfully!",
        type: "success",
      });
      setFormData({ email: "", file: null });
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to upload salary slip.";
      setStatus({ message: `❌ ${errorMessage}`, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const fileInputKey = formData.file ? formData.file.name : Date.now();

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.icon}>📄</span>
        <h3>Upload Salary Slip</h3>
      </div>
      <p style={styles.subtext}>
        Upload a salary slip for an employee by email.
      </p>

      <form onSubmit={handleUpload} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Employee Email</label>
          <input
            type="email"
            name="email"
            placeholder="e.g., john.doe@example.com"
            value={formData.email}
            onChange={handleInputChange}
            style={styles.input}
            aria-label="Employee Email"
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Select File</label>
          <div style={styles.fileInputContainer}>
            <label htmlFor="file-upload" style={styles.fileInputLabel}>
              Choose File
            </label>
            <input
              id="file-upload"
              key={fileInputKey}
              type="file"
              name="file"
              accept="application/pdf,image/*"
              onChange={handleInputChange}
              style={{ display: "none" }}
              aria-label="Select Salary Slip File"
            />
            <span style={styles.fileName}>
              {formData.file ? formData.file.name : "No file chosen"}
            </span>
          </div>
        </div>

        <button
          type="submit"
          style={{ ...styles.btn, opacity: isLoading || !isFormValid ? 0.6 : 1 }}
          disabled={isLoading || !isFormValid}
        >
          {isLoading ? "Uploading..." : "Upload Slip"}
        </button>
      </form>

      {status && (
        <p style={{ ...styles.statusMessage, color: status.type === "success" ? "#28a745" : "#dc3545" }}>
          {status.message}
        </p>
      )}
    </div>
  );
}

const styles = {
  card: {
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 15,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    maxWidth: 450,
    margin: "40px auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    marginBottom: 10,
  },
  icon: {
    fontSize: 28,
  },
  subtext: {
    color: "#6c757d",
    fontSize: 14,
    marginBottom: 20,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#495057",
    marginBottom: 5,
  },
  input: {
    padding: "12px 15px",
    borderRadius: 8,
    border: "1px solid #ced4da",
    fontSize: 14,
    transition: "border-color 0.3s, box-shadow 0.3s",
    outline: "none",
  },
  fileInputContainer: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px",
    borderRadius: 8,
    border: "1px dashed #ced4da",
    backgroundColor: "#f8f9fa",
  },
  fileInputLabel: {
    cursor: "pointer",
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid #007bff",
    backgroundColor: "#e9f5ff",
    color: "#007bff",
    fontSize: 14,
    fontWeight: "bold",
  },
  fileName: {
    fontSize: 14,
    color: "#6c757d",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  btn: {
    padding: "12px 24px",
    borderRadius: 8,
    border: "none",
    fontWeight: "bold",
    color: "#fff",
    background: "linear-gradient(45deg, #28a745, #198754)",
    cursor: "pointer",
    fontSize: 16,
    transition: "transform 0.2s, box-shadow 0.2s, opacity 0.3s",
    boxShadow: "0 4px 10px rgba(40, 167, 69, 0.2)",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 15px rgba(40, 167, 69, 0.3)",
    },
  },
  statusMessage: {
    marginTop: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
};