import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ChairmanDashboard from './pages/ChairmanDashboard';
import PrivateRoute from './pages/PrivateRoute';
import ManagerDashboard from './pages/ManagerDashboard';
import VeniDashboard from './pages/VeniDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          {/* Chairman routes */}
          <Route path="/chairman" element={<ChairmanDashboard />} />
          <Route
            path="/chairman/addlead"
            element={<ChairmanDashboard defaultTab="LEAD_MANAGEMENT" openAddLead />}
          />
          <Route
            path="/chairman/:leadSlug"
            element={<ChairmanDashboard defaultTab="LEAD_MANAGEMENT" />}
          />

          {/* Employee routes */}
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/employee/:employeeName" element={<EmployeeDashboard />} />
          <Route
            path="/employee/:employeeName/addlead"
            element={<EmployeeDashboard defaultTab="leads" openAddLead />}
          />
          <Route
            path="/employee/:employeeName/:leadSlug"
            element={<EmployeeDashboard defaultTab="leads" />}
          />

          {/* Manager dashboard nested under employee name */}
          <Route
            path="/employee/:employeeName/manager-dashboard"
            element={<ManagerDashboard />}
          />

          {/* Legacy route — redirect to login so old bookmarks don't break */}
          <Route
            path="/manager-dashboard"
            element={<Navigate to="/" replace />}
          />

          {/* Other dashboards */}
          <Route path="/veni-dashboard" element={<VeniDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;