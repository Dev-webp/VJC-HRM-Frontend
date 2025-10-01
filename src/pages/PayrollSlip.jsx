/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Dynamic baseUrl for local development or production backend
const baseUrl = window.location.hostname === "localhost"
  ? "http://localhost:5000"  // Change if your local backend runs on a different port
  : "https://backend.vjcoverseas.com";

function PayrollSlip() {
  const [month, setMonth] = useState(() => new Date().toISOString().substr(0, 7));
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const slipRef = useRef();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    axios
      .get(`${baseUrl}/me`, { withCredentials: true })
      .then((res) => setProfile(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!month) return;
    setLoading(true);
    setError(null);
    setSlip(null);
    axios
      .post(
        `${baseUrl}/payroll/auto-generate-slip`,
        { month },
        { withCredentials: true }
      )
      .then((res) => setSlip(res.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          setError("No payroll slip data found for selected month.");
        } else {
          setError("Failed to load payroll slip.");
        }
      })
      .finally(() => setLoading(false));
  }, [month]);

  const getDaysInMonth = (monthStr) => {
    if (!monthStr) return "-";
    const [year, m] = monthStr.split("-").map(Number);
    return new Date(year, m, 0).getDate();
  };

  // Convert number to words (Indian Rupees). Limited for demo.
  const numberToWords = (num) => {
    if (!num) return "Zero Rupees";
    const a = [
      "",
      "One ",
      "Two ",
      "Three ",
      "Four ",
      "Five ",
      "Six ",
      "Seven ",
      "Eight ",
      "Nine ",
      "Ten ",
      "Eleven ",
      "Twelve ",
      "Thirteen ",
      "Fourteen ",
      "Fifteen ",
      "Sixteen ",
      "Seventeen ",
      "Eighteen ",
      "Nineteen ",
    ];
    const b = [
      "",
      "",
      "Twenty ",
      "Thirty ",
      "Forty ",
      "Fifty ",
      "Sixty ",
      "Seventy ",
      "Eighty ",
      "Ninety ",
    ];
    const numStr = num.toFixed(2).toString();
    const [intPart, decimalPart] = numStr.split(".");
    let n = parseInt(intPart, 10);
    if (n === 0) return "Zero Rupees";
    let str = "";
    if (n > 99999999) return "Amount too large";
    const units = [
      { div: 10000000, name: "Crore " },
      { div: 100000, name: "Lakh " },
      { div: 1000, name: "Thousand " },
      { div: 100, name: "Hundred " },
    ];
    for (let i = 0; i < units.length; i++) {
      const val = Math.floor(n / units[i].div);
      if (val > 0) {
        if (units[i].div === 100) {
          str += a[val] + units[i].name;
        } else {
          str += numberToWords(val) + units[i].name;
        }
        n %= units[i].div;
      }
    }
    if (n > 0) {
      if (n < 20) str += a[n];
      else str += b[Math.floor(n / 10)] + a[n % 10];
    }
    str += "Rupees";
    if (decimalPart && decimalPart !== "00") {
      const paise = parseInt(decimalPart);
      str += " and " + numberToWords(paise) + "Paise";
    }
    return str.trim();
  };

  let earnings = [];
  let deductions = [];
  if (slip) {
    const totalSalary = Number(slip.base_salary) || 0;
    const payable = Number(slip.payable_salary) || 0;
    const basic = Math.round(totalSalary * 0.6);
    const hra = Math.round(totalSalary * 0.1);
    const conveyance = Math.round(totalSalary * 0.1);
    const workAllowance = totalSalary - basic - hra - conveyance;
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
      { desc: "Leave Deduction", amount: leaveDeduction < 0 ? 0 : leaveDeduction },
    ];
  }

  // Office addresses based on location
  const officeAddresses = {
    bangalore: {
      title: "VJC Overseas-Bangalore",
      url: "https://www.vjcoverseas.com/bangalore",
      lines: [
        "16 & 17, Ground Floor, Raheja Arcade, 5th Block, Koramangala,",
        "Bangalore, India, 560095",
      ],
      contact: {
        email: "Info@vjcoverseas.com",
        phone: "+91-4066367000",
      },
    },
    hyderabad: {
      title: "VJC Overseas-HYDERABAD",
      url: "https://www.vjcoverseas.com/hyderabad",
      lines: [
        "62/A, Ground Floor, Sundari Reddy Bhavan, Fresh Mart,",
        "Vengalrao Nagar, Sanjeeva Reddy Nagar, Hyderabad, Telangana, 500038",
      ],
      contact: {
        email: "Info@vjcoverseas.com",
        phone: "+91-4066367000",
      },
    },
  };

  // determine location key for address (default bangalore)
  const loc = (profile?.location || slip?.location || "").toLowerCase();
  const locationKey = loc.includes("hyderab") ? "hyderabad" : "bangalore";
  const office = officeAddresses[locationKey];

  // Format payroll month heading
  const payrollMonth = month
    ? new Date(month + "-01").toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "-";

  // Download CSV function
  const downloadCSV = () => {
    if (!slip) return;
    let csv = `Payroll Slip,${profile?.name || slip.employee_name}\nMonth,${slip.month}\nPayable Salary,${slip.payable_salary}\n\n`;
    csv += "Earnings,Amount\n";
    earnings.forEach((r) => {
      csv += `${r.desc},${r.amount}\n`;
    });
    csv += "\nDeductions,Amount\n";
    deductions.forEach((r) => {
      csv += `${r.desc},${r.amount}\n`;
    });
    csv += `\nBank A/c No,${profile?.bankAccount || profile?.bank_account || slip.bank_account || "-"}\n`;
    csv += `PAN No,${profile?.panNo || profile?.pan_no || slip.pan_no || "-"}\n`;
    csv += `IFSC Code,${profile?.ifscCode || profile?.ifsc_code || slip.ifsc_code || "-"}\n`;
    csv += `Work Days,${slip?.work_days || slip?.workDays || "-"}\n`;
    csv += `Bank/Pay Mode,NEFT\n`;
    csv += `\nOffice Address:\n`;
    csv += `${office.title}\n${office.lines.join("\n")}\n`;
    csv += `\nCIN: U74120TG2015PTC101229\n`;
    csv += `\nThis Document issued by VJC OVERSEAS. If any Unauthorized use, disclosure, dissemination or copying of this document is strictly prohibited and may be unlawful.\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Payslip_${profile?.name || slip.employee_name}_${slip.month}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Download PDF function
  const downloadPDF = async () => {
    if (!slipRef.current) return;
    const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 12, pdfWidth, pdfHeight);
    pdf.save(`Payslip_${profile?.name || slip.employee_name}.pdf`);
  };

  // Download PNG function
  const downloadPNG = async () => {
    if (!slipRef.current) return;
    const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = imgData;
    a.download = `Payslip_${profile?.name || slip.employee_name}.png`;
    a.click();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const dt = new Date(dateStr);
    return dt.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div style={{ maxWidth: 820, margin: "2rem auto", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: 8 }}>👤 Employee auto Payroll Slip</h2>
      <div style={{ margin: "20px 0" }}>
        {/* Month selector below header */}
        <div
          style={{
            textAlign: "center",
            padding: "16px 0 24px",
            borderBottom: "1px solid #eee",
          }}
        >
          <label style={{ fontWeight: "bold", fontSize: 16, userSelect: "none" }}>
            Select Month:{" "}
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ marginLeft: 12, padding: 6, fontSize: 16 }}
            />
          </label>
        </div>
        <button onClick={downloadPDF} disabled={!slip} style={btnStyle}>
          ⏳ Download PDF
        </button>
        <button onClick={downloadPNG} disabled={!slip} style={btnStyle}>
          📷 Download PNG
        </button>
        <button onClick={downloadCSV} disabled={!slip} style={btnStyle}>
          📄 Download CSV
        </button>
      </div>

      {loading && <p>Loading payroll slip...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {slip && (
        <div ref={slipRef} style={slipContainerStyle}>
          {/* Company Name Heading */}
          <div
            style={{
              backgroundColor: "#FFB847",
              color: "black",
              fontWeight: "800",
              fontSize: 18,
              padding: "16px 0",
              textAlign: "center",
              letterSpacing: "2px",
              userSelect: "none",
            }}
          >
            VJC IMMIGRATION AND VISA CONSULTANT (P) LTD.
          </div>

          {/* Payroll Month Header */}
          <div
            style={{
              color: "#131212",
              fontWeight: "bold",
              fontSize: 20,
              padding: "12px 0",
              textAlign: "center",
              userSelect: "none",
              borderBottom: "1px solid #cca038",
            }}
          >
            Payroll Slip for {payrollMonth}
          </div>

          {/* Employee Info Tables */}
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              padding: "0 24px",
              justifyContent: "space-between",
              marginBottom: 28,
              fontSize: 14,
            }}
          >
            <table style={{ flex: 1, minWidth: 320, border: "none" }}>
              <tbody>
                <InfoRow label="Id No" value={profile?.employeeId || slip.employee_id || "-"} />
                <InfoRow label="Name" value={profile?.name || slip.employee_name || "-"} />
                <InfoRow
                  label="Bank A/c No"
                  value={profile?.bankAccount || slip.bank_account || "-"}
                />
                <InfoRow label="IFSC Code" value={profile?.ifscCode || slip.ifsc_code || "-"} />
                <InfoRow label="PAN No" value={profile?.panNo || slip.pan_no || "-"} />
                <InfoRow label="Location" value={profile?.location || slip.location || "-"} />
                <InfoRow label="Department" value={profile?.department || slip.department || "-"} />
                <InfoRow label="Designation" value={profile?.role || slip.role || "-"} />
              </tbody>
            </table>
            <table style={{ flex: 1, minWidth: 320, border: "none" }}>
              <tbody>
                <InfoRow label="DOB" value={formatDate(profile?.dob || slip.dob)} />
                <InfoRow label="DOJ" value={formatDate(profile?.doj || slip.doj)} />
                <InfoRow label="Work Days" value={slip?.work_days || slip?.workDays || "-"} />
                <InfoRow label="Days in Month" value={getDaysInMonth(month)} />
                <InfoRow label="Bank/Pay Mode" value="NEFT" />
              </tbody>
            </table>
          </div>

          {/* Earnings & Deductions */}
          <div
            style={{
              display: "flex",
              gap: 32,
              padding: "0 24px",
            }}
          >
            <div style={{ flex: 1 }}>
              <SectionTitle title="Earnings" />
              <InfoTable data={earnings} type="earnings" />
            </div>
            <div style={{ flex: 1 }}>
              <SectionTitle title="Deductions" />
              <InfoTable data={deductions} emptyText="No deductions" type="deductions" />
            </div>
          </div>

          {/* Net Pay Section */}
          <div
            style={{
              backgroundColor: "#ffb847",
              fontWeight: "900",
              fontSize: 22,
              padding: "20px 24px",
              borderRadius: "0 0 12px 12px",
              color: "#2c2c2c",
              textAlign: "right",
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              userSelect: "none",
            }}
          >
            <div>
              Net Pay (Take-home): ₹{" "}
              {(slip.payable_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: "700",
                fontStyle: "italic",
                color: "#444",
                textAlign: "right",
              }}
            >
              In Words: {numberToWords(Number(slip.payable_salary))}
            </div>
          </div>

          {/* Message Section */}
          <div
            style={{
              whiteSpace: "pre-line",
              fontSize: 13,
              lineHeight: 1.4,
              color: "#333",
              padding: "24px 32px 40px",
              borderTop: "1px solid #eee",
              userSelect: "text",
            }}
          >
            {`Dear Associate,
We thank you for being part of VJC OVERSEAS family!
Now you can help others looking for job • Ask your friends & family members to visit our VJC OVERSEAS office to submit their resume OR send email to [career@vjcoverseas.com](mailto:career@vjcoverseas.com)
So Hurry!
Mail your queries to [Info@vjcoverseas.com](mailto:Info@vjcoverseas.com) with Name & Employee ID OR Call our Employee Contact Center +91-4066367000, prefix the nearest VJC OVERSEAS office location.
Contact Center Time 9 Am to 8 Pm Monday to Saturday (excluding general holidays)
Important: Please call/mail us with your latest Mobile number and Email id to avoid missing out on important communications.
Note: This is a computer-generated pay slip, no signature is required.`}
          </div>

          {/* Office Address Block centered and nicely spaced */}
          <div
            style={{
              fontSize: 14,
              color: "#222",
              textAlign: "center",
              padding: "0 32px 32px",
              userSelect: "text",
            }}
          >
            <a
              href={office.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: "bold", color: "#701799", fontSize: 16, textDecoration: "none" }}
            >
              {office.title}
            </a>
            <div style={{ marginTop: 6, fontWeight: "600", lineHeight: "1.4" }}>
              {office.lines.map((line, idx) => (
                <React.Fragment key={idx}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </div>
            {/* Contact details side by side */}
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
            <div style={{ marginTop: 12, fontWeight: "bold" }}>
              CIN: U74120TG2015PTC101229
            </div>
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
      )}
    </div>
  );
}

// Utility Components for display
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
    <div
      style={{
        marginTop: 6,
        marginBottom: 8,
        backgroundColor: "#ffb847",
        color: "#131212",
        padding: "8px 16px",
        borderRadius: 6,
        fontWeight: "bold",
        fontSize: 18,
        width: 140,
        userSelect: "none",
      }}
    >
      {title}
    </div>
  );
}

function InfoTable({ data, emptyText = "No data", type }) {
  if (!data.length) {
    return (
      <table style={tableStyle}>
        <tbody>
          <tr>
            <td style={{ ...tdStyle, textAlign: "center" }} colSpan={2}>
              {emptyText}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
  const sum = data.reduce((acc, item) => acc + Number(item.amount), 0);
  const totalLabel = type === "earnings" ? "TOTAL EARNINGS" : "TOTAL DEDUCTIONS";
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>DESCRIPTION</th>
          <th style={thStyle}>AMOUNT (₹)</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td style={tdStyle}>{row.desc}</td>
            <td style={tdStyle}>
              {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        ))}
        <tr>
          <td style={{ ...tdStyle, fontWeight: "bold" }}>{totalLabel}</td>
          <td style={{ ...tdStyle, fontWeight: "bold" }}>
            {sum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// Styles
const slipContainerStyle = {
  background: "white",
  boxShadow: "0 0 18px rgb(0 0 0 / 0.12)",
  borderRadius: 12,
  fontSize: 15,
  overflow: "hidden",
};

const btnStyle = {
  marginRight: 12,
  backgroundColor: "#151618",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "10px 18px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: 16,
  userSelect: "none",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: 8,
  boxShadow: "0 0 6px #eee",
};

const thStyle = {
  backgroundColor: "#fdf5e6",
  padding: "10px 13px",
  border: "1px solid #d6c18f",
  fontWeight: "bold",
  textAlign: "left",
};

const tdStyle = {
  padding: "8px 12px",
  border: "1px solid #d6c18f",
  fontWeight: "600",
};

export default PayrollSlip;
