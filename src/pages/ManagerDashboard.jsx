import React, { useState, useEffect } from "react";
import axios from "axios";
// Components required for the Manager Dashboard
import SalaryUpload from "./SalarySlipUpload";
import UserManagement from "./UserManagement";
import Payroll from "./Payroll";
import AttendanceChatLogs from "./AttendanceChatLogs";

// CRITICAL: ONLY importing the component. No logic remains here.
import LeaveRequestsSection from "./LeaveRequestsSection"; 

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

// --- UserMenu Component (Unchanged) ---
function UserMenu({ name = "User" }) {
  const [open, setOpen] = useState(false);
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
    <div className="usermenu-container" style={premiumStyles.userMenu.container}>
      <div
        style={premiumStyles.userMenu.avatar}
        onClick={toggleDropdown}
        title={name}
      >
        {name[0]?.toUpperCase() || "U"}
      </div>
      {open && (
        <div style={premiumStyles.userMenu.dropdown}>
          <div style={premiumStyles.userMenu.dropdownItem} onClick={handleLogout}>
            🚪 Logout
          </div>
          <div
            style={premiumStyles.userMenu.dropdownItem}
            onClick={handleSwitchUser}
          >
            🔄 Switch User
          </div>
        </div>
      )}
    </div>
  );
}

// --- Navigation Items and Content Mapping ---
const navItems = {
  // Use the imported component here
  LEAVE_REQUESTS: { label: "📝 Leave Requests", component: LeaveRequestsSection }, 
  PAYROLL: { label: "💰 Payroll Processing", component: Payroll },
  SALARY_UPLOAD: { label: "📤 Salary Slip Upload", component: SalaryUpload },

};

// Component to render based on active tab (Simplified)
const ComponentRenderer = ({
  activeTab,
  managerLocation,
}) => {
  const ActiveComponent = navItems[activeTab].component;

  // Pass only the necessary props (location, baseUrl, styles) to the components
  return (
    <ActiveComponent
      managerLocation={managerLocation}
      baseUrl={baseUrl}
      premiumStyles={premiumStyles}
    />
  );
};

// -------------------------------------------------------------------
// --- ManagerDashboard Main Component (Cleaned of Leave Logic) ---
// -------------------------------------------------------------------
export default function ManagerDashboard() {
  // Removed: leaveRequests, message, updateRemarks, handleLeaveAction, deleteLeaveRequest, statusColor
  const [activeTab, setActiveTab] = useState("LEAVE_REQUESTS");
  const [managerData, setManagerData] = useState({
    name: 'Loading Manager',
    location: '',
  });

  const managerLocation = managerData.location;
  const managerName = managerData.name;

  // 1. ONLY keeps the logic to Fetch Manager's Actual Location
  async function fetchManagerLocation() {
    try {
      // Assuming /me returns { name: 'Manager Name', location: 'Branch Name' }
      const res = await axios.get(`${baseUrl}/me`, { withCredentials: true });
      const fetchedData = res.data;
      const location = fetchedData.location || 'BANGALORE'; 

      setManagerData({
        name: fetchedData.name || 'Branch Manager',
        location: location,
      });
      return location;

    } catch (error) {
      console.error("Error fetching manager data:", error);
      // Removed setMessage, as we are cleaning up UI messages not critical to core state
      return 'BANGALORE'; 
    }
  }

  // Effect hook for loading manager data
  useEffect(() => {
    fetchManagerLocation();
  }, []);

  // Show a loading state if the location hasn't been fetched yet
  if (!managerLocation) {
    return <div style={{...premiumStyles.container, textAlign: 'center', paddingTop: 100, fontSize: '1.5rem'}}>Loading Dashboard... 🌍</div>
  }

  // --- Render ---
  return (
    <div style={premiumStyles.container}>
      <UserMenu name={`${managerName} (${managerLocation})`} />

      <div style={premiumStyles.headerSection}>
        <div style={premiumStyles.logoContainer}>
          <img
            src="/logo192.png"
            alt="VJC-OVERSEAS Logo"
            style={premiumStyles.logoImage}
          />
        </div>
        <h2 style={premiumStyles.title}>
          {" "}
          Manager Dashboard: <span style={{ color: '#3498db' }}>{managerLocation.toUpperCase()}</span>
        </h2>
      </div>

      <div style={premiumStyles.contentBoxStack}>
        <h3 style={premiumStyles.sectionTitle}>💬 Attendance Chat Logs for {managerLocation}</h3>
        <AttendanceChatLogs
          baseUrl={baseUrl}
          managerLocation={managerLocation}
          premiumStyles={premiumStyles}
        />
      </div>

      <div style={premiumStyles.contentBoxStack}>
        <h3 style={premiumStyles.sectionTitle}>👥 User Management for {managerLocation}</h3>
        <UserManagement
          baseUrl={baseUrl}
          managerLocation={managerLocation}
          premiumStyles={premiumStyles}
        />
      </div>

      <div style={premiumStyles.separator} />

      <div style={premiumStyles.navBar}>
        {Object.keys(navItems).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              ...premiumStyles.navItem,
              ...(activeTab === key ? premiumStyles.activeNavItem : {}),
            }}
          >
            {navItems[key].label}
          </button>
        ))}
      </div>

      <div style={premiumStyles.dynamicContent}>
        <ComponentRenderer
          activeTab={activeTab}
          managerLocation={managerLocation} // Prop passed to all sub-components for filtering
        />
      </div>
    </div>
  );
}

// --- Premium Styles (Unchanged) ---
const premiumStyles = {
    container: {
        padding: 40,
        fontFamily: "'Inter', sans-serif",
        backgroundColor: "#f0f2f5",
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
    },

    // Header styles
    headerSection: {
        display: "flex",
        alignItems: "center",
        marginBottom: 40,
        paddingLeft: 10,
    },
    logoContainer: {
        marginRight: 15,
        width: 160,
        height: 100,
        flexShrink: 0,
    },
    logoImage: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        borderRadius: "16px",
    },
    title: {
        fontSize: "2.8rem",
        fontWeight: "800",
        color: "#2c3e50",
        textAlign: "left",
        letterSpacing: "-1px",
        margin: 0,
    },

    // Content box styles
    contentBoxStack: {
        backgroundColor: "#fff",
        padding: 30,
        borderRadius: 15,
        boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
        marginBottom: 25,
        boxSizing: "border-box",
        width: "100%",
    },
    contentBoxNoMargin: {
        backgroundColor: "#fff",
        borderRadius: 15,
        boxSizing: "border-box",
    },

    separator: {
        borderBottom: "1px solid #dcdfe4",
        marginBottom: 30,
        marginTop: -5,
    },

    // Navigation bar styles
    navBar: {
        display: "flex",
        justifyContent: "flex-start",
        backgroundColor: "#ffffff",
        borderRadius: "10px 10px 0 0",
        padding: "0 10px",
        borderBottom: "3px solid #e0e0e0",
        overflowX: "auto",
    },
    navItem: {
        padding: "15px 25px",
        cursor: "pointer",
        border: "none",
        backgroundColor: "transparent",
        fontSize: "1rem",
        fontWeight: "600",
        color: "#7f8c8d",
        transition: "color 0.3s, border-bottom 0.3s",
        margin: "0 10px",
        position: "relative",
        whiteSpace: "nowrap",
    },
    activeNavItem: {
        color: "#3498db",
        borderBottom: "3px solid #3498db",
        zIndex: 10,
        transform: "translateY(1px)",
    },
    dynamicContent: {
        backgroundColor: "#fff",
        padding: 30,
        paddingTop: 40,
        borderRadius: "0 0 15px 15px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    },

    // Section title styling
    sectionTitle: {
        fontSize: "1.5rem",
        fontWeight: "600",
        color: "#333",
        marginBottom: 20,
        borderBottom: "2px solid #e2f0ff",
        paddingBottom: 10,
    },

    // Table styles (Kept as they might be used by other components)
    table: {
        width: "100%",
        borderCollapse: "separate",
        borderSpacing: "0 10px",
        headerRow: {
            backgroundColor: "#eef2f7",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
        },
        headerCell: {
            padding: 15,
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            color: "#2c3e50",
            textAlign: "left",
        },
        dataRow: {
            backgroundColor: "#f9f9f9",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
            borderRadius: 8,
        },
        dataCell: {
            padding: 15,
            border: "none",
            fontSize: 14,
            verticalAlign: "middle",
            textAlign: "left",
        },
    },

    // Buttons and inputs
    btn: {
        cursor: "pointer",
        padding: "8px 15px",
        borderRadius: 8,
        border: "none",
        fontWeight: "600",
        color: "#fff",
        transition: "background-color 0.3s ease, transform 0.1s ease",
        fontSize: 13,
    },
    input: {
        padding: 8,
        borderRadius: 6,
        border: "1px solid #ccc",
        fontSize: 13,
        outlineColor: "#3498db",
        width: "100%",
        boxSizing: "border-box",
    },

    emptyText: {
        fontStyle: "italic",
        color: "#666",
        textAlign: "center",
        padding: 40,
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        fontSize: "1.1rem",
    },

    message: {
        fontWeight: "600",
        marginBottom: 15,
        padding: 12,
        borderRadius: 8,
        textAlign: "center",
        color: "#fff",
        backgroundColor: "#e74c3c",
    },

    // Status text colors (Kept, but unused by this component)
    approvedColor: {
        color: "#2ecc71",
    },
    rejectedColor: {
        color: "#e74c3c",
    },
    pendingColor: {
        color: "#f39c12",
    },

    // User menu styles
    userMenu: {
        container: {
            position: "fixed",
            top: 30,
            right: 40,
            zIndex: 1000,
            userSelect: "none",
        },
        avatar: {
            backgroundColor: "#3498db",
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
            padding: 12,
            cursor: "pointer",
            fontWeight: "500",
            color: "#333",
            borderBottom: "1px solid #f0f2f5",
            transition: "background-color 0.2s",
        },
    },
};