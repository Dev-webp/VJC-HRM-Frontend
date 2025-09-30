import React from "react";

const Footer = () => (
  <footer style={footerStyles.container}>
    <div style={footerStyles.content}>
      <div style={footerStyles.logoSection}>
        <span style={footerStyles.logoText}>VJC Overseas</span>
      </div>

      <div style={footerStyles.separator} />

      <div style={footerStyles.infoSection}>
        <div style={footerStyles.aboutText}>
          <h4 style={footerStyles.heading}>About the HRM System</h4>
          <p>
            hrm.vjcoverseas.com is a comprehensive human resource management platform designed to streamline employee{" "}
            <strong>attendance, payroll processing, leave management</strong>, and workforce administration for VJC Overseas. Our mission is to empower HR teams with reliable, real-time data and user-friendly tools for efficient operations.
          </p>
        </div>

        <nav style={footerStyles.navSection}>
          <h4 style={footerStyles.heading}>Quick Links</h4>
          <ul style={footerStyles.navList}>
            <li><a href="/" target="_blank" rel="noopener noreferrer" style={footerStyles.navLink}>Home</a></li>
            <li><a href="/" target="_blank" rel="noopener noreferrer" style={footerStyles.navLink}>Attendance</a></li>
            <li><a href="/" target="_blank" rel="noopener noreferrer" style={footerStyles.navLink}>Payroll</a></li>
            <li><a href="/" target="_blank" rel="noopener noreferrer" style={footerStyles.navLink}>Leave Requests</a></li>
          </ul>
        </nav>

        <div style={footerStyles.socialSection}>
          <h4 style={footerStyles.heading}>Connect with Us</h4>
          <div style={footerStyles.socialIcons}>
            <a href="https://www.instagram.com/vjc_overseas_bangalore/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={footerStyles.socialLink} dangerouslySetInnerHTML={{__html: instagramSvg}} />
            <a href="https://www.facebook.com/VJCOVERSEAS/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={footerStyles.socialLink} dangerouslySetInnerHTML={{__html: facebookSvg}} />
            <a href="https://x.com/vjcoverseas" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter" style={footerStyles.socialLink} dangerouslySetInnerHTML={{__html: twitterSvg}} />
            <a href="https://www.vjcoverseas.com" target="_blank" rel="noopener noreferrer" aria-label="Main Website" style={footerStyles.socialLink} dangerouslySetInnerHTML={{__html: websiteSvg}} />
          </div>
        </div>
      </div>

      <div style={footerStyles.separator} />

      <div style={footerStyles.copyright}>
        © {new Date().getFullYear()} VJC Overseas HRM System. All rights reserved.
      </div>
    </div>
  </footer>
);

const instagramSvg = `<svg width="24" height="24" fill="#f97316" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm10.5 2.25a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zM12 7a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z"/></svg>`;
const facebookSvg = `<svg width="24" height="24" fill="#f97316" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.877v-6.987h-2.54v-2.89h2.54V9.845c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.462h-1.26c-1.243 0-1.63.773-1.63 1.562v1.875h2.773l-.443 2.89h-2.33v6.987C18.343 21.128 22 16.991 22 12z"/></svg>`;
const twitterSvg = `<svg width="24" height="24" fill="#f97316" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23.954 4.569a10 10 0 01-2.825.775 4.955 4.955 0 002.163-2.724 9.937 9.937 0 01-3.127 1.195 4.924 4.924 0 00-8.392 4.482A13.978 13.978 0 011.671 3.149a4.822 4.822 0 001.523 6.573 4.903 4.903 0 01-2.229-.616c-.054 2.28 1.581 4.415 3.949 4.89a4.935 4.935 0 01-2.224.084 4.936 4.936 0 004.604 3.419 9.868 9.868 0 01-6.102 2.105c-.396 0-.79-.023-1.17-.069a13.945 13.945 0 007.548 2.209c9.051 0 14-7.496 14-13.986 0-.21 0-.423-.015-.633A9.936 9.936 0 0024 4.59z"/></svg>`;
const websiteSvg = `<svg width="24" height="24" fill="#f97316" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm6.93 5h-3.487c-.323-1.19-.817-2.28-1.458-3.23A8.025 8.025 0 0117.93 7zm-6.908-3.135c.644.95 1.141 2.037 1.466 3.2H7.825a8.068 8.068 0 015.197-3.2zM5.07 17a7.946 7.946 0 01-1.22-5h2.822a10.985 10.985 0 000 5h-1.602zm-.482-7H3.707a7.933 7.933 0 011.72-4.07A9.069 9.069 0 004.588 10zm.482 2a8.03 8.03 0 010 5H8.1a9.094 9.094 0 01-2.04-5zm2.393-7.393a8.08 8.08 0 011.867-1.24 8.04 8.04 0 00-4.518 3.742c.628-.41 1.207-.796 1.831-1.134zm10.125 6.872h-6.03a30.9 30.9 0 00-1.466-5.333 7.983 7.983 0 00-2.58 5.333H6.5c-.255-1.706-.288-3.312-.096-4.777a8.03 8.03 0 00-1.481-3.538h12.382a7.973 7.973 0 012.1 4.52c.138.746.211 1.528.211 2.295z"/></svg>`;

const footerStyles = {
  primaryBg: "#1f2937",
  secondaryBg: "#374151",
  orange500: "#f97316",
  lightText: "#e5e7eb",

  container: {
    backgroundColor: "#1f2937",
    color: "#e5e7eb",
    padding: "40px 20px 20px 20px",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    marginTop: 60,
    borderTop: `5px solid #f97316`,
    width: "100%",
    boxSizing: "border-box",
  },
  content: {
    maxWidth: 1080,
    margin: "0 auto",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
    marginBottom: 20,
  },
  logoText: {
    fontSize: "1.8rem",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "0.05em",
  },

  heading: {
    color: "#f97316",
    fontSize: "1.1rem",
    fontWeight: 700,
    marginBottom: 10,
    marginTop: 0,
    borderBottom: `2px solid #374151`,
    paddingBottom: 5,
  },

  separator: {
    borderBottom: "1px solid #374151",
    margin: "20px 0",
  },

  infoSection: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 30,
    marginBottom: 30,
  },

  aboutText: {
    flex: 1,
    lineHeight: 1.6,
    color: "#bdbdbd",
    minWidth: 300,
  },

  navSection: {
    flex: "0 1 200px",
  },

  navList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },

  navLink: {
    display: "block",
    color: "#e5e7eb",
    textDecoration: "none",
    padding: "5px 0",
    fontWeight: 400,
    transition: "color 0.3s ease",
  },

  socialSection: {
    flex: "0 1 200px",
  },

  socialIcons: {
    display: "flex",
    gap: 15,
    fontSize: 24,
  },

  socialLink: {
    textDecoration: "none",
    transition: "transform 0.2s ease",
    cursor: "pointer",
  },

  copyright: {
    textAlign: "center",
    paddingTop: 15,
    borderTop: "1px solid #374151",
    fontSize: "0.85rem",
    color: "#9ca3af",
  },
};

export default Footer;
