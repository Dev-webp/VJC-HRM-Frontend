import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

// --- Animated Loading Component ---

// Static logo path for the loading screen
const LOGO_URL = "/logo192.png"; 

// Loading duration for the aesthetic part (500ms)
const ANIMATION_DURATION = 500; 

function AnimatedLoading({ logoUrl }) {
    // State to simulate the percentage filling up from 0 to 100
    const [progress, setProgress] = useState(0);

    // Effect to run the *visual* progress animation
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                // If we hit 99, stop the timer. The actual auth check will trigger the dismissal.
                if (prev >= 99) {
                    clearInterval(interval);
                    return 99;
                }
                // Calculate step based on remaining time for a smooth visual ramp-up
                const timeElapsed = (Date.now() - startTime) % ANIMATION_DURATION;
                return Math.min(99, Math.floor((timeElapsed / ANIMATION_DURATION) * 100));
            });
        }, 30); // Update frequently for smoothness
        
        const startTime = Date.now();

        return () => clearInterval(interval);
    }, []);

    // Style for the circular progress bar (uses conic-gradient for the fill)
    const circleStyle = useMemo(() => ({
        ...styles.loaderCircle,
        background: `conic-gradient(#ff7b16 ${progress}%, #e0e0e0 ${progress}%)`,
    }), [progress]);

    return (
        <div style={styles.overlay}>
            <div style={styles.popup}>
                <div style={circleStyle}>
                    <div style={styles.loaderContent}>
                        <img 
                            src={logoUrl} 
                            alt="Company Logo" 
                            style={styles.logo} 
                            onError={(e) => { e.target.style.display = 'none'; console.error('Logo failed to load.') }}
                        />
                        <div style={styles.percentage}>
                            {progress}%
                        </div>
                    </div>
                </div>
                <p style={styles.message}>Checking Authentication...</p>
            </div>
        </div>
    );
}

// --- PrivateRoute Component ---

function PrivateRoute() {
    // isAuth: null (loading), true (authenticated), false (not authenticated)
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

    // Show the custom loading screen while isAuth is null
    if (isAuth === null) {
        return <AnimatedLoading logoUrl={LOGO_URL} />;
    }

    // Navigate based on authentication status
    return isAuth ? <Outlet /> : <Navigate to="/" />;
}

export default PrivateRoute;

// --- Loading Styles ---
const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(240, 242, 245, 0.95)', // Light, semi-transparent background
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999, // Ensure it's on top of everything
    },
    popup: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '30px',
        backgroundColor: '#fff',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
    },
    loaderCircle: {
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'background 0.03s linear', // Smooth transition for the progress
    },
    loaderContent: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
    },
    logo: {
        width: '50px',
        height: '50px',
        objectFit: 'contain',
        marginBottom: '5px',
    },
    percentage: {
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: '#ff7b16',
    },
    message: {
        marginTop: '20px',
        fontSize: '1rem',
        color: '#4a5568',
        fontWeight: '500',
    }
};