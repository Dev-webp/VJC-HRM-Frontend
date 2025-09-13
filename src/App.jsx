import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ChairmanDashboard from './pages/ChairmanDashboard';
import PrivateRoute from './pages/PrivateRoute'; // <-- import this

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/chairman" element={<ChairmanDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
