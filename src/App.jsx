import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ChairmanDashboard from './pages/ChairmanDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/chairman" element={<ChairmanDashboard />} />
      </Routes>
    </Router>
  );
}
export default App;