/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Add shiny animation
const shinyAnimationStyles = `
@keyframes shiny-text {
  0%, 100% {
    color: #ee8114b1;
    text-shadow:
      0 0 5px #ff8d1a81,
      0 0 10px #ff8d1aaf,
      0 0 20px #ff8d1a7b;
  }
  50% {
    color: #3d55a4ff;
    text-shadow:
      0 0 10px #1E40AF,
      0 0 20px #1E40AF,
      0 0 30px #1E40AF;
  }
}
.shiny-heading {
  animation: shiny-text 4s ease-in-out infinite;
  font-weight: 900;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  letter-spacing: 1.4px;
  text-align: center;
  font-size: 28px;
}
`;

function injectStyle() {
  if (!document.getElementById("shiny-heading-keyframes")) {
    const styleTag = document.createElement("style");
    styleTag.id = "shiny-heading-keyframes";
    styleTag.appendChild(document.createTextNode(shinyAnimationStyles));
    document.head.appendChild(styleTag);
  }
}

// 🟧 BLOCK MOBILE/TABLETS
function useDesktopOnly() {
  useEffect(() => {
    function checkDesktop() {
      const isMobileDevice = /Android|iPhone|iPad|iPod|webOS|BlackBerry|Windows Phone/i.test(
        navigator.userAgent
      );
      if (isMobileDevice) {
        document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#00448d82;">
            <img src="/logo512.png" style="width:110px;margin-bottom:22px;" />
            <h2 style="color:#FF8C1A;font-weight:900;">Desktop Use Only</h2>
            <p style="color:white;font-size:17px;text-align:center;">Please access from a desktop/laptop.</p>
          </div>`;
        document.body.style.overflow = "hidden";
      }
    }
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);
}

// ---------------------------------------------------------------------------
// 🟩 FINAL FIX ➜ COLLECT FULL DEVICE + GEO DATA
// ---------------------------------------------------------------------------
async function collectTrackingData() {
  try {
    // 1️⃣ Get IP, Location, ISP
    const geo = await axios.get("https://ipapi.co/json/");
    const ipInfo = geo.data;

    // 2️⃣ Detect browser + OS
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";

    let os = "Unknown OS";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";

    let device = /Mobile|Android|iPhone|iPad/i.test(ua)
      ? "Mobile"
      : "Desktop";

    return {
      ip_address: ipInfo.ip,
      city: ipInfo.city,
      region: ipInfo.region,
      country: ipInfo.country_name,
      isp_org: ipInfo.org,
      os_name: os,
      browser_name: browser,
      user_agent: ua,
      device_name: device,
    };
  } catch (e) {
    console.log("Tracking Error:", e);
    return {}; // Fail silently
  }
}

// ---------------------------------------------------------------------------

function Login() {
  useDesktopOnly();
  injectStyle();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const backendBaseUrl =
    window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://backend.vjcoverseas.com";

  // ------------------------------------------------------------------
  // LOGIN SUBMIT — now sending FULL tracking fields
  // ------------------------------------------------------------------
  const handleLogin = async (e) => {
    e.preventDefault();

    // Collect IP + Location + Device info
    const tracking = await collectTrackingData();

    const formData = new URLSearchParams();
    formData.append("email", email);
    formData.append("password", password);

    Object.keys(tracking).forEach((key) => {
      formData.append(key, tracking[key] ?? "");
    });

    try {
      await axios.post(`${backendBaseUrl}/`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        withCredentials: true,
      });

      const res = await axios.get(`${backendBaseUrl}/dashboard`, {
        withCredentials: true,
      });

      const route = res.data.redirect;
      navigate(route === "chairman" ? "/chairman" : "/employee");
    } catch (err) {
      alert("❌ " + (err.response?.data?.message || "Login failed"));
    }
  };

  // ----------------- UI ---------------------

  return (
<div style={styles.root}>
      <div style={styles.responsiveContainer}>
        {/* Left-side info & illustration */}
        <div style={styles.leftPanel}>
          <img
            src="/HRM.png"
            alt="HRM Illustration"
            style={styles.illustration}
          />
          <Feature
            label="Attendance Logs"
            desc="Track employee attendance efficiently and accurately."
          />
          <Feature
            label="Leave Requests"
            desc="Manage leave applications and approvals seamlessly."
          />
          <Feature
            label="Auto Salary Slips Generation"
            desc="Automatically generate salary slips for employees monthly."
          />
        </div>

        {/* Right-side login */}
        <div style={styles.rightPanel}>
          <img
            src="/logo512.png"
            alt="VJC Overseas Logo"
            style={styles.logo}
          />
          {/* Use the shiny-heading class for the premium shiny effect */}
          <h1 className="shiny-heading">HRM VJC-OVERSEAS</h1>
          <p style={styles.slogan}>
            Empower your potential, drive our success.<br />
            Together we achieve greatness.
          </p>

          <form style={styles.form} onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...styles.input, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF8C1A" width="20px" height="20px">
                    <path d="M12 5c-7 0-12 7-12 7s5 7 12 7 12-7 12-7-5-7-12-7zm0 12a5 5 0 110-10 5 5 0 010 10z" />
                    <circle cx="12" cy="12" r="2.5" fill="#FF8C1A" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF8C1A" width="20px" height="20px">
                    <path d="M1 12s4-7 11-7c3.18 0 5.94 1.64 7.58 4.09L19 10.5l2 2-1.42 1.41-1.9-1.9A7.927 7.927 0 0112 19c-7 0-11-7-11-7zm16.9 5.48L19.07 17 22 20.93 20.93 22l-2.58-2.58a9.925 9.925 0 01-5.35 1.46c-7 0-12-7-12-7a13.766 13.766 0 012.02-3.03l-1.5-1.5L3 3 4.5 1.5l18 18-1.5 1.5-3.1-3.02z" />
                  </svg>
                )}
              </button>
            </div>
            <div style={styles.extraRow}>
              <label style={styles.label}>
                <input type="checkbox" style={styles.checkbox} />
                Remember Me
              </label>
              <a href="#" style={styles.link}>Forgot your password?</a>
            </div>
            <button type="submit" style={styles.loginButton}>
              LOGIN <span role="img" aria-label="lock">🔒</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Small feature item
function Feature({ label, desc }) {
  return (
    <div style={{ display: "flex", marginBottom: 20 }}>
      <span style={{ color: "#1a89ff", fontSize: 20, marginRight: 10 }}>✔</span>
      <div>
        <div style={{ fontWeight: "bold", color: "#fff" }}>{label}</div>
        <div style={{ color: "#f3f2f1" }}>{desc}</div>
      </div>
    </div>
  );
}

// ------------------- STYLES (same as your original) -------------------
const styles = {
  root: {
    minHeight: '70vh',
    background: '#ffffffff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    boxSizing: 'border-box',
  },
  responsiveContainer: {
    width: '90%',
    maxWidth: 900,
    minHeight: 480,
    display: 'flex',
    flexDirection: 'row',
    background: '#fff',
    boxShadow: '0 6px 48px 4px #FFA64D22',
    borderRadius: 16,
    overflow: 'hidden',
    margin: '24px 0',
    flexWrap: 'wrap',
  },
  leftPanel: {
    flex: '1 1 360px',
    background: 'linear-gradient(135deg, #FF8C1A 0%, #FFA64D 80%)',
    color: '#fff',
    padding: '30px 40px 28px 40px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    minWidth: 280,
    minHeight: 370,
    boxSizing: 'border-box',
  },
  illustration: {
    width: 300,
    height: 300,
    objectFit: 'contain',
    alignSelf: 'center',
    marginBottom: 24,
  },
  rightPanel: {
    flex: '1 1 380px',
    padding: '28px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 260,
    minHeight: 370,
    background: '#fbefe76a',
    boxSizing: 'border-box',
    justifyContent: 'center',
    border: '2px solid #ffb366',
  },
  logo: {
    width: 200,
    marginBottom: 10,
    objectFit: 'contain',
    alignSelf: 'center',
  },
  heading: {
    fontSize: 22,
    color: '#FF8C1A',
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 1.1,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    textAlign: 'center',
  },
  slogan: {
    fontSize: 14,
    color: '#051988ff',
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 1.3,
  },
  form: {
    width: '100%',
    maxWidth: 320,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: 18,
    fontSize: 15,
    borderRadius: 7,
    border: '1.8px solid #FF8C1A',
    outlineColor: '#FF8C1A',
    boxSizing: 'border-box',
    background: '#fff',
    color: '#2c2c2c',
  },
  passwordWrapper: {
    position: 'relative',
    width: '100%',
    marginBottom: 18,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '55%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
  },
  extraRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    fontSize: 14,
    width: '100%',
  },
  label: {
    fontWeight: 500,
    color: '#FF8C1A',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    marginRight: 6,
    accentColor: '#FFA64D',
  },
  link: {
    color: '#FF8C1A',
    fontWeight: 500,
    textDecoration: 'none',
    fontSize: 13,
  },
  loginButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#FF8C1A',
    color: '#fff',
    fontSize: 15,
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 10,
    letterSpacing: 1.1,
    boxShadow: '0 3px 12px #FFA64D33',
    transition: 'background-color 0.3s ease',
  },
};
const mobileBreakpoint = 700; // px
if (window.innerWidth < mobileBreakpoint) {
  styles.responsiveContainer.flexDirection = 'column';
  styles.leftPanel.alignItems = 'center';
  styles.leftPanel.padding = '28px 8vw 24px 8vw';
  styles.rightPanel.padding = '28px 8vw';
  styles.illustration.width = 240;
  styles.illustration.height = 240;
  styles.logo.width = 160;
  styles.heading.fontSize = 20;
  styles.input.fontSize = 14;
  styles.loginButton.fontSize = 14;
  styles.slogan.fontSize = 13;
}

export default Login;
