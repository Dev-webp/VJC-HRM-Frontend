import React, { useState, useEffect } from "react";
import axios from "axios";
import LeaveApplication from "./LeaveApplication";
import AttendanceDashboard from "./AttendanceDashboard";
import SalarySlips from "./SalarySlips";
import PayrollSlip from "./PayrollSlip";
// 👇 IMPORT THE NEW COMPONENT
import AttendanceChatLogs from "./AttendanceChatLogs"; // Assume this file is created

// Dynamic backend baseUrl logic
const baseUrl =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://backend.vjcoverseas.com";

// --- Manager Login Button Component ---
const ManagerLoginButton = () => {
    const handleManagerDashboard = () => {
        // Redirect to the manager dashboard URL
        window.location.href = "/manager-dashboard";
    };

    return (
        <div
            onClick={handleManagerDashboard}
            style={styles.managerLoginButton}
            title="Switch to Manager Dashboard"
        >
            👉 Login as Manager
        </div>
    );
};
// --- END Manager Login Button Component ---

function UserMenu({ name = "User", role = "employee" }) {
    const [open, setOpen] = useState(false);
    const toggleDropdown = () => setOpen((o) => !o);
    
    // NOTE: Removed the Manager Dashboard link from the dropdown to focus on the main dashboard button.

    const handleLogout = async () => {
        try {
            await axios.get(`${baseUrl}/logout`, { withCredentials: true });
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
        <div style={styles.userMenu.container} className="usermenu-container">
            <div onClick={toggleDropdown} style={styles.userMenu.avatar} title={name}>
                {name[0]?.toUpperCase() || "U"}
            </div>
            {open && (
                <div style={styles.userMenu.dropdown}>
                    <div style={styles.userMenu.dropdownItem} onClick={handleLogout}>
                        🚪 Logout
                    </div>
                    <div style={styles.userMenu.dropdownItem} onClick={handleSwitchUser}>
                        🔄 Switch User
                    </div>
                </div>
            )}
        </div>
    );
}

const InstructionButton = ({ onClick }) => (
    <div
        onClick={onClick}
        style={{
            backgroundColor: "#ff7b16",
            color: "white",
            fontWeight: "700",
            borderRadius: "22px",
            padding: "10px 24px",
            fontSize: "1rem",
            boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
            border: "2px solid #fff",
            display: "inline-block",
            letterSpacing: 0.8,
            cursor: "pointer",
            transition: "background 0.3s, transform 0.2s",
            textShadow: "1px 1px 4px #4442",
            userSelect: "none",
            position: 'absolute',
            bottom: 0,
            right: 40,
            zIndex: 100,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#e86a0e"; e.currentTarget.style.transform = "scale(1.03)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ff7b16"; e.currentTarget.style.transform = "scale(1)"; }}
        title="Show instructions"
        aria-label="Show instructions"
    >
        👉 Instructions
    </div>
);

// --- EmployeeDashboard START ---
function EmployeeDashboard() {
    const [profile, setProfile] = useState(null);
    const [salarySlips, setSalarySlips] = useState([]);
    const [toast, setToast] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);

    // Profile edit state
    const [editMode, setEditMode] = useState(false);
    const [editName, setEditName] = useState("");
    const [editPassword, setEditPassword] = useState("");
    const [imageFile, setImageFile] = useState(null);

    // Show instructions
    const [showInstructions, setShowInstructions] = useState(false);
    
    // 👇 NEW STATE FOR ATTENDANCE CHAT LOGS
    const [showChatLogs, setShowChatLogs] = useState(false); 

    // Images from localStorage
    const [localProfileImage, setLocalProfileImage] = useState(null);

    // Static BG image for ALL users
    const staticBgUrl =
        "/vjcoverseas.png";


    // Toast helper
    const showToast = (msg, type = "info") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Load profile
    useEffect(() => {
        axios
            .get(`${baseUrl}/me`, { withCredentials: true })
            .then((res) => setProfile(res.data))
            .catch((err) => {
                showToast("❌ Failed to fetch profile", "error");
            });

        // Local profile image
        const storedImg = localStorage.getItem("userProfileImage");
        if (storedImg) setLocalProfileImage(storedImg);

        // Clear old, complex BG styles from local storage to ensure the static one is used
        localStorage.removeItem("userBgImage");
        localStorage.removeItem("userBgSize");
        localStorage.removeItem("userBgPosition");

    }, []);

    // Salary slips
    useEffect(() => {
        if (profile) {
            axios
                .get(`${baseUrl}/my-salary-slips`, { withCredentials: true })
                .then((res) => setSalarySlips(res.data))
                .catch(() => {});
        }
    }, [profile]);

    // Profile edit triggers
    const handleEditProfile = () => {
        setEditName(profile?.name || "");
        setEditPassword("");
        setEditMode(true);
    };
    const handleCancelEdit = () => {
        setEditMode(false);
        setEditName("");
        setEditPassword("");
        setImageFile(null);
    };

    // Profile image selection
    const handleProfileImageSelect = (e) => {
        const file = e.target.files[0];
        setImageFile(file);
        if (file) setLocalProfileImage(URL.createObjectURL(file));
        else setLocalProfileImage(null); // Will default to placeholder or old image on save if file is cleared
    };

    // Save profile + images
    const handleSaveProfile = async () => {
        try {
            let updatedProfile = { ...profile };
            let changes = [];

            // Profile img
            if (imageFile) {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const imageDataUrl = reader.result;
                    localStorage.setItem("userProfileImage", imageDataUrl);
                    changes.push("image");
                    await saveOtherChanges(updatedProfile, changes);
                };
                reader.readAsDataURL(imageFile);
                return;
            }

            // If only text fields
            await saveOtherChanges(updatedProfile, changes);
        } catch {
            showToast("❌ Failed to update profile", "error");
        }
    };

    // Save name/password logic
    const saveOtherChanges = async (updatedProfile, changes) => {
        if (editName && editName !== updatedProfile.name) {
            try {
                await axios.post(
                    `${baseUrl}/update-profile-name`,
                    new URLSearchParams({ name: editName }),
                    { withCredentials: true }
                );
                updatedProfile.name = editName;
                changes.push("name");
            } catch {
                showToast("❌ Failed to update name", "error");
            }
        }
        if (editPassword) {
            try {
                await axios.post(
                    `${baseUrl}/update-password`,
                    new URLSearchParams({ password: editPassword }),
                    { withCredentials: true }
                );
                changes.push("password");
            } catch {
                showToast("❌ Failed to update password", "error");
            }
        }
        setProfile(updatedProfile);
        setEditMode(false);
        if (changes.length > 0) {
            showToast(
                `✅ Updated ${changes.join(", ")} successfully`,
                "success"
            );
        }
    };
    
    // Helper function to get the style for a detail card (including hover)
    const getDetailCardStyle = (cardName, initialBg = '#ffd9706b', accent = '#ff7f07ff') => {
        const baseStyle = {
            ...styles.detailCard,
            borderLeft: `4px solid ${accent}`,
            backgroundColor: initialBg,
        };
        const hoverStyle = {
            backgroundColor: '#f6f6ff', // Light hover background
            transform: 'translateY(-2px)', // Lift effect
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        };
        
        return hoveredCard === cardName 
            ? { ...baseStyle, ...hoverStyle }
            : baseStyle;
    };

    // --- RENDER START ---
    return (
        <div style={styles.page}>
            <UserMenu name={profile?.name || "User"} role={profile?.role || "employee"} />
            {toast && (
                <div
                    style={{
                        ...styles.toast.base,
                        ...styles.toast[toast.type],
                    }}
                >
                    {toast.msg}
                </div>
            )}

            {/* -------- Profile Background - Static BG, Width: 1400px --------- */}
            <div style={styles.profileTopContainer}>
                <div style={styles.profileTopWrap}>
                    <div
                        style={{
                            ...styles.profileBg,
                            // Use the single static URL, cover and center it
                            backgroundImage: `url('${staticBgUrl}')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        {/* Empty input now, as customization is removed */}
                    </div>
                    {/* INSTRUCTION BUTTON PLACED HERE on the BG banner's bottom right */}
                    <InstructionButton onClick={() => setShowInstructions(true)} /> 
                </div>
            </div>

            {/* -------- Profile Image and Name/Edit - Width: 1400px --------- */}
            <div style={styles.profileNameSection}>
                <div style={styles.profileNameWrap}>
                    {/* Profile image, circle */}
                    <div style={styles.profileImageOuter}>
                        <img
                            src={
                                localProfileImage || (profile?.image ? `${baseUrl}${profile?.image}` : "https://placehold.co/170x170?text=Profile")
                            }
                            alt="Profile"
                            style={styles.profileImageCircle}
                        />
                        <input
                            id="profile-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleProfileImageSelect}
                            style={{ display: "none" }}
                            disabled={!editMode}
                        />
                    </div>

                    {/* Name, Edit Icon, and NEW Manager Button */}
                    <div style={{ ...styles.nameAndEditWrap, gap: '15px' }}>
                        {!editMode ? (
                            <h2 style={styles.profileName}>{profile?.name}</h2>
                        ) : (
                            <label style={styles.editLabelName}>
                                Name:
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    style={styles.imageInput}
                                    placeholder="Enter new name"
                                />
                            </label>
                        )}
                        
                        {/* CONDITIONAL MANAGER LOGIN BUTTON */}
                        {profile?.role === 'manager' && (
                            <ManagerLoginButton />
                        )}

                        {/* Edit Button - Triggers all edits (Name, Password, Photos) */}
                        <div onClick={handleEditProfile} style={styles.profileEditPencil} title="Edit Profile Details">
                            {editMode ? "Viewing Edit Mode" : "✏️ Edit Profile"}
                        </div>
                    </div>
                </div>
            </div>

            {/* -------- Details Row - Width: 1400px --------- */}
            <div style={styles.detailsSection}>
                {!editMode ? (
                    <>
                        <div style={styles.detailsGridHorizontal}>
                            <div 
                                style={getDetailCardStyle('employeeId')}
                                onMouseEnter={() => setHoveredCard('employeeId')}
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                <div style={styles.detailCardLabel}>Employee ID</div>
                                <div style={styles.detailCardValue}>{profile?.employeeId || profile?.id}</div>
                            </div>
                            <div 
                                style={getDetailCardStyle('role')}
                                onMouseEnter={() => setHoveredCard('role')}
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                <div style={styles.detailCardLabel}>Role</div>
                                <div style={styles.detailCardValue}>{profile?.role || "N/A"}</div>
                            </div>
                            <div 
                                style={getDetailCardStyle('email')}
                                onMouseEnter={() => setHoveredCard('email')}
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                <div style={styles.detailCardLabel}>Email</div>
                                <div style={styles.detailCardValue}>{profile?.email}</div>
                            </div>
                            <div 
                                style={getDetailCardStyle('location')}
                                onMouseEnter={() => setHoveredCard('location')}
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                <div style={styles.detailCardLabel}>Location</div>
                                <div style={styles.detailCardValue}>{profile?.location || "N/A"}</div>
                            </div>
                            {profile?.offer_letter_url && (
                                <div 
                                    style={getDetailCardStyle('offerLetter', '#e9f7ef', '#28a745')}
                                    onMouseEnter={() => setHoveredCard('offerLetter')}
                                    onMouseLeave={() => setHoveredCard(null)}
                                >
                                    <div style={styles.detailCardLabel}>Offer Letter</div>
                                    <a
                                        href={`${baseUrl}${profile.offer_letter_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={styles.detailCardLink}
                                    >
                                        📄 View Document
                                    </a>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={styles.editForm}>
                        <label style={styles.editLabel}>
                            Password:
                            <input
                                type="password"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                style={styles.imageInput}
                                autoComplete="new-password"
                                placeholder="Enter new password (leave blank to keep current)"
                            />
                        </label>
                        <div style={styles.editButtonRow}>
                            <label style={styles.fileUploadLabel} htmlFor="profile-upload">Change Profile Photo</label>
                            {/* Static BG, so only profile photo can be changed in edit mode now */}
                            <button onClick={handleSaveProfile} style={styles.saveButton}>Save Changes</button>
                            <button
                                onClick={handleCancelEdit}
                                style={{ ...styles.saveButton, backgroundColor: "#6c757d" }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ----- Rest of dashboard (Attendance, Leave, Slips) - Width: 1400px ------ */}
            <div style={styles.mainLayout}>
                {/* 👇 CONDITIONAL CHAT LOGS SECTION */}
                {profile?.role === 'front-desk' && (
                    <div style={styles.sectionCard}>
                         <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '15px'}}>
                            <button 
                                onClick={() => setShowChatLogs(o => !o)}
                                style={{
                                    ...styles.chatLogButton, // A new style is recommended here
                                    backgroundColor: showChatLogs ? '#dc3545' : '#8e44ad',
                                    color: 'white',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    border: 'none',
                                    transition: 'background-color 0.2s',
                                }}
                            >
                                {showChatLogs ? '❌ Hide Chat Logs' : '💬 View Attendance Chat Logs'}
                            </button>
                        </div>
                        {showChatLogs && <AttendanceChatLogs />}
                    </div>
                )}
                {/* 👆 END CONDITIONAL CHAT LOGS SECTION */}

                <div style={styles.sectionCard}>
                    <AttendanceDashboard />
                </div>
                              <div style={styles.sectionCard}>
                    <LeaveApplication onMessage={(msg) => showToast(msg, "info")} />
                </div>
                <div style={styles.sectionCard}>
                    <SalarySlips salarySlips={salarySlips} />
                </div>
                <div style={styles.sectionCard}>
                    <PayrollSlip />
                </div>
            </div>
            {/* ----- Instructions popup ----- */}
            {showInstructions && (
                <div style={styles.instructionsOverlay}>
                    <div style={styles.instructionsPopup}>
                        <div style={styles.instructionsHeader}>
                            <h2>📋 Attendance & Profile Instructions</h2>
                            <button
                                onClick={() => setShowInstructions(false)}
                                aria-label="Close instructions"
                                style={styles.instructionsCloseButton}
                            >
                                ×
                            </button>
                        </div>
                        <div style={styles.instructionsContent}>
                            <ol style={{ paddingLeft: "20px" }}>
                                <li style={styles.instructionsListItem}>The background image is now **standard for all users** and cannot be changed.</li>
                                <li style={styles.instructionsListItem}>To **change your profile photo, name, or password**, click the **Edit Profile** button.</li>
                                <li style={styles.instructionsListItem}>Password must be strong: use letters, numbers, and symbols.</li>
                                <li style={styles.instructionsListItem}>Offer letter, if provided, is downloadable below your details.</li>
                                <li style={styles.instructionsListItem}>Clock in/out and log **breaks** via dashboard attendance actions.</li>
                                <li style={styles.instructionsListItem}>Office hours start at **10:00 AM**. After **10:15 AM** is late.</li>
                                <li style={styles.instructionsListItem}>**Login counts milliseconds – always login before 10!**</li>
                                <li style={styles.instructionsListItem}>**Grace:** 6 late logins/month before penalties.</li>
                                <li style={styles.instructionsListItem}>Late arrivals or after 10:15: half-day or absent.</li>
                                <li style={styles.instructionsListItem}>Minimum work for full day is **8 hours**.</li>
                                <li style={styles.instructionsListItem}>*User has no log on saturday or monday then Sunday is also marked as Absent /and make your logs on Saturday logout:7:00pm and on Monday Login before 10:15am if not these two marked as Absent on Sunday**.</li>
                                <li style={styles.instructionsListItem}>Unapproved leave = Full-day absence.</li>
                                <li style={styles.instructionsListItem}>**If you forget to logout, marked absent.**</li>
                                <li style={styles.instructionsListItem}>Partial attendance in slots = half-day.</li>
                                <li style={styles.instructionsListItem}>Attendance excludes holidays, paid leaves, penalties.</li>
                                <li style={styles.instructionsListItem}>Each attendance action shows only if allowed.</li>
                                <li style={styles.instructionsListItem}>Filter history by date for records.</li>
                                <li style={styles.instructionsListItem}>To calculate paid leave/in the leave request we have an option of earned leave there you use your paid-leaves if not system will not calculate it automatically.</li>
                                <li style={styles.instructionsListItem}>**Contact Developer (nuthan-full-stack-dev)** for issues or payroll help.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Styling (Adding a new style for the Manager Button)
const styles = {
    // New Content Width for all main sections
    CONTENT_MAX_WIDTH: 1400,

    page: {
        padding: "40px 0 0 0",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        backgroundColor: "#f0f2f5",
        minHeight: "100vh",
        boxSizing: "border-box",
        position: "relative",
    },
    userMenu: {
        container: {
            position: "fixed",
            top: 30,
            right: 40,
            zIndex: 2000,
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

    // NEW STYLE FOR MANAGER LOGIN BUTTON
    managerLoginButton: {
        padding: '10px 20px',
        backgroundColor: '#2c6be0', // Blue color for a strong CTA
        color: '#fff',
        borderRadius: '25px',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'background-color 0.2s, transform 0.2s',
        fontSize: '1.05rem',
        whiteSpace: 'nowrap',
        minWidth: '180px',
        textAlign: 'center',
        // Hover effect for manager button
        ':hover': {
            backgroundColor: '#1e54a3',
            transform: 'scale(1.02)'
        }
    },

    // --------------------------------------------------------
    // ** PROFILE STYLES - Width 1400px **
    // --------------------------------------------------------
    profileTopContainer: {
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
    },
    profileTopWrap: {
        maxWidth: 1400,
        width: '100%',
        position: 'relative',
        boxSizing: 'border-box',
    },
    profileBg: {
        width: "100%",
        height: 250,
        borderRadius: "0 0 34px 34px",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        zIndex: 1,
        boxShadow: "0 4px 28px rgba(12,42,63,0.13)",
    },

    // Section 2: Image, Name, and Edit
    profileNameSection: {
        maxWidth: 1400,
        margin: '0 auto',
        position: 'relative',
        zIndex: 10,
        marginBottom: 20,
    },
    profileNameWrap: {
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        minHeight: 100,
        padding: '0 56px',
    },
    profileImageOuter: {
        width: 175,
        height: 175,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 2px 18px rgba(18,40,80,0.35)",
        zIndex: 15,
        overflow: "visible",
        position: 'absolute',
        top: -100,
        left: 56,
    },
    profileImageCircle: {
        width: 170,
        height: 170,
        borderRadius: "50%",
        objectFit: "cover",
        border: "5px solid #fff",
        background: "#efeffe",
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 1,
    },

    nameAndEditWrap: {
        marginLeft: 230,
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        height: 60,
    },
    profileName: {
        fontSize: "2.8rem",
        margin: "0",
        color: "#212d37",
        fontWeight: "800",
    },
    profileEditPencil: {
        padding: '10px 20px',
        backgroundColor: '#f8d36f',
        borderRadius: '25px',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        transition: 'background-color 0.2s',
        color: '#333',
        fontSize: '1.05rem',
        whiteSpace: 'nowrap',
    },

    // Section 3: Details Row (CLEAN)
    detailsSection: {
        maxWidth: 1400,
        margin: '0 auto 30px auto',
        padding: '25px 56px',
        backgroundColor: 'transparent',
        borderRadius: 15,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
    },

    // Details Grid
    detailsGridHorizontal: {
        display: "flex",
        flexWrap: "wrap",
        justifyContent: 'flex-start',
        gap: "20px",
        width: "100%",
    },
    // DETAIL CARD (Updated for hover via getDetailCardStyle)
    detailCard: {
        flex: '1 1 auto',
        minWidth: '220px',
        maxWidth: '300px',
        padding: '18px',
        borderRadius: '8px',
        boxShadow: '0 1px 5px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#333',
        transition: 'background-color 0.2s, transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
    },
    detailCardLabel: {
        fontSize: '0.9rem',
        fontWeight: '500',
        color: '#6c757d',
        marginBottom: '5px',
    },
    detailCardValue: {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#212d37',
        wordBreak: 'break-all',
    },
    detailCardLink: {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#28a745',
        textDecoration: 'none',
        transition: 'color 0.2s',
    },

    // Edit Mode Styles
    editForm: {
        width: '100%',
        paddingTop: 10,
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    },
    editLabel: {
        display: "block",
        fontWeight: 600,
        color: "#4a5568",
        marginBottom: "10px",
        fontSize: "15px",
        width: '100%',
    },
    editLabelName: {
        display: "block",
        fontWeight: 600,
        color: "#4a5568",
        fontSize: "15px",
        width: '80%',
    },
    editButtonRow: {
        marginTop: 16,
        display: "flex",
        gap: 12,
        flexWrap: 'wrap'
    },
    fileUploadLabel: {
        display: "block",
        marginTop: 7,
        fontWeight: "600",
        color: "#2c374c",
        padding: "9px 18px",
        backgroundColor: "#cdb4f6",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "background-color 0.2s",
        textAlign: "center",
        flex: '1 1 auto',
        minWidth: '150px'
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
        marginBottom: 12,
    },
    saveButton: {
        padding: "10px 22px",
        fontWeight: "600",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        backgroundColor: "#3b82f6",
        color: "#fff",
        transition: "background-color 0.22s",
        fontSize: "1.1rem",
    },
    // --------------------------------------------------------
    // ** MAIN LAYOUT AND MODAL STYLES **
    // --------------------------------------------------------
    mainLayout: {
        maxWidth: 1400,
        margin: "0px auto",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        zIndex: 4
    },
    sectionCard: {
        backgroundColor: "#fff",
        padding: "25px",
        borderRadius: "15px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        marginBottom: "10px"
    },

    // Toast/Instructions (unchanged)
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
            zIndex: 2800,
            boxShadow: "0 6px 15px rgba(0,0,0,0.2)",
            animation: "fadeIn 0.3s ease-in-out",
            background: "#444"
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
        backgroundColor: "rgba(19,13,13,0.66)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 3500,
        padding: 22,
    },
    instructionsPopup: {
        backgroundColor: "#fff",
        borderRadius: "16px",
        maxWidth: 710,
        maxHeight: "84vh",
        overflowY: "auto",
        padding: 0,
        boxShadow: "0 12px 34px rgba(8,8,16,0.23)",
        position: "relative",
    },
    instructionsHeader: {
        padding: '20px 30px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    instructionsCloseButton: {
        background: 'none',
        border: 'none',
        fontSize: '2rem',
        cursor: 'pointer',
        color: '#666',
    },
    instructionsContent: {
        padding: '10px 30px 30px 30px',
        fontSize: '1rem',
        lineHeight: 1.6,
        color: '#444',
    },
    instructionsListItem: {
        marginBottom: '8px',
    }
};

export default EmployeeDashboard;