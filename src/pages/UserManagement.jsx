/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import axios from "axios";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

const colors = {
  orange500: "#f97316", // Tailwind orange-500 approx
  blue400: "#60a5fa", // Tailwind blue-400 approx
  white: "#ffffff",
  gray100: "#f3f4f6",
  gray300: "#d1d5db",
  gray700: "#374151",
};

const styles = {
  container: {
    maxWidth: "full",
    margin: "auto",
    padding: "20px 16px 40px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: colors.gray700,
    backgroundColor: colors.gray100,
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  logo: {
    width: 48,
    height: 48,
    backgroundColor: colors.orange500,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: 24,
    color: colors.white,
    userSelect: "none",
  },
  titleSection: {
    flex: 1,
    minWidth: 220,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    margin: 0,
    color: colors.orange500,
    userSelect: "none",
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray700,
    marginTop: 4,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginBottom: 40,
  },
  formRow: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  input: {
    flex: "1 1 220px",
    padding: "10px 14px",
    borderRadius: 8,
    border: `2px solid ${colors.gray300}`,
    fontSize: 15,
    outlineOffset: 2,
    transition: "border-color 0.3s ease",
    boxSizing: "border-box",
  },
  inputError: {
    borderColor: colors.orange500,
  },
  btn: {
    cursor: "pointer",
    padding: "10px 22px",
    borderRadius: 8,
    border: "none",
    fontWeight: "700",
    fontSize: 16,
    transition: "background-color 0.3s ease",
    userSelect: "none",
  },
  btnPrimary: {
    backgroundColor: colors.orange500,
    color: colors.white,
  },
  btnPrimaryHover: {
    backgroundColor: "#ea580c", // darker orange
  },
  btnSecondary: {
    backgroundColor: colors.blue400,
    color: colors.white,
  },
  btnSecondaryHover: {
    backgroundColor: "#3b82f6", // darker blue
  },
  btnDanger: {
    backgroundColor: "#ef4444", // red-500
    color: colors.white,
  },
  btnDangerHover: {
    backgroundColor: "#dc2626", // red-600
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 16,
    fontSize: 14,
  },
  th: {
    borderBottom: `2px solid ${colors.gray300}`,
    padding: "12px 10px",
    textAlign: "left",
    color: colors.orange500,
    fontWeight: "700",
    position: "sticky",
    top: 0,
    backgroundColor: colors.white,
    zIndex: 1,
  },
  td: {
    borderBottom: `1px solid ${colors.gray300}`,
    padding: "10px",
    verticalAlign: "middle",
  },
  searchInput: {
    padding: 12,
    fontSize: 16,
    width: "100%",
    maxWidth: 400,
    marginBottom: 24,
    borderRadius: 8,
    border: `2px solid ${colors.gray300}`,
    boxSizing: "border-box",
  },
  toggleBtn: {
    backgroundColor: colors.orange500,
    padding: "12px 22px",
    fontWeight: "700",
    color: colors.white,
    borderRadius: 8,
    cursor: "pointer",
    border: "none",
    marginBottom: 24,
    width: "fit-content",
    userSelect: "none",
    transition: "background-color 0.3s ease",
  },
  toggleBtnHover: {
    backgroundColor: "#ea580c",
  },
  labelWithWarning: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: "700",
    color: colors.gray700,
  },
  warningSymbol: {
    color: colors.orange500,
    fontWeight: "900",
    fontSize: 20,
    lineHeight: 1,
    userSelect: "none",
  },
  msgSuccess: {
    marginTop: 12,
    color: "#22c55e", // green-500
    fontWeight: "600",
  },
  msgError: {
    marginTop: 12,
    color: "#ef4444", // red-500
    fontWeight: "600",
  },
  responsiveTableWrapper: {
    overflowX: "auto",
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
  const [missingFields, setMissingFields] = useState([]);
  
  // 🆕 State for the logged-in user's data
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);

  // 🆕 Function to fetch the logged-in user's details
  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get(`${baseUrl}/me`, { withCredentials: true });
      setCurrentUser(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch current user:", err);
      // Handle scenario where user is not logged in or token is expired
    } finally {
      setCurrentUserLoading(false);
    }
  };

  // 🆕 Call fetchCurrentUser once on component mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchUsers = async () => {
    // ⚠️ Only fetch if current user data is available
    if (!currentUser) return;

    setLoading(true);
    try {
      const url = `${baseUrl}/all-attendance`;
      const res = await axios.get(url, { withCredentials: true });
      const data = res.data;
      
      const formatted = Object.entries(data).map(([email, info]) => ({
        email,
        name: info.name || "",
        role: info.role || "",
        location: info.location || "",
        employeeId: info.employeeId || info.employee_id || "",
        salary:
          info.salary !== null && info.salary !== undefined
            ? String(info.salary)
            : "",
        bank_account: info.bankAccount || info.bank_account || "",
        dob: info.dob || "",
        doj: info.doj || "",
        pan_no: info.panNo || info.pan_no || "",
        ifsc_code: info.ifscCode || info.ifsc_code || "",
        department: info.department || "",
      }));

      // 🆕 Logic to filter users based on role and location
      let filteredData = formatted;
      const userRole = currentUser.role?.toLowerCase();
      const userLocation = currentUser.location?.toLowerCase();

      if (userRole !== "chairman") {
        // If not 'chairman', filter by location
        if (userRole === "manager" && userLocation) {
          filteredData = formatted.filter(
            (user) => user.location?.toLowerCase() === userLocation
          );
        } else {
          // Fallback for other roles, perhaps show no one or just themselves (though the backend should handle this if needed)
          filteredData = [];
        }
      } 
      // If role IS 'chairman', the list remains 'formatted' (all users)

      setUsers(filteredData);
    } catch (err) {
      console.error("❌ Failed to fetch users:", err);
    }
    setLoading(false);
  };

  // ⚠️ Dependency array now includes currentUser
  useEffect(() => {
    if (showAllUsers && currentUser) fetchUsers();
  }, [showAllUsers, currentUser]);

  const validateNewUser = () => {
    const requiredFields = [
      "email",
      "password",
      "name",
      "location",
      "employeeId",
      "salary",
    ];
    const missing = requiredFields.filter((f) => !newUser[f]?.trim());
    setMissingFields(missing);
    return missing.length === 0;
  };

  const handleCreateUser = async () => {
    setUserCreationMsg("");
    if (!validateNewUser()) {
      setUserCreationMsg("❌ Please fill all mandatory fields marked in orange");
      return;
    }
    try {
      await axios.post(
        `${baseUrl}/create-user`,
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
      setMissingFields([]);
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
      await axios.post(`${baseUrl}/upload-offer-letter`, formData, {
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
        `${baseUrl}/update-user/${encodeURIComponent(editingEmail)}`,
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
    return (
      email.toLowerCase().includes(term) || (name && name.toLowerCase().includes(term))
    );
  });

  // Helper to check if field is missing for new user validation
  const isMissing = (field) => missingFields.includes(field);

  // 🆕 Render a loading message while fetching current user data
  if (currentUserLoading) {
    return <div style={styles.container}><p>Authenticating user role...</p></div>;
  }

  return (
    <main style={styles.container}>
      {/* User Creation Section */}
      <section style={styles.section} aria-labelledby="create-user-heading">
        <h2 id="create-user-heading" style={{ color: colors.blue400, fontWeight: "700", marginBottom: 18 }}>
          ➕ Create New User
        </h2>
        <div style={styles.formRow}>
          <input
            type="email"
            placeholder="Email *"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            style={{ ...styles.input, ...(isMissing("email") ? styles.inputError : {}) }}
            aria-invalid={isMissing("email")}
            aria-describedby={isMissing("email") ? "email-error" : undefined}
          />
          <input
            type="password"
            placeholder="Password *"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            style={{ ...styles.input, ...(isMissing("password") ? styles.inputError : {}) }}
            aria-invalid={isMissing("password")}
            aria-describedby={isMissing("password") ? "password-error" : undefined}
          />
        </div>
        <div style={styles.formRow}>
          <input
            type="text"
            placeholder="Name *"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            style={{ ...styles.input, ...(isMissing("name") ? styles.inputError : {}) }}
            aria-invalid={isMissing("name")}
            aria-describedby={isMissing("name") ? "name-error" : undefined}
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
            placeholder="Location (e.g., Hyderabad, Bangalore) *"
            value={newUser.location}
            onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
            style={{ ...styles.input, ...(isMissing("location") ? styles.inputError : {}) }}
            aria-invalid={isMissing("location")}
            aria-describedby={isMissing("location") ? "location-error" : undefined}
          />
          <input
            type="text"
            placeholder="Employee ID *"
            value={newUser.employeeId}
            onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })}
            style={{ ...styles.input, ...(isMissing("employeeId") ? styles.inputError : {}) }}
            aria-invalid={isMissing("employeeId")}
            aria-describedby={isMissing("employeeId") ? "employeeId-error" : undefined}
          />
          <input
            type="number"
            placeholder="Salary *"
            value={newUser.salary}
            onChange={(e) => setNewUser({ ...newUser, salary: e.target.value })}
            style={{ ...styles.input, ...(isMissing("salary") ? styles.inputError : {}) }}
            aria-invalid={isMissing("salary")}
            aria-describedby={isMissing("salary") ? "salary-error" : undefined}
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
          <div style={styles.formRow}>
            <label htmlFor="dob" style={{ fontWeight: "700", marginBottom: 4, color: colors.gray700 }}>
              DOB
            </label>
            <input
              id="dob"
              type="date"
              value={newUser.dob}
              onChange={(e) => setNewUser({ ...newUser, dob: e.target.value })}
              style={styles.input}
            />
          </div>
          <div style={styles.formRow}>
            <label htmlFor="doj" style={{ fontWeight: "700", marginBottom: 4, color: colors.gray700 }}>
              DOJ
            </label>
            <input
              id="doj"
              type="date"
              value={newUser.doj}
              onChange={(e) => setNewUser({ ...newUser, doj: e.target.value })}
              style={styles.input}
            />
          </div>
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
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={handleCreateUser}
          type="button"
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = styles.btnPrimaryHover.backgroundColor)
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = styles.btnPrimary.backgroundColor)
          }
        >
          ➕ Create User
        </button>
        {userCreationMsg && (
          <p
            style={
              userCreationMsg.startsWith("✅") ? styles.msgSuccess : styles.msgError
            }
            role="alert"
          >
            {userCreationMsg}
          </p>
        )}
      </section>

      {/* Show/Hide Users Toggle */}
      <button
        style={{ ...styles.toggleBtn }}
        onClick={() => setShowAllUsers((p) => !p)}
        type="button"
        aria-pressed={showAllUsers}
        onMouseOver={(e) =>
          (e.currentTarget.style.backgroundColor = styles.toggleBtnHover.backgroundColor)
        }
        onMouseOut={(e) =>
          (e.currentTarget.style.backgroundColor = colors.orange500)
        }
      >
        {showAllUsers ? "Hide Users" : "Show All Users"}
      </button>

      {/* Users List and Search */}
      {showAllUsers && (
        <>
          <input
            type="search"
            placeholder="Search by Email or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
            aria-label="Search users by email or name"
          />
          <div aria-live="polite" aria-relevant="all" style={styles.responsiveTableWrapper}>
            <h2 style={{ color: colors.blue400, fontWeight: "700", marginBottom: 18 }}>
              👥 Users List
            </h2>
            {loading ? (
              <p>Loading users...</p>
            ) : filteredUsers.length ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Location</th>
                    <th style={styles.th}>Employee ID</th>
                    <th style={styles.th}>Salary</th>
                    <th style={styles.th}>Bank A/c No</th>
                    <th style={styles.th}>DOB</th>
                    <th style={styles.th}>DOJ</th>
                    <th style={styles.th}>PAN NO</th>
                    <th style={styles.th}>IFSC Code</th>
                    <th style={styles.th}>Department</th>
                    <th style={styles.th}>Password (Reset)</th>
                    <th style={styles.th}>Actions</th>
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
                              aria-label="Edit name"
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
                              aria-label="Edit role"
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
                              aria-label="Edit location"
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
                              aria-label="Edit employee ID"
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
                              aria-label="Edit salary"
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
                              aria-label="Edit bank account"
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
                              aria-label="Edit date of birth"
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
                              aria-label="Edit date of joining"
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
                              aria-label="Edit PAN number"
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
                              aria-label="Edit IFSC code"
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
                              aria-label="Edit department"
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
                              aria-label="Edit password"
                            />
                          ) : (
                            "••••••"
                          )}
                        </td>
                        <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                          {isEditing ? (
                            <>
                              <button
                                style={{ ...styles.btn, ...styles.btnPrimary, marginBottom: 6, width: "100%" }}
                                onClick={saveUserEdits}
                                type="button"
                                aria-label={`Save changes for ${user.email}`}
                                onMouseOver={(e) =>
                                  (e.currentTarget.style.backgroundColor = styles.btnPrimaryHover.backgroundColor)
                                }
                                onMouseOut={(e) =>
                                  (e.currentTarget.style.backgroundColor = styles.btnPrimary.backgroundColor)
                                }
                              >
                                💾 Save
                              </button>
                              <button
                                style={{ ...styles.btn, ...styles.btnDanger, width: "100%" }}
                                onClick={cancelEditing}
                                type="button"
                                aria-label={`Cancel editing for ${user.email}`}
                                onMouseOver={(e) =>
                                  (e.currentTarget.style.backgroundColor = styles.btnDangerHover.backgroundColor)
                                }
                                onMouseOut={(e) =>
                                  (e.currentTarget.style.backgroundColor = "#ef4444")
                                }
                              >
                                ✖ Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              style={{ ...styles.btn, ...styles.btnSecondary, width: "100%" }}
                              onClick={() => startEditingUser(user.email, user)}
                              type="button"
                              aria-label={`Edit user ${user.email}`}
                              onMouseOver={(e) =>
                                (e.currentTarget.style.backgroundColor = styles.btnSecondaryHover.backgroundColor)
                              }
                              onMouseOut={(e) =>
                                (e.currentTarget.style.backgroundColor = styles.btnSecondary.backgroundColor)
                              }
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
      <section style={styles.section} aria-labelledby="offer-letter-heading">
        <h2 id="offer-letter-heading" style={{ color: colors.blue400, fontWeight: "700", marginBottom: 18 }}>
          📄 Upload Offer Letter
        </h2>
        <p>You can upload an offer letter for any existing user by their email.</p>
        <div style={{ ...styles.formRow, alignItems: "center" }}>
          <input
            type="email"
            placeholder="Employee Email"
            value={offerLetterEmail}
            onChange={(e) => setOfferLetterEmail(e.target.value)}
            style={{ ...styles.input, flex: 2 }}
            aria-label="Enter employee email to upload offer letter"
          />
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setOfferLetterFile(e.target.files[0])}
            style={{ ...styles.input, flex: 3 }}
            aria-label="Select offer letter file"
          />
        </div>
        {offerLetterFile && (
          <p style={{ marginTop: 8, fontWeight: "600", color: colors.gray700 }}>
            Selected file: {offerLetterFile.name}
          </p>
        )}
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, marginTop: 12 }}
          onClick={handleOfferLetterUpload}
          type="button"
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = styles.btnPrimaryHover.backgroundColor)
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = styles.btnPrimary.backgroundColor)
          }
        >
          ⬆️ Upload Letter
        </button>
        {offerLetterMsg && (
          <p
            style={
              offerLetterMsg.startsWith("✅") ? styles.msgSuccess : styles.msgError
            }
            role="alert"
          >
            {offerLetterMsg}
          </p>
        )}
      </section>
    </main>
  );
}