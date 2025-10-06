import React, { useState, useEffect } from 'react';

const logoUrl = '/logo512.png'; // Replace with your logo image path

export default function ScrollProgressCircle() {
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    function onScroll() {
      // Calculates the scroll percentage
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollPercent(Math.round(scrolled));
    }
    
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const radius = 28;
  const size = 70; // SVG width and height
  const center = size / 2; // 35
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollPercent / 100) * circumference;

  return (
    // The container is a perfect 70x70 square, making it a circle
    <div style={styles.container(size)} onClick={scrollToTop} aria-label="Scroll to top" role="progressbar" aria-valuenow={scrollPercent} aria-valuemin="0" aria-valuemax="100">
      
      {/* Progress Circle SVG */}
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        {/* Track */}
        <circle
          stroke="#444"
          fill="none"
          strokeWidth={strokeWidth}
          r={radius}
          cx={center}
          cy={center}
        />
        {/* Progress */}
        <circle
          stroke="#ff8c00" // Orange Progress
          fill="none"
          strokeWidth={strokeWidth}
          r={radius}
          cx={center}
          cy={center}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      
      {/* Container for Logo and Text - Absolutely positioned and centered */}
      <div style={styles.centerContent}>
        {/* Logo */}
        <img
          src={logoUrl}
          alt="Logo"
          style={styles.logo}
          draggable={false}
        />
        {/* Percentage below the logo */}
        <div style={styles.text}>{scrollPercent}%</div>
      </div>
    </div>
  );
}

// --- Styles ---

const styles = {
  // Main circular container - 70x70 square
  container: (size) => ({
    position: 'fixed',
    bottom: 30,
    right: 30,
    width: size,
    height: size, 
    borderRadius: '50%',
    backgroundColor: 'rgba(40,40,40,0.9)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    zIndex: 1000,
    cursor: 'pointer',
    userSelect: 'none',
  }),
  
  // New container to hold and stack the logo/text, positioned absolutely and centered
  centerContent: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    // Ensures this container is perfectly centered over the SVG
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)', 
    lineHeight: 1, // Important for vertical centering
  },

  logo: {
    width: 28, // Made slightly smaller to better fit with text
    height: 28,
    borderRadius: '50%',
    objectFit: 'contain',
    userSelect: 'none',
  },
  
  text: {
    color: '#ff8c00', // matching progress color
    fontSize: 12, // Made smaller to fit cleanly
    fontWeight: 'bold',
    fontFamily: 'Arial, sans-serif',
    userSelect: 'none',
    marginTop: 2, // Small space between logo and text
  },
};