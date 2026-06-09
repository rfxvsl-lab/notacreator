'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { 
  DocumentData, InvoiceItem, 
  formatCurrency, formatDate, CompanySettings
} from '@/lib/docStore';
import { getDocAction, saveDocAction, getSettingsAction } from '@/lib/actions';
import { Plus, Trash2, ArrowLeft, Printer, RefreshCw, Save, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useSession } from 'next-auth/react';

export default function FakturPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const id = resolvedParams.id;
  const { status } = useSession();
  
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const [isPrintMode, setIsPrintMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('print') === 'true';
    }
    return false;
  });

  useEffect(() => {
    let mounted = true;
    const loadDoc = async () => {
      if (status !== 'authenticated') return;
      if (!mounted) return;
      
      const settings = await getSettingsAction();
      if (mounted) setCompanySettings(settings);

      const existingDoc = await getDocAction(id);
      if (!mounted) return;

      if (existingDoc && existingDoc.type === 'faktur') {
        setDoc(existingDoc);
      } else if (existingDoc) {
        router.replace('/'); 
      } else {
        // Initialize new
        setDoc({
          id,
          type: 'faktur',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          docNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          date: new Date().toISOString().split('T')[0],
          customerName: '',
          customerAddress: '',
          items: [{ id: uuidv4(), description: '', quantity: 1, price: 0, total: 0 }],
          subtotal: 0,
          discount: 0,
          tax: 0,
          totalAmount: 0,
          notes: 'Terima kasih atas kepercayaan Anda.'
        });
      }
    };
    loadDoc();
    return () => { mounted = false; };
  }, [id, router, status]);

  const calculateTotals = (currentDoc: DocumentData) => {
    const items = currentDoc.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subtotal - (currentDoc.discount || 0)) * ((currentDoc.tax || 0) / 100);
    const grandTotal = subtotal - (currentDoc.discount || 0) + taxAmount;
    let totalAmount = grandTotal;

    if (currentDoc.downPayment) {
      if (currentDoc.isDpBilling) {
        totalAmount = currentDoc.downPayment;
      } else {
        totalAmount = grandTotal - currentDoc.downPayment;
      }
    }
    
    return { ...currentDoc, subtotal, totalAmount };
  };

  const handleDocChange = (field: keyof DocumentData, value: any) => {
    if (!doc) return;
    setDoc(prev => prev ? calculateTotals({ ...prev, [field]: value }) : prev);
  };

  const handleImageUpload = (field: 'signatureImage' | 'stampImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size < 2MB to prevent DB bloating
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleDocChange(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: any) => {
    if (!doc) return;
    setDoc(prev => {
      if (!prev) return prev;
      const newItems = prev.items?.map(item => {
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
    if (!doc) return;
    setDoc(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: [...(prev.items || []), { id: uuidv4(), description: '', quantity: 1, price: 0, total: 0 }]
      };
    });
  };

  const removeItem = (itemId: string) => {
    if (!doc) return;
    setDoc(prev => {
      if (!prev) return prev;
      const newItems = prev.items?.filter(item => item.id !== itemId);
      return calculateTotals({ ...prev, items: newItems });
    });
  };

  const handleSave = async () => {
    if (!doc) return;
    await saveDocAction(doc);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (!doc || !companySettings) return null;

  if (isPrintMode) {
    const grandTotal = (doc.subtotal || 0) - (doc.discount || 0) + (((doc.subtotal || 0) - (doc.discount || 0)) * ((doc.tax || 0) / 100));

    return (
      <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white">
        <div className="print:hidden fixed bottom-6 right-6 flex gap-3 shadow-2xl bg-white p-3 rounded-2xl border border-gray-200 z-50">
          <button 
             onClick={() => window.close()}
             className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors"
          >
            Tutup Tab
          </button>
          <button 
             onClick={() => window.print()}
             className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md flex items-center gap-2 transition-transform active:scale-95"
          >
             <Printer size={18} />
             Cetak / Simpan PDF
          </button>
        </div>

        <div className="bg-white max-w-[210mm] mx-auto min-h-[297mm] p-[15mm] text-slate-900 shadow-lg print:shadow-none">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-brand-900 mb-2 font-outfit">
                {doc.isDpBilling ? "FAKTUR (DOWN PAYMENT)" : "FAKTUR"}
              </h1>
              <p className="text-slate-500 font-medium tracking-widest">{doc.docNumber}</p>
            </div>
            <div className="text-right">
              <h2 className="font-bold text-xl mb-1 text-slate-800">{companySettings.name}</h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{companySettings.address}</p>
              {companySettings.phone && <p className="text-sm text-slate-600">{companySettings.phone}</p>}
              {companySettings.email && <p className="text-sm text-slate-600">{companySettings.email}</p>}
            </div>
          </div>

          <div className="flex justify-between mb-12 border-t-2 border-brand-100 pt-8">
            <div className="w-1/2">
              <p className="text-xs font-bold text-brand-600 mb-2 uppercase tracking-widest">Ditagihkan Kepada:</p>
              <h3 className="font-bold text-xl text-slate-800 mb-1">{doc.customerName || '-'}</h3>
              <p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">{doc.customerAddress || '-'}</p>
            </div>
            <div className="w-1/2 text-right">
              <div className="mb-4">
                <p className="text-xs font-bold text-brand-600 mb-1 uppercase tracking-widest">Tanggal Faktur</p>
                <p className="font-medium text-slate-800">{formatDate(doc.date)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-brand-600 mb-1 uppercase tracking-widest">Total Tagihan</p>
                <p className="font-bold text-3xl text-brand-600 tracking-tight">{formatCurrency(doc.totalAmount || 0)}</p>
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
              {(doc.items || []).map((item) => (
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
                {doc.signatureLocation && <p className="text-sm text-slate-800 mb-8">{doc.signatureLocation}, {formatDate(doc.date)}</p>}
                {!doc.signatureLocation && <p className="text-sm text-slate-800 mb-8">&nbsp;</p>}
                
                <div className="relative h-24 w-48 flex justify-center items-center mx-auto">
                  {doc.signatureImage && (
                    <img 
                      src={doc.signatureImage} 
                      alt="Tanda Tangan" 
                      className="max-h-24 max-w-full object-contain absolute z-10"
                    />
                  )}
                  {doc.stampImage && (
                    <img 
                      src={doc.stampImage} 
                      alt="Stempel" 
                      className="max-h-32 max-w-32 object-contain absolute z-0 opacity-80 mix-blend-multiply"
                      style={{ transform: 'rotate(-5deg) translate(-20px, -10px)' }}
                    />
                  )}
                  {!doc.signatureImage && <div className="h-24 w-full"></div>}
                </div>
                
                {doc.signatureName && (
                  <div className="mt-2">
                    <p className="font-bold text-slate-800 text-sm border-b border-slate-800 inline-block px-4 pb-1">{doc.signatureName}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="w-1/2 max-w-sm">
              <div className="flex justify-between py-2 items-center">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="font-semibold text-slate-800">{formatCurrency(doc.subtotal || 0)}</span>
              </div>
              {doc.discount !== undefined && doc.discount > 0 && (
                <div className="flex justify-between py-2 items-center">
                  <span className="text-slate-500 font-medium">Diskon</span>
                  <span className="font-semibold text-rose-600">-{formatCurrency(doc.discount || 0)}</span>
                </div>
              )}
              {doc.tax !== undefined && doc.tax > 0 && (
                <div className="flex justify-between py-2 items-center border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Pajak ({doc.tax}%)</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(((doc.subtotal || 0) - (doc.discount || 0)) * (doc.tax / 100))}
                  </span>
                </div>
              )}
              
              {doc.downPayment !== undefined && doc.downPayment > 0 && (
                <>
                  <div className="flex justify-between py-2 items-center border-t border-slate-200 mt-2">
                    <span className="text-slate-500 font-medium">Total Harga</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 items-center">
                    <span className="text-slate-500 font-bold text-brand-600">{doc.isDpBilling ? "Uang Muka (Ditagihkan)" : "Uang Muka (Sudah Dibayar)"}</span>
                    <span className="font-semibold text-slate-800">
                      {doc.isDpBilling ? formatCurrency(doc.downPayment) : `-${formatCurrency(doc.downPayment)}`}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between py-4 items-center bg-slate-50 px-4 rounded-lg mt-2 border border-slate-200">
                <span className="font-bold text-slate-800 text-lg">{doc.isDpBilling ? "Total Tagihan DP" : "Sisa Tagihan"}</span>
                <span className="font-bold text-brand-600 text-xl tracking-tight">{formatCurrency(doc.totalAmount || 0)}</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Catatan Tambahan</p>
            <p className="text-slate-600 text-sm whitespace-pre-wrap font-medium">{doc.notes}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">
          <ArrowLeft size={16} className="mr-1.5" /> Kembali ke Dashboard
        </Link>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={async () => {
              await handleSave();
              window.open(`/${doc.type}/${id}?print=true`, '_blank');
              router.push('/');
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            <Printer size={16} />
            Simpan & Cetak
          </button>
          <button
            onClick={handleSave}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {isSaved ? 'Tersimpan!' : 'Simpan Faktur'}
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="bg-brand-50/50 px-6 py-4 border-b border-brand-100/50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-900 font-outfit">Editor Faktur</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white text-brand-600 rounded-full border border-brand-100 shadow-sm">{doc.docNumber}</span>
        </div>
        
        <div className="p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5 bg-white/60 p-5 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Detail Dokumen</h3>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nomor Faktur</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={doc.docNumber}
                    onChange={(e) => handleDocChange('docNumber', e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm transition-all"
                  />
                  <button 
                    onClick={() => handleDocChange('docNumber', `INV-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`)}
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
                  value={doc.date}
                  onChange={(e) => handleDocChange('date', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-5 bg-white/60 p-5 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Ditagihkan Kepada</h3>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Pelanggan / Perusahaan</label>
                <input
                  type="text"
                  value={doc.customerName || ''}
                  onChange={(e) => handleDocChange('customerName', e.target.value)}
                  placeholder="PT. Contoh Sukses"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alamat Pelanggan</label>
                <textarea
                  value={doc.customerAddress || ''}
                  onChange={(e) => handleDocChange('customerAddress', e.target.value)}
                  rows={3}
                  placeholder="Alamat lengkap tujuan penagihan"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm resize-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-5 bg-white/60 p-5 rounded-xl border border-slate-100">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Tanda Tangan</h3>
               <div className="flex gap-4">
                 <div className="flex-1">
                   <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Penandatangan</label>
                   <input
                     type="text"
                     value={doc.signatureName || ''}
                     onChange={(e) => handleDocChange('signatureName', e.target.value)}
                     placeholder="John Doe"
                     className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm"
                   />
                 </div>
                 <div className="flex-1">
                   <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lokasi (Kota)</label>
                   <input
                     type="text"
                     value={doc.signatureLocation || ''}
                     onChange={(e) => handleDocChange('signatureLocation', e.target.value)}
                     placeholder="Jakarta"
                     className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm"
                   />
                 </div>
               </div>
               
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gambar Tanda Tangan (PNG Transparan)</label>
                 {doc.signatureImage ? (
                   <div className="relative inline-block border border-slate-200 rounded-lg p-2 bg-slate-50">
                     <img src={doc.signatureImage} alt="TTD" className="h-16 object-contain" />
                     <button onClick={() => handleDocChange('signatureImage', null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-sm"><Trash2 size={12}/></button>
                   </div>
                 ) : (
                   <input type="file" accept="image/*" onChange={(e) => handleImageUpload('signatureImage', e)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 transition-colors" />
                 )}
               </div>
             </div>

             <div className="space-y-5 bg-white/60 p-5 rounded-xl border border-slate-100">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Stempel Perusahaan</h3>
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gambar Stempel (PNG Transparan)</label>
                 {doc.stampImage ? (
                   <div className="relative inline-block border border-slate-200 rounded-lg p-2 bg-slate-50">
                     <img src={doc.stampImage} alt="Stempel" className="h-16 object-contain mix-blend-multiply" />
                     <button onClick={() => handleDocChange('stampImage', null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-sm"><Trash2 size={12}/></button>
                   </div>
                 ) : (
                   <input type="file" accept="image/*" onChange={(e) => handleImageUpload('stampImage', e)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 transition-colors" />
                 )}
               </div>
               <p className="text-xs text-slate-500 mt-2">Gambar stempel akan otomatis ditempatkan sedikit melayang di atas tanda tangan untuk kesan profesional.</p>
             </div>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4 font-outfit">Daftar Barang / Jasa</h3>
            
            <div className="space-y-3">
              {(doc.items || []).map((item, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  key={item.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-brand-300 transition-colors group"
                >
                  <div className="w-full sm:flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">Deskripsi</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      placeholder="Nama barang atau jasa..."
                      className="w-full px-3 py-2 bg-transparent border-b border-transparent focus:border-brand-500 focus:outline-none sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-colors"
                    />
                  </div>
                  <div className="flex w-full sm:w-auto gap-3">
                    <div className="w-24">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">Kuantitas</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm text-center font-medium"
                      />
                    </div>
                    <div className="flex-1 sm:w-40">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">Harga</label>
                      <input
                        type="number"
                        min="0"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))}
                        placeholder="Harga satuan"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm text-right font-medium"
                      />
                    </div>
                    <div className="w-36 hidden sm:flex items-center justify-end font-bold text-brand-600 text-base">
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
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
            >
              <Plus size={16} strokeWidth={3} /> Tambah Baris
            </button>
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-8 border-t border-slate-200 pt-8 mt-4">
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan / Keterangan</label>
                <textarea
                  value={doc.notes || ''}
                  onChange={(e) => handleDocChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Instruksi pembayaran, ucapan terima kasih, dll."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm resize-none transition-all"
                />
              </div>
            </div>
            
            <div className="w-full md:w-80 space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-bl-full -z-10 opacity-50"></div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-semibold">Subtotal</span>
                <span className="font-bold text-slate-900">{formatCurrency(doc.subtotal || 0)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm gap-4">
                <span className="text-slate-500 font-semibold whitespace-nowrap">Diskon (Rp)</span>
                <input
                  type="number"
                  min="0"
                  value={doc.discount || ''}
                  onChange={(e) => handleDocChange('discount', Number(e.target.value))}
                  className="w-32 px-3 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                />
              </div>
              
              <div className="flex justify-between items-center text-sm gap-4">
                <span className="text-slate-500 font-semibold whitespace-nowrap">Pajak (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={doc.tax || ''}
                  onChange={(e) => handleDocChange('tax', Number(e.target.value))}
                  className="w-32 px-3 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                />
              </div>

              <div className="flex justify-between items-center text-sm gap-4 border-t border-slate-100 pt-3 mt-1">
                <span className="text-slate-500 font-semibold whitespace-nowrap">Down Payment (Rp)</span>
                <input
                  type="number"
                  min="0"
                  value={doc.downPayment || ''}
                  onChange={(e) => handleDocChange('downPayment', Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-3 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                />
              </div>

              <div className="flex justify-between items-center text-sm gap-4">
                <span className="text-slate-500 font-medium text-xs leading-tight pr-2">Penagihan invoice ini khusus untuk DP?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={!!doc.isDpBilling}
                    onChange={(e) => handleDocChange('isDpBilling', e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>
              
              <div className="border-t-2 border-brand-100 pt-4 mt-2 flex justify-between items-center">
                <span className="font-bold text-slate-900 uppercase tracking-widest text-sm">Total</span>
                <span className="font-bold text-2xl text-brand-600 tracking-tight">{formatCurrency(doc.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

