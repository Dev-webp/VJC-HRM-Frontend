import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function UserMenu({ name = "User" }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.get('http://backend.vjcoverseas.com/logout', { withCredentials: true });
      navigate('/');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.avatar}>
        <span>{name[0]?.toUpperCase() || 'U'}</span>
        <div style={styles.dropdown}>
          <div onClick={handleLogout}>🚪 Logout</div>
          <div onClick={() => navigate('/')}>🔄 Switch User</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 20,
    right: 30,
  },
  avatar: {
    position: 'relative',
    backgroundColor: '#007bff',
    color: '#fff',
    width: 40,
    height: 40,
    borderRadius: '50%',
    fontSize: 18,
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none'
  },
  dropdown: {
    position: 'absolute',
    top: '120%',
    right: 0,
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: 6,
    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    zIndex: 1000,
    display: 'none',
    width: 150
  }
};
