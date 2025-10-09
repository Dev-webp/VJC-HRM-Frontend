import React, { useState } from "react";
import axios from "axios";

// NOTE: baseUrl and premiumStyles must be passed as props from the parent component.
function ManagerAssignment({ baseUrl, premiumStyles }) {
  const [employeeEmail, setEmployeeEmail] = useState("");
  // Change: Use 'location' instead of 'branch'
  const [location, setLocation] = useState(""); 
  const [message, setMessage] = useState("");
  // Change: Locations list
  const locations = ["Banglore", "Hyderabad", "Mumbai", "Delhi", "Kolkata", "Chennai"]; 

  // Ensure styles are available
  if (!premiumStyles) {
    return <div style={{color: 'red'}}>Error: Styles not loaded.</div>;
  }

  const handleAssignManager = async () => {
    setMessage("");
    // Change: Check 'location'
    if (!employeeEmail || !location) { 
      setMessage("❌ Employee Email and Location are required.");
      return;
    }

    try {
      // Change: Send 'location' in the request body
      await axios.post(
        `${baseUrl}/assign-manager-role`,
        { email: employeeEmail, location: location },
        { withCredentials: true }
      );
      // Change: Message reflects 'Location'
      setMessage(`✅ Success! ${employeeEmail} is now the Manager for the ${location} location.`);
      setEmployeeEmail("");
      setLocation("");
    } catch (err) {
      console.error("Manager assignment failed:", err);
      const errorMessage = err.response?.data?.error || "Server error occurred during assignment.";
      setMessage(`❌ Failed to assign manager role. Error: ${errorMessage}`);
    }
  };

  return (
    <div style={premiumStyles.contentBoxStack}>
      <h3 style={premiumStyles.sectionTitle}>👨‍💼 Assign Location Manager Role</h3>
      {message && (
        <p style={{
          ...premiumStyles.message,
          backgroundColor: message.startsWith("❌") ? "#e74c3c" : "#2ecc71"
        }}>
          {message}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: 'wrap', gap: "20px", alignItems: "flex-end" }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: '600', color: '#555' }}>Employee Email ID:</label>
          <input
            type="email"
            value={employeeEmail}
            onChange={(e) => setEmployeeEmail(e.target.value)}
            style={premiumStyles.input}
            placeholder="Enter employee's email"
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          {/* Change: Label reflects 'Location' */}
          <label style={{ display: "block", marginBottom: 5, fontWeight: '600', color: '#555' }}>Assign Location:</label>
          <select
            // Change: Use 'location' state
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={premiumStyles.input}
          >
            <option value="">-- Select Location --</option>
            {/* Change: Map over 'locations' */}
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAssignManager}
          style={{ ...premiumStyles.btn, backgroundColor: "#3498db", padding: "10px 20px" }}
        >
          Assign Role
        </button>
      </div>
    </div>
  );
}

export default ManagerAssignment;