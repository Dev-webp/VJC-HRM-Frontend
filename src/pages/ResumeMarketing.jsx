/* eslint-disable */
import React, { useState, useRef } from "react";

const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ─── 35 COUNTRIES grouped ─────────────────────────────────────────────────────
const REGION_GROUPS = [
  {
    group: "🌍 Europe",
    countries: [
      { key:"uk",          label:"UK / Ireland",        flag:"🇬🇧", desc:"2 pages, personal statement, no photo" },
      { key:"germany",     label:"Germany",             flag:"🇩🇪", desc:"Lebenslauf, photo, DOB, formal" },
      { key:"france",      label:"France",              flag:"🇫🇷", desc:"Photo optional, concise, elegant" },
      { key:"european",    label:"European (Europass)", flag:"🇪🇺", desc:"Photo, DOB, nationality, two-column" },
      { key:"netherlands", label:"Netherlands",         flag:"🇳🇱", desc:"Clean, skills-first, no photo" },
      { key:"sweden",      label:"Sweden",              flag:"🇸🇪", desc:"Minimalist Nordic, personal letter" },
      { key:"denmark",     label:"Denmark",             flag:"🇩🇰", desc:"Scandinavian clean, concise" },
      { key:"norway",      label:"Norway",              flag:"🇳🇴", desc:"Nordic style, competency-based" },
      { key:"switzerland", label:"Switzerland",         flag:"🇨🇭", desc:"Photo, multilingual, precise" },
      { key:"spain",       label:"Spain",               flag:"🇪🇸", desc:"Photo, DOB, formal European" },
      { key:"italy",       label:"Italy",               flag:"🇮🇹", desc:"Curriculum Vitae, photo, elegant" },
      { key:"poland",      label:"Poland",              flag:"🇵🇱", desc:"European, photo, GDPR clause" },
      { key:"portugal",    label:"Portugal",            flag:"🇵🇹", desc:"Photo, DOB, Europass style" },
    ]
  },
  {
    group: "🌏 Middle East & Asia",
    countries: [
      { key:"gulf",        label:"Gulf / Middle East",  flag:"🌏", desc:"Photo, nationality, visa status" },
      { key:"dubai",       label:"Dubai / UAE",         flag:"🇦🇪", desc:"Photo, visa status, Gulf formal" },
      { key:"saudi",       label:"Saudi Arabia",        flag:"🇸🇦", desc:"Photo, Iqama, formal Arabic style" },
      { key:"singapore",   label:"Singapore",           flag:"🇸🇬", desc:"Photo, nationality, formal" },
      { key:"malaysia",    label:"Malaysia",            flag:"🇲🇾", desc:"Photo, IC number, formal" },
      { key:"india",       label:"India",               flag:"🇮🇳", desc:"Career objective, detailed, formal" },
      { key:"japan",       label:"Japan",               flag:"🇯🇵", desc:"Rirekisho format, photo, formal" },
      { key:"china",       label:"China",               flag:"🇨🇳", desc:"Photo, detailed, formal Chinese" },
      { key:"hongkong",    label:"Hong Kong",           flag:"🇭🇰", desc:"Photo, bilingual, finance-ready" },
      { key:"southkorea",  label:"South Korea",         flag:"🇰🇷", desc:"Self-intro, photo, formal" },
      { key:"thailand",    label:"Thailand",            flag:"🇹🇭", desc:"Photo, nationality, formal Thai" },
      { key:"philippines", label:"Philippines",         flag:"🇵🇭", desc:"Photo, PRC no., detailed" },
    ]
  },
  {
    group: "🌎 Americas",
    countries: [
      { key:"us",          label:"US (ATS-clean)",      flag:"🇺🇸", desc:"Single-column, keyword-dense, ATS" },
      { key:"canadian",    label:"Canada",              flag:"🇨🇦", desc:"Hybrid US/UK, skills-first" },
      { key:"brazil",      label:"Brazil",              flag:"🇧🇷", desc:"Photo, DOB, formal Portuguese" },
      { key:"mexico",      label:"Mexico",              flag:"🇲🇽", desc:"Photo, CURP, formal Spanish" },
    ]
  },
  {
    group: "🦘 Pacific & Africa",
    countries: [
      { key:"australian",  label:"Australia",           flag:"🇦🇺", desc:"Achievement-focused, career objective" },
      { key:"nz",          label:"New Zealand",         flag:"🇳🇿", desc:"Warm tone, hobbies, two referees" },
      { key:"southafrica", label:"South Africa",        flag:"🇿🇦", desc:"Photo, ID no., formal SA style" },
      { key:"nigeria",     label:"Nigeria",             flag:"🇳🇬", desc:"Photo, detailed, formal West African" },
      { key:"kenya",       label:"Kenya",               flag:"🇰🇪", desc:"Photo, ID no., formal East African" },
    ]
  },
];

const REGIONS = REGION_GROUPS.flatMap(g => g.countries);

const PHOTO_REGIONS = [
  "european","gulf","germany","france","dubai","saudi","singapore","poland","malaysia",
  "india","japan","china","hongkong","southkorea","thailand","philippines","spain","italy",
  "switzerland","portugal","brazil","mexico","southafrica","nigeria","kenya"
];

// ─── Build 5 templates per country ────────────────────────────────────────────
const makeTemplates = (overrides = {}) => {
  const base = [
    { id:"classic",   name:"Classic Pro",   color:"#1a237e", style:"classic"   },
    { id:"modern",    name:"Modern Edge",   color:"#0d7377", style:"modern"    },
    { id:"executive", name:"Executive",     color:"#111827", style:"executive" },
    { id:"creative",  name:"Creative Bold", color:"#7c3aed", style:"creative"  },
    { id:"minimal",   name:"Minimal Clean", color:"#374151", style:"minimal"   },
  ];
  return base.map(d => ({ ...d, ...(overrides[d.id] || {}) }));
};

const TEMPLATES = {
  uk:          makeTemplates({ classic:{color:"#0d4f4f",name:"Teal Classic"}, modern:{color:"#334155",name:"Slate Modern"}, executive:{color:"#1f2937",name:"Charcoal Pro"}, creative:{color:"#be123c",name:"Crimson Bold"}, minimal:{color:"#475569",name:"Pewter Clean"} }),
  germany:     makeTemplates({ classic:{color:"#1a237e",name:"Prussian Blue"}, modern:{color:"#374151",name:"Steel Grey"}, executive:{color:"#7f1d1d",name:"Bordeaux Red"}, creative:{color:"#065f46",name:"Forest Pro"}, minimal:{color:"#1e293b",name:"Midnight"} }),
  france:      makeTemplates({ classic:{color:"#1d4ed8",name:"Bleu de France"}, modern:{color:"#6d28d9",name:"Violet Parisien"}, executive:{color:"#111827",name:"Noir Élégant"}, creative:{color:"#be123c",name:"Rouge Vif"}, minimal:{color:"#374151",name:"Gris Classique"} }),
  european:    makeTemplates({ classic:{color:"#1a237e",name:"Classic Blue"}, modern:{color:"#0d7377",name:"Modern Teal"}, executive:{color:"#374151",name:"Slate Pro"}, creative:{color:"#7c3aed",name:"Violet Pro"}, minimal:{color:"#065f46",name:"Forest Green"} }),
  netherlands: makeTemplates({ classic:{color:"#f97316",name:"Dutch Orange"}, modern:{color:"#0369a1",name:"Canal Blue"}, executive:{color:"#111827",name:"Amsterdam Black"}, creative:{color:"#7c3aed",name:"Tulip Purple"}, minimal:{color:"#374151",name:"Windmill Grey"} }),
  sweden:      makeTemplates({ classic:{color:"#1d4ed8",name:"Swedish Blue"}, modern:{color:"#065f46",name:"Nordic Green"}, executive:{color:"#111827",name:"Stockholm Black"}, creative:{color:"#0d7377",name:"Forest Teal"}, minimal:{color:"#374151",name:"Fjord Grey"} }),
  denmark:     makeTemplates({ classic:{color:"#c8172c",name:"Danish Red"}, modern:{color:"#003f8c",name:"Copenhagen Blue"}, executive:{color:"#374151",name:"Nordic Grey"}, creative:{color:"#0d7377",name:"Fjord Teal"}, minimal:{color:"#1e293b",name:"Clean Slate"} }),
  norway:      makeTemplates({ classic:{color:"#c8172c",name:"Norwegian Red"}, modern:{color:"#1d4ed8",name:"Oslo Blue"}, executive:{color:"#111827",name:"Midnight Pro"}, creative:{color:"#059669",name:"Fjord Green"}, minimal:{color:"#374151",name:"Arctic Grey"} }),
  switzerland: makeTemplates({ classic:{color:"#c8172c",name:"Swiss Red"}, modern:{color:"#374151",name:"Alpine Grey"}, executive:{color:"#111827",name:"Geneva Black"}, creative:{color:"#1d4ed8",name:"Zurich Blue"}, minimal:{color:"#064e3b",name:"Mint Pro"} }),
  spain:       makeTemplates({ classic:{color:"#c8960c",name:"Oro Español"}, modern:{color:"#c8172c",name:"Rojo Madrid"}, executive:{color:"#111827",name:"Negro Elegante"}, creative:{color:"#7c3aed",name:"Violeta"}, minimal:{color:"#374151",name:"Gris Barcelona"} }),
  italy:       makeTemplates({ classic:{color:"#059669",name:"Verde Italia"}, modern:{color:"#c8172c",name:"Rosso Roma"}, executive:{color:"#111827",name:"Nero Milano"}, creative:{color:"#1d4ed8",name:"Azzurro"}, minimal:{color:"#374151",name:"Grigio Elegante"} }),
  poland:      makeTemplates({ classic:{color:"#1a237e",name:"Polish Navy"}, modern:{color:"#dc2626",name:"Warsaw Red"}, executive:{color:"#374151",name:"Baltic Grey"}, creative:{color:"#7c3aed",name:"Krakow Purple"}, minimal:{color:"#1e293b",name:"Clean Slate"} }),
  portugal:    makeTemplates({ classic:{color:"#15803d",name:"Verde Lisboa"}, modern:{color:"#c8172c",name:"Vermelho Porto"}, executive:{color:"#111827",name:"Azul Escuro"}, creative:{color:"#c8960c",name:"Dourado"}, minimal:{color:"#374151",name:"Cinzento"} }),
  gulf:        makeTemplates({ classic:{color:"#c8960c",name:"Gold & Navy"}, modern:{color:"#1e40af",name:"Royal Blue"}, executive:{color:"#92400e",name:"Desert Warmth"}, creative:{color:"#7c3aed",name:"Arabian Violet"}, minimal:{color:"#111827",name:"Executive Black"} }),
  dubai:       makeTemplates({ classic:{color:"#c8960c",name:"UAE Gold"}, modern:{color:"#1e40af",name:"Desert Blue"}, executive:{color:"#111827",name:"Luxury Black"}, creative:{color:"#059669",name:"Emerald UAE"}, minimal:{color:"#374151",name:"Sand Grey"} }),
  saudi:       makeTemplates({ classic:{color:"#15803d",name:"Saudi Green"}, modern:{color:"#c8960c",name:"Riyadh Gold"}, executive:{color:"#111827",name:"Executive Black"}, creative:{color:"#1e40af",name:"Arabian Blue"}, minimal:{color:"#374151",name:"Desert Minimal"} }),
  singapore:   makeTemplates({ classic:{color:"#c8172c",name:"Lion City Red"}, modern:{color:"#1e40af",name:"Marina Blue"}, executive:{color:"#111827",name:"Raffles Black"}, creative:{color:"#6d28d9",name:"Orchid Purple"}, minimal:{color:"#374151",name:"Clean White"} }),
  malaysia:    makeTemplates({ classic:{color:"#003f8c",name:"Batik Blue"}, modern:{color:"#059669",name:"KL Green"}, executive:{color:"#374151",name:"Twin Towers"}, creative:{color:"#c8960c",name:"Petronas Gold"}, minimal:{color:"#111827",name:"Kuala Noir"} }),
  india:       makeTemplates({ classic:{color:"#f97316",name:"Saffron Pro"}, modern:{color:"#1d4ed8",name:"Indigo Modern"}, executive:{color:"#111827",name:"Corporate Black"}, creative:{color:"#7c3aed",name:"Mysore Purple"}, minimal:{color:"#374151",name:"Clean Slate"} }),
  japan:       makeTemplates({ classic:{color:"#c8172c",name:"Hinomaru Red"}, modern:{color:"#1e293b",name:"Tokyo Midnight"}, executive:{color:"#374151",name:"Kyoto Grey"}, creative:{color:"#0d7377",name:"Teal Zen"}, minimal:{color:"#111827",name:"Wabi-Sabi"} }),
  china:       makeTemplates({ classic:{color:"#c8172c",name:"China Red"}, modern:{color:"#c8960c",name:"Imperial Gold"}, executive:{color:"#111827",name:"Shanghai Black"}, creative:{color:"#1d4ed8",name:"Beijing Blue"}, minimal:{color:"#374151",name:"Jade Grey"} }),
  hongkong:    makeTemplates({ classic:{color:"#c8172c",name:"HK Red"}, modern:{color:"#1e40af",name:"Victoria Blue"}, executive:{color:"#111827",name:"Finance Black"}, creative:{color:"#059669",name:"Jade Pro"}, minimal:{color:"#374151",name:"Harbour Grey"} }),
  southkorea:  makeTemplates({ classic:{color:"#1d4ed8",name:"Taeguk Blue"}, modern:{color:"#c8172c",name:"Seoul Red"}, executive:{color:"#111827",name:"Gangnam Black"}, creative:{color:"#7c3aed",name:"K-Style Purple"}, minimal:{color:"#374151",name:"Hangang Grey"} }),
  thailand:    makeTemplates({ classic:{color:"#1d4ed8",name:"Thai Blue"}, modern:{color:"#c8172c",name:"Bangkok Red"}, executive:{color:"#c8960c",name:"Temple Gold"}, creative:{color:"#059669",name:"Emerald Thai"}, minimal:{color:"#374151",name:"Clean Pro"} }),
  philippines: makeTemplates({ classic:{color:"#1d4ed8",name:"Lupang Blue"}, modern:{color:"#c8172c",name:"Manila Red"}, executive:{color:"#c8960c",name:"Pearl Gold"}, creative:{color:"#7c3aed",name:"Sampaguita"}, minimal:{color:"#374151",name:"Clean Islands"} }),
  us:          makeTemplates({ classic:{color:"#111827",name:"ATS Classic"}, modern:{color:"#1d4ed8",name:"Modern Blue"}, executive:{color:"#374151",name:"Executive"}, creative:{color:"#7c3aed",name:"Bold Creative"}, minimal:{color:"#0d7377",name:"Teal Minimal"} }),
  canadian:    makeTemplates({ classic:{color:"#c41230",name:"Maple Red"}, modern:{color:"#0369a1",name:"Pacific Blue"}, executive:{color:"#374151",name:"Clean Pro"}, creative:{color:"#7c3aed",name:"Aurora Purple"}, minimal:{color:"#111827",name:"Tundra Black"} }),
  brazil:      makeTemplates({ classic:{color:"#15803d",name:"Verde Brasil"}, modern:{color:"#fbbf24",name:"Amarelo Sol"}, executive:{color:"#111827",name:"São Paulo Black"}, creative:{color:"#1d4ed8",name:"Rio Blue"}, minimal:{color:"#374151",name:"Clean Carioca"} }),
  mexico:      makeTemplates({ classic:{color:"#15803d",name:"Verde México"}, modern:{color:"#c8172c",name:"Rojo Azteca"}, executive:{color:"#111827",name:"CDMX Black"}, creative:{color:"#c8960c",name:"Oro Maya"}, minimal:{color:"#374151",name:"Clean Moderno"} }),
  australian:  makeTemplates({ classic:{color:"#1d5c37",name:"Forest Green"}, modern:{color:"#c2410c",name:"Bold Orange"}, executive:{color:"#1e3a8a",name:"Corporate Navy"}, creative:{color:"#7c3aed",name:"Violet Outback"}, minimal:{color:"#374151",name:"Clean Coastal"} }),
  nz:          makeTemplates({ classic:{color:"#2d7a2d",name:"Kiwi Green"}, modern:{color:"#0e7490",name:"Pacific Teal"}, executive:{color:"#78350f",name:"Earth Brown"}, creative:{color:"#7c3aed",name:"Purple Haze"}, minimal:{color:"#374151",name:"Clean NZ"} }),
  southafrica: makeTemplates({ classic:{color:"#15803d",name:"Bafana Green"}, modern:{color:"#c8960c",name:"Kruger Gold"}, executive:{color:"#111827",name:"Joburg Black"}, creative:{color:"#1d4ed8",name:"Cape Blue"}, minimal:{color:"#374151",name:"Ubuntu Grey"} }),
  nigeria:     makeTemplates({ classic:{color:"#15803d",name:"Naija Green"}, modern:{color:"#c8960c",name:"Lagos Gold"}, executive:{color:"#111827",name:"Abuja Black"}, creative:{color:"#7c3aed",name:"Afro Purple"}, minimal:{color:"#374151",name:"Clean Pro"} }),
  kenya:       makeTemplates({ classic:{color:"#c8172c",name:"Maasai Red"}, modern:{color:"#15803d",name:"Savanna Green"}, executive:{color:"#111827",name:"Nairobi Black"}, creative:{color:"#c8960c",name:"Rift Gold"}, minimal:{color:"#374151",name:"Clean Kenya"} }),
};

// ─── Groq call ────────────────────────────────────────────────────────────────
const callGroq = async (baseUrl, prompt, maxTokens = 7000, setLoadingMsg, retryCount = 0) => {
  const res = await fetch(`${baseUrl}/api/groq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens }),
  });
  if (res.status === 429) {
    const err = await res.json().catch(() => ({}));
    const wait = err.retryAfter || 30;
    if (retryCount < 1) {
      for (let i = wait; i > 0; i--) {
        setLoadingMsg(`Rate limited — retrying in ${i}s…`);
        await new Promise(r => setTimeout(r, 1000));
      }
      return callGroq(baseUrl, prompt, maxTokens, setLoadingMsg, retryCount + 1);
    }
    throw new Error(`Rate limited. Wait ~${wait}s and try again.`);
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.text) return data.text;
  throw new Error("Empty response from AI");
};

// ─── File extraction ──────────────────────────────────────────────────────────
const extractTextFromFile = (file, setParseProgress) => new Promise((resolve, reject) => {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "txt") {
    setParseProgress("Reading text file…");
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Could not read text file."));
    r.readAsText(file);
  } else if (ext === "docx" || ext === "doc") {
    setParseProgress("Extracting from Word document…");
    const r = new FileReader();
    r.onload = async () => {
      try {
        if (!window.mammoth) { reject(new Error("mammoth.js not loaded")); return; }
        const res = await window.mammoth.extractRawText({ arrayBuffer: r.result });
        if (!res.value?.trim().length) { reject(new Error("Word doc appears empty.")); return; }
        resolve(res.value);
      } catch (e) { reject(new Error("Cannot parse Word doc: " + e.message)); }
    };
    r.onerror = () => reject(new Error("Could not read file."));
    r.readAsArrayBuffer(file);
  } else if (ext === "pdf") {
    setParseProgress("Extracting from PDF…");
    const r = new FileReader();
    r.onload = async () => {
      try {
        if (!window.pdfjsLib) { reject(new Error("pdf.js not loaded")); return; }
        const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(r.result) }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          setParseProgress(`Reading page ${i}/${pdf.numPages}…`);
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(x => x.str).join(" ") + "\n\n";
        }
        const cleaned = text.replace(/\s{3,}/g, "\n").trim();
        if (cleaned.length < 20) { reject(new Error("PDF text unreadable — use .docx or .txt")); return; }
        resolve(cleaned);
      } catch (e) { reject(new Error("Cannot parse PDF: " + e.message)); }
    };
    r.onerror = () => reject(new Error("Could not read file."));
    r.readAsArrayBuffer(file);
  } else {
    reject(new Error("Use .txt, .pdf, or .docx"));
  }
});

// ─── Download + Photo inject ──────────────────────────────────────────────────
const triggerDownload = (html, filename) => {
  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { console.error("Download failed:", e); }
};

// KEY: photo base64 is NEVER sent to Groq — injected here after generation
const injectPhoto = (html, photoBase64) => {
  if (!photoBase64 || !html) return html;
  return html.replace(/src="__PHOTO_PLACEHOLDER__"/g, `src="${photoBase64}"`);
};

// ─── Region layout rules ──────────────────────────────────────────────────────
const getRegionLayout = (region, tmpl, d, hasPhoto) => {
  const name  = d.name || "Candidate";
  const dob   = d.dob  || "[Date of Birth]";
  const nat   = d.nationality || "[Nationality]";
  const sk    = (d.skills || []).join(", ");
  const lang  = (d.languages || []).join(", ") || "English";
  const hobby = (d.hobbies || []).join(", ");
  const ph    = d.phone || ""; const em = d.email || ""; const loc = d.location || "";
  const cert  = (d.certifications || []).join(", ");

  const photoTag = hasPhoto
    ? `<img src="__PHOTO_PLACEHOLDER__" alt="Photo" style="width:115px;height:145px;object-fit:cover;border-radius:4px;display:block;">`
    : `<div style="width:115px;height:145px;background:#e8e8e8;border:1.5px dashed #aaa;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#999;font-size:10px;text-align:center;"><svg width="28" height="28" viewBox="0 0 24 24" fill="#ccc"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v1h20v-1c0-3.3-6.7-5-10-5z"/></svg>PHOTO</div>`;

  const styleHints = {
    classic:   "Traditional: clean section dividers, conservative spacing, serif-inspired headers.",
    modern:    "Contemporary: bold colored header band, card sections with subtle shadows, clean sans-serif.",
    executive: "Luxury: dark header block, premium whitespace, gold/silver accent lines.",
    creative:  "Bold: strong accent sidebar or header, visual skill bars, mixed typography.",
    minimal:   "Ultra-clean: maximum whitespace, hairline dividers, monochrome with single accent color.",
  };

  const style = styleHints[tmpl.style] || styleHints.classic;

  const layouts = {
    uk:`Single-column British CV. NO photo, NO DOB, NO nationality.
SECTIONS: Name + contact | PERSONAL STATEMENT (3-4 sentences) | WORK HISTORY (company+title+dates, 3-5 bullets each) | EDUCATION | KEY SKILLS (${sk}) | INTERESTS (${hobby||"travelling, reading"}) | "References available on request"
${tmpl.color} left-border accent on headers. 2 pages.`,

    germany:`German Lebenslauf. Header: LEFT=Persönliche Daten, RIGHT=${hasPhoto?`photo:${photoTag}`:"photo placeholder"}.
Daten: Name:${name}, Adresse:${loc}, Tel:${ph}, Email:${em}, Geburtsdatum:${dob}, Staatsangehörigkeit:${nat}, Familienstand:[Ledig].
SECTIONS: BERUFSERFAHRUNG (reverse chron) | AUSBILDUNG | KENNTNISSE (IT:${sk}, Sprachen:${lang}) | HOBBYS:${hobby||"Sport, Reisen"}.
Bottom: Ort, Datum + signature line. Color:${tmpl.color}.`,

    france:`French CV. ${hasPhoto?`Photo top-right:${photoTag}`:""}
Header: Name, contact, DOB:${dob}, Nationality:${nat}.
SECTIONS: PROFIL PROFESSIONNEL | EXPÉRIENCES PROFESSIONNELLES | FORMATION | COMPÉTENCES (${sk}) | LANGUES (${lang}) | CENTRES D'INTÉRÊT (${hobby||"voyages, culture"}).
Elegant French style. Color:${tmpl.color}.`,

    european:`Europass two-column. Left sidebar ${tmpl.color}: ${hasPhoto?`Photo:${photoTag}`:"placeholder"}, name, contact, DOB:${dob}, Nationality:${nat}, Languages CEFR bars, Skills pills.
Right column: Professional Profile | Work Experience (bold company+role+dates, bullet achievements) | Education | Certifications.`,

    netherlands:`Dutch CV. Clean single-column. No photo required.
Header: Name, contact. SECTIONS: PROFIEL (2-3 sentences) | WERKERVARING (achievement bullets) | OPLEIDING | VAARDIGHEDEN (${sk}) | TALEN (${lang}).
Clean Dutch design. Color:${tmpl.color}.`,

    sweden:`Swedish CV. Minimal Nordic single-column.
SECTIONS: Contact | PROFIL (2-3 sentences) | ARBETSLIVSERFARENHET | UTBILDNING | KOMPETENSER (${sk}) | SPRÅK (${lang}) | INTRESSEN (${hobby||"friluftsliv, resor"}).
Personal letter paragraph at end. Color:${tmpl.color}.`,

    denmark:`Danish CV. Scandinavian single-column.
SECTIONS: Contact | PROFIL | ERHVERVSERFARING | UDDANNELSE | KOMPETENCER (${sk}) | SPROG (${lang}) | INTERESSER.
Generous whitespace. Color:${tmpl.color}.`,

    norway:`Norwegian competency-based CV.
SECTIONS: Contact | SAMMENDRAG | ARBEIDSERFARING (STAR bullets) | UTDANNING | FERDIGHETER (${sk}) | SPRÅK (${lang}).
Color:${tmpl.color}.`,

    switzerland:`Swiss CV. ${hasPhoto?`Photo:${photoTag}`:""}
Persönliche Angaben: Name:${name}, Geburtsdatum:${dob}, Nationalität:${nat}, contact.
SECTIONS: Berufserfahrung | Ausbildung | Kenntnisse (${sk}) | Sprachen (${lang}).
Very precise. Color:${tmpl.color}.`,

    spain:`Spanish CV. ${hasPhoto?`Photo top-right:${photoTag}`:""}
Header: Name, DNI:[XXXXXXXX-X], Fecha:${dob}, Nationality:${nat}, contact.
SECTIONS: PERFIL PROFESIONAL | EXPERIENCIA LABORAL | FORMACIÓN | HABILIDADES (${sk}) | IDIOMAS (${lang}) | AFICIONES (${hobby||"deporte, cultura"}).
Color:${tmpl.color}.`,

    italy:`Italian Curriculum Vitae. ${hasPhoto?`Photo:${photoTag}`:""}
Header: Nome, Data:${dob}, Nazionalità:${nat}, contatti.
SECTIONS: PROFILO | ESPERIENZA LAVORATIVA | FORMAZIONE | COMPETENZE (${sk}) | LINGUE (${lang}) | INTERESSI.
Elegant Italian. Color:${tmpl.color}.`,

    poland:`Polish CV. ${hasPhoto?`Photo:${photoTag}`:""}
Personal: ${name}, ${loc}, ${ph}, ${em}, DOB:${dob}, Nationality:${nat||"Polish"}.
SECTIONS: PODSUMOWANIE | DOŚWIADCZENIE | WYKSZTAŁCENIE | UMIEJĘTNOŚCI (${sk}) | JĘZYKI (${lang}) | ZAINTERESOWANIA.
GDPR footer (9px italic): "Wyrażam zgodę na przetwarzanie moich danych osobowych dla potrzeb niezbędnych do realizacji procesu rekrutacji zgodnie z RODO."
Color:${tmpl.color}.`,

    portugal:`Portuguese CV. ${hasPhoto?`Photo:${photoTag}`:""}
Header: Nome, DOB:${dob}, Nationalidade:${nat||"Portuguesa"}, contact.
SECTIONS: PERFIL PROFISSIONAL | EXPERIÊNCIA | FORMAÇÃO | COMPETÊNCIAS (${sk}) | LÍNGUAS (${lang}) | INTERESSES.
Color:${tmpl.color}.`,

    gulf:`Gulf executive formal. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL DETAILS: Name:${name}, Nationality:${nat}, DOB:${dob}, Marital:[Single/Married], Visa:[Visit/Employment], Languages:${lang}.
SECTIONS: CAREER OBJECTIVE (4 sentences) | PROFESSIONAL EXPERIENCE (5-6 bullets/role) | EDUCATION | SKILLS | LANGUAGE TABLE | REFERENCES (2). 3+ pages. Color:${tmpl.color}.`,

    dubai:`Dubai executive. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL DETAILS: Name:${name}, Nationality:${nat}, DOB:${dob}, Visa:[Employment/Visit], Driving License:Yes/No, Mobile:${ph}, Email:${em}.
SECTIONS: CAREER OBJECTIVE | PROFESSIONAL EXPERIENCE (5-6 bullets) | EDUCATION | TECHNICAL SKILLS | LANGUAGE SKILLS | REFERENCES (2). Gold/blue luxury. Color:${tmpl.color}.`,

    saudi:`Saudi CV. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL DETAILS: Name:${name}, Nationality:${nat}, Iqama:[XXXXXXXXXXX], DOB:${dob}, Mobile:${ph}, Email:${em}.
SECTIONS: CAREER OBJECTIVE | PROFESSIONAL EXPERIENCE | EDUCATION | SKILLS (${sk}) | LANGUAGES (${lang}) | REFERENCES. Color:${tmpl.color}.`,

    singapore:`Singapore corporate. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL DETAILS: Name:${name}, Nationality:${nat}, EP/PR/Citizen:[status], DOB:${dob}, Mobile:${ph}, Email:${em}.
SECTIONS: CAREER SUMMARY | WORK EXPERIENCE | EDUCATION | TECHNICAL SKILLS (${sk}) | LANGUAGE SKILLS | REFERENCES. Color:${tmpl.color}.`,

    malaysia:`Malaysian formal. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL DETAILS: Name:${name}, IC:[XXXXXX-XX-XXXX], Nationality:${nat||"Malaysian"}, DOB:${dob}, Mobile:${ph}, Email:${em}.
SECTIONS: CAREER OBJECTIVE | WORK EXPERIENCE | EDUCATION | SKILLS (${sk}) | LANGUAGES (${lang}) | EXPECTED SALARY:RM[Amount] | AVAILABILITY:[notice] | REFERENCES (2). Color:${tmpl.color}.`,

    india:`Indian CV. Formal, detailed.
PERSONAL DETAILS: Father's Name:[Name], DOB:${dob}, Nationality:${nat||"Indian"}, Marital:[Single], Languages:${lang}.
SECTIONS: CAREER OBJECTIVE | PROFESSIONAL EXPERIENCE | ACADEMIC QUALIFICATIONS (table) | TECHNICAL SKILLS (${sk}) | CERTIFICATIONS (${cert||"N/A"}) | DECLARATION:"I hereby declare all information is true to the best of my knowledge."
Color:${tmpl.color}.`,

    japan:`Japanese Rirekisho-style. ${hasPhoto?`Formal photo:${photoTag}`:""}
Header: 履歴書. Personal table: 氏名:${name}, 生年月日:${dob}, 国籍:${nat||"Japanese"}, 連絡先:${ph}/${em}.
SECTIONS: 職務経歴 | 学歴 (table) | 資格・スキル:${sk} | 語学:${lang} | 自己PR (3 formal sentences). Color:${tmpl.color}.`,

    china:`Chinese CV. ${hasPhoto?`Photo:${photoTag}`:""}
个人信息: 姓名:${name}, 出生日期:${dob}, 国籍:${nat||"中国"}, 电话:${ph}, 邮箱:${em}.
SECTIONS: 个人简介 | 工作经历 | 教育背景 | 技能专长:${sk} | 语言能力:${lang} | 证书:${cert||"N/A"}. Color:${tmpl.color}.`,

    hongkong:`Hong Kong CV. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL DETAILS: Name:${name}, HKID:[XXXXXXX(X)], Nationality:${nat||"Hong Kong SAR"}, DOB:${dob}, Mobile:${ph}, Email:${em}.
SECTIONS: CAREER SUMMARY | PROFESSIONAL EXPERIENCE | EDUCATION | SKILLS (${sk}) | LANGUAGE PROFICIENCY | REFERENCES. Finance-ready. Color:${tmpl.color}.`,

    southkorea:`Korean CV. ${hasPhoto?`Formal photo:${photoTag}`:""}
개인정보: 이름:${name}, 생년월일:${dob}, 연락처:${ph}, 이메일:${em}.
SECTIONS: 자기소개서 (3 formal self-intro paragraphs) | 경력사항 | 학력사항 | 자격/기술:${sk} | 어학:${lang}. Color:${tmpl.color}.`,

    thailand:`Thai CV. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL DETAILS: Name:${name}, Thai ID/Passport:[XXXXXXXXXXX], Nationality:${nat||"Thai"}, DOB:${dob}, Mobile:${ph}, Email:${em}.
SECTIONS: CAREER OBJECTIVE | WORK EXPERIENCE | EDUCATION | SKILLS (${sk}) | LANGUAGE SKILLS | REFERENCES. Color:${tmpl.color}.`,

    philippines:`Philippine CV. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL DETAILS: Name:${name}, DOB:${dob}, Civil Status:[Single/Married], Citizenship:${nat||"Filipino"}, Mobile:${ph}, Email:${em}.
SECTIONS: CAREER OBJECTIVE | WORK EXPERIENCE | EDUCATIONAL BACKGROUND | SKILLS (${sk}) | SEMINARS/TRAININGS | CHARACTER REFERENCES (3). Color:${tmpl.color}.`,

    us:`US ATS. ZERO images, ZERO graphics, ZERO columns.
Header: ${name} 24px bold | ${ph} | ${em} | ${loc}.
SECTIONS: PROFESSIONAL SUMMARY | CORE COMPETENCIES (3-col grid:${sk}) | PROFESSIONAL EXPERIENCE (company|title|dates|location, 5 metric bullets) | EDUCATION | CERTIFICATIONS:${cert||"N/A"}.
ALL CAPS headers + full-width rules. Pure ATS parseable. Color:${tmpl.color}.`,

    canadian:`Canadian CV. Clean 2-page. No photo.
SECTIONS: Contact | PROFESSIONAL SUMMARY | CORE COMPETENCIES (${sk}) | PROFESSIONAL EXPERIENCE | EDUCATION | VOLUNTEER | PROFESSIONAL DEVELOPMENT (${cert}).
Color:${tmpl.color}.`,

    brazil:`Brazilian Currículo. ${hasPhoto?`Photo:${photoTag}`:""}
DADOS PESSOAIS: Nome:${name}, Nascimento:${dob}, CPF:[XXX.XXX.XXX-XX], Nationality:${nat||"Brasileiro"}, Tel:${ph}, Email:${em}.
SECTIONS: OBJETIVO PROFISSIONAL | EXPERIÊNCIA | FORMAÇÃO | HABILIDADES (${sk}) | IDIOMAS (${lang}). Color:${tmpl.color}.`,

    mexico:`Mexican CV. ${hasPhoto?`Photo:${photoTag}`:""}
DATOS PERSONALES: Nombre:${name}, CURP:[XXXXXXXXXXXXXXXXXXXX], Nacimiento:${dob}, Nationality:${nat||"Mexicana"}, Tel:${ph}, Email:${em}.
SECTIONS: OBJETIVO | EXPERIENCIA LABORAL | FORMACIÓN | HABILIDADES (${sk}) | IDIOMAS (${lang}) | REFERENCIAS. Color:${tmpl.color}.`,

    australian:`Australian CV. Single-column achievement-focused.
SECTIONS: Header (name + contact) | CAREER OBJECTIVE (3 sentences) | KEY SKILLS (${sk} 3-col grid) | PROFESSIONAL EXPERIENCE (STAR bullets, 4-5/role) | EDUCATION | PROFESSIONAL MEMBERSHIPS | REFEREES:"Available upon request".
${tmpl.color} headers with thick underline.`,

    nz:`New Zealand CV. Warm single-column.
SECTIONS: Contact | CAREER OBJECTIVE (warm 2-3 sentences) | KEY SKILLS (${sk}) | EMPLOYMENT HISTORY | EDUCATION | HOBBIES (${hobby||"outdoor, community"}) | REFEREES: 2 with full contact details.
Color:${tmpl.color}.`,

    southafrica:`South African CV. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL DETAILS: Name:${name}, ID:[XXXXXXXXXXXXXX], Race:[Optional/EE], Nationality:${nat||"South African"}, DOB:${dob}, Mobile:${ph}, Email:${em}.
SECTIONS: CAREER OBJECTIVE | WORK EXPERIENCE | EDUCATION | SKILLS (${sk}) | LANGUAGES (${lang}) | REFERENCES (2). Color:${tmpl.color}.`,

    nigeria:`Nigerian CV. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL: Name:${name}, DOB:${dob}, State of Origin:[State], Nationality:${nat||"Nigerian"}, Mobile:${ph}, Email:${em}.
SECTIONS: CAREER OBJECTIVE | WORK EXPERIENCE | EDUCATIONAL BACKGROUND | SKILLS (${sk}) | CERTIFICATIONS (${cert||"N/A"}) | LANGUAGES (${lang}) | REFEREES (2). Color:${tmpl.color}.`,

    kenya:`Kenyan CV. ${hasPhoto?`Photo:${photoTag}`:""}
PERSONAL DETAILS: Name:${name}, ID:[XXXXXXXX], DOB:${dob}, Nationality:${nat||"Kenyan"}, Mobile:${ph}, Email:${em}.
SECTIONS: CAREER OBJECTIVE | WORK EXPERIENCE | EDUCATION | SKILLS (${sk}) | LANGUAGES (${lang}) | HOBBIES | REFEREES (2). Color:${tmpl.color}.`,
  };

  return `${layouts[region] || layouts.us}\n\nVISUAL STYLE: ${style}`;
};

// ─── Build prompt ─────────────────────────────────────────────────────────────
const buildPrompt = ({ parsedData, resumeText, region, tmpl, hasPhoto, jdText }) => {
  const d = parsedData || {};
  const name  = d.name || "Candidate";
  const sk    = (d.skills || []).join(", ");
  const lang  = (d.languages || []).join(", ");

  const expBlock = (d.experience || []).map((e, i) =>
    `JOB ${i+1}: ${e.role||""} at ${e.company||""} (${e.duration||""}) ${e.location||""}\n${(e.achievements||[]).map(a=>`  - ${a}`).join("\n")}`
  ).join("\n\n");

  const eduBlock = (d.education || []).map(e =>
    `  - ${e.degree||""} | ${e.institution||""} | ${e.year||""} | ${e.grade||""}`
  ).join("\n");

  const layout = getRegionLayout(region, tmpl, d, hasPhoto);
  const jdPart = jdText ? `\nJOB DESCRIPTION (tailor content to match):\n${jdText.substring(0,1000)}` : "";

  return `Expert resume writer + HTML designer. Create a COMPLETE recruiter-approved resume as a full HTML file.

CANDIDATE: ${name}
Contact: ${d.phone||""} | ${d.email||""} | ${d.location||""} | ${d.linkedin||""}
Summary: ${d.summary||"Derive from experience below"}
Skills: ${sk||"Extract from experience"}
Languages: ${lang||"English"}
Certifications: ${(d.certifications||[]).join(", ")||"None"}
${jdPart}

EXPERIENCE:
${expBlock||"No experience — write appropriate professional content"}

EDUCATION:
${eduBlock||"Not provided"}

FORMAT (${region.toUpperCase()}):
${layout}

RULES:
1. Use ONLY real data above — no invented companies, no generic placeholders.
2. Every bullet: strong action verb + metric + outcome. Add realistic numbers where missing.
3. Minimum 2 full A4 pages of rich content.
4. Tailor objective/summary to ${name}'s actual career level and industry.

DESIGN:
- Primary color: ${tmpl.color}
- @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
- Font: 'Inter', sans-serif. Name: 26-30px/800. Body: 10.5-11.5px/line-height 1.65.
- Body bg: #f0f2f5. Resume container: white, max-width 794px, margin 0 auto, box-shadow 0 4px 30px rgba(0,0,0,.08).
- @media print{body{background:white}.resume-container{box-shadow:none;margin:0}@page{margin:15mm}}

OUTPUT: Complete HTML ONLY. Start <!DOCTYPE html>. End </html>. No markdown, no fences, no commentary.`;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ResumeMarketing() {
  const [step, setStep]                   = useState(1);
  const [resumeFile, setResumeFile]       = useState(null);
  const [resumeText, setResumeText]       = useState("");
  const [parsedData, setParsedData]       = useState(null);
  const [region, setRegion]               = useState("");
  const [template, setTemplate]           = useState("");
  const [jd, setJd]                       = useState("");
  const [loading, setLoading]             = useState(false);
  const [loadingMsg, setLoadingMsg]       = useState("");
  const [result, setResult]               = useState(null);
  const [error, setError]                 = useState(null);
  const [photoBase64, setPhotoBase64]     = useState(null);
  const [photoPreview, setPhotoPreview]   = useState(null);
  const [parseProgress, setParseProgress] = useState("");
  const [activeTab, setActiveTab]         = useState(0);
  const [searchQuery, setSearchQuery]     = useState("");
  const [expandedGroup, setExpandedGroup] = useState(null);
  const fileRef  = useRef();
  const photoRef = useRef();

  const groq = (prompt, tokens = 7000) => callGroq(baseUrl, prompt, tokens, setLoadingMsg);

  const handlePhotoUpload = (file) => {
    if (!file) return;
    if (!["image/jpeg","image/png","image/jpg","image/webp"].includes(file.type)) { setError("Upload JPG, PNG or WEBP."); return; }
    const reader = new FileReader();
    reader.onload = evt => { setPhotoBase64(evt.target.result); setPhotoPreview(evt.target.result); };
    reader.onerror = () => setError("Could not read photo.");
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setResumeFile(file); setLoading(true); setError(null); setParseProgress("");
    setLoadingMsg("Reading your resume…");
    try {
      const text = await extractTextFromFile(file, setParseProgress);
      setLoadingMsg("Extracting details with AI…");
      const raw = await groq(
`Parse this resume. Return ONLY raw JSON — no markdown, no backticks.

Resume:
${text.substring(0, 4000)}

JSON:
{"name":"","email":"","phone":"","location":"","linkedin":"","dob":"","nationality":"","summary":"","experience":[{"company":"","role":"","duration":"","location":"","achievements":["full sentence"]}],"education":[{"institution":"","degree":"","year":"","grade":""}],"skills":[],"languages":[],"certifications":[],"hobbies":[],"references":[]}

Return ONLY JSON.`, 2500);
      let c = raw.trim().replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim();
      const fb=c.indexOf("{"); const lb=c.lastIndexOf("}");
      if(fb!==-1&&lb!==-1) c=c.substring(fb,lb+1);
      setParsedData(JSON.parse(c));
      setResumeText(text.substring(0, 3000));
      setStep(2);
    } catch(err) {
      setResumeText(`File: ${file.name}`);
      setParsedData({ name: file.name.replace(/\.[^.]+$/,"") });
      setError(`⚠️ ${err.message} — Resume will still be generated.`);
      setStep(2);
    } finally { setLoading(false); setParseProgress(""); }
  };

  const generateOne = async (tmplId) => {
    const tmpl = TEMPLATES[region]?.find(t => t.id === tmplId);
    if (!tmpl) return;
    setLoading(true); setError(null);
    setLoadingMsg(`Building ${tmpl.name} for ${parsedData?.name||"candidate"}…`);
    try {
      const html  = await groq(buildPrompt({ parsedData, resumeText, region, tmpl, hasPhoto: !!photoBase64, jdText:"" }), 7000);
      const clean = html.replace(/```html\s*/gi,"").replace(/```\s*/g,"").trim();
      const final = injectPhoto(clean, photoBase64);
      setResult(prev => {
        const others = prev?.type==="resumes" ? prev.resumes.filter(r=>r.id!==tmplId) : [];
        return { type:"resumes", resumes:[...others, { id:tmplId, name:tmpl.name, color:tmpl.color, html:final }] };
      });
      setStep(4);
      setTimeout(() => triggerDownload(final, `${(parsedData?.name||"Resume").replace(/\s+/g,"_")}_${region}_${tmpl.name.replace(/\s+/g,"_")}.html`), 500);
    } catch(err) { setError("❌ "+err.message); }
    finally { setLoading(false); }
  };

  const generateAll = async () => {
    if (!region) { setError("Select a country first."); return; }
    setResult({ type:"resumes", resumes:[] }); setStep(4); setActiveTab(0);
    const tmpls = TEMPLATES[region];
    for (let i = 0; i < tmpls.length; i++) {
      const t = tmpls[i];
      setLoading(true);
      setLoadingMsg(`Generating ${i+1}/5: ${t.name}…`);
      try {
        const html  = await groq(buildPrompt({ parsedData, resumeText, region, tmpl:t, hasPhoto:!!photoBase64, jdText:"" }), 7000);
        const clean = html.replace(/```html\s*/gi,"").replace(/```\s*/g,"").trim();
        const final = injectPhoto(clean, photoBase64);
        setResult(prev => ({ type:"resumes", resumes:[...(prev?.resumes||[]), { id:t.id, name:t.name, color:t.color, html:final }] }));
        setTimeout(() => triggerDownload(final, `${(parsedData?.name||"Resume").replace(/\s+/g,"_")}_${region}_${t.name.replace(/\s+/g,"_")}.html`), 300);
      } catch(err) {
        setResult(prev => ({ type:"resumes", resumes:[...(prev?.resumes||[]), { id:t.id, name:t.name, color:t.color, html:null, error:err.message }] }));
      }
      if (i < tmpls.length-1) await new Promise(r=>setTimeout(r,2500));
    }
    setLoading(false);
  };

  const isJDOk = t => t.trim().split(/\s+/).filter(w=>w.length>2).length >= 8;

  const analyseJD = async () => {
    if (!jd.trim()) { setError("Paste a job description."); return; }
    if (!isJDOk(jd)) { setError("JD too short — paste the real posting."); return; }
    setLoading(true); setError(null);
    setLoadingMsg("Analysing match…");
    try {
      const d = parsedData||{};
      const raw = await groq(
`HR analysis. Return ONLY raw JSON.
CANDIDATE: ${d.name}, Skills: ${(d.skills||[]).join(", ")}, Exp: ${(d.experience||[]).map(e=>`${e.role} at ${e.company}`).join("; ")}
JOB: ${jd.substring(0,1500)}
JSON: {"match_score":72,"match_label":"Good","summary":"2-3 sentences","recommendation":"one action","matched_skills":["s"],"missing_skills":["s"],"matched_experience":["p"],"gaps":["g"],"quick_wins":["a"]}
match_label: Excellent/Good/Fair/Low. ONLY JSON.`, 1500);
      let c=raw.trim().replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim();
      const fb=c.indexOf("{"); const lb=c.lastIndexOf("}");
      if(fb!==-1&&lb!==-1) c=c.substring(fb,lb+1);
      setResult({ type:"analysis", analysis:JSON.parse(c) }); setStep(4);
    } catch(err){ setError("❌ "+err.message); }
    finally{ setLoading(false); }
  };

  const rebuildForJD = async () => {
    if (!region) { setError("Select a country first."); return; }
    if (!isJDOk(jd)) { setError("Paste a proper job description first."); return; }
    const tmpl = TEMPLATES[region][0];
    setLoading(true); setError(null);
    setLoadingMsg("Rebuilding resume for this role…");
    try {
      const html  = await groq(buildPrompt({ parsedData, resumeText, region, tmpl, hasPhoto:!!photoBase64, jdText:jd }), 7000);
      const clean = html.replace(/```html\s*/gi,"").replace(/```\s*/g,"").trim();
      const final = injectPhoto(clean, photoBase64);
      setResult({ type:"resumes", resumes:[{ id:"jd", name:"JD Optimised", color:tmpl.color, html:final }] });
      setStep(4); setActiveTab(0);
      setTimeout(() => triggerDownload(final, `${(parsedData?.name||"Resume").replace(/\s+/g,"_")}_JD_Optimised.html`), 500);
    } catch(err){ setError("❌ "+err.message); }
    finally{ setLoading(false); }
  };

  const resetAll = () => {
    setStep(1); setResumeFile(null); setParsedData(null); setResumeText("");
    setError(null); setPhotoBase64(null); setPhotoPreview(null);
    setRegion(""); setTemplate(""); setResult(null); setActiveTab(0); setSearchQuery("");
  };

  const needsPhoto     = PHOTO_REGIONS.includes(region);
  const selectedRegion = REGIONS.find(r=>r.key===region);
  const regionTemplates= region ? TEMPLATES[region] : [];

  const searchLower    = searchQuery.toLowerCase();
  const filteredGroups = REGION_GROUPS.map(g => ({
    ...g,
    countries: searchQuery
      ? g.countries.filter(c => c.label.toLowerCase().includes(searchLower) || c.desc.toLowerCase().includes(searchLower))
      : g.countries,
  })).filter(g => g.countries.length > 0);

  const card = { background:"#fff", borderRadius:16, border:"1.5px solid #e5e7eb", padding:"22px 24px", marginBottom:16, boxShadow:"0 2px 16px rgba(0,0,0,0.05)" };
  const btn  = (bg, fg="#fff", off=false) => ({ padding:"10px 22px", borderRadius:10, border:"none", background:off?"#e5e7eb":bg, color:off?"#9ca3af":fg, fontWeight:700, fontSize:13, cursor:off?"not-allowed":"pointer", fontFamily:"inherit", transition:"all .15s" });

  const Err = () => error ? (
    <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#dc2626",marginBottom:14,display:"flex",justifyContent:"space-between",gap:10}}>
      <span>{error}</span>
      <button onClick={()=>setError(null)} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:18}}>×</button>
    </div>
  ) : null;

  const tmplIcons = { classic:"📋", modern:"✨", executive:"👔", creative:"🎨", minimal:"⚡" };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .25s ease}
        .cc:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.1)!important;transition:all .15s}
        .tc:hover{transform:translateY(-2px);box-shadow:0 5px 16px rgba(0,0,0,.1)!important}
        button:not([disabled]):active{transform:scale(.97)}
      `}</style>

      <div style={{fontFamily:"'DM Sans',sans-serif",maxWidth:1020,margin:"0 auto",padding:"0 14px 60px"}}>

        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#4338ca 100%)",borderRadius:20,padding:"28px 34px",marginBottom:24,color:"#fff",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-80,right:-60,width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,.18),transparent 70%)",pointerEvents:"none"}}/>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:4,textTransform:"uppercase",opacity:.4,marginBottom:6}}>VJC Overseas — Resume Marketing</div>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:-.5}}>📄 AI Resume Builder & JD Matcher</div>
          <div style={{display:"flex",gap:28,marginTop:14,flexWrap:"wrap"}}>
            {[["35+","Countries"],["5","Templates each"],["100%","Your real data"],["Auto","Downloads"]].map(([n,l])=>(
              <div key={l}>
                <div style={{fontSize:22,fontWeight:800,color:"#a5b4fc"}}>{n}</div>
                <div style={{fontSize:11,opacity:.55}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress steps */}
        <div style={{display:"flex",marginBottom:24,background:"#f1f5f9",borderRadius:12,padding:4,width:"fit-content"}}>
          {["Upload","Country","JD Match","Result"].map((s,i)=>{
            const n=i+1,active=step===n,done=step>n;
            return (
              <div key={s} style={{padding:"8px 18px",borderRadius:9,fontSize:12,fontWeight:700,background:active?"#fff":"transparent",color:done?"#16a34a":active?"#4338ca":"#94a3b8",boxShadow:active?"0 1px 6px rgba(0,0,0,.1)":"none",display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:22,height:22,borderRadius:"50%",fontSize:11,fontWeight:800,background:done?"#16a34a":active?"#4338ca":"#e2e8f0",color:(done||active)?"#fff":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center"}}>{done?"✓":n}</span>
                {s}
              </div>
            );
          })}
        </div>

        {/* Loader */}
        {loading && (
          <div style={{...card,textAlign:"center",padding:"52px 20px"}}>
            <div style={{width:46,height:46,border:"3px solid #e2e8f0",borderTop:"3px solid #4338ca",borderRadius:"50%",margin:"0 auto 20px",animation:"spin .75s linear infinite"}}/>
            <div style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:6}}>{loadingMsg}</div>
            <div style={{fontSize:12,color:"#94a3b8"}}>Building personalised resume — 10–25 seconds…</div>
          </div>
        )}

        {/* ── STEP 1: Upload ── */}
        {!loading && step===1 && (
          <div style={card} className="fu">
            <div style={{fontSize:16,fontWeight:800,color:"#0f172a",marginBottom:4}}>Upload Your Resume</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:18}}>AI extracts every detail — powers all 5 templates with your real data.</div>
            <Err/>
            <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFileUpload(e.target.files[0])}/>
            <div
              onClick={()=>fileRef.current.click()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFileUpload(f);}}
              style={{border:"2px dashed #cbd5e1",borderRadius:14,padding:"52px 20px",textAlign:"center",cursor:"pointer",background:"#f8fafc",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#4338ca";e.currentTarget.style.background="#eef2ff";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#cbd5e1";e.currentTarget.style.background="#f8fafc";}}
            >
              <div style={{fontSize:50,marginBottom:10}}>📄</div>
              <div style={{fontSize:15,fontWeight:700,color:"#1e293b"}}>Drop resume here or click to browse</div>
              <div style={{fontSize:12,color:"#94a3b8",marginTop:6}}>TXT · PDF · DOC · DOCX</div>
            </div>
            <div style={{marginTop:14,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[{icon:"📝",f:".TXT",t:"Best results",c:"#16a34a",bg:"#f0fdf4",bd:"#bbf7d0"},{icon:"📘",f:".DOCX",t:"Good support",c:"#1d4ed8",bg:"#eff6ff",bd:"#bfdbfe"},{icon:"📕",f:".PDF",t:"Text PDFs only",c:"#d97706",bg:"#fffbeb",bd:"#fde68a"}].map(x=>(
                <div key={x.f} style={{padding:"10px",borderRadius:10,background:x.bg,border:`1px solid ${x.bd}`,textAlign:"center"}}>
                  <div style={{fontSize:20}}>{x.icon}</div>
                  <div style={{fontSize:12,fontWeight:800,color:x.c}}>{x.f}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{x.t}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:10,padding:"9px 13px",borderRadius:9,background:"#fefce8",border:"1px solid #fef08a",fontSize:12,color:"#854d0e"}}>
              ⚠️ <strong>Scanned PDFs won't work.</strong> Convert to DOCX or TXT first.
            </div>
          </div>
        )}

        {/* ── STEP 2: Country + Template ── */}
        {!loading && step===2 && (
          <div className="fu">
            {parsedData && (
              <div style={{...card,background:"#f0fdf4",border:"1.5px solid #86efac"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:28}}>✅</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#15803d"}}>Resume parsed — all data ready</div>
                    <div style={{fontSize:12,color:"#166534",marginTop:3}}>
                      <strong>{parsedData.name||resumeFile?.name}</strong>
                      {parsedData.experience?.length?` · ${parsedData.experience.length} roles`:""}
                      {parsedData.skills?.length?` · ${parsedData.skills.length} skills`:""}
                      {parsedData.education?.length?` · ${parsedData.education.length} qualifications`:""}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={card}>
              <div style={{fontSize:16,fontWeight:800,color:"#0f172a",marginBottom:2}}>Choose Destination Country</div>
              <div style={{fontSize:13,color:"#64748b",marginBottom:14}}><strong>35 countries · 5 templates each</strong> — all personalised from {parsedData?.name||"your"}'s actual data.</div>
              <Err/>

              {/* Search */}
              <div style={{position:"relative",marginBottom:14}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:15}}>🔍</span>
                <input
                  value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="Search country…"
                  style={{width:"100%",padding:"10px 34px 10px 36px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",background:"#f8fafc",color:"#0f172a",outline:"none"}}
                  onFocus={e=>e.target.style.borderColor="#818cf8"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"}
                />
                {searchQuery && <button onClick={()=>setSearchQuery("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#94a3b8"}}>×</button>}
              </div>

              {/* Country groups */}
              {filteredGroups.map(g => (
                <div key={g.group} style={{marginBottom:10}}>
                  <button
                    onClick={()=>setExpandedGroup(expandedGroup===g.group?null:g.group)}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 14px",borderRadius:10,border:`1.5px solid ${region&&g.countries.some(c=>c.key===region)?"#4338ca":"#e2e8f0"}`,background:region&&g.countries.some(c=>c.key===region)?"#eef2ff":"#f8fafc",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,color:region&&g.countries.some(c=>c.key===region)?"#4338ca":"#374151",transition:"all .15s"}}
                  >
                    <span>{g.group} <span style={{fontSize:11,color:"#94a3b8",fontWeight:400}}>({g.countries.length})</span></span>
                    <span style={{fontSize:11,transition:"transform .2s",display:"inline-block",transform:(searchQuery||expandedGroup===g.group)?"rotate(180deg)":"rotate(0)"}}>▼</span>
                  </button>
                  {(searchQuery || expandedGroup===g.group) && (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8,marginTop:8}}>
                      {g.countries.map(r=>(
                        <div
                          key={r.key} className="cc"
                          onClick={()=>{setRegion(r.key);setTemplate("");}}
                          style={{padding:"11px 12px",borderRadius:11,cursor:"pointer",border:`2px solid ${region===r.key?"#4338ca":"#e2e8f0"}`,background:region===r.key?"#eef2ff":"#f8fafc",boxShadow:region===r.key?"0 4px 14px rgba(67,56,202,.14)":"none",transition:"all .15s"}}
                        >
                          <div style={{fontSize:22,marginBottom:4}}>{r.flag}</div>
                          <div style={{fontSize:12,fontWeight:700,color:region===r.key?"#3730a3":"#0f172a"}}>{r.label}</div>
                          <div style={{fontSize:10,color:"#64748b",marginTop:2,lineHeight:1.4}}>{r.desc}</div>
                          {PHOTO_REGIONS.includes(r.key)&&<div style={{marginTop:5,fontSize:9,fontWeight:600,color:"#7c3aed",background:"#f3e8ff",padding:"2px 6px",borderRadius:20,display:"inline-block"}}>📷 Photo</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Selected badge */}
              {region && selectedRegion && (
                <div style={{padding:"10px 14px",borderRadius:10,background:"#eef2ff",border:"1.5px solid #c7d2fe",fontSize:13,color:"#4338ca",marginTop:6,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{selectedRegion.flag}</span>
                  <strong>{selectedRegion.label}</strong> selected
                  {needsPhoto&&<span style={{fontSize:11,color:"#7c3aed",background:"#f3e8ff",padding:"2px 8px",borderRadius:20,fontWeight:600}}>📷 Photo region</span>}
                </div>
              )}

              {/* Template picker */}
              {region && (
                <div style={{padding:"16px 18px",borderRadius:13,background:"#f8fafc",border:"1.5px solid #e2e8f0",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:3}}>🎨 Choose Template Style</div>
                  <div style={{fontSize:12,color:"#64748b",marginBottom:12}}>5 unique designs · same real data · completely different visual styles</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                    {regionTemplates.map(t=>(
                      <div key={t.id} className="tc" onClick={()=>setTemplate(t.id)} style={{padding:"12px 8px",borderRadius:10,cursor:"pointer",border:`2px solid ${template===t.id?t.color:"#e2e8f0"}`,background:template===t.id?"#fff":"#f8fafc",position:"relative",transition:"all .15s",textAlign:"center"}}>
                        <div style={{height:3,borderRadius:99,background:t.color,marginBottom:8}}/>
                        <div style={{width:26,height:26,borderRadius:6,background:t.color,margin:"0 auto 6px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{tmplIcons[t.id]}</div>
                        <div style={{fontSize:10,fontWeight:700,color:template===t.id?t.color:"#374151",lineHeight:1.3}}>{t.name}</div>
                        <div style={{fontSize:9,color:"#94a3b8",marginTop:2,textTransform:"capitalize"}}>{t.style}</div>
                        {template===t.id&&<div style={{position:"absolute",top:6,right:6,width:15,height:15,borderRadius:"50%",background:t.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:800}}>✓</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo upload */}
              {region && needsPhoto && (
                <div style={{padding:"16px 18px",borderRadius:13,background:"#faf5ff",border:"1.5px solid #d8b4fe",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#6d28d9",marginBottom:3}}>📷 Profile / Passport Photo</div>
                  <div style={{fontSize:12,color:"#7c3aed",marginBottom:12}}>Required for <strong>{selectedRegion?.label}</strong>. Stored locally — never sent to the AI API.</div>
                  <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handlePhotoUpload(e.target.files[0]);e.target.value="";}}/>
                  <div style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap"}}>
                    <div style={{position:"relative",flexShrink:0}}>
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="Profile" style={{width:95,height:118,objectFit:"cover",borderRadius:7,border:"3px solid #a78bfa",display:"block"}}/>
                          <button onClick={()=>{setPhotoBase64(null);setPhotoPreview(null);}} style={{position:"absolute",top:-8,right:-8,background:"#ef4444",color:"#fff",border:"2px solid #fff",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                        </>
                      ) : (
                        <div onClick={()=>photoRef.current?.click()} style={{width:95,height:118,borderRadius:7,border:"2px dashed #c4b5fd",background:"#ede9fe",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:5}}>
                          <span style={{fontSize:30}}>👤</span>
                          <span style={{fontSize:10,color:"#7c3aed",fontWeight:700}}>Upload</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <button onClick={()=>photoRef.current?.click()} style={btn("#7c3aed")}>{photoPreview?"🔄 Change Photo":"📷 Upload Photo"}</button>
                      <div style={{fontSize:11,color:"#64748b",marginTop:7}}>JPG · PNG · WEBP · Passport-style</div>
                      {photoPreview
                        ? <div style={{fontSize:11,color:"#16a34a",marginTop:5,fontWeight:600}}>✅ Injected client-side after generation</div>
                        : <div style={{fontSize:11,color:"#9ca3af",marginTop:5}}>Skip to use placeholder box</div>}
                    </div>
                  </div>
                </div>
              )}

              <div style={{padding:"9px 14px",borderRadius:9,background:"#f0fdf4",border:"1px solid #86efac",fontSize:12,color:"#166534",marginBottom:14,display:"flex",gap:9,alignItems:"center"}}>
                <span style={{fontSize:16}}>⬇️</span>
                <span><strong>Auto-download:</strong> Each resume saves as .html. Chrome → Ctrl+P → Save as PDF.</span>
              </div>

              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button onClick={()=>{if(!region){setError("Select a country.");return;}if(!template){setError("Select a template.");return;}generateOne(template);}} disabled={!region} style={btn("#4338ca","#fff",!region)}>🎨 Generate Selected</button>
                <button onClick={generateAll} disabled={!region} style={btn("#059669","#fff",!region)}>⚡ Generate All 5</button>
                <button onClick={()=>{if(!region){setError("Select a country.");return;}setStep(3);}} disabled={!region} style={btn("#f59e0b","#fff",!region)}>📋 Match Job Description →</button>
                <button onClick={resetAll} style={btn("#f1f5f9","#475569")}>← New Resume</button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: JD ── */}
        {!loading && step===3 && (
          <div style={card} className="fu">
            <div style={{fontSize:16,fontWeight:800,color:"#0f172a",marginBottom:4}}>Paste Job Description</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:14}}>Paste the full posting — match {parsedData?.name||"candidate"}'s real profile against it.</div>
            <Err/>
            {selectedRegion && (
              <div style={{padding:"8px 13px",borderRadius:9,background:"#eef2ff",border:"1px solid #c7d2fe",fontSize:12,color:"#4338ca",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>{selectedRegion.flag}</span>Using <strong>{selectedRegion.label}</strong> format for rebuild
              </div>
            )}
            <textarea value={jd} onChange={e=>setJd(e.target.value)} rows={13} placeholder="Paste the full job description here…"
              style={{width:"100%",padding:"13px",borderRadius:11,fontSize:13,border:"1.5px solid #e2e8f0",outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box",color:"#0f172a",background:"#f8fafc",lineHeight:1.7}}
              onFocus={e=>e.target.style.borderColor="#818cf8"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}
            />
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:5}}>
              <span style={{color:jd.trim().length<50?"#f87171":jd.trim().length<200?"#f59e0b":"#16a34a"}}>
                {jd.trim().length===0?"Waiting…":jd.trim().length<50?"⚠️ Too short":jd.trim().length<200?"⚡ Add more":"✅ Ready"}
              </span>
              <span style={{color:"#94a3b8"}}>{jd.trim().split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
              <button onClick={analyseJD} style={btn("#f59e0b")}>🔍 Analyse Match %</button>
              <button onClick={rebuildForJD} style={btn("#7c3aed")}>✨ Rebuild for this Role</button>
              <button onClick={()=>setStep(2)} style={btn("#f1f5f9","#475569")}>← Back</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Results ── */}
        {!loading && step===4 && result && (
          <div className="fu">

            {/* Analysis */}
            {result.type==="analysis" && result.analysis && (()=>{
              const a=result.analysis;
              const sc=a.match_score>=70?"#16a34a":a.match_score>=45?"#d97706":"#dc2626";
              const sb=a.match_score>=70?"#f0fdf4":a.match_score>=45?"#fffbeb":"#fef2f2";
              const sd=a.match_score>=70?"#86efac":a.match_score>=45?"#fde68a":"#fca5a5";
              return (
                <div>
                  <div style={{...card,background:sb,border:`2px solid ${sd}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:28,flexWrap:"wrap"}}>
                      <div style={{textAlign:"center",minWidth:110}}>
                        <div style={{fontSize:68,fontWeight:800,color:sc,lineHeight:1}}>{a.match_score}%</div>
                        <div style={{fontSize:13,fontWeight:700,color:sc,marginTop:3}}>{a.match_label} Match</div>
                        <div style={{marginTop:9,height:6,borderRadius:99,background:"#e2e8f0",overflow:"hidden",width:100}}>
                          <div style={{height:"100%",width:`${a.match_score}%`,background:sc,borderRadius:99}}/>
                        </div>
                      </div>
                      <div style={{flex:1,minWidth:200}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:7}}>Assessment</div>
                        <div style={{fontSize:13,color:"#374151",lineHeight:1.75}}>{a.summary}</div>
                        <div style={{marginTop:10,padding:"9px 13px",borderRadius:9,background:"rgba(255,255,255,.8)",fontSize:13,fontWeight:600,color:sc}}>💡 {a.recommendation}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                    <div style={{...card,background:"#f0fdf4",border:"1.5px solid #86efac"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#15803d",marginBottom:10}}>✅ Matched Skills</div>
                      {(a.matched_skills||[]).map((s,i)=><div key={i} style={{fontSize:12,padding:"4px 0",color:"#166534",borderBottom:"1px solid #dcfce7"}}>● {s}</div>)}
                    </div>
                    <div style={{...card,background:"#fef2f2",border:"1.5px solid #fca5a5"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#dc2626",marginBottom:10}}>❌ Missing Skills</div>
                      {(a.missing_skills||[]).map((s,i)=><div key={i} style={{fontSize:12,padding:"4px 0",color:"#991b1b",borderBottom:"1px solid #fee2e2"}}>● {s}</div>)}
                    </div>
                  </div>
                  {(a.quick_wins||[]).length>0&&(
                    <div style={{...card,background:"#eff6ff",border:"1.5px solid #bfdbfe"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#1d4ed8",marginBottom:10}}>⚡ Quick Wins</div>
                      {a.quick_wins.map((w,i)=>(
                        <div key={i} style={{fontSize:13,color:"#1e40af",padding:"8px 0",borderBottom:i<a.quick_wins.length-1?"1px solid #dbeafe":"none",display:"flex",gap:11}}>
                          <span style={{minWidth:22,height:22,borderRadius:"50%",background:"#3b82f6",color:"#fff",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                          <span style={{lineHeight:1.6}}>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <button onClick={rebuildForJD} style={btn("#7c3aed")}>✨ Rebuild for this Role</button>
                    <button onClick={()=>setStep(3)} style={btn("#f1f5f9","#475569")}>← Edit JD</button>
                    <button onClick={()=>{setResult(null);setStep(2);}} style={btn("#f1f5f9","#475569")}>↺ Change Country</button>
                  </div>
                </div>
              );
            })()}

            {/* Resume previews */}
            {result.type==="resumes" && (
              <div>
                <div style={{...card,background:"#f0fdf4",border:"2px solid #86efac",marginBottom:0,borderRadius:"16px 16px 0 0"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:"#15803d"}}>
                        🎉 {result.resumes.filter(r=>r.html).length}/{result.resumes.length} Resumes Ready{loading&&" — generating…"}
                      </div>
                      <div style={{fontSize:12,color:"#64748b",marginTop:3}}>✅ Auto-downloaded · Chrome → Ctrl+P → Save as PDF</div>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {region&&<button onClick={generateAll} style={btn("#4338ca")}>🔄 Regenerate All 5</button>}
                      <button onClick={()=>{setResult(null);setStep(2);}} style={btn("#f1f5f9","#475569")}>← Change Country</button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{display:"flex",gap:0,background:"#f8fafc",border:"1.5px solid #e2e8f0",borderTop:"none",borderBottom:"none",padding:"0 4px",flexWrap:"wrap"}}>
                  {result.resumes.map((r,i)=>(
                    <button key={r.id} onClick={()=>setActiveTab(i)} style={{padding:"11px 15px",border:"none",borderBottom:activeTab===i?`3px solid ${r.color}`:"3px solid transparent",background:"transparent",fontWeight:700,fontSize:12,cursor:"pointer",color:activeTab===i?r.color:"#64748b",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:r.color,display:"inline-block",flexShrink:0}}/>
                      {r.name}{r.error&&" ⚠️"}{!r.html&&!r.error&&" ⏳"}
                    </button>
                  ))}
                  {loading&&result.resumes.length<5&&(
                    <button style={{padding:"11px 15px",border:"none",borderBottom:"3px solid transparent",background:"transparent",fontSize:12,color:"#94a3b8",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:"#e2e8f0",display:"inline-block"}}/>Generating…
                    </button>
                  )}
                </div>

                {result.resumes[activeTab] && (
                  <div style={{border:"1.5px solid #e2e8f0",borderTop:"none",borderRadius:"0 0 16px 16px",overflow:"hidden",background:"#fff"}}>
                    {result.resumes[activeTab].error ? (
                      <div style={{padding:40,textAlign:"center"}}>
                        <div style={{fontSize:30,marginBottom:10}}>⚠️</div>
                        <div style={{fontSize:14,fontWeight:600,color:"#dc2626",marginBottom:6}}>Generation failed</div>
                        <div style={{fontSize:12,color:"#64748b",marginBottom:14}}>{result.resumes[activeTab].error}</div>
                        <button onClick={()=>generateOne(result.resumes[activeTab].id)} style={btn("#4338ca")}>🔄 Retry</button>
                      </div>
                    ) : result.resumes[activeTab].html ? (
                      <>
                        <div style={{padding:"11px 18px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{width:11,height:11,borderRadius:"50%",background:result.resumes[activeTab].color,display:"inline-block"}}/>
                            <span style={{fontSize:13,fontWeight:700,color:"#374151"}}>{result.resumes[activeTab].name}</span>
                          </div>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <button onClick={()=>triggerDownload(result.resumes[activeTab].html,`${(parsedData?.name||"Resume").replace(/\s+/g,"_")}_${result.resumes[activeTab].name.replace(/\s+/g,"_")}.html`)} style={btn("#4338ca")}>⬇️ Download HTML</button>
                            <span style={{fontSize:11,color:"#94a3b8"}}>Chrome → Ctrl+P → PDF</span>
                          </div>
                        </div>
                        <iframe srcDoc={result.resumes[activeTab].html} title="Resume" sandbox="allow-same-origin" style={{width:"100%",height:920,border:"none",display:"block"}}/>
                      </>
                    ) : (
                      <div style={{padding:50,textAlign:"center"}}>
                        <div style={{width:34,height:34,border:"3px solid #e2e8f0",borderTop:"3px solid #4338ca",borderRadius:"50%",margin:"0 auto 12px",animation:"spin .75s linear infinite"}}/>
                        <div style={{fontSize:13,fontWeight:600,color:"#64748b"}}>Generating…</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}