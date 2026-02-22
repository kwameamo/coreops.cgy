import { useState, useCallback } from "react";
import {
  Plus, Trash2, Download, FileText, Edit2, X,
  CheckCircle, AlertCircle, Info, Search,
  Briefcase, Scissors, BarChart3,
  Check, Eye, Copy, User, Calendar, DollarSign, Receipt
} from "lucide-react";

/* ─────────────────────────────────────────────
   Logo
───────────────────────────────────────────── */
import logoUrl from "./assets/cgy_logo_new.png";
import signUrl from "./assets/sign.png";

// Convert imported asset to base64 for use in printed windows
const getBase64Logo = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
};

const getBase64Sign = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = signUrl;
  });
};



/* ─────────────────────────────────────────────
   CONTRACT TEMPLATES
───────────────────────────────────────────── */
const GRAPHIC_DESIGN_SERVICES = [
  { label: "Logo Design", ghsMin: 650, ghsMax: 1800, usdMin: 60, usdMax: 165 },
  { label: "Full Brand Identity (Brand Guide + Assets)", ghsMin: 2500, ghsMax: 6000, usdMin: 200, usdMax: 650 },
  { label: "Flyer / Poster", ghsMin: 250, ghsMax: 650, usdMin: 30, usdMax: 60 },
  { label: "Social Media Content Pack (10 posts)", ghsMin: 550, ghsMax: 1200, usdMin: 50, usdMax: 110 },
  { label: "Business Card Design", ghsMin: 200, ghsMax: 400, usdMin: 20, usdMax: 40 },
  { label: "Packaging Design", ghsMin: 700, ghsMax: 2500, usdMin: 65, usdMax: 230 },
];

const MERCH_DESIGN_SERVICES = [
  { label: "Apparel Graphic / Clothing Design", ghsMin: 400, ghsMax: 900, usdMin: 40, usdMax: 80 },
  { label: "Full Clothing Line Concept (5–10 pieces)", ghsMin: 2000, ghsMax: 4500, usdMin: 200, usdMax: 450 },
  { label: "Tech Packs (Production Ready)", ghsMin: 700, ghsMax: 2000, usdMin: 65, usdMax: 200 },
  { label: "Brand Campaign Posters", ghsMin: 300, ghsMax: 750, usdMin: 30, usdMax: 80 },
];

const STATUSES = ["DRAFT", "SENT", "SIGNED", "ACTIVE", "COMPLETED", "CANCELLED"];

const STATUS_STYLES = {
  DRAFT:     "bg-gray-100 text-gray-700",
  SENT:      "bg-blue-100 text-blue-800",
  SIGNED:    "bg-green-100 text-green-800",
  ACTIVE:    "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const CONTRACT_TYPES = {
  graphic: { label: "Graphic Design & Branding", services: GRAPHIC_DESIGN_SERVICES, color: "#CC2222", bgClass: "bg-red-50", textClass: "text-red-600" },
  merch:   { label: "Clothing & Merch Design",   services: MERCH_DESIGN_SERVICES,   color: "#B8860B", bgClass: "bg-amber-50", textClass: "text-amber-700" },
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const today = () => new Date().toISOString().split("T")[0];
const uid   = () => `ctr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const pad   = (n) => String(n).padStart(3, "0");
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
};

const blankContract = (counter, type = "graphic") => ({
  id: uid(),
  contractNumber: `CGY-${new Date().getFullYear()}-${pad(counter)}`,
  type,
  status: "DRAFT",
  contractDate: today(),
  startDate: today(),
  endDate: "",
  designerName: "Curio Graphics Yard",
  designerEmail: "curiographicsyard@gmail.com",
  designerPhone: "",
  designerAddress: "Koforidua, E7-0979-957, Ghana",
  clientName: "",
  clientCompany: "",
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",
  projectTitle: "",
  servicesSelected: [],
  customServices: "",
  deliverables: "",
  currency: "GHS",
  agreedAmount: "",
  depositPercent: 50,
  revisionsIncluded: 2,
  revisionRate: 150,
  rushFeePercent: 20,
  paymentAccount: "0200044821",
  paymentInstitution: "Telecel",
  paymentBeneficiary: "David Amo",
  licenseType: "Non-exclusive commercial",
  exclusivity: false,
  portfolioRights: true,
  sourceFilesIncluded: false,
  sourceFilesFee: "",
  specialRequirements: "",
  savedDate: "",
});

/* ─────────────────────────────────────────────
   PDF GENERATOR
───────────────────────────────────────────── */
const generateContractPDF = async (contract) => {
  const typeInfo = CONTRACT_TYPES[contract.type];
  const accentColor = typeInfo.color;
  const depositAmt = contract.agreedAmount
    ? ((parseFloat(contract.agreedAmount) * contract.depositPercent) / 100).toFixed(2)
    : "—";
  const balanceAmt = contract.agreedAmount
    ? ((parseFloat(contract.agreedAmount) * (100 - contract.depositPercent)) / 100).toFixed(2)
    : "—";

    const [base64Logo, base64Sign] = await Promise.all([getBase64Logo(), getBase64Sign()]);

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contract ${contract.contractNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap'),
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&family=Meow+Script&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; font-size: 11pt; color: #222; line-height: 1.65; padding: 0; }
    .page { max-width: 760px; margin: 0 auto; padding: 48px 52px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 4px solid ${accentColor}; }
    .contract-badge { text-align: right; }
    .contract-type { font-size: 11pt; font-weight: 700; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.06em; }
    .contract-num { font-size: 9pt; color: #888; margin-top: 4px; }
    .contract-date { font-size: 9pt; color: #888; }
    .legal-banner { background: #111; color: #fff; text-align: center; padding: 10px 16px; font-size: 9pt; letter-spacing: 0.04em; margin-bottom: 28px; border-radius: 3px; }
    h2 { font-family: 'DM Serif Display', serif; font-size: 14pt; color: ${accentColor}; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 1.5px solid ${accentColor}33; }
    h3 { font-size: 10.5pt; font-weight: 700; color: #222; margin: 16px 0 6px; }
    p, li { margin-bottom: 6px; }
    ul { padding-left: 20px; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-bottom: 18px; }
    .info-cell { padding: 8px 12px; border-bottom: 1px solid #eee; border-right: 1px solid #eee; }
    .info-cell:nth-child(even) { border-right: none; }
    .info-cell:last-child, .info-cell:nth-last-child(2):nth-child(odd) { border-bottom: none; }
    .info-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 2px; }
    .info-val { font-size: 10pt; font-weight: 600; color: #111; }
    .full-cell { grid-column: 1 / -1; border-right: none; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #111; color: #fff; padding: 8px 12px; text-align: left; font-size: 9pt; font-weight: 600; letter-spacing: 0.04em; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 10pt; }
    tr:nth-child(even) td { background: #fafafa; }
    .payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
    .pay-box { border: 1.5px solid ${accentColor}; border-radius: 4px; padding: 12px 14px; }
    .pay-label { font-size: 8pt; font-weight: 700; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .pay-amount { font-family: 'DM Serif Display', serif; font-size: 16pt; color: #111; }
    .pay-note { font-size: 8.5pt; color: #666; margin-top: 2px; }
    .kill-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .kill-table th { background: #f5f5f5; color: #333; font-size: 9pt; }
    .kill-table td { font-size: 9.5pt; }
    .badge-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 8.5pt; font-weight: 600; }
    .badge-yes { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
    .badge-no { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 20px; }
    .sig-party-label { font-size: 9pt; font-weight: 700; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
    .sig-line { border-bottom: 1.5px solid #333; margin-bottom: 5px; height: 36px; }
    .sig-field-label { font-size: 8pt; color: #888; margin-bottom: 12px; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 2px solid ${accentColor}; text-align: center; font-size: 8.5pt; color: #888; }
    .warn-box { background: #fff8f0; border: 1.5px solid ${accentColor}66; border-radius: 4px; padding: 10px 14px; margin: 12px 0; font-size: 9.5pt; color: #7c3a00; }
    @media print {
      body { padding: 0; }
      .page { padding: 36px 44px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      ${base64Logo
        ? `<img src="${base64Logo}" alt="Curio Graphics Yard" style="height:52px;width:auto;display:block;object-fit:contain;" />`
        : `<div style="font-family:'DM Serif Display',serif;font-size:28pt;color:#CC2222;line-height:1;">CGY</div><div style="font-size:9pt;color:#666;margin-top:4px;letter-spacing:0.08em;text-transform:uppercase;">Curio Graphics Yard</div>`
      }
    </div>
    <div class="contract-badge">
      <div class="contract-type">${typeInfo.label}</div>
      <div class="contract-num">Contract #${contract.contractNumber}</div>
      <div class="contract-date">Dated: ${fmtDate(contract.contractDate)}</div>
    </div>
  </div>

  <div class="legal-banner">⚖ This is a legally binding agreement. Both parties must read all terms before signing.</div>

  <!-- 1. PARTIES -->
  <h2>1. Parties & Project Overview</h2>
  <div class="info-grid">
    <div class="info-cell"><div class="info-label">Designer / Studio</div><div class="info-val">Curio Graphics Yard (CGY)</div></div>
    <div class="info-cell"><div class="info-label">Designer Email</div><div class="info-val">${contract.designerEmail}</div></div>
    ${contract.designerPhone ? `<div class="info-cell"><div class="info-label">Designer Phone</div><div class="info-val">${contract.designerPhone}</div></div>` : ""}
    <div class="info-cell ${!contract.designerPhone ? "full-cell" : ""}"><div class="info-label">Designer Address</div><div class="info-val">${contract.designerAddress}</div></div>
    <div class="info-cell"><div class="info-label">Client Name</div><div class="info-val">${contract.clientName || "—"}</div></div>
    <div class="info-cell"><div class="info-label">Client Company / Brand</div><div class="info-val">${contract.clientCompany || "—"}</div></div>
    <div class="info-cell"><div class="info-label">Client Email</div><div class="info-val">${contract.clientEmail || "—"}</div></div>
    <div class="info-cell"><div class="info-label">Client Phone</div><div class="info-val">${contract.clientPhone || "—"}</div></div>
    ${contract.clientAddress ? `<div class="info-cell full-cell"><div class="info-label">Client Address</div><div class="info-val">${contract.clientAddress}</div></div>` : ""}
    <div class="info-cell full-cell"><div class="info-label">Project Title</div><div class="info-val">${contract.projectTitle || "—"}</div></div>
    <div class="info-cell"><div class="info-label">Start Date</div><div class="info-val">${fmtDate(contract.startDate)}</div></div>
    <div class="info-cell"><div class="info-label">Estimated End Date</div><div class="info-val">${contract.endDate ? fmtDate(contract.endDate) : "TBD"}</div></div>
  </div>

  <!-- 2. SERVICES -->
  <h2>2. Services Selected & Agreed Rates</h2>
  ${contract.servicesSelected.length > 0 ? `
  <table>
    <thead><tr><th>Service</th><th>Rate (GHS)</th><th>Rate (USD Eq.)</th></tr></thead>
    <tbody>
      ${typeInfo.services.filter(s => contract.servicesSelected.includes(s.label)).map(s => `
      <tr><td>${s.label}</td><td>GHS ${s.ghsMin.toLocaleString()} – ${s.ghsMax.toLocaleString()}</td><td>USD ${s.usdMin || "—"} – ${s.usdMax || "—"}</td></tr>`).join("")}
    </tbody>
  </table>` : "<p>No services selected.</p>"}
  ${contract.customServices ? `<p><strong>Additional / Custom Services:</strong> ${contract.customServices}</p>` : ""}
  <div class="info-grid" style="margin-top:12px">
    <div class="info-cell"><div class="info-label">Agreed Project Rate</div><div class="info-val">${contract.currency} ${contract.agreedAmount || "—"}</div></div>
    <div class="info-cell"><div class="info-label">Currency</div><div class="info-val">${contract.currency}</div></div>
    <div class="info-cell"><div class="info-label">Deposit Percentage</div><div class="info-val">${contract.depositPercent}%</div></div>
    <div class="info-cell"><div class="info-label">Revisions Included</div><div class="info-val">${contract.revisionsIncluded} rounds</div></div>
  </div>

  <!-- 3. SCOPE -->
  <h2>3. Scope of Work & Deliverables</h2>
  ${contract.deliverables ? `<p>${contract.deliverables.replace(/\n/g, "<br>")}</p>` : `<ul>
    <li>Deliverables as described in Section 2 services above</li>
    <li>Final files in agreed formats (PNG, JPG, SVG, PDF as applicable)</li>
    <li>Source/native files only if Section 9 indicates inclusion</li>
  </ul>`}
  <div class="warn-box">⚠ Any work not explicitly listed above is considered OUT OF SCOPE and will be quoted and billed separately via written Change Order.</div>
  ${contract.specialRequirements ? `<h3>Special Requirements</h3><p>${contract.specialRequirements}</p>` : ""}

  <!-- 4. TIMELINE -->
  <h2>4. Project Timeline & Milestones</h2>
  <table>
    <thead><tr><th>Phase</th><th>Deliverable</th><th>Due Date</th><th>Payment Due</th></tr></thead>
    <tbody>
      <tr><td>Phase 1 — Brief & Deposit</td><td>Signed contract + deposit received</td><td>${fmtDate(contract.startDate)}</td><td>${contract.depositPercent}% — ${contract.currency} ${depositAmt}</td></tr>
      <tr><td>Phase 2 — Concepts Presented</td><td>Initial designs / drafts</td><td>TBD</td><td>—</td></tr>
      <tr><td>Phase 3 — Revisions (${contract.revisionsIncluded} rounds)</td><td>Refined designs per feedback</td><td>TBD</td><td>—</td></tr>
      <tr><td>Phase 4 — Final Approval</td><td>Client written sign-off</td><td>TBD</td><td>—</td></tr>
      <tr><td>Phase 5 — Final Delivery</td><td>All agreed final files delivered</td><td>${contract.endDate ? fmtDate(contract.endDate) : "TBD"}</td><td>${100 - contract.depositPercent}% — ${contract.currency} ${balanceAmt}</td></tr>
    </tbody>
  </table>
  <p style="font-size:9.5pt;color:#7c3a00;margin-top:8px">⏱ If the Client fails to respond within 5 business days of any submission, the timeline shifts forward accordingly. A Rush Fee of ${contract.rushFeePercent}% applies for urgent delivery after a Client-caused delay.</p>

  <!-- 5. REVISIONS -->
  <h2>5. Revision Policy</h2>
  <table>
    <thead><tr><th>Item</th><th>Terms</th></tr></thead>
    <tbody>
      <tr><td>Included Revisions</td><td>${contract.revisionsIncluded} rounds per deliverable</td></tr>
      <tr><td>Additional Revisions</td><td>${contract.currency} ${contract.revisionRate} per additional round</td></tr>
      <tr><td>New Design Direction</td><td>Treated as a new project — re-quoted separately</td></tr>
    </tbody>
  </table>
  <p>A "revision" means minor changes to an approved concept. Scrapping the direction entirely = new project. Once a design is approved in writing, that phase is <strong>closed</strong>.</p>

  <!-- 6. PAYMENT -->
  <h2>6. Payment Terms</h2>
  <div class="payment-grid">
    <div class="pay-box">
      <div class="pay-label">Deposit Due at Signing</div>
      <div class="pay-amount">${contract.currency} ${depositAmt}</div>
      <div class="pay-note">${contract.depositPercent}% — Work begins only after this is received</div>
    </div>
    <div class="pay-box">
      <div class="pay-label">Balance Due at Final Delivery</div>
      <div class="pay-amount">${contract.currency} ${balanceAmt}</div>
      <div class="pay-note">${100 - contract.depositPercent}% — Paid before final files are released</div>
    </div>
  </div>
  <div class="info-grid">
    <div class="info-cell"><div class="info-label">Payment Account</div><div class="info-val">${contract.paymentAccount}</div></div>
    <div class="info-cell"><div class="info-label">Institution</div><div class="info-val">${contract.paymentInstitution}</div></div>
    <div class="info-cell full-cell"><div class="info-label">Beneficiary</div><div class="info-val">${contract.paymentBeneficiary}</div></div>
  </div>
  <h3>Kill Fee — Cancellation Schedule</h3>
  <table class="kill-table">
    <thead><tr><th>Project Completion at Cancellation</th><th>Amount Owed</th></tr></thead>
    <tbody>
      <tr><td>Before concepts delivered</td><td>Client forfeits deposit — no refund</td></tr>
      <tr><td>After concepts delivered</td><td>75% of total project rate</td></tr>
      <tr><td>Near completion (revisions done)</td><td>100% of total project rate</td></tr>
    </tbody>
  </table>
  <p>Late payments after 7 days incur a holding fee of GHS 50 / USD 5 per day. Final files are withheld until full payment is confirmed.</p>

  <!-- 7. CLIENT RESPONSIBILITIES -->
  <h2>7. Client Responsibilities</h2>
  <ul>
    <li>Provide all required content (text, logos, brand assets, references) before work begins.</li>
    <li>Designate ONE point of contact — consolidated feedback only, no conflicting instructions.</li>
    <li>Provide written feedback within 5 business days of each submission.</li>
    <li>NOT share, post, or use any draft or work-in-progress designs publicly before final approval.</li>
    <li>Ensure all content provided to CGY is owned or properly licensed by the Client.</li>
  </ul>
  ${contract.type === "merch" ? `
  <ul>
    <li>Specify the intended print method (screen print, DTF, embroidery) upfront — this affects file preparation.</li>
    <li>Verify all design details (spelling, measurements, color codes) before written approval.</li>
    <li>NOT send CGY files to manufacturers without paying the full balance first.</li>
  </ul>` : ""}

  <!-- 8. INTELLECTUAL PROPERTY -->
  <h2>8. Intellectual Property & Ownership</h2>
  <div class="badge-row">
    <span class="badge ${contract.portfolioRights ? "badge-yes" : "badge-no"}">${contract.portfolioRights ? "✓" : "✗"} CGY Portfolio Rights</span>
    <span class="badge ${contract.sourceFilesIncluded ? "badge-yes" : "badge-no"}">${contract.sourceFilesIncluded ? "✓" : "✗"} Source Files Included</span>
    <span class="badge ${contract.exclusivity ? "badge-yes" : "badge-no"}">${contract.exclusivity ? "✓" : "✗"} Exclusive License</span>
  </div>
  <p><strong>Ownership Before Full Payment:</strong> All designs remain CGY's exclusive intellectual property until full payment is confirmed. The Client has NO right to use, publish, or distribute any design — including drafts — until the final invoice is paid in full.</p>
  <p><strong>License Upon Full Payment:</strong> ${contract.licenseType} license is granted to the Client upon receipt of full payment, for the Client's brand/business use only.</p>
  ${!contract.sourceFilesIncluded ? `<p><strong>Source Files:</strong> Native/source files (.AI, .PSD, etc.) are NOT included in standard delivery${contract.sourceFilesFee ? `. They may be purchased separately at ${contract.currency} ${contract.sourceFilesFee}` : ""}.</p>` : ""}

  <!-- 9. PRODUCTION DISCLAIMER (merch only) -->
  ${contract.type === "merch" ? `
  <h2>9. Production & Printing Disclaimer</h2>
  <p>CGY provides design files only. CGY is NOT responsible for:</p>
  <ul>
    <li>Print quality, color variations, or results caused by third-party printers or manufacturers.</li>
    <li>Compatibility issues if the Client changes the print method after files are delivered.</li>
    <li>Sizing, fit, or construction of physical garments.</li>
    <li>Errors on printed/produced garments from Client's failure to proofread before production.</li>
  </ul>
  <div class="warn-box">⚠ It is the Client's responsibility to verify all file specifications with their manufacturer BEFORE sending to production. CGY strongly recommends a test print or sample before full production runs.</div>` : ""}

  <!-- TERMINATION -->
  <h2>${contract.type === "merch" ? "10" : "9"}. Termination</h2>
  <ul>
    <li>Either party may terminate with written notice (WhatsApp or email).</li>
    <li>Client pays for all work completed to date, plus the applicable kill fee (Section 6).</li>
    <li>Final files are released only after all outstanding payments are received.</li>
    <li>CGY may terminate immediately if the Client is abusive, non-communicative for 14+ days, or requests illegal/unethical content.</li>
  </ul>

  <!-- WARRANTIES & LIABILITY -->
  <h2>${contract.type === "merch" ? "11" : "10"}. Warranties & Limitation of Liability</h2>
  <ul>
    <li>CGY warrants all designs will be original and not knowingly infringe third-party rights.</li>
    <li>CGY makes NO guarantee of specific business outcomes from any design.</li>
    <li>Client warrants all provided content does not infringe third-party rights — Client bears full legal responsibility for their own materials.</li>
    <li>CGY's maximum liability under this Agreement shall not exceed the total fees paid for this project.</li>
  </ul>

  <!-- DISPUTE RESOLUTION -->
  <h2>${contract.type === "merch" ? "12" : "11"}. Dispute Resolution & Governing Law</h2>
  <p>In the event of a dispute, both parties agree to attempt resolution through direct good-faith communication first. If unresolved within 14 days, the matter may be escalated to mediation. This Agreement is governed by the laws of <strong>Ghana</strong>.</p>

  <!-- GENERAL PROVISIONS -->
  <h2>${contract.type === "merch" ? "13" : "12"}. General Provisions</h2>
  <ul>
    <li>This Agreement is the complete understanding between both parties, replacing all prior verbal or written discussions.</li>
    <li>All changes to scope, price, or timeline must be agreed in writing by both parties.</li>
    <li>CGY operates as an independent creative studio — not an employee of the Client.</li>
    <li>If any clause is found unenforceable, all other clauses remain in full effect.</li>
  </ul>

  <!-- SIGNATURES -->
  <h2>Signatures & Agreement</h2>
  <p>By signing below, both parties confirm they have fully read, understood, and agreed to all terms of this Agreement.</p>
  <div class="sig-grid">
    <div class="sig-party">
      <div class="sig-party-label">Designer — Curio Graphics Yard</div>
      <div style="height:52px;margin-bottom:5px;display:flex;align-items:flex-end;">
        ${base64Sign
          ? `<img src="${base64Sign}" alt="Signature" style="height:65px;width:auto;object-fit:contain;" />`
          : `<span style="font-family:'Meow Script',cursive;font-size:26pt;color:#CC2222;line-height:1;">davidAmo</span>`
        }
      </div>
      <div class="sig-field-label">Signature</div>
      <div style="height:36px;margin-bottom:5px;display:flex;align-items:center;">
        <span style="font-size:11pt;font-weight:600;color:#111;">David Amo</span>
      </div>
      <div class="sig-field-label">Printed Name</div>
      <div style="height:36px;margin-bottom:5px;display:flex;align-items:center;">
        <span style="font-size:11pt;color:#111;">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
      </div>
      <div class="sig-field-label">Date</div>
    </div>
    <div class="sig-party">
      <div class="sig-party-label">Client</div>
      <div class="sig-line"></div><div class="sig-field-label">Signature</div>
      <div class="sig-line"></div><div class="sig-field-label">Printed Name</div>
      <div class="sig-line"></div><div class="sig-field-label">Date</div>
    </div>
  </div>

  <div class="footer">
    Curio Graphics Yard — A Creative Design Studio Amplifying Fashion and Music through Inspired Design.<br>
    Contract #${contract.contractNumber} • Both parties retain a signed copy for their records.
  </div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body></html>`);
  win.document.close();
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function CGYContractManager() {
  const [currentView, setCurrentView] = useState("create");
  const [contracts, setContracts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cgy_contracts") || "[]"); } catch { return []; }
  });
  const [counter, setCounter] = useState(() => {
    try { return parseInt(localStorage.getItem("cgy_contract_counter") || "1"); } catch { return 1; }
  });
  const [editing, setEditing] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "info" });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const showNotification = useCallback((message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "info" }), 4000);
  }, []);

  const saveToStorage = (list, cnt) => {
    localStorage.setItem("cgy_contracts", JSON.stringify(list));
    localStorage.setItem("cgy_contract_counter", String(cnt));
  };

  const startNew = (type) => {
    setEditing(blankContract(counter, type));
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveContract = () => {
    if (!editing.clientName.trim()) return showNotification("Client name is required.", "error");
    if (!editing.projectTitle.trim()) return showNotification("Project title is required.", "error");
    if (!editing.agreedAmount) return showNotification("Agreed amount is required.", "error");

    const updated = { ...editing, savedDate: new Date().toISOString() };
    let newList, newCounter = counter;
    const existing = contracts.find(c => c.id === updated.id);
    if (existing) {
      newList = contracts.map(c => c.id === updated.id ? updated : c);
      showNotification("Contract updated successfully!", "success");
    } else {
      newList = [...contracts, updated];
      newCounter = counter + 1;
      setCounter(newCounter);
      showNotification("Contract saved successfully!", "success");
    }
    setContracts(newList);
    saveToStorage(newList, newCounter);
    setEditing(null);
  };

  const deleteContract = (id) => {
    if (!window.confirm("Delete this contract? This cannot be undone.")) return;
    const newList = contracts.filter(c => c.id !== id);
    setContracts(newList);
    saveToStorage(newList, counter);
    showNotification("Contract deleted.", "success");
  };

  const duplicateContract = (contract) => {
    const copy = {
      ...contract,
      id: uid(),
      contractNumber: `CGY-${new Date().getFullYear()}-${pad(counter)}`,
      status: "DRAFT",
      savedDate: "",
      contractDate: today(),
    };
    const newList = [...contracts, copy];
    const newCounter = counter + 1;
    setContracts(newList);
    setCounter(newCounter);
    saveToStorage(newList, newCounter);
    showNotification("Contract duplicated!", "success");
  };

  const set = (key) => (e) => setEditing(prev => ({ ...prev, [key]: e.target.value }));
  const toggle = (key) => () => setEditing(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleService = (label) => {
    setEditing(prev => {
      const has = prev.servicesSelected.includes(label);
      return { ...prev, servicesSelected: has ? prev.servicesSelected.filter(s => s !== label) : [...prev.servicesSelected, label] };
    });
  };

  /* ── Stats ── */
  const getStats = () => {
    const total = contracts.length;
    const graphic = contracts.filter(c => c.type === "graphic").length;
    const merch = contracts.filter(c => c.type === "merch").length;
    const signed = contracts.filter(c => ["SIGNED", "ACTIVE", "COMPLETED"].includes(c.status)).length;
    const draft = contracts.filter(c => c.status === "DRAFT").length;
    const totalValue = contracts.reduce((s, c) => s + (parseFloat(c.agreedAmount) || 0), 0);
    const now = new Date();
    const thisMonth = contracts.filter(c => {
      const d = new Date(c.contractDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return { total, graphic, merch, signed, draft, totalValue, thisMonth: thisMonth.length, thisMonthValue: thisMonth.reduce((s, c) => s + (parseFloat(c.agreedAmount) || 0), 0) };
  };
  const stats = getStats();

  /* ── Filtered list ── */
  const filteredContracts = contracts.slice().reverse().filter(c => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (c.contractNumber || "").toLowerCase().includes(q) ||
      (c.clientName || "").toLowerCase().includes(q) ||
      (c.projectTitle || "").toLowerCase().includes(q);
  });

  /* ── SHARED INPUT CLASSES ── */
  const inputCls = "w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition";
  const labelCls = "block text-sm font-medium mb-2 text-gray-700";

  /* ─────────────── EDITOR ─────────────── */
  if (editing) {
    const typeInfo = CONTRACT_TYPES[editing.type];
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-4">
        {/* Notification */}
        {notification.show && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4" style={{ animation: "slide-down 0.3s ease-out" }}>
            <div className={`rounded-lg shadow-lg p-4 flex items-start gap-3 ${notification.type === "success" ? "bg-green-50 border border-green-200" : notification.type === "error" ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}`}>
              {notification.type === "success" && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
              {notification.type === "error" && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
              {notification.type === "info" && <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
              <p className={`flex-1 text-sm ${notification.type === "success" ? "text-green-800" : notification.type === "error" ? "text-red-800" : "text-blue-800"}`}>{notification.message}</p>
              <button onClick={() => setNotification({ show: false, message: "", type: "info" })} className="flex-shrink-0 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
          {/* Header */}
          <div className="no-print mb-4 bg-white p-4 md:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {contracts.find(c => c.id === editing.id) ? "Edit Contract" : "New Contract"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-500">{editing.contractNumber}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full`} style={{ background: typeInfo.color + "18", color: typeInfo.color }}>
                    {typeInfo.label}
                  </span>
                </div>
              </div>
              <button onClick={cancelEdit} className="bg-gray-500 text-white px-4 py-2.5 rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2 font-medium transition">
                <X size={18} /> Cancel
              </button>
            </div>

            {/* ── Section: Contract Details ── */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-lg text-gray-900 border-b border-gray-100 pb-2">Contract Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Contract Number</label>
                  <input type="text" value={editing.contractNumber} onChange={set("contractNumber")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Contract Date</label>
                  <input type="date" value={editing.contractDate} onChange={set("contractDate")} className={inputCls} style={{ maxWidth: "100%" }} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={editing.status} onChange={set("status")} className={inputCls}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input type="date" value={editing.startDate} onChange={set("startDate")} className={inputCls} style={{ maxWidth: "100%" }} />
                </div>
                <div>
                  <label className={labelCls}>Estimated End Date</label>
                  <input type="date" value={editing.endDate} onChange={set("endDate")} className={inputCls} style={{ maxWidth: "100%" }} />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select value={editing.currency} onChange={set("currency")} className={inputCls}>
                    <option value="GHS">GHS — Ghanaian Cedis</option>
                    <option value="USD">USD — US Dollars</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section: Client Info ── */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-lg text-gray-900 border-b border-gray-100 pb-2">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Client Name *</label>
                  <input type="text" placeholder="Full name" value={editing.clientName} onChange={set("clientName")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Company / Brand</label>
                  <input type="text" placeholder="Business name" value={editing.clientCompany} onChange={set("clientCompany")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Client Email</label>
                  <input type="email" placeholder="client@email.com" value={editing.clientEmail} onChange={set("clientEmail")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Client Phone</label>
                  <input type="tel" placeholder="+233 ..." value={editing.clientPhone} onChange={set("clientPhone")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Client Address</label>
                  <input type="text" placeholder="Address, City, Country" value={editing.clientAddress} onChange={set("clientAddress")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Project Title *</label>
                  <input type="text" placeholder="e.g., Logo Design for XYZ Brand" value={editing.projectTitle} onChange={set("projectTitle")} className={inputCls} />
                </div>
              </div>
            </div>

            {/* ── Section: Services ── */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg text-gray-900">Services</h3>
                <span className="text-sm text-gray-400">Select all that apply</span>
              </div>
              <div className="space-y-2 mb-4">
                {typeInfo.services.map(s => {
                  const selected = editing.servicesSelected.includes(s.label);
                  return (
                    <div key={s.label} onClick={() => toggleService(s.label)}
                      className={`flex items-center justify-between p-3 md:p-4 rounded-lg border-2 cursor-pointer transition ${selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition ${selected ? "bg-blue-500 border-blue-500" : "border-2 border-gray-300 bg-white"}`}>
                          {selected && <Check size={12} className="text-white" />}
                        </div>
                        <span className={`text-sm ${selected ? "font-semibold text-gray-900" : "text-gray-600"}`}>{s.label}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">GHS {s.ghsMin.toLocaleString()}–{s.ghsMax.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div>
                <label className={labelCls}>Custom / Additional Services</label>
                <textarea value={editing.customServices} onChange={set("customServices")} placeholder="Any additional services..." rows={2} className={`${inputCls} resize-y`} />
              </div>
            </div>

            {/* ── Section: Pricing ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <label className={labelCls}>Agreed Amount *</label>
                <input type="number" placeholder="0.00" value={editing.agreedAmount} onChange={set("agreedAmount")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Deposit %</label>
                <input type="number" placeholder="50" value={editing.depositPercent} onChange={set("depositPercent")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Rush Fee %</label>
                <input type="number" placeholder="20" value={editing.rushFeePercent} onChange={set("rushFeePercent")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Revisions Included</label>
                <input type="number" placeholder="2" value={editing.revisionsIncluded} onChange={set("revisionsIncluded")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Additional Revision Rate</label>
                <input type="number" placeholder="150" value={editing.revisionRate} onChange={set("revisionRate")} className={inputCls} />
              </div>
            </div>

            {/* ── Section: Deliverables ── */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-lg text-gray-900 border-b border-gray-100 pb-2">Deliverables & Requirements</h3>
              <div>
                <label className={labelCls}>Specific Deliverables (one per line)</label>
                <textarea value={editing.deliverables} onChange={set("deliverables")} placeholder={"e.g., 3 initial logo concepts\nFinal logo: PNG, SVG, PDF\nBrand color palette"} rows={4} className={`${inputCls} resize-y`} />
              </div>
              <div>
                <label className={labelCls}>Special Requirements</label>
                <textarea value={editing.specialRequirements} onChange={set("specialRequirements")} placeholder="Print method, color specs, garment types, dimensions, etc." rows={3} className={`${inputCls} resize-y`} />
              </div>
            </div>

            {/* ── Section: Payment Info ── */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-lg text-gray-900 border-b border-gray-100 pb-2">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Account Number</label>
                  <input type="text" value={editing.paymentAccount} onChange={set("paymentAccount")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Institution</label>
                  <input type="text" value={editing.paymentInstitution} onChange={set("paymentInstitution")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Beneficiary</label>
                  <input type="text" value={editing.paymentBeneficiary} onChange={set("paymentBeneficiary")} className={inputCls} />
                </div>
              </div>
            </div>

            {/* ── Section: IP ── */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg text-gray-900 border-b border-gray-100 pb-2 mb-4">Intellectual Property</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>License Type</label>
                  <select value={editing.licenseType} onChange={set("licenseType")} className={inputCls}>
                    <option>Non-exclusive commercial</option>
                    <option>Exclusive commercial</option>
                    <option>Full assignment of rights</option>
                    <option>Limited usage license</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Source Files Fee (if sold separately)</label>
                  <input type="number" placeholder="0.00" value={editing.sourceFilesFee} onChange={set("sourceFilesFee")} className={inputCls} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  ["portfolioRights", "CGY Portfolio Rights", "CGY may display this work publicly"],
                  ["sourceFilesIncluded", "Source Files Included", "Native files (.AI, .PSD) are included"],
                  ["exclusivity", "Exclusive License", "CGY won't use similar designs for others"],
                ].map(([key, label, desc]) => (
                  <div key={key} onClick={toggle(key)}
                    className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition ${editing[key] ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition ${editing[key] ? "bg-blue-500" : "border-2 border-gray-300 bg-white"}`}>
                        {editing[key] && <Check size={12} className="text-white" />}
                      </div>
                      <span className={`text-sm font-semibold ${editing[key] ? "text-gray-900" : "text-gray-600"}`}>{label}</span>
                    </div>
                    <p className="text-xs text-gray-400 ml-8">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={saveContract} className="flex-1 bg-blue-500 text-white py-3.5 rounded-lg hover:bg-blue-600 text-base font-medium transition shadow-sm">
                {contracts.find(c => c.id === editing.id) ? "Update Contract" : "Save Contract"}
              </button>
              <button onClick={() => generateContractPDF(editing)} className="flex-1 bg-green-500 text-white py-3.5 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 text-base font-medium transition shadow-sm">
                <Download size={20} /> Export to PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────── DASHBOARD ─────────────── */
  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-4">
      <style>{`
        @keyframes slide-down { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        @media (max-width: 768px) {
          input, select, button, textarea { font-size: 16px !important; }
          input[type="date"] { width: 100% !important; max-width: 100% !important; -webkit-appearance: none !important; appearance: none !important; background-color: white !important; border: 2px solid #d1d5db !important; border-radius: 0.5rem !important; padding: 0.75rem 1rem !important; color: #111827 !important; font-size: 16px !important; }
          select { -webkit-appearance: none !important; appearance: none !important; background-color: white !important; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 12px 12px; padding-right: 2.5rem !important; }
        }
      `}</style>

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-down">
          <div className={`rounded-lg shadow-lg p-4 flex items-start gap-3 ${notification.type === "success" ? "bg-green-50 border border-green-200" : notification.type === "error" ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}`}>
            {notification.type === "success" && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
            {notification.type === "error" && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            {notification.type === "info" && <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
            <p className={`flex-1 text-sm ${notification.type === "success" ? "text-green-800" : notification.type === "error" ? "text-red-800" : "text-blue-800"}`}>{notification.message}</p>
            <button onClick={() => setNotification({ show: false, message: "", type: "info" })} className="flex-shrink-0 text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        {/* Desktop Nav — same style as Invoice */}
        <div className="no-print hidden md:flex mb-6 gap-4">
          <button
            onClick={() => setCurrentView("create")}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${currentView === "create" ? "bg-blue-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            <FileText size={20} /> Create Contract
          </button>
          <button
            onClick={() => setCurrentView("stats")}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${currentView === "stats" ? "bg-blue-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            <BarChart3 size={20} /> Statistics
          </button>
        </div>

        {/* Mobile Bottom Nav */}
        <div className="no-print fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-40">
          <div className="flex justify-around items-center h-16">
            <button onClick={() => setCurrentView("create")} className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition ${currentView === "create" ? "text-blue-500" : "text-gray-600"}`}>
              <FileText size={22} />
              <span className="text-xs font-medium">Create</span>
            </button>
            <button onClick={() => setCurrentView("stats")} className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition ${currentView === "stats" ? "text-blue-500" : "text-gray-600"}`}>
              <BarChart3 size={22} />
              <span className="text-xs font-medium">Stats</span>
            </button>
          </div>
        </div>

        {/* ─── STATS VIEW ─── */}
        {currentView === "stats" && (
          <div className="no-print bg-white p-4 md:p-6 rounded-lg shadow-sm mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 gap-3">
              <h2 className="text-xl md:text-2xl font-bold">Contract Statistics</h2>
            </div>

            {/* Main stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-gray-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Total Contracts</div>
                <div className="text-2xl md:text-3xl font-bold text-gray-700">{stats.total}</div>
              </div>
              <div className="bg-red-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Design Contracts</div>
                <div className="text-2xl md:text-3xl font-bold text-red-600">{stats.graphic}</div>
              </div>
              <div className="bg-amber-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Merch Contracts</div>
                <div className="text-2xl md:text-3xl font-bold text-amber-700">{stats.merch}</div>
              </div>
            </div>

            {/* Count stats */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-green-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Signed / Active</div>
                <div className="text-2xl md:text-3xl font-bold text-green-600">{stats.signed}</div>
              </div>
              <div className="bg-gray-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Drafts</div>
                <div className="text-2xl md:text-3xl font-bold text-gray-700">{stats.draft}</div>
              </div>
              <div className="bg-blue-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Total Value (GHS)</div>
                <div className="text-xl md:text-2xl font-bold text-blue-700">
                  {stats.totalValue.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-purple-50 p-4 md:p-6 rounded border border-purple-100">
                <div className="flex items-center gap-1 text-xs md:text-sm text-purple-600 mb-2">
                  <Calendar size={13} />
                  <span>This Month</span>
                </div>
                <div className="text-xl md:text-2xl font-bold text-purple-700">{stats.thisMonth} contracts</div>
                <div className="text-sm font-semibold text-purple-500 mt-1">GHS {stats.thisMonthValue.toFixed(2)}</div>
              </div>
            </div>

            {/* All Contracts table */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 md:mb-4 gap-3">
                <h3 className="text-lg md:text-xl font-bold">All Contracts</h3>
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Search by #, client or project" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none transition" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-gray-50 rounded-lg overflow-x-auto shadow-sm">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="text-left p-3 md:p-4 text-sm">Contract #</th>
                      <th className="text-left p-3 md:p-4 text-sm">Date</th>
                      <th className="text-left p-3 md:p-4 text-sm">Client</th>
                      <th className="text-left p-3 md:p-4 text-sm">Project</th>
                      <th className="text-right p-3 md:p-4 text-sm">Value</th>
                      <th className="text-center p-3 md:p-4 text-sm">Status</th>
                      <th className="text-center p-3 md:p-4 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map(c => (
                      <tr key={c.id} className="border-t border-gray-200">
                        <td className="p-3 md:p-4 text-sm">{c.contractNumber}</td>
                        <td className="p-3 md:p-4 text-sm">{fmtDate(c.contractDate)}</td>
                        <td className="p-3 md:p-4 text-sm">{c.clientName || "N/A"}</td>
                        <td className="p-3 md:p-4 text-sm max-w-[200px] truncate">{c.projectTitle || "—"}</td>
                        <td className="text-right p-3 md:p-4 text-sm">{c.currency} {c.agreedAmount ? parseFloat(c.agreedAmount).toLocaleString() : "—"}</td>
                        <td className="text-center p-3 md:p-4">
                          <span className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-semibold ${STATUS_STYLES[c.status] || STATUS_STYLES.DRAFT}`}>{c.status}</span>
                        </td>
                        <td className="text-center p-3 md:p-4">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => setEditing({ ...c })} className="bg-blue-500 text-white p-2.5 rounded-lg hover:bg-blue-600 transition shadow-sm" title="Edit"><Edit2 size={18} /></button>
                            <button onClick={() => generateContractPDF(c)} className="bg-green-500 text-white p-2.5 rounded-lg hover:bg-green-600 transition shadow-sm" title="Export PDF"><Download size={18} /></button>
                            <button onClick={() => duplicateContract(c)} className="bg-gray-100 text-gray-600 p-2.5 rounded-lg hover:bg-gray-200 transition shadow-sm border border-gray-200" title="Duplicate"><Copy size={18} /></button>
                            <button onClick={() => deleteContract(c.id)} className="bg-red-500 text-white p-2.5 rounded-lg hover:bg-red-600 transition shadow-sm" title="Delete"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredContracts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? "No contracts match your search." : "No contracts yet."}
                  </div>
                )}
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredContracts.map(c => (
                  <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{c.contractNumber}</div>
                        <div className="text-sm text-gray-600 mt-1">{c.clientName || "N/A"}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{c.projectTitle || "—"}</div>
                        <div className="text-xs text-gray-500 mt-1">{fmtDate(c.contractDate)}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_STYLES[c.status] || STATUS_STYLES.DRAFT}`}>{c.status}</span>
                    </div>
                    <div className="mb-3">
                      <div className="text-gray-600 text-xs">Contract Value</div>
                      <div className="font-semibold text-gray-900">{c.currency} {c.agreedAmount ? parseFloat(c.agreedAmount).toLocaleString() : "—"}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setEditing({ ...c })} className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition text-xs font-medium flex items-center gap-1"><Edit2 size={14} /> Edit</button>
                      <button onClick={() => generateContractPDF(c)} className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition text-xs font-medium flex items-center gap-1"><Download size={14} /> PDF</button>
                      <button onClick={() => duplicateContract(c)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-xs font-medium flex items-center gap-1 border border-gray-200"><Copy size={14} /> Copy</button>
                      <button onClick={() => deleteContract(c.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition text-xs font-medium flex items-center gap-1"><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                ))}
                {filteredContracts.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                    {searchQuery ? "No contracts match your search." : "No contracts yet. Create your first one!"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── CREATE VIEW ─── */}
        {currentView === "create" && (
          <div className="no-print bg-white p-4 md:p-6 rounded-lg shadow-sm mb-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">New Contract</h1>
                <p className="text-sm text-gray-500 mt-1">Choose a contract type to get started</p>
              </div>
            </div>

            {/* Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {Object.entries(CONTRACT_TYPES).map(([key, type]) => (
                <button key={key} onClick={() => startNew(key)}
                  className="group p-6 rounded-xl border-2 border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 transition text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: type.color + "18" }}>
                      {key === "graphic" ? <Briefcase size={22} style={{ color: type.color }} /> : <Scissors size={22} style={{ color: type.color }} />}
                    </div>
                    <span className="text-base font-bold text-gray-900 group-hover:text-blue-700 transition">{type.label}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {key === "graphic"
                      ? "Logo design, brand identity, flyers, social media, packaging and more."
                      : "Apparel graphics, clothing line concepts, tech packs, and campaign posters."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {type.services.slice(0, 3).map(s => (
                      <span key={s.label} className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{s.label}</span>
                    ))}
                    {type.services.length > 3 && <span className="text-xs text-gray-400">+{type.services.length - 3} more</span>}
                  </div>
                </button>
              ))}
            </div>

            {/* Existing contracts quick view */}
            {contracts.length > 0 && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                  <h3 className="text-lg font-bold text-gray-900">Recent Contracts</h3>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative w-full sm:w-56">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input type="text" placeholder="Search contracts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none transition" />
                      {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                      className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none transition bg-white">
                      <option value="all">All Statuses</option>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                      className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none transition bg-white">
                      <option value="all">All Types</option>
                      <option value="graphic">Graphic Design</option>
                      <option value="merch">Merch Design</option>
                    </select>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filteredContracts.map(c => (
                    <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-gray-900">{c.contractNumber}</div>
                          <div className="text-sm text-gray-600 mt-1">{c.clientName || "N/A"}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{c.projectTitle || "—"}</div>
                          <div className="text-xs text-gray-500 mt-1">{fmtDate(c.contractDate)}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_STYLES[c.status] || STATUS_STYLES.DRAFT}`}>{c.status}</span>
                      </div>
                      <div className="mb-3">
                        <div className="text-gray-600 text-xs">Contract Value</div>
                        <div className="font-semibold text-gray-900">{c.currency} {c.agreedAmount ? parseFloat(c.agreedAmount).toLocaleString() : "—"}</div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setEditing({ ...c })} className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition text-xs font-medium flex items-center gap-1"><Edit2 size={14} /> Edit</button>
                        <button onClick={() => generateContractPDF(c)} className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition text-xs font-medium flex items-center gap-1"><Download size={14} /> PDF</button>
                        <button onClick={() => duplicateContract(c)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-xs font-medium flex items-center gap-1 border border-gray-200"><Copy size={14} /> Copy</button>
                        <button onClick={() => deleteContract(c.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition text-xs font-medium flex items-center gap-1"><Trash2 size={14} /> Delete</button>
                      </div>
                    </div>
                  ))}
                  {filteredContracts.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                      No contracts match your filters.
                    </div>
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-gray-50 rounded-lg overflow-x-auto shadow-sm">
                  <table className="w-full min-w-full">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="text-left p-3 md:p-4 text-sm">Contract #</th>
                        <th className="text-left p-3 md:p-4 text-sm">Date</th>
                        <th className="text-left p-3 md:p-4 text-sm">Client</th>
                        <th className="text-left p-3 md:p-4 text-sm">Project</th>
                        <th className="text-right p-3 md:p-4 text-sm">Value</th>
                        <th className="text-center p-3 md:p-4 text-sm">Status</th>
                        <th className="text-center p-3 md:p-4 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContracts.map(c => (
                        <tr key={c.id} className="border-t border-gray-200">
                          <td className="p-3 md:p-4 text-sm">{c.contractNumber}</td>
                          <td className="p-3 md:p-4 text-sm">{fmtDate(c.contractDate)}</td>
                          <td className="p-3 md:p-4 text-sm">{c.clientName || "N/A"}</td>
                          <td className="p-3 md:p-4 text-sm max-w-[180px] truncate">{c.projectTitle || "—"}</td>
                          <td className="text-right p-3 md:p-4 text-sm">{c.currency} {c.agreedAmount ? parseFloat(c.agreedAmount).toLocaleString() : "—"}</td>
                          <td className="text-center p-3 md:p-4">
                            <span className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-semibold ${STATUS_STYLES[c.status] || STATUS_STYLES.DRAFT}`}>{c.status}</span>
                          </td>
                          <td className="text-center p-3 md:p-4">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => setEditing({ ...c })} className="bg-blue-500 text-white p-2.5 rounded-lg hover:bg-blue-600 transition shadow-sm" title="Edit"><Edit2 size={18} /></button>
                              <button onClick={() => generateContractPDF(c)} className="bg-green-500 text-white p-2.5 rounded-lg hover:bg-green-600 transition shadow-sm" title="Export PDF"><Download size={18} /></button>
                              <button onClick={() => duplicateContract(c)} className="bg-gray-100 text-gray-600 p-2.5 rounded-lg hover:bg-gray-200 transition shadow-sm border border-gray-200" title="Duplicate"><Copy size={18} /></button>
                              <button onClick={() => deleteContract(c.id)} className="bg-red-500 text-white p-2.5 rounded-lg hover:bg-red-600 transition shadow-sm" title="Delete"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredContracts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No contracts match your filters.</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}