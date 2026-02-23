import logo from './assets/cgy_logo_new.png';
import signUrl from './assets/sign.png';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Download, BarChart3, FileText, LogOut, Edit2, X, Receipt, DollarSign, CheckCircle, AlertCircle, Info, RefreshCw, Search, Calendar, FileSignature, Briefcase, Scissors, Check, Copy, ChevronUp } from 'lucide-react';
import { auth, signInWithGoogle, signInWithApple, logout, getUserInvoices, saveInvoice as saveInvoiceToFirestore, deleteInvoice as deleteInvoiceFromFirestore, getUserCounter, updateUserCounter, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, getDoc } from 'firebase/firestore';

// logoUrl alias for contract PDF generator (same asset as logo)
const logoUrl = logo;

/* ─────────────────────────────────────────────
   CONTRACT: Logo/Sign base64 converters
───────────────────────────────────────────── */
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

const CONTRACT_STATUSES = ["DRAFT", "SENT", "SIGNED", "ACTIVE", "COMPLETED", "CANCELLED"];

const CONTRACT_STATUS_STYLES = {
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
   CONTRACT HELPERS
───────────────────────────────────────────── */
const contractToday = () => new Date().toISOString().split("T")[0];
const contractUid   = () => `ctr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const contractPad   = (n) => String(n).padStart(3, "0");
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
};

const blankContract = (counter, type = "graphic") => ({
  id: contractUid(),
  contractNumber: `CGY-${new Date().getFullYear()}-${contractPad(counter)}`,
  type,
  status: "DRAFT",
  contractDate: contractToday(),
  startDate: contractToday(),
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
   CONTRACT PDF GENERATOR
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

  // Open the window BEFORE any awaits — mobile browsers (especially iOS Safari)
  // block window.open() if it isn't called synchronously within the user-gesture handler.
  const win = window.open("", "_blank");
  if (win) {
    win.document.write("<html><head><title>Loading…</title></head><body style='font-family:sans-serif;padding:40px;text-align:center'><p>Preparing contract…</p></body></html>");
  }

  const [base64Logo, base64Sign] = await Promise.all([getBase64Logo(), getBase64Sign()]);

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contract ${contract.contractNumber}</title>
  <style>
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
    @media print { body { padding: 0; } .page { padding: 36px 44px; } }
  </style>
</head>
<body>
<div class="page">
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
  <h2>1. Parties & Project Overview</h2>
  <div class="info-grid">
    <div class="info-cell"><div class="info-label">Designer / Studio</div><div class="info-val">Curio Graphics Yard (CGY)</div></div>
    <div class="info-cell"><div class="info-label">Designer Email</div><div class="info-val">${contract.designerEmail}</div></div>
    ${contract.designerPhone ? `<div class="info-cell"><div class="info-label">Designer Phone</div><div class="info-val">${contract.designerPhone}</div></div>` : ""}
    <div class="info-cell ${!contract.designerPhone ? 'full-cell' : ''}"><div class="info-label">Designer Address</div><div class="info-val">${contract.designerAddress}</div></div>
    <div class="info-cell"><div class="info-label">Client Name</div><div class="info-val">${contract.clientName || "—"}</div></div>
    <div class="info-cell"><div class="info-label">Client Company / Brand</div><div class="info-val">${contract.clientCompany || "—"}</div></div>
    <div class="info-cell"><div class="info-label">Client Email</div><div class="info-val">${contract.clientEmail || "—"}</div></div>
    <div class="info-cell"><div class="info-label">Client Phone</div><div class="info-val">${contract.clientPhone || "—"}</div></div>
    ${contract.clientAddress ? `<div class="info-cell full-cell"><div class="info-label">Client Address</div><div class="info-val">${contract.clientAddress}</div></div>` : ""}
    <div class="info-cell full-cell"><div class="info-label">Project Title</div><div class="info-val">${contract.projectTitle || "—"}</div></div>
    <div class="info-cell"><div class="info-label">Start Date</div><div class="info-val">${fmtDate(contract.startDate)}</div></div>
    <div class="info-cell"><div class="info-label">Estimated End Date</div><div class="info-val">${contract.endDate ? fmtDate(contract.endDate) : "TBD"}</div></div>
  </div>
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
  <h2>3. Scope of Work & Deliverables</h2>
  ${contract.deliverables ? `<p>${contract.deliverables.replace(/\n/g, "<br>")}</p>` : `<ul>
    <li>Deliverables as described in Section 2 services above</li>
    <li>Final files in agreed formats (PNG, JPG, SVG, PDF as applicable)</li>
    <li>Source/native files only if Section 9 indicates inclusion</li>
  </ul>`}
  <div class="warn-box">⚠ Any work not explicitly listed above is considered OUT OF SCOPE and will be quoted and billed separately via written Change Order.</div>
  ${contract.specialRequirements ? `<h3>Special Requirements</h3><p>${contract.specialRequirements}</p>` : ""}
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
  <h2>8. Intellectual Property & Ownership</h2>
  <div class="badge-row">
    <span class="badge ${contract.portfolioRights ? 'badge-yes' : 'badge-no'}">${contract.portfolioRights ? '✓' : '✗'} CGY Portfolio Rights</span>
    <span class="badge ${contract.sourceFilesIncluded ? 'badge-yes' : 'badge-no'}">${contract.sourceFilesIncluded ? '✓' : '✗'} Source Files Included</span>
    <span class="badge ${contract.exclusivity ? 'badge-yes' : 'badge-no'}">${contract.exclusivity ? '✓' : '✗'} Exclusive License</span>
  </div>
  <p><strong>Ownership Before Full Payment:</strong> All designs remain CGY's exclusive intellectual property until full payment is confirmed. The Client has NO right to use, publish, or distribute any design — including drafts — until the final invoice is paid in full.</p>
  <p><strong>License Upon Full Payment:</strong> ${contract.licenseType} license is granted to the Client upon receipt of full payment, for the Client's brand/business use only.</p>
  ${!contract.sourceFilesIncluded ? `<p><strong>Source Files:</strong> Native/source files (.AI, .PSD, etc.) are NOT included in standard delivery${contract.sourceFilesFee ? `. They may be purchased separately at ${contract.currency} ${contract.sourceFilesFee}` : ""}.</p>` : ""}
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
  <h2>${contract.type === 'merch' ? '10' : '9'}. Termination</h2>
  <ul>
    <li>Either party may terminate with written notice (WhatsApp or email).</li>
    <li>Client pays for all work completed to date, plus the applicable kill fee (Section 6).</li>
    <li>Final files are released only after all outstanding payments are received.</li>
    <li>CGY may terminate immediately if the Client is abusive, non-communicative for 14+ days, or requests illegal/unethical content.</li>
  </ul>
  <h2>${contract.type === 'merch' ? '11' : '10'}. Warranties & Limitation of Liability</h2>
  <ul>
    <li>CGY warrants all designs will be original and not knowingly infringe third-party rights.</li>
    <li>CGY makes NO guarantee of specific business outcomes from any design.</li>
    <li>Client warrants all provided content does not infringe third-party rights — Client bears full legal responsibility for their own materials.</li>
    <li>CGY's maximum liability under this Agreement shall not exceed the total fees paid for this project.</li>
  </ul>
  <h2>${contract.type === 'merch' ? '12' : '11'}. Dispute Resolution & Governing Law</h2>
  <p>In the event of a dispute, both parties agree to attempt resolution through direct good-faith communication first. If unresolved within 14 days, the matter may be escalated to mediation. This Agreement is governed by the laws of <strong>Ghana</strong>.</p>
  <h2>${contract.type === 'merch' ? '13' : '12'}. General Provisions</h2>
  <ul>
    <li>This Agreement is the complete understanding between both parties, replacing all prior verbal or written discussions.</li>
    <li>All changes to scope, price, or timeline must be agreed in writing by both parties.</li>
    <li>CGY operates as an independent creative studio — not an employee of the Client.</li>
    <li>If any clause is found unenforceable, all other clauses remain in full effect.</li>
  </ul>
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
</body></html>`;

  if (win && !win.closed) {
    win.document.open();
    win.document.write(htmlContent);
    win.document.close();
  } else {
    // Popup was blocked entirely — fall back to a blob link
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
};

/* ─────────────────────────────────────────────
   CGY CONTRACT MANAGER COMPONENT
───────────────────────────────────────────── */
function CGYContractManager({ userId = "" }) {
  const [currentView, setCurrentView] = useState("create");
  const [contracts, setContracts] = useState([]);
  const [counter, setCounter] = useState(1);
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [editing, setEditing] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "info" });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const refreshIntervalRef = useRef(null);
  const userIdRef = useRef(userId);

  useEffect(() => { userIdRef.current = userId; }, [userId]);

  const showNotification = useCallback((message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "info" }), 4000);
  }, []);

  const loadContracts = useCallback(async (uid) => {
    if (!uid) return;
    setIsLoadingContracts(true);
    try {
      const q = query(collection(db, "contracts"), where("userId", "==", uid));
      const snap = await getDocs(q);
      const loaded = snap.docs.map(d => d.data());
      setContracts(loaded);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Error loading contracts:", err);
    } finally {
      setIsLoadingContracts(false);
    }
  }, []);

  const refreshContracts = useCallback(async (uid, showLoadingState = false) => {
    if (!uid) return;
    if (showLoadingState) setIsRefreshing(true);
    try {
      const q = query(collection(db, "contracts"), where("userId", "==", uid));
      const snap = await getDocs(q);
      const loaded = snap.docs.map(d => d.data());
      setContracts(loaded);
      setLastRefreshed(new Date());
      if (showLoadingState) showNotification("Stats updated", "success");
    } catch (err) {
      console.error("Error refreshing contracts:", err);
    } finally {
      if (showLoadingState) setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh every 30s when on stats view
  useEffect(() => {
    if (currentView === "stats" && userIdRef.current) {
      refreshContracts(userIdRef.current, false);
      refreshIntervalRef.current = setInterval(() => {
        refreshContracts(userIdRef.current, false);
      }, 30000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [currentView, refreshContracts]);

  const saveContractToFirestore = async (contractData) => {
    await setDoc(doc(db, "contracts", contractData.id), contractData);
  };

  const deleteContractFromFirestore = async (id) => {
    await deleteDoc(doc(db, "contracts", id));
  };

  const loadCounter = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const ref = doc(db, "contractCounters", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setCounter(snap.data().value || 1);
    } catch (err) { console.error("Error loading counter:", err); }
  }, []);

  const saveCounter = async (uid, value) => {
    if (!uid) return;
    try {
      await setDoc(doc(db, "contractCounters", uid), { value });
    } catch (err) { console.error("Error saving counter:", err); }
  };

  useEffect(() => {
    if (userId) {
      loadContracts(userId);
      loadCounter(userId);
    }
  }, [userId, loadContracts, loadCounter]);

  const startNew = (type) => { setEditing(blankContract(counter, type)); };
  const cancelEdit = () => { setEditing(null); };

  const saveContract = async () => {
    if (!editing.clientName.trim()) return showNotification("Client name is required.", "error");
    if (!editing.projectTitle.trim()) return showNotification("Project title is required.", "error");
    if (!editing.agreedAmount) return showNotification("Agreed amount is required.", "error");
    const updated = { ...editing, savedDate: new Date().toISOString(), userId };
    const existing = contracts.find(c => c.id === updated.id);
    try {
      await saveContractToFirestore(updated);
      if (existing) {
        setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
        showNotification("Contract updated successfully!", "success");
      } else {
        setContracts(prev => [...prev, updated]);
        const newCounter = counter + 1;
        setCounter(newCounter);
        await saveCounter(userId, newCounter);
        showNotification("Contract saved successfully!", "success");
      }
      setEditing(null);
    } catch (err) {
      console.error("Error saving contract:", err);
      showNotification("Error saving contract. Please try again.", "error");
    }
  };

  const deleteContract = async (id) => {
    if (!window.confirm("Delete this contract? This cannot be undone.")) return;
    try {
      await deleteContractFromFirestore(id);
      setContracts(prev => prev.filter(c => c.id !== id));
      showNotification("Contract deleted.", "success");
    } catch (err) {
      showNotification("Error deleting contract. Please try again.", "error");
    }
  };

  const duplicateContract = async (contract) => {
    const copy = {
      ...contract,
      id: contractUid(),
      contractNumber: `CGY-${new Date().getFullYear()}-${contractPad(counter)}`,
      status: "DRAFT",
      savedDate: "",
      contractDate: contractToday(),
      userId,
    };
    try {
      await saveContractToFirestore(copy);
      setContracts(prev => [...prev, copy]);
      const newCounter = counter + 1;
      setCounter(newCounter);
      await saveCounter(userId, newCounter);
      showNotification("Contract duplicated!", "success");
    } catch (err) {
      showNotification("Error duplicating contract. Please try again.", "error");
    }
  };

  const set = (key) => (e) => setEditing(prev => ({ ...prev, [key]: e.target.value }));
  const toggle = (key) => () => setEditing(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleService = (label) => {
    setEditing(prev => {
      const has = prev.servicesSelected.includes(label);
      return { ...prev, servicesSelected: has ? prev.servicesSelected.filter(s => s !== label) : [...prev.servicesSelected, label] };
    });
  };

  const getContractStats = () => {
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
  const stats = getContractStats();

  const filteredContracts = contracts.slice().reverse().filter(c => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (c.contractNumber || "").toLowerCase().includes(q) ||
      (c.clientName || "").toLowerCase().includes(q) ||
      (c.projectTitle || "").toLowerCase().includes(q);
  });

  const inputCls = "w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition";
  const labelCls = "block text-sm font-medium mb-2 text-gray-700";

  const contractStyles = `
    @keyframes slide-down { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
    .animate-slide-down { animation: slide-down 0.3s ease-out; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
    @media (max-width: 768px) {
      input, select, button, textarea { font-size: 16px !important; }
      input[type="date"], input[type="datetime-local"], input[type="time"] { width: 100% !important; max-width: 100% !important; -webkit-appearance: none !important; -moz-appearance: textfield !important; appearance: none !important; background-color: white !important; border: 2px solid #d1d5db !important; border-radius: 0.5rem !important; padding: 0.75rem 1rem !important; color: #111827 !important; font-size: 16px !important; }
      input[type="date"]::-webkit-calendar-picker-indicator, input[type="datetime-local"]::-webkit-calendar-picker-indicator { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='16' y1='2' x2='16' y2='6'%3E%3C/line%3E%3Cline x1='8' y1='2' x2='8' y2='6'%3E%3C/line%3E%3Cline x1='3' y1='10' x2='21' y2='10'%3E%3C/line%3E%3C/svg%3E"); background-size: 16px 16px; background-repeat: no-repeat; background-position: right 0.75rem center; cursor: pointer; width: 20px; height: 20px; padding: 0; margin: 0; opacity: 1; }
      select { -webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important; background-color: white !important; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 12px 12px; padding-right: 2.5rem !important; color: #111827 !important; }
      select::-ms-expand { display: none; }
    }
  `;

  /* ─────────────── EDITOR ─────────────── */
  if (editing) {
    const typeInfo = CONTRACT_TYPES[editing.type];
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-4">
        <style>{contractStyles}</style>
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
          <div className="no-print mb-4 bg-white p-4 md:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {contracts.find(c => c.id === editing.id) ? "Edit Contract" : "New Contract"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-500">{editing.contractNumber}</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: typeInfo.color + "18", color: typeInfo.color }}>
                    {typeInfo.label}
                  </span>
                </div>
              </div>
              <button onClick={cancelEdit} className="bg-gray-500 text-white px-4 py-2.5 rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2 font-medium transition">
                <X size={18} /> Cancel
              </button>
            </div>

            {/* Contract Details */}
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
                    {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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

            {/* Client Info */}
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

            {/* Services */}
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

            {/* Pricing */}
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

            {/* Deliverables */}
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

            {/* Payment Info */}
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

            {/* IP */}
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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={saveContract} className="flex-1 bg-blue-500 text-white py-3.5 rounded-lg hover:bg-blue-600 text-base font-medium transition shadow-sm">
                {contracts.find(c => c.id === editing.id) ? "Update Contract" : "Save Contract"}
              </button>
              <button onClick={() => generateContractPDF(editing)} className="flex-1 bg-green-500 text-white py-3.5 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 text-base font-medium transition shadow-sm">
                <Download size={20} /> Export to PDF
              </button>
            </div>
          </div>

          {/* ── Contract Preview ── */}
          <div className="print-area bg-white p-6 md:p-12 rounded-lg shadow-sm text-xs md:text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-6" style={{ borderBottom: `4px solid ${typeInfo.color}` }}>
              <img src={logoUrl} alt="CGY" style={{ height: 48, width: "auto", objectFit: "contain" }} />
              <div className="text-right">
                <div className="font-bold text-xs uppercase tracking-widest" style={{ color: typeInfo.color }}>{typeInfo.label}</div>
                <div className="text-gray-500 text-xs mt-1">Contract #{editing.contractNumber}</div>
                <div className="text-gray-500 text-xs">Dated: {fmtDate(editing.contractDate)}</div>
              </div>
            </div>

            {/* Legal banner */}
            <div className="text-center text-xs text-white py-2 px-4 rounded mb-6 tracking-wide" style={{ background: "#111" }}>
              ⚖ This is a legally binding agreement. Both parties must read all terms before signing.
            </div>

            {/* 1. Parties */}
            <div className="mb-5">
              <h2 className="font-bold text-sm mb-3 pb-1" style={{ color: typeInfo.color, borderBottom: `1.5px solid ${typeInfo.color}44`, fontFamily: "'DM Serif Display', serif" }}>1. Parties & Project Overview</h2>
              <div className="grid grid-cols-2 border border-gray-200 rounded overflow-hidden text-xs">
                {[
                  ["Designer / Studio", "Curio Graphics Yard (CGY)"],
                  ["Designer Email", editing.designerEmail],
                  ...(editing.designerPhone ? [["Designer Phone", editing.designerPhone]] : []),
                  ["Designer Address", editing.designerAddress],
                  ["Client Name", editing.clientName || "—"],
                  ["Client Company / Brand", editing.clientCompany || "—"],
                  ["Client Email", editing.clientEmail || "—"],
                  ["Client Phone", editing.clientPhone || "—"],
                  ...(editing.clientAddress ? [["Client Address", editing.clientAddress]] : []),
                  ["Project Title", editing.projectTitle || "—"],
                  ["Start Date", fmtDate(editing.startDate)],
                  ["Estimated End Date", editing.endDate ? fmtDate(editing.endDate) : "TBD"],
                ].map(([label, value], i) => (
                  <div key={i} className="p-2 border-b border-r border-gray-100 last:border-b-0">
                    <div className="text-gray-400 uppercase tracking-wider font-bold" style={{ fontSize: "0.6rem" }}>{label}</div>
                    <div className="font-semibold text-gray-800 mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Services */}
            <div className="mb-5">
              <h2 className="font-bold text-sm mb-3 pb-1" style={{ color: typeInfo.color, borderBottom: `1.5px solid ${typeInfo.color}44`, fontFamily: "'DM Serif Display', serif" }}>2. Services & Agreed Rate</h2>
              {editing.servicesSelected.length > 0 ? (
                <table className="w-full text-xs border-collapse mb-3">
                  <thead>
                    <tr style={{ background: "#111", color: "#fff" }}>
                      <th className="text-left p-2">Service</th>
                      <th className="text-left p-2">Rate (GHS)</th>
                      <th className="text-left p-2">Rate (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeInfo.services.filter(s => editing.servicesSelected.includes(s.label)).map((s, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                        <td className="p-2 border-b border-gray-100">{s.label}</td>
                        <td className="p-2 border-b border-gray-100">GHS {s.ghsMin.toLocaleString()}–{s.ghsMax.toLocaleString()}</td>
                        <td className="p-2 border-b border-gray-100">USD {s.usdMin}–{s.usdMax}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-gray-400 italic text-xs mb-3">No services selected yet.</p>}
              {editing.customServices && <p className="text-xs text-gray-600 mb-3"><strong>Additional:</strong> {editing.customServices}</p>}
              <div className="grid grid-cols-2 border border-gray-200 rounded overflow-hidden text-xs">
                {[
                  ["Agreed Rate", `${editing.currency} ${editing.agreedAmount || "—"}`],
                  ["Currency", editing.currency],
                  ["Deposit", `${editing.depositPercent}%  →  ${editing.currency} ${editing.agreedAmount ? ((parseFloat(editing.agreedAmount) * editing.depositPercent) / 100).toFixed(2) : "—"}`],
                  ["Balance on Delivery", `${100 - editing.depositPercent}%  →  ${editing.currency} ${editing.agreedAmount ? ((parseFloat(editing.agreedAmount) * (100 - editing.depositPercent)) / 100).toFixed(2) : "—"}`],
                  ["Revisions Included", `${editing.revisionsIncluded} rounds`],
                  ["Extra Revision Rate", `${editing.currency} ${editing.revisionRate}`],
                ].map(([label, value], i) => (
                  <div key={i} className="p-2 border-b border-r border-gray-100">
                    <div className="text-gray-400 uppercase tracking-wider font-bold" style={{ fontSize: "0.6rem" }}>{label}</div>
                    <div className="font-semibold text-gray-800 mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Scope */}
            {editing.deliverables && (
              <div className="mb-5">
                <h2 className="font-bold text-sm mb-2 pb-1" style={{ color: typeInfo.color, borderBottom: `1.5px solid ${typeInfo.color}44`, fontFamily: "'DM Serif Display', serif" }}>3. Deliverables</h2>
                <p className="text-xs text-gray-700 whitespace-pre-line">{editing.deliverables}</p>
                {editing.specialRequirements && <p className="text-xs text-gray-600 mt-2"><strong>Special Requirements:</strong> {editing.specialRequirements}</p>}
              </div>
            )}

            {/* 4. Payment */}
            <div className="mb-5">
              <h2 className="font-bold text-sm mb-3 pb-1" style={{ color: typeInfo.color, borderBottom: `1.5px solid ${typeInfo.color}44`, fontFamily: "'DM Serif Display', serif" }}>4. Payment Information</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  ["Deposit Due at Signing", `${editing.currency} ${editing.agreedAmount ? ((parseFloat(editing.agreedAmount) * editing.depositPercent) / 100).toFixed(2) : "—"}`, `${editing.depositPercent}% — work begins after this is received`],
                  ["Balance Due at Delivery", `${editing.currency} ${editing.agreedAmount ? ((parseFloat(editing.agreedAmount) * (100 - editing.depositPercent)) / 100).toFixed(2) : "—"}`, `${100 - editing.depositPercent}% — paid before files are released`],
                ].map(([label, amount, note], i) => (
                  <div key={i} className="p-3 rounded text-xs" style={{ border: `1.5px solid ${typeInfo.color}` }}>
                    <div className="uppercase tracking-wider font-bold mb-1" style={{ color: typeInfo.color, fontSize: "0.6rem" }}>{label}</div>
                    <div className="text-lg font-bold text-gray-900">{amount}</div>
                    <div className="text-gray-500 mt-0.5">{note}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 border border-gray-200 rounded overflow-hidden text-xs">
                {[
                  ["Account", editing.paymentAccount],
                  ["Institution", editing.paymentInstitution],
                  ["Beneficiary", editing.paymentBeneficiary],
                ].map(([label, value], i) => (
                  <div key={i} className="p-2 border-r border-gray-100 last:border-r-0">
                    <div className="text-gray-400 uppercase tracking-wider font-bold" style={{ fontSize: "0.6rem" }}>{label}</div>
                    <div className="font-semibold text-gray-800 mt-0.5">{value || "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. IP */}
            <div className="mb-5">
              <h2 className="font-bold text-sm mb-3 pb-1" style={{ color: typeInfo.color, borderBottom: `1.5px solid ${typeInfo.color}44`, fontFamily: "'DM Serif Display', serif" }}>5. Intellectual Property</h2>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  [editing.portfolioRights, "CGY Portfolio Rights"],
                  [editing.sourceFilesIncluded, "Source Files Included"],
                  [editing.exclusivity, "Exclusive License"],
                ].map(([on, label], i) => (
                  <span key={i} className={`text-xs px-3 py-1 rounded-full font-semibold border ${on ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-600 border-red-200"}`}>
                    {on ? "✓" : "✗"} {label}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-600"><strong>License:</strong> {editing.licenseType}</p>
            </div>

            {/* Signatures */}
            <div className="mt-8 pt-4" style={{ borderTop: `2px solid ${typeInfo.color}` }}>
              <h2 className="font-bold text-sm mb-4" style={{ color: typeInfo.color, fontFamily: "'DM Serif Display', serif" }}>Signatures & Agreement</h2>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: typeInfo.color }}>Designer — Curio Graphics Yard</div>
                  <div className="border-b border-gray-400 h-10 mb-1 flex items-end">
                    <span className="text-gray-300 italic text-xs">pre-signed</span>
                  </div>
                  <div className="text-gray-400 text-xs mb-3">Signature</div>
                  <div className="border-b border-gray-400 h-8 mb-1"></div>
                  <div className="text-gray-400 text-xs mb-3">Printed Name</div>
                  <div className="border-b border-gray-400 h-8 mb-1"></div>
                  <div className="text-gray-400 text-xs">Date</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: typeInfo.color }}>Client</div>
                  <div className="border-b border-gray-400 h-10 mb-1"></div>
                  <div className="text-gray-400 text-xs mb-3">Signature</div>
                  <div className="border-b border-gray-400 h-8 mb-1"></div>
                  <div className="text-gray-400 text-xs mb-3">Printed Name</div>
                  <div className="border-b border-gray-400 h-8 mb-1"></div>
                  <div className="text-gray-400 text-xs">Date</div>
                </div>
              </div>
              <div className="text-center text-gray-400 text-xs mt-8 pt-4 border-t border-gray-100">
                Curio Graphics Yard — Contract #{editing.contractNumber} • Both parties retain a signed copy.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getLastRefreshedLabel = () => {
    if (!lastRefreshed) return '';
    const diffMs = Date.now() - lastRefreshed.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Updated just now';
    if (diffMins === 1) return 'Updated 1m ago';
    return `Updated ${diffMins}m ago`;
  };

  /* ─────────────── DASHBOARD ─────────────── */
  if (isLoadingContracts) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your contracts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-4">
      <style>{contractStyles}</style>

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
        {/* Desktop Nav */}
        <div className="no-print hidden md:flex mb-6 gap-4">
          <button onClick={() => setCurrentView("create")}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${currentView === "create" ? "bg-blue-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
            <FileText size={20} /> Create Contract
          </button>
          <button onClick={() => setCurrentView("stats")}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${currentView === "stats" ? "bg-blue-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
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
              <div>
                <h2 className="text-xl md:text-2xl font-bold">Contract Statistics</h2>
                {lastRefreshed && (
                  <p className="text-xs text-gray-400 mt-0.5">{getLastRefreshedLabel()}</p>
                )}
              </div>
              <button
                onClick={() => refreshContracts(userId, true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition shadow-sm disabled:opacity-60"
              >
                <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
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
                          <span className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-semibold ${CONTRACT_STATUS_STYLES[c.status] || CONTRACT_STATUS_STYLES.DRAFT}`}>{c.status}</span>
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
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${CONTRACT_STATUS_STYLES[c.status] || CONTRACT_STATUS_STYLES.DRAFT}`}>{c.status}</span>
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
                      {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${CONTRACT_STATUS_STYLES[c.status] || CONTRACT_STATUS_STYLES.DRAFT}`}>{c.status}</span>
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
                            <span className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-semibold ${CONTRACT_STATUS_STYLES[c.status] || CONTRACT_STATUS_STYLES.DRAFT}`}>{c.status}</span>
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

/* ─── Mode switcher: Invoice Generator ⟷ Contract Generator (shown in header after login) ─── */
function ModeSwitcher({ mode, onModeChange, fullWidth }) {
  return (
    <div style={{
      display: "flex",
      background: "#f3f4f6",
      borderRadius: 10,
      padding: 3,
      gap: 2,
      width: fullWidth ? "100%" : undefined,
    }}>
      {[
        { key: "invoice", icon: <FileText size={15} />, label: "Invoices" },
        { key: "contract", icon: <FileSignature size={15} />, label: "Contracts" },
      ].map(({ key, icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onModeChange(key)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 7,
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.18s ease",
            background: mode === key ? "#ffffff" : "transparent",
            color: mode === key ? "#111827" : "#6b7280",
            boxShadow: mode === key ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
            flex: fullWidth ? 1 : undefined,
          }}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

const InvoiceGenerator = ({ userId = '', onLogout }) => {
  const [currentView, setCurrentView] = useState('create');
  const [invoices, setInvoices] = useState([]);
  const [invoiceCounter, setInvoiceCounter] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Stats page state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const refreshIntervalRef = useRef(null);
  const userIdRef = useRef(userId);

  // Keep ref in sync when prop changes
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: 'INV-2025-001',
    invoiceDate: new Date().toISOString().split('T')[0],
    companyName: 'Curio Graphics Yard',
    companyAddress: 'Koforidua, E7-0979-957',
    companyCity: 'Ghana',
    companyEmail: 'curiographicsyard@gmail.com',
    clientName: '',
    clientAddress: '',
    clientCity: '',
    clientPO: '',
    clientVAT: '',
    orderNo: '',
    checkoutNo: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    services: [
      { desc: '', unitRate: 0, count: 1, amount: 0 }
    ],
    discount: 0,
    tax: 0,
    status: 'UNPAID',
    paymentMethod: '',
    paid: 0,
    paymentAccountNumber: '0200044821',
    paymentInstitution: 'Telecel',
    paymentBeneficiary: 'David Amo',
    paymentLink: ''
  });

  // Background refresh function
  const refreshInvoices = useCallback(async (uid, showLoadingState = false) => {
    if (!uid) return;
    if (showLoadingState) setIsRefreshing(true);
    try {
      const loadedInvoices = await getUserInvoices(uid);
      const normalizedInvoices = loadedInvoices.map(inv => ({
        ...inv,
        paymentHistory: inv.paymentHistory || []
      }));
      setInvoices(normalizedInvoices);
      setLastRefreshed(new Date());
      if (showLoadingState) showNotification('Stats updated', 'success');
    } catch (error) {
      console.error('Error refreshing invoices:', error);
    } finally {
      if (showLoadingState) setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh every 30s when on stats view
  useEffect(() => {
    if (currentView === 'stats' && userIdRef.current) {
      // Refresh immediately on tab switch
      refreshInvoices(userIdRef.current, false);

      // Set interval for background refresh
      refreshIntervalRef.current = setInterval(() => {
        refreshInvoices(userIdRef.current, false);
      }, 30000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [currentView, refreshInvoices]);

  // Load data when userId prop is provided
  useEffect(() => {
    if (userId) {
      loadUserData(userId);
    } else {
      setInvoices([]);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadUserData = async (uid) => {
    setIsLoading(true);
    try {
      const loadedInvoices = await getUserInvoices(uid);
      const normalizedInvoices = loadedInvoices.map(inv => ({
        ...inv,
        paymentHistory: inv.paymentHistory || []
      }));
      setInvoices(normalizedInvoices);
      setLastRefreshed(new Date());

      const loadedCounter = await getUserCounter(uid);
      setInvoiceCounter(loadedCounter);

      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: `INV-2025-${String(loadedCounter).padStart(3, '0')}`
      }));
    } catch (error) {
      console.error('Error loading user data:', error);
      setInvoices([]);
      setInvoiceCounter(1);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 4000);
  };

  // Auth is managed by App — no login/logout here

  // "X minutes ago" helper
  const getLastRefreshedLabel = () => {
    if (!lastRefreshed) return '';
    const diffMs = Date.now() - lastRefreshed.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Updated just now';
    if (diffMins === 1) return 'Updated 1m ago';
    return `Updated ${diffMins}m ago`;
  };

  // CSV export
  const exportToCSV = (invoiceList) => {
    const headers = ['Invoice #', 'Date', 'Client', 'Total (GHS)', 'Balance (GHS)', 'Status'];
    const rows = invoiceList.map(inv => [
      inv.invoiceNumber,
      formatDate(inv.invoiceDate),
      inv.clientName || 'N/A',
      Number(inv.total || 0).toFixed(2),
      Number(inv.balance || 0).toFixed(2),
      inv.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toISOString().split('T')[0];
    link.download = `invoices-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your invoices...</p>
        </div>
      </div>
    );
  }

  const calculateSubtotal = () => {
    return invoiceData.services.reduce((sum, service) => sum + (service.amount || 0), 0);
  };

  const calculateNetSales = () => {
    return calculateSubtotal() - invoiceData.discount;
  };

  const calculateTotal = () => {
    return calculateNetSales() + invoiceData.tax;
  };

  const calculateBalance = () => {
    return calculateTotal() - invoiceData.paid;
  };

  const addService = () => {
    setInvoiceData({
      ...invoiceData,
      services: [...invoiceData.services, { desc: '', unitRate: 0, count: 1, amount: 0 }]
    });
  };

  const removeService = (index) => {
    const newServices = invoiceData.services.filter((_, i) => i !== index);
    setInvoiceData({ ...invoiceData, services: newServices });
  };

  const updateService = (index, field, value) => {
    const newServices = [...invoiceData.services];
    newServices[index][field] = value;

    if (field === 'unitRate' || field === 'count') {
      newServices[index].amount = (newServices[index].unitRate || 0) * (newServices[index].count || 0);
    }

    setInvoiceData({ ...invoiceData, services: newServices });
  };

  const validateInvoice = () => {
    if (!invoiceData.clientName.trim()) {
      showNotification('Client name is required.', 'error');
      return false;
    }

    const hasValidService = invoiceData.services.some(service =>
      service.desc.trim() !== '' && service.amount > 0
    );

    if (!hasValidService) {
      showNotification('At least one service must have a description and amount.', 'error');
      return false;
    }

    const hasPaymentInfo =
      invoiceData.paymentMethod.trim() !== '' ||
      invoiceData.paymentAccountNumber.trim() !== '' ||
      invoiceData.paymentLink.trim() !== '';

    if (!hasPaymentInfo) {
      showNotification('Payment information is required.', 'error');
      return false;
    }

    if (calculateTotal() <= 0) {
      showNotification('Invoice total must be greater than zero.', 'error');
      return false;
    }

    return true;
  };

  const saveInvoice = async () => {
    if (!validateInvoice()) return;

    const cleanedServices = invoiceData.services.filter(
      service => service.desc.trim() !== '' && service.amount > 0
    );

    const finalStatus = invoiceData.status || 'UNPAID';

    const invoiceToSave = {
      id: editingInvoiceId || `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...invoiceData,
      services: cleanedServices,
      status: finalStatus,
      subtotal: calculateSubtotal(),
      netSales: calculateNetSales(),
      total: calculateTotal(),
      balance: calculateBalance(),
      savedDate: new Date().toISOString(),
      userId: userId,
      paymentHistory: invoiceData.paymentHistory || []
    };

    try {
      await saveInvoiceToFirestore(invoiceToSave);

      let updatedInvoices;

      if (editingInvoiceId) {
        updatedInvoices = invoices.map(inv =>
          inv.id === editingInvoiceId ? invoiceToSave : inv
        );
        setEditingInvoiceId(null);
        showNotification('Invoice updated successfully!', 'success');
      } else {
        updatedInvoices = [...invoices, invoiceToSave];

        const newCounter = invoiceCounter + 1;
        await updateUserCounter(userId, newCounter);
        setInvoiceCounter(newCounter);

        showNotification('Invoice saved successfully!', 'success');
      }

      setInvoices(updatedInvoices);
      resetForm();
    } catch (error) {
      console.error('Error saving invoice:', error);
      showNotification(`Error saving invoice: ${error.message || 'Please try again.'}`, 'error');
    }
  };

  const resetForm = () => {
    setInvoiceData({
      invoiceNumber: `INV-2025-${String(invoiceCounter + (editingInvoiceId ? 0 : 1)).padStart(3, '0')}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      companyName: 'Curio Graphics Yard',
      companyAddress: 'Koforidua, E7-0979-957',
      companyCity: 'Ghana',
      companyEmail: 'curiographicsyard@gmail.com',
      clientName: '',
      clientAddress: '',
      clientCity: '',
      clientPO: '',
      clientVAT: '',
      orderNo: '',
      checkoutNo: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      services: [{ desc: '', unitRate: 0, count: 1, amount: 0 }],
      discount: 0,
      tax: 0,
      status: 'UNPAID',
      paymentMethod: '',
      paid: 0,
      paymentAccountNumber: invoiceData.paymentAccountNumber,
      paymentInstitution: invoiceData.paymentInstitution,
      paymentBeneficiary: invoiceData.paymentBeneficiary,
      paymentLink: invoiceData.paymentLink,
      paymentHistory: []
    });
    setEditingInvoiceId(null);
  };

  const editInvoice = (invoice) => {
    setInvoiceData({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      companyName: invoice.companyName,
      companyAddress: invoice.companyAddress,
      companyCity: invoice.companyCity,
      companyEmail: invoice.companyEmail,
      clientName: invoice.clientName,
      clientAddress: invoice.clientAddress,
      clientCity: invoice.clientCity,
      clientPO: invoice.clientPO,
      clientVAT: invoice.clientVAT,
      orderNo: invoice.orderNo,
      checkoutNo: invoice.checkoutNo,
      purchaseDate: invoice.purchaseDate,
      services: invoice.services,
      discount: invoice.discount,
      tax: invoice.tax,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod,
      paid: invoice.paid,
      paymentAccountNumber: invoice.paymentAccountNumber,
      paymentInstitution: invoice.paymentInstitution,
      paymentBeneficiary: invoice.paymentBeneficiary,
      paymentLink: invoice.paymentLink,
      paymentHistory: invoice.paymentHistory || []
    });
    setEditingInvoiceId(invoice.id);
    setCurrentView('create');
  };

  const deleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteInvoiceFromFirestore(invoiceId);
      const updatedInvoices = invoices.filter(inv => inv.id !== invoiceId);
      setInvoices(updatedInvoices);
      showNotification('Invoice deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      showNotification('Error deleting invoice. Please try again.', 'error');
    }
  };

  const cancelEdit = () => {
    resetForm();
    setEditingInvoiceId(null);
  };

  const exportToPDF = () => {
    window.print();
  };

  const generateReceipt = (invoice, paymentEntry = null) => {
    const isPartialPayment = paymentEntry !== null;
    const receiptAmount = isPartialPayment ? paymentEntry.amount : invoice.total;
    const receiptDate = isPartialPayment ? paymentEntry.paymentDate : invoice.invoiceDate;
    const receiptNumber = isPartialPayment
      ? `${invoice.invoiceNumber}-RCP-${paymentEntry.id || Date.now()}`
      : invoice.invoiceNumber;

    let totalPaidSoFar;
    if (isPartialPayment) {
      totalPaidSoFar = invoice.paymentHistory
        ? invoice.paymentHistory.reduce((sum, p) => sum + p.amount, 0)
        : invoice.paid || 0;
    } else {
      if (invoice.status === 'PAID') {
        totalPaidSoFar = invoice.total;
      } else {
        totalPaidSoFar = invoice.paid || 0;
      }
    }

    const remainingBalance = Math.max(0, invoice.total - totalPaidSoFar);

    const receiptWindow = window.open('', '_blank');
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptNumber}</title>
        <link href="https://fonts.cdnfonts.com/css/ocr-a-extended" rel="stylesheet">
        <style>
          @import url('https://fonts.cdnfonts.com/css/ocr-a-extended');
          body { font-family: 'OCR A Extended', monospace; padding: 40px; max-width: 800px; margin: 0 auto; font-size: 14px; line-height: 1.6; }
          @media (max-width: 768px) { body { padding: 20px; font-size: 11px; } .receipt-title { font-size: 18px !important; } .payment-status { font-size: 14px !important; padding: 10px !important; } .items-table th, .items-table td { padding: 6px !important; font-size: 10px !important; } .total-row.grand-total { font-size: 14px !important; } }
          .receipt-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .receipt-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .company-info { margin-bottom: 30px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th, .items-table td { border: 1px solid #000; padding: 8px; text-align: left; }
          .items-table th { background-color: #f0f0f0; }
          .items-table td.number { text-align: right; }
          .totals { margin-top: 30px; border-top: 2px solid #000; padding-top: 20px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .total-row.grand-total { font-weight: bold; font-size: 18px; border-top: 2px double #000; padding-top: 10px; margin-top: 10px; }
          .payment-status { text-align: center; margin: 30px 0; padding: 15px; background-color: ${isPartialPayment ? '#fff3cd' : '#d4edda'}; border: 2px solid ${isPartialPayment ? '#ffc107' : '#28a745'}; font-weight: bold; font-size: 18px; }
          .payment-info { margin-top: 30px; border: 1px solid #000; padding: 15px; }
          .balance-info { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border: 1px solid #000; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #000; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <div class="receipt-title">RECEIPT</div>
          <div>Receipt #: ${receiptNumber}</div>
          <div>Date: ${formatDate(receiptDate)}</div>
          ${isPartialPayment ? `<div style="margin-top: 10px; font-size: 12px; color: #666;">For Invoice: ${invoice.invoiceNumber}</div>` : ''}
        </div>
        <div class="company-info">
          <div><strong>${invoice.companyName}</strong></div>
          <div>${invoice.companyAddress}</div>
          <div>${invoice.companyCity}</div>
          <div>${invoice.companyEmail}</div>
        </div>
        <div class="section">
          <div class="section-title">Customer Information</div>
          <div>${invoice.clientName || 'N/A'}</div>
          <div>${invoice.clientAddress || ''}</div>
          <div>${invoice.clientCity || ''}</div>
          ${invoice.clientPO ? `<div>P.O. No: ${invoice.clientPO}</div>` : ''}
          ${invoice.clientVAT ? `<div>VAT ID: ${invoice.clientVAT}</div>` : ''}
        </div>
        ${isPartialPayment ? `
          <div class="section">
            <div class="section-title">Invoice Summary</div>
            <div>Invoice #: ${invoice.invoiceNumber}</div>
            <div>Invoice Date: ${formatDate(invoice.invoiceDate)}</div>
            <div>Invoice Total: GHS ${invoice.total.toFixed(2)}</div>
          </div>
        ` : `
          <div class="section">
            <div class="section-title">Order Details</div>
            ${invoice.orderNo ? `<div>Order No: ${invoice.orderNo}</div>` : ''}
            ${invoice.checkoutNo ? `<div>Checkout No: ${invoice.checkoutNo}</div>` : ''}
            <div>Purchase Date: ${formatDate(invoice.purchaseDate)}</div>
          </div>
          <table class="items-table">
            <thead><tr><th>#</th><th>Description</th><th>Unit Rate (GHS)</th><th>Quantity</th><th>Amount (GHS)</th></tr></thead>
            <tbody>
              ${invoice.services.map((service, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${service.desc}</td>
                  <td class="number">${service.unitRate.toFixed(2)}</td>
                  <td class="number">${service.count}</td>
                  <td class="number">${service.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row"><span>Subtotal:</span><span>GHS ${invoice.subtotal.toFixed(2)}</span></div>
            ${invoice.discount > 0 ? `<div class="total-row"><span>Discount:</span><span>- GHS ${invoice.discount.toFixed(2)}</span></div>` : ''}
            <div class="total-row"><span>Net Sales:</span><span>GHS ${invoice.netSales.toFixed(2)}</span></div>
            ${invoice.tax > 0 ? `<div class="total-row"><span>Tax:</span><span>GHS ${invoice.tax.toFixed(2)}</span></div>` : ''}
            <div class="total-row grand-total"><span>Invoice Total:</span><span>GHS ${invoice.total.toFixed(2)}</span></div>
          </div>
        `}
        <div class="payment-status">
          ${isPartialPayment ? `✓ PARTIAL PAYMENT RECEIVED - GHS ${receiptAmount.toFixed(2)}` : '✓ PAYMENT RECEIVED - PAID IN FULL'}
        </div>
        <div class="payment-info">
          <div><strong>Payment Information:</strong></div>
          <div>Payment Method: ${isPartialPayment ? paymentEntry.paymentMethod : (invoice.paymentMethod || 'N/A')}</div>
          <div>Amount Paid: GHS ${receiptAmount.toFixed(2)}</div>
          <div>Payment Date: ${formatDate(receiptDate)}</div>
          ${isPartialPayment && paymentEntry.notes ? `<div>Notes: ${paymentEntry.notes}</div>` : ''}
        </div>
        ${isPartialPayment ? `
          <div class="balance-info">
            <div><strong>Payment Summary:</strong></div>
            <div>Total Paid to Date: GHS ${totalPaidSoFar.toFixed(2)}</div>
            <div>Remaining Balance: GHS ${remainingBalance.toFixed(2)}</div>
          </div>
        ` : ''}
        <div class="footer">
          <div>***</div>
          <div>Thank you for your business!</div>
          <div style="margin-top: 10px; font-size: 12px;">This is a computer-generated receipt and serves as proof of payment.</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentData({
      amount: 0,
      paymentMethod: invoice.paymentMethod || '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedInvoiceForPayment(null);
    setPaymentData({
      amount: 0,
      paymentMethod: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const recordPartPayment = async () => {
    if (!selectedInvoiceForPayment) return;

    const paymentAmount = parseFloat(paymentData.amount);
    if (paymentAmount <= 0) {
      showNotification('Payment amount must be greater than zero.', 'error');
      return;
    }

    if (!paymentData.paymentMethod.trim()) {
      showNotification('Payment method is required.', 'error');
      return;
    }

    const currentBalance = selectedInvoiceForPayment.balance || (selectedInvoiceForPayment.total - selectedInvoiceForPayment.paid);
    if (paymentAmount > currentBalance) {
      showNotification(`Payment amount cannot exceed the remaining balance of GHS ${currentBalance.toFixed(2)}.`, 'error');
      return;
    }

    const paymentEntry = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: paymentAmount,
      paymentMethod: paymentData.paymentMethod,
      paymentDate: paymentData.paymentDate,
      notes: paymentData.notes,
      recordedDate: new Date().toISOString()
    };

    const updatedInvoices = invoices.map(inv => {
      if (inv.id === selectedInvoiceForPayment.id) {
        const paymentHistory = inv.paymentHistory || [];
        const newPaidAmount = (inv.paid || 0) + paymentAmount;
        const newBalance = inv.total - newPaidAmount;
        const newStatus = newBalance <= 0 ? 'PAID' : (newPaidAmount > 0 ? 'PENDING' : inv.status);

        return {
          ...inv,
          paid: newPaidAmount,
          balance: newBalance,
          status: newStatus,
          paymentHistory: [...paymentHistory, paymentEntry]
        };
      }
      return inv;
    });

    const updatedInvoice = updatedInvoices.find(inv => inv.id === selectedInvoiceForPayment.id);
    await saveInvoiceToFirestore(updatedInvoice);

    setInvoices(updatedInvoices);
    generateReceipt(updatedInvoice, paymentEntry);
    closePaymentModal();
    showNotification('Payment recorded and receipt generated!', 'success');
  };

  const getStats = () => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    const totalPaid = invoices.reduce((sum, inv) => {
      if (inv.status === 'PAID') return sum + Number(inv.total || 0);
      return sum + Number(inv.paid || 0);
    }, 0);

    const totalOutstanding = invoices.reduce((sum, inv) => {
      if (inv.status === 'PAID') return sum;
      return sum + Number(inv.balance || 0);
    }, 0);

    const paidInvoices = invoices.filter(inv => inv.status === 'PAID').length;
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'PAID').length;

    // This month stats
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const invoicesThisMonth = invoices.filter(inv => {
      const d = new Date(inv.invoiceDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const countThisMonth = invoicesThisMonth.length;
    const revenueThisMonth = invoicesThisMonth.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    // Top 5 clients by revenue
    const clientMap = {};
    invoices.forEach(inv => {
      const name = inv.clientName || 'Unknown';
      if (!clientMap[name]) clientMap[name] = { count: 0, total: 0 };
      clientMap[name].count += 1;
      clientMap[name].total += Number(inv.total || 0);
    });
    const topClients = Object.entries(clientMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

    return {
      totalRevenue,
      totalPaid,
      totalOutstanding,
      paidInvoices,
      unpaidInvoices,
      totalInvoices: invoices.length,
      topClients,
      countThisMonth,
      revenueThisMonth
    };
  };

  const stats = getStats();

  // Filtered invoices for the table/cards
  const filteredInvoices = invoices
    .slice()
    .reverse()
    .filter(inv => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (inv.invoiceNumber || '').toLowerCase().includes(q) ||
        (inv.clientName || '').toLowerCase().includes(q)
      );
    });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-4">
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/ocr-a-extended');
        .invoice-font { font-family: 'OCR A Extended', monospace; }
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; }
          .no-print { display: none !important; }
        }
        @media (max-width: 768px) {
          input, select, button, textarea { font-size: 16px !important; }
          input[type="date"], input[type="datetime-local"], input[type="time"] { width: 100% !important; max-width: 100% !important; -webkit-appearance: none !important; -moz-appearance: textfield !important; appearance: none !important; background-color: white !important; border: 2px solid #d1d5db !important; border-radius: 0.5rem !important; padding: 0.75rem 1rem !important; color: #111827 !important; font-size: 16px !important; }
          input[type="date"]::-webkit-calendar-picker-indicator, input[type="datetime-local"]::-webkit-calendar-picker-indicator, input[type="time"]::-webkit-calendar-picker-indicator { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='16' y1='2' x2='16' y2='6'%3E%3C/line%3E%3Cline x1='8' y1='2' x2='8' y2='6'%3E%3C/line%3E%3Cline x1='3' y1='10' x2='21' y2='10'%3E%3C/line%3E%3C/svg%3E"); background-size: 16px 16px; background-repeat: no-repeat; background-position: right 0.75rem center; cursor: pointer; width: 20px; height: 20px; padding: 0; margin: 0; opacity: 1; }
          select { -webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important; background-color: white !important; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 12px 12px; padding-right: 2.5rem !important; color: #111827 !important; }
          select::-ms-expand { display: none; }
        }
        @keyframes slide-down { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-down">
          <div className={`rounded-lg shadow-lg p-4 flex items-start gap-3 ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
            <p className={`flex-1 text-sm ${
              notification.type === 'success' ? 'text-green-800' :
              notification.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification({ show: false, message: '', type: 'info' })}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        {/* Desktop Navigation */}
        <div className="no-print hidden md:flex mb-6 gap-4">
          <button
            onClick={() => setCurrentView('create')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              currentView === 'create' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText size={20} /> {editingInvoiceId ? 'Edit Invoice' : 'Create Invoice'}
          </button>
          <button
            onClick={() => setCurrentView('stats')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              currentView === 'stats' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={20} /> Statistics
          </button>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="no-print fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-40">
          <div className="flex justify-around items-center h-16">
            <button
              onClick={() => setCurrentView('create')}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition ${
                currentView === 'create' ? 'text-blue-500' : 'text-gray-600'
              }`}
            >
              <FileText size={22} />
              <span className="text-xs font-medium">Create</span>
            </button>
            <button
              onClick={() => setCurrentView('stats')}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition ${
                currentView === 'stats' ? 'text-blue-500' : 'text-gray-600'
              }`}
            >
              <BarChart3 size={22} />
              <span className="text-xs font-medium">Stats</span>
            </button>
          </div>
        </div>

        {/* ─── STATS VIEW ─── */}
        {currentView === 'stats' && (
          <div className="no-print bg-white p-4 md:p-6 rounded-lg shadow-sm mb-4">
            {/* Stats Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">Invoice Statistics</h2>
                {lastRefreshed && (
                  <p className="text-xs text-gray-400 mt-0.5">{getLastRefreshedLabel()}</p>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => exportToCSV(filteredInvoices)}
                  className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-medium transition shadow-sm"
                >
                  <Download size={16} /> Export CSV
                </button>
                <button
                  onClick={() => refreshInvoices(userId, true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition shadow-sm disabled:opacity-60"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
                  {isRefreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Main stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-blue-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Total Revenue</div>
                <div className="text-2xl md:text-3xl font-bold text-blue-600">GHS {stats.totalRevenue.toFixed(2)}</div>
              </div>
              <div className="bg-green-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Total Paid</div>
                <div className="text-2xl md:text-3xl font-bold text-green-600">GHS {stats.totalPaid.toFixed(2)}</div>
              </div>
              <div className="bg-orange-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Outstanding</div>
                <div className="text-2xl md:text-3xl font-bold text-orange-600">GHS {stats.totalOutstanding.toFixed(2)}</div>
              </div>
            </div>

            {/* Count stats */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-gray-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Total Invoices</div>
                <div className="text-2xl md:text-3xl font-bold text-gray-700">{stats.totalInvoices}</div>
              </div>
              <div className="bg-gray-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Paid Invoices</div>
                <div className="text-2xl md:text-3xl font-bold text-gray-700">{stats.paidInvoices}</div>
              </div>
              <div className="bg-gray-50 p-4 md:p-6 rounded">
                <div className="text-xs md:text-sm text-gray-600 mb-2">Unpaid Invoices</div>
                <div className="text-2xl md:text-3xl font-bold text-gray-700">{stats.unpaidInvoices}</div>
              </div>
              {/* This month */}
              <div className="bg-purple-50 p-4 md:p-6 rounded border border-purple-100">
                <div className="flex items-center gap-1 text-xs md:text-sm text-purple-600 mb-2">
                  <Calendar size={13} />
                  <span>This Month</span>
                </div>
                <div className="text-xl md:text-2xl font-bold text-purple-700">{stats.countThisMonth} invoices</div>
                <div className="text-sm font-semibold text-purple-500 mt-1">GHS {stats.revenueThisMonth.toFixed(2)}</div>
              </div>
            </div>

            {/* Top Clients */}
            {stats.topClients.length > 0 && (
              <div className="mb-6 md:mb-8">
                <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Top Clients by Revenue</h3>
                <div className="bg-gray-50 rounded overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="text-left p-3 md:p-4 text-sm md:text-base">#</th>
                        <th className="text-left p-3 md:p-4 text-sm md:text-base">Client Name</th>
                        <th className="text-right p-3 md:p-4 text-sm md:text-base">Invoices</th>
                        <th className="text-right p-3 md:p-4 text-sm md:text-base">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topClients.map(([name, data], index) => (
                        <tr key={index} className="border-t border-gray-200">
                          <td className="p-3 md:p-4 text-sm md:text-base text-gray-500">{index + 1}</td>
                          <td className="p-3 md:p-4 text-sm md:text-base font-medium">{name}</td>
                          <td className="text-right p-3 md:p-4 text-sm md:text-base">{data.count}</td>
                          <td className="text-right p-3 md:p-4 text-sm md:text-base font-semibold">GHS {data.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* All Invoices + Search + Export */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 md:mb-4 gap-3">
                <h3 className="text-lg md:text-xl font-bold">All Invoices</h3>
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by invoice # or client"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredInvoices.map((inv) => (
                  <div key={inv.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{inv.invoiceNumber}</div>
                        <div className="text-sm text-gray-600 mt-1">{inv.clientName || 'N/A'}</div>
                        <div className="text-xs text-gray-500 mt-1">{formatDate(inv.invoiceDate)}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        inv.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        inv.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <div className="text-gray-600 text-xs">Total</div>
                        <div className="font-semibold text-gray-900">GHS {Number(inv.total).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs">Balance</div>
                        <div className="font-semibold text-gray-900">GHS {Number(inv.balance).toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => editInvoice(inv)} className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition text-xs font-medium flex items-center gap-1">
                        <Edit2 size={14} /> Edit
                      </button>
                      {inv.status !== 'PAID' && inv.balance > 0 && (
                        <button onClick={() => openPaymentModal(inv)} className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition text-xs font-medium flex items-center gap-1">
                          <DollarSign size={14} /> Payment
                        </button>
                      )}
                      {(inv.status === 'PAID' || inv.paid > 0) && (
                        <button onClick={() => generateReceipt(inv)} className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition text-xs font-medium flex items-center gap-1">
                          <Receipt size={14} /> Receipt
                        </button>
                      )}
                      <button onClick={() => deleteInvoice(inv.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition text-xs font-medium flex items-center gap-1">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
                {filteredInvoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                    {searchQuery ? 'No invoices match your search.' : 'No invoices found. Create your first invoice to get started!'}
                  </div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-gray-50 rounded-lg overflow-x-auto shadow-sm">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="text-left p-3 md:p-4 text-sm md:text-base">Invoice #</th>
                      <th className="text-left p-3 md:p-4 text-sm md:text-base">Date</th>
                      <th className="text-left p-3 md:p-4 text-sm md:text-base">Client</th>
                      <th className="text-right p-3 md:p-4 text-sm md:text-base">Total</th>
                      <th className="text-right p-3 md:p-4 text-sm md:text-base">Balance</th>
                      <th className="text-center p-3 md:p-4 text-sm md:text-base">Status</th>
                      <th className="text-center p-3 md:p-4 text-sm md:text-base">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-gray-200">
                        <td className="p-3 md:p-4 text-sm md:text-base">{inv.invoiceNumber}</td>
                        <td className="p-3 md:p-4 text-sm md:text-base">{formatDate(inv.invoiceDate)}</td>
                        <td className="p-3 md:p-4 text-sm md:text-base">{inv.clientName || 'N/A'}</td>
                        <td className="text-right p-3 md:p-4 text-sm md:text-base">GHS {Number(inv.total).toFixed(2)}</td>
                        <td className="text-right p-3 md:p-4 text-sm md:text-base">GHS {Number(inv.balance).toFixed(2)}</td>
                        <td className="text-center p-3 md:p-4">
                          <span className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${
                            inv.status === 'PAID' ? 'bg-green-100 text-green-800' :
                            inv.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="text-center p-3 md:p-4">
                          <div className="flex gap-2 justify-center flex-wrap">
                            <button onClick={() => editInvoice(inv)} className="bg-blue-500 text-white p-2.5 rounded-lg hover:bg-blue-600 transition shadow-sm" title="Edit Invoice">
                              <Edit2 size={18} />
                            </button>
                            {inv.status !== 'PAID' && inv.balance > 0 && (
                              <button onClick={() => openPaymentModal(inv)} className="bg-yellow-500 text-white p-2.5 rounded-lg hover:bg-yellow-600 transition shadow-sm" title="Record Part Payment">
                                <DollarSign size={18} />
                              </button>
                            )}
                            {(inv.status === 'PAID' || inv.paid > 0) && (
                              <button onClick={() => generateReceipt(inv)} className="bg-green-500 text-white p-2.5 rounded-lg hover:bg-green-600 transition shadow-sm" title={inv.status === 'PAID' ? 'Generate Full Receipt' : 'Generate Payment Summary Receipt'}>
                                <Receipt size={18} />
                              </button>
                            )}
                            {inv.paymentHistory && inv.paymentHistory.length > 0 && (
                              <button
                                onClick={() => {
                                  const lastPayment = inv.paymentHistory[inv.paymentHistory.length - 1];
                                  generateReceipt(inv, lastPayment);
                                }}
                                className="bg-purple-500 text-white p-2.5 rounded-lg hover:bg-purple-600 transition shadow-sm"
                                title="Generate Last Payment Receipt"
                              >
                                <Receipt size={18} />
                              </button>
                            )}
                            <button onClick={() => deleteInvoice(inv.id)} className="bg-red-500 text-white p-2.5 rounded-lg hover:bg-red-600 transition shadow-sm" title="Delete Invoice">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredInvoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No invoices match your search.' : 'No invoices found. Create your first invoice to get started!'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── CREATE / EDIT VIEW ─── */}
        {currentView === 'create' && (
          <>
            <div className="no-print mb-4 bg-white p-4 md:p-6 rounded-lg shadow-sm">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    {editingInvoiceId ? 'Edit Invoice' : 'New Invoice'}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">{invoiceData.invoiceNumber}</p>
                </div>
                {editingInvoiceId && (
                  <button onClick={cancelEdit} className="bg-gray-500 text-white px-4 py-2.5 rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2 font-medium transition">
                    <X size={18} /> Cancel
                  </button>
                )}
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Client Name *</label>
                    <input type="text" placeholder="Client Name" value={invoiceData.clientName} onChange={(e) => setInvoiceData({ ...invoiceData, clientName: e.target.value })} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Invoice Date</label>
                    <input type="date" value={invoiceData.invoiceDate} onChange={(e) => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition md:max-w-none" style={{ maxWidth: '100%' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Status</label>
                    <select value={invoiceData.status} onChange={(e) => setInvoiceData({ ...invoiceData, status: e.target.value })} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition">
                      <option value="UNPAID">UNPAID</option>
                      <option value="PENDING">PENDING</option>
                      <option value="PAID">PAID</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Client Address (optional)</label>
                    <input type="text" placeholder="Address, City" value={`${invoiceData.clientAddress}${invoiceData.clientAddress && invoiceData.clientCity ? ', ' : ''}${invoiceData.clientCity}`} onChange={(e) => { const parts = e.target.value.split(',').map(s => s.trim()); setInvoiceData({ ...invoiceData, clientAddress: parts[0] || '', clientCity: parts.slice(1).join(', ') || '' }); }} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Payment Method *</label>
                    <input type="text" placeholder="e.g., Mobile Money, Bank Transfer" value={invoiceData.paymentMethod} onChange={(e) => setInvoiceData({ ...invoiceData, paymentMethod: e.target.value })} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Payment Account</label>
                    <input type="text" placeholder="Account Number" value={invoiceData.paymentAccountNumber} onChange={(e) => setInvoiceData({ ...invoiceData, paymentAccountNumber: e.target.value })} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Payment Link (optional)</label>
                    <input type="text" placeholder="Payment link URL" value={invoiceData.paymentLink} onChange={(e) => setInvoiceData({ ...invoiceData, paymentLink: e.target.value })} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg text-gray-900">Services</h3>
                  <button onClick={addService} className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2.5 rounded-lg hover:bg-blue-600 text-sm font-medium transition shadow-sm">
                    <Plus size={18} /> Add Service
                  </button>
                </div>

                <div className="space-y-3">
                  {invoiceData.services.map((service, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-2 items-start md:items-center bg-gray-50 p-3 md:p-4 rounded-lg border border-gray-200">
                      <input type="text" placeholder="Service description" value={service.desc} onChange={(e) => updateService(index, 'desc', e.target.value)} className="flex-1 border-2 border-gray-300 px-4 py-2.5 rounded-lg text-base focus:border-blue-500 focus:outline-none transition w-full md:w-auto" />
                      <div className="flex gap-2 w-full md:w-auto items-center flex-wrap">
                        <input type="number" placeholder="Rate" value={service.unitRate || ''} onChange={(e) => updateService(index, 'unitRate', parseFloat(e.target.value) || 0)} className="w-20 md:w-24 border-2 border-gray-300 px-2 md:px-3 py-2.5 rounded-lg text-sm md:text-base focus:border-blue-500 focus:outline-none transition" />
                        <input type="number" placeholder="Qty" value={service.count || ''} onChange={(e) => updateService(index, 'count', parseInt(e.target.value) || 0)} className="w-16 md:w-20 border-2 border-gray-300 px-2 md:px-3 py-2.5 rounded-lg text-sm md:text-base focus:border-blue-500 focus:outline-none transition" />
                        <div className="flex-1 md:flex-none md:w-28 px-2 md:px-3 py-2.5 text-sm md:text-base text-gray-700 font-semibold bg-white rounded-lg border-2 border-gray-300 flex items-center min-w-[80px]">
                          GHS {service.amount.toFixed(2)}
                        </div>
                        <button onClick={() => removeService(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 md:p-2.5 rounded-lg transition flex-shrink-0" title="Remove service">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
                  <input type="number" value={invoiceData.discount} onChange={(e) => setInvoiceData({ ...invoiceData, discount: parseFloat(e.target.value) || 0 })} className="w-full border-2 border-gray-300 px-4 py-2.5 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax</label>
                  <input type="number" value={invoiceData.tax} onChange={(e) => setInvoiceData({ ...invoiceData, tax: parseFloat(e.target.value) || 0 })} className="w-full border-2 border-gray-300 px-4 py-2.5 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paid</label>
                  <input type="number" value={invoiceData.paid} onChange={(e) => setInvoiceData({ ...invoiceData, paid: parseFloat(e.target.value) || 0 })} className="w-full border-2 border-gray-300 px-4 py-2.5 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" placeholder="0" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={saveInvoice} className="flex-1 bg-blue-500 text-white py-3.5 rounded-lg hover:bg-blue-600 text-base font-medium transition shadow-sm">
                  {editingInvoiceId ? 'Update Invoice' : 'Save Invoice'}
                </button>
                <button onClick={exportToPDF} className="flex-1 bg-green-500 text-white py-3.5 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 text-base font-medium transition shadow-sm">
                  <Download size={20} /> Export to PDF
                </button>
                {(invoiceData.status === 'PAID' || invoiceData.paid > 0) && (
                  <button
                    onClick={() => {
                      const currentInvoice = {
                        ...invoiceData,
                        subtotal: calculateSubtotal(),
                        netSales: calculateNetSales(),
                        total: calculateTotal(),
                        balance: calculateBalance(),
                        paymentHistory: invoiceData.paymentHistory || []
                      };
                      generateReceipt(currentInvoice);
                    }}
                    className="flex-1 bg-purple-500 text-white py-3.5 rounded-lg hover:bg-purple-600 flex items-center justify-center gap-2 text-base font-medium transition shadow-sm"
                  >
                    <Receipt size={20} /> Generate Receipt
                  </button>
                )}
              </div>
            </div>

            {/* Print Area */}
            <div className="print-area bg-white p-4 md:p-12 invoice-font text-xs md:text-sm">
              <div className="flex flex-col md:flex-row md:justify-between mb-6 md:mb-8 gap-4">
                <div>
                  <div className="mb-1 text-xs md:text-sm">{invoiceData.companyName}</div>
                  <div className="mb-1 text-xs md:text-sm">{invoiceData.companyAddress}</div>
                  <div className="mb-1 text-xs md:text-sm">{invoiceData.companyCity}</div>
                  <div className="text-xs md:text-sm">{invoiceData.companyEmail}</div>
                </div>
                <div className="border-2 border-black px-3 md:px-4 py-2 text-xs md:text-sm">
                  <div>Invoice #:     {invoiceData.invoiceNumber}</div>
                  <div>Invoice Date: {formatDate(invoiceData.invoiceDate)}</div>
                </div>
              </div>

              <div className="mb-6 md:mb-8 text-xs md:text-sm">
                <div className="mb-2 font-semibold">Billed To:</div>
                <div>{invoiceData.clientName}</div>
                <div>{invoiceData.clientAddress}</div>
                <div>{invoiceData.clientCity}</div>
                {invoiceData.clientPO && <div>P.O. No.  {invoiceData.clientPO}</div>}
                {invoiceData.clientVAT && <div>VAT ID {invoiceData.clientVAT}</div>}
              </div>

              <div className="mb-6 md:mb-8 text-xs md:text-sm">
                {invoiceData.orderNo && <div>Order No.:     {invoiceData.orderNo}</div>}
                {invoiceData.checkoutNo && <div>Checkout No.: {invoiceData.checkoutNo}</div>}
                <div>Purchase Date: {formatDate(invoiceData.purchaseDate)}</div>
              </div>

              <div className="mb-6 md:mb-8">
                <div className="text-center mb-3 md:mb-4 text-xs md:text-sm">Order {invoiceData.orderNo}</div>
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="text-left py-1 md:py-2">#</th>
                      <th className="text-left py-1 md:py-2">Services</th>
                      <th className="text-right py-1 md:py-2">Unit Rate</th>
                      <th className="text-right py-1 md:py-2">Count</th>
                      <th className="text-right py-1 md:py-2">Subtotal (GHS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.services.map((service, index) => (
                      <tr key={index} className="border-b border-gray-300">
                        <td className="py-1 md:py-2">{index + 1}</td>
                        <td className="py-1 md:py-2">{service.desc}</td>
                        <td className="text-right py-1 md:py-2">{service.unitRate.toFixed(2)}</td>
                        <td className="text-right py-1 md:py-2">{service.count}</td>
                        <td className="text-right py-1 md:py-2">{service.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mb-6 md:mb-8">
                <div className="w-full md:w-64 text-xs md:text-sm">
                  <div className="flex justify-between border-b py-1"><span>Subtotal</span><span>{calculateSubtotal().toFixed(2)}</span></div>
                  <div className="flex justify-between border-b py-1"><span>Discount</span><span>-{invoiceData.discount.toFixed(2)}</span></div>
                  <div className="flex justify-between border-b py-1"><span>Net Sales Total</span><span>{calculateNetSales().toFixed(2)}</span></div>
                  <div className="flex justify-between border-b-2 border-double border-black py-1"><span>Tax</span><span>{invoiceData.tax.toFixed(2)}</span></div>
                  <div className="flex justify-between border-b-2 border-double border-black py-2 font-bold"><span>Total</span><span>{calculateTotal().toFixed(2)}</span></div>
                </div>
              </div>

              <div className="text-center mb-6 md:mb-8 border-b-2 border-double border-black pb-3 md:pb-4 text-xs md:text-sm">
                Invoice Status: {invoiceData.status}
              </div>

              <div className="flex justify-end mb-6 md:mb-8">
                <div className="w-full md:w-64 text-xs md:text-sm">
                  <div className="flex justify-between border-b py-1"><span>Paid</span><span>-{invoiceData.paid.toFixed(2)}</span></div>
                  <div className="flex justify-between py-1"><span>Balance</span><span>{calculateBalance().toFixed(2)}</span></div>
                </div>
              </div>

              {invoiceData.paymentMethod && (
                <div className="mb-6 md:mb-8 text-xs md:text-sm">
                  Payment Method: {invoiceData.paymentMethod}
                </div>
              )}

              {(invoiceData.paymentAccountNumber || invoiceData.paymentLink) && (
                <div className="mb-6 md:mb-8 text-xs md:text-sm">
                  <div className="font-bold mb-2">Payment Information:</div>
                  {invoiceData.paymentAccountNumber && (
                    <>
                      <div>Account #: {invoiceData.paymentAccountNumber}</div>
                      {invoiceData.paymentInstitution && <div>Institution: {invoiceData.paymentInstitution}</div>}
                      {invoiceData.paymentBeneficiary && <div>Beneficiary: {invoiceData.paymentBeneficiary}</div>}
                    </>
                  )}
                  {invoiceData.paymentLink && (
                    <div className="mt-2">
                      <div>or use the link below to pay:</div>
                      <div className="text-blue-600 underline break-all">{invoiceData.paymentLink}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-center text-xs md:text-sm">
                <div className="mb-2">***</div>
                <div>Thank you for your business.</div>
              </div>
            </div>
          </>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedInvoiceForPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Record Part Payment</h2>
                <button onClick={closePaymentModal} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600 mb-1">Invoice: {selectedInvoiceForPayment.invoiceNumber}</div>
                <div className="text-sm text-gray-600 mb-1">Client: {selectedInvoiceForPayment.clientName}</div>
                <div className="text-sm font-semibold">Total: GHS {selectedInvoiceForPayment.total.toFixed(2)}</div>
                <div className="text-sm font-semibold">Paid: GHS {(selectedInvoiceForPayment.paid || 0).toFixed(2)}</div>
                <div className="text-sm font-semibold text-orange-600">
                  Balance: GHS {(selectedInvoiceForPayment.balance || (selectedInvoiceForPayment.total - (selectedInvoiceForPayment.paid || 0))).toFixed(2)}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Amount (GHS)</label>
                  <input type="number" step="0.01" min="0.01" max={selectedInvoiceForPayment.balance || (selectedInvoiceForPayment.total - (selectedInvoiceForPayment.paid || 0))} value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" placeholder="Enter payment amount" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Payment Method</label>
                  <input type="text" value={paymentData.paymentMethod} onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" placeholder="e.g., Mobile Money, Bank Transfer, Cash" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Payment Date</label>
                  <input type="date" value={paymentData.paymentDate} onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Notes (Optional)</label>
                  <textarea value={paymentData.notes} onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })} className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-base focus:border-blue-500 focus:outline-none transition" rows="3" placeholder="Additional notes about this payment" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button onClick={closePaymentModal} className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-medium transition shadow-sm">Cancel</button>
                <button onClick={recordPartPayment} className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 font-medium transition shadow-sm">
                  <Receipt size={18} /> Record Payment & Generate Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── LoginScreen — rendered by App when unauthenticated ─── */
function LoginScreen() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <img src={logo} alt="Curio Graphics Yard Logo" className="mx-auto mb-6 w-24 h-auto" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">CoreOps Console v1.5</h1>
        </div>
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-3 font-medium transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

/* ─── Root App: single auth listener; passes userId down to InvoiceGenerator ─── */
function App() {
  const [mode, setMode] = useState('invoice');
  const [authState, setAuthState] = useState({ status: 'loading', userId: '', userEmail: '' });
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthState({ status: 'authenticated', userId: user.uid, userEmail: user.email });
      } else {
        setAuthState({ status: 'unauthenticated', userId: '', userEmail: '' });
        setMode('invoice');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error(e);
    }
  };

  // Spinner while Firebase figures out auth on startup — prevents double-mount
  if (authState.status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (authState.status === 'unauthenticated') {
    return <LoginScreen />;
  }

  return (
    <div className="app-root">
      <header className="app-switcher-header no-print">
        {/* Row 1: Logo + Logout */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 50 }}>
          <img src={logo} alt="CGY" className="app-switcher-logo" style={{ margin: 0 }} />
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1.5px solid #fee2e2",
              background: "transparent",
              color: "#ef4444",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
        {/* Row 2: Mode switcher — full-width */}
        <div style={{ display: "flex", alignItems: "center", paddingBottom: 8 }}>
          <ModeSwitcher mode={mode} onModeChange={setMode} fullWidth />
        </div>
      </header>

      <main className={`app-content app-content-${mode}`}>
        {mode === 'invoice' && (
          <div className="view-panel view-panel-invoice">
            <InvoiceGenerator userId={authState.userId} />
          </div>
        )}
        {mode === 'contract' && (
          <CGYContractManager userId={authState.userId} />
        )}
      </main>

      {/* Scroll to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="no-print"
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? 'auto' : 'none',
          transform: showScrollTop ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
        aria-label="Scroll to top"
      >
        <ChevronUp size={22} />
      </button>
    </div>
  );
}

export default App;