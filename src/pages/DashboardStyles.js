export const premiumStyles = {
  mainLayout: {
    display: "flex",
    height: "100vh", // Fixed height to prevent overflow issues
    backgroundColor: "#F0F2F9",
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: "hidden", // Prevents double scrollbars
  },
  
  sidebar: {
    width: "280px",
    minWidth: "280px",
    backgroundColor: "#0F172A",
    color: "#FFFFFF",
    display: "flex",
    flexDirection: "column",
    padding: "40px 20px",
    boxShadow: "4px 0 10px rgba(0,0,0,0.05)",
  },
  sidebarBrand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "50px",
    paddingLeft: "10px",
  },
  sidebarLogo: {
    width: "45px",
    height: "45px",
    borderRadius: "12px",
    border: "2px solid #334155",
  },
  brandText: {
    fontSize: "1.25rem",
    fontWeight: "800",
    letterSpacing: "0.5px",
    color: "#F8FAFC",
  },
  sideNav: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1, // Pushes nav to fill space
  },
  sideNavItem: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "14px 20px",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: "#94A3B8",
    fontWeight: "500",
  },
  activeSideItem: {
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
    boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.4)",
  },

  contentWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh", 
    overflow: "hidden", // Main wrapper doesn't scroll
  },
  topHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "30px 40px",
    backgroundColor: "transparent",
    flexShrink: 0,
  },
  welcomeText: {
    fontSize: "1.8rem",
    fontWeight: "800",
    color: "#1E293B",
    margin: 0,
  },
  subText: {
    color: "#64748B",
    margin: "4px 0 0 0",
    fontSize: "0.95rem",
  },
  mainContent: {
    padding: "0 40px 20px 40px",
    flex: 1,
    overflowY: "auto", // Only this area scrolls if content is long
    display: "flex",
    flexDirection: "column",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    padding: "20px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
  },
  statIcon: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    backgroundColor: "#EFF6FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
  },
  statValue: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1E293B",
    margin: 0,
  },
  statLabel: {
    color: "#64748B",
    margin: 0,
    fontSize: "0.85rem",
    fontWeight: "500",
  },

  glassContainer: {
  
    borderRadius: "16px",
    padding: "25px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.03)",
    border: "1px solid #E2E8F0",
  
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#334155",
    marginBottom: "20px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },

 
};