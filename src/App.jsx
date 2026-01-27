import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
          {/* Dynamic employee route with name parameter */}
          <Route path="/employee/:employeeName" element={<EmployeeDashboard />} />
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/chairman" element={<ChairmanDashboard />} />
          <Route path="/veni-dashboard" element={<VeniDashboard />} />
          <Route path="/manager-dashboard" element={<ManagerDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;