/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import LeaveApplication from "./LeaveApplication";
import AttendanceDashboard from "./AttendanceDashboard";
import SalarySlips from "./SalarySlips";
import PayrollSlip from "./PayrollSlip";
import AttendanceChatLogs from "./AttendanceChatLogs";
import SalesStats from "./SalesStats";
import AttendanceAnalytics from './Attendanceanalytics.jsx';
import Fulldata from "./Fulldata.jsx";
const baseUrl =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://backend.vjcoverseas.com";

// --- Manager Login Button Component ---
const ManagerLoginButton = () => {
    const handleManagerDashboard = () => {
        window.location.href = "/manager-dashboard";
    };

    return (
        <button
            onClick={handleManagerDashboard}
            style={styles.managerLoginButton}
            title="Switch to Manager Dashboard"
        >
            👔 Manager Dashboard
        </button>
    );
};

// --- User Menu Component ---
function UserMenu({ name = "User", role = "employee" }) {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const toggleDropdown = () => setOpen((o) => !o);

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
                    <div style={styles.userMenu.header}>
                        <div style={styles.userMenu.name}>{name}</div>
                        <div style={styles.userMenu.role}>{role}</div>
                    </div>
                    <div style={styles.userMenu.divider}></div>
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

// --- Instructions Button ---
const InstructionButton = ({ onClick }) => (
    <button
        onClick={onClick}
        style={styles.instructionButton}
        title="Show instructions"
    >
        📋 Instructions
    </button>
);

// --- Main Employee Dashboard ---
function EmployeeDashboard() {
    const { employeeName } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [salarySlips, setSalarySlips] = useState([]);
    const [toast, setToast] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const [editMode, setEditMode] = useState(false);
    const [editName, setEditName] = useState("");
    const [editPassword, setEditPassword] = useState("");
    const [imageFile, setImageFile] = useState(null);

    const [showInstructions, setShowInstructions] = useState(false);
    const [localProfileImage, setLocalProfileImage] = useState(null);
    
    // Sales stats availability
    const [hasSalesTarget, setHasSalesTarget] = useState(false);
    const [checkingSalesTarget, setCheckingSalesTarget] = useState(true);
    
    // Change password modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const showToast = (msg, type = "info") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Load profile
    useEffect(() => {
        axios
            .get(`${baseUrl}/me`, { withCredentials: true })
            .then((res) => {
                setProfile(res.data);
                if (!employeeName && res.data.name) {
                    const urlName = res.data.name.toLowerCase().replace(/\s+/g, '-');
                    navigate(`/employee/${urlName}`, { replace: true });
                }
            })
            .catch(() => {
                showToast("❌ Failed to fetch profile", "error");
            });

        const storedImg = localStorage.getItem("userProfileImage");
        if (storedImg) setLocalProfileImage(storedImg);
    }, [employeeName, navigate]);

    // Check if employee has sales target assigned
    useEffect(() => {
        if (profile?.email) {
            axios
                .get(`${baseUrl}/sales-stats/${profile.email}`, { withCredentials: true })
                .then((res) => {
                    const target = parseFloat(res.data.target || 0);
                    setHasSalesTarget(target > 0);
                })
                .catch(() => {
                    setHasSalesTarget(false);
                })
                .finally(() => {
                    setCheckingSalesTarget(false);
                });
        }
    }, [profile]);

    // Salary slips
    useEffect(() => {
        if (profile) {
            axios
                .get(`${baseUrl}/my-salary-slips`, { withCredentials: true })
                .then((res) => setSalarySlips(res.data))
                .catch(() => {});
        }
    }, [profile]);

    // Profile editing
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
    const handleProfileImageSelect = (e) => {
        const file = e.target.files[0];
        setImageFile(file);
        if (file) setLocalProfileImage(URL.createObjectURL(file));
        else setLocalProfileImage(null);
    };

    const handleSaveProfile = async () => {
        try {
            let updatedProfile = { ...profile };
            let changes = [];

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

            await saveOtherChanges(updatedProfile, changes);
        } catch {
            showToast("❌ Failed to update profile", "error");
        }
    };

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
                const urlName = editName.toLowerCase().replace(/\s+/g, '-');
                navigate(`/employee/${urlName}`, { replace: true });
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
            showToast(`✅ Updated ${changes.join(", ")} successfully`, "success");
        }
    };
    
    // Handle password change from modal
    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            showToast("❌ Please fill both password fields", "error");
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast("❌ Passwords do not match", "error");
            return;
        }
        
        if (newPassword.length < 6) {
            showToast("❌ Password must be at least 6 characters", "error");
            return;
        }
        
        try {
            await axios.post(
                `${baseUrl}/update-password`,
                new URLSearchParams({ password: newPassword }),
                { withCredentials: true }
            );
            showToast("✅ Password updated successfully", "success");
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch {
            showToast("❌ Failed to update password", "error");
        }
    };

    // Determine if MIS Executive role (for attendance chat logs)
    const isMISExecutive = profile?.role?.toLowerCase().includes('mis-execuitve') || 
                          profile?.role?.toLowerCase() === 'mis-execuitve';

    return (
        <div style={styles.page}>
            <UserMenu name={profile?.name || "User"} role={profile?.role || "employee"} />
            
            {toast && (
                <div style={{ ...styles.toast.base, ...styles.toast[toast.type] }}>
                    {toast.msg}
                </div>
            )}

            {/* Top Navigation */}
            <div style={styles.topNav}>
                <div style={styles.navContent}>
                    <div style={styles.logo}>
                        <img src="/logo512.png" alt="Logo" style={styles.logoImg} />
                        <span style={styles.logoText}>VJC Overseas HRM</span>
                    </div>
                    <div style={styles.navRight}>
                        {profile?.role === 'manager' && <ManagerLoginButton />}
                        <InstructionButton onClick={() => setShowInstructions(true)} />
                    </div>
                </div>
            </div>

            {/* Profile Header */}
            <div style={styles.profileHeader}>
                <div style={styles.profileHeaderContent}>
                    <div style={styles.profileLeft}>
                        <div style={styles.profileImageContainer}>
                            <img
                                src={
                                    localProfileImage || 
                                    (profile?.image ? `${baseUrl}${profile?.image}` : "https://placehold.co/120x120?text=Profile")
                                }
                                alt="Profile"
                                style={styles.profileImage}
                            />
                            {editMode && (
                                <label style={styles.imageUploadLabel} htmlFor="profile-upload">
                                    📷
                                </label>
                            )}
                            <input
                                id="profile-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleProfileImageSelect}
                                style={{ display: "none" }}
                                disabled={!editMode}
                            />
                        </div>
                        <div style={styles.profileInfo}>
                            {!editMode ? (
                                <>
                                    <h1 style={styles.profileName}>{profile?.name}</h1>
                                    <div style={styles.profileMeta}>
                                        <span style={styles.profileRole}>{profile?.role || "Employee"}</span>
                                        <span style={styles.profileDivider}>•</span>
                                        <span style={styles.profileDept}>{profile?.department || "N/A"}</span>
                                        <span style={styles.profileDivider}>•</span>
                                        <span style={styles.profileId}>ID: {profile?.employeeId || profile?.id}</span>
                                    </div>
                                </>
                            ) : (
                                <div style={styles.editNameContainer}>
                                    <label style={styles.editLabel}>Name:</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        style={styles.editInput}
                                        placeholder="Enter new name"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={styles.profileRight}>
                        {!editMode ? (
                            <>
                                <button onClick={handleEditProfile} style={styles.editButton}>
                                    ✏️ Edit Profile
                                </button>
                                <button onClick={() => setShowPasswordModal(true)} style={styles.passwordButton}>
                                    🔐 Change Password
                                </button>
                            </>
                        ) : (
                            <div style={styles.editButtons}>
                                <button onClick={handleSaveProfile} style={styles.saveButton}>
                                    💾 Save
                                </button>
                                <button onClick={handleCancelEdit} style={styles.cancelButton}>
                                    ❌ Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.container}>
                <div style={styles.quickInfoGrid}>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}>📧</div>
                        <div style={styles.infoContent}>
                            <div style={styles.infoLabel}>Email</div>
                            <div style={styles.infoValue}>{profile?.email}</div>
                        </div>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}>📍</div>
                        <div style={styles.infoContent}>
                            <div style={styles.infoLabel}>Location</div>
                            <div style={styles.infoValue}>{profile?.location || "N/A"}</div>
                        </div>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}>💼</div>
                        <div style={styles.infoContent}>
                            <div style={styles.infoLabel}>Department</div>
                            <div style={styles.infoValue}>{profile?.department || "N/A"}</div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div style={styles.tabContainer}>
                    <div style={styles.tabNav}>
                        <button onClick={() => setActiveTab('overview')} style={{ ...styles.tabButton, ...(activeTab === 'overview' ? styles.tabButtonActive : {}) }}>
                            📊 Overview
                        </button>
                        <button onClick={() => setActiveTab('attendance')} style={{ ...styles.tabButton, ...(activeTab === 'attendance' ? styles.tabButtonActive : {}) }}>
                            🕒 Attendance
                        </button>
                        <button onClick={() => setActiveTab('leave')} style={{ ...styles.tabButton, ...(activeTab === 'leave' ? styles.tabButtonActive : {}) }}>
                            📅 Leave
                        </button>
                        <button onClick={() => setActiveTab('salary')} style={{ ...styles.tabButton, ...(activeTab === 'salary' ? styles.tabButtonActive : {}) }}>
                            💰 Salary
                        </button>
                        {hasSalesTarget && !checkingSalesTarget && (
                            <button onClick={() => setActiveTab('sales')} style={{ ...styles.tabButton, ...(activeTab === 'sales' ? styles.tabButtonActive : {}) }}>
                                📈 Sales Stats
                            </button>
                        )}
                        {isMISExecutive && (
                            <button onClick={() => setActiveTab('chatlogs')} style={{ ...styles.tabButton, ...(activeTab === 'chatlogs' ? styles.tabButtonActive : {}) }}>
                                💬 Chat Logs
                            </button>
                        )}
                          {isMISExecutive && (
                            <button onClick={() => setActiveTab('fulldata')} style={{ ...styles.tabButton, ...(activeTab === 'fulldata' ? styles.tabButtonActive : {}) }}>
                                📊 Full Data
                            </button>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div style={styles.tabContent}>
                        {activeTab === 'overview' && (
                            <div style={styles.overviewSection}>
                                <div style={styles.welcomeCard}>
                                    <h2 style={styles.welcomeTitle}>Welcome back, {profile?.name}! 👋</h2>
                                    <p style={styles.welcomeText}>Here's your quick overview</p>
                                </div>
                                
                                <div style={styles.statsGrid}>
                                    <div style={styles.statCard}>
                                        <div style={styles.statIcon}>🆔</div>
                                        <div style={styles.statContent}>
                                            <div style={styles.statLabel}>Employee ID</div>
                                            <div style={styles.statValue}>{profile?.employeeId || profile?.id}</div>
                                        </div>
                                    </div>
                                    <div style={styles.statCard}>
                                        <div style={styles.statIcon}>👔</div>
                                        <div style={styles.statContent}>
                                            <div style={styles.statLabel}>Role</div>
                                            <div style={styles.statValue}>{profile?.role}</div>
                                        </div>
                                    </div>
                                    <div style={styles.statCard}>
                                        <div style={styles.statIcon}>🏢</div>
                                        <div style={styles.statContent}>
                                            <div style={styles.statLabel}>Department</div>
                                            <div style={styles.statValue}>{profile?.department || "N/A"}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Attendance Analytics Section */}
                                <div style={styles.sectionCard}>
                                   
                                    <AttendanceAnalytics />
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'attendance' && (
                            <div style={styles.sectionCard}><AttendanceDashboard /></div>
                        )}
                        {activeTab === 'leave' && (
                            <div style={styles.sectionCard}>
                                <LeaveApplication onMessage={(msg) => showToast(msg, "info")} />
                            </div>
                        )}
                        {activeTab === 'salary' && (
                            <>
                                <div style={styles.sectionCard}><SalarySlips salarySlips={salarySlips} /></div>
                                <div style={styles.sectionCard}><PayrollSlip /></div>
                            </>
                        )}
                        {activeTab === 'sales' && hasSalesTarget && (
                            <div style={styles.sectionCard}>
                                <SalesStats 
                                    employeeEmail={profile?.email} 
                                    isChairman={false}
                                />
                            </div>
                        )}
                        {activeTab === 'chatlogs' && isMISExecutive && (
                            <div style={styles.sectionCard}>
                                <AttendanceChatLogs />
                            </div>
                        )}
                         {activeTab === 'fulldata' && isMISExecutive && (
                            <div style={styles.sectionCard}>
                                <Fulldata />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Instructions Modal */}
            {showInstructions && (
                <div style={styles.modal} onClick={() => setShowInstructions(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>📋 Dashboard Instructions</h3>
                            <button onClick={() => setShowInstructions(false)} style={styles.modalClose}>
                                ×
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.instructionSection}>
                                <h4 style={styles.instructionTitle}>🎯 Overview Tab</h4>
                                <p style={styles.instructionText}>
                                    View your quick profile summary including your employee ID, role, department, and attendance analytics at a glance.
                                </p>
                            </div>
                            
                            <div style={styles.instructionSection}>
                                <h4 style={styles.instructionTitle}>🕒 Attendance Tab</h4>
                                <p style={styles.instructionText}>
                                    Mark your daily attendance, view attendance history, and track your work hours. Office hours start at 10:00 AM. After 10:15 AM is late. Login counts milliseconds – always login before 10!
                                </p>
                            </div>
                            
                            <div style={styles.instructionSection}>
                                <h4 style={styles.instructionTitle}>📅 Leave Tab</h4>
                                <p style={styles.instructionText}>
                                    Apply for leave, view pending requests, and check your leave history. Use earned leave option for paid leaves. Unapproved leave = Full-day absence.
                                </p>
                            </div>
                            
                            <div style={styles.instructionSection}>
                                <h4 style={styles.instructionTitle}>💰 Salary Tab</h4>
                                <p style={styles.instructionText}>
                                    View your salary slips, download payroll documents, and track payment history.
                                </p>
                            </div>
                            
                            {hasSalesTarget && (
                                <div style={styles.instructionSection}>
                                    <h4 style={styles.instructionTitle}>📈 Sales Stats Tab</h4>
                                    <p style={styles.instructionText}>
                                        Track your sales performance, add new sales entries, view targets, and monitor your achievement percentage. This tab is only visible if your manager has assigned you a sales target.
                                    </p>
                                </div>
                            )}
                            
                            {isMISExecutive && (
                                <div style={styles.instructionSection}>
                                    <h4 style={styles.instructionTitle}>💬 Chat Logs Tab</h4>
                                    <p style={styles.instructionText}>
                                        Access attendance-related chat logs and communications. This feature is available for MIS Executive role.
                                    </p>
                                </div>
                            )}
                            
                            <div style={styles.instructionSection}>
                                <h4 style={styles.instructionTitle}>⚠️ Important Rules</h4>
                                <ul style={styles.instructionList}>
                                    <li>Grace: 6 late logins/month before penalties</li>
                                    <li>Minimum work for full day is 8 hours</li>
                                    <li>If you forget to logout, marked absent</li>
                                    <li>Partial attendance in slots = half-day</li>
                                    <li>Contact Developer (nuthan-full-stack-dev) for issues</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Change Password Modal */}
            {showPasswordModal && (
                <div style={styles.modal} onClick={() => setShowPasswordModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>🔐 Change Password</h3>
                            <button onClick={() => setShowPasswordModal(false)} style={styles.modalClose}>
                                ×
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.modalLabel}>New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={styles.modalInput}
                                    placeholder="Enter new password"
                                    autoComplete="new-password"
                                />
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label style={styles.modalLabel}>Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={styles.modalInput}
                                    placeholder="Confirm new password"
                                    autoComplete="new-password"
                                />
                            </div>
                            
                            <div style={styles.modalActions}>
                                <button onClick={handleChangePassword} style={styles.modalSaveButton}>
                                    💾 Update Password
                                </button>
                                <button onClick={() => {
                                    setShowPasswordModal(false);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }} style={styles.modalCancelButton}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Comprehensive Professional Styles
const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f0f4f8',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    
    topNav: {
        backgroundColor: '#fff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
    },
    navContent: {
        maxWidth: 1400,
        margin: '0 auto',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    logoImg: {
        width: 40,
        height: 40,
        borderRadius: '8px',
    },
    logoText: {
        fontSize: '1.3rem',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    navRight: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
    },
    
    userMenu: {
        container: {
            position: 'fixed',
            top: 20,
            right: 32,
            zIndex: 2000,
        },
        avatar: {
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
        },
        dropdown: {
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            backgroundColor: '#fff',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: 220,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
        },
        header: {
            padding: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
        },
        name: {
            fontWeight: '700',
            fontSize: '1rem',
        },
        role: {
            fontSize: '0.85rem',
            opacity: 0.9,
            marginTop: '4px',
        },
        divider: {
            height: 1,
            backgroundColor: '#e2e8f0',
        },
        dropdownItem: {
            padding: '14px 20px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            color: '#334155',
            fontSize: '0.95rem',
            fontWeight: '500',
        },
    },
    
    profileHeader: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        padding: '48px 0',
    },
    profileHeaderContent: {
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px',
    },
    profileLeft: {
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
    },
    profileImageContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '5px solid rgba(255,255,255,0.3)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    },
    imageUploadLabel: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderRadius: '50%',
        backgroundColor: '#fff',
        color: '#667eea',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1.3rem',
        border: '3px solid #667eea',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    profileInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    profileName: {
        fontSize: '2.2rem',
        fontWeight: '800',
        margin: 0,
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    profileMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '1rem',
        opacity: 0.95,
    },
    profileRole: {
        fontWeight: '600',
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: '4px 12px',
        borderRadius: '20px',
    },
    profileDept: {
        fontWeight: '500',
    },
    profileDivider: {
        opacity: 0.5,
    },
    profileId: {
        fontWeight: '500',
        fontFamily: 'monospace',
    },
    profileRight: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
    },
    
    editButton: {
        padding: '12px 24px',
        backgroundColor: '#fff',
        color: '#667eea',
        border: 'none',
        borderRadius: '12px',
        fontSize: '0.95rem',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    passwordButton: {
        padding: '12px 24px',
        backgroundColor: '#fff',
        color: '#10b981',
        border: 'none',
        borderRadius: '12px',
        fontSize: '0.95rem',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    saveButton: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '0.95rem',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    },
    cancelButton: {
        padding: '12px 24px',
        backgroundColor: '#64748b',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '0.95rem',
        fontWeight: '700',
        cursor: 'pointer',
    },
    managerLoginButton: {
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontSize: '0.95rem',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
    },
    instructionButton: {
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontSize: '0.95rem',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
    },
    editButtons: {
        display: 'flex',
        gap: '12px',
    },
    
    container: {
        maxWidth: 1400,
        margin: '0 auto',
        padding: '32px',
    },
    
    quickInfoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid #e2e8f0',
    },
    infoIcon: {
        fontSize: '2.5rem',
        width: 64,
        height: 64,
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: '0.85rem',
        color: '#64748b',
        fontWeight: '600',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    infoValue: {
        fontSize: '1.15rem',
        fontWeight: '700',
        color: '#1e293b',
        wordBreak: 'break-word',
    },
    
    editNameContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    editLabel: {
        fontSize: '0.95rem',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '10px',
        display: 'block',
    },
    editInput: {
        width: '100%',
        padding: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '1rem',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxSizing: 'border-box',
    },
    
    tabContainer: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
    },
    tabNav: {
        display: 'flex',
        borderBottom: '2px solid #f1f5f9',
        overflowX: 'auto',
        backgroundColor: '#f8fafc',
    },
    tabButton: {
        padding: '18px 28px',
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '0.95rem',
        fontWeight: '700',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'color 0.2s, background-color 0.2s, border-color 0.2s',
        borderBottom: '3px solid transparent',
        whiteSpace: 'nowrap',
    },
    tabButtonActive: {
        color: '#667eea',
        borderBottomColor: '#667eea',
        backgroundColor: '#fff',
    },
    tabContent: {
        padding: '32px',
        minHeight: '400px',
    },
    
    overviewSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    welcomeCard: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        color: '#fff',
        textAlign: 'center',
    },
    welcomeTitle: {
        fontSize: '2rem',
        fontWeight: '800',
        margin: 0,
        marginBottom: '8px',
    },
    welcomeText: {
        fontSize: '1.1rem',
        opacity: 0.9,
        margin: 0,
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
    },
    statCard: {
        backgroundColor: '#f8fafc',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        border: '2px solid #e2e8f0',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    statIcon: {
        fontSize: '2.5rem',
        width: 64,
        height: 64,
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statContent: {
        flex: 1,
    },
    statLabel: {
        fontSize: '0.85rem',
        color: '#64748b',
        fontWeight: '600',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    statValue: {
        fontSize: '1.3rem',
        fontWeight: '800',
        color: '#1e293b',
    },
    
    
   
    
    toast: {
        base: {
            position: 'fixed',
            top: 90,
            right: 32,
            padding: '18px 28px',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: '700',
            zIndex: 3000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            maxWidth: 400,
        },
        info: { 
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        },
        success: { 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        },
        error: { 
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        },
        warning: { 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        },
    },
    
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4000,
        padding: '20px',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: '20px',
        maxWidth: 700,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    },
    modalHeader: {
        padding: '28px 32px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '20px 20px 0 0',
    },
    modalTitle: {
        fontSize: '1.6rem',
        fontWeight: '800',
        margin: 0,
    },
    modalClose: {
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        fontSize: '2rem',
        color: '#fff',
        cursor: 'pointer',
        padding: '0',
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '300',
        transition: 'background 0.2s',
    },
    modalBody: {
        padding: '32px',
    },
    instructionSection: {
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '2px solid #f1f5f9',
    },
    instructionTitle: {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 0,
        marginBottom: '12px',
    },
    instructionText: {
        fontSize: '1rem',
        color: '#64748b',
        lineHeight: '1.6',
        margin: 0,
    },
    instructionList: {
        margin: '10px 0',
        paddingLeft: '20px',
        color: '#64748b',
        lineHeight: '1.8',
    },
    formGroup: {
        marginBottom: '20px',
    },
    modalLabel: {
        display: 'block',
        fontSize: '0.95rem',
        fontWeight: '700',
        color: '#334155',
        marginBottom: '10px',
    },
    modalInput: {
        width: '100%',
        padding: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '1rem',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxSizing: 'border-box',
    },
    modalActions: {
        display: 'flex',
        gap: '12px',
        marginTop: '28px',
    },
    modalSaveButton: {
        flex: 1,
        padding: '14px 24px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
        transition: 'transform 0.2s',
    },
    modalCancelButton: {
        flex: 1,
        padding: '14px 24px',
        backgroundColor: '#64748b',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
};

export default EmployeeDashboard;