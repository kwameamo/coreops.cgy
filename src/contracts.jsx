import { useState, useCallback, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, getDoc } from "firebase/firestore";
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
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function CGYContractManager({ userId = "" }) {
  const [currentView, setCurrentView] = useState("create");
  const [contracts, setContracts] = useState([]);
  const [counter, setCounter] = useState(1);
  const [printContract, setPrintContract] = useState(null);
  const [editing, setEditing] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "info" });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const showNotification = useCallback((message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "info" }), 4000);
  }, []);

  /* ── Firebase ── */
  const loadContracts = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const snap = await getDocs(query(collection(db, "contracts"), where("userId", "==", uid)));
      setContracts(snap.docs.map(d => d.data()));
    } catch (err) { console.error("loadContracts:", err); }
  }, []);

  const loadCounter = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const snap = await getDoc(doc(db, "contractCounters", uid));
      if (snap.exists()) setCounter(snap.data().value || 1);
    } catch (err) { console.error("loadCounter:", err); }
  }, []);

  const saveCounter = async (uid, val) => {
    try { await setDoc(doc(db, "contractCounters", uid), { value: val }); } catch {}
  };

  useEffect(() => {
    if (userId) { loadContracts(userId); loadCounter(userId); }
  }, [userId, loadContracts, loadCounter]);

  /* ── Print ── */
  const exportToPDF = (contract) => {
    setPrintContract(contract);
    setTimeout(() => window.print(), 100);
  };

  const startNew = (type) => {
    setEditing(blankContract(counter, type));
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveContract = async () => {
    if (!editing.clientName.trim()) return showNotification("Client name is required.", "error");
    if (!editing.projectTitle.trim()) return showNotification("Project title is required.", "error");
    if (!editing.agreedAmount) return showNotification("Agreed amount is required.", "error");
    const updated = { ...editing, savedDate: new Date().toISOString(), userId };
    const existing = contracts.find(c => c.id === updated.id);
    try {
      await setDoc(doc(db, "contracts", updated.id), updated);
      if (existing) {
        setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
        showNotification("Contract updated successfully!", "success");
      } else {
        setContracts(prev => [...prev, updated]);
        const nc = counter + 1; setCounter(nc);
        await saveCounter(userId, nc);
        showNotification("Contract saved successfully!", "success");
      }
      setEditing(null);
    } catch (err) { showNotification("Error saving contract.", "error"); }
  };

  const deleteContract = async (id) => {
    if (!window.confirm("Delete this contract? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "contracts", id));
      setContracts(prev => prev.filter(c => c.id !== id));
      showNotification("Contract deleted.", "success");
    } catch (err) { showNotification("Error deleting contract.", "error"); }
  };

  const duplicateContract = async (contract) => {
    const copy = { ...contract, id: uid(), contractNumber: `CGY-${new Date().getFullYear()}-${pad(counter)}`, status: "DRAFT", savedDate: "", contractDate: today(), userId };
    try {
      await setDoc(doc(db, "contracts", copy.id), copy);
      setContracts(prev => [...prev, copy]);
      const nc = counter + 1; setCounter(nc);
      await saveCounter(userId, nc);
      showNotification("Contract duplicated!", "success");
    } catch (err) { showNotification("Error duplicating contract.", "error"); }
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
              <button onClick={() => exportToPDF(editing)} className="flex-1 bg-green-500 text-white py-3.5 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 text-base font-medium transition shadow-sm">
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
        @media print {
          body * { visibility: hidden; }
          .contract-print-area, .contract-print-area * { visibility: visible; }
          .contract-print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; }
          .no-print { display: none !important; }
        }
        .contract-print-area { display: none; }
        @media print { .contract-print-area { display: block !important; } }
        @media (max-width: 768px) {
          input, select, button, textarea { font-size: 16px !important; }
          input[type="date"] { width: 100% !important; max-width: 100% !important; -webkit-appearance: none !important; -moz-appearance: textfield !important; appearance: none !important; background-color: white !important; border: 2px solid #d1d5db !important; border-radius: 0.5rem !important; padding: 0.75rem 1rem !important; color: #111827 !important; font-size: 16px !important; }
          input[type="date"]::-webkit-calendar-picker-indicator { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E"); background-size: 16px; background-repeat: no-repeat; background-position: right 0.75rem center; width: 20px; height: 20px; padding: 0; opacity: 1; }
          select { -webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important; background-color: white !important; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 12px 12px; padding-right: 2.5rem !important; color: #111827 !important; }
          select::-ms-expand { display: none; }
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
                            <button onClick={() => exportToPDF(c)} className="bg-green-500 text-white p-2.5 rounded-lg hover:bg-green-600 transition shadow-sm" title="Export PDF"><Download size={18} /></button>
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
                      <button onClick={() => exportToPDF(c)} className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition text-xs font-medium flex items-center gap-1"><Download size={14} /> PDF</button>
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
                        <button onClick={() => exportToPDF(c)} className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition text-xs font-medium flex items-center gap-1"><Download size={14} /> PDF</button>
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
                              <button onClick={() => exportToPDF(c)} className="bg-green-500 text-white p-2.5 rounded-lg hover:bg-green-600 transition shadow-sm" title="Export PDF"><Download size={18} /></button>
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


      {/* ── Hidden Print Area — visible only when window.print() is called ── */}
      {printContract && (() => {
        const pc = printContract;
        const ti = CONTRACT_TYPES[pc.type] || CONTRACT_TYPES.graphic;
        const ac = ti.color;
        const dep = pc.agreedAmount ? ((parseFloat(pc.agreedAmount) * pc.depositPercent) / 100).toFixed(2) : "—";
        const bal = pc.agreedAmount ? ((parseFloat(pc.agreedAmount) * (100 - pc.depositPercent)) / 100).toFixed(2) : "—";
        const delivList = pc.deliverables ? pc.deliverables.split("\n").filter(Boolean) : [];
        const allSvcs = [...(pc.servicesSelected || []), ...(pc.customServices ? [pc.customServices] : [])];
        const s = {
          page: { fontFamily: "'DM Sans','Segoe UI',Arial,sans-serif", fontSize: 11, color: "#222", lineHeight: 1.65, maxWidth: 760, margin: "0 auto", padding: "48px 52px", background: "#fff" },
          hdr: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, paddingBottom: 24, borderBottom: `4px solid ${ac}` },
          badge: { textAlign: "right" },
          ctype: { fontSize: 11, fontWeight: 700, color: ac, textTransform: "uppercase", letterSpacing: "0.06em" },
          cnum: { fontSize: 9, color: "#888", marginTop: 4 },
          banner: { background: "#111", color: "#fff", textAlign: "center", padding: "10px 16px", fontSize: 9, letterSpacing: "0.04em", marginBottom: 28, borderRadius: 3 },
          h2: { fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 700, color: ac, margin: "28px 0 10px", paddingBottom: 6, borderBottom: `1.5px solid ${ac}44` },
          grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid #ddd", borderRadius: 4, overflow: "hidden", marginBottom: 18 },
          cell: { padding: "8px 12px", borderBottom: "1px solid #eee", borderRight: "1px solid #eee", fontSize: 10 },
          lbl: { fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", marginBottom: 2 },
          val: { fontSize: 10, fontWeight: 600, color: "#111" },
          full: { gridColumn: "1/-1", borderRight: "none" },
          tbl: { width: "100%", borderCollapse: "collapse", margin: "12px 0" },
          th: { background: "#111", color: "#fff", padding: "8px 12px", textAlign: "left", fontSize: 9, fontWeight: 600 },
          td: { padding: "8px 12px", borderBottom: "1px solid #eee", fontSize: 10 },
          payGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "12px 0" },
          payBox: { border: `1.5px solid ${ac}`, borderRadius: 4, padding: "12px 14px" },
          payLbl: { fontSize: 8, fontWeight: 700, color: ac, textTransform: "uppercase", marginBottom: 4 },
          payAmt: { fontSize: 16, fontWeight: 700, color: "#111" },
          payNote: { fontSize: 8.5, color: "#666", marginTop: 2 },
          badgeRow: { display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" },
          badgeY: { display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 8.5, fontWeight: 600, background: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac" },
          badgeN: { display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 8.5, fontWeight: 600, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" },
          sigGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 20 },
          sigTop: { borderTop: `2px solid ${ac}`, paddingTop: 12 },
          sigLbl: { fontSize: 9, fontWeight: 700, color: ac, textTransform: "uppercase", marginBottom: 12 },
          sigLine: { borderBottom: "1.5px solid #333", marginBottom: 4, height: 36 },
          sigFld: { fontSize: 8, color: "#aaa", textTransform: "uppercase", marginBottom: 12 },
          ftr: { marginTop: 36, paddingTop: 16, borderTop: `2px solid ${ac}`, textAlign: "center", fontSize: 8.5, color: "#888" },
          warn: { background: "#fff8f0", border: `1.5px solid ${ac}66`, borderRadius: 4, padding: "10px 14px", margin: "12px 0", fontSize: 9.5, color: "#7c3a00" },
          clauseTitle: { fontSize: 10, fontWeight: 700, color: "#333", marginBottom: 4, marginTop: 12 },
          clauseText: { fontSize: 10, color: "#444", lineHeight: 1.6, marginBottom: 4 },
        };
        return (
          <div className="contract-print-area">
            <div style={s.page}>
              {/* Header */}
              <div style={s.hdr}>
                <img src={logoUrl} alt="CGY" style={{ height: 52, width: "auto", objectFit: "contain" }} />
                <div style={s.badge}>
                  <div style={s.ctype}>{ti.label} Contract</div>
                  <div style={s.cnum}>Contract #{pc.contractNumber}</div>
                  <div style={s.cnum}>Dated: {fmtDate(pc.contractDate)}</div>
                </div>
              </div>
              <div style={s.banner}>⚖ This is a legally binding agreement. Both parties must read all terms before signing.</div>

              {/* 1. Parties */}
              <div style={s.h2}>1. Parties &amp; Project Overview</div>
              <div style={s.grid}>
                <div style={s.cell}><div style={s.lbl}>Designer / Studio</div><div style={s.val}>Curio Graphics Yard (CGY)</div></div>
                <div style={s.cell}><div style={s.lbl}>Designer Email</div><div style={s.val}>{pc.designerEmail}</div></div>
                <div style={{ ...s.cell, ...s.full }}><div style={s.lbl}>Designer Address</div><div style={s.val}>{pc.designerAddress}</div></div>
                <div style={s.cell}><div style={s.lbl}>Client Name</div><div style={s.val}>{pc.clientName || "—"}</div></div>
                <div style={s.cell}><div style={s.lbl}>Client Company / Brand</div><div style={s.val}>{pc.clientCompany || "—"}</div></div>
                <div style={s.cell}><div style={s.lbl}>Client Email</div><div style={s.val}>{pc.clientEmail || "—"}</div></div>
                <div style={s.cell}><div style={s.lbl}>Client Phone</div><div style={s.val}>{pc.clientPhone || "—"}</div></div>
                {pc.clientAddress && <div style={{ ...s.cell, ...s.full }}><div style={s.lbl}>Client Address</div><div style={s.val}>{pc.clientAddress}</div></div>}
                <div style={{ ...s.cell, ...s.full }}><div style={s.lbl}>Project Title</div><div style={s.val}>{pc.projectTitle || "—"}</div></div>
                <div style={s.cell}><div style={s.lbl}>Start Date</div><div style={s.val}>{fmtDate(pc.startDate)}</div></div>
                <div style={s.cell}><div style={s.lbl}>Estimated End Date</div><div style={s.val}>{pc.endDate ? fmtDate(pc.endDate) : "TBD"}</div></div>
              </div>

              {/* 2. Services */}
              <div style={s.h2}>2. Services &amp; Agreed Rates</div>
              {allSvcs.length > 0
                ? <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{allSvcs.map((sv, i) => <li key={i} style={{ fontSize: 10, marginBottom: 3 }}>{sv}</li>)}</ul>
                : <p style={{ fontSize: 10, color: "#666" }}>No services selected.</p>}
              <div style={s.grid}>
                <div style={s.cell}><div style={s.lbl}>Agreed Amount</div><div style={s.val}>{pc.currency} {pc.agreedAmount || "—"}</div></div>
                <div style={s.cell}><div style={s.lbl}>Currency</div><div style={s.val}>{pc.currency}</div></div>
                <div style={s.cell}><div style={s.lbl}>Deposit %</div><div style={s.val}>{pc.depositPercent}%</div></div>
                <div style={s.cell}><div style={s.lbl}>Revisions Included</div><div style={s.val}>{pc.revisionsIncluded} rounds</div></div>
              </div>

              {/* 3. Scope */}
              <div style={s.h2}>3. Scope of Work &amp; Deliverables</div>
              {delivList.length > 0
                ? <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{delivList.map((d, i) => <li key={i} style={{ fontSize: 10, marginBottom: 3 }}>{d}</li>)}</ul>
                : <ul style={{ paddingLeft: 20, marginBottom: 12, fontSize: 10 }}><li>Deliverables as described in services above</li><li>Final files in agreed formats (PNG, JPG, SVG, PDF)</li></ul>}
              <div style={s.warn}>⚠ Any work not listed above is OUT OF SCOPE and will be quoted separately via written Change Order.</div>
              {pc.specialRequirements && <><div style={s.clauseTitle}>Special Requirements</div><div style={s.clauseText}>{pc.specialRequirements}</div></>}

              {/* 4. Timeline */}
              <div style={s.h2}>4. Project Timeline</div>
              <table style={s.tbl}>
                <thead>
                  <tr><th style={s.th}>Phase</th><th style={s.th}>Deliverable</th><th style={s.th}>Due</th><th style={s.th}>Payment</th></tr>
                </thead>
                <tbody>
                  {[
                    ["Phase 1 — Deposit", "Signed contract + deposit received", fmtDate(pc.startDate), `${pc.depositPercent}% — ${pc.currency} ${dep}`],
                    ["Phase 2 — Concepts", "Initial designs / drafts", "TBD", "—"],
                    [`Phase 3 — Revisions (${pc.revisionsIncluded})`, "Refined designs per feedback", "TBD", "—"],
                    ["Phase 4 — Approval", "Client written sign-off", "TBD", "—"],
                    ["Phase 5 — Delivery", "All final files delivered", pc.endDate ? fmtDate(pc.endDate) : "TBD", `${100 - pc.depositPercent}% — ${pc.currency} ${bal}`],
                  ].map(([ph, dl, du, pay]) => (
                    <tr key={ph}><td style={s.td}>{ph}</td><td style={s.td}>{dl}</td><td style={s.td}>{du}</td><td style={s.td}>{pay}</td></tr>
                  ))}
                </tbody>
              </table>

              {/* 5. Revisions */}
              <div style={s.h2}>5. Revision Policy</div>
              <table style={s.tbl}>
                <thead><tr><th style={s.th}>Item</th><th style={s.th}>Terms</th></tr></thead>
                <tbody>
                  <tr><td style={s.td}>Included Revisions</td><td style={s.td}>{pc.revisionsIncluded} rounds per deliverable</td></tr>
                  <tr><td style={s.td}>Additional Revisions</td><td style={s.td}>{pc.currency} {pc.revisionRate} per additional round</td></tr>
                  <tr><td style={s.td}>New Design Direction</td><td style={s.td}>Treated as a new project — re-quoted separately</td></tr>
                </tbody>
              </table>

              {/* 6. Payment */}
              <div style={s.h2}>6. Payment Terms</div>
              <div style={s.payGrid}>
                <div style={s.payBox}><div style={s.payLbl}>Deposit Due at Signing</div><div style={s.payAmt}>{pc.currency} {dep}</div><div style={s.payNote}>{pc.depositPercent}% — Work begins only after received</div></div>
                <div style={s.payBox}><div style={s.payLbl}>Balance Due at Delivery</div><div style={s.payAmt}>{pc.currency} {bal}</div><div style={s.payNote}>{100 - pc.depositPercent}% — Paid before final files released</div></div>
              </div>
              <div style={s.grid}>
                <div style={s.cell}><div style={s.lbl}>Payment Account</div><div style={s.val}>{pc.paymentAccount}</div></div>
                <div style={s.cell}><div style={s.lbl}>Institution</div><div style={s.val}>{pc.paymentInstitution}</div></div>
                <div style={{ ...s.cell, ...s.full }}><div style={s.lbl}>Beneficiary</div><div style={s.val}>{pc.paymentBeneficiary}</div></div>
              </div>

              {/* 7. IP */}
              <div style={s.h2}>7. Intellectual Property</div>
              <div style={s.badgeRow}>
                <span style={pc.portfolioRights ? s.badgeY : s.badgeN}>{pc.portfolioRights ? "✓" : "✗"} CGY Portfolio Rights</span>
                <span style={pc.sourceFilesIncluded ? s.badgeY : s.badgeN}>{pc.sourceFilesIncluded ? "✓" : "✗"} Source Files Included</span>
                <span style={pc.exclusivity ? s.badgeY : s.badgeN}>{pc.exclusivity ? "✓" : "✗"} Exclusive License</span>
              </div>
              <div style={s.clauseTitle}>License Upon Full Payment</div>
              <div style={s.clauseText}>{pc.licenseType} license granted to the Client upon receipt of full payment.</div>
              <div style={s.clauseText}>All designs remain CGY's intellectual property until full payment is confirmed.</div>

              {/* 8. Terms */}
              <div style={s.h2}>8. General Terms</div>
              {[
                ["Cancellation", `Deposit is non-refundable if Client cancels after work begins. After concepts delivered: 75% of total rate. Near completion: 100% of total rate.`],
                ["Late Payment", `Payments overdue by 7+ days incur GHS 50 / USD 5 per day. Final files withheld until paid in full.`],
                ["Client Responsibilities", `Provide all content before work begins. Consolidated feedback within 5 business days of each submission. Do not share draft designs publicly before final approval.`],
                ["Confidentiality", `Both parties keep all proprietary information confidential throughout the project.`],
                ["Governing Law", `This Agreement is governed by the laws of Ghana. Disputes resolved by good-faith communication first, then mediation.`],
              ].map(([title, text]) => (
                <div key={title}><div style={s.clauseTitle}>{title}</div><div style={s.clauseText}>{text}</div></div>
              ))}

              {/* Signatures */}
              <div style={s.h2}>Signatures &amp; Agreement</div>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 16 }}>By signing below, both parties confirm they have fully read, understood, and agreed to all terms.</div>
              <div style={s.sigGrid}>
                <div style={s.sigTop}>
                  <div style={s.sigLbl}>Designer — Curio Graphics Yard</div>
                  <img src={signUrl} alt="Signature" style={{ height: 56, width: "auto", objectFit: "contain", marginBottom: 4, display: "block" }} />
                  <div style={s.sigFld}>Signature</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>David Amo</div>
                  <div style={s.sigFld}>Printed Name</div>
                  <div style={{ fontSize: 11, marginBottom: 4 }}>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                  <div style={s.sigFld}>Date</div>
                </div>
                <div style={s.sigTop}>
                  <div style={s.sigLbl}>Client</div>
                  <div style={s.sigLine}></div><div style={s.sigFld}>Signature</div>
                  <div style={s.sigLine}></div><div style={s.sigFld}>Printed Name</div>
                  <div style={s.sigLine}></div><div style={s.sigFld}>Date</div>
                </div>
              </div>
              <div style={s.ftr}>
                Curio Graphics Yard — A Creative Design Studio Amplifying Fashion and Music through Inspired Design.<br/>
                Contract #{pc.contractNumber} • Both parties retain a signed copy for their records.
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}