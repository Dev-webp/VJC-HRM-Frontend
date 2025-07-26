import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);

    try {
      // ✅ Step 1: Login
      await axios.post('https://pgadmin-backend.onrender.com/', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true,
      });

      // ✅ Step 2: Get role and redirect
      const res = await axios.get('https://pgadmin-backend.onrender.com/dashboard', {
        withCredentials: true,
      });

      const route = res.data.redirect;
      if (route === 'chairman') {
        navigate('/chairman');
      } else if (route === 'employee') {
        navigate('/employee');
      } else {
        alert('Unknown role');
      }

    } catch (err) {
      console.error(err);
      alert('❌ ' + (err.response?.data?.message || err.message || 'Login failed'));
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br /><br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br /><br />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
