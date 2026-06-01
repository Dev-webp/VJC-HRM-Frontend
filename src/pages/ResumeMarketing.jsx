/* eslint-disable */
// ResumeMarketing.jsx — VJC Overseas Premium Resume Builder
// FIXED v4:
//   - Upload చేసిన ALL data preserve అవుతుంది (roles, bullets, education అన్నీ)
//   - Image drag పూర్తిగా fix - draggable=false + pointer-events:none + ondragstart=false
//   - Layout unchanged - existing templates exact same గా ఉంటాయి

import React, { useState, useRef, useEffect, useCallback } from "react";
import * as htmlDocx from "html-docx-js/dist/html-docx";
import { saveAs } from "file-saver";

const BASE = "http://127.0.0.1:5000";
const FONT_PRESETS = {
  compact: {
  heading: 0.90,
  body: 0.90,
},

  normal: {
    heading: 1,
    body: 1,
  },

  comfortable: {
  heading: 1.18,
  body: 1.18,
},
};
// ─── COUNTRY DATA ─────────────────────────────────────────────────────────────
const COUNTRY_GROUPS = [
  {
    group: "Europe",
    emoji: "🌍",
    countries: [
      {
        key: "uk",
        label: "UK / Ireland",
        flag: "🇬🇧",
        desc: "2-page CV, personal statement",
        photoRequired: false,
      },
      {
        key: "germany",
        label: "Germany",
        flag: "🇩🇪",
        desc: "Lebenslauf, photo, DOB",
        photoRequired: true,
      },
      {
        key: "france",
        label: "France",
        flag: "🇫🇷",
        desc: "Elegant, photo optional",
        photoRequired: true,
      },
      {
        key: "european",
        label: "Europass",
        flag: "🇪🇺",
        desc: "Two-column, photo, DOB",
        photoRequired: true,
      },
      {
        key: "netherlands",
        label: "Netherlands",
        flag: "🇳🇱",
        desc: "Skills-first, clean",
        photoRequired: false,
      },
      {
        key: "sweden",
        label: "Sweden",
        flag: "🇸🇪",
        desc: "Minimalist Nordic style",
        photoRequired: false,
      },
      {
        key: "switzerland",
        label: "Switzerland",
        flag: "🇨🇭",
        desc: "Precise, photo",
        photoRequired: true,
      },
      {
        key: "spain",
        label: "Spain",
        flag: "🇪🇸",
        desc: "Photo, DOB, formal",
        photoRequired: true,
      },
      {
        key: "italy",
        label: "Italy",
        flag: "🇮🇹",
        desc: "Curriculum Vitae",
        photoRequired: true,
      },
      {
        key: "poland",
        label: "Poland",
        flag: "🇵🇱",
        desc: "Photo, GDPR clause",
        photoRequired: true,
      },
    ],
  },
  {
    group: "Middle East & Asia",
    emoji: "🌏",
    countries: [
      {
        key: "gulf",
        label: "Gulf / Middle East",
        flag: "🌏",
        desc: "Photo, visa status, 3 pages",
        photoRequired: true,
      },
      {
        key: "dubai",
        label: "Dubai / UAE",
        flag: "🇦🇪",
        desc: "Luxury format, photo",
        photoRequired: true,
      },
      {
        key: "saudi",
        label: "Saudi Arabia",
        flag: "🇸🇦",
        desc: "Photo, Iqama number",
        photoRequired: true,
      },
      {
        key: "singapore",
        label: "Singapore",
        flag: "🇸🇬",
        desc: "Corporate, photo",
        photoRequired: true,
      },
      {
        key: "india",
        label: "India",
        flag: "🇮🇳",
        desc: "Objective, detailed, declaration",
        photoRequired: false,
      },
      {
        key: "japan",
        label: "Japan",
        flag: "🇯🇵",
        desc: "Rirekisho style, photo",
        photoRequired: true,
      },
      {
        key: "china",
        label: "China",
        flag: "🇨🇳",
        desc: "Photo, formal",
        photoRequired: true,
      },
      {
        key: "southkorea",
        label: "South Korea",
        flag: "🇰🇷",
        desc: "Self-intro essay, photo",
        photoRequired: true,
      },
      {
        key: "philippines",
        label: "Philippines",
        flag: "🇵🇭",
        desc: "Photo, character refs",
        photoRequired: true,
      },
    ],
  },
  {
    group: "Americas",
    emoji: "🌎",
    countries: [
      {
        key: "us",
        label: "USA (ATS)",
        flag: "🇺🇸",
        desc: "Single-column, ATS-clean",
        photoRequired: false,
      },
      {
        key: "canadian",
        label: "Canada",
        flag: "🇨🇦",
        desc: "Hybrid US/UK, no photo",
        photoRequired: false,
      },
      {
        key: "brazil",
        label: "Brazil",
        flag: "🇧🇷",
        desc: "Photo, DOB, CPF",
        photoRequired: true,
      },
      {
        key: "mexico",
        label: "Mexico",
        flag: "🇲🇽",
        desc: "Photo, CURP, Spanish",
        photoRequired: true,
      },
    ],
  },
  {
    group: "Pacific & Africa",
    emoji: "🦘",
    countries: [
      {
        key: "australian",
        label: "Australia",
        flag: "🇦🇺",
        desc: "Achievement-focused",
        photoRequired: false,
      },
      {
        key: "nz",
        label: "New Zealand",
        flag: "🇳🇿",
        desc: "Warm, two referees",
        photoRequired: false,
      },
      {
        key: "southafrica",
        label: "South Africa",
        flag: "🇿🇦",
        desc: "Photo, ID number",
        photoRequired: true,
      },
      {
        key: "nigeria",
        label: "Nigeria",
        flag: "🇳🇬",
        desc: "Photo, detailed, referees",
        photoRequired: true,
      },
    ],
  },
];
const ALL_COUNTRIES = COUNTRY_GROUPS.flatMap((g) => g.countries);

// ─── TEMPLATE DEFINITIONS ─────────────────────────────────────────────────────
const TEMPLATE_DEFS = [
  {
    id: "executive",
    name: "Executive Dark",
    icon: "◼",
    desc: "Dark header, gold accents, serif gravitas",
    preview: { bg: "#1a1a2e", accent: "#c9a84c", layout: "classic" },
  },
  {
    id: "modern",
    name: "Modern Split",
    icon: "▨",
    desc: "Bold two-column sidebar layout",
    preview: { bg: "#1e3a8a", accent: "#60a5fa", layout: "two-col" },
  },
  {
    id: "minimal",
    name: "Minimal Pro",
    icon: "—",
    desc: "Ultra clean, hairline rules, whitespace",
    preview: { bg: "#111827", accent: "#111827", layout: "minimal" },
  },
  {
    id: "creative",
    name: "Prestige",
    icon: "◈",
    desc: "Rich burgundy, gold ruled, magazine feel",
    preview: { bg: "#6b1c1c", accent: "#c9a84c", layout: "sidebar" },
  },
  {
    id: "classic",
    name: "Classic Pro",
    icon: "≡",
    desc: "Traditional, formal, elegant serif",
    preview: { bg: "#1a3a1a", accent: "#2d6a2d", layout: "classic" },
  },
];

const COUNTRY_COLORS = {
  uk: {
    executive: "#1a2e3b",
    modern: "#1e3a8a",
    minimal: "#2d3748",
    creative: "#6b1c1c",
    classic: "#1e3a5f",
  },
  germany: {
    executive: "#1a1a2e",
    modern: "#7f1d1d",
    minimal: "#2d3748",
    creative: "#1a3a1a",
    classic: "#1a237e",
  },
  france: {
    executive: "#1d1d6e",
    modern: "#be123c",
    minimal: "#1f2937",
    creative: "#4a1942",
    classic: "#1d4ed8",
  },
  india: {
    executive: "#7c2d12",
    modern: "#1d4ed8",
    minimal: "#2d3748",
    creative: "#6b1c1c",
    classic: "#c2410c",
  },
  us: {
    executive: "#111827",
    modern: "#1e3a8a",
    minimal: "#2d3748",
    creative: "#6b1c1c",
    classic: "#0f5132",
  },
  dubai: {
    executive: "#78350f",
    modern: "#1e3a8a",
    minimal: "#2d3748",
    creative: "#6b1c1c",
    classic: "#78350f",
  },
  gulf: {
    executive: "#78350f",
    modern: "#1e40af",
    minimal: "#2d3748",
    creative: "#6b1c1c",
    classic: "#78350f",
  },
  australian: {
    executive: "#1d5c37",
    modern: "#c2410c",
    minimal: "#2d3748",
    creative: "#1a3a4a",
    classic: "#1e3a8a",
  },
  japan: {
    executive: "#1f2937",
    modern: "#be123c",
    minimal: "#2d3748",
    creative: "#1a1a2e",
    classic: "#1a1a1a",
  },
};

// ─── GROQ API CALL ────────────────────────────────────────────────────────────
const callGroq = async (prompt, maxTokens = 2500, onStatus, retry = 0) => {
  let res;
  try {
    res = await fetch(`${BASE}/api/groq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTokens }),
    });
  } catch (e) {
    throw new Error(`Cannot reach server: ${e.message}`);
  }

  if (res.status === 429) {
  throw new Error("Groq API limit reached. Try again.");
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("Log failed:", e.message);
  }
};

const extractText = (file, onProgress) =>
  new Promise((res, rej) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (file.size > 5 * 1024 * 1024) {
      rej(new Error("File too large (max 5MB)"));
      return;
    }
    if (ext === "txt") {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error("Cannot read file"));
      r.readAsText(file);
    } else if (ext === "docx" || ext === "doc") {
      const r = new FileReader();
      r.onload = async () => {
        if (!window.mammoth) {
          rej(new Error("mammoth.js not loaded"));
          return;
        }
        try {
          const out = await window.mammoth.extractRawText({
            arrayBuffer: r.result,
          });
          res(out.value || "");
        } catch (e) {
          rej(new Error(`Word parse error: ${e.message}`));
        }
      };
      r.readAsArrayBuffer(file);
    } else if (ext === "pdf") {
      const r = new FileReader();
      r.onload = async () => {
        if (!window.pdfjsLib) {
          rej(new Error("pdf.js not loaded"));
          return;
        }
        try {
          const pdf = await window.pdfjsLib.getDocument({
            data: new Uint8Array(r.result),
          }).promise;
          let text = "";
const maxPages = pdf.numPages;
for (let i = 1; i <= maxPages; i++) {
  onProgress?.(`Reading PDF page ${i}/${maxPages}…`);

  const page = await pdf.getPage(i);
  const content = await page.getTextContent();

  text +=
    content.items.map((x) => x.str).join(" ") + "\n";
}
          const clean = text
  .replace(/\s{3,}/g, "\n")
  .trim();

if (clean.length < 30)
            rej(new Error("PDF has no readable text (scanned image?)"));
          else res(clean);
        } catch (e) {
          rej(new Error(`PDF error: ${e.message}`));
        }
      };
      r.readAsArrayBuffer(file);
    } else {
      rej(new Error(`Unsupported: .${ext}. Use .txt, .pdf, .docx`));
    }
  });

// ─── INJECT PHOTO — draggable=false inline గా set అవుతుంది ───────────────────
const injectPhoto = (html, b64) => {
  if (!b64 || !html) return html;
  // src replace + draggable=false + ondragstart attribute inject
  return html.replace(
    /src="__PHOTO__"/g,
    `src="${b64}" draggable="false" ondragstart="return false;"`,
  );
};

// ─── DOWNLOAD AS WORD ─────────────────────────────────────────────────────────
const downloadAsWord = async (html, name) => {
  let clean = html
    .replace(/\s*contenteditable="[^"]*"/g, "")
    .replace(/\s*data-editing="[^"]*"/g, "")
    .replace(/outline:\s*[^;]+dashed[^;]+;/g, "")
    .replace(/cursor:\s*text;/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  const fileBuffer = htmlDocx.asBlob(clean);
  const blob = fileBuffer;
  saveAs(blob, `${name}.docx`);
};

const downloadHtml = (html, name) => {
  let clean = html
    .replace(/\s*contenteditable="[^"]*"/g, "")
    .replace(/\s*data-editing="[^"]*"/g, "")
    .replace(/outline:\s*[^;]+dashed[^;]+;/g, "")
    .replace(/cursor:\s*text;/g, "")
    .replace(
      "@media print{",
      "@media print{.resume{transform-origin:top left;transform:scale(0.75);width:133.3%!important;max-width:133.3%!important;}"
    );
  const blob = new Blob([clean], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CONTENT-ONLY PROMPT — FIXED ─────────────────────────────────────────────
// KEY FIX: Upload చేసిన DATA అన్నీ preserve అవుతాయి
//   - ALL roles include అవుతాయి (max 2 limit తీసేశాం)
//   - ALL bullets preserve అవుతాయి (exactly 3 limit తీసేశాం)
//   - Real data ఉంటే invent చేయకూడదు
//   - Skills అన్నీ include అవుతాయి
// ═══════════════════════════════════════════════════════════════════════════════

const buildContentPrompt = ({ data: d, country, tmpl, hasPhoto, jdText }) => {
  const countryObj = ALL_COUNTRIES.find((c) => c.key === country) || {};
  const name = d.name || "Candidate";
  const skills = (d.skills || []).join(", ") || "Listed in experience";
  const langs = (d.languages || []).join(", ") || "English";
  const certs = (d.certifications || []).join(", ") || "";
  const hobby = (d.hobbies || []).join(", ") || "";
  const dob = d.dob && d.dob.trim() ? d.dob : "";
  const nat = d.nationality && d.nationality.trim() ? d.nationality : "";
  const linkedin =
  d.linkedin && !d.linkedin.startsWith("http")
    ? `https://${d.linkedin}`
    : d.linkedin || "";
  const jdSection = jdText
    ? `\nJOB DESCRIPTION (tailor every bullet to match this JD):\n${jdText.slice(0, 500)}`
    : "";

  // Upload చేసిన experience అన్నీ include చేస్తాం
  const expCount = (d.experience || []).length;
  const expBlock = (d.experience || [])
  .map(
    (e, i) =>
      `Role ${i + 1}: ${e.role || "Role"} at ${e.company || "Company"}, Duration: ${e.duration || "not specified"}, Location: ${e.location || ""}

Achievements from resume:
${JSON.stringify(e.achievements, null, 2)}`,
  )
  .join("\n\n");
 const eduBlock = (d.education || [])
    .map(
      (e) =>
        `${e.degree || ""} | ${e.institution || ""} | ${e.year || ""} | ${e.grade || ""}`,
    )
    .join("\n");

const projBlock = (d.projects || [])    .map(
      (p, i) =>
`Project ${i + 1}: ${p.name || ""} | Tech: ${p.tech || ""}
Bullets: ${(p.achievements || []).join(" | ")}`    )
    .join("\n\n");

  const countryRules = {
    uk: "No photo. No DOB. No nationality. Start with a 3-line Personal Statement. End with 'References available on request'.",
    germany: `Lebenslauf format. Include: Geburtsdatum: ${dob}, Staatsangehörigkeit: ${nat}. Add Hobbys section.`,
    us: "ATS-optimized. No decorative language. Use Core Competencies keyword grid. Quantify every achievement.",
    india: `Include Personal Details: Father's Name placeholder, DOB: ${dob}, Nationality: ${nat || "Indian"}, Marital Status placeholder. End with DECLARATION section.`,
    gulf: `Include: Nationality: ${nat}, DOB: ${dob}, Visa Status, Languages: ${langs}. Add Career Objective at top.`,
    japan: `Include: 氏名: ${name}, 生年月日: ${dob}. Add Self-PR paragraph.`,
    poland: `Add GDPR footer: "Wyrażam zgodę na przetwarzanie moich danych osobowych..."`,
  };

  // Experience array structure — upload చేసిన roles exact count తో
  const expJsonTemplate = (
    d.experience || [
      { role: "", company: "", duration: "", location: "", achievements: [] },
    ]
  )
    .map(
      (e, i) =>
        `    {
      "company": "${e.company || ""}",
      "role": "${e.role || ""}",
      "duration": "${e.duration || ""}",
      "location": "${e.location || ""}",
     "bullets": []
    }`,
    )
    .join(",\n");

return `You are a resume data copier.

Your job is ONLY to copy resume data exactly as provided.

DO NOT enhance.
DO NOT improve.
DO NOT rewrite.
DO NOT summarize.
DO NOT rephrase.
DO NOT optimize.
DO NOT generate new content.

Every field must match the uploaded resume exactly.

Never change even a single word unless the uploaded resume already contains it.
════════════════════════════════════════
CANDIDATE'S ACTUAL DATA (USE ALL OF IT):
════════════════════════════════════════
Name: ${name}
Phone: ${d.phone || ""}
Email: ${d.email || ""}
Location: ${d.location || ""}
LinkedIn: ${d.linkedin || ""}
DOB: ${dob}
Nationality: ${nat}
"summary": "${(d.summary || "").replace(/"/g, '\\"')}",

IMPORTANT: Use the EXACT summary text from resume as-is. Do NOT rewrite it. Copy it word for word into the "summary" field.
CRITICAL:
If summary exists in uploaded resume,
return it EXACTLY character-for-character.
Do not improve, shorten, expand, rewrite or paraphrase.
Skills from resume: ${skills}
Languages: ${langs}
Certifications: ${certs}
Hobbies: ${hobby}
${jdSection}

WORK EXPERIENCE (USE ALL ROLES EXACTLY AS PROVIDED):
Never omit any company, role, duration, or experience entry from the uploaded resume.

CRITICAL:
For every work experience entry, preserve ALL bullet points from the uploaded resume.
Do not summarize.
Do not remove bullets.
Do not merge bullets.
Do not shorten bullets.
Return every bullet exactly as provided.
${expBlock || "No experience provided — use empty placeholders"}

EDUCATION:
${eduBlock || "No education provided — use empty placeholder"}
Never return an empty education array if education exists in the uploaded resume.
CRITICAL:

If EDUCATION exists in uploaded resume,
return ALL education entries exactly.

If CERTIFICATIONS exist,
return ALL certifications exactly.

If AWARDS exist,
return ALL awards exactly.

Do not summarize.
Do not shorten.
Do not remove entries.
Do not merge entries.

PROJECTS (USE ALL PROJECTS EXACTLY AS PROVIDED):

CRITICAL:
If projects exist anywhere in the uploaded resume,
they must appear in the final output.

Never return an empty projects section.

Preserve all project names.
Preserve all project descriptions.
Do not summarize.
Do not remove projects.
Do not rename projects.
${projBlock || "No projects provided"}

════════════════════════════════════════
TARGET COUNTRY: ${countryObj.label || country}
COUNTRY-SPECIFIC RULES: ${countryRules[country] || "Standard professional format for this country"}
TEMPLATE STYLE: ${tmpl.name}
════════════════════════════════════════
${jdText ? `JD PROVIDED FOR REFERENCE ONLY. DO NOT MODIFY ANY RESUME CONTENT.` : ""}
Return ONLY a raw JSON object. No markdown. No backticks. Start with { end with }.

CRITICAL RULES:
1. NEVER invent companies, degrees, institutions, or dates not in the candidate data
ABSOLUTE RULE:

Do not invent:
- achievements
- projects
- certifications
- awards
- metrics
- percentages
- savings
- revenue figures
- technologies
- responsibilities

If information is not present in uploaded resume,
leave it empty.

Never generate placeholder content.
Never create assumptions.
Never create estimated numbers.
2. Use the candidate's REAL company names, role titles, and durations exactly as provided
3. For bullets:

Preserve uploaded bullet points exactly.

Do not rewrite bullets.
Do not enhance bullets.
Do not improve bullets.
Do not shorten bullets.
Do not merge bullets.
Do not create additional bullets.

Return uploaded bullet points exactly as provided.

If no bullet exists in uploaded resume,
return an empty array.4. Include ALL ${expCount} experience role${expCount !== 1 ? "s" : ""} — do not drop any
5. Include all education entries exactly as provided
6. Skills: include ALL skills from the resume exactly as provided.
Never reduce, group, summarize, combine, or limit skills. Return every individual skill separately.

Do not limit skills.
Do not remove skills.
Do not merge skills.
Do not rewrite skills.
Do not create new skills.

Return every skill found in the uploaded resume.
7. Summary: Copy the EXACT summary text provided above — word for word. DO NOT rewrite, rephrase, or improve it. Use it as-is
8. declaration: always "I hereby declare that all the information furnished above is true and correct to the best of my knowledge
9. projects: include ALL projects from the resume with name, tech stack, and 2 bullet points each."

Return ONLY this JSON:
{
  "name":"",
  "title":"",
  "summary":"",
  "experience":[],
  "education":[],
  "skills":[],
  "projects":[],
  "certifications":[],
  "awards":[],
  "languages":[],
  "hobbies":[],
  "declaration":""
}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── HARDCODED HTML SHELL BUILDERS ───────────────────────────────────────────
// Photo: ALWAYS has draggable="false" + pointer-events:none + ondragstart="return false;"
// These 3 together completely prevent drag in all browsers
// ═══════════════════════════════════════════════════════════════════════════════

const getAccentColor = (country, tmplId) => {
  const cc = COUNTRY_COLORS[country] || {};
  const defaults = {
    executive: "#1a1a2e",
    modern: "#1e3a8a",
    minimal: "#111827",
    creative: "#6b1c1c",
    classic: "#1a3a1a",
  };
  return cc[tmplId] || defaults[tmplId] || "#1a1a2e";
};

// ─── PHOTO IMG TAG — drag completely disabled ─────────────────────────────────
// draggable="false" = HTML attribute drag disable
// pointer-events:none = CSS click/drag disable
// ondragstart="return false;" = JS event fallback
// user-select:none = text selection disable
const photoImgStyle = (w, h, extra = "") =>
  `width:${w}px;height:${h}px;object-fit:cover;object-position:center top;border-radius:4px;display:block;flex-shrink:0;pointer-events:none;user-select:none;-webkit-user-drag:none;${extra}`;

// ─── EXECUTIVE DARK ──────────────────────────────────────────────────────────
const buildExecutiveHtml = (
  c,
  accent,
  hasPhoto,
  typography = FONT_PRESETS.normal
) => {
  const scale = typography?.body || 1;
  console.log("EXECUTIVE TYPOGRAPHY =", typography);
  console.log("EXECUTIVE SCALE =", scale);
  console.log("EXECUTIVE TEMPLATE LOADED");
  const fs = (size) =>
  `${(parseFloat(size) * scale).toFixed(2)}px`;
  console.log("FS12 =", fs(12));
console.log("FS14 =", fs(14));
console.log("FS34 =", fs(34));
    const photoSlot = hasPhoto
    ? `<img src="__PHOTO__" draggable="false" ondragstart="return false;" style="${photoImgStyle(108, 135, `border-radius:4px;border:2.5px solid ${accent};`)}">`
    : "";

  const expRows = (c.experience || [])
    .map(
      (e) => `
    <div style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">
        <div>
<span style="font-size:${fs(13)};font-weight:700;color:${accent};font-family:'Times New Roman',Times,serif;">${e.role || ""}</span>         
<span style="font-size:${fs(12)};color:#555;font-family:'Times New Roman',Times,serif;"> — ${e.company || ""}</span>      
    ${e.location ? `<span style="font-size:${fs(11)};color:#888;font-family:'Times New Roman',Times,serif;"> · ${e.location}</span>` : ""}
        </div>
<span style="font-size:${fs(11)};color:#888;font-style:italic;font-family:'Times New Roman',Times,serif;white-space:nowrap;margin-left:12px;">${e.duration || ""}</span>      </div>
      <ul style="margin:6px 0 0 0;padding-left:18px;">
${(e.bullets || e.achievements || []).map((b) => {
  return `<li style="font-size:${fs(11.5)};color:#333;line-height:1.85;font-family:'Times New Roman',Times,serif;margin-bottom:3px;">${b}</li>`;
}).join("")}      </ul>
    </div>`,
    )
    .join("");

  const eduRows = (c.education || [])
    .map(
      (e) =>
        `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
      <div>
        <span style="font-size:12px;font-weight:700;color:#1e293b;font-family:'Times New Roman',Times,serif;">${e.degree || ""}</span>
        <span style="font-size:11.5px;color:#555;font-family:'Times New Roman',Times,serif;"> — ${e.institution || ""}</span>
      </div>
      <span style="font-size:11px;color:#888;font-family:'Times New Roman',Times,serif;">${e.year || ""} ${e.grade ? "· " + e.grade : ""}</span>
    </div>`,
    )
    .join("");
    const skillCategories = {
  "Programming Languages": [],
  "AI & Data Systems": [],
  "Frameworks & APIs": [],
  "Cloud & AI Platforms": [],
  "Data & Storage": [],
  "System Design": [],
  "Containerization & DevOps": [],
  "Tools & Practices": [],
};

  (c.skills || []).forEach((s) => {
  if (!s) return;

  const skill = s.trim();

  if (["C","Java","C#","Python","JavaScript","TypeScript","ASP.NET","ASP.NET Core","Angular","React","HTML","CSS"].includes(skill))
    skillCategories["Programming Languages"].push(skill);

  else if (["RAG (Retrieval-Augmented Generation)","Multi-Agent Systems","LLMs","Prompt Engineering","Vector Embeddings","Semantic Search","Context & Memory Management","Guardrails","Agent Orchestration","Tool Calling"].includes(skill))
    skillCategories["AI & Data Systems"].push(skill);

  else if (["FastAPI","Graph API","REST APIs","Web APIs","Microservices","Microsoft Agentic Framework","Azure Bot Service"].includes(skill))
    skillCategories["Frameworks & APIs"].push(skill);

  else if (skill.includes("Azure") || skill.includes("OpenAI") || skill.includes("Cloud-native"))
    skillCategories["Cloud & AI Platforms"].push(skill);

  else if (["PostgreSQL","MongoDB","Sql server"].includes(skill))
    skillCategories["Data & Storage"].push(skill);

  else if (["Distributed Systems","Low-Latency Systems","Caching","High Availability","Scalability"].includes(skill))
    skillCategories["System Design"].push(skill);

  else if (["Docker","Kubernetes","CI/CD Pipelines","GitHub","Github Actions"].includes(skill))
    skillCategories["Containerization & DevOps"].push(skill);

  else
    skillCategories["Tools & Practices"].push(skill);
});

const skillsHtml = Object.entries(skillCategories)
  .filter(([_, arr]) => arr.length)
  .map(
    ([title, arr]) =>
      `<li style="font-size:${fs(11.5)};color:#333;line-height:1.8;font-family:'Times New Roman',Times,serif;margin-bottom:6px;">
        <strong>${title}:</strong> ${arr.join(", ")}
      </li>`
  )
  .join("");
  const contactItems = [c.phone, c.email, c.location, c.linkedin].filter(
    Boolean,
  );
  const extraMeta = [
    c.dob && `DOB: ${c.dob}`,
    c.nationality && `Nationality: ${c.nationality}`,
    c.visaStatus && `Visa: ${c.visaStatus}`,
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Times New Roman',Times,serif;}
  html,body{background:#eef0f4;}
  .rw{background:#eef0f4;padding:24px 0;}
  .resume{
  background:#fff;
  width:794px;
  max-width:794px;
  margin:0 auto;
  box-shadow:0 4px 40px rgba(0,0,0,.18);
  min-height:auto;

/***** FONT PRESET CONTROLLED BY fs() ONLY *****/
/* zoom:${scale}; */}
  .sec-label{font-size:10.5px;font-weight:700;color:${accent};letter-spacing:3px;text-transform:uppercase;padding:18px 0 7px;border-bottom:1.5px solid ${accent};margin-bottom:14px;display:block;}
  img{-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}html,body{background:#fff;padding:0;margin:0;width:210mm;overflow:visible}.rw{padding:0;margin:0}.resume{box-shadow:none;margin:0 auto;width:100%;max-width:100%;transform:none!important;overflow:visible;page-break-inside:avoid;break-inside:avoid;}.section,.experience,.project,.education{page-break-inside:avoid;break-inside:avoid}span.sec-label{page-break-after:avoid;break-after:avoid;}span.sec-label+*{page-break-before:avoid;break-before:avoid;}@page{size:A4;margin:8mm}}</style>
</head>
<body>
<div class="rw">
<div class="resume">

  <!-- HEADER — flexbox, photo is last child = always top-right -->
  <div style="background:${accent};padding:32px 48px;display:flex;align-items:flex-start;justify-content:flex-start;gap:24px;">
    <div style="flex:1;min-width:0;">
<div style="font-size:${fs(34)};color:#fff;font-weight:700;letter-spacing:2px;line-height:1.1;font-family:'Times New Roman',Times,serif;">${c.name || ""}</div>    
<div style="font-size:${fs(14)};color:#fff;font-family:'Times New Roman',Times,serif;margin-bottom:10px;">
Software Development Consultant at Microsoft
</div>
      <div style="border-bottom:1.5px solid rgba(201,168,76,0.45);margin-bottom:12px;"></div>
      <div style="display:flex;flex-wrap:wrap;gap:14px;position:relative;z-index:9999;">
  ${contactItems.map((x) => {
    const isLink =
      typeof x === "string" &&
      (x.includes("linkedin.com") || x.startsWith("http"));

    return isLink
      ? `
       <a 
  href="${x}" 
  target="_blank"
  rel="noopener noreferrer"
  onclick="window.open(this.href,'_blank'); return false;"
  style="
    font-size:${fs(11)};
    color:#7cc7ff;
    text-decoration:underline;
    font-family:'Times New Roman',Times,serif;
    cursor:pointer;
    pointer-events:auto !important;
    position:relative;
    z-index:999999 !important;
    display:inline-block;
  "
>
  ${x}
</a>
      `
      : `
        <span style="
  font-size:${fs(11)};
  color:rgba(255,255,255,0.65);
  font-family:'Times New Roman',Times,serif;
">
  ${x}
</span>
      `;
  }).join("")}
</div>
      ${extraMeta.length ? `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;">
        ${extraMeta.map((x) => `<span style="font-size:${fs(11)};color:rgba(255,255,255,0.55);font-family:'Times New Roman',Times,serif;">${x}</span>`).join("")}</div>` : ""}
</div>

<div style="margin-left:auto;position:relative;z-index:1;">
  ${photoSlot}
</div>
</div>

  <!-- BODY -->
  <div style="padding:30px 48px 48px;">

    <!-- Summary -->
    <span class="sec-label">Professional Summary</span>
<p style="font-size:${fs(12)};color:#333;line-height:1.9;margin-bottom:6px;font-family:'Times New Roman',Times,serif;">${c.summary || ""}</p>    ${
      (c.coreCompetencies || []).length
        ? `
    <span class="sec-label" style="margin-top:6px;">Core Competencies</span>
<div style="margin-bottom:4px;">
${(c.coreCompetencies || []).map((s) =>
  `<span style="display:inline-block;background:${accent}12;color:${accent};font-size:${fs(11)};padding:3px 10px;border-radius:3px;margin:2px;font-family:'Times New Roman',Times,serif;font-weight:600;">${s}</span>`
).join("")}
</div>    `
        : ""
    }

    <!-- Experience -->
    <span class="sec-label">Professional Experience</span>
    ${expRows}
    ${(c.projects||[]).length?`
    <span class="sec-label">Projects</span>
    ${(c.projects||[]).map(p=>`
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">
        <span style="font-size:${fs(13)};font-weight:700;color:${accent};font-family:'Times New Roman',Times,serif;">${p.name||""}</span>

<span style="font-size:${fs(11)};color:#888;font-style:italic;font-family:'Times New Roman',Times,serif;">${p.tech||""}</span>
      </div>
     <ul style="margin:4px 0 0 0;padding-left:18px;">
  ${(p.bullets || p.achievements || []).map((b) => `<li style="font-size:${fs(11.5)};color:#333;line-height:1.85;font-family:'Times New Roman',Times,serif;margin-bottom:3px;">${b}</li>`).join("")}
</ul>
    </div>`).join("")}`:""}

    <!-- Education -->
    <span class="sec-label">Education</span>
    ${eduRows}

    <!-- Skills -->
    <span class="sec-label">Technical Skills</span>

<ul style="margin:0;padding-left:18px;">
  ${skillsHtml}
</ul>

    ${
      (c.certifications || []).length
        ? `
    <span class="sec-label">Certifications</span>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px;">
${(c.certifications || [])
  .map(
    (x) =>
      `<span style="font-size:${fs(11.5)};color:#333;font-family:'Times New Roman',Times,serif;">• ${
  typeof x === "string"
    ? x
    : x.name || x.title || x.certification || JSON.stringify(x)
}</span>`
  )
  .join("")}    </div>`
        : ""
    }
    ${
  (c.awards || []).length
    ? `
<span class="sec-label">Awards & Achievements</span>
<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
${(c.awards || [])
  .map(
    (x) =>
      `<span style="font-size:${fs(11.5)};color:#333;font-family:'Times New Roman',Times,serif;">• ${x}</span>`
  )
  .join("")}
</div>`
    : ""
}

    ${
      (c.languages || []).length
        ? `
    <span class="sec-label">Languages</span>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:4px;">
     ${(c.languages || []).map((x) =>
  `<span style="font-size:${fs(11.5)};color:#333;font-family:'Times New Roman',Times,serif;">• ${x}</span>`
).join("")}
    </div>`
        : ""
    }

    ${
      (c.hobbies || []).length
        ? `
    <span class="sec-label">Interests & Hobbies</span>
    <p style="font-size:${fs(11.5)};color:#333;font-family:'Times New Roman',Times,serif;">
${(c.hobbies || []).join(" · ")}
</p>`
        : ""
    }

    ${
      c.declaration
        ? `
<div style="page-break-inside:avoid;break-inside:avoid;break-before:avoid;">
<span class="sec-label">Declaration</span>
<p style="font-size:${fs(11)};color:#555;font-style:italic;font-family:'Times New Roman',Times,serif;">
${c.declaration}
</p>
</div>`
        : ""
    }

    ${c.gdprClause ? `<p style="font-size:${fs(9)};color:#999;font-style:italic;margin-top:18px;font-family:'Times New Roman',Times,serif;">
${c.gdprClause}
</p>` : ""}

  </div>
</div>
</div>
</body>
</html>`;
};

// ─── MODERN SPLIT (two-column sidebar) ────────────────────────────────────────
const buildModernHtml = (
  c,
  accent,
  hasPhoto,
  typography = FONT_PRESETS.normal
) => { 
const scale = typography?.body || 1;

const fs = (size) =>
 `${(parseFloat(size) * scale).toFixed(2)}px`;

const photoSlot = hasPhoto    ? `<img src="__PHOTO__" draggable="false" ondragstart="return false;" style="${photoImgStyle(180, 210, "border-radius:6px;border:3px solid rgba(255,255,255,0.25);margin:0 auto 18px;")}">`
    : "";

  const expRows = (c.experience || [])
    .map(
      (e) => `
    <div style="margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;margin-bottom:4px;">
        <div>
          <div style="font-size:${fs(13)};font-weight:700;color:${accent};font-family:'Times New Roman',Times,serif;">${e.role || ""}</div>
          <div style="font-size:${fs(11.5)};color:#555;font-family:'Times New Roman',Times,serif;">${e.company || ""} ${e.location ? "· " + e.location : ""}</div>
        </div>
        <span style="font-size:${fs(10)};background:${accent}18;color:${accent};padding:2px 9px;border-radius:4px;font-weight:700;white-space:nowrap;font-family:'Times New Roman',Times,serif;">${e.duration || ""}</span>
      </div>
      <div style="border-left:2.5px solid ${accent}33;padding-left:10px;margin-top:6px;">
        ${(e.bullets || []).map((b) => `<div style="font-size:${fs(11.5)};color:#333;line-height:1.85;margin-bottom:3px;font-family:'Times New Roman',Times,serif;">• ${b}</div>`).join("")}
      </div>
    </div>`,
    )
    .join("");

  const eduRows = (c.education || [])
  .map(
    (e) =>
      `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
      <div>
        <span style="font-size:${fs(12)};font-weight:700;color:#1e293b;font-family:'Times New Roman',Times,serif;">${e.degree || ""}</span>
        <span style="font-size:${fs(11.5)};color:#555;font-family:'Times New Roman',Times,serif;"> — ${e.institution || ""}</span>
      </div>
      <span style="font-size:${fs(11)};color:#888;font-family:'Times New Roman',Times,serif;">${e.year || ""} ${e.grade ? "· " + e.grade : ""}</span>
    </div>`,
  )
  .join("");

  const sideLbl = (txt) =>
    `<div style="font-size:9px;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,0.45);margin:16px 0 8px;font-family:'Times New Roman',Times,serif;">${txt}</div>`;
  const contactItems = [c.phone, c.email, c.location, c.linkedin].filter(
    Boolean,
  );
  const extraMeta = [
    c.dob && `DOB: ${c.dob}`,
    c.nationality && `Nationality: ${c.nationality}`,
    c.visaStatus && `Visa: ${c.visaStatus}`,
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Times New Roman',Times,serif;}
  html,body{background:#eef0f4;}
  .rw{background:#eef0f4;padding:24px 0;}
  .resume{background:#fff;width:794px;max-width:794px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,.18);min-height:auto;display:flex;}
  .sec-label{
  font-size:${fs(10.5)};
  font-weight:700;
  color:${accent};
};letter-spacing:2.5px;text-transform:uppercase;border-bottom:2px solid ${accent};padding-bottom:5px;margin:20px 0 12px;display:block;}
  img{-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;}
 @media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}html,body{background:#fff;padding:0;margin:0;width:210mm;overflow:visible}.rw{padding:0;margin:0}.resume{box-shadow:none;margin:0 auto;width:100%;max-width:100%;transform:none!important;overflow:visible;page-break-inside:avoid;break-inside:avoid}.section,.experience,.project,.education{page-break-inside:avoid;break-inside:avoid}@page{size:A4;margin:8mm}}
</style>
</head>
<body>
<div class="rw">
<div class="resume">

  <!-- SIDEBAR -->
  <div style="width:250px;min-width:250px;background:${accent};padding:28px 20px;color:#fff;display:flex;flex-direction:column;">
    ${photoSlot}
    <div style="font-size:19px;font-weight:700;color:#fff;font-family:'Times New Roman',Times,serif;line-height:1.2;text-align:center;">${c.name || ""}</div>
    <div style="font-size:11.5px;font-style:italic;color:rgba(255,255,255,0.7);margin:5px 0 14px;text-align:center;font-family:'Times New Roman',Times,serif;">${c.title || ""}</div>
    <div style="border-bottom:1px solid rgba(255,255,255,0.2);margin-bottom:2px;"></div>

    ${sideLbl("Contact")}
    ${contactItems.map((x) => `<div style="font-size:11px;color:rgba(255,255,255,0.85);line-height:2;font-family:'Times New Roman',Times,serif;word-break:break-all;">${x}</div>`).join("")}

    ${extraMeta.length ? sideLbl("Personal") + extraMeta.map((x) => `<div style="font-size:11px;color:rgba(255,255,255,0.75);line-height:2;font-family:'Times New Roman',Times,serif;">${x}</div>`).join("") : ""}

    ${(c.skills || []).length ? sideLbl("Skills") + (c.skills || []).map((s) => `<span style="display:inline-block;background:rgba(255,255,255,0.15);color:#fff;font-size:10.5px;padding:3px 9px;border-radius:20px;margin:2px;font-family:'Times New Roman',Times,serif;">${s}</span>`).join("") : ""}

    ${(c.languages || []).length ? sideLbl("Languages") + (c.languages || []).map((x) => `<div style="font-size:11px;color:rgba(255,255,255,0.8);line-height:2;font-family:'Times New Roman',Times,serif;">${x}</div>`).join("") : ""}

    ${(c.certifications || []).length ? sideLbl("Certifications") + (c.certifications || []).map((x) => `<div style="font-size:10.5px;color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:4px;font-family:'Times New Roman',Times,serif;">${x}</div>`).join("") : ""}

    ${eduRows.length ? sideLbl("Education") + eduRows : ""}

    ${(c.hobbies || []).length ? sideLbl("Interests") + `<div style="font-size:11px;color:rgba(255,255,255,0.7);font-family:'Times New Roman',Times,serif;">${(c.hobbies || []).join(" · ")}</div>` : ""}

    ${c.gdprClause ? `<div style="font-size:8.5px;color:rgba(255,255,255,0.4);margin-top:auto;padding-top:16px;line-height:1.5;font-family:'Times New Roman',Times,serif;">${c.gdprClause}</div>` : ""}
  </div>

  <!-- MAIN COLUMN -->
  <div style="flex:1;padding:32px 28px;overflow:hidden;">

    <!-- Summary box -->
    <div style="border-left:4px solid ${accent};padding:12px 16px;background:#fafafa;font-size:12px;font-style:italic;color:#333;line-height:1.9;margin-bottom:4px;font-family:'Times New Roman',Times,serif;">${c.summary || ""}</div>

    ${
      (c.coreCompetencies || []).length
        ? `
    <span class="sec-label">Core Competencies</span>
    <div style="margin-bottom:4px;">${(c.coreCompetencies || []).map((s) => `<span style="display:inline-block;background:${accent}12;color:${accent};font-size:10.5px;padding:2px 9px;border-radius:3px;margin:2px;font-family:'Times New Roman',Times,serif;font-weight:600;">${s}</span>`).join("")}</div>
    `
        : ""
    }

    <span class="sec-label">Professional Experience</span>
    ${expRows}

    ${
      c.declaration
        ? `
<div style="page-break-inside:avoid;break-inside:avoid;break-before:avoid;">
<span class="sec-label">Declaration</span>
<p style="font-size:11px;color:#555;font-style:italic;font-family:'Times New Roman',Times,serif;">${c.declaration}</p>
</div>`
        : ""
    }
  </div>

</div>
</div>
</body>
</html>`;
};

// ─── MINIMAL PRO ──────────────────────────────────────────────────────────────
const buildMinimalHtml = (c, accent, hasPhoto) => {
  const photoSlot = hasPhoto
    ? `<img src="__PHOTO__" draggable="false" ondragstart="return false;" style="${photoImgStyle(100, 125, "border-radius:2px;border:1px solid #ddd;")}">`
    : "";

  const expRows = (c.experience || [])
    .map(
      (e) => `
    <div style="margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
        <div>
          <span style="font-size:13px;font-style:italic;color:#111;font-weight:600;font-family:'Times New Roman',Times,serif;">${e.role || ""}</span>
          <span style="font-size:11.5px;color:#555;font-family:'Times New Roman',Times,serif;"> — ${e.company || ""}</span>
        </div>
        <span style="font-size:11px;color:#aaa;font-family:'Times New Roman',Times,serif;white-space:nowrap;margin-left:12px;">${e.duration || ""}</span>
      </div>
      ${e.location ? `<div style="font-size:10.5px;color:#bbb;margin-bottom:5px;font-family:'Times New Roman',Times,serif;">${e.location}</div>` : ""}
      ${(e.bullets || []).map((b) => `<div style="font-size:11.5px;color:#444;line-height:1.9;padding-left:16px;font-family:'Times New Roman',Times,serif;">— ${b}</div>`).join("")}
    </div>`,
    )
    .join("");

  const eduRows = (c.education || [])
    .map(
      (e) =>
        `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px;">
      <div>
        <span style="font-size:12px;font-weight:600;color:#111;font-family:'Times New Roman',Times,serif;">${e.degree || ""}</span>
        <span style="font-size:11.5px;color:#666;font-family:'Times New Roman',Times,serif;"> — ${e.institution || ""}</span>
      </div>
      <span style="font-size:11px;color:#aaa;font-family:'Times New Roman',Times,serif;">${e.year || ""} ${e.grade ? "· " + e.grade : ""}</span>
    </div>`,
    )
    .join("");

  const contactItems = [c.phone, c.email, c.location, c.linkedin].filter(
    Boolean,
  );
  const extraMeta = [
    c.dob && `DOB: ${c.dob}`,
    c.nationality && `Nationality: ${c.nationality}`,
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Times New Roman',Times,serif;}
  html,body{background:#eef0f4;}
  .rw{background:#eef0f4;padding:24px 0;}
  .resume{background:#fff;width:794px;max-width:794px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,.18);min-height:auto;padding:50px 56px 56px;}
  .sec-label{font-size:9.5px;text-transform:uppercase;letter-spacing:5px;color:#bbb;padding:22px 0 8px;border-bottom:0.5px solid #e0e0e0;margin-bottom:14px;display:block;}
  img{-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}html,body{background:#fff;padding:0;margin:0;width:210mm;overflow:visible}.rw{padding:0;margin:0}.resume{box-shadow:none;margin:0 auto;width:100%;max-width:100%;transform:none!important;overflow:visible;page-break-inside:avoid;break-inside:avoid}.section,.experience,.project,.education{page-break-inside:avoid;break-inside:avoid}@page{size:A4;margin:8mm}}
</style>
</head>
<body>
<div class="rw">
<div class="resume">

  <!-- HEADER — flexbox, photo last-child = top-right -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:32px;padding-bottom:22px;border-bottom:0.5px solid #ddd;margin-bottom:28px;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:38px;font-weight:300;color:#111;letter-spacing:0.5px;line-height:1.1;font-family:'Times New Roman',Times,serif;">${c.name || ""}</div>
      <div style="font-size:13px;color:#777;font-style:italic;margin:6px 0 14px;font-family:'Times New Roman',Times,serif;">${c.title || ""}</div>
      <div style="display:flex;flex-wrap:wrap;gap:20px;">
        ${contactItems.map((x) => `<span style="font-size:11px;color:#999;font-family:'Times New Roman',Times,serif;">${x}</span>`).join("")}
      </div>
      ${extraMeta.length ? `<div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:6px;">${extraMeta.map((x) => `<span style="font-size:11px;color:#bbb;font-family:'Times New Roman',Times,serif;">${x}</span>`).join("")}</div>` : ""}
    </div>
    ${photoSlot}
  </div>

  <!-- Summary -->
  <span class="sec-label">Summary</span>
  <p style="font-size:12px;color:#444;line-height:1.95;font-style:italic;margin-bottom:6px;font-family:'Times New Roman',Times,serif;">${c.summary || ""}</p>

  ${
    (c.coreCompetencies || []).length
      ? `
  <span class="sec-label">Core Competencies</span>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;">${(c.coreCompetencies || []).map((s) => `<span style="font-size:11px;color:#666;border:0.5px solid #ddd;padding:2px 9px;border-radius:2px;font-family:'Times New Roman',Times,serif;">${s}</span>`).join("")}</div>
  `
      : ""
  }

  <span class="sec-label">Experience</span>
  ${expRows}

  <span class="sec-label">Education</span>
  ${eduRows}

  <span class="sec-label">Skills</span>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;">
    ${(c.skills || []).map((s) => `<span style="font-size:11px;color:#555;border:0.5px solid #ddd;padding:2px 9px;border-radius:2px;font-family:'Times New Roman',Times,serif;">${s}</span>`).join("")}
  </div>

  ${
    (c.certifications || []).length
      ? `
  <span class="sec-label">Certifications</span>
  <div style="display:flex;flex-wrap:wrap;gap:10px;">${(c.certifications || []).map((x) => `<span style="font-size:11.5px;color:#444;font-family:'Times New Roman',Times,serif;">• ${x}</span>`).join("")}</div>
  `
      : ""
  }

  ${
  (c.awards || []).length
    ? `
<span class="sec-label">Awards & Achievements</span>
<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
${(c.awards || [])
  .map(
    (x) =>
      `<span style="font-size:11.5px;color:#333;font-family:'Times New Roman',Times,serif;">• ${x}</span>`
  )
  .join("")}
</div>`
    : ""
}

${
  (c.languages || []).length
    ? `
<span class="sec-label">Languages</span>
  <div style="display:flex;flex-wrap:wrap;gap:12px;">${(c.languages || []).map((x) => `<span style="font-size:11.5px;color:#555;font-family:'Times New Roman',Times,serif;">${x}</span>`).join("")}</div>
  `
      : ""
  }

  ${
    (c.hobbies || []).length
      ? `
  <span class="sec-label">Interests</span>
  <p style="font-size:11.5px;color:#666;font-family:'Times New Roman',Times,serif;">${(c.hobbies || []).join(" · ")}</p>
  `
      : ""
  }

  ${
    c.declaration
      ? `
<div style="page-break-inside:avoid;break-inside:avoid;break-before:avoid;">
<span class="sec-label">Declaration</span>
<p style="font-size:11px;color:#555;font-style:italic;font-family:'Times New Roman',Times,serif;">${c.declaration}</p>
</div>`
      : ""
  }

  ${c.gdprClause ? `<p style="font-size:9px;color:#bbb;font-style:italic;margin-top:16px;font-family:'Times New Roman',Times,serif;">${c.gdprClause}</p>` : ""}

</div>
</div>
</body>
</html>`;
};

// ─── PRESTIGE (creative, magazine sidebar) ────────────────────────────────────
const buildCreativeHtml = (c, accent, hasPhoto) => {
  const photoSlot = hasPhoto
    ? `<img src="__PHOTO__" draggable="false" ondragstart="return false;" style="${photoImgStyle(130, 163, "border-radius:4px;border:3px solid rgba(201,168,76,0.6);")}">`
    : `<div style="width:130px;height:163px;border-radius:4px;border:2px dashed rgba(201,168,76,0.4);display:flex;align-items:center;justify-content:center;font-size:36px;">👤</div>`;

  const expRows = (c.experience || [])
    .map(
      (e) => `
    <div style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">
        <div>
          <span style="font-size:13px;font-weight:700;color:#1e293b;font-family:'Times New Roman',Times,serif;">${e.company || ""}</span>
          <span style="font-size:12px;font-style:italic;color:${accent};font-family:'Times New Roman',Times,serif;"> · ${e.role || ""}</span>
        </div>
        <span style="font-size:11px;color:#888;font-family:'Times New Roman',Times,serif;white-space:nowrap;margin-left:12px;">${e.duration || ""}</span>
      </div>
      ${e.location ? `<div style="font-size:10.5px;color:#aaa;margin-bottom:5px;font-family:'Times New Roman',Times,serif;">${e.location}</div>` : ""}
      <div style="border-left:2px solid #c9a84c44;padding-left:10px;margin-top:5px;">
        ${(e.bullets || []).map((b) => `<div style="font-size:11.5px;color:#333;line-height:1.85;margin-bottom:3px;font-family:'Times New Roman',Times,serif;">• ${b}</div>`).join("")}
      </div>
    </div>`,
    )
    .join("");

  const contactItems = [c.phone, c.email, c.location, c.linkedin].filter(
    Boolean,
  );
  const extraMeta = [
    c.dob && `DOB: ${c.dob}`,
    c.nationality && `Nationality: ${c.nationality}`,
    c.visaStatus && `Visa: ${c.visaStatus}`,
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Times New Roman',Times,serif;}
  html,body{background:#eef0f4;}
  .rw{background:#eef0f4;padding:24px 0;}
  .resume{background:#fff;width:794px;max-width:794px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,.18);min-height:auto;}
  .sec-label-main{font-size:10.5px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${accent};border-bottom:2px double ${accent}33;padding-bottom:5px;margin:20px 0 12px;display:block;}
  .sec-label-side{font-size:9px;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,0.5);margin:16px 0 8px;display:block;font-family:'Times New Roman',Times,serif;}
  img{-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}html,body{background:#fff;padding:0;margin:0;width:210mm;overflow:visible}.rw{padding:0;margin:0}.resume{box-shadow:none;margin:0 auto;width:100%;max-width:100%;transform:none!important;overflow:visible;page-break-inside:avoid;break-inside:avoid}.section,.experience,.project,.education{page-break-inside:avoid;break-inside:avoid}@page{size:A4;margin:8mm}}
</style>
</head>
<body>
<div class="rw">
<div class="resume">

  <!-- HEADER -->
  <div style="background:${accent};display:flex;align-items:stretch;min-height:190px;">
    <!-- Photo column -->
    <div style="width:160px;min-width:160px;display:flex;align-items:center;justify-content:center;padding:24px;background:${accent}cc;flex-shrink:0;">
      ${photoSlot}
    </div>
    <!-- Info -->
    <div style="flex:1;padding:28px 32px;display:flex;flex-direction:column;justify-content:center;">
      <div style="font-size:30px;font-weight:700;color:#fff;letter-spacing:1px;font-family:'Times New Roman',Times,serif;">${c.name || ""}</div>
      <div style="width:64px;border-bottom:2px solid rgba(201,168,76,0.7);margin:10px 0;"></div>
      <div style="font-size:13px;font-style:italic;color:rgba(255,255,255,0.72);font-family:'Times New Roman',Times,serif;">${c.title || ""}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;margin-top:14px;">
        ${contactItems.map((x) => `<span style="font-size:11px;color:rgba(255,255,255,0.7);font-family:'Times New Roman',Times,serif;">${x}</span>`).join("")}
        ${extraMeta.map((x) => `<span style="font-size:11px;color:rgba(255,255,255,0.6);font-family:'Times New Roman',Times,serif;">${x}</span>`).join("")}
      </div>
    </div>
  </div>

  <!-- BODY: two-column grid -->
  <div style="display:grid;grid-template-columns:2fr 1fr;">

    <!-- MAIN -->
    <div style="padding:28px 24px 36px 36px;border-right:1px solid #eee;">
      <span class="sec-label-main">Professional Summary</span>
      <p style="font-size:12px;color:#333;line-height:1.9;font-style:italic;font-family:'Times New Roman',Times,serif;">${c.summary || ""}</p>

      ${
        (c.coreCompetencies || []).length
          ? `
      <span class="sec-label-main">Core Competencies</span>
      <div>${(c.coreCompetencies || []).map((s) => `<span style="display:inline-block;background:${accent}12;color:${accent};font-size:10.5px;padding:2px 9px;border-radius:3px;margin:2px;font-family:'Times New Roman',Times,serif;font-weight:600;">${s}</span>`).join("")}</div>
      `
          : ""
      }

      <span class="sec-label-main">Professional Experience</span>
      ${expRows}

      ${
        c.declaration
          ? `
      <span class="sec-label-main">Declaration</span>
      <p style="font-size:11px;color:#666;font-style:italic;font-family:'Times New Roman',Times,serif;">${c.declaration}</p>`
          : ""
      }

      ${c.gdprClause ? `<p style="font-size:8.5px;color:#bbb;font-style:italic;margin-top:12px;font-family:'Times New Roman',Times,serif;">${c.gdprClause}</p>` : ""}
    </div>

    <!-- SIDEBAR -->
    <div style="padding:28px 18px;background:#fafafa;">
      ${
        (c.skills || []).length
          ? `
      <span class="sec-label-main" style="color:#666;">Skills</span>
      ${(c.skills || []).map((s) => `<div style="font-size:11.5px;color:#333;padding:4px 0;border-bottom:1px dotted #e0e0e0;font-family:'Times New Roman',Times,serif;">• ${s}</div>`).join("")}`
          : ""
      }

      ${
        (c.education || []).length
          ? `
      <span class="sec-label-main" style="color:#666;margin-top:18px;">Education</span>
      ${(c.education || []).map((e) => `<div style="margin-bottom:10px;"><div style="font-size:11.5px;font-weight:700;color:#333;font-family:'Times New Roman',Times,serif;">${e.degree || ""}</div><div style="font-size:11px;color:#666;font-family:'Times New Roman',Times,serif;">${e.institution || ""}</div><div style="font-size:10.5px;color:#aaa;font-family:'Times New Roman',Times,serif;">${e.year || ""} ${e.grade ? "· " + e.grade : ""}</div></div>`).join("")}`
          : ""
      }

      ${
        (c.languages || []).length
          ? `
      <span class="sec-label-main" style="color:#666;margin-top:18px;">Languages</span>
      ${(c.languages || []).map((x) => `<div style="font-size:11.5px;color:#333;padding:3px 0;font-family:'Times New Roman',Times,serif;">${x}</div>`).join("")}`
          : ""
      }

      ${
        (c.certifications || []).length
          ? `
      <span class="sec-label-main" style="color:#666;margin-top:18px;">Certifications</span>
      ${(c.certifications || []).map((x) => `<div style="font-size:11px;color:#444;padding:3px 0;line-height:1.5;border-bottom:1px dotted #eee;font-family:'Times New Roman',Times,serif;">${x}</div>`).join("")}`
          : ""
      }

      ${
        (c.hobbies || []).length
          ? `
      <span class="sec-label-main" style="color:#666;margin-top:18px;">Interests</span>
      ${(c.hobbies || []).map((x) => `<div style="font-size:11px;color:#666;padding:2px 0;font-family:'Times New Roman',Times,serif;">• ${x}</div>`).join("")}`
          : ""
      }
    </div>

  </div>
</div>
</div>
</body>
</html>`;
};

// ─── CLASSIC PRO ──────────────────────────────────────────────────────────────
const buildClassicHtml = (c, accent, hasPhoto) => {
  const photoSlot = hasPhoto
    ? `<img src="__PHOTO__" draggable="false" ondragstart="return false;" style="${photoImgStyle(100, 125, "border-radius:2px;border:2px solid #ddd;")}">`
    : "";

  const expRows = (c.experience || [])
    .map(
      (e) => `
    <div style="margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
        <div style="font-size:13px;font-weight:700;color:#111;font-family:'Times New Roman',Times,serif;">${e.role || ""} — ${e.company || ""}</div>
        <span style="font-size:11.5px;font-style:italic;color:#666;font-family:'Times New Roman',Times,serif;white-space:nowrap;margin-left:12px;">${e.duration || ""}</span>
      </div>
      ${e.location ? `<div style="font-size:11px;color:#999;margin-bottom:5px;font-family:'Times New Roman',Times,serif;">${e.location}</div>` : ""}
      <ul style="margin:5px 0 0 22px;padding:0;">
        ${(e.bullets || []).map((b) => `<li style="font-size:12px;color:#333;line-height:1.9;margin-bottom:2px;font-family:'Times New Roman',Times,serif;">${b}</li>`).join("")}
      </ul>
    </div>`,
    )
    .join("");

  const eduRows = (c.education || [])
    .map(
      (e) =>
        `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
      <div>
        <span style="font-size:12px;font-weight:700;color:#111;font-family:'Times New Roman',Times,serif;">${e.degree || ""}</span>
        <span style="font-size:11.5px;color:#555;font-family:'Times New Roman',Times,serif;"> — ${e.institution || ""}</span>
      </div>
      <span style="font-size:11.5px;font-style:italic;color:#666;font-family:'Times New Roman',Times,serif;">${e.year || ""} ${e.grade ? "· " + e.grade : ""}</span>
    </div>`,
    )
    .join("");

  const contactItems = [c.phone, c.email, c.location, c.linkedin].filter(
    Boolean,
  );
  const extraMeta = [
    c.dob && `DOB: ${c.dob}`,
    c.nationality && `Nationality: ${c.nationality}`,
    c.visaStatus && `Visa: ${c.visaStatus}`,
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Times New Roman',Times,serif;}
  html,body{background:#eef0f4;}
  .rw{background:#eef0f4;padding:24px 0;}
  .resume{background:#fafaf8;width:794px;max-width:794px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,.18);min-height:auto;}
  .sec-label{background:${accent};color:#fff;padding:5px 48px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;margin:20px -48px 14px;display:block;}
  .body-wrap{padding:0 48px 48px;}
  img{-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;}
 @media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}html,body{background:#fff;padding:0;margin:0;width:210mm;overflow:visible}.rw{padding:0;margin:0}.resume{box-shadow:none;margin:0 auto;width:100%;max-width:100%;transform:none!important;overflow:visible;page-break-inside:avoid;break-inside:avoid}.section,.experience,.project,.education{page-break-inside:avoid;break-inside:avoid}@page{size:A4;margin:8mm}}
</style>
</head>
<body>
<div class="rw">
<div class="resume">

  <!-- HEADER — centred text, photo is flex last-child pushed right -->
  <div style="padding:34px 48px 22px;border-bottom:3px double #ccc;background:#fafaf8;display:flex;align-items:flex-start;gap:20px;">
    <div style="flex:1;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:3px;font-family:'Times New Roman',Times,serif;">${c.name || ""}</div>
      <div style="font-size:13px;font-style:italic;color:#555;margin-top:5px;font-family:'Times New Roman',Times,serif;">${c.title || ""}</div>
      <div style="font-size:12px;color:#666;margin-top:9px;font-family:'Times New Roman',Times,serif;">${contactItems.join(" · ")}</div>
      ${extraMeta.length ? `<div style="font-size:11.5px;color:#999;margin-top:5px;font-family:'Times New Roman',Times,serif;">${extraMeta.join(" · ")}</div>` : ""}
    </div>
    ${photoSlot}
  </div>

  <div class="body-wrap">

    <!-- Summary / Personal Statement -->
    <span class="sec-label">Professional Summary</span>
    <p style="font-size:12px;color:#333;line-height:1.9;font-family:'Times New Roman',Times,serif;">${c.personalStatement || c.summary || ""}</p>

    ${
      (c.coreCompetencies || []).length
        ? `
    <span class="sec-label">Core Competencies</span>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;">
      ${(c.coreCompetencies || []).map((s) => `<div style="font-size:12px;color:#333;font-family:'Times New Roman',Times,serif;">• ${s}</div>`).join("")}
    </div>
    `
        : ""
    }

    <span class="sec-label">Professional Experience</span>
    ${expRows}

    <span class="sec-label">Education</span>
    ${eduRows}

    <span class="sec-label">Skills</span>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;">
      ${(c.skills || []).map((s) => `<div style="font-size:12px;color:#333;font-family:'Times New Roman',Times,serif;">• ${s}</div>`).join("")}
    </div>

    ${
      (c.certifications || []).length
        ? `
    <span class="sec-label">Certifications</span>
    <div style="display:flex;flex-wrap:wrap;gap:8px 20px;">${(c.certifications || []).map((x) => `<span style="font-size:12px;color:#333;font-family:'Times New Roman',Times,serif;">• ${x}</span>`).join("")}</div>
    `
        : ""
    }

    ${
      (c.languages || []).length
        ? `
    <span class="sec-label">Languages</span>
    <div style="display:flex;flex-wrap:wrap;gap:8px 20px;">${(c.languages || []).map((x) => `<span style="font-size:12px;color:#333;font-family:'Times New Roman',Times,serif;">${x}</span>`).join("")}</div>
    `
        : ""
    }

    ${
      (c.hobbies || []).length
        ? `
    <span class="sec-label">Interests & Hobbies</span>
    <p style="font-size:12px;color:#333;font-family:'Times New Roman',Times,serif;">${(c.hobbies || []).join(" · ")}</p>
    `
        : ""
    }

    ${
      c.declaration
        ? `
    <span class="sec-label">Declaration</span>
    <p style="font-size:11px;color:#555;font-style:italic;font-family:'Times New Roman',Times,serif;">${c.declaration}</p>
    `
        : ""
    }

    ${c.gdprClause ? `<p style="font-size:9px;color:#aaa;font-style:italic;margin-top:16px;font-family:'Times New Roman',Times,serif;">${c.gdprClause}</p>` : ""}

  </div>
</div>
</div>
</body>
</html>`;
};

// ─── TEMPLATE DISPATCHER ──────────────────────────────────────────────────────
const buildResumeHtml = (
  contentJson,
  country,
  tmplId,
  hasPhoto,
  fontPreset = "normal"
) => {
    const accent = getAccentColor(country, tmplId);
    const typography = FONT_PRESETS[fontPreset] || FONT_PRESETS.normal;
  switch (tmplId) {
    case "modern":
  return buildModernHtml(
    contentJson,
    accent,
    hasPhoto,
    typography
  );

case "minimal":
  return buildMinimalHtml(
    contentJson,
    accent,
    hasPhoto,
    typography
  );

case "creative":
  return buildCreativeHtml(
    contentJson,
    accent,
    hasPhoto,
    typography
  );

case "classic":
  return buildClassicHtml(
    contentJson,
    accent,
    hasPhoto,
    typography
  );

default:
  return buildExecutiveHtml(
    contentJson,
    accent,
    hasPhoto,
    typography
  );
  }
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
        boxShadow: selected
          ? `0 10px 32px ${accent}44`
          : "0 2px 8px rgba(0,0,0,.06)",
        background: "#fff",
      }}
    >
      <div
        style={{
          height: 130,
          background: "#f8fafc",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {tmpl.preview.layout === "two-col" ||
        tmpl.preview.layout === "sidebar" ? (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "38%",
                height: "100%",
                background: accent,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                width: "62%",
                height: "100%",
                background: "#fff",
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    height: i === 0 ? 7 : 3,
                    width: `${45 + ((i * 11) % 40)}%`,
                    background: i === 0 ? "#1f2937" : "#d1d5db",
                    borderRadius: 3,
                    margin: `${i === 0 ? 16 : 8}px 10px 0`,
                  }}
                />
              ))}
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 8,
                  top: 16 + i * 20,
                  height: 3,
                  width: `${50 + ((i * 12) % 25)}%`,
                  background: "rgba(255,255,255,0.45)",
                  borderRadius: 3,
                }}
              />
            ))}
          </>
        ) : tmpl.preview.layout === "minimal" ? (
          <>
            <div style={{ position: "absolute", top: 20, left: 16, right: 16 }}>
              <div
                style={{
                  height: 9,
                  width: "55%",
                  background: "#111",
                  borderRadius: 2,
                  marginBottom: 6,
                }}
              />
              <div
                style={{
                  height: 3,
                  width: "35%",
                  background: "#aaa",
                  borderRadius: 2,
                  marginBottom: 14,
                }}
              />
              <div
                style={{ height: 0.5, background: "#ddd", marginBottom: 12 }}
              />
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 2.5,
                    width: `${40 + ((i * 13) % 45)}%`,
                    background: "#d1d5db",
                    borderRadius: 2,
                    marginBottom: 7,
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 52,
                background: accent,
              }}
            />
            <div style={{ position: "absolute", top: 16, left: 16, right: 16 }}>
              <div
                style={{
                  height: 7,
                  width: "50%",
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: 2,
                  marginBottom: 4,
                }}
              />
              <div
                style={{
                  height: 3,
                  width: "30%",
                  background: "rgba(255,255,255,0.5)",
                  borderRadius: 2,
                }}
              />
            </div>
            <div style={{ position: "absolute", top: 62, left: 16, right: 16 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 3,
                    width: `${42 + ((i * 14) % 42)}%`,
                    background: "#d1d5db",
                    borderRadius: 2,
                    marginBottom: 7,
                  }}
                />
              ))}
            </div>
          </>
        )}
        {selected && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: accent,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 900,
              boxShadow: "0 2px 8px rgba(0,0,0,.25)",
            }}
          >
            ✓
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: accent,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: selected ? accent : "#1e293b",
              fontFamily: "'Times New Roman',serif",
            }}
          >
            {tmpl.name}
          </span>
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: "#64748b",
            paddingLeft: 17,
            fontFamily: "'Times New Roman',serif",
          }}
        >
          {tmpl.desc}
        </div>
      </div>
    </div>
  );
}

// ─── WYSIWYG EDITOR ───────────────────────────────────────────────────────────
function RealtimeEditor({
  html,
  onHtmlChange,
  onDownload,
  fileName,
  parsedData,
  country,
  selectedTmpl,
  onRegenerate,
  onBack,
  onJD,
  fontPreset,
  setFontPreset,
}) {
  const iframeRef = useRef();
  const [mode, setMode] = useState("preview");
  const [sourceHtml, setSourceHtml] = useState(html);
  const newPhotoRef = useRef();
  const liveHtmlRef = useRef(html);

  useEffect(() => {
    setSourceHtml(html);
    liveHtmlRef.current = html;
  }, [html]);

  const captureFromIframe = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return liveHtmlRef.current;
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  };

  const syncToParent = () => {
    const captured = captureFromIframe();
    liveHtmlRef.current = captured;
    setSourceHtml(captured);
    onHtmlChange(captured);
  };

  const handleDownloadWord = () => {
    const latest = captureFromIframe();
    downloadAsWord(latest, fileName || "resume");
  };

  const handleDownloadHtml = () => {
    const latest = captureFromIframe();
    const name = (fileName || "resume").replace(/\.html$/i, "") + ".html";
    downloadHtml(latest, name);
  };

  const execCmd = (cmd, val = null) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.execCommand(cmd, false, val);
  };

  // ── Swap photo: replace img src + re-lock drag attributes ──────────────────
  const injectNewPhoto = (file) => {
    const r = new FileReader();
    r.onload = (e) => {
      const b64 = e.target.result;
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const allImgs = doc.querySelectorAll("img");
      let target = null;
      allImgs.forEach((img) => {
        if (
          img.src.startsWith("data:image") ||
          img.getAttribute("src") === "__PHOTO__"
        ) {
          if (!target) target = img;
        }
      });
      if (target) {
        target.src = b64;
        // Re-lock drag after swap
        target.setAttribute("draggable", "false");
        target.setAttribute("ondragstart", "return false;");
        target.style.pointerEvents = "none";
        target.style.webkitUserDrag = "none";
      } else {
        const header =
          doc.querySelector(".resume > div:first-child") ||
          doc.querySelector(".resume");
        if (header) {
          const img = doc.createElement("img");
          img.src = b64;
          img.setAttribute("draggable", "false");
          img.setAttribute("ondragstart", "return false;");
          img.style.cssText =
            "width:108px;height:135px;object-fit:cover;object-position:center top;border-radius:4px;border:2.5px solid #c9a84c;display:block;flex-shrink:0;pointer-events:none;user-select:none;-webkit-user-drag:none;";
          header.appendChild(img);
        }
      }
      syncToParent();
    };
    r.readAsDataURL(file);
  };

  // ── iframe onLoad: make text editable, lock all images drag ───────────────
  const onIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return;

    // Photo images — drag to reposition చేయగలిగేలా చేయి
    doc.querySelectorAll("img").forEach((img) => {
      img.removeAttribute("draggable");
      img.style.pointerEvents = "auto";
      img.style.cursor = "move";
      img.style.webkitUserDrag = "auto";
      img.style.position = "relative";
      img.ondragstart = null;

      let isDragging = false, startX, startY, origLeft, origTop;

      img.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        origLeft = parseInt(img.style.left || 0);
        origTop = parseInt(img.style.top || 0);
        e.preventDefault();
      });

      doc.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        img.style.left = (origLeft + e.clientX - startX) + "px";
        img.style.top = (origTop + e.clientY - startY) + "px";
      });

      doc.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          syncToParent();
        }
      });
    });

    // Make text elements editable
    doc
      .querySelectorAll(
        "p, span, h1, h2, h3, h4, h5, li, td, th, b, strong, em, i, div[style]",
      )
      .forEach((el) => {
        if (el.textContent.trim().length === 0) return;
        if (el.children.length > 2) return;
        el.setAttribute("contenteditable", "true");
        el.style.outline = "none";
        el.style.cursor = "text";
        el.addEventListener("focus", function () {
          this.style.outline = "1.5px dashed rgba(37,99,235,0.35)";
          this.style.borderRadius = "2px";
        });
        el.addEventListener("blur", function () {
          this.style.outline = "none";
          syncToParent();
        });
      });
  };

  const applySource = () => {
    liveHtmlRef.current = sourceHtml;
    onHtmlChange(sourceHtml);
    setMode("preview");
  };

  const TOOLBAR = [
    { label: "B", cmd: "bold" },
    { label: "I", cmd: "italic" },
    { label: "U", cmd: "underline" },
    { label: "S̶", cmd: "strikeThrough" },
    { label: "H1", cmd: "formatBlock", val: "h2" },
    { label: "H2", cmd: "formatBlock", val: "h3" },
    { label: "¶", cmd: "formatBlock", val: "p" },
    { label: "•", cmd: "insertUnorderedList" },
    { label: "1.", cmd: "insertOrderedList" },
    { label: "⬅", cmd: "justifyLeft" },
    { label: "⬛", cmd: "justifyCenter" },
    { label: "➡", cmd: "justifyRight" },
    { label: "↩", cmd: "undo" },
    { label: "↪", cmd: "redo" },
  ];

  const COLOR_OPTIONS = [
    "#000000",
    "#1a1a2e",
    "#6b1c1c",
    "#1e3a8a",
    "#1a3a1a",
    "#c9a84c",
    "#ffffff",
    "#555555",
    "#888888",
    "#dc2626",
  ];
  const HIGHLIGHT_OPTIONS = [
    "#fef9c3",
    "#dcfce7",
    "#dbeafe",
    "#fce7f3",
    "transparent",
  ];

  return (
    <div
      style={{
        background: "#0f172a",
        borderRadius: "18px 18px 0 0",
        overflow: "hidden",
        border: "1.5px solid #1e293b",
      }}
    >
      {/* TOP NAV */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["preview", "source"].map((m) => (
            <button
              key={m}
              onClick={() => {
                if (m === "preview" && mode === "source") applySource();
                else setMode(m);
              }}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: mode === m ? "#2563eb" : "#1e293b",
                color: mode === m ? "#fff" : "#94a3b8",
                fontWeight: 700,
                fontSize: 12,
                fontFamily: "'Times New Roman',serif",
              }}
            >
              {m === "preview" ? "👁 Preview & Edit" : "{ } Source HTML"}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            ref={newPhotoRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) =>
              e.target.files[0] && injectNewPhoto(e.target.files[0])
            }
          />
          <button
            onClick={() => newPhotoRef.current?.click()}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Times New Roman',serif",
            }}
          >
            📷 Swap Photo
          </button>
          <button
            onClick={onRegenerate}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: "#1e293b",
              color: "#94a3b8",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Times New Roman',serif",
            }}
          >
            🔄 Regenerate
          </button>
          <button
            onClick={onBack}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: "#1e293b",
              color: "#94a3b8",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Times New Roman',serif",
            }}
          >
            ← Templates
          </button>
          <button
            onClick={onJD}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: "#92400e",
              color: "#fbbf24",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Times New Roman',serif",
            }}
          >
            📋 JD Match
          </button>
          <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "white",
  }}
>
  <span
    style={{
      color: "#fff",
      fontSize: 12,
      fontWeight: 700,
    }}
  >
    Font
  </span>

  <select
  value={fontPreset}
  onChange={(e) => {
  const value = e.target.value;

  console.log("FONT PRESET =", value);

  setFontPreset(value);

}}
  style={{
    width: 120,
    height: 32,
    background: "#ffffff",
    color: "#000000",
    border: "1px solid #ccc",
    borderRadius: 4,
  }}
>
  <option value="compact">Compact</option>
  <option value="normal">Normal</option>
  <option value="comfortable">Comfortable</option>
</select>
</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => {
                const latest = captureFromIframe();
               const scaled = latest.replace(
  "@media print{",
  "@media print{.resume{transform-origin:top left;transform:scale(0.75);width:133.3%!important;max-width:133.3%!important;}",
);
                const w = window.open("", "_blank");
                w.document.write(scaled);
                w.document.close();
                setTimeout(() => w.print(), 800);
              }}
              style={{
                padding: "7px 18px",
                borderRadius: "8px 0 0 8px",
                border: "none",
                background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: "0 3px 12px #dc262644",
                fontFamily: "'Times New Roman',serif",
              }}
            >
              🖨 Download PDF
            </button>
            <button
              onClick={handleDownloadHtml}
              style={{
                padding: "7px 12px",
                borderRadius: "0 8px 8px 0",
                border: "none",
                borderLeft: "1px solid rgba(255,255,255,0.2)",
                background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'Times New Roman',serif",
              }}
            >
              HTML
            </button>
          </div>
        </div>
      </div>

      {mode === "preview" && (
        <>
          {/* FORMAT TOOLBAR */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              padding: "7px 12px",
              background: "#1e293b",
              borderBottom: "1px solid #334155",
              flexWrap: "wrap",
            }}
          >
            {TOOLBAR.map((t, i) => (
              <button
                key={i}
                title={t.label}
                onClick={() => execCmd(t.cmd, t.val || null)}
                style={{
                  padding: "4px 9px",
                  borderRadius: 5,
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#cbd5e1",
                  fontWeight: t.label === "B" ? "bold" : "normal",
                  fontStyle: t.label === "I" ? "italic" : "normal",
                  fontSize: 12,
                  cursor: "pointer",
                  minWidth: 28,
                  textAlign: "center",
                  fontFamily: "'Times New Roman',serif",
                }}
              >
                {t.label}
              </button>
            ))}
            <div
              style={{
                width: 1,
                height: 22,
                background: "#334155",
                margin: "0 6px",
              }}
            />
            <select
              onChange={(e) => execCmd("fontSize", e.target.value)}
              style={{
                padding: "3px 6px",
                borderRadius: 5,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#cbd5e1",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'Times New Roman',serif",
              }}
            >
              <option value="">Size</option>
              {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                <option key={s} value={s}>
                  {[8, 10, 12, 14, 18, 24, 36][s - 1]}px
                </option>
              ))}
            </select>
            <div
              style={{
                width: 1,
                height: 22,
                background: "#334155",
                margin: "0 6px",
              }}
            />
            <span style={{ fontSize: 10, color: "#64748b" }}>Color:</span>
            {COLOR_OPTIONS.map((c) => (
              <div
                key={c}
                onClick={() => execCmd("foreColor", c)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: c,
                  border:
                    c === "#ffffff"
                      ? "1.5px solid #475569"
                      : "1.5px solid transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              />
            ))}
            <div
              style={{
                width: 1,
                height: 22,
                background: "#334155",
                margin: "0 6px",
              }}
            />
            <span style={{ fontSize: 10, color: "#64748b" }}>Hi:</span>
            {HIGHLIGHT_OPTIONS.map((c) => (
              <div
                key={c}
                onClick={() =>
                  execCmd(
                    "hiliteColor",
                    c === "transparent" ? "transparent" : c,
                  )
                }
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: c === "transparent" ? "#1e293b" : c,
                  border: "1.5px solid #475569",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* HINT BAR */}
          <div
            style={{
              padding: "5px 16px",
              background: "#0c1520",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              gap: 20,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 11, color: "#475569" }}>
              ✏️ <strong style={{ color: "#94a3b8" }}>Click text</strong> to
              edit inline
            </span>
            <span style={{ fontSize: 11, color: "#475569" }}>
              📷 <strong style={{ color: "#94a3b8" }}>Swap Photo</strong> to
              replace profile image
            </span>
            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
              🖨 PDF button → "Save as PDF" select చేయి → perfect layout!
            </span>
            <span style={{ fontSize: 11, color: "#475569" }}>
              🖨 Ctrl+P to print as PDF
            </span>
          </div>

          {/* IFRAME */}
          <iframe
            ref={iframeRef}
            srcDoc={html}
            sandbox="allow-same-origin allow-scripts"
            title="Resume Preview"
            style={{
              width: "100%",
              height: 1080,
              border: "none",
              display: "block",
              background: "#eef0f4",
            }}
            onLoad={onIframeLoad}
          />
        </>
      )}

      {mode === "source" && (
        <div>
          <div
            style={{
              padding: "8px 16px",
              background: "#1a1a2e",
              borderBottom: "1px solid #334155",
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            ✏️ Edit raw HTML — click{" "}
            <strong style={{ color: "#60a5fa" }}>Preview & Edit</strong> to
            apply
          </div>
          <textarea
            value={sourceHtml}
            onChange={(e) => setSourceHtml(e.target.value)}
            style={{
              width: "100%",
              height: 900,
              padding: 16,
              fontFamily: "'Courier New',monospace",
              fontSize: 12,
              lineHeight: 1.7,
              border: "none",
              outline: "none",
              resize: "vertical",
              background: "#0a0f1e",
              color: "#e2e8f0",
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              padding: "10px 16px",
              background: "#1e293b",
              display: "flex",
              gap: 10,
            }}
          >
            <button
              onClick={applySource}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'Times New Roman',serif",
              }}
            >
              ✓ Apply & Preview
            </button>
            <button
              onClick={() => setSourceHtml(liveHtmlRef.current)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "transparent",
                color: "#94a3b8",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'Times New Roman',serif",
              }}
            >
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
 const [step, setStep] = useState(1);
const [parsedData, setParsed] = useState(null);
const [country, setCountry] = useState("");
const [template, setTemplate] = useState("executive");
  const [photoB64, setPhotoB64] = useState(null);
  const [photoPreview, setPhotoPr] = useState(null);
const [generatedHtml, setHtml] = useState(null);
const [resumeFontSize, setResumeFontSize] = useState("12px");

const [fontPreset, setFontPreset] = useState("normal");

const [generating, setGenerating] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState(null);
  const [jdText, setJdText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [openGroup, setOpenGroup] = useState(null);
 const [savedContentJson, setSavedContentJson] = useState(null);

  const fileRef = useRef();
  const photoRef = useRef();

  const selectedCountry = ALL_COUNTRIES.find((c) => c.key === country);
  const selectedTmpl = TEMPLATE_DEFS.find((t) => t.id === template);

  // ── FILE UPLOAD ──────────────────────────────────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return;
     sessionStorage.clear();        // ← ADD
  setSavedContentJson(null);     // ← ADD
    setHtml(null);
    setParsed(null);
    setError(null);
    setGenerating(true);
    setLoadMsg("Reading resume file…");
    try {
      const text = await extractText(file, setLoadMsg);
      if (!text || text.trim().length < 50)
        throw new Error(
          "Could not read resume content. Please use .TXT for best results.",
        );
      setLoadMsg("Parsing resume with AI…");
      const raw = await callGroq(
        `
You are a resume parser.

IMPORTANT:
Extract data EXACTLY AS WRITTEN in the resume.
Do NOT rewrite.
Do NOT summarize.
Do NOT improve wording.
Do NOT add missing information.
Do NOT infer anything.
Do NOT merge bullet points.
Do NOT split bullet points.
Preserve original text exactly.

Return ONLY raw JSON.
Do NOT skip any data. Extract every company, role, date, achievement, skill, education entry.

Resume text:
${text}

Return EXACTLY this JSON structure. Extract every field you can find:
{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "location": "city, country",
  "linkedin": "linkedin url if present",
  "dob": "date of birth if mentioned anywhere",
  "nationality": "nationality if mentioned",
  "summary": "professional summary or objective if present",
  "experience": [
    {
      "company": "exact company name",
      "role": "exact job title",
      "duration": "date range e.g. Jan 2020 – Mar 2023",
      "location": "city if mentioned",
      "achievements": ["each bullet point or achievement as separate string"]
    }
  ],
  "education": [
    {
      "institution": "exact institution name",
      "degree": "degree name",
      "year": "graduation year",
      "grade": "GPA or grade if mentioned"
    }
  ],
  "skills": ["skill1", "skill2"],
 "languages": ["spoken/natural languages only e.g. English, Hindi, Telugu — NOT programming languages"],
  "certifications": ["cert1"],
  "hobbies": ["hobby1"],
  "projects": [
    {
      "name": "exact project name",
      "tech": "tech stack mentioned",
      "achievements": ["each bullet point as separate string"]
    }
  ]
}

Rules:
- Include EVERY work experience entry — do not skip any
- Include EVERY education entry
- Extract DOB anywhere it appears (Date of Birth, DOB, Born on, d.o.b.)
- Extract Nationality anywhere it appears
- Include EVERY project entry with name, tech stack, and all bullet points
- Include ALL certifications and achievements listed under certifications section including Hackathon entries
- Include ALL awards, recognitions, achievements, honors, excellence awards, pinnacle awards, consultant awards exactly as written
- Start JSON with { and end with }. Nothing else.`,
        3000,
        setLoadMsg,
      );

      let cleaned = raw
        .trim()
        .replace(/```json|```/g, "")
        .trim();
      const s = cleaned.indexOf("{"),
        e2 = cleaned.lastIndexOf("}");
      if (s !== -1 && e2 !== -1) cleaned = cleaned.slice(s, e2 + 1);
     let parsed;
try {
  parsed = JSON.parse(cleaned);

  console.log("FINAL AI JSON =>", parsed);
  
  console.log(
  "FULL JSON STRING =>",
  JSON.stringify(parsed, null, 2)
);
  console.log("EXPERIENCE COUNT =>", parsed.experience?.length);
  console.log("PROJECTS COUNT =>", parsed.projects?.length);
  console.log("SKILLS COUNT =>", parsed.skills?.length);
  console.log("CERTIFICATIONS =>", parsed.certifications);
  console.log("AWARDS =>", parsed.awards);

} catch {
  parsed = { name: file.name.replace(/\.[^.]+$/, "") };
}
setParsed(parsed);

setStep(2);
      
    } catch (e) {
      setError(e.message);
      setParsed({ name: file.name.replace(/\.[^.]+$/, "") });
      
      setStep(2);
    
    } finally {
      setGenerating(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handlePhotoUpload = (file) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(
        file.type,
      )
    ) {
      setError("Photo must be JPG/PNG/WEBP");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Photo max 3MB");
      return;
    }
    const r = new FileReader();
    r.onload = (e) => {
      setPhotoB64(e.target.result);
      setPhotoPr(e.target.result);
    };
    r.readAsDataURL(file);
  };

  // ── GENERATE RESUME ──────────────────────────────────────────────────────────
  const generateResume = async (jd = "", reuseContent = false) => {
    console.log("GENERATE FONT PRESET =", fontPreset);
    if (!country) {
      setError("Select a country first");
      return;
    }
    setError(null);
    setGenerating(true);
    setHtml(null);

    // If reuseContent=true AND we have savedContentJson AND no JD change → skip AI
    if (reuseContent && savedContentJson && !jd) {
      setLoadMsg("Rebuilding template layout…");
      try {
const rawHtml = buildResumeHtml(
  savedContentJson,
  country,
  template,
  !!photoB64,
  fontPreset
);        const finalHtml = injectPhoto(rawHtml, photoB64);
        setHtml(finalHtml);
      
        setStep(3);
       
      } catch (e) {
        setError(e.message);
      } finally {
        setGenerating(false);
      }
      return;
    }

    setLoadMsg(`✨ Generating resume for ${parsedData?.name || "candidate"}…`);
    try {
      const raw = await callGroq(
        buildContentPrompt({
          data: parsedData || {},
          country,
          tmpl: selectedTmpl,
          hasPhoto: !!photoB64,
          jdText: jd,
        }),
        2200,
        setLoadMsg,
      );
      let cleaned = raw
        .trim()
        .replace(/```json|```/g, "")
        .trim();
      const s = cleaned.indexOf("{"),
        e2 = cleaned.lastIndexOf("}");
      if (s !== -1 && e2 !== -1) cleaned = cleaned.slice(s, e2 + 1);

      setLoadMsg("Building template layout…");
    let contentJson;
      try {
       contentJson = JSON.parse(cleaned);
        setSavedContentJson(contentJson);
      } catch {
        throw new Error("AI returned invalid content. Please try again.");
      }

const rawHtml = buildResumeHtml(
  contentJson,
  country,
  template,
  !!photoB64,
  fontPreset
);      const finalHtml = injectPhoto(rawHtml, photoB64);

      setHtml(finalHtml);
    
      setStep(3);
    
      await logUsage({
        action: jd ? "jd_rebuild" : "generate",
        candidateName: parsedData?.name || "Unknown",
        country,
        template: selectedTmpl?.name,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── ANALYSE JD ───────────────────────────────────────────────────────────────
  const analyseJD = async () => {
    if (!jdText.trim() || jdText.split(/\s+/).length < 8) {
      setError("Paste a longer job description");
      return;
    }
    setAnalysing(true);
    setError(null);
    try {
      const raw = await callGroq(
        `
Analyse this candidate vs job description. Return ONLY raw JSON (no backticks, no markdown).
CANDIDATE: ${parsedData?.name}, Skills: ${(parsedData?.skills || []).join(", ")}
Experience: ${(parsedData?.experience || []).map((e) => `${e.role} at ${e.company}`).join(" | ")}
JOB DESCRIPTION: ${jdText.slice(0, 700)}
Return exactly:
{"match_score":72,"match_label":"Good","summary":"2-3 sentences","recommendation":"one action","matched_skills":[],"missing_skills":[],"quick_wins":["action 1","action 2","action 3"]}
match_label: "Excellent"|"Good"|"Fair"|"Low"`,
        1500,
        () => {},
      );
      let c = raw
        .trim()
        .replace(/```json|```/g, "")
        .trim();
      const s = c.indexOf("{"),
        e2 = c.lastIndexOf("}");
      if (s !== -1 && e2 !== -1) c = c.slice(s, e2 + 1);
      const result = JSON.parse(c);
      setAnalysis(result);
      await logUsage({
        action: "jd_analysis",
        candidateName: parsedData?.name || "Unknown",
        matchScore: result.match_score,
      });
    } catch (e) {
      setError(`Analysis failed: ${e.message}`);
    } finally {
      setAnalysing(false);
    }
  };

  const sl = searchQ.toLowerCase();
  const filteredGroups = COUNTRY_GROUPS.map((g) => ({
    ...g,
    countries: searchQ
      ? g.countries.filter(
          (c) => c.label.toLowerCase().includes(sl) || c.key.includes(sl),
        )
      : g.countries,
  })).filter((g) => g.countries.length > 0);

  // ── STYLES ──────────────────────────────────────────────────────────────────
  const S = {
    page: {
      fontFamily: "'Times New Roman', Times, serif",
      maxWidth: 1080,
      margin: "0 auto",
      padding: "0 20px 80px",
      boxSizing: "border-box",
    },
    card: {
      background: "#fff",
      borderRadius: 18,
      border: "1.5px solid #e8ecf0",
      padding: "24px 26px",
      marginBottom: 18,
      boxShadow: "0 4px 20px rgba(0,0,0,.05)",
    },
    btn: (bg, fg = "#fff", disabled = false) => ({
      padding: "10px 22px",
      borderRadius: 10,
      border: "none",
      background: disabled ? "#e2e8f0" : bg,
      color: disabled ? "#94a3b8" : fg,
      fontWeight: 800,
      fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Times New Roman', Times, serif",
      transition: "all .15s",
    }),
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Cormorant+Garamond:wght@300;400;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(14px) } to { opacity:1;transform:translateY(0) } }
        .fu { animation: fadeUp .35s ease both }
        .ccard:hover { transform:translateY(-3px) !important; box-shadow:0 10px 28px rgba(0,0,0,.12) !important; }
        button:active:not([disabled]) { transform:scale(.97) }
        * { font-family: 'Times New Roman', Times, serif !important; box-sizing: border-box; }
        input, textarea, select { font-family: 'Times New Roman', Times, serif !important; }
        ::-webkit-scrollbar { width:5px } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px }
      `}</style>

      {/* Hidden shared file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.pdf,.doc,.docx"
        style={{ display: "none" }}
        onChange={(e) =>
          e.target.files[0] && handleFileUpload(e.target.files[0])
        }
      />

      <div style={S.page}>
        {/* HEADER */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #0a0f1e 0%, #111827 50%, #1a1a2e 100%)",
            borderRadius: 22,
            padding: "32px 40px",
            marginBottom: 26,
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -60,
              width: 380,
              height: 380,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(201,168,76,.08), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -60,
              left: 160,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(37,99,235,.08), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              opacity: 0.4,
              marginBottom: 10,
              color: "#c9a84c",
            }}
          >
            VJC Overseas — HR Excellence
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: -0.5,
              marginBottom: 6,
              color: "#fff",
            }}
          >
            📄 AI Resume Builder
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.5,
              marginBottom: 22,
              fontStyle: "italic",
            }}
          >
            35 countries · 5 premium templates · Real-time WYSIWYG editing · JD
            matching
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[
              ["35+", "Countries"],
              ["5", "Templates each"],
              ["Real-time", "WYSIWYG Edit"],
              ["Word", "Download"],
            ].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "'Playfair Display',serif",
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#c9a84c",
                  }}
                >
                  {v}
                </div>
                <div style={{ fontSize: 10, opacity: 0.45, marginTop: 2 }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STEP INDICATOR */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 22,
            background: "#f1f5f9",
            borderRadius: 14,
            padding: 4,
            width: "fit-content",
          }}
        >
          {["Upload", "Country & Style", "Edit & Download", "JD Match"].map(
            (s, i) => {
              const n = i + 1,
                active = step === n,
                done = step > n;
              return (
                <div
                  key={s}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 700,
                    background: active ? "#fff" : "transparent",
                    color: done ? "#16a34a" : active ? "#2563eb" : "#94a3b8",
                    boxShadow: active ? "0 1px 8px rgba(0,0,0,.09)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      fontSize: 11,
                      fontWeight: 900,
                      background: done
                        ? "#16a34a"
                        : active
                          ? "#2563eb"
                          : "#e2e8f0",
                      color: done || active ? "#fff" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {done ? "✓" : n}
                  </span>
                  {s}
                </div>
              );
            },
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1.5px solid #fca5a5",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
              {error}
            </span>
            <button
              onClick={() => setError(null)}
              style={{
                background: "none",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: 20,
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* LOADING */}
        {(generating || analysing) && (
          <div style={{ ...S.card, textAlign: "center", padding: "64px 20px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                border: "3.5px solid #e2e8f0",
                borderTop: "3.5px solid #c9a84c",
                borderRadius: "50%",
                margin: "0 auto 24px",
                animation: "spin .8s linear infinite",
              }}
            />
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 8,
              }}
            >
              {loadMsg || "Processing…"}
            </div>
            <div
              style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}
            >
              AI crafting your resume — typically 10–20 seconds
            </div>
          </div>
        )}

        {/* ══ STEP 1 — UPLOAD ══ */}
        {!generating && !analysing && step === 1 && (
          <div style={S.card} className="fu">
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 4,
              }}
            >
              Upload Your Resume
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                marginBottom: 24,
                fontStyle: "italic",
              }}
            >
              AI reads every detail — experience, skills, education — to power
              all 5 premium templates.
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFileUpload(f);
              }}
              style={{
                border: "2.5px dashed #d4b896",
                borderRadius: 16,
                padding: "60px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: "linear-gradient(135deg, #fefdfb, #fdf6ec)",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#c9a84c";
                e.currentTarget.style.background =
                  "linear-gradient(135deg,#fdf6ec,#fef3c7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#d4b896";
                e.currentTarget.style.background =
                  "linear-gradient(135deg,#fefdfb,#fdf6ec)";
              }}
            >
              <div style={{ fontSize: 56, marginBottom: 14 }}>📄</div>
              <div
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: 6,
                }}
              >
                Drop resume here or click to browse
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                TXT · PDF · DOC · DOCX — max 5MB
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginTop: 16,
              }}
            >
              {[
                {
                  f: ".TXT",
                  icon: "📝",
                  note: "Best results",
                  clr: "#16a34a",
                  bg: "#f0fdf4",
                  bd: "#bbf7d0",
                },
                {
                  f: ".DOCX",
                  icon: "📘",
                  note: "Good support",
                  clr: "#2563eb",
                  bg: "#eff6ff",
                  bd: "#bfdbfe",
                },
                {
                  f: ".PDF",
                  icon: "📕",
                  note: "Text PDFs only",
                  clr: "#d97706",
                  bg: "#fffbeb",
                  bd: "#fde68a",
                },
              ].map((x) => (
                <div
                  key={x.f}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: x.bg,
                    border: `1px solid ${x.bd}`,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `0 6px 16px ${x.bd}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize: 22 }}>{x.icon}</div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: x.clr,
                      marginTop: 2,
                    }}
                  >
                    {x.f}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {x.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ STEP 2 — COUNTRY + TEMPLATE ══ */}
        {!generating && !analysing && step === 2 && (
          <div className="fu">
            {parsedData && (
              <div
                style={{
                  ...S.card,
                  background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                  border: "1.5px solid #86efac",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 32 }}>✅</span>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Playfair Display',serif",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#15803d",
                      }}
                    >
                      Resume parsed successfully
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#166534", marginTop: 3 }}
                    >
                      <strong>{parsedData.name}</strong>
                      {parsedData.experience?.length
                        ? ` · ${parsedData.experience.length} roles found`
                        : ""}
                      {parsedData.skills?.length
                        ? ` · ${parsedData.skills.length} skills found`
                        : ""}
                      {parsedData.education?.length
                        ? ` · ${parsedData.education.length} education entries`
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Country picker */}
            <div style={S.card}>
              <div
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: 4,
                }}
              >
                1. Choose Destination Country
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  marginBottom: 16,
                  fontStyle: "italic",
                }}
              >
                Country-specific formatting rules applied automatically.
              </div>
              <div style={{ position: "relative", marginBottom: 16 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 15,
                  }}
                >
                  🔍
                </span>
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search country…"
                  style={{
                    width: "100%",
                    padding: "10px 36px",
                    borderRadius: 10,
                    border: "1.5px solid #e2e8f0",
                    fontSize: 13,
                    outline: "none",
                    background: "#f8fafc",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#c9a84c")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
              {filteredGroups.map((g) => (
                <div key={g.group} style={{ marginBottom: 10 }}>
                  <button
                    onClick={() =>
                      setOpenGroup(openGroup === g.group ? null : g.group)
                    }
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      borderRadius: 10,
                      border: `1.5px solid ${country && g.countries.some((c) => c.key === country) ? "#c9a84c" : "#e2e8f0"}`,
                      background:
                        country && g.countries.some((c) => c.key === country)
                          ? "#fffbeb"
                          : "#f8fafc",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700,
                      color:
                        country && g.countries.some((c) => c.key === country)
                          ? "#92400e"
                          : "#374151",
                    }}
                  >
                    <span>
                      {g.emoji} {g.group}{" "}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 400,
                          color: "#94a3b8",
                        }}
                      >
                        ({g.countries.length})
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        transform:
                          searchQ || openGroup === g.group
                            ? "rotate(180deg)"
                            : "none",
                        display: "inline-block",
                        transition: "transform .2s",
                      }}
                    >
                      ▼
                    </span>
                  </button>
                  {(searchQ || openGroup === g.group) && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill,minmax(160px,1fr))",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {g.countries.map((c) => (
                        <div
                          key={c.key}
                          className="ccard"
                        onClick={() => {
  setCountry(c.key);
 
  setError(null);
}}
                          style={{
                            padding: "12px 13px",
                            borderRadius: 12,
                            cursor: "pointer",
                            border: `2px solid ${country === c.key ? "#c9a84c" : "#e2e8f0"}`,
                            background:
                              country === c.key ? "#fffbeb" : "#fafafa",
                            boxShadow:
                              country === c.key
                                ? "0 4px 16px rgba(201,168,76,0.25)"
                                : "none",
                            transition: "all .15s",
                          }}
                        >
                          <div style={{ fontSize: 24, marginBottom: 4 }}>
                            {c.flag}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: country === c.key ? "#92400e" : "#0f172a",
                            }}
                          >
                            {c.label}
                          </div>
                          <div
                            style={{
                              fontSize: 10.5,
                              color: "#64748b",
                              marginTop: 2,
                              lineHeight: 1.4,
                            }}
                          >
                            {c.desc}
                          </div>
                          {c.photoRequired && (
                            <div
                              style={{
                                marginTop: 5,
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#7c3aed",
                                background: "#f3e8ff",
                                padding: "2px 7px",
                                borderRadius: 20,
                                display: "inline-block",
                              }}
                            >
                              📷 Photo
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {country && selectedCountry && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#fffbeb",
                    border: "1.5px solid #fde68a",
                    fontSize: 13,
                    color: "#92400e",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{selectedCountry.flag}</span>
                  <strong>{selectedCountry.label}</strong> selected
                  {selectedCountry.photoRequired && (
                    <span
                      style={{
                        fontSize: 10,
                        background: "#f3e8ff",
                        color: "#7c3aed",
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontWeight: 700,
                      }}
                    >
                      📷 Photo recommended
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Template picker */}
            {country && (
              <div style={S.card}>
                <div
                  style={{
                    fontFamily: "'Playfair Display',serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: 4,
                  }}
                >
                  2. Choose Template Style
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                    marginBottom: 18,
                    fontStyle: "italic",
                  }}
                >
                  5 visually distinct designs — all using Times New Roman
                  typography.
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5,1fr)",
                    gap: 10,
                  }}
                >
                  {TEMPLATE_DEFS.map((t) => (
                    <TemplatePreviewCard
                      key={t.id}
                      tmpl={t}
                      country={country}
                      selected={template === t.id}
                     onClick={() => {
  setTemplate(t.id);
  
}}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Photo upload */}
            {country && selectedCountry?.photoRequired && (
              <div
                style={{
                  ...S.card,
                  background: "linear-gradient(135deg,#faf5ff,#f5f3ff)",
                  border: "1.5px solid #d8b4fe",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Playfair Display',serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#6d28d9",
                    marginBottom: 4,
                  }}
                >
                  📷 Profile Photo
                </div>
                <div
                  style={{ fontSize: 12, color: "#7c3aed", marginBottom: 16 }}
                >
                  Required for {selectedCountry.label}. Stored locally — never
                  sent to AI.
                </div>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    e.target.files[0] && handlePhotoUpload(e.target.files[0])
                  }
                />
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {photoPreview ? (
                      <>
                        <img
                          src={photoPreview}
                          alt="Profile"
                          style={{
                            width: 90,
                            height: 112,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "3px solid #a78bfa",
                            display: "block",
                          }}
                        />
                        <button
                          onClick={() => {
                            setPhotoB64(null);
                            setPhotoPr(null);
                          }}
                          style={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            background: "#ef4444",
                            color: "#fff",
                            border: "2px solid #fff",
                            borderRadius: "50%",
                            width: 22,
                            height: 22,
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 900,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <div
                        onClick={() => photoRef.current?.click()}
                        style={{
                          width: 90,
                          height: 112,
                          borderRadius: 8,
                          border: "2px dashed #c4b5fd",
                          background: "#ede9fe",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          gap: 5,
                        }}
                      >
                        <span style={{ fontSize: 28 }}>👤</span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "#7c3aed",
                            fontWeight: 700,
                          }}
                        >
                          Upload
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => photoRef.current?.click()}
                      style={S.btn("#7c3aed")}
                    >
                      {photoPreview ? "🔄 Change Photo" : "📷 Upload Photo"}
                    </button>
                    <div
                      style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}
                    >
                      JPG · PNG · WEBP · max 3MB
                    </div>
                    {photoPreview && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#16a34a",
                          marginTop: 4,
                          fontWeight: 700,
                        }}
                      >
                        ✅ Photo ready — fixed top-right in resume header
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {country && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 4,
                }}
              >
              {generatedHtml && (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginRight: 10,
    }}
  >
    <span
      style={{
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      Font Size
    </span>

    <select
  value={fontPreset}
  onChange={(e) => {
    setFontPreset(e.target.value);

    if (savedContentJson) {
      generateResume("", true);
    }
  }}
>
      <option value="compact">
        Compact
      </option>

      <option value="normal">
        Normal
      </option>

      <option value="comfortable">
        Comfortable
      </option>
    </select>
  </div>
)}
                <button
                  onClick={() => generateResume()}
                  disabled={!template}
                  style={S.btn(
                    "linear-gradient(135deg,#1a1a2e,#2563eb)",
                    "#fff",
                    !template,
                  )}
                >
                  ✨ Generate Resume
                </button>
                <button
                  onClick={() => {
                    if (!country) {
                      setError("Select a country first");
                      return;
                    }
                    setStep(4);
                  }}
                  style={S.btn("#c9a84c", "#1a1a2e")}
                >
                  📋 Match Job Description
                </button>
                <button
                  onClick={() => {
  sessionStorage.clear();
  setStep(1);
  setParsed(null);
  setCountry("");
  setHtml(null);
  setError(null);
}}
                  style={S.btn("#f1f5f9", "#475569")}
                >
                  ← Start Over
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 3 — WYSIWYG EDITOR ══ */}
        {!generating && !analysing && step === 3 && generatedHtml && (
          <div className="fu">
            <div
              style={{
                ...S.card,
                marginBottom: 0,
                borderRadius: "18px 18px 0 0",
                borderBottom: "none",
                padding: "16px 24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#22c55e",
                    }}
                  />
                  <div
                    style={{
                      fontFamily: "'Playfair Display',serif",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#15803d",
                    }}
                  >
                    {parsedData?.name || "Candidate"} · {selectedCountry?.flag}{" "}
                    {selectedCountry?.label} · {selectedTmpl?.name}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    fontStyle: "italic",
                  }}
                >
                  Click any text to edit. Download Word opens in MS Word
                  directly.
                </div>
              </div>
            </div>
            <RealtimeEditor
              html={generatedHtml}
              onHtmlChange={setHtml}
              fileName={`${(parsedData?.name || "Resume").replace(/\s+/g, "_")}_${country}_${selectedTmpl?.name?.replace(/\s+/g, "_")}`}
              parsedData={parsedData}
              country={country}
              selectedTmpl={selectedTmpl}
             onRegenerate={() => generateResume("", true)}
              onBack={() => setStep(2)}
              onJD={() => setStep(4)}
              fontPreset={fontPreset}
      setFontPreset={setFontPreset}
            />
          </div>
        )}

        {/* ══ STEP 4 — JD MATCHING ══ */}
        {!generating && !analysing && step === 4 && (
          <div className="fu">
            <div style={S.card}>
              <div
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: 4,
                }}
              >
                Job Description Match
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  marginBottom: 16,
                  fontStyle: "italic",
                }}
              >
                Paste the full job posting to see how well{" "}
                {parsedData?.name || "the candidate"} matches.
              </div>
              {selectedCountry && (
                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: 9,
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    fontSize: 12,
                    color: "#92400e",
                    marginBottom: 14,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{selectedCountry.flag}</span>{" "}
                  Rebuild will use <strong>{selectedCountry.label}</strong> ·{" "}
                  <strong>{selectedTmpl?.name}</strong>
                </div>
              )}
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={13}
                placeholder="Paste the complete job description here…"
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  fontSize: 13,
                  border: "1.5px solid #e2e8f0",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  color: "#0f172a",
                  background: "#f8fafc",
                  lineHeight: 1.8,
                }}
                onFocus={(e) => (e.target.style.borderColor = "#c9a84c")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  margin: "6px 0 16px",
                  color:
                    jdText.trim().split(/\s+/).length < 8
                      ? "#f87171"
                      : "#16a34a",
                  fontWeight: 600,
                }}
              >
                <span>
                  {jdText.trim().length === 0
                    ? "⬆️ Paste job description above"
                    : jdText.trim().split(/\s+/).length < 8
                      ? "⚠️ Too short"
                      : "✅ Ready to analyse"}
                </span>
                <span style={{ color: "#94a3b8" }}>
                  {jdText.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={analyseJD} style={S.btn("#c9a84c", "#1a1a2e")}>
                  🔍 Analyse Match %
                </button>
                <button
                  onClick={() => generateResume(jdText)}
                  disabled={!country || jdText.split(/\s+/).length < 8}
                  style={S.btn(
                    "#1a1a2e",
                    "#fff",
                    !country || jdText.split(/\s+/).length < 8,
                  )}
                >
                  ✨ Rebuild Tailored Resume
                </button>
                <button
                  onClick={() => setStep(step === 3 ? 3 : 2)}
                  style={S.btn("#f1f5f9", "#475569")}
                >
                  ← Back
                </button>
              </div>
            </div>

            {analysis &&
              (() => {
                const sc =
                  analysis.match_score >= 70
                    ? "#16a34a"
                    : analysis.match_score >= 45
                      ? "#d97706"
                      : "#dc2626";
                const sb =
                  analysis.match_score >= 70
                    ? "#f0fdf4"
                    : analysis.match_score >= 45
                      ? "#fffbeb"
                      : "#fef2f2";
                const sd =
                  analysis.match_score >= 70
                    ? "#86efac"
                    : analysis.match_score >= 45
                      ? "#fde68a"
                      : "#fca5a5";
                return (
                  <div>
                    <div
                      style={{
                        ...S.card,
                        background: sb,
                        border: `2px solid ${sd}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 28,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ textAlign: "center", minWidth: 110 }}>
                          <div
                            style={{
                              fontFamily: "'Playfair Display',serif",
                              fontSize: 72,
                              fontWeight: 900,
                              color: sc,
                              lineHeight: 1,
                            }}
                          >
                            {analysis.match_score}%
                          </div>
                          <div
                            style={{ fontSize: 13, fontWeight: 700, color: sc }}
                          >
                            {analysis.match_label} Match
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 99,
                              background: "#e2e8f0",
                              overflow: "hidden",
                              marginTop: 8,
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${analysis.match_score}%`,
                                background: sc,
                                borderRadius: 99,
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div
                            style={{
                              fontFamily: "'Playfair Display',serif",
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#0f172a",
                              marginBottom: 6,
                            }}
                          >
                            Assessment
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#374151",
                              lineHeight: 1.8,
                            }}
                          >
                            {analysis.summary}
                          </div>
                          <div
                            style={{
                              marginTop: 10,
                              padding: "9px 13px",
                              borderRadius: 9,
                              background: "rgba(255,255,255,.8)",
                              fontSize: 13,
                              fontWeight: 600,
                              color: sc,
                            }}
                          >
                            💡 {analysis.recommendation}
                          </div>
                        </div>
                      </div>
                    </div>
                    {(analysis.quick_wins || []).length > 0 && (
                      <div
                        style={{
                          ...S.card,
                          background: "#fffbeb",
                          border: "1.5px solid #fde68a",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Playfair Display',serif",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#92400e",
                            marginBottom: 10,
                          }}
                        >
                          ⚡ Quick Wins to Boost Your Match
                        </div>
                        {analysis.quick_wins.map((w, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              gap: 10,
                              padding: "8px 0",
                              borderBottom:
                                i < analysis.quick_wins.length - 1
                                  ? "1px solid #fde68a"
                                  : "none",
                              fontSize: 13,
                              color: "#78350f",
                              lineHeight: 1.7,
                            }}
                          >
                            <span
                              style={{
                                minWidth: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: "#c9a84c",
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 800,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {i + 1}
                            </span>
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