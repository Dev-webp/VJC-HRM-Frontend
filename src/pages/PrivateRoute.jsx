// src/components/PrivateRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

function PrivateRoute() {
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    axios.get('http://backend.vjcoverseas.com//check-auth', { withCredentials: true })
      .then(() => setIsAuth(true))
      .catch(() => setIsAuth(false));
  }, []);

  if (isAuth === null) return <div>Loading...</div>; // or spinner

  return isAuth ? <Outlet /> : <Navigate to="/" />;
}

export default PrivateRoute;
