import React, { useState, useEffect } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

// Location → prefix mapping
const LOCATION_PREFIX_MAP = {
  Bangalore: "VJC-BNG",
  Hyderabad: "VJC-HYD",
  Chennai:   "VJC-CHN",
  Mumbai:    "VJC-MUM",
  Delhi:     "VJC-DEL",
};

const LOCATIONS = Object.keys(LOCATION_PREFIX_MAP);

export default function CreateUser() {
  const currentYear = new Date().getFullYear();

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    location: "",
    employeeId: "",
    salary: "",
    bankAccount: "",
    dob: "",
    doj: "",
    panNo: "",
    ifscCode: "",
    department: "",
    paidLeaves: "",
  });

  const [userCreationMsg, setUserCreationMsg] = useState("");
  const [loadingId, setLoadingId] = useState(false);

  // Auto-generate employee ID when location changes
  useEffect(() => {
    if (!newUser.location) {
      setNewUser((u) => ({ ...u, employeeId: "" }));
      return;
    }

    const prefix = LOCATION_PREFIX_MAP[newUser.location];
    if (!prefix) return;

    setLoadingId(true);

    // Fetch all users and find the highest sequence number for this prefix+year
    axios
      .get(`${baseUrl}/all-attendance`, { withCredentials: true })
      .then((res) => {
        const users = res.data; // object keyed by email
        const pattern = `${prefix}-${currentYear}-`;

        let maxSeq = 0;
        Object.values(users).forEach((user) => {
          const id = user.employeeId || "";
          if (id.startsWith(pattern)) {
            const seq = parseInt(id.replace(pattern, ""), 10);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
          }
        });

        const nextSeq = String(maxSeq + 1).padStart(3, "0");
        setNewUser((u) => ({ ...u, employeeId: `${pattern}${nextSeq}` }));
      })
      .catch(() => {
        // Fallback: just set 001 if fetch fails
        setNewUser((u) => ({ ...u, employeeId: `${prefix}-${currentYear}-001` }));
      })
      .finally(() => setLoadingId(false));
  }, [newUser.location, currentYear]);

  const colors = {
    orange500: "#f97316",
    blue400:   "#60a5fa",
    white:     "#ffffff",
    gray100:   "#f3f4f6",
    gray200:   "#e5e7eb",
    gray300:   "#d1d5db",
    gray500:   "#6b7280",
    gray700:   "#374151",
    green500:  "#22c55e",
    red400:    "#ef4444",
    indigo50:  "#eef2ff",
  };

  const styles = {
    section: {
      backgroundColor: colors.white,
      borderRadius: 12,
      padding: 24,
      marginBottom: 40,
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    },
    formRow: {
      display:       "flex",
      flexWrap:      "wrap",
      gap:           16,
      marginBottom:  14,
    },
    input: {
      flex:         "1 1 220px",
      padding:      "10px 14px",
      borderRadius: 8,
      border:       `2px solid ${colors.gray300}`,
      fontSize:     15,
      outlineOffset: 2,
      backgroundColor: colors.white,
    },
    select: {
      flex:            "1 1 220px",
      padding:         "10px 14px",
      borderRadius:    8,
      border:          `2px solid ${colors.gray300}`,
      fontSize:        15,
      outlineOffset:   2,
      backgroundColor: colors.white,
      cursor:          "pointer",
      appearance:      "auto",
    },
    employeeIdBox: {
      flex:            "1 1 220px",
      padding:         "10px 14px",
      borderRadius:    8,
      border:          `2px solid ${colors.blue400}`,
      fontSize:        15,
      backgroundColor: colors.indigo50,
      color:           colors.gray700,
      fontWeight:      "600",
      letterSpacing:   "0.5px",
      display:         "flex",
      alignItems:      "center",
      gap:             8,
    },
    badge: {
      display:         "inline-block",
      fontSize:        11,
      fontWeight:      "700",
      padding:         "2px 8px",
      borderRadius:    999,
      backgroundColor: colors.blue400,
      color:           colors.white,
      marginLeft:      4,
    },
    btn: {
      cursor:          "pointer",
      padding:         "10px 22px",
      borderRadius:    8,
      border:          "none",
      fontWeight:      "700",
      fontSize:        16,
      backgroundColor: colors.orange500,
      color:           colors.white,
      transition:      "background-color 0.3s ease",
    },
    hint: {
      fontSize:  12,
      color:     colors.gray500,
      marginTop: -10,
      marginBottom: 6,
      paddingLeft: 4,
    },
  };

  const handleLocationChange = (e) => {
    setNewUser((u) => ({ ...u, location: e.target.value, employeeId: "" }));
  };

  const handleCreateUser = async () => {
    if (
      !newUser.email ||
      !newUser.password ||
      !newUser.name ||
      !newUser.location ||
      !newUser.employeeId ||
      !newUser.salary
    ) {
      setUserCreationMsg("❌ Please fill all mandatory fields.");
      return;
    }

    try {
      await axios.post(
        `${baseUrl}/create-user`,
        {
          name:         newUser.name,
          email:        newUser.email,
          password:     newUser.password,
          role:         newUser.role,
          location:     newUser.location,
          employee_id:  newUser.employeeId,
          salary:       newUser.salary,
          bank_account: newUser.bankAccount,
          dob:          newUser.dob,
          doj:          newUser.doj,
          pan_no:       newUser.panNo,
          ifsc_code:    newUser.ifscCode,
          department:   newUser.department,
          paidLeaves:   newUser.paidLeaves,
        },
        { withCredentials: true }
      );
      setUserCreationMsg("✅ User created successfully");
      setNewUser({
        name: "", email: "", password: "", role: "", location: "",
        employeeId: "", salary: "", bankAccount: "", dob: "", doj: "",
        panNo: "", ifscCode: "", department: "", paidLeaves: "",
      });
    } catch (err) {
      console.error("❌ Failed to create user:", err);
      setUserCreationMsg("❌ Failed to create user");
    }
  };

  return (
    <section style={styles.section}>
      <h2 style={{ color: colors.blue400, fontWeight: "700", marginBottom: 18 }}>
        ➕ Create New User
      </h2>

      {/* Email & Password */}
      <div style={styles.formRow}>
        <input
          type="email"
          placeholder="Email *"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password *"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          style={styles.input}
        />
      </div>

      {/* Name & Role */}
      <div style={styles.formRow}>
        <input
          type="text"
          placeholder="Name *"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Role"
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          style={styles.input}
        />
      </div>

      {/* Location dropdown — triggers auto ID generation */}
      <div style={styles.formRow}>
        <select
          value={newUser.location}
          onChange={handleLocationChange}
          style={styles.select}
        >
          <option value="">Select Location *</option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>

        {/* Auto-generated Employee ID display */}
        <div style={styles.employeeIdBox}>
          {loadingId ? (
            <span style={{ color: colors.gray500, fontWeight: "400" }}>
              ⏳ Generating ID…
            </span>
          ) : newUser.employeeId ? (
            <>
              {newUser.employeeId}
              <span style={styles.badge}>Auto</span>
            </>
          ) : (
            <span style={{ color: colors.gray500, fontWeight: "400", fontSize: 14 }}>
              Employee ID — select location first
            </span>
          )}
        </div>
      </div>

      {newUser.location && !loadingId && (
        <p style={styles.hint}>
          📌 ID auto-generated for <strong>{newUser.location}</strong> ({LOCATION_PREFIX_MAP[newUser.location]}-{currentYear}-XXX)
        </p>
      )}

      {/* Salary */}
      <div style={styles.formRow}>
        <input
          type="number"
          placeholder="Salary *"
          value={newUser.salary}
          onChange={(e) => setNewUser({ ...newUser, salary: e.target.value })}
          style={styles.input}
        />
      </div>

      {/* Bank A/c, DOB, DOJ */}
      <div style={styles.formRow}>
        <input
          type="text"
          placeholder="Bank A/c No"
          value={newUser.bankAccount}
          onChange={(e) => setNewUser({ ...newUser, bankAccount: e.target.value })}
          style={styles.input}
        />
        <input
          type="date"
          placeholder="DOB"
          value={newUser.dob}
          onChange={(e) => setNewUser({ ...newUser, dob: e.target.value })}
          style={styles.input}
        />
        <input
          type="date"
          placeholder="DOJ"
          value={newUser.doj}
          onChange={(e) => setNewUser({ ...newUser, doj: e.target.value })}
          style={styles.input}
        />
      </div>

      {/* PAN, IFSC, Department */}
      <div style={styles.formRow}>
        <input
          type="text"
          placeholder="PAN No"
          value={newUser.panNo}
          onChange={(e) => setNewUser({ ...newUser, panNo: e.target.value })}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="IFSC Code"
          value={newUser.ifscCode}
          onChange={(e) => setNewUser({ ...newUser, ifscCode: e.target.value })}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Department"
          value={newUser.department}
          onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
          style={styles.input}
        />
      </div>

      {/* Paid Leaves */}
      <div style={styles.formRow}>
        <input
          type="number"
          placeholder="Paid Leaves"
          value={newUser.paidLeaves}
          onChange={(e) => setNewUser({ ...newUser, paidLeaves: e.target.value })}
          style={styles.input}
        />
      </div>

      <button style={styles.btn} onClick={handleCreateUser}>
        ➕ Create User
      </button>

      {userCreationMsg && (
        <p style={{
          marginTop: 10,
          fontWeight: "600",
          color: userCreationMsg.startsWith("✅") ? colors.green500 : colors.red400,
        }}>
          {userCreationMsg}
        </p>
      )}
    </section>
  );
}