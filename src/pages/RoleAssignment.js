import React, { useState } from "react";
import axios from "axios";

export default function RoleAssignment({ user, baseUrl, onUpdate, styles }) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");

  const handleSave = async () => {
    if (!role) return alert("Please select a role");
    try {
      await axios.put(
        `${baseUrl}/update-user/${encodeURIComponent(user.email)}`,
        { role, location: role === "manager" ? location : "" },
        { withCredentials: true }
      );
      alert("✅ Role updated");
      setIsAssigning(false);
      onUpdate();
    } catch (err) {
      alert("❌ Update failed");
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove role for this user?")) return;
    try {
      await axios.put(
        `${baseUrl}/update-user/${encodeURIComponent(user.email)}`,
        { role: "", location: "" },
        { withCredentials: true }
      );
      onUpdate();
    } catch (err) {
      alert("❌ Remove failed");
    }
  };

  if (user.role && !isAssigning) {
    return (
      <div style={styles.roleBadgeContainer}>
        <span style={styles.roleBadge}>
          {user.role.toUpperCase()} {user.location ? `(${user.location})` : ""}
        </span>
        <button onClick={handleRemove} style={styles.btnSmallAction}>✕</button>
      </div>
    );
  }

  if (isAssigning) {
    return (
      <div style={{ display: "flex", gap: "5px" }}>
        <select style={styles.miniInput} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Role</option>
          <option value="manager">Manager</option>
          <option value="frontdesk">Frontdesk</option>
        </select>
        {role === "manager" && (
          <select style={styles.miniInput} value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">City</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Hyderabad">Hyderabad</option>
          </select>
        )}
        <button onClick={handleSave} style={styles.btnSaveMini}>OK</button>
        <button onClick={() => setIsAssigning(false)} style={styles.btnCancelMini}>✕</button>
      </div>
    );
  }

  return (
    <button onClick={() => setIsAssigning(true)} style={styles.btnAssign}>
      + Assign Role
    </button>
  );
}