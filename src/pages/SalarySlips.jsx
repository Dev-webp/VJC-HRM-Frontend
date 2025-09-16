import React from "react";

function SalarySlips({ salarySlips }) {
  return (
    <div
      style={{
        backgroundColor: "#f7fafc",
        padding: "24px",
        marginTop: "20px",
        borderRadius: "12px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      }}
    >
      <h3
        style={{
          fontSize: "1.75rem",
          fontWeight: "700",
          color: "#2d3748",
          marginBottom: "24px",
        }}
      >
        📄 My Salary Slips
      </h3>

      {salarySlips.length === 0 ? (
        <p style={{ color: "#718096", textAlign: "center", padding: "40px" }}>
          <span role="img" aria-label="sad face">😢</span> No slips uploaded yet.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
          {salarySlips.map((slip, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "10px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                border: "1px solid #edf2f7",
                transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.15)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }}
            >
              <div>
                <h4 style={{ fontSize: "1.125rem", color: "#2b6cb0", marginBottom: "8px" }}>
                  {slip.filename}
                </h4>
                <p style={{ color: "#718096", fontSize: "0.875rem", marginBottom: "20px" }}>
                  Uploaded on: **{new Date(slip.uploadedAt).toLocaleDateString()}**
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <a
                  href={`https://backend.vjcoverseas.com/${slip.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: "1",
                    textAlign: "center",
                    padding: "10px 0",
                    backgroundColor: "#4299e1",
                    color: "white",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: "600",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#3182ce")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#4299e1")}
                >
                  View
                </a>
                <a
                  href={`https://backend.vjcoverseas.com/${slip.path}`}
                  download
                  style={{
                    flex: "1",
                    textAlign: "center",
                    padding: "10px 0",
                    backgroundColor: "#f97316",
                    color: "white",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: "600",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#ea580c")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#f97316")}
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SalarySlips;