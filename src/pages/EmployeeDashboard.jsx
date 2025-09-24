import React, { useState, useEffect } from "react";
import axios from "axios";
import LeaveApplication from "./LeaveApplication";
import AttendanceDashboard from "./AttendanceDashboard";
import SalarySlips from "./SalarySlips";
import PayrollSlip from "./PayrollSlip";

// Dynamic baseUrl to switch between local and prod backends
const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000" // Adjust this to your local backend port if different
    : "https://backend.vjcoverseas.com";

function UserMenu({ name = "User" }) {
  const [open, setOpen] = useState(false);
  const toggleDropdown = () => setOpen((o) => !o);
  const handleLogout = async () => {
    try {
      await axios.get(`${baseUrl}/logout`, {
        withCredentials: true,
      });
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
      alert("Logout failed");
    }
  };
  const handleSwitchUser = () => {
    window.location.href = "/";
  };
  useEffect(() => {
    const onClickOutside = (e) => {
      if (!e.target.closest(".usermenu-container")) setOpen(false);
    };
    window.addEventListener("click", onClickOutside);
    return () => window.removeEventListener("click", onClickOutside);
  }, []);
  return (
    <div style={premiumStyles.userMenu.container} className="usermenu-container">
      <div onClick={toggleDropdown} style={premiumStyles.userMenu.avatar} title={name}>
        {name[0]?.toUpperCase() || "U"}
      </div>
      {open && (
        <div style={premiumStyles.userMenu.dropdown}>
          <div style={premiumStyles.userMenu.dropdownItem} onClick={handleLogout}>
            🚪 Logout
          </div>
          <div style={premiumStyles.userMenu.dropdownItem} onClick={handleSwitchUser}>
            🔄 Switch User
          </div>
        </div>
      )}
    </div>
  );
}

const EditIcon = ({ size = 40, style = {}, onClick }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "#fafafa",
      boxShadow: "0 2px 10px rgba(0,0,0,0.13)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "absolute",
      bottom: 6,
      right: 6,
      cursor: "pointer",
      ...style,
    }}
    onClick={onClick}
    title="Edit profile"
  >
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#F8D36F" />
      <path
        d="M16.25 7.75l-8.5 8.5v2.5h2.5l8.5-8.5c.33-.33.33-.87 0-1.2l-1.3-1.3a.85.85 0 0 0-1.2 0zm-10.57 10.72c-.41 0-.74-.33-.74-.74V16a.75.75 0 0 1 .22-.53l8.93-8.93a2.12 2.12 0 0 1 3 0l1.33 1.33c.41.41.41 1.09 0 1.5l-8.93 8.93a.75.75 0 0 1-.54.22h-2.27z"
        fill="#656D7B"
      />
    </svg>
  </div>
);

const InstructionButton = ({ onClick }) => (
  <div
    onClick={onClick}
    style={{
      backgroundColor: "#60a5fa", // Blue-400
      color: "white",
      padding: "8px 16px",
      borderRadius: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "0.9rem",
      userSelect: "none",
      position: "absolute",
      bottom: 20,
      boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
    }}
    title="Show instructions"
    aria-label="Show instructions"
  >
    👉 Instructions
  </div>
);

function EmployeeDashboard() {
  const [profile, setProfile] = useState(null);
  const [localProfileImage, setLocalProfileImage] = useState(null); // New state for local image
  const [toast, setToast] = useState(null);
  const [salarySlips, setSalarySlips] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editImagePreview, setEditImagePreview] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    // Load profile from backend
    axios
      .get(`${baseUrl}/me`, { withCredentials: true })
      .then((res) => {
        setProfile(res.data);
      })
      .catch((err) => {
        console.log("❌ Failed to load profile", err.response?.data || err.message);
        showToast("❌ Failed to fetch profile", "error");
      });

    // Check for locally stored profile image
    const storedImage = localStorage.getItem("userProfileImage");
    if (storedImage) {
      setLocalProfileImage(storedImage);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      axios
        .get(`${baseUrl}/my-salary-slips`, { withCredentials: true })
        .then((res) => setSalarySlips(res.data))
        .catch((err) => console.error("❌ Failed to fetch slips", err));
    }
  }, [profile]);

  // Profile edit
  const handleEditProfile = () => {
    setEditName(profile.name);
    setEditPassword("");
    setImageFile(null);
    setEditImagePreview(localProfileImage || profile?.image || "https://placehold.co/150x150?text=Profile");
    setEditMode(true);
  };
  
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditName("");
    setEditPassword("");
    setImageFile(null);
    setEditImagePreview("");
  };

  const handleProfileImageSelect = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      // Create a temporary URL for previewing the new image
      setEditImagePreview(URL.createObjectURL(file));
    } else {
      setEditImagePreview(localProfileImage || profile?.image || "https://placehold.co/150x150?text=Profile");
    }
  };

  const handleSaveProfile = async () => {
    try {
      let updatedProfile = { ...profile };
      let changes = [];
  
      if (imageFile) {
        // Read the image file and convert it to a Data URL
        const reader = new FileReader();
        reader.onloadend = async () => {
          const imageDataUrl = reader.result;
          localStorage.setItem("userProfileImage", imageDataUrl);
          setLocalProfileImage(imageDataUrl);
          changes.push("image");
  
          // Now save other changes
          await saveOtherChanges(updatedProfile, changes);
        };
        reader.readAsDataURL(imageFile);
      } else {
        // No new image selected, just save other changes
        await saveOtherChanges(updatedProfile, changes);
      }
    } catch (err) {
      showToast("❌ Failed to update profile", "error");
    }
  };

  const saveOtherChanges = async (updatedProfile, changes) => {
    // Update name
    if (editName && editName !== updatedProfile.name) {
      try {
        await axios.post(
          `${baseUrl}/update-profile-name`,
          new URLSearchParams({ name: editName }),
          { withCredentials: true }
        );
        updatedProfile.name = editName;
        changes.push("name");
      } catch (err) {
        showToast("❌ Failed to update name", "error");
      }
    }

    // Update password
    if (editPassword) {
      try {
        await axios.post(
          `${baseUrl}/update-password`,
          new URLSearchParams({ password: editPassword }),
          { withCredentials: true }
        );
        changes.push("password");
      } catch (err) {
        showToast("❌ Failed to update password", "error");
      }
    }

    setProfile(updatedProfile);
    setEditMode(false);
    showToast(
      changes.length === 0 ? "No changes made." : `✅ Updated ${changes.join(", ")} successfully`,
      "success"
    );
  };

  return (
    <div style={premiumStyles.page}>
      <UserMenu name={profile?.name || "User"} />

      {toast && (
        <div
          style={{
            ...premiumStyles.toast.base,
            ...premiumStyles.toast[toast.type],
          }}
        >
          {toast.msg}
        </div>
      )}

      <div style={premiumStyles.mainLayout}>
        <div style={premiumStyles.leftColumn}>
          <div style={premiumStyles.profileCard}>
            <div style={premiumStyles.profileImageSection}>
              <img
                src={
                  editMode
                    ? editImagePreview
                    : localProfileImage || `${baseUrl}${profile?.image}` || "https://placehold.co/150x150?text=Profile"
                }
                alt="Profile"
                style={premiumStyles.avatar}
              />
              <div style={premiumStyles.profileImageOverlay}>
                <h2 style={premiumStyles.profileName}>{profile?.name}</h2>
              </div>
            </div>

            <div style={premiumStyles.profileDetailsSection}>
              {!editMode ? (
                <>
                  <div style={premiumStyles.profileInfoGrid}>
                    <div style={premiumStyles.profileInfoItem}>
                      <strong>Employee ID:</strong> {profile?.employeeId || profile?.id}
                    </div>
                    <div style={premiumStyles.profileInfoItem}>
                      <strong>Role:</strong> {profile?.role || "N/A"}
                    </div>
                    <div style={premiumStyles.profileInfoItem}>
                      <strong>Email:</strong> {profile?.email}
                    </div>
                    <div style={premiumStyles.profileInfoItem}>
                      <strong>Location:</strong> {profile?.location || "N/A"}
                    </div>
                    {profile?.offer_letter_url && (
                      <div style={premiumStyles.profileInfoItem}>
                        <strong>Offer Letter:</strong>{" "}
                        <a
                          href={`${baseUrl}${profile.offer_letter_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#007bff" }}
                        >
                          View Document
                        </a>
                      </div>
                    )}
                  </div>
                  <InstructionButton onClick={() => setShowInstructions(true)} />
                </>
              ) : (
                <div style={{ padding: '0 30px' }}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={premiumStyles.editLabel}>
                      Name:
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={premiumStyles.imageInput}
                        placeholder="Enter new name"
                      />
                    </label>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={premiumStyles.editLabel}>
                      Password:
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        style={premiumStyles.imageInput}
                        autoComplete="new-password"
                        placeholder="Enter new password"
                      />
                    </label>
                  </div>
                  <div style={premiumStyles.imageUploadSection}>
                    <label htmlFor="edit-file-upload" style={premiumStyles.fileUploadLabel}>
                      Change Profile Photo
                      <input
                        id="edit-file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageSelect}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                    <button onClick={handleSaveProfile} style={premiumStyles.saveButton}>
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      style={{ ...premiumStyles.saveButton, backgroundColor: "#6c757d" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <EditIcon onClick={handleEditProfile} style={{ right: 20, top: 20 }} />
            </div>
          </div>
        </div>

        <div style={premiumStyles.rightColumn}>
          <div style={premiumStyles.sectionCard}>
            <AttendanceDashboard />
          </div>
          <div style={premiumStyles.sectionCard}>
            <LeaveApplication onMessage={(msg) => showToast(msg, "info")} />
          </div>
          <div style={premiumStyles.sectionCard}>
            <SalarySlips salarySlips={salarySlips} />
          </div>
          <div style={premiumStyles.sectionCard}>
            <PayrollSlip />
          </div>
        </div>
      </div>
      {showInstructions && (
        <div style={premiumStyles.instructionsOverlay}>
          <div style={premiumStyles.instructionsPopup}>
            <div style={premiumStyles.instructionsHeader}>
              <h2>📋 Attendance & Profile Instructions</h2>
              <button
                onClick={() => setShowInstructions(false)}
                aria-label="Close instructions"
                style={premiumStyles.instructionsCloseButton}
              >
                ×
              </button>
            </div>
            <div style={premiumStyles.instructionsContent}>
              <ol style={{ paddingLeft: "20px" }}>
                <li style={premiumStyles.instructionsListItem}>Update your profile photo by clicking the edit icon.</li>
                <li style={premiumStyles.instructionsListItem}>Change your displayed name and password in the profile section.</li>
                <li style={premiumStyles.instructionsListItem}>Use strong passwords with characters, numbers, and symbols.</li>
                <li style={premiumStyles.instructionsListItem}>View your offer letter document if provided by HR.</li>
                <li style={premiumStyles.instructionsListItem}>Clock in/out and log breaks using the attendance buttons.</li>
                <li style={premiumStyles.instructionsListItem}>Office hours start at <b>10:00 AM</b>; login after <b>10:15 AM</b> is late.</li>
                <li style={premiumStyles.instructionsListItem}><b>Login counts even milliseconds to so,try to keep login before 10 or else consider it as late login.</b></li>
                <li style={premiumStyles.instructionsListItem}>Grace allows <b>6 late logins per month</b>; exceeding this triggers penalties.</li>
                <li style={premiumStyles.instructionsListItem}>Late arrivals beyond grace or after 10:15 AM count as half-day or absent.</li>
                <li style={premiumStyles.instructionsListItem}>Minimum work duration for full day is <b>8 hours</b>.</li>
                <li style={premiumStyles.instructionsListItem}>Lunch time should be logged before <b>2:00 PM</b> for compliance.</li>
                <li style={premiumStyles.instructionsListItem}>Unapproved absences are classified as full-day absence.</li>
                <li style={premiumStyles.instructionsListItem}><b>User Forgots to keep logout then it is consider as absent.</b></li>
                <li style={premiumStyles.instructionsListItem}>Partial attendance in defined time slots contributes to half-day presence.</li>
                <li style={premiumStyles.instructionsListItem}>Attendance calculations subtract holidays, paid leaves, and penalties.</li>
                <li style={premiumStyles.instructionsListItem}>Use attendance action buttons per their current status; some are disabled after use.</li>
                <li style={premiumStyles.instructionsListItem}>Filter historic attendance by dates for detailed views.</li>
                <li style={premiumStyles.instructionsListItem}>Attendance logs show clock-in/out, breaks, and computed worked hours clearly.</li>
                <li style={premiumStyles.instructionsListItem}>Color-coded calendar for holidays, half-days, absences, and paid leaves.</li>
                <li style={premiumStyles.instructionsListItem}>Contact HR for help with payroll or attendance issues.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const premiumStyles = {
  page: {
    padding: "40px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    backgroundColor: "#f0f2f5", // Light theme page background
    minHeight: "100vh",
    boxSizing: "border-box",
    position: "relative",
  },
  mainLayout: {
    display: "flex",
    gap: "30px",
  },
  leftColumn: {
    flex: "0 0 400px",
    position: "relative",
  },
  rightColumn: {
    flex: "1",
    display: "flex",
    flexDirection: "column",
    gap: "30px",
  },

  userMenu: {
    container: {
      position: "fixed",
      top: 30,
      right: 40,
      zIndex: 1000,
      userSelect: "none",
    },
    avatar: {
      backgroundColor: "#4c556a",
      color: "#fff",
      width: 50,
      height: 50,
      borderRadius: "50%",
      fontSize: 22,
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      transition: "transform 0.2s ease-in-out",
    },
    dropdown: {
      position: "absolute",
      top: "calc(100% + 10px)",
      right: 0,
      background: "#fff",
      borderRadius: 10,
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      overflow: "hidden",
      minWidth: 160,
      animation: "fadeIn 0.3s ease-in-out",
      listStyle: "none",
      padding: 0,
      margin: 0,
    },
    dropdownItem: {
      padding: "12px 18px",
      cursor: "pointer",
      fontWeight: "500",
      color: "#333",
      borderBottom: "1px solid #f0f2f5",
      transition: "background-color 0.2s",
    },
  },

  profileCard: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#fff",
    padding: "0",
    borderRadius: "15px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
    position: "sticky",
    top: "40px",
    zIndex: 1,
    minHeight: 350,
    color: "#333",
    overflow: 'hidden',
  },
  profileImageSection: {
    position: 'relative',
    height: 250,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '0',
    overflow: 'hidden',
  },
  avatar: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: '20px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))',
    zIndex: 2,
    display: 'flex',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  profileDetailsSection: {
    padding: '30px',
    backgroundColor: '#fff',
    borderBottomLeftRadius: '15px',
    borderBottomRightRadius: '15px',
    textAlign: "left",
    width: "100%",
    boxSizing: 'border-box',
    position: 'relative',
    backgroundImage: `url('https://images.unsplash.com/photo-1510915228343-b91c784771e8?q=80&w=2940&auto=format&fit=crop')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#333',
    minHeight: 300,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: "2rem",
    margin: "0",
    color: "#fff",
    fontWeight: "700",
    textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
  },
  profileInfoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#4a5568",
    marginBottom: "20px",
    textAlign: "left",
    width: "100%",
    background: 'rgba(255,255,255,0.7)',
    padding: '15px',
    borderRadius: '8px',
  },
  profileInfoItem: {
    fontSize: "0.95rem",
    padding: "8px 0",
    borderBottom: "1px solid #e2e8f0",
  },
  imageUploadSection: {
    marginTop: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "100%",
  },
  imageInput: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ccc",
    backgroundColor: "#f9fafb",
    color: "#333",
    borderRadius: "8px",
    fontSize: "1rem",
    transition: "border-color 0.2s",
    marginTop: 5,
  },
  editLabel: {
    display: "block",
    fontWeight: 600,
    color: "#4a5568",
    marginBottom: "6px",
    fontSize: "15px",
  },
  fileUploadLabel: {
    padding: "10px 18px",
    backgroundColor: "#60a5fa",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "background-color 0.2s",
    textAlign: "center",
    marginTop: 2,
  },
  saveButton: {
    padding: "10px 20px",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "#3b82f6",
    color: "#fff",
    transition: "background-color 0.2s",
  },
  sectionCard: {
    backgroundColor: "#fff",
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  },

  toast: {
    base: {
      position: "fixed",
      top: 30,
      left: "50%",
      transform: "translateX(-50%)",
      padding: "15px 30px",
      borderRadius: 10,
      color: "#fff",
      fontWeight: "bold",
      zIndex: 2000,
      boxShadow: "0 6px 15px rgba(0,0,0,0.2)",
      animation: "fadeIn 0.3s ease-in-out",
    },
    info: { background: "#007bff" },
    success: { background: "#28a745" },
    error: { background: "#dc3545" },
    warning: { background: "#ffc107" },
  },

  instructionsOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3000,
    padding: 20,
  },
  instructionsPopup: {
    backgroundColor: "#fff",
    borderRadius: "15px",
    maxWidth: 700,
    maxHeight: "80vh",
    overflowY: "auto",
    padding: 0,
    boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
    position: "relative",
  },
  instructionsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 30px",
    background: "linear-gradient(45deg, #4c556a, #656d7b)",
    color: "#fff",
    borderTopLeftRadius: "15px",
    borderTopRightRadius: "15px",
  },
  instructionsCloseButton: {
    fontSize: 28,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    lineHeight: 1,
    color: "#fff",
    fontWeight: "bold",
    padding: "0 10px",
  },
  instructionsContent: {
    fontSize: 16,
    color: "#333",
    padding: "30px",
  },
  instructionsListItem: {
    marginBottom: "10px",
    padding: "5px 0",
    borderBottom: "1px dotted #ccc",
  },
};

export default EmployeeDashboard;