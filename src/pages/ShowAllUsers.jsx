import React, { useEffect, useState } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

export default function ShowAllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null);
  const [editedUser, setEditedUser] = useState({});
  const [assigningEmail, setAssigningEmail] = useState(null);
  const [assignRole, setAssignRole] = useState("");
  const [assignLocation, setAssignLocation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState({});
  const [showOldPasswordInEdit, setShowOldPasswordInEdit] = useState({});

  const colors = {
    orange500: "#f97316",
    blue400: "#60a5fa",
    gray300: "#d1d5db",
    white: "#ffffff",
    gray700: "#374151",
    green500: "#22c55e",
    red500: "#ef4444",
    bgLight: "#f9fafb",
    yellow500: "#eab308",
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get(`${baseUrl}/me`, { withCredentials: true });
      setCurrentUser(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch current user:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/all-attendance`, {
        withCredentials: true,
      });
      const data = res.data;
      const formatted = Object.entries(data).map(([email, info]) => ({
        email,
        name: info.name || "",
        role: info.role || "",
        location: info.location || "",
        employeeId: info.employeeId || info.employee_id || "",
        salary: info.salary || "",
        bankAccount:
          info.bankAccount || info.bank_account || info.BankAccount || "",
        department: info.department || "",
        dob: info.dob || "",
        doj: info.doj || "",
        panNo: info.panNo || info.pan_no || "",
        ifscCode: info.ifscCode || info.ifsc_code || "",
        paidLeaves: info.paidLeaves || "",
        password: info.password || "", // Include password
      }));
      setUsers(formatted);
    } catch (err) {
      console.error("❌ Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (showAllUsers) fetchUsers();
  }, [showAllUsers]);

  const handleEdit = (user) => {
    setEditingEmail(user.email);
    setEditedUser({ ...user });
    setNewPassword(""); // Reset password field
  };

  const handleSave = async () => {
    try {
      // ✅ Comprehensive payload with ALL fields normalized
      const payload = {
        name: editedUser.name || "",
        email: editedUser.email || "",
        role: editedUser.role || "",
        location: editedUser.location || "",
        department: editedUser.department || "",
        employeeId: editedUser.employeeId || "",
        employee_id: editedUser.employeeId || "", // Backend compatibility
        salary: editedUser.salary || "",
        bankAccount: editedUser.bankAccount || "",
        bank_account: editedUser.bankAccount || "", // Backend compatibility
        BankAccount: editedUser.bankAccount || "", // Additional compatibility
        panNo: editedUser.panNo || "",
        pan_no: editedUser.panNo || "", // Backend compatibility
        ifscCode: editedUser.ifscCode || "",
        ifsc_code: editedUser.ifscCode || "", // Backend compatibility
        dob: editedUser.dob || "",
        doj: editedUser.doj || "",
        paidLeaves: editedUser.paidLeaves || "",
      };

      // ✅ Only include password if a new one is set
      if (newPassword && newPassword.trim() !== "") {
        payload.password = newPassword.trim();
      }

      await axios.put(
        `${baseUrl}/update-user/${encodeURIComponent(editingEmail)}`,
        payload,
        { withCredentials: true }
      );
      alert("✅ User updated successfully!");
      setEditingEmail(null);
      setNewPassword("");
      setShowOldPasswordInEdit({});
      fetchUsers(); // Refresh to show updated data
    } catch (err) {
      console.error("❌ Failed to update user:", err);
      alert("❌ Update failed: " + (err.response?.data?.message || err.message));
    }
  };

  const removeRole = async (email) => {
    if (!window.confirm("Remove this user's role?")) return;
    try {
      await axios.put(
        `${baseUrl}/update-user/${encodeURIComponent(email)}`,
        { role: "", location: "" },
        { withCredentials: true }
      );
      alert("✅ Role removed successfully.");
      fetchUsers();
    } catch (err) {
      alert("❌ Failed to remove role.");
      console.error(err);
    }
  };

  const saveAssignment = async () => {
    if (!assignRole) return alert("Select role to assign");
    const payload = { role: assignRole };
    if (assignRole === "manager" && assignLocation)
      payload.location = assignLocation;

    try {
      await axios.put(
        `${baseUrl}/update-user/${encodeURIComponent(assigningEmail)}`,
        payload,
        { withCredentials: true }
      );
      alert("✅ Role assigned successfully.");
      setAssigningEmail(null);
      fetchUsers();
    } catch (err) {
      alert("❌ Failed to assign role.");
      console.error(err);
    }
  };

  // ✅ Filter users based on current user's role
  const getFilteredUsersByRole = (usersList) => {
    if (!currentUser) return usersList;

    const userRole = currentUser.role?.toLowerCase();
    
    // Chairman sees all users
    if (userRole === "chairman") {
      return usersList;
    }
    
    // Manager sees only users from their location
    if (userRole === "manager") {
      const managerLocation = currentUser.location;
      return usersList.filter(u => u.location === managerLocation);
    }
    
    // Other roles see no users (or you can return empty array)
    return [];
  };

  const filteredUsers = getFilteredUsersByRole(users).filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isChairman = currentUser?.role?.toLowerCase() === "chairman";
  const isManager = currentUser?.role?.toLowerCase() === "manager";

  const inputField = (label, value, onChange, type = "text") => (
    <div style={{ marginBottom: 8 }}>
      <small style={{ fontWeight: 600, color: colors.gray700 }}>{label}</small>
      <input
        type={type}
        style={{
          width: "100%",
          padding: "6px 8px",
          borderRadius: 6,
          border: `1px solid ${colors.gray300}`,
          fontSize: 13,
          marginTop: 4,
        }}
        value={value}
        onChange={onChange}
      />
    </div>
  );

  const togglePasswordVisibility = (email) => {
    setShowPassword((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  const toggleOldPasswordInEdit = (email) => {
    setShowOldPasswordInEdit((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  return (
    <section
      style={{
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 24,
        marginTop: 30,
        boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
      }}
    >
      <button
        style={{
          backgroundColor: colors.orange500,
          padding: "10px 20px",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: "700",
          marginBottom: 20,
        }}
        onClick={() => setShowAllUsers((p) => !p)}
      >
        {showAllUsers ? "Hide Users" : "Show All Users"}
      </button>

      {showAllUsers && (
        <>
          <h2
            style={{
              color: colors.blue400,
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            👥 Users Management
            {isManager && currentUser?.location && (
              <span style={{ fontSize: 16, color: colors.orange500, marginLeft: 10 }}>
                (Showing users from: {currentUser.location})
              </span>
            )}
          </h2>
          <input
            type="text"
            placeholder="Search by name or email..."
            style={{
              padding: 12,
              fontSize: 16,
              width: "100%",
              maxWidth: 400,
              borderRadius: 8,
              border: `2px solid ${colors.gray300}`,
              marginBottom: 20,
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {loading ? (
            <p>Loading users...</p>
          ) : filteredUsers.length ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                gap: 20,
              }}
            >
              {filteredUsers.map((user) => {
                const isEditing = editingEmail === user.email;
                const isAssigning = assigningEmail === user.email;
                const isPasswordVisible = showPassword[user.email];
                const isOldPasswordVisible = showOldPasswordInEdit[user.email];
                
                return (
                  <div
                    key={user.email}
                    style={{
                      border: `1px solid ${colors.gray300}`,
                      borderRadius: 10,
                      padding: 16,
                      background: colors.bgLight,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0, color: colors.gray700 }}>
                          {user.name || "No Name"}
                        </h3>
                        <small style={{ color: colors.blue400 }}>
                          {user.email}
                        </small>
                      </div>
                      {user.role && (
                        <span
                          style={{
                            background:
                              user.role === "manager"
                                ? "#60a5fa"
                                : user.role === "mis-execuitve"
                                ? "#facc15"
                                : "#94a3b8",
                            color: "#fff",
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {user.role}
                        </span>
                      )}
                    </div>

                    {/* Editable or Info */}
                    {isEditing ? (
                      <>
                        {inputField("Name", editedUser.name, (e) =>
                          setEditedUser({ ...editedUser, name: e.target.value })
                        )}
                        {inputField("Email", editedUser.email, (e) =>
                          setEditedUser({ ...editedUser, email: e.target.value })
                        )}
                        {inputField("Role", editedUser.role, (e) =>
                          setEditedUser({ ...editedUser, role: e.target.value })
                        )}
                        {inputField("Location", editedUser.location, (e) =>
                          setEditedUser({
                            ...editedUser,
                            location: e.target.value,
                          })
                        )}
                        {inputField("Department", editedUser.department, (e) =>
                          setEditedUser({
                            ...editedUser,
                            department: e.target.value,
                          })
                        )}
                        {inputField("Employee ID", editedUser.employeeId, (e) =>
                          setEditedUser({
                            ...editedUser,
                            employeeId: e.target.value,
                          })
                        )}
                        {inputField("Salary", editedUser.salary, (e) =>
                          setEditedUser({
                            ...editedUser,
                            salary: e.target.value,
                          })
                        )}
                        {inputField("Bank Account", editedUser.bankAccount, (e) =>
                          setEditedUser({
                            ...editedUser,
                            bankAccount: e.target.value,
                          })
                        )}
                        {inputField("PAN No", editedUser.panNo, (e) =>
                          setEditedUser({
                            ...editedUser,
                            panNo: e.target.value,
                          })
                        )}
                        {inputField("IFSC Code", editedUser.ifscCode, (e) =>
                          setEditedUser({
                            ...editedUser,
                            ifscCode: e.target.value,
                          })
                        )}
                        {inputField("Date of Birth", editedUser.dob, (e) =>
                          setEditedUser({ ...editedUser, dob: e.target.value })
                        )}
                        {inputField("Date of Joining", editedUser.doj, (e) =>
                          setEditedUser({ ...editedUser, doj: e.target.value })
                        )}
                        {inputField("Paid Leaves", editedUser.paidLeaves, (e) =>
                          setEditedUser({
                            ...editedUser,
                            paidLeaves: e.target.value,
                          })
                        )}

                        {/* OLD PASSWORD VISIBLE IN EDIT MODE */}
                        <div style={{ marginBottom: 8, marginTop: 12, padding: 10, backgroundColor: "#e0f2fe", borderRadius: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <small style={{ fontWeight: 600, color: colors.gray700 }}>
                              🔐 Current Password
                            </small>
                            <button
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 16,
                                padding: 0,
                              }}
                              onClick={() => toggleOldPasswordInEdit(user.email)}
                              title={isOldPasswordVisible ? "Hide current password" : "Show current password"}
                            >
                              {isOldPasswordVisible ? "🙈" : "👁️"}
                            </button>
                          </div>
                          <div
                            style={{
                              padding: "6px 8px",
                              backgroundColor: colors.white,
                              borderRadius: 6,
                              border: `1px solid ${colors.gray300}`,
                              fontSize: 13,
                              fontFamily: "monospace",
                              color: colors.gray700,
                            }}
                          >
                            {isOldPasswordVisible ? (editedUser.password || "No password set") : "••••••••"}
                          </div>
                        </div>

                        {/* NEW PASSWORD CHANGE SECTION */}
                        <div style={{ marginBottom: 8, marginTop: 12, padding: 10, backgroundColor: "#fef3c7", borderRadius: 6 }}>
                          <small style={{ fontWeight: 600, color: colors.gray700, display: "block", marginBottom: 4 }}>
                            🔑 Set New Password (leave blank to keep current)
                          </small>
                          <input
                            type="text"
                            placeholder="Enter new password..."
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              borderRadius: 6,
                              border: `1px solid ${colors.gray300}`,
                              fontSize: 13,
                            }}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>

                        <div style={{ marginTop: 10 }}>
                          <button
                            style={{
                              background: colors.green500,
                              color: "#fff",
                              padding: "6px 12px",
                              border: "none",
                              borderRadius: 6,
                              marginRight: 6,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                            onClick={handleSave}
                          >
                            💾 Save
                          </button>
                          <button
                            style={{
                              background: colors.red500,
                              color: "#fff",
                              padding: "6px 12px",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                            onClick={() => {
                              setEditingEmail(null);
                              setNewPassword("");
                              setShowOldPasswordInEdit({});
                            }}
                          >
                            ✖ Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, color: colors.gray700 }}>
                          <p style={{ margin: "4px 0" }}><b>DOB:</b> {user.dob || "—"}</p>
                          <p style={{ margin: "4px 0" }}><b>DOJ:</b> {user.doj || "—"}</p>
                          <p style={{ margin: "4px 0" }}><b>Department:</b> {user.department || "—"}</p>
                          <p style={{ margin: "4px 0" }}><b>Location:</b> {user.location || "—"}</p>
                          <p style={{ margin: "4px 0" }}><b>Employee ID:</b> {user.employeeId || "—"}</p>
                          <p style={{ margin: "4px 0" }}><b>Salary:</b> {user.salary || "—"}</p>
                          <p style={{ margin: "4px 0" }}><b>Bank Account:</b> {user.bankAccount || "—"}</p>
                          <p style={{ margin: "4px 0" }}><b>PAN No:</b> {user.panNo || "—"}</p>
                          <p style={{ margin: "4px 0" }}><b>IFSC Code:</b> {user.ifscCode || "—"}</p>
                          <p style={{ margin: "4px 0" }}><b>Paid Leaves:</b> {user.paidLeaves || 0}</p>
                          
                          {/* Password Display */}
                          <p style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: 8 }}>
                            <b>Password:</b> 
                            <span style={{ fontFamily: "monospace" }}>
                              {isPasswordVisible ? (user.password || "—") : "••••••••"}
                            </span>
                            <button
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 16,
                                padding: 0,
                              }}
                              onClick={() => togglePasswordVisibility(user.email)}
                              title={isPasswordVisible ? "Hide password" : "Show password"}
                            >
                              {isPasswordVisible ? "🙈" : "👁️"}
                            </button>
                          </p>

                          <button
                            style={{
                              background: colors.blue400,
                              color: "#fff",
                              padding: "6px 12px",
                              border: "none",
                              borderRadius: 6,
                              marginTop: 10,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                            onClick={() => handleEdit(user)}
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </>
                    )}

                    {/* Role Assignment */}
                    <hr style={{ margin: "12px 0", borderColor: colors.gray300 }} />
                    {isChairman && (
                      <div>
                        {isAssigning ? (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <select
                              style={{
                                flex: 1,
                                padding: 6,
                                borderRadius: 6,
                                border: `1px solid ${colors.gray300}`,
                              }}
                              value={assignRole}
                              onChange={(e) => {
                                setAssignRole(e.target.value);
                                if (e.target.value !== "manager")
                                  setAssignLocation("");
                              }}
                            >
                              <option value="">Select Role</option>
                              <option value="manager">Manager</option>
                              <option value="mis-execuitve">mis-execuitve</option>
                            </select>
                            {assignRole === "manager" && (
                              <select
                                style={{
                                  flex: 1,
                                  padding: 6,
                                  borderRadius: 6,
                                  border: `1px solid ${colors.gray300}`,
                                }}
                                value={assignLocation}
                                onChange={(e) =>
                                  setAssignLocation(e.target.value)
                                }
                              >
                                <option value="">Select Location</option>
                                <option value="Bangalore">Bangalore</option>
                                <option value="Hyderabad">Hyderabad</option>
                              </select>
                            )}
                            <button
                              style={{
                                background: colors.green500,
                                color: "#fff",
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "none",
                                cursor: "pointer",
                              }}
                              onClick={saveAssignment}
                            >
                              Save
                            </button>
                            <button
                              style={{
                                background: colors.red500,
                                color: "#fff",
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "none",
                                cursor: "pointer",
                              }}
                              onClick={() => setAssigningEmail(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : user.role ? (
                          <div>
                            <p style={{ margin: "4px 0" }}>
                              <b>Current Role:</b> {user.role}
                              {user.role === "manager" && user.location && (
                                <> ({user.location})</>
                              )}
                            </p>
                            <button
                              style={{
                                background: colors.red500,
                                color: "#fff",
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "none",
                                cursor: "pointer",
                              }}
                              onClick={() => removeRole(user.email)}
                            >
                              Remove Role
                            </button>
                          </div>
                        ) : (
                          <button
                            style={{
                              background: colors.blue400,
                              color: "#fff",
                              padding: "6px 12px",
                              borderRadius: 6,
                              border: "none",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setAssigningEmail(user.email);
                              setAssignRole("");
                              setAssignLocation("");
                            }}
                          >
                            Assign Role
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No users found.</p>
          )}
        </>
      )}
    </section>
  );
}