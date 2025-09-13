/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import axios from "axios";

const styles = {
  section: {
    marginBottom: 40,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
  },
  formRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  input: {
    padding: "8px 12px",
    borderRadius: 5,
    border: "1.5px solid #ccc",
    fontSize: 14,
    outlineColor: "#007bff",
    width: "100%",
    boxSizing: "border-box",
  },
  btn: {
    cursor: "pointer",
    padding: "8px 14px",
    borderRadius: 5,
    border: "none",
    fontWeight: "600",
    color: "#fff",
    transition: "background-color 0.3s ease",
    margin: "0 5px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
  },
  td: {
    border: "1px solid #ddd",
    padding: 8,
  },
  searchInput: {
    padding: 8,
    fontSize: 16,
    width: "100%",
    maxWidth: 400,
    marginBottom: 20,
    borderRadius: 5,
    border: "1px solid #ccc",
  },
  toggleBtn: {
    backgroundColor: "#007bff",
    padding: "8px 16px",
    fontWeight: "600",
    color: "white",
    borderRadius: 5,
    cursor: "pointer",
    border: "none",
    marginBottom: 16,
  },
};

export default function UserManagement() {
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
  });
  const [userCreationMsg, setUserCreationMsg] = useState("");
  const [offerLetterEmail, setOfferLetterEmail] = useState("");
  const [offerLetterFile, setOfferLetterFile] = useState(null);
  const [offerLetterMsg, setOfferLetterMsg] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null);
  const [editedUser, setEditedUser] = useState({});
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const url = "http://localhost:5000/all-attendance";
      const res = await axios.get(url, { withCredentials: true });
      const data = res.data;

      const formatted = Object.entries(data).map(([email, info]) => ({
        email,
        name: info.name || "",
        role: info.role || "",
        location: info.location || "",
        employeeId: info.employeeId || info.employee_id || "",
        salary: info.salary !== null && info.salary !== undefined ? String(info.salary) : "",
        bank_account: info.bankAccount || info.bank_account || "",
        dob: info.dob || "",
        doj: info.doj || "",
        pan_no: info.panNo || info.pan_no || "",
        ifsc_code: info.ifscCode || info.ifsc_code || "",
        department: info.department || "",
      }));

      setUsers(formatted);
    } catch (err) {
      console.error("❌ Failed to fetch users:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (showAllUsers) fetchUsers();
  }, [showAllUsers]);

  const handleCreateUser = async () => {
    setUserCreationMsg("");
    if (
      !newUser.email.trim() ||
      !newUser.password.trim() ||
      !newUser.name.trim() ||
      !newUser.location.trim() ||
      !newUser.employeeId.trim() ||
      !newUser.salary.trim()
    ) {
      setUserCreationMsg("❌ All fields except Profile Image are required");
      return;
    }
    try {
      await axios.post(
        "http://localhost:5000/create-user",
        {
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role.trim(),
          location: newUser.location,
          employee_id: newUser.employeeId,
          salary: newUser.salary,
          bank_account: newUser.bankAccount,
          dob: newUser.dob,
          doj: newUser.doj,
          pan_no: newUser.panNo,
          ifsc_code: newUser.ifscCode,
          department: newUser.department,
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
      });
      if (showAllUsers) fetchUsers();
    } catch (err) {
      console.error("❌ Failed to create user:", err);
      if (err.response?.status === 409) {
        setUserCreationMsg("❌ User with this email already exists");
      } else {
        setUserCreationMsg("❌ Failed to create user");
      }
    }
  };

  const handleOfferLetterUpload = async () => {
    setOfferLetterMsg("");
    if (!offerLetterEmail.trim() || !offerLetterFile) {
      setOfferLetterMsg("❌ Please provide both an email and an offer letter file.");
      return;
    }

    const formData = new FormData();
    formData.append("email", offerLetterEmail);
    formData.append("offerLetter", offerLetterFile);

    try {
      await axios.post("http://localhost:5000/upload-offer-letter", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOfferLetterMsg("✅ Offer letter uploaded successfully!");
      setOfferLetterEmail("");
      setOfferLetterFile(null);
    } catch (err) {
      setOfferLetterMsg(`❌ Failed to upload: ${err.response?.data?.message || err.message}`);
    }
  };

  const startEditingUser = (email, user) => {
    setEditingEmail(email);
    setEditedUser({
      ...user,
      password: "",
      employeeId: user.employeeId || "",
      salary: user.salary || "",
      location: user.location || "",
      bankAccount: user.bank_account || "",
      dob: user.dob || "",
      doj: user.doj || "",
      panNo: user.pan_no || "",
      ifscCode: user.ifsc_code || "",
      department: user.department || "",
      role: user.role || "",
    });
  };

  const cancelEditing = () => {
    setEditingEmail(null);
    setEditedUser({});
  };

  const handleChangeUserField = (field, value) => {
    setEditedUser((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveUserEdits = async () => {
    try {
      const payload = {
        name: editedUser.name,
        role: editedUser.role.trim(),
        location: editedUser.location,
        employee_id: editedUser.employeeId,
        salary: editedUser.salary,
        bank_account: editedUser.bankAccount,
        dob: editedUser.dob,
        doj: editedUser.doj,
        pan_no: editedUser.panNo,
        ifsc_code: editedUser.ifscCode,
        department: editedUser.department,
      };
      if (editedUser.password && editedUser.password.trim() !== "") {
        payload.password = editedUser.password;
      }

      await axios.put(
        `http://localhost:5000/update-user/${encodeURIComponent(editingEmail)}`,
        payload,
        { withCredentials: true }
      );

      setEditingEmail(null);
      setEditedUser({});
      if (showAllUsers) fetchUsers();
      alert("✅ User updated successfully");
    } catch (err) {
      console.error("❌ Failed to update user:", err);
      alert("❌ Failed to update user. Check console for details.");
    }
  };

  // Filter users by search term
  const filteredUsers = users.filter(({ email, name }) => {
    const term = searchTerm.toLowerCase();
    return email.toLowerCase().includes(term) || (name && name.toLowerCase().includes(term));
  });

  return (
    <section style={styles.section}>
      <h2 style={{ marginBottom: 10 }}>👤 Chairman Dashboard</h2>
      <p>Manage users and view overall team performance.</p>

      {/* User Creation Section */}
      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <h3>➕ Create New User</h3>
        <div style={styles.formRow}>
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            style={styles.input}
          />
        </div>
        <div style={styles.formRow}>
          <input
            type="text"
            placeholder="Name"
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
        <div style={styles.formRow}>
          <input
            type="text"
            placeholder="Location (e.g., Hyderabad, Bangalore)"
            value={newUser.location}
            onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Employee ID"
            value={newUser.employeeId}
            onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Salary"
            value={newUser.salary}
            onChange={(e) => setNewUser({ ...newUser, salary: e.target.value })}
            style={styles.input}
          />
        </div>
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
        <div style={styles.formRow}>
          <input
            type="text"
            placeholder="PAN NO"
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

        <button
          style={{ ...styles.btn, backgroundColor: "#007bff", marginTop: 15 }}
          onClick={handleCreateUser}
        >
          ➕ Create User
        </button>
        {userCreationMsg && <p style={{ marginTop: 8 }}>{userCreationMsg}</p>}
      </div>

      {/* Show/Hide Users Toggle */}
      <button style={styles.toggleBtn} onClick={() => setShowAllUsers((p) => !p)}>
        {showAllUsers ? "Hide Users" : "Show All Users"}
      </button>

      {/* Search bar and users list */}
      {showAllUsers && (
        <>
          <input
            type="text"
            placeholder="Search by Email or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <div>
            <h3>👥 Users List</h3>
            {loading ? (
              <p>Loading users...</p>
            ) : filteredUsers.length ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.td}>Email</th>
                    <th style={styles.td}>Name</th>
                    <th style={styles.td}>Role</th>
                    <th style={styles.td}>Location</th>
                    <th style={styles.td}>Employee ID</th>
                    <th style={styles.td}>Salary</th>
                    <th style={styles.td}>Bank A/c No</th>
                    <th style={styles.td}>DOB</th>
                    <th style={styles.td}>DOJ</th>
                    <th style={styles.td}>PAN NO</th>
                    <th style={styles.td}>IFSC Code</th>
                    <th style={styles.td}>Department</th>
                    <th style={styles.td}>Password (Reset)</th>
                    <th style={styles.td}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isEditing = editingEmail === user.email;
                    return (
                      <tr key={user.email}>
                        <td style={styles.td}>{user.email}</td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedUser.name || ""}
                              onChange={(e) => handleChangeUserField("name", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.name
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedUser.role || ""}
                              onChange={(e) => handleChangeUserField("role", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.role
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedUser.location || ""}
                              onChange={(e) => handleChangeUserField("location", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.location
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedUser.employeeId || ""}
                              onChange={(e) => handleChangeUserField("employeeId", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.employeeId || ""
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editedUser.salary || ""}
                              onChange={(e) => handleChangeUserField("salary", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.salary || ""
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedUser.bankAccount || ""}
                              onChange={(e) => handleChangeUserField("bankAccount", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.bank_account || ""
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editedUser.dob || ""}
                              onChange={(e) => handleChangeUserField("dob", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.dob || ""
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editedUser.doj || ""}
                              onChange={(e) => handleChangeUserField("doj", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.doj || ""
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedUser.panNo || ""}
                              onChange={(e) => handleChangeUserField("panNo", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.pan_no || ""
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedUser.ifscCode || ""}
                              onChange={(e) => handleChangeUserField("ifscCode", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.ifsc_code || ""
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedUser.department || ""}
                              onChange={(e) => handleChangeUserField("department", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            user.department || ""
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="password"
                              placeholder="Enter new password"
                              value={editedUser.password || ""}
                              onChange={(e) => handleChangeUserField("password", e.target.value)}
                              style={styles.input}
                            />
                          ) : (
                            "••••••"
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <>
                              <button
                                style={{ ...styles.btn, backgroundColor: "#28a745" }}
                                onClick={saveUserEdits}
                              >
                                💾 Save
                              </button>
                              <button
                                style={{ ...styles.btn, backgroundColor: "#dc3545" }}
                                onClick={cancelEditing}
                              >
                                ✖ Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              style={{ ...styles.btn, backgroundColor: "#007bff" }}
                              onClick={() => startEditingUser(user.email, user)}
                            >
                              ✏ Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p>No users found.</p>
            )}
          </div>
        </>
      )}

      {/* Offer Letter Upload Section */}
      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <h3>📄 Upload Offer Letter</h3>
        <p>You can upload an offer letter for any existing user by their email.</p>
        <div style={{ ...styles.formRow, alignItems: "center" }}>
          <input
            type="email"
            placeholder="Employee Email"
            value={offerLetterEmail}
            onChange={(e) => setOfferLetterEmail(e.target.value)}
            style={{ ...styles.input, flex: 2 }}
          />
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setOfferLetterFile(e.target.files[0])}
            style={{ ...styles.input, flex: 3 }}
          />
        </div>
        {offerLetterFile && <p style={{ marginTop: 5 }}>Selected file: {offerLetterFile.name}</p>}
        <button
          style={{ ...styles.btn, backgroundColor: "#28a745", marginTop: 8 }}
          onClick={handleOfferLetterUpload}
        >
          ⬆️ Upload Letter
        </button>
        {offerLetterMsg && <p style={{ marginTop: 8 }}>{offerLetterMsg}</p>}
      </div>
    </section>
  );
}
