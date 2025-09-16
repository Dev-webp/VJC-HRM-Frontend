import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

function PrivateRoute() {
  const [isAuth, setIsAuth] = useState(null);

  const backendBaseUrl =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://backend.vjcoverseas.com';

  useEffect(() => {
    axios.get(`${backendBaseUrl}/check-auth`, { withCredentials: true })
      .then(() => setIsAuth(true))
      .catch(() => setIsAuth(false));
  }, [backendBaseUrl]);

  if (isAuth === null) return <div>Loading...</div>; // or spinner

  return isAuth ? <Outlet /> : <Navigate to="/" />;
}

export default PrivateRoute;
