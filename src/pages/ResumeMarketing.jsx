/* eslint-disable */
// ResumeMarketing.jsx — VJC Overseas Premium Resume Builder
// Real-time WYSIWYG editor: drag image anywhere, inline text edit, format toolbar
// Times New Roman throughout, 5 premium layouts, 35 countries

import React, { useState, useRef, useEffect, useCallback, useReducer } from "react";

const BASE = process.env.REACT_APP_API_URL || "https://backend.vjcoverseas.com";
// ─── COUNTRY DATA ─────────────────────────────────────────────────────────────
const COUNTRY_GROUPS = [
  {
    group: "Europe", emoji: "🌍",
    countries: [
      { key:"uk",          label:"UK / Ireland",        flag:"🇬🇧", desc:"2-page CV, personal statement",   photoRequired:false },
      { key:"germany",     label:"Germany",             flag:"🇩🇪", desc:"Lebenslauf, photo, DOB",           photoRequired:true  },
      { key:"france",      label:"France",              flag:"🇫🇷", desc:"Elegant, photo optional",          photoRequired:true  },
      { key:"european",    label:"Europass",            flag:"🇪🇺", desc:"Two-column, photo, DOB",            photoRequired:true  },
      { key:"netherlands", label:"Netherlands",         flag:"🇳🇱", desc:"Skills-first, clean",              photoRequired:false },
      { key:"sweden",      label:"Sweden",              flag:"🇸🇪", desc:"Minimalist Nordic style",          photoRequired:false },
      { key:"switzerland", label:"Switzerland",         flag:"🇨🇭", desc:"Precise, photo",                  photoRequired:true  },
      { key:"spain",       label:"Spain",               flag:"🇪🇸", desc:"Photo, DOB, formal",               photoRequired:true  },
      { key:"italy",       label:"Italy",               flag:"🇮🇹", desc:"Curriculum Vitae",                 photoRequired:true  },
      { key:"poland",      label:"Poland",              flag:"🇵🇱", desc:"Photo, GDPR clause",               photoRequired:true  },
    ]
  },
  {
    group: "Middle East & Asia", emoji: "🌏",
    countries: [
      { key:"gulf",        label:"Gulf / Middle East",  flag:"🌏", desc:"Photo, visa status, 3 pages",      photoRequired:true  },
      { key:"dubai",       label:"Dubai / UAE",         flag:"🇦🇪", desc:"Luxury format, photo",            photoRequired:true  },
      { key:"saudi",       label:"Saudi Arabia",        flag:"🇸🇦", desc:"Photo, Iqama number",             photoRequired:true  },
      { key:"singapore",   label:"Singapore",           flag:"🇸🇬", desc:"Corporate, photo",                photoRequired:true  },
      { key:"india",       label:"India",               flag:"🇮🇳", desc:"Objective, detailed, declaration",photoRequired:false },
      { key:"japan",       label:"Japan",               flag:"🇯🇵", desc:"Rirekisho style, photo",          photoRequired:true  },
      { key:"china",       label:"China",               flag:"🇨🇳", desc:"Photo, formal",                  photoRequired:true  },
      { key:"southkorea",  label:"South Korea",         flag:"🇰🇷", desc:"Self-intro essay, photo",         photoRequired:true  },
      { key:"philippines", label:"Philippines",         flag:"🇵🇭", desc:"Photo, character refs",           photoRequired:true  },
    ]
  },
  {
    group: "Americas", emoji: "🌎",
    countries: [
      { key:"us",          label:"USA (ATS)",           flag:"🇺🇸", desc:"Single-column, ATS-clean",        photoRequired:false },
      { key:"canadian",    label:"Canada",              flag:"🇨🇦", desc:"Hybrid US/UK, no photo",          photoRequired:false },
      { key:"brazil",      label:"Brazil",              flag:"🇧🇷", desc:"Photo, DOB, CPF",                 photoRequired:true  },
      { key:"mexico",      label:"Mexico",              flag:"🇲🇽", desc:"Photo, CURP, Spanish",            photoRequired:true  },
    ]
  },
  {
    group: "Pacific & Africa", emoji: "🦘",
    countries: [
      { key:"australian",  label:"Australia",           flag:"🇦🇺", desc:"Achievement-focused",             photoRequired:false },
      { key:"nz",          label:"New Zealand",         flag:"🇳🇿", desc:"Warm, two referees",              photoRequired:false },
      { key:"southafrica", label:"South Africa",        flag:"🇿🇦", desc:"Photo, ID number",               photoRequired:true  },
      { key:"nigeria",     label:"Nigeria",             flag:"🇳🇬", desc:"Photo, detailed, referees",       photoRequired:true  },
    ]
  },
];
const ALL_COUNTRIES = COUNTRY_GROUPS.flatMap(g => g.countries);

// ─── TEMPLATE DEFINITIONS ─────────────────────────────────────────────────────
const TEMPLATE_DEFS = [
  {
    id: "executive",
    name: "Executive Dark",
    icon: "◼",
    desc: "Dark header, gold accents, serif gravitas",
    preview: { bg: "#1a1a2e", accent: "#c9a84c", layout: "classic" }
  },
  {
    id: "modern",
    name: "Modern Split",
    icon: "▨",
    desc: "Bold two-column sidebar layout",
    preview: { bg: "#1e3a8a", accent: "#60a5fa", layout: "two-col" }
  },
  {
    id: "minimal",
    name: "Minimal Pro",
    icon: "—",
    desc: "Ultra clean, hairline rules, whitespace",
    preview: { bg: "#111827", accent: "#111827", layout: "minimal" }
  },
  {
    id: "creative",
    name: "Prestige",
    icon: "◈",
    desc: "Rich burgundy, gold ruled, magazine feel",
    preview: { bg: "#6b1c1c", accent: "#c9a84c", layout: "sidebar" }
  },
  {
    id: "classic",
    name: "Classic Pro",
    icon: "≡",
    desc: "Traditional, formal, elegant serif",
    preview: { bg: "#1a3a1a", accent: "#2d6a2d", layout: "classic" }
  },
];

const COUNTRY_COLORS = {
  uk:{ executive:"#1a2e3b", modern:"#1e3a8a", minimal:"#2d3748", creative:"#6b1c1c", classic:"#1e3a5f" },
  germany:{ executive:"#1a1a2e", modern:"#7f1d1d", minimal:"#2d3748", creative:"#1a3a1a", classic:"#1a237e" },
  france:{ executive:"#1d1d6e", modern:"#be123c", minimal:"#1f2937", creative:"#4a1942", classic:"#1d4ed8" },
  india:{ executive:"#7c2d12", modern:"#1d4ed8", minimal:"#2d3748", creative:"#6b1c1c", classic:"#c2410c" },
  us:{ executive:"#111827", modern:"#1e3a8a", minimal:"#2d3748", creative:"#6b1c1c", classic:"#0f5132" },
  dubai:{ executive:"#78350f", modern:"#1e3a8a", minimal:"#2d3748", creative:"#6b1c1c", classic:"#78350f" },
  gulf:{ executive:"#78350f", modern:"#1e40af", minimal:"#2d3748", creative:"#6b1c1c", classic:"#78350f" },
  australian:{ executive:"#1d5c37", modern:"#c2410c", minimal:"#2d3748", creative:"#1a3a4a", classic:"#1e3a8a" },
  japan:{ executive:"#1f2937", modern:"#be123c", minimal:"#2d3748", creative:"#1a1a2e", classic:"#1a1a1a" },
};

// ─── GROQ API CALL ────────────────────────────────────────────────────────────
const callGroq = async (prompt, maxTokens = 7000, onStatus, retry = 0) => {
  let res;
  try {
    res = await fetch(`${BASE}/api/groq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTokens }),
    });
  } catch (e) { throw new Error(`Cannot reach server: ${e.message}`); }

  if (res.status === 429) {
    const err = await res.json().catch(() => ({}));
    const wait = err.retryAfter || 30;
    if (retry < 1) {
      for (let i = wait; i > 0; i--) {
        onStatus?.(`⏳ Rate limited — retrying in ${i}s…`);
        await new Promise(r => setTimeout(r, 1000));
      }
      return callGroq(prompt, maxTokens, onStatus, retry + 1);
    }
    throw new Error(`Rate limited. Wait ${wait}s and try again.`);
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Error ${res.status}: ${e.message || "Unknown"}`);
  }
  const data = await res.json();
  if (data.text) return data.text;
  throw new Error("Empty AI response");
};

const logUsage = async (payload) => {
  try {
    await fetch(`${BASE}/api/resume/log`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(payload),
    });
  } catch (e) { console.warn("Log failed:", e.message); }
};

const extractText = (file, onProgress) => new Promise((res, rej) => {
  const ext = file.name.split(".").pop().toLowerCase();
  if (file.size > 5 * 1024 * 1024) { rej(new Error("File too large (max 5MB)")); return; }
  if (ext === "txt") {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Cannot read file"));
    r.readAsText(file);
  } else if (ext === "docx" || ext === "doc") {
    const r = new FileReader();
    r.onload = async () => {
      if (!window.mammoth) { rej(new Error("mammoth.js not loaded")); return; }
      try { const out = await window.mammoth.extractRawText({ arrayBuffer: r.result }); res(out.value || ""); }
      catch (e) { rej(new Error(`Word parse error: ${e.message}`)); }
    };
    r.readAsArrayBuffer(file);
  } else if (ext === "pdf") {
    const r = new FileReader();
    r.onload = async () => {
      if (!window.pdfjsLib) { rej(new Error("pdf.js not loaded")); return; }
      try {
        const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(r.result) }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          onProgress?.(`Reading PDF page ${i}/${pdf.numPages}…`);
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(x => x.str).join(" ") + "\n";
        }
        const clean = text.replace(/\s{3,}/g, "\n").trim();
        if (clean.length < 30) rej(new Error("PDF has no readable text (scanned image?)"));
        else res(clean);
      } catch (e) { rej(new Error(`PDF error: ${e.message}`)); }
    };
    r.readAsArrayBuffer(file);
  } else { rej(new Error(`Unsupported: .${ext}. Use .txt, .pdf, .docx`)); }
});

const injectPhoto = (html, b64) => {
  if (!b64 || !html) return html;
  return html.replace(/src="__PHOTO__"/g, `src="${b64}"`);
};

const downloadHtml = (html, name) => {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

// ─── BUILD AI PROMPT (Times New Roman everywhere) ────────────────────────────
const buildResumePrompt = ({ data: d, country, tmpl, hasPhoto, jdText }) => {
  const cc = COUNTRY_COLORS[country] || {};
  const accentColor = cc[tmpl.id] || tmpl.preview.bg;
  const countryObj = ALL_COUNTRIES.find(c => c.key === country) || {};

  const name   = d.name    || "Candidate";
  const skills = (d.skills || []).join(", ") || "Listed in experience";
  const langs  = (d.languages || []).join(", ") || "English";
  const certs  = (d.certifications || []).join(", ") || "N/A";
  const hobby  = (d.hobbies || []).join(", ");
  const dob    = d.dob     || "[Date of Birth]";
  const nat    = d.nationality || "[Nationality]";

  const photoHtml = hasPhoto
    ? `<img src="__PHOTO__" id="resume-photo" style="width:110px;height:138px;object-fit:cover;border-radius:3px;border:2px solid ${accentColor};display:block;position:absolute;cursor:move;" data-draggable="true">`
    : `<div id="resume-photo-placeholder" style="width:110px;height:138px;background:#f5f5f5;border:2px dashed #ccc;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:11px;font-family:'Times New Roman',serif;flex-direction:column;gap:4px;position:absolute;cursor:move;" data-draggable="true"><span style="font-size:28px;">👤</span><span>PHOTO</span></div>`;

  const expBlock = (d.experience || []).map((e, i) =>
    `ROLE ${i+1}: ${e.role || "Role"} at ${e.company || "Company"}\nDates: ${e.duration || ""} | Location: ${e.location || ""}\nAchievements:\n${(e.achievements || []).map(a => `  • ${a}`).join("\n")}`
  ).join("\n\n");

  const eduBlock = (d.education || []).map(e =>
    `• ${e.degree || ""} | ${e.institution || ""} | ${e.year || ""} | ${e.grade || ""}`
  ).join("\n");

  const FONT = "'Times New Roman', Times, serif";

  const layouts = {
    executive: `
LAYOUT — EXECUTIVE DARK (single column, gold on dark):
• ENTIRE DOCUMENT: font-family: 'Times New Roman', Times, serif — NO exceptions.
• Full-width header: background:${accentColor}; padding:36px 48px 32px; position:relative;
  - Name: 38px, color:#ffffff, font-weight:bold, letter-spacing:2px, font-family:'Times New Roman',Times,serif
  - Title beneath: 15px, color:rgba(255,255,255,0.75), font-style:italic, margin-top:4px
  - Thin gold rule 2px solid rgba(201,168,76,0.5) between name and contact
  - Contact row: 11px, color:rgba(255,255,255,0.65), display:flex, gap:24px, margin-top:12px
  ${countryObj.photoRequired ? `- Photo: ${photoHtml} positioned top:24px; right:48px;` : ""}
• Body: background:#ffffff; padding:0 48px 48px;
• Section headers: font-size:11px; font-weight:bold; color:${accentColor}; letter-spacing:3px; text-transform:uppercase; padding:18px 0 6px; border-bottom:1.5px solid ${accentColor}; margin-bottom:14px; font-family:'Times New Roman',Times,serif;
• Left sidebar accent: none — single column
• Experience entries: role name bold 13px ${accentColor}, company 12px #444, date right-aligned 11px #888, bullets 11.5px #333 line-height:1.9
• Skills: displayed as comma-separated inline text, wrapped in a light ${accentColor}11 background box, 12px, italic
• Color scheme: white body, ${accentColor} header, gold accent lines`,

    modern: `
LAYOUT — MODERN SPLIT (two-column, bold left sidebar):
• ENTIRE DOCUMENT: font-family: 'Times New Roman', Times, serif — NO exceptions.
• Outer wrapper: display:flex; min-height:1123px; (A4 height)
• LEFT SIDEBAR (width:300px; min-width:300px; background:${accentColor}; padding:36px 28px; color:#ffffff):
  - ${countryObj.photoRequired ? `Photo at top: ${photoHtml} position:relative; margin-bottom:20px; width:100%; height:160px; object-fit:cover; object-position:top; border-radius:4px; border:none;` : ""}
  - Name: 22px bold white, font-family:'Times New Roman',serif; margin-bottom:4px
  - Title: 13px italic rgba(255,255,255,0.75)
  - Divider: 1px solid rgba(255,255,255,0.25) margin:16px 0
  - Contact items: 11px white, line-height:2, each item with small icon prefix (📱 📧 📍 🔗)
  - Section label: 9px ALL CAPS letter-spacing:3px rgba(255,255,255,0.5), margin:20px 0 10px
  - Skills: each as white pill tag, background:rgba(255,255,255,0.15), padding:4px 12px, border-radius:20px, font-size:11px, display:inline-block, margin:3px 3px
  - Languages: name + dot-indicator (●●●●○) for level
  - Education: 11.5px white, institution bold, degree italic, year small
• RIGHT COLUMN (flex:1; background:#ffffff; padding:36px 36px):
  - Professional Summary: box with left-border 4px solid ${accentColor}, padding:14px 16px, background:#fafafa, font-size:13px italic, line-height:1.9
  - Section headers: 12px CAPS letter-spacing:2px color:${accentColor} border-bottom:2px solid ${accentColor} padding-bottom:6px margin:24px 0 14px
  - Experience: role 14px bold ${accentColor}, company 13px #555, dates badge background:${accentColor}11 color:${accentColor} font-size:10px padding:2px 8px border-radius:4px
  - Bullet achievements: 12px #333 line-height:1.8, left-border 2px solid ${accentColor}22, padding-left:12px margin-left:4px`,

    minimal: `
LAYOUT — MINIMAL PRO (ultra clean, maximum whitespace):
• ENTIRE DOCUMENT: font-family: 'Times New Roman', Times, serif — NO exceptions.
• Body: background:#ffffff; max-width:794px; padding:64px 72px;
• Header: NO background — just typography on white
  - Name: 44px font-weight:300 color:#111 letter-spacing:1px font-family:'Times New Roman',serif
  - Title: 14px font-weight:400 color:#666 font-style:italic margin-top:2px
  - Contact: 11px color:#888 border-top:1px solid #e5e5e5 padding-top:12px margin-top:14px display:flex gap:32px
  ${countryObj.photoRequired ? `- Photo floated: ${photoHtml} float:right; margin-left:32px; margin-top:-60px;` : ""}
• Section headers: font-size:10px; ALL CAPS; letter-spacing:5px; color:#999; padding:28px 0 10px; border-bottom:0.5px solid #e0e0e0; margin-bottom:16px; font-family:'Times New Roman',serif;
• Section content: font-size:12px color:#333 line-height:2
• Experience: role 13px #111 font-style:italic, dates 11px #aaa float:right, company 12px #555, bullets minimal — left-padded 16px, no bullets just em-dash "— "
• Skills: comma-separated inline prose, no pills, no colors
• Very generous whitespace: margin-bottom:32px between sections`,

    creative: `
LAYOUT — PRESTIGE (burgundy/gold magazine editorial):
• ENTIRE DOCUMENT: font-family: 'Times New Roman', Times, serif — NO exceptions.
• Header: background:${accentColor}; padding:0; display:flex; overflow:hidden; min-height:220px;
  - Left photo column (width:180px): background:${accentColor}dd; display:flex; align-items:center; justify-content:center; padding:28px;
    ${countryObj.photoRequired ? `Photo: ${photoHtml} position:relative; width:140px; height:175px; object-fit:cover; border:3px solid rgba(201,168,76,0.6);` : "Left decorative pattern with initials in 64px gold"}
  - Right info column (flex:1; padding:36px 36px; background:${accentColor}):
    Name: 36px bold white font-family:'Times New Roman',serif; letter-spacing:1px
    Decorative rule: 2px solid rgba(201,168,76,0.7) width:80px margin:10px 0
    Title: 14px italic rgba(255,255,255,0.75)
    Contact grid: 2-col, 11px white, gap:8px 24px margin-top:16px
• Body: two columns using CSS grid (grid-template-columns:2fr 1fr; gap:0)
  - Main column (padding:36px 32px 36px 48px background:#fff):
    Section headers: 11px ALL CAPS letter-spacing:3px color:${accentColor} double border-bottom:3px double ${accentColor}22 padding-bottom:8px margin:24px 0 14px
    Experience: company 14px bold #1a1a1a; role 13px italic ${accentColor}; dates 11px #888 float:right
    Bullets: 12px #333 line-height:1.85; decorated with thin gold left-border
  - Right sidebar (width:220px padding:36px 24px background:#fafafa border-left:1px solid #eee):
    Skills section: label 9px CAPS gray, each skill 11.5px #333 padding:5px 0 border-bottom:1px dotted #e0e0e0
    Languages: name + proficiency percentage bar (div background #eee with inner div background ${accentColor})
    Certifications and hobbies: 11px #555`,

    classic: `
LAYOUT — CLASSIC PRO (traditional academic/formal):
• ENTIRE DOCUMENT: font-family: 'Times New Roman', Times, serif — NO exceptions.
• Header: text-align:center; padding:40px 48px 24px; border-bottom:3px double #333; background:#fafaf8;
  - Name: 32px bold #111 font-family:'Times New Roman',serif; text-transform:uppercase; letter-spacing:3px
  - Title: 14px italic #555 margin-top:6px
  - Contact: 12px #666 margin-top:12px; dot-separated (name · email · phone · location)
  ${countryObj.photoRequired ? `- Photo: ${photoHtml} position:absolute; top:28px; right:48px;` : ""}
• Body: padding:0 48px 48px; background:#fafaf8;
• Section headers: full-width background:${accentColor}; color:#ffffff; padding:7px 16px; font-size:12px; font-weight:bold; ALL CAPS; letter-spacing:2px; margin:24px -48px 16px; font-family:'Times New Roman',serif;
• Experience entries: formatted like academic CV
  - Role + Company on same line, separated by " — ", 13px bold #111
  - Date right-aligned 12px italic #666
  - Bullets: standard • at 12px #333 line-height:1.9 indent:24px
• Skills: 2-column grid, each item with • prefix, 12px #333
• Education: tabular with borders, 12px
• References: "Available upon request" in 11px italic center`,
  };

  const jdSection = jdText ? `\n\nJOB DESCRIPTION — TAILOR EVERY BULLET:\n${jdText.slice(0, 1000)}` : "";

  const countryRules = {
    uk: "No photo. No DOB. No nationality. Personal Statement 3-4 lines. 'References available on request'.",
    germany: `Lebenslauf heading. Persönliche Daten: Name, Geburtsdatum: ${dob}, Staatsangehörigkeit: ${nat}. Hobbys: ${hobby || "Sport, Reisen"}. Signature block.`,
    us: "ZERO images. Pure single font column. ATS-clean. No borders, no columns. Core Competencies keyword grid.",
    india: `Personal Details: Father's Name, DOB: ${dob}, Nationality: ${nat||"Indian"}, Marital Status. DECLARATION at end.`,
    gulf: `Personal Details: Nationality: ${nat}, DOB: ${dob}, Visa Status, Languages: ${langs}. Career Objective 4 sentences.`,
    japan: `履歴書 title. 氏名: ${name}, 生年月日: ${dob}. Self-PR paragraphs. Table layout for education.`,
    poland: `GDPR footer (9px italic): "Wyrażam zgodę na przetwarzanie moich danych osobowych..."`,
  };

  return `You are a world-class resume designer and HTML/CSS expert specialising in Times New Roman typography. Generate a complete, print-ready, recruiter-approved resume as a SINGLE self-contained HTML file with an embedded WYSIWYG editor script.

CANDIDATE DATA:
Name: ${name}
Phone: ${d.phone || ""} | Email: ${d.email || ""} | Location: ${d.location || ""} | LinkedIn: ${d.linkedin || ""}
DOB: ${dob} | Nationality: ${nat}
Summary: ${d.summary || "Write a strong professional summary from their experience"}
Skills: ${skills}
Languages: ${langs}
Certifications: ${certs}
Hobbies: ${hobby || "Not mentioned"}
${jdSection}

WORK EXPERIENCE:
${expBlock || "Write 2 appropriate senior roles for their inferred industry"}

EDUCATION:
${eduBlock || "Add appropriate placeholders"}

═══════════════════════════════════════
COUNTRY STANDARD: ${countryObj.label || country.toUpperCase()}
${countryRules[country] || ""}

TEMPLATE: ${tmpl.name}
${layouts[tmpl.id] || layouts.classic}
═══════════════════════════════════════

MANDATORY FONT RULE: Every single element — name, headers, body text, labels, pills, footers — MUST use font-family: 'Times New Roman', Times, serif. This is non-negotiable.

CONTENT RULES:
1. USE ONLY real data above — never invent companies, degrees, or dates.
2. Every bullet: [Action Verb] + [What you did] + [Metric].
3. Add plausible metrics where missing (%, team sizes, timeframes).
4. Minimum 2 full A4 pages of dense, rich content.
5. Weave skills keywords naturally through experience bullets.

HTML/CSS RULES:
- body: background:#eef0f4; font-family:'Times New Roman',Times,serif;
- .resume: background:white; max-width:794px; margin:0 auto; box-shadow:0 0 40px rgba(0,0,0,.18); min-height:1123px; position:relative;
- @media print { body{background:white} .resume{box-shadow:none;margin:0;max-width:100%} @page{size:A4;margin:12mm} }
- All text: 'Times New Roman', Times, serif — on every element explicitly.
- Body text: 11px, line-height:1.85.

EMBEDDED EDITOR SCRIPT — Include this exact <script> block at the end of <body>:
<script>
(function(){
  // Make all text elements contenteditable on click
  document.querySelectorAll('p,span,h1,h2,h3,h4,li,td,div:not([data-no-edit])').forEach(function(el){
    if(el.children.length < 3 && el.textContent.trim().length > 0){
      el.setAttribute('contenteditable','true');
      el.style.outline='none';
      el.style.cursor='text';
      el.addEventListener('focus',function(){this.style.outline='2px dashed rgba(37,99,235,0.4)';this.style.borderRadius='2px';});
      el.addEventListener('blur',function(){this.style.outline='none';});
    }
  });
  // Drag any image or photo placeholder
  document.querySelectorAll('[data-draggable="true"], img').forEach(function(el){
    el.style.cursor='move';
    el.style.position='absolute';
    var ox=0,oy=0,mx=0,my=0,dragging=false;
    el.addEventListener('mousedown',function(e){
      e.preventDefault();
      dragging=true;
      mx=e.clientX; my=e.clientY;
      var rect=el.getBoundingClientRect();
      ox=e.clientX-rect.left; oy=e.clientY-rect.top;
      el.style.zIndex=9999; el.style.opacity='0.85';
    });
    document.addEventListener('mousemove',function(e){
      if(!dragging)return;
      var parent=el.offsetParent||document.body;
      var pr=parent.getBoundingClientRect();
      el.style.left=(e.clientX-pr.left-ox)+'px';
      el.style.top=(e.clientY-pr.top-oy)+'px';
    });
    document.addEventListener('mouseup',function(){
      if(dragging){dragging=false;el.style.opacity='1';el.style.zIndex='';}
    });
  });
})();
</script>

⚠️ OUTPUT RULE: Output ONLY the HTML document.
Start with: <!DOCTYPE html>
End with: </html>
NO markdown. NO backticks. NO explanations.`;
};

// ─── TEMPLATE PREVIEW CARD ────────────────────────────────────────────────────
function TemplatePreviewCard({ tmpl, country, selected, onClick }) {
  const cc = COUNTRY_COLORS[country] || {};
  const accent = cc[tmpl.id] || tmpl.preview.bg;

  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        borderRadius: 12,
        border: selected ? `2.5px solid ${accent}` : "2px solid #e2e8f0",
        overflow: "hidden",
        transition: "all .2s",
        transform: selected ? "translateY(-4px)" : "translateY(0)",
        boxShadow: selected ? `0 10px 32px ${accent}44` : "0 2px 8px rgba(0,0,0,.06)",
        background: "#fff",
      }}
    >
      {/* Mini preview */}
      <div style={{ height: 130, background: "#f8fafc", position: "relative", overflow: "hidden" }}>
        {tmpl.preview.layout === "two-col" || tmpl.preview.layout === "sidebar" ? (
          <>
            <div style={{ position: "absolute", left: 0, top: 0, width: "38%", height: "100%", background: accent }} />
            <div style={{ position: "absolute", right: 0, top: 0, width: "62%", height: "100%", background: "#fff" }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ height: i===0?7:3, width:`${45+(i*11)%40}%`, background:i===0?"#1f2937":"#d1d5db", borderRadius:3, margin:`${i===0?16:8}px 10px 0` }} />
              ))}
            </div>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ position:"absolute", left:8, top:16+i*20, height:3, width:`${50+(i*12)%25}%`, background:"rgba(255,255,255,0.45)", borderRadius:3 }} />
            ))}
          </>
        ) : tmpl.preview.layout === "minimal" ? (
          <>
            <div style={{ position:"absolute", top:20, left:16, right:16 }}>
              <div style={{ height:9, width:"55%", background:"#111", borderRadius:2, marginBottom:6 }} />
              <div style={{ height:3, width:"35%", background:"#aaa", borderRadius:2, marginBottom:14 }} />
              <div style={{ height:0.5, background:"#ddd", marginBottom:12 }} />
              {[0,1,2,3,4].map(i=>(
                <div key={i} style={{ height:2.5, width:`${40+(i*13)%45}%`, background:"#d1d5db", borderRadius:2, marginBottom:7 }} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:52, background:accent }} />
            <div style={{ position:"absolute", top:16, left:16, right:16 }}>
              <div style={{ height:7, width:"50%", background:"rgba(255,255,255,0.9)", borderRadius:2, marginBottom:4 }} />
              <div style={{ height:3, width:"30%", background:"rgba(255,255,255,0.5)", borderRadius:2 }} />
            </div>
            <div style={{ position:"absolute", top:62, left:16, right:16 }}>
              {[0,1,2,3,4].map(i=>(
                <div key={i} style={{ height:3, width:`${42+(i*14)%42}%`, background:"#d1d5db", borderRadius:2, marginBottom:7 }} />
              ))}
            </div>
          </>
        )}
        {selected && (
          <div style={{ position:"absolute", top:8, right:8, width:22, height:22, borderRadius:"50%", background:accent, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, boxShadow:"0 2px 8px rgba(0,0,0,.25)" }}>✓</div>
        )}
      </div>
      <div style={{ padding:"10px 12px 12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
          <span style={{ width:10, height:10, borderRadius:"50%", background:accent, display:"inline-block" }} />
          <span style={{ fontSize:12, fontWeight:800, color:selected?accent:"#1e293b", fontFamily:"'Times New Roman',serif" }}>{tmpl.name}</span>
        </div>
        <div style={{ fontSize:10.5, color:"#64748b", paddingLeft:17, fontFamily:"'Times New Roman',serif" }}>{tmpl.desc}</div>
      </div>
    </div>
  );
}

// ─── REAL-TIME WYSIWYG EDITOR ─────────────────────────────────────────────────
function RealtimeEditor({ html, onHtmlChange, onDownload, fileName, parsedData, country, selectedTmpl, onRegenerate, onBack, onJD }) {
  const iframeRef = useRef();
  const [mode, setMode] = useState("preview");
  const [sourceHtml, setSourceHtml] = useState(html);
  const newPhotoRef = useRef();
  // Keep a ref to the LATEST live html so download always gets current state
  const liveHtmlRef = useRef(html);

  useEffect(() => {
    setSourceHtml(html);
    liveHtmlRef.current = html;
  }, [html]);

  // ── Capture current iframe state (images included as base64) ──────────────
  const captureFromIframe = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return liveHtmlRef.current;
    // Inline any blob/object URLs into data URIs (already base64 in our case)
    const captured = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    return captured;
  };

  const syncToParent = () => {
    const captured = captureFromIframe();
    liveHtmlRef.current = captured;
    setSourceHtml(captured);
    onHtmlChange(captured);
  };

  // ── Handle download — capture live state first ────────────────────────────
  const handleDownload = () => {
    const latest = captureFromIframe();
    // Strip any editor-injected contenteditable attributes for clean download
    const clean = latest
      .replace(/\s*contenteditable="true"/g, '')
      .replace(/\s*data-editing="true"/g, '')
      .replace(/outline:\s*2px dashed[^;]+;/g, '')
      .replace(/outline:\s*none;/g, '');
    const name = fileName || "resume.html";
    const blob = new Blob([clean], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // ── execCommand on the iframe document ───────────────────────────────────
  const execCmd = (cmd, val = null) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.execCommand(cmd, false, val);
    // Don't sync on every keystroke — only on explicit toolbar action
  };

  // ── Swap/inject photo into iframe live ───────────────────────────────────
  const injectPhoto = (file) => {
    const r = new FileReader();
    r.onload = (e) => {
      const b64 = e.target.result;
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;

      // Find existing photo img (any data:image src or __PHOTO__ placeholder)
      const allImgs = doc.querySelectorAll('img');
      let target = null;
      allImgs.forEach(img => {
        if (img.src.startsWith('data:image') || img.getAttribute('src') === '__PHOTO__') {
          if (!target) target = img;
        }
      });

      if (target) {
        target.src = b64;
        target.style.cursor = 'move';
      } else {
        // No existing photo — create a new draggable one
        const img = doc.createElement('img');
        img.src = b64;
        img.id = 'resume-photo-injected';
        img.style.cssText = [
          'width:110px','height:138px','object-fit:cover',
          'border-radius:3px','position:absolute','top:24px','right:48px',
          'cursor:move','z-index:100','border:2px solid #c9a84c',
          'display:block'
        ].join(';');
        const container = doc.querySelector('.resume') || doc.querySelector('header') || doc.body;
        container.style.position = 'relative';
        container.appendChild(img);
        attachDrag(img, doc);
      }
      syncToParent();
    };
    r.readAsDataURL(file);
  };

  // ── Attach drag-and-drop to an element inside the iframe doc ─────────────
  const attachDrag = (el, doc) => {
    let ox = 0, oy = 0, dragging = false;
    el.addEventListener('mousedown', (e) => {
      // Only drag on direct click of the image itself, not text
      if (e.target !== el) return;
      e.preventDefault();
      dragging = true;
      const rect = el.getBoundingClientRect();
      const frameRect = iframeRef.current.getBoundingClientRect();
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      el.style.opacity = '0.8';
      el.style.zIndex = '9999';
    });
    doc.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      e.preventDefault();
      const parent = el.offsetParent || doc.body;
      const pr = parent.getBoundingClientRect();
      const frameRect = iframeRef.current.getBoundingClientRect();
      // clientX/Y inside iframe = e.clientX relative to frame origin
      const relX = e.clientX - pr.left - ox;
      const relY = e.clientY - pr.top - oy;
      el.style.left = Math.max(0, relX) + 'px';
      el.style.top  = Math.max(0, relY) + 'px';
    });
    doc.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        el.style.opacity = '1';
        el.style.zIndex = '';
        syncToParent(); // save new position
      }
    });
  };

  // ── On iframe load — inject editing capabilities without designMode ────────
  const onIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return;

    // 1. Make all text-bearing leaf nodes contenteditable
    const editableSelectors = 'p, span, h1, h2, h3, h4, h5, li, td, th, a, strong, em, b, i, div';
    doc.querySelectorAll(editableSelectors).forEach(el => {
      // Skip wrapper divs that have many children
      const hasBlockChildren = [...el.children].some(c =>
        ['DIV','P','UL','OL','TABLE','SECTION','HEADER','FOOTER','ARTICLE'].includes(c.tagName)
      );
      if (hasBlockChildren) return;
      if (el.textContent.trim().length === 0) return;
      el.setAttribute('contenteditable', 'true');
      el.style.outline = 'none';
      el.style.cursor = 'text';
      el.style.minWidth = '4px';
      el.addEventListener('focus', function() {
        this.style.outline = '1.5px dashed rgba(37,99,235,0.5)';
        this.style.borderRadius = '2px';
      });
      el.addEventListener('blur', function() {
        this.style.outline = 'none';
        syncToParent();
      });
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          // Allow normal enter
        }
      });
    });

    // 2. Attach drag to ALL images
    doc.querySelectorAll('img').forEach(img => {
      img.style.cursor = 'move';
      // Make sure parent is positioned
      if (img.parentElement) {
        const pos = window.getComputedStyle(img.parentElement).position;
        if (pos === 'static') img.parentElement.style.position = 'relative';
      }
      attachDrag(img, doc);
    });

    // 3. Also attach drag to photo placeholder divs
    doc.querySelectorAll('[data-draggable="true"]').forEach(el => {
      el.style.cursor = 'move';
      attachDrag(el, doc);
    });
  };

  const applySource = () => {
    liveHtmlRef.current = sourceHtml;
    onHtmlChange(sourceHtml);
    setMode("preview");
  };

  const TOOLBAR = [
    { label:"B",  cmd:"bold",                title:"Bold"          },
    { label:"I",  cmd:"italic",              title:"Italic"        },
    { label:"U",  cmd:"underline",           title:"Underline"     },
    { label:"S̶", cmd:"strikeThrough",        title:"Strikethrough" },
    { label:"H1", cmd:"formatBlock", val:"h2", title:"Large heading"},
    { label:"H2", cmd:"formatBlock", val:"h3", title:"Sub heading" },
    { label:"¶",  cmd:"formatBlock", val:"p",  title:"Paragraph"   },
    { label:"•",  cmd:"insertUnorderedList", title:"Bullet list"   },
    { label:"1.", cmd:"insertOrderedList",   title:"Numbered list" },
    { label:"⬅", cmd:"justifyLeft",          title:"Align left"    },
    { label:"⬛", cmd:"justifyCenter",        title:"Center"        },
    { label:"➡", cmd:"justifyRight",         title:"Align right"   },
    { label:"↩",  cmd:"undo",               title:"Undo"          },
    { label:"↪",  cmd:"redo",               title:"Redo"          },
  ];

  const COLOR_OPTIONS = ["#000000","#1a1a2e","#6b1c1c","#1e3a8a","#1a3a1a","#c9a84c","#ffffff","#555555","#888888","#dc2626"];
  const HIGHLIGHT_OPTIONS = ["#fef9c3","#dcfce7","#dbeafe","#fce7f3","transparent"];

  return (
    <div style={{ background:"#0f172a", borderRadius:"18px 18px 0 0", overflow:"hidden", border:"1.5px solid #1e293b" }}>

      {/* ── TOP NAV ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background:"#0f172a", borderBottom:"1px solid #1e293b", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", gap:6 }}>
          {["preview","source"].map(m => (
            <button key={m}
              onClick={() => { if (m==="preview" && mode==="source") applySource(); else setMode(m); }}
              style={{ padding:"6px 16px", borderRadius:8, border:"none", cursor:"pointer", background:mode===m?"#2563eb":"#1e293b", color:mode===m?"#fff":"#94a3b8", fontWeight:700, fontSize:12 }}>
              {m === "preview" ? "👁 Preview & Edit" : "{ } Source HTML"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          <input ref={newPhotoRef} type="file" accept="image/*" style={{display:"none"}}
            onChange={e => e.target.files[0] && injectPhoto(e.target.files[0])} />
          <button onClick={() => newPhotoRef.current?.click()}
            style={{ padding:"6px 14px", borderRadius:8, border:"none", background:"#7c3aed", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
            📷 Swap Photo
          </button>
          <button onClick={onRegenerate}
            style={{ padding:"6px 14px", borderRadius:8, border:"none", background:"#1e293b", color:"#94a3b8", fontWeight:700, fontSize:12, cursor:"pointer" }}>
            🔄 Regenerate
          </button>
          <button onClick={onBack}
            style={{ padding:"6px 14px", borderRadius:8, border:"none", background:"#1e293b", color:"#94a3b8", fontWeight:700, fontSize:12, cursor:"pointer" }}>
            ← Templates
          </button>
          <button onClick={onJD}
            style={{ padding:"6px 14px", borderRadius:8, border:"none", background:"#92400e", color:"#fbbf24", fontWeight:700, fontSize:12, cursor:"pointer" }}>
            📋 JD Match
          </button>
          <button onClick={handleDownload}
            style={{ padding:"7px 20px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"#fff", fontWeight:800, fontSize:12, cursor:"pointer", boxShadow:"0 3px 12px #2563eb44" }}>
            ⬇ Download HTML
          </button>
        </div>
      </div>

      {mode === "preview" && (
        <>
          {/* ── FORMAT TOOLBAR ── */}
          <div style={{ display:"flex", alignItems:"center", gap:2, padding:"7px 12px", background:"#1e293b", borderBottom:"1px solid #334155", flexWrap:"wrap" }}>
            {TOOLBAR.map((t, i) => (
              <button key={i} title={t.title}
                onClick={() => execCmd(t.cmd, t.val || null)}
                style={{ padding:"4px 9px", borderRadius:5, border:"1px solid #334155", background:"#0f172a", color:"#cbd5e1", fontWeight:t.label==="B"?"bold":"normal", fontStyle:t.label==="I"?"italic":"normal", fontSize:12, cursor:"pointer", minWidth:28, textAlign:"center" }}>
                {t.label}
              </button>
            ))}
            <div style={{ width:1, height:22, background:"#334155", margin:"0 6px" }} />
            {/* Font size */}
            <select onChange={e => execCmd("fontSize", e.target.value)}
              style={{ padding:"3px 6px", borderRadius:5, border:"1px solid #334155", background:"#0f172a", color:"#cbd5e1", fontSize:12, cursor:"pointer" }}>
              <option value="">Size</option>
              {[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>{[8,10,12,14,18,24,36][s-1]}px</option>)}
            </select>
            <div style={{ width:1, height:22, background:"#334155", margin:"0 6px" }} />
            {/* Text colors */}
            <span style={{ fontSize:10, color:"#64748b" }}>Color:</span>
            {COLOR_OPTIONS.map(c => (
              <div key={c} onClick={() => execCmd("foreColor", c)}
                title={c}
                style={{ width:16, height:16, borderRadius:"50%", background:c, border:c==="#ffffff"?"1.5px solid #475569":"1.5px solid transparent", cursor:"pointer", flexShrink:0 }} />
            ))}
            <div style={{ width:1, height:22, background:"#334155", margin:"0 6px" }} />
            {/* Highlight */}
            <span style={{ fontSize:10, color:"#64748b" }}>Hi:</span>
            {HIGHLIGHT_OPTIONS.map(c => (
              <div key={c} onClick={() => execCmd("hiliteColor", c === "transparent" ? "transparent" : c)}
                title="Highlight"
                style={{ width:16, height:16, borderRadius:"50%", background:c==="transparent"?"#1e293b":c, border:"1.5px solid #475569", cursor:"pointer", flexShrink:0 }} />
            ))}
          </div>

          {/* ── HINT BAR ── */}
          <div style={{ padding:"5px 16px", background:"#0c1520", borderBottom:"1px solid #1e293b", display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:"#475569" }}>✏️ <strong style={{color:"#94a3b8"}}>Click text</strong> to edit</span>
            <span style={{ fontSize:11, color:"#475569" }}>🖱 <strong style={{color:"#94a3b8"}}>Drag photo</strong> to move</span>
            <span style={{ fontSize:11, color:"#475569" }}>📷 <strong style={{color:"#94a3b8"}}>Swap Photo</strong> to replace</span>
            <span style={{ fontSize:11, color:"#475569" }}>💾 <strong style={{color:"#22c55e"}}>Download</strong> saves all edits + photo</span>
            <span style={{ fontSize:11, color:"#475569" }}>🖨 Ctrl+P → PDF</span>
          </div>

          {/* ── LIVE IFRAME ── */}
          <iframe
            ref={iframeRef}
            srcDoc={html}
            sandbox="allow-same-origin allow-scripts"
            title="Resume Preview"
            style={{ width:"100%", height:1060, border:"none", display:"block", background:"#eef0f4" }}
            onLoad={onIframeLoad}
          />
        </>
      )}

      {mode === "source" && (
        <div>
          <div style={{ padding:"8px 16px", background:"#1a1a2e", borderBottom:"1px solid #334155", fontSize:11, color:"#94a3b8" }}>
            ✏️ Edit raw HTML — click <strong style={{color:"#60a5fa"}}>Preview & Edit</strong> to apply
          </div>
          <textarea
            value={sourceHtml}
            onChange={e => setSourceHtml(e.target.value)}
            style={{ width:"100%", height:900, padding:16, fontFamily:"'Courier New',monospace", fontSize:12, lineHeight:1.7, border:"none", outline:"none", resize:"vertical", background:"#0a0f1e", color:"#e2e8f0", boxSizing:"border-box" }}
          />
          <div style={{ padding:"10px 16px", background:"#1e293b", display:"flex", gap:10 }}>
            <button onClick={applySource}
              style={{ padding:"8px 20px", borderRadius:8, border:"none", background:"#2563eb", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
              ✓ Apply & Preview
            </button>
            <button onClick={() => setSourceHtml(liveHtmlRef.current)}
              style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #334155", background:"transparent", color:"#94a3b8", fontWeight:700, fontSize:12, cursor:"pointer" }}>
              ✕ Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ResumeMarketing() {
  const [step, setStep]           = useState(1);
  const [parsedData, setParsed]   = useState(null);
  const [resumeFile, setFile]     = useState(null);
  const [country, setCountry]     = useState("");
  const [template, setTemplate]   = useState("executive");
  const [photoB64, setPhotoB64]   = useState(null);
  const [photoPreview, setPhotoPr]= useState(null);
  const [generatedHtml, setHtml]  = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loadMsg, setLoadMsg]     = useState("");
  const [error, setError]         = useState(null);
  const [jdText, setJdText]       = useState("");
  const [analysis, setAnalysis]   = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [searchQ, setSearchQ]     = useState("");
  const [openGroup, setOpenGroup] = useState(null);

  const fileRef  = useRef();
  const photoRef = useRef();

  const selectedCountry = ALL_COUNTRIES.find(c => c.key === country);
  const selectedTmpl    = TEMPLATE_DEFS.find(t => t.id === template);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setFile(file); setError(null); setGenerating(true); setLoadMsg("Reading resume file…");
    try {
      const text = await extractText(file, setLoadMsg);
      setLoadMsg("Parsing resume with AI…");
      const raw = await callGroq(`
Parse this resume and return ONLY a raw JSON object (no markdown, no backticks).
Resume: ${text.slice(0, 4000)}
Return exactly this structure:
{"name":"","email":"","phone":"","location":"","linkedin":"","dob":"","nationality":"","summary":"","experience":[{"company":"","role":"","duration":"","location":"","achievements":[""]}],"education":[{"institution":"","degree":"","year":"","grade":""}],"skills":[],"languages":[],"certifications":[],"hobbies":[]}
Start with { end with }. Nothing else.`, 2000, setLoadMsg);
      let cleaned = raw.trim().replace(/```json|```/g, "").trim();
      const s = cleaned.indexOf("{"), e2 = cleaned.lastIndexOf("}");
      if (s !== -1 && e2 !== -1) cleaned = cleaned.slice(s, e2 + 1);
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch { parsed = { name: file.name.replace(/\.[^.]+$/, "") }; }
      setParsed(parsed); setStep(2);
    } catch (e) {
      setError(e.message); setParsed({ name: file.name.replace(/\.[^.]+$/, "") }); setStep(2);
    } finally { setGenerating(false); }
  };

  const handlePhotoUpload = (file) => {
    if (!file) return;
    if (!["image/jpeg","image/png","image/jpg","image/webp"].includes(file.type)) { setError("Photo must be JPG/PNG/WEBP"); return; }
    if (file.size > 3 * 1024 * 1024) { setError("Photo max 3MB"); return; }
    const r = new FileReader();
    r.onload = e => { setPhotoB64(e.target.result); setPhotoPr(e.target.result); };
    r.readAsDataURL(file);
  };

  const generateResume = async (jd = "") => {
    if (!country) { setError("Select a country first"); return; }
    setError(null); setGenerating(true);
    setLoadMsg(`✨ Building ${selectedTmpl?.name} resume for ${parsedData?.name || "candidate"}…`);
    try {
      const html = await callGroq(
        buildResumePrompt({ data: parsedData || {}, country, tmpl: selectedTmpl, hasPhoto: !!photoB64, jdText: jd }),
        7000, setLoadMsg
      );
      const clean = html.replace(/```html|```/g, "").trim();
      const final = injectPhoto(clean, photoB64);
      setHtml(final); setStep(3);
      await logUsage({ action: jd ? "jd_rebuild" : "generate", candidateName: parsedData?.name || "Unknown", country, template: selectedTmpl?.name });
    } catch (e) { setError(e.message); }
    finally { setGenerating(false); }
  };

  const analyseJD = async () => {
    if (!jdText.trim() || jdText.split(/\s+/).length < 8) { setError("Paste a longer job description"); return; }
    setAnalysing(true); setError(null);
    try {
      const raw = await callGroq(`
Analyse this candidate vs job description. Return ONLY raw JSON (no backticks).
CANDIDATE: ${parsedData?.name}, Skills: ${(parsedData?.skills||[]).join(", ")}
Experience: ${(parsedData?.experience||[]).map(e=>`${e.role} at ${e.company}`).join(" | ")}
JOB DESCRIPTION: ${jdText.slice(0, 1500)}
Return exactly:
{"match_score":72,"match_label":"Good","summary":"2-3 sentences","recommendation":"one action","matched_skills":[],"missing_skills":[],"quick_wins":["action 1","action 2","action 3"]}
match_label: "Excellent"|"Good"|"Fair"|"Low"`, 1500, () => {});
      let c = raw.trim().replace(/```json|```/g, "").trim();
      const s = c.indexOf("{"), e2 = c.lastIndexOf("}");
      if (s !== -1 && e2 !== -1) c = c.slice(s, e2 + 1);
      const result = JSON.parse(c);
      setAnalysis(result);
      await logUsage({ action: "jd_analysis", candidateName: parsedData?.name || "Unknown", matchScore: result.match_score });
    } catch (e) { setError(`Analysis failed: ${e.message}`); }
    finally { setAnalysing(false); }
  };

  const sl = searchQ.toLowerCase();
  const filteredGroups = COUNTRY_GROUPS.map(g => ({
    ...g,
    countries: searchQ ? g.countries.filter(c => c.label.toLowerCase().includes(sl) || c.key.includes(sl)) : g.countries,
  })).filter(g => g.countries.length > 0);

  // ── STYLES ─────────────────────────────────────────────────────────────────
  const S = {
    page: { fontFamily:"'Times New Roman', Times, serif", maxWidth:1080, margin:"0 auto", padding:"0 14px 80px" },
    card: { background:"#fff", borderRadius:18, border:"1.5px solid #e8ecf0", padding:"24px 26px", marginBottom:18, boxShadow:"0 4px 20px rgba(0,0,0,.05)" },
    btn: (bg, fg="#fff", disabled=false) => ({
      padding:"10px 22px", borderRadius:10, border:"none",
      background: disabled?"#e2e8f0":bg, color: disabled?"#94a3b8":fg,
      fontWeight:800, fontSize:13, cursor: disabled?"not-allowed":"pointer",
      fontFamily:"'Times New Roman', Times, serif", transition:"all .15s",
    }),
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Cormorant+Garamond:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(14px) } to { opacity:1;transform:translateY(0) } }
        .fu { animation: fadeUp .35s ease both }
        .ccard:hover { transform:translateY(-3px) !important; box-shadow:0 10px 28px rgba(0,0,0,.12) !important; }
        button:active:not([disabled]) { transform:scale(.97) }
        * { font-family: 'Times New Roman', Times, serif !important; }
        input, textarea, select { font-family: 'Times New Roman', Times, serif !important; }
        ::-webkit-scrollbar { width:5px } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px }
      `}</style>

      <div style={S.page}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div style={{
          background:"linear-gradient(135deg, #0a0f1e 0%, #111827 50%, #1a1a2e 100%)",
          borderRadius:22, padding:"32px 40px", marginBottom:26, color:"#fff",
          position:"relative", overflow:"hidden"
        }}>
          <div style={{ position:"absolute", top:-100, right:-60, width:380, height:380, borderRadius:"50%", background:"radial-gradient(circle, rgba(201,168,76,.08), transparent 70%)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-60, left:160, width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle, rgba(37,99,235,.08), transparent 70%)", pointerEvents:"none" }} />
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:9, fontWeight:700, letterSpacing:6, textTransform:"uppercase", opacity:.4, marginBottom:10, color:"#c9a84c" }}>VJC Overseas — HR Excellence</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:900, letterSpacing:-0.5, marginBottom:6, color:"#fff" }}>
            📄 AI Resume Builder
          </div>
          <div style={{ fontSize:13, opacity:.5, marginBottom:22, fontStyle:"italic" }}>
            35 countries · 5 premium templates · Real-time WYSIWYG editing · JD matching
          </div>
          <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
            {[["35+","Countries"],["5","Templates each"],["Real-time","WYSIWYG Edit"],["Drag","& Drop Photo"]].map(([v,l]) => (
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color:"#c9a84c" }}>{v}</div>
                <div style={{ fontSize:10, opacity:.45, marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── STEP INDICATOR ─────────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:0, marginBottom:22, background:"#f1f5f9", borderRadius:14, padding:4, width:"fit-content" }}>
          {["Upload","Country & Style","Edit & Download","JD Match"].map((s,i) => {
            const n=i+1, active=step===n, done=step>n;
            return (
              <div key={s} style={{
                padding:"8px 16px", borderRadius:10, fontSize:12.5, fontWeight:700,
                background: active?"#fff":"transparent",
                color: done?"#16a34a": active?"#2563eb":"#94a3b8",
                boxShadow: active?"0 1px 8px rgba(0,0,0,.09)":"none",
                display:"flex", alignItems:"center", gap:7, whiteSpace:"nowrap",
              }}>
                <span style={{
                  width:22, height:22, borderRadius:"50%", fontSize:11, fontWeight:900,
                  background: done?"#16a34a": active?"#2563eb":"#e2e8f0",
                  color: done||active?"#fff":"#94a3b8",
                  display:"flex", alignItems:"center", justifyContent:"center"
                }}>{done?"✓":n}</span>
                {s}
              </div>
            );
          })}
        </div>

        {/* ── ERROR ────────────────────────────────────────────────────────── */}
        {error && (
          <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <span style={{ fontSize:13, color:"#dc2626", fontWeight:600 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background:"none", border:"none", color:"#dc2626", cursor:"pointer", fontSize:20 }}>×</button>
          </div>
        )}

        {/* ── LOADING ─────────────────────────────────────────────────────── */}
        {(generating || analysing) && (
          <div style={{ ...S.card, textAlign:"center", padding:"64px 20px" }}>
            <div style={{ width:56, height:56, border:"3.5px solid #e2e8f0", borderTop:"3.5px solid #c9a84c", borderRadius:"50%", margin:"0 auto 24px", animation:"spin .8s linear infinite" }} />
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"#0f172a", marginBottom:8 }}>{loadMsg || "Analysing…"}</div>
            <div style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic" }}>AI crafting your resume — typically 15–30 seconds</div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1 — UPLOAD
        ══════════════════════════════════════════════════════════════════ */}
        {!generating && !analysing && step === 1 && (
          <div style={S.card} className="fu">
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"#0f172a", marginBottom:4 }}>Upload Your Resume</div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:24, fontStyle:"italic" }}>AI reads every detail — experience, skills, education — to power all 5 premium templates.</div>
            <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx" style={{ display:"none" }}
              onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} />
            <div
              onClick={() => fileRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) handleFileUpload(f); }}
              style={{
                border:"2.5px dashed #d4b896", borderRadius:16, padding:"60px 20px",
                textAlign:"center", cursor:"pointer",
                background:"linear-gradient(135deg, #fefdfb, #fdf6ec)",
                transition:"all .2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="#c9a84c"; e.currentTarget.style.background="linear-gradient(135deg,#fdf6ec,#fef3c7)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="#d4b896"; e.currentTarget.style.background="linear-gradient(135deg,#fefdfb,#fdf6ec)"; }}
            >
              <div style={{ fontSize:56, marginBottom:14 }}>📄</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:"#1e293b", marginBottom:6 }}>Drop resume here or click to browse</div>
              <div style={{ fontSize:12, color:"#94a3b8" }}>TXT · PDF · DOC · DOCX — max 5MB</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:16 }}>
              {[
                { f:".TXT", icon:"📝", note:"Best results", clr:"#16a34a", bg:"#f0fdf4", bd:"#bbf7d0" },
                { f:".DOCX", icon:"📘", note:"Good support", clr:"#2563eb", bg:"#eff6ff", bd:"#bfdbfe" },
                { f:".PDF", icon:"📕", note:"Text PDFs only", clr:"#d97706", bg:"#fffbeb", bd:"#fde68a" },
              ].map(x => (
                <div key={x.f} style={{ padding:12, borderRadius:12, background:x.bg, border:`1px solid ${x.bd}`, textAlign:"center" }}>
                  <div style={{ fontSize:22 }}>{x.icon}</div>
                  <div style={{ fontSize:12, fontWeight:800, color:x.clr, marginTop:2 }}>{x.f}</div>
                  <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{x.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — COUNTRY + TEMPLATE
        ══════════════════════════════════════════════════════════════════ */}
        {!generating && !analysing && step === 2 && (
          <div className="fu">
            {parsedData && (
              <div style={{ ...S.card, background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1.5px solid #86efac", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <span style={{ fontSize:32 }}>✅</span>
                  <div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, color:"#15803d" }}>Resume parsed successfully</div>
                    <div style={{ fontSize:12, color:"#166534", marginTop:3 }}>
                      <strong>{parsedData.name}</strong>
                      {parsedData.experience?.length ? ` · ${parsedData.experience.length} roles` : ""}
                      {parsedData.skills?.length ? ` · ${parsedData.skills.length} skills` : ""}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Country picker */}
            <div style={S.card}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"#0f172a", marginBottom:4 }}>1. Choose Destination Country</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:16, fontStyle:"italic" }}>Country-specific formatting rules applied automatically.</div>
              <div style={{ position:"relative", marginBottom:16 }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>🔍</span>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search country…"
                  style={{ width:"100%", padding:"10px 36px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:13, boxSizing:"border-box", outline:"none", background:"#f8fafc" }}
                  onFocus={e => e.target.style.borderColor="#c9a84c"}
                  onBlur={e => e.target.style.borderColor="#e2e8f0"} />
              </div>
              {filteredGroups.map(g => (
                <div key={g.group} style={{ marginBottom:10 }}>
                  <button
                    onClick={() => setOpenGroup(openGroup===g.group?null:g.group)}
                    style={{
                      width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"10px 16px", borderRadius:10,
                      border:`1.5px solid ${country && g.countries.some(c=>c.key===country)?"#c9a84c":"#e2e8f0"}`,
                      background: country && g.countries.some(c=>c.key===country)?"#fffbeb":"#f8fafc",
                      cursor:"pointer", fontSize:13, fontWeight:700,
                      color: country && g.countries.some(c=>c.key===country)?"#92400e":"#374151",
                    }}>
                    <span>{g.emoji} {g.group} <span style={{ fontSize:11, fontWeight:400, color:"#94a3b8" }}>({g.countries.length})</span></span>
                    <span style={{ fontSize:11, transform:(searchQ||openGroup===g.group)?"rotate(180deg)":"none", display:"inline-block", transition:"transform .2s" }}>▼</span>
                  </button>
                  {(searchQ||openGroup===g.group) && (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:8, marginTop:8 }}>
                      {g.countries.map(c => (
                        <div key={c.key} className="ccard"
                          onClick={() => { setCountry(c.key); setError(null); }}
                          style={{
                            padding:"12px 13px", borderRadius:12, cursor:"pointer",
                            border:`2px solid ${country===c.key?"#c9a84c":"#e2e8f0"}`,
                            background: country===c.key?"#fffbeb":"#fafafa",
                            boxShadow: country===c.key?"0 4px 16px rgba(201,168,76,0.25)":"none",
                            transition:"all .15s",
                          }}>
                          <div style={{ fontSize:24, marginBottom:4 }}>{c.flag}</div>
                          <div style={{ fontSize:12, fontWeight:800, color:country===c.key?"#92400e":"#0f172a" }}>{c.label}</div>
                          <div style={{ fontSize:10.5, color:"#64748b", marginTop:2, lineHeight:1.4 }}>{c.desc}</div>
                          {c.photoRequired && (
                            <div style={{ marginTop:5, fontSize:9, fontWeight:700, color:"#7c3aed", background:"#f3e8ff", padding:"2px 7px", borderRadius:20, display:"inline-block" }}>📷 Photo</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {country && selectedCountry && (
                <div style={{ marginTop:12, padding:"10px 14px", borderRadius:10, background:"#fffbeb", border:"1.5px solid #fde68a", fontSize:13, color:"#92400e", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:18 }}>{selectedCountry.flag}</span>
                  <strong>{selectedCountry.label}</strong> selected
                  {selectedCountry.photoRequired && <span style={{ fontSize:10, background:"#f3e8ff", color:"#7c3aed", padding:"2px 8px", borderRadius:20, fontWeight:700 }}>📷 Photo recommended</span>}
                </div>
              )}
            </div>

            {/* Template picker */}
            {country && (
              <div style={S.card}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"#0f172a", marginBottom:4 }}>2. Choose Template Style</div>
                <div style={{ fontSize:13, color:"#64748b", marginBottom:18, fontStyle:"italic" }}>5 visually distinct designs — all using Times New Roman typography.</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
                  {TEMPLATE_DEFS.map(t => (
                    <TemplatePreviewCard key={t.id} tmpl={t} country={country} selected={template===t.id} onClick={() => setTemplate(t.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Photo upload */}
            {country && selectedCountry?.photoRequired && (
              <div style={{ ...S.card, background:"linear-gradient(135deg,#faf5ff,#f5f3ff)", border:"1.5px solid #d8b4fe" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, color:"#6d28d9", marginBottom:4 }}>📷 Profile Photo</div>
                <div style={{ fontSize:12, color:"#7c3aed", marginBottom:16 }}>Required for {selectedCountry.label}. Stored locally — never sent to AI.</div>
                <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }}
                  onChange={e => e.target.files[0] && handlePhotoUpload(e.target.files[0])} />
                <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                  <div style={{ position:"relative", flexShrink:0 }}>
                    {photoPreview ? (
                      <>
                        <img src={photoPreview} alt="Profile" style={{ width:90, height:112, objectFit:"cover", borderRadius:8, border:"3px solid #a78bfa", display:"block" }} />
                        <button onClick={() => { setPhotoB64(null); setPhotoPr(null); }}
                          style={{ position:"absolute", top:-8, right:-8, background:"#ef4444", color:"#fff", border:"2px solid #fff", borderRadius:"50%", width:22, height:22, cursor:"pointer", fontSize:11, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                      </>
                    ) : (
                      <div onClick={() => photoRef.current?.click()} style={{ width:90, height:112, borderRadius:8, border:"2px dashed #c4b5fd", background:"#ede9fe", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", gap:5 }}>
                        <span style={{ fontSize:28 }}>👤</span>
                        <span style={{ fontSize:10, color:"#7c3aed", fontWeight:700 }}>Upload</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <button onClick={() => photoRef.current?.click()} style={S.btn("#7c3aed")}>
                      {photoPreview ? "🔄 Change Photo" : "📷 Upload Photo"}
                    </button>
                    <div style={{ fontSize:11, color:"#64748b", marginTop:8 }}>JPG · PNG · WEBP · max 3MB</div>
                    {photoPreview && <div style={{ fontSize:11, color:"#16a34a", marginTop:4, fontWeight:700 }}>✅ Ready — drag to reposition after generating</div>}
                  </div>
                </div>
              </div>
            )}

            {country && (
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:4 }}>
                <button onClick={() => generateResume()} disabled={!template} style={S.btn("linear-gradient(135deg,#1a1a2e,#2563eb)", "#fff", !template)}>
                  ✨ Generate Resume
                </button>
                <button onClick={() => { if(!country){setError("Select a country first");return;} setStep(4); }} style={S.btn("#c9a84c","#1a1a2e")}>
                  📋 Match Job Description
                </button>
                <button onClick={() => { setStep(1); setFile(null); setParsed(null); setCountry(""); setHtml(null); setError(null); }} style={S.btn("#f1f5f9","#475569")}>
                  ← Start Over
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 3 — REAL-TIME WYSIWYG EDITOR
        ══════════════════════════════════════════════════════════════════ */}
        {!generating && !analysing && step === 3 && generatedHtml && (
          <div className="fu">
            {/* Status badge */}
            <div style={{ ...S.card, marginBottom:0, borderRadius:"18px 18px 0 0", borderBottom:"none", padding:"16px 24px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"#22c55e" }} />
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, color:"#15803d" }}>
                    {parsedData?.name || "Candidate"} · {selectedCountry?.flag} {selectedCountry?.label} · {selectedTmpl?.name}
                  </div>
                </div>
                <div style={{ fontSize:11, color:"#64748b", fontStyle:"italic" }}>Click any text to edit. Drag photo to move it.</div>
              </div>
            </div>

            <RealtimeEditor
              html={generatedHtml}
              onHtmlChange={setHtml}
              fileName={`${(parsedData?.name||"Resume").replace(/\s+/g,"_")}_${country}_${selectedTmpl?.name?.replace(/\s+/g,"_")}.html`}
              fileName={`${(parsedData?.name||"Resume").replace(/\s+/g,"_")}_${country}.html`}
              parsedData={parsedData}
              country={country}
              selectedTmpl={selectedTmpl}
              onRegenerate={() => generateResume()}
              onBack={() => setStep(2)}
              onJD={() => setStep(4)}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 4 — JD MATCHING
        ══════════════════════════════════════════════════════════════════ */}
        {!generating && !analysing && step === 4 && (
          <div className="fu">
            <div style={S.card}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"#0f172a", marginBottom:4 }}>Job Description Match</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:16, fontStyle:"italic" }}>
                Paste the full job posting to see how well {parsedData?.name||"the candidate"} matches.
              </div>
              {selectedCountry && (
                <div style={{ padding:"8px 14px", borderRadius:9, background:"#fffbeb", border:"1px solid #fde68a", fontSize:12, color:"#92400e", marginBottom:14, display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:16 }}>{selectedCountry.flag}</span> Rebuild will use <strong>{selectedCountry.label}</strong> · <strong>{selectedTmpl?.name}</strong>
                </div>
              )}
              <textarea
                value={jdText} onChange={e => setJdText(e.target.value)} rows={13}
                placeholder="Paste the complete job description here…"
                style={{ width:"100%", padding:14, borderRadius:12, fontSize:13, border:"1.5px solid #e2e8f0", outline:"none", resize:"vertical", boxSizing:"border-box", color:"#0f172a", background:"#f8fafc", lineHeight:1.8 }}
                onFocus={e => e.target.style.borderColor="#c9a84c"}
                onBlur={e => e.target.style.borderColor="#e2e8f0"} />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, margin:"6px 0 16px", color:jdText.trim().split(/\s+/).length<8?"#f87171":"#16a34a", fontWeight:600 }}>
                <span>{jdText.trim().length===0?"⬆️ Paste job description above":jdText.trim().split(/\s+/).length<8?"⚠️ Too short":"✅ Ready to analyse"}</span>
                <span style={{ color:"#94a3b8" }}>{jdText.trim().split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <button onClick={analyseJD} style={S.btn("#c9a84c","#1a1a2e")}>🔍 Analyse Match %</button>
                <button onClick={() => generateResume(jdText)} disabled={!country||jdText.split(/\s+/).length<8} style={S.btn("#1a1a2e","#fff",!country||jdText.split(/\s+/).length<8)}>✨ Rebuild Tailored Resume</button>
                <button onClick={() => setStep(step===3?3:2)} style={S.btn("#f1f5f9","#475569")}>← Back</button>
              </div>
            </div>

            {analysis && (() => {
              const sc = analysis.match_score>=70?"#16a34a":analysis.match_score>=45?"#d97706":"#dc2626";
              const sb = analysis.match_score>=70?"#f0fdf4":analysis.match_score>=45?"#fffbeb":"#fef2f2";
              const sd = analysis.match_score>=70?"#86efac":analysis.match_score>=45?"#fde68a":"#fca5a5";
              return (
                <div>
                  <div style={{ ...S.card, background:sb, border:`2px solid ${sd}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:28, flexWrap:"wrap" }}>
                      <div style={{ textAlign:"center", minWidth:110 }}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:72, fontWeight:900, color:sc, lineHeight:1 }}>{analysis.match_score}%</div>
                        <div style={{ fontSize:13, fontWeight:700, color:sc }}>{analysis.match_label} Match</div>
                        <div style={{ height:6, borderRadius:99, background:"#e2e8f0", overflow:"hidden", marginTop:8 }}>
                          <div style={{ height:"100%", width:`${analysis.match_score}%`, background:sc, borderRadius:99 }} />
                        </div>
                      </div>
                      <div style={{ flex:1, minWidth:200 }}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, color:"#0f172a", marginBottom:6 }}>Assessment</div>
                        <div style={{ fontSize:13, color:"#374151", lineHeight:1.8 }}>{analysis.summary}</div>
                        <div style={{ marginTop:10, padding:"9px 13px", borderRadius:9, background:"rgba(255,255,255,.8)", fontSize:13, fontWeight:600, color:sc }}>💡 {analysis.recommendation}</div>
                      </div>
                    </div>
                  </div>
                  {(analysis.quick_wins||[]).length>0 && (
                    <div style={{ ...S.card, background:"#fffbeb", border:"1.5px solid #fde68a" }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:13, fontWeight:700, color:"#92400e", marginBottom:10 }}>⚡ Quick Wins to Boost Your Match</div>
                      {analysis.quick_wins.map((w,i)=>(
                        <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:i<analysis.quick_wins.length-1?"1px solid #fde68a":"none", fontSize:13, color:"#78350f", lineHeight:1.7 }}>
                          <span style={{ minWidth:22, height:22, borderRadius:"50%", background:"#c9a84c", color:"#fff", fontSize:11, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</span>
                          {w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
}