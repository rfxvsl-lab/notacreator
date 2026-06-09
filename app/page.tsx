'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { FileText, Receipt, Trash2, Edit, Printer, TrendingUp, Settings, X, Save } from 'lucide-react';
import { DocumentData, formatCurrency, formatDate, CompanySettings } from '@/lib/docStore';
import { getDocsAction, deleteDocAction, getSettingsAction, saveSettingsAction } from '@/lib/actions';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [docs, setDocs] = useState<DocumentData[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettingsState] = useState<CompanySettings>({ name: '', address: '', phone: '', email: '' });
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (status !== 'authenticated') return;
      try {
        const [dbDocs, dbSettings] = await Promise.all([getDocsAction(), getSettingsAction()]);
        if (mounted) {
          setDocs(dbDocs.sort((a, b) => b.updatedAt - a.updatedAt));
          setSettingsState(dbSettings);
        }
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [status]);

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      await deleteDocAction(id);
      const dbDocs = await getDocsAction();
      setDocs(dbDocs.sort((a, b) => b.updatedAt - a.updatedAt));
    }
  };

  const handleCreateNew = (type: 'faktur' | 'kwitansi') => {
    if (status !== 'authenticated') {
      alert("Silakan login terlebih dahulu untuk membuat dokumen.");
      return;
    }
    const id = uuidv4();
    router.push(`/${type}/${id}`);
  };

  const handleSaveSettings = async () => {
    await saveSettingsAction(settings);
    setIsSettingsOpen(false);
  };

  const totalRevenue = docs
    .filter(doc => doc.type === 'faktur')
    .reduce((sum, doc) => sum + (doc.totalAmount || 0), 0);

  const totalReceipts = docs
    .filter(doc => doc.type === 'kwitansi')
    .reduce((sum, doc) => sum + (doc.amountNumber || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full relative">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-outfit text-slate-800 tracking-tight mb-2">Dashboard</h1>
          <p className="text-slate-500 text-sm md:text-base max-w-xl leading-relaxed">
            Kelola faktur dan kwitansi Anda dengan desain yang elegan. Data Anda tersimpan aman.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Settings size={18} /> Profil Perusahaan
          </button>
          <button
            onClick={() => handleCreateNew('faktur')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-brand-500/20 active:scale-95"
          >
            <FileText size={18} /> Buat Faktur
          </button>
          <button
             onClick={() => handleCreateNew('kwitansi')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-accent-500/20 active:scale-95"
          >
            <Receipt size={18} /> Buat Kwitansi
          </button>
        </div>
      </motion.div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 hidden-print"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800 font-outfit flex items-center gap-2">
                  <Settings size={18} className="text-brand-500" /> Profil Perusahaan
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Perusahaan</label>
                  <input type="text" value={settings.name} onChange={(e) => setSettingsState({...settings, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alamat</label>
                  <textarea rows={2} value={settings.address} onChange={(e) => setSettingsState({...settings, address: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm resize-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telepon</label>
                    <input type="text" value={settings.phone} onChange={(e) => setSettingsState({...settings, phone: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                    <input type="email" value={settings.email} onChange={(e) => setSettingsState({...settings, email: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 sm:text-sm transition-all" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Batal</button>
                <button onClick={handleSaveSettings} className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"><Save size={16} /> Simpan</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden bg-white/70"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10"><FileText size={64} className="text-brand-500"/></div>
          <p className="text-slate-500 text-sm font-medium mb-1">Total Faktur</p>
          <h3 className="text-3xl font-bold text-slate-800 font-outfit mb-2">{docs.filter(d => d.type === 'faktur').length}</h3>
          <p className="text-xs text-slate-500 font-medium">Nilai: <span className="text-brand-600">{formatCurrency(totalRevenue)}</span></p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden bg-white/70"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10"><Receipt size={64} className="text-accent-500"/></div>
          <p className="text-slate-500 text-sm font-medium mb-1">Total Kwitansi</p>
          <h3 className="text-3xl font-bold text-slate-800 font-outfit mb-2">{docs.filter(d => d.type === 'kwitansi').length}</h3>
          <p className="text-xs text-slate-500 font-medium">Nilai: <span className="text-accent-600">{formatCurrency(totalReceipts)}</span></p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-center items-start bg-gradient-to-br from-brand-50 to-pink-50 border-white/80"
        >
          <TrendingUp size={28} className="text-brand-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 font-outfit mb-1">Lebih Profesional</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Gunakan warna-warna soft ini untuk memberikan kesan elegan pada setiap dokumen bisnis Anda.</p>
        </motion.div>
      </div>

      {/* Documents Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200/60 bg-white/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 font-outfit">Riwayat Dokumen</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4">Nomor</th>
                <th className="px-6 py-4">Klien / Penerima</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/40">
              {docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-brand-50 text-brand-300 rounded-full flex items-center justify-center">
                        <FileText size={32} />
                      </div>
                      <p className="text-slate-400 font-medium">Belum ada dokumen yang dibuat.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                docs.map((doc, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * idx }}
                    key={doc.id} 
                    className="hover:bg-brand-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doc.type === 'faktur' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-100/50 text-brand-700">
                          <FileText size={14} /> Faktur
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-100/50 text-accent-700">
                          <Receipt size={14} /> Kwitansi
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">{doc.docNumber || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500">
                      {doc.type === 'faktur' ? doc.customerName : doc.receivedFrom || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">{formatDate(doc.date)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">
                      {formatCurrency(doc.type === 'faktur' ? (doc.totalAmount || 0) : (doc.amountNumber || 0))}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/${doc.type}/${doc.id}?print=true`} target="_blank" className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="Cetak"><Printer size={18} /></Link>
                        <Link href={`/${doc.type}/${doc.id}`} className="p-2 text-brand-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Edit"><Edit size={18} /></Link>
                        <button onClick={() => handleDelete(doc.id)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
