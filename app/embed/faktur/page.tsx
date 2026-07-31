'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import {
  Building2, FileText, Eye, ArrowRight, ArrowLeft, Plus, Trash2,
  RefreshCw, Save, CheckCircle2, Printer, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Types ──
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface FakturData {
  id: string;
  type: 'faktur';
  createdAt: number;
  updatedAt: number;
  docNumber: string;
  date: string;
  customerName: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  downPayment: number;
  isDpBilling: boolean;
  totalAmount: number;
  notes: string;
  signatureName: string;
  signatureLocation: string;
  signatureImage: string | null;
  stampImage: string | null;
}

// ── Helpers ──
const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr));
};

// ── Step indicators ──
const steps = [
  { id: 1, label: 'Profil Perusahaan', icon: Building2 },
  { id: 2, label: 'Detail Faktur', icon: FileText },
  { id: 3, label: 'Preview & Cetak', icon: Eye },
];

import { Suspense } from 'react';

function EmbedFakturForm() {
  const searchParams = useSearchParams();
  const [isPrefilledFromUrl, setIsPrefilledFromUrl] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  // Company profile state
  const [company, setCompany] = useState<CompanyProfile>({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  // Read company profile from URL query params on mount
  // URL format: /embed/faktur?name=PT+Contoh&address=Jl+Contoh&phone=08123&email=info@contoh.com
  useEffect(() => {
    const urlName = searchParams.get('name');
    const urlAddress = searchParams.get('address');
    const urlPhone = searchParams.get('phone');
    const urlEmail = searchParams.get('email');

    if (urlName) {
      setCompany({
        name: urlName,
        address: urlAddress || '',
        phone: urlPhone || '',
        email: urlEmail || '',
      });
      // Auto-skip to Step 2 since profile is pre-filled
      setIsPrefilledFromUrl(true);
      setCurrentStep(2);
    }
  }, [searchParams]);

  // Faktur state
  const [faktur, setFaktur] = useState<FakturData>({
    id: uuidv4(),
    type: 'faktur',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    docNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerAddress: '',
    items: [{ id: uuidv4(), description: '', quantity: 1, price: 0, total: 0 }],
    subtotal: 0,
    discount: 0,
    tax: 0,
    downPayment: 0,
    isDpBilling: false,
    totalAmount: 0,
    notes: 'Terima kasih atas kepercayaan Anda.',
    signatureName: '',
    signatureLocation: '',
    signatureImage: null,
    stampImage: null,
  });

  // ── Calculation ──
  const calculateTotals = (doc: FakturData): FakturData => {
    const items = doc.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subtotal - (doc.discount || 0)) * ((doc.tax || 0) / 100);
    const grandTotal = subtotal - (doc.discount || 0) + taxAmount;
    let totalAmount = grandTotal;

    if (doc.downPayment) {
      if (doc.isDpBilling) {
        totalAmount = doc.downPayment;
      } else {
        totalAmount = grandTotal - doc.downPayment;
      }
    }

    return { ...doc, subtotal, totalAmount };
  };

  const handleFakturChange = (field: keyof FakturData, value: any) => {
    setFaktur(prev => calculateTotals({ ...prev, [field]: value }));
  };

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setFaktur(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'price') {
            updatedItem.total = updatedItem.quantity * updatedItem.price;
          }
          return updatedItem;
        }
        return item;
      });
      return calculateTotals({ ...prev, items: newItems });
    });
  };

  const addItem = () => {
    setFaktur(prev => ({
      ...prev,
      items: [...prev.items, { id: uuidv4(), description: '', quantity: 1, price: 0, total: 0 }],
    }));
  };

  const removeItem = (itemId: string) => {
    setFaktur(prev => calculateTotals({ ...prev, items: prev.items.filter(i => i.id !== itemId) }));
  };

  const handleImageUpload = (field: 'signatureImage' | 'stampImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => handleFakturChange(field, reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Save to API ──
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...faktur,
        // Embed company info into notes metadata (stored alongside document)
        // The company info will be used for printing
        _companyProfile: company,
        // Optional user ID to associate document with a QuickNota account
        userId: searchParams.get('uid') || undefined,
      };

      const res = await fetch('/api/embed/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsSaved(true);
        setSavedDocId(data.id);
        setCurrentStep(3);

        // Send postMessage to parent window (for websites embedding this iframe)
        // This allows the embedding website to capture the data for their own database
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'quicknota-embed-saved',
            data: {
              id: data.id,
              companyProfile: company,
              document: {
                ...faktur,
                id: data.id,
              },
            },
          }, '*');
        }
      } else {
        alert('Gagal menyimpan dokumen. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const grandTotal = (faktur.subtotal || 0) - (faktur.discount || 0) + (((faktur.subtotal || 0) - (faktur.discount || 0)) * ((faktur.tax || 0) / 100));

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Stepper Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
                <FileText size={16} />
              </div>
              <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 font-outfit hidden sm:inline">
                QuickNota
              </span>
            </div>

            {/* Steps */}
            <div className="flex items-center gap-1 sm:gap-2">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => {
                        if (isCompleted) setCurrentStep(step.id);
                      }}
                      className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-700'
                          : isCompleted
                            ? 'text-emerald-600 hover:bg-emerald-50 cursor-pointer'
                            : 'text-slate-400'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-indigo-500 text-white'
                          : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isCompleted ? '✓' : step.id}
                      </div>
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>
                    {idx < steps.length - 1 && (
                      <div className={`w-4 sm:w-8 h-0.5 mx-1 rounded-full ${
                        currentStep > step.id ? 'bg-emerald-300' : 'bg-slate-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {/* ═══════════════ STEP 1: Company Profile ═══════════════ */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl mb-4 shadow-sm">
                    <Building2 size={28} className="text-indigo-600" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 font-outfit mb-2">
                    Profil Perusahaan
                  </h1>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Masukkan informasi perusahaan Anda yang akan tampil di header faktur.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Nama Perusahaan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={company.name}
                      onChange={e => setCompany(p => ({ ...p, name: e.target.value }))}
                      placeholder="PT. Contoh Sukses Makmur"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Alamat Perusahaan <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={company.address}
                      onChange={e => setCompany(p => ({ ...p, address: e.target.value }))}
                      placeholder="Jl. Sudirman No. 123&#10;Kota Jakarta, 12345"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telepon</label>
                      <input
                        type="text"
                        value={company.phone}
                        onChange={e => setCompany(p => ({ ...p, phone: e.target.value }))}
                        placeholder="08123456789"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={company.email}
                        onChange={e => setCompany(p => ({ ...p, email: e.target.value }))}
                        placeholder="info@perusahaan.com"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => {
                      if (!company.name.trim()) {
                        alert('Nama perusahaan wajib diisi.');
                        return;
                      }
                      if (!company.address.trim()) {
                        alert('Alamat perusahaan wajib diisi.');
                        return;
                      }
                      setCurrentStep(2);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                  >
                    Lanjut ke Faktur <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════ STEP 2: Invoice Editor ═══════════════ */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 font-outfit mb-1">Editor Faktur</h1>
                <p className="text-slate-500 text-sm">Isi detail faktur Anda, lalu simpan dan preview.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-indigo-50/50 px-6 py-3 border-b border-indigo-100/50 flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-800 font-outfit flex items-center gap-2">
                    <FileText size={16} /> Faktur dari {company.name}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-white text-indigo-600 rounded-full border border-indigo-100 shadow-sm">
                    {faktur.docNumber}
                  </span>
                </div>

                <div className="p-6 sm:p-8 space-y-8">
                  {/* Doc details + Customer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Detail Dokumen</h3>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nomor Faktur</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={faktur.docNumber}
                            onChange={e => handleFakturChange('docNumber', e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all"
                          />
                          <button
                            onClick={() => handleFakturChange('docNumber', `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`)}
                            className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Generate Acak"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal</label>
                        <input
                          type="date"
                          value={faktur.date}
                          onChange={e => handleFakturChange('date', e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-5 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Ditagihkan Kepada</h3>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Pelanggan / Perusahaan</label>
                        <input
                          type="text"
                          value={faktur.customerName}
                          onChange={e => handleFakturChange('customerName', e.target.value)}
                          placeholder="PT. Contoh Sukses"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alamat Pelanggan</label>
                        <textarea
                          value={faktur.customerAddress}
                          onChange={e => handleFakturChange('customerAddress', e.target.value)}
                          rows={3}
                          placeholder="Alamat lengkap tujuan penagihan"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm resize-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Signature & Stamp */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Tanda Tangan</h3>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Penandatangan</label>
                          <input
                            type="text"
                            value={faktur.signatureName}
                            onChange={e => handleFakturChange('signatureName', e.target.value)}
                            placeholder="John Doe"
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lokasi (Kota)</label>
                          <input
                            type="text"
                            value={faktur.signatureLocation}
                            onChange={e => handleFakturChange('signatureLocation', e.target.value)}
                            placeholder="Jakarta"
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gambar Tanda Tangan (PNG Transparan)</label>
                        {faktur.signatureImage ? (
                          <div className="relative inline-block border border-slate-200 rounded-lg p-2 bg-slate-50">
                            <img src={faktur.signatureImage} alt="TTD" className="h-16 object-contain" />
                            <button onClick={() => handleFakturChange('signatureImage', null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-sm">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <input type="file" accept="image/*" onChange={e => handleImageUpload('signatureImage', e)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-5 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Stempel Perusahaan</h3>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gambar Stempel (PNG Transparan)</label>
                        {faktur.stampImage ? (
                          <div className="relative inline-block border border-slate-200 rounded-lg p-2 bg-slate-50">
                            <img src={faktur.stampImage} alt="Stempel" className="h-16 object-contain mix-blend-multiply" />
                            <button onClick={() => handleFakturChange('stampImage', null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-sm">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <input type="file" accept="image/*" onChange={e => handleImageUpload('stampImage', e)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Gambar stempel akan otomatis ditempatkan sedikit melayang di atas tanda tangan.</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4 font-outfit">
                      Daftar Barang / Jasa
                    </h3>

                    <div className="space-y-3">
                      {faktur.items.map((item) => (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={item.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group"
                        >
                          <div className="w-full sm:flex-1">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">Deskripsi</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                              placeholder="Nama barang atau jasa..."
                              className="w-full px-3 py-2 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-colors"
                            />
                          </div>
                          <div className="flex w-full sm:w-auto gap-3">
                            <div className="w-24">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">Kuantitas</label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity || ''}
                                onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm text-center font-medium"
                              />
                            </div>
                            <div className="flex-1 sm:w-40">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">Harga</label>
                              <input
                                type="number"
                                min="0"
                                value={item.price || ''}
                                onChange={e => handleItemChange(item.id, 'price', Number(e.target.value))}
                                placeholder="Harga satuan"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm text-right font-medium"
                              />
                            </div>
                            <div className="w-36 hidden sm:flex items-center justify-end font-bold text-indigo-600 text-base">
                              {formatCurrency(item.total)}
                            </div>
                            <div className="flex items-center sm:pt-0 pt-6">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus baris"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <button
                      onClick={addItem}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <Plus size={16} strokeWidth={3} /> Tambah Baris
                    </button>
                  </div>

                  {/* Notes + Summary */}
                  <div className="flex flex-col md:flex-row justify-between gap-8 border-t border-slate-200 pt-8 mt-4">
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan / Keterangan</label>
                        <textarea
                          value={faktur.notes}
                          onChange={e => handleFakturChange('notes', e.target.value)}
                          rows={4}
                          placeholder="Instruksi pembayaran, ucapan terima kasih, dll."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm resize-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="w-full md:w-80 space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 opacity-50"></div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-semibold">Subtotal</span>
                        <span className="font-bold text-slate-900">{formatCurrency(faktur.subtotal)}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm gap-4">
                        <span className="text-slate-500 font-semibold whitespace-nowrap">Diskon (Rp)</span>
                        <input
                          type="number"
                          min="0"
                          value={faktur.discount || ''}
                          onChange={e => handleFakturChange('discount', Number(e.target.value))}
                          className="w-32 px-3 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        />
                      </div>

                      <div className="flex justify-between items-center text-sm gap-4">
                        <span className="text-slate-500 font-semibold whitespace-nowrap">Pajak (%)</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={faktur.tax || ''}
                          onChange={e => handleFakturChange('tax', Number(e.target.value))}
                          className="w-32 px-3 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        />
                      </div>

                      <div className="flex justify-between items-center text-sm gap-4 border-t border-slate-100 pt-3 mt-1">
                        <span className="text-slate-500 font-semibold whitespace-nowrap">Down Payment (Rp)</span>
                        <input
                          type="number"
                          min="0"
                          value={faktur.downPayment || ''}
                          onChange={e => handleFakturChange('downPayment', Number(e.target.value))}
                          placeholder="0"
                          className="w-32 px-3 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        />
                      </div>

                      <div className="flex justify-between items-center text-sm gap-4">
                        <span className="text-slate-500 font-medium text-xs leading-tight pr-2">Penagihan invoice ini khusus untuk DP?</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={faktur.isDpBilling}
                            onChange={e => handleFakturChange('isDpBilling', e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                        </label>
                      </div>

                      <div className="border-t-2 border-indigo-100 pt-4 mt-2 flex justify-between items-center">
                        <span className="font-bold text-slate-900 uppercase tracking-widest text-sm">Total</span>
                        <span className="font-bold text-2xl text-indigo-600 tracking-tight">{formatCurrency(faktur.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center mt-6">
                {isPrefilledFromUrl ? (
                  <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                    <Building2 size={14} /> {company.name}
                  </div>
                ) : (
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    <ArrowLeft size={16} /> Kembali
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-60"
                >
                  {isSaving ? (
                    <><RefreshCw size={16} className="animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Save size={16} /> Simpan & Preview</>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════ STEP 3: Preview / Print ═══════════════ */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              {/* Success banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-center gap-3"
              >
                <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-emerald-800 font-semibold text-sm">Faktur berhasil disimpan!</p>
                  <p className="text-emerald-600 text-xs mt-0.5">Anda bisa mencetak atau menyimpan sebagai PDF di bawah ini.</p>
                </div>
              </motion.div>

              {/* Print controls */}
              <div className="hidden-print flex justify-between items-center mb-6">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft size={16} /> Edit Kembali
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Reset all state for new faktur
                      setFaktur({
                        id: uuidv4(),
                        type: 'faktur',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        docNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                        date: new Date().toISOString().split('T')[0],
                        customerName: '',
                        customerAddress: '',
                        items: [{ id: uuidv4(), description: '', quantity: 1, price: 0, total: 0 }],
                        subtotal: 0,
                        discount: 0,
                        tax: 0,
                        downPayment: 0,
                        isDpBilling: false,
                        totalAmount: 0,
                        notes: 'Terima kasih atas kepercayaan Anda.',
                        signatureName: '',
                        signatureLocation: '',
                        signatureImage: null,
                        stampImage: null,
                      });
                      setIsSaved(false);
                      setSavedDocId(null);
                      setCurrentStep(1);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm"
                  >
                    <Sparkles size={16} /> Buat Faktur Baru
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all active:scale-95"
                  >
                    <Printer size={16} /> Cetak / Simpan PDF
                  </button>
                </div>
              </div>

              {/* Faktur Preview */}
              <div className="bg-white max-w-[210mm] mx-auto min-h-[297mm] p-[15mm] text-slate-900 shadow-lg print:shadow-none rounded-xl print:rounded-none border border-slate-200 print:border-0">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight text-indigo-900 mb-2 font-outfit">
                      {faktur.isDpBilling ? 'FAKTUR (DOWN PAYMENT)' : 'FAKTUR'}
                    </h1>
                    <p className="text-slate-500 font-medium tracking-widest">{faktur.docNumber}</p>
                  </div>
                  <div className="text-right">
                    <h2 className="font-bold text-xl mb-1 text-slate-800">{company.name}</h2>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{company.address}</p>
                    {company.phone && <p className="text-sm text-slate-600">{company.phone}</p>}
                    {company.email && <p className="text-sm text-slate-600">{company.email}</p>}
                  </div>
                </div>

                <div className="flex justify-between mb-12 border-t-2 border-indigo-100 pt-8">
                  <div className="w-1/2">
                    <p className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-widest">Ditagihkan Kepada:</p>
                    <h3 className="font-bold text-xl text-slate-800 mb-1">{faktur.customerName || '-'}</h3>
                    <p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">{faktur.customerAddress || '-'}</p>
                  </div>
                  <div className="w-1/2 text-right">
                    <div className="mb-4">
                      <p className="text-xs font-bold text-indigo-600 mb-1 uppercase tracking-widest">Tanggal Faktur</p>
                      <p className="font-medium text-slate-800">{formatDate(faktur.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-600 mb-1 uppercase tracking-widest">Total Tagihan</p>
                      <p className="font-bold text-3xl text-indigo-600 tracking-tight">{formatCurrency(faktur.totalAmount)}</p>
                    </div>
                  </div>
                </div>

                <table className="w-full mb-8 text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800">
                      <th className="py-3 px-2 font-bold text-slate-800 w-full text-sm uppercase">Deskripsi Barang / Jasa</th>
                      <th className="py-3 px-2 font-bold text-slate-800 text-center whitespace-nowrap text-sm uppercase">Qty</th>
                      <th className="py-3 px-2 font-bold text-slate-800 text-right whitespace-nowrap text-sm uppercase">Harga Satuan</th>
                      <th className="py-3 px-2 font-bold text-slate-800 text-right whitespace-nowrap text-sm uppercase">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faktur.items.map(item => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-4 px-2 text-slate-800 font-medium">{item.description}</td>
                        <td className="py-4 px-2 text-slate-600 text-center">{item.quantity}</td>
                        <td className="py-4 px-2 text-slate-600 text-right">{formatCurrency(item.price)}</td>
                        <td className="py-4 px-2 text-slate-800 text-right font-bold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between mb-16">
                  <div className="w-1/2">
                    {/* Tanda Tangan & Stempel */}
                    <div className="mt-8 relative inline-block text-center">
                      {faktur.signatureLocation && <p className="text-sm text-slate-800 mb-8">{faktur.signatureLocation}, {formatDate(faktur.date)}</p>}
                      {!faktur.signatureLocation && <p className="text-sm text-slate-800 mb-8">&nbsp;</p>}

                      <div className="relative h-24 w-48 flex justify-center items-center mx-auto">
                        {faktur.signatureImage && (
                          <img
                            src={faktur.signatureImage}
                            alt="Tanda Tangan"
                            className="max-h-24 max-w-full object-contain absolute z-10"
                          />
                        )}
                        {faktur.stampImage && (
                          <img
                            src={faktur.stampImage}
                            alt="Stempel"
                            className="max-h-32 max-w-32 object-contain absolute z-0 opacity-80 mix-blend-multiply"
                            style={{ transform: 'rotate(-5deg) translate(-20px, -10px)' }}
                          />
                        )}
                        {!faktur.signatureImage && <div className="h-24 w-full"></div>}
                      </div>

                      {faktur.signatureName && (
                        <div className="mt-2">
                          <p className="font-bold text-slate-800 text-sm border-b border-slate-800 inline-block px-4 pb-1">{faktur.signatureName}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-1/2 max-w-sm">
                    <div className="flex justify-between py-2 items-center">
                      <span className="text-slate-500 font-medium">Subtotal</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(faktur.subtotal)}</span>
                    </div>
                    {faktur.discount > 0 && (
                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-500 font-medium">Diskon</span>
                        <span className="font-semibold text-rose-600">-{formatCurrency(faktur.discount)}</span>
                      </div>
                    )}
                    {faktur.tax > 0 && (
                      <div className="flex justify-between py-2 items-center border-b border-slate-200">
                        <span className="text-slate-500 font-medium">Pajak ({faktur.tax}%)</span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(((faktur.subtotal) - (faktur.discount)) * (faktur.tax / 100))}
                        </span>
                      </div>
                    )}

                    {faktur.downPayment > 0 && (
                      <>
                        <div className="flex justify-between py-2 items-center border-t border-slate-200 mt-2">
                          <span className="text-slate-500 font-medium">Total Harga</span>
                          <span className="font-semibold text-slate-800">{formatCurrency(grandTotal)}</span>
                        </div>
                        <div className="flex justify-between py-2 items-center">
                          <span className="text-slate-500 font-bold text-indigo-600">
                            {faktur.isDpBilling ? 'Uang Muka (Ditagihkan)' : 'Uang Muka (Sudah Dibayar)'}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {faktur.isDpBilling ? formatCurrency(faktur.downPayment) : `-${formatCurrency(faktur.downPayment)}`}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between py-4 items-center bg-slate-50 px-4 rounded-lg mt-2 border border-slate-200">
                      <span className="font-bold text-slate-800 text-lg">{faktur.isDpBilling ? 'Total Tagihan DP' : 'Sisa Tagihan'}</span>
                      <span className="font-bold text-indigo-600 text-xl tracking-tight">{formatCurrency(faktur.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-8 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Catatan Tambahan</p>
                  <p className="text-slate-600 text-sm whitespace-pre-wrap font-medium">{faktur.notes}</p>
                </div>
              </div>

              {/* Powered by footer */}
              <div className="text-center mt-6 hidden-print">
                <p className="text-xs text-slate-400">
                  Dibuat dengan{' '}
                  <a href="https://notacreator.rfx.web.id" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 font-semibold">
                    QuickNota
                  </a>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function EmbedFakturPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <EmbedFakturForm />
    </Suspense>
  );
}
