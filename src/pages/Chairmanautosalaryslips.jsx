/* eslint-disable */
import React, { useState, useRef } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const baseUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

function ChairmanPayrollSlip() {
  const [email, setEmail] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().substr(0, 7));
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [workDays, setWorkDays] = useState("");
  const [totalDays, setTotalDays] = useState("");
  const slipRef = useRef();

  const fetchPayrollSlip = () => {
    if (!email || !month) {
      setError("Please provide both Email and Month.");
      return;
    }

    setLoading(true);
    setError(null);
    setSlip(null);

    axios
      .post(
        `${baseUrl}/payroll/generate-slip-by-email`,
        { email, month },
        { withCredentials: true }
      )
      .then((res) => {
        setSlip(res.data);
        setWorkDays(res.data.work_days || "");
        setTotalDays(res.data.total_days || "");
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setError("No user or payroll data found for this email.");
        } else {
          setError("Failed to generate payroll slip.");
        }
      })
      .finally(() => setLoading(false));
  };

  const numberToWords = (num) => {
    if (!num) return "Zero Rupees";
    const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
    const b = ["", "", "Twenty ", "Thirty ", "Forty ", "Fifty ", "Sixty ", "Seventy ", "Eighty ", "Ninety "];
    const numStr = num.toFixed(2).toString();
    const [intPart, decimalPart] = numStr.split(".");
    let n = parseInt(intPart, 10);
    if (n === 0) return "Zero Rupees";
    let str = "";
    const units = [
      { div: 10000000, name: "Crore " },
      { div: 100000, name: "Lakh " },
      { div: 1000, name: "Thousand " },
      { div: 100, name: "Hundred " },
    ];
    for (let i = 0; i < units.length; i++) {
      const val = Math.floor(n / units[i].div);
      if (val > 0) {
        if (units[i].div === 100) str += a[val] + units[i].name;
        else str += numberToWords(val).replace("Rupees", "") + units[i].name;
        n %= units[i].div;
      }
    }
    if (n > 0) {
      if (n < 20) str += a[n];
      else str += b[Math.floor(n / 10)] + a[n % 10];
    }
    str += "Rupees";
    if (decimalPart && decimalPart !== "00") {
      str += " and " + numberToWords(parseInt(decimalPart)).replace("Rupees", "") + "Paise";
    }
    return str.trim();
  };

  // DYNAMIC CALCULATION BASED ON EDITED DAYS
  let earnings = [];
  let deductions = [];
  let payable = 0;
  let totalSalary = 0;

  if (slip) {
    totalSalary = Number(slip.base_salary) || 0;
    
    // Calculate based on work days vs total days
    const workDaysNum = parseInt(workDays) || parseInt(slip.work_days) || 0;
    const totalDaysNum = parseInt(totalDays) || parseInt(slip.total_days) || 30;
    
    // Pro-rated salary based on attendance
    const attendanceRatio = workDaysNum / totalDaysNum;
    payable = Math.round(totalSalary * attendanceRatio);
    
    const basic = Math.round(payable * 0.6);
    const hra = Math.round(payable * 0.1);
    const conveyance = Math.round(payable * 0.1);
    const workAllowance = payable - basic - hra - conveyance;
    
    earnings = [
      { desc: "Basic", amount: basic },
      { desc: "House Rent Allowance", amount: hra },
      { desc: "Conveyance", amount: conveyance },
      { desc: "Work Allowance", amount: workAllowance },
    ];

    const leaveDeduction = totalSalary - payable;
    deductions = [
      { desc: "PF", amount: 0 },
      { desc: "Tax", amount: 0 },
      { desc: "Leave Deduction", amount: leaveDeduction },
    ];
  }

  const officeAddresses = {
    bangalore: {
      title: "VJC Overseas-Bangalore",
      url: "https://www.vjcoverseas.com/bangalore",
      lines: ["16 & 17, Ground Floor, Raheja Arcade, 5th Block, Koramangala,", "Bangalore, India, 560095"],
      contact: { email: "Info@vjcoverseas.com", phone: "+91-4066367000" },
    },
    hyderabad: {
      title: "VJC Overseas-HYDERABAD",
      url: "https://www.vjcoverseas.com/hyderabad",
      lines: ["62/A, Ground Floor, Sundari Reddy Bhavan, Fresh Mart,", "Vengalrao Nagar, Sanjeeva Reddy Nagar, Hyderabad, Telangana, 500038"],
      contact: { email: "Info@vjcoverseas.com", phone: "+91-4066367000" },
    },
  };

  const loc = (slip?.location || "").toLowerCase();
  const locationKey = loc.includes("hyderab") ? "hyderabad" : "bangalore";
  const office = officeAddresses[locationKey];

  const payrollMonth = month ? new Date(month + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "-";

  const downloadPDF = async () => {
    const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 12, pdfWidth, pdfHeight);
    pdf.save(`Payslip_${slip?.employee_name || 'employee'}.pdf`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  };

  const getDisplayWorkDays = () => editMode ? workDays : (slip?.work_days || workDays || "MANUAL");
  const getDisplayTotalDays = () => editMode ? totalDays : (slip?.total_days || totalDays || "MANUAL");

  return (
    <div style={{ maxWidth: 820, margin: "2rem auto", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: 8 }}>  Generate Salary Slip</h2>
      
      <div style={{ background: "#f9f9f9", padding: 20, borderRadius: 12, marginBottom: 20, border: "1px solid #ddd" }}>
        <div style={{ display: "flex", gap: 15, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: 5 }}>Employee Email:</label>
            <input 
              type="email" 
              placeholder="Enter employee email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: 5 }}>Month:</label>
            <input 
              type="month" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={inputStyle}
            />
          </div>
          <button onClick={fetchPayrollSlip} disabled={loading} style={btnStyleAction}>
            {loading ? "Generating..." : "Generate Slip"}
          </button>
        </div>
      </div>

      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

      {slip && (
        <>
          <div style={{ textAlign: "right", marginBottom: 10 }}>
            {!editMode ? (
              <button onClick={() => setEditMode(true)} style={{...btnStyle, backgroundColor: "#28a745"}}>✏️ Edit Days</button>
            ) : (
              <button onClick={() => setEditMode(false)} style={{...btnStyle, backgroundColor: "#dc3545"}}>✅ Save</button>
            )}
            <button onClick={downloadPDF} style={btnStyle}>⏳ Download PDF</button>
          </div>
          
          {editMode && (
            <div style={{ background: "#e7f3ff", padding: 15, borderRadius: 8, marginBottom: 15, border: "2px solid #007bff" }}>
              <div style={{ display: "flex", gap: 15, alignItems: "end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontWeight: "bold", marginBottom: 5 }}>Work Days:</label>
                  <input 
                    type="number" 
                    value={workDays}
                    onChange={(e) => setWorkDays(e.target.value)}
                    style={{...inputStyle, backgroundColor: "white"}}
                    min="0"
                    max="31"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontWeight: "bold", marginBottom: 5 }}>Total Days:</label>
                  <input 
                    type="number" 
                    value={totalDays}
                    onChange={(e) => setTotalDays(e.target.value)}
                    style={{...inputStyle, backgroundColor: "white"}}
                    min="1"
                    max="31"
                  />
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 14, color: "#007bff", fontWeight: "600" }}>
                💰 Net Pay auto-updates: ₹ {payable.toLocaleString()}
              </div>
            </div>
          )}
          
          <div ref={slipRef} style={slipContainerStyle}>
            <div style={{ backgroundColor: "#FFB847", color: "black", fontWeight: "800", fontSize: 18, padding: "16px 0", textAlign: "center", letterSpacing: "2px" }}>
              VJC IMMIGRATION AND VISA CONSULTANT (P) LTD.
            </div>

            <div style={{ color: "#131212", fontWeight: "bold", fontSize: 20, padding: "12px 0", textAlign: "center", borderBottom: "1px solid #cca038" }}>
              Payroll Slip for {payrollMonth}
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: "20px 24px", justifyContent: "space-between", fontSize: 14 }}>
              <table style={{ flex: 1, minWidth: 320, border: "none" }}>
                <tbody>
                  <InfoRow label="Id No" value={slip.employee_id} />
                  <InfoRow label="Name" value={slip.employee_name} />
                  <InfoRow label="Bank A/c No" value={slip.bank_account} />
                  <InfoRow label="IFSC Code" value={slip.ifsc_code} />
                  <InfoRow label="PAN No" value={slip.pan_no} />
                  <InfoRow label="Location" value={slip.location} />
                  <InfoRow label="Department" value={slip.department} />
                  <InfoRow label="Designation" value={slip.role} />
                </tbody>
              </table>
              <table style={{ flex: 1, minWidth: 320, border: "none" }}>
                <tbody>
                  <InfoRow label="DOB" value={formatDate(slip.dob)} />
                  <InfoRow label="DOJ" value={formatDate(slip.doj)} />
                  <InfoRow label="Work Days" value={getDisplayWorkDays()} />
                  <InfoRow label="Days in Month" value={getDisplayTotalDays()} />
                  <InfoRow label="Bank/Pay Mode" value="NEFT" />
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 32, padding: "0 24px" }}>
              <div style={{ flex: 1 }}>
                <SectionTitle title="Earnings" />
                <InfoTable data={earnings} type="earnings" />
              </div>
              <div style={{ flex: 1 }}>
                <SectionTitle title="Deductions" />
                <InfoTable data={deductions} type="deductions" />
              </div>
            </div>

            <div style={{ backgroundColor: "#ffb847", fontWeight: "900", fontSize: 22, padding: "20px 24px", color: "#2c2c2c", textAlign: "right", marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div>Net Pay (Take-home): ₹ {payable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 16, fontWeight: "700", fontStyle: "italic", color: "#444" }}>In Words: {numberToWords(payable)}</div>
            </div>

            <div style={{ fontSize: 13, color: "#333", padding: "24px 32px 40px", borderTop: "1px solid #eee", whiteSpace: "pre-line" }}>
             {`Dear Associate,
We thank you for being part of VJC OVERSEAS family!
Now you can help others looking for job • Ask your friends & family members to visit our VJC OVERSEAS office to submit their resume OR send email to [career@vjcoverseas.com](mailto:career@vjcoverseas.com)
So Hurry!
Mail your queries to [Info@vjcoverseas.com](mailto:Info@vjcoverseas.com) with Name & Employee ID OR Call our Employee Contact Center +91-4066367000, prefix the nearest VJC OVERSEAS office location.
Contact Center Time 9 Am to 8 Pm Monday to Saturday (excluding general holidays)
Important: Please call/mail us with your latest Mobile number and Email id to avoid missing out on important communications.
Note: This is a computer-generated pay slip, no signature is required.`}
            </div>

            <div style={{ fontSize: 14, color: "#222", textAlign: "center", padding: "0 32px 32px" }}>
                 <div
              style={{
                marginTop: 16,
                fontWeight: "bold",
                color: "#0047ab",
                fontSize: 15,
                display: "flex",
                justifyContent: "center",
                gap: 24,
              }}
            >
              <a href={`mailto:${office.contact.email}`} style={{ color: "#0047ab", textDecoration: "underline" }}>
                {office.contact.email}
              </a>
              <span>{office.contact.phone}</span>
            </div>
              <span style={{ fontWeight: "bold", color: "#701799", fontSize: 16 }}>{office.title}</span>
              <div style={{ marginTop: 6, fontWeight: "600" }}>{office.lines.join(", ")}</div>
              <div style={{ marginTop: 12, fontWeight: "bold" }}>CIN: U74120TG2015PTC101229</div>
              <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#666",
                fontStyle: "italic",
                lineHeight: 1.3,
              }}
            >
              This Document issued by VJC OVERSEAS. If any Unauthorized use, disclosure, dissemination or copying of this document is strictly prohibited and may be unlawful.
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <tr>
      <td style={{ padding: "3px 7px", color: "#490070", width: 130, fontWeight: "600" }}>{label}</td>
      <td style={{ width: 6, color: "#490070" }}>:</td>
      <td style={{ color: "#261757", fontWeight: "600" }}>{value}</td>
    </tr>
  );
}

function SectionTitle({ title }) {
  return (
    <div style={{ marginTop: 6, marginBottom: 8, backgroundColor: "#ffb847", color: "#131212", padding: "8px 16px", borderRadius: 6, fontWeight: "bold", fontSize: 18, width: 140 }}>{title}</div>
  );
}

function InfoTable({ data, type }) {
  const sum = data.reduce((acc, item) => acc + Number(item.amount), 0);
  return (
    <table style={tableStyle}>
      <thead><tr><th style={thStyle}>DESCRIPTION</th><th style={thStyle}>AMOUNT (₹)</th></tr></thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td style={tdStyle}>{row.desc}</td>
            <td style={tdStyle}>{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
        ))}
        <tr>
          <td style={{ ...tdStyle, fontWeight: "bold" }}>{type === "earnings" ? "TOTAL EARNINGS" : "TOTAL DEDUCTIONS"}</td>
          <td style={{ ...tdStyle, fontWeight: "bold" }}>{sum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>
  );
}

const inputStyle = { padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", marginTop: "5px" };
const btnStyleAction = { backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: 6, padding: "12px 24px", cursor: "pointer", fontWeight: "600" };
const btnStyle = { backgroundColor: "#151618", color: "#fff", border: "none", borderRadius: 6, padding: "10px 18px", cursor: "pointer", fontWeight: "600" };
const slipContainerStyle = { background: "white", boxShadow: "0 0 18px rgb(0 0 0 / 0.12)", borderRadius: 12, overflow: "hidden" };
const tableStyle = { width: "100%", borderCollapse: "collapse", marginBottom: 8 };
const thStyle = { backgroundColor: "#fdf5e6", padding: "10px 13px", border: "1px solid #d6c18f", textAlign: "left" };
const tdStyle = { padding: "8px 12px", border: "1px solid #d6c18f", fontWeight: "600" };

export default ChairmanPayrollSlip;
