import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ChairmanDashboard from './pages/ChairmanDashboard';
import PrivateRoute from './pages/PrivateRoute';
import ManagerDashboard from './pages/ManagerDashboard';
import VeniDashboard from './pages/VeniDashboard';
import CreateLeadPage from './pages/CreateLeadPage'; // ← import the new page

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          {/* Employee routes */}
          <Route path="/employee/:employeeName" element={<EmployeeDashboard />} />
          <Route path="/employee/:employeeName/addlead" element={<CreateLeadPage />} />
          <Route path="/employee" element={<EmployeeDashboard />} />

          {/* Chairman routes */}
          <Route path="/chairman" element={<ChairmanDashboard />} />
          <Route path="/chairman/addlead" element={<CreateLeadPage />} />

          {/* Other dashboards */}
          <Route path="/veni-dashboard" element={<VeniDashboard />} />
          <Route path="/manager-dashboard" element={<ManagerDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;