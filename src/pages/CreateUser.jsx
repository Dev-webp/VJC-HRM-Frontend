
import React, { useState } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

export default function CreateUser() {
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

  const colors = {
    orange500: "#f97316",
    blue400: "#60a5fa",
    white: "#ffffff",
    gray100: "#f3f4f6",
    gray300: "#d1d5db",
    gray700: "#374151",
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
      display: "flex",
      flexWrap: "wrap",
      gap: 16,
      marginBottom: 14,
    },
    input: {
      flex: "1 1 220px",
      padding: "10px 14px",
      borderRadius: 8,
      border: `2px solid ${colors.gray300}`,
      fontSize: 15,
      outlineOffset: 2,
    },
    btn: {
      cursor: "pointer",
      padding: "10px 22px",
      borderRadius: 8,
      border: "none",
      fontWeight: "700",
      fontSize: 16,
      backgroundColor: colors.orange500,
      color: colors.white,
      transition: "background-color 0.3s ease",
    },
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
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          location: newUser.location,
          employee_id: newUser.employeeId,
          salary: newUser.salary,
          bank_account: newUser.bankAccount,
          dob: newUser.dob,
          doj: newUser.doj,
          pan_no: newUser.panNo,
          ifsc_code: newUser.ifscCode,
          department: newUser.department,
          paidLeaves: newUser.paidLeaves,
        },
        { withCredentials: true }
      );
      setUserCreationMsg("✅ User created successfully");
      setNewUser({
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
    } catch (err) {
      console.error("❌ Failed to create user:", err);
      setUserCreationMsg("❌ Failed to create user");
    }
  };

  return (
    <section style={styles.section}>
      <h2
        style={{
          color: colors.blue400,
          fontWeight: "700",
          marginBottom: 18,
        }}
      >
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

      {/* Location, Employee ID, Salary */}
      <div style={styles.formRow}>
        <input
          type="text"
          placeholder="Location *"
          value={newUser.location}
          onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Employee ID *"
          value={newUser.employeeId}
          onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })}
          style={styles.input}
        />
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
        <p
          style={{
            marginTop: 10,
            fontWeight: "600",
            color: userCreationMsg.startsWith("✅")
              ? "#22c55e"
              : "#ef4444",
          }}
        >
          {userCreationMsg}
        </p>
      )}
    </section>
  );
}

