'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentData, formatCurrency, formatDate, CompanySettings } from '@/lib/docStore';
import { getDocAction, saveDocAction, getSettingsAction } from '@/lib/actions';
import { ArrowLeft, Printer, RefreshCw, Save, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useSession } from 'next-auth/react';

// Simple function to convert number to words (Terbilang)
function terbilang(angka: number): string {
  const words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let result = "";
  if (angka < 12) {
    result = words[angka];
  } else if (angka < 20) {
    result = terbilang(angka - 10) + " Belas";
  } else if (angka < 100) {
    result = terbilang(Math.floor(angka / 10)) + " Puluh " + terbilang(angka % 10);
  } else if (angka < 200) {
    result = "Seratus " + terbilang(angka - 100);
  } else if (angka < 1000) {
    result = terbilang(Math.floor(angka / 100)) + " Ratus " + terbilang(angka % 100);
  } else if (angka < 2000) {
    result = "Seribu " + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    result = terbilang(Math.floor(angka / 1000)) + " Ribu " + terbilang(angka % 1000);
  } else if (angka < 1000000000) {
    result = terbilang(Math.floor(angka / 1000000)) + " Juta " + terbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    result = terbilang(Math.floor(angka / 1000000000)) + " Miliar " + terbilang(angka % 1000000000);
  }
  return result.trim();
}

export default function KwitansiPage({ params }: { params: Promise<{ id: string }> }) {
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
      
      if (existingDoc && existingDoc.type === 'kwitansi') {
        setDoc(existingDoc);
      } else if (existingDoc) {
        router.replace('/'); 
      } else {
        setDoc({
          id,
          type: 'kwitansi',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          docNumber: `KWT-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          date: new Date().toISOString().split('T')[0],
          receivedFrom: '',
          paymentFor: '',
          amountNumber: 0,
          amountText: 'Rupiah',
          signatureName: settings.name,
          signatureLocation: 'Jakarta'
        });
      }
    };
    loadDoc();
    return () => { mounted = false; };
  }, [id, router, status]);

  const handleDocChange = (field: keyof DocumentData, value: any) => {
    if (!doc) return;
    setDoc(prev => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      if (field === 'amountNumber') {
        const num = Number(value);
        if (!isNaN(num) && num > 0) {
          updated.amountText = terbilang(num) + ' Rupiah';
        } else {
          updated.amountText = '';
        }
      }
      return updated;
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
    return (
      <div className="bg-slate-100 min-h-screen py-8 print:py-0 print:bg-white flex items-center justify-center print:block">
        <div className="print:hidden fixed bottom-6 right-6 flex gap-3 shadow-2xl bg-white p-3 rounded-2xl border border-slate-200 z-50">
          <button 
             onClick={() => window.close()}
             className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
          >
            Tutup Tab
          </button>
          <button 
             onClick={() => window.print()}
             className="px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-sm font-semibold shadow-md flex items-center gap-2 transition-transform active:scale-95"
          >
             <Printer size={18} />
             Cetak / Simpan PDF
          </button>
        </div>

        <div className="bg-white mx-auto min-w-[210mm] min-h-[148mm] p-[10mm] text-slate-900 shadow-lg print:shadow-none" style={{maxWidth: '210mm'}}>
          <div className="border-[3px] border-accent-700/80 rounded-2xl p-8 relative">
            <div className="text-center border-b-2 border-accent-700/30 pb-4 mb-8">
              <h1 className="text-4xl font-bold tracking-[0.2em] text-accent-800 uppercase font-outfit">K W I T A N S I</h1>
              <p className="text-sm font-semibold text-slate-500 mt-2 tracking-widest">{companySettings.name}</p>
            </div>
            
            <div className="absolute top-8 right-8 font-semibold text-accent-800 bg-accent-50 px-3 py-1.5 rounded-lg border border-accent-100">
              No. <span className="font-bold tracking-wider">{doc.docNumber}</span>
            </div>

            <div className="space-y-7 mt-8">
              <div className="flex items-start">
                <div className="w-48 font-bold text-accent-800 uppercase text-sm tracking-wider pt-1">Sudah terima dari</div>
                <div className="flex-1 border-b border-dotted border-slate-400 pl-4 font-bold text-xl text-slate-800 pb-1">
                  : <span className="pl-2">{doc.receivedFrom}</span>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-48 font-bold text-accent-800 uppercase text-sm tracking-wider pt-3">Uang sejumlah</div>
                <div className="flex-1 bg-slate-50/50 border border-slate-200 px-5 py-3 font-medium italic text-slate-700 rounded-xl leading-relaxed">
                  {doc.amountText || '...................................................'}
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-48 font-bold text-accent-800 uppercase text-sm tracking-wider pt-2">Untuk pembayaran</div>
                <div className="flex-1 border-b border-dotted border-slate-400 pl-4 pt-2 pb-1 font-medium text-slate-800 leading-relaxed min-h-[3rem]">
                  : <span className="pl-2">{doc.paymentFor}</span>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-48"></div>
                <div className="flex-1 border-b border-dotted border-slate-400 pl-4 min-h-[2.5rem]"></div>
              </div>
            </div>

            <div className="mt-14 flex justify-between items-end">
              <div className="bg-accent-50/80 border-2 border-accent-200 rounded-xl px-6 py-4 font-bold text-3xl text-accent-700 min-w-[280px] shadow-sm">
                <span className="text-lg font-semibold mr-2 opacity-70">Rp</span> 
                {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(doc.amountNumber || 0)}
              </div>

              <div className="text-center w-72">
                <p className="text-slate-600 font-medium mb-16">
                  {doc.signatureLocation || '......................'}, <span className="text-slate-800">{formatDate(doc.date)}</span>
                </p>
                <div className="border-b-2 border-slate-800 w-full mb-1.5"></div>
                <p className="font-bold text-slate-800 uppercase text-sm tracking-wider">
                  ({doc.signatureName || '...........................................'})
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-accent-600 transition-colors">
          <ArrowLeft size={16} className="mr-1.5" /> Kembali ke Dashboard
        </Link>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              saveDoc(doc);
              window.open(`/${doc.type}/${id}?print=true`, '_blank');
              router.push('/');
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            <Printer size={16} />
            Simpan & Cetak
          </button>
          <button
            onClick={handleSave}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {isSaved ? 'Tersimpan!' : 'Simpan Kwitansi'}
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="bg-accent-50/50 px-6 py-4 border-b border-accent-100/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-accent-900 font-outfit">Editor Kwitansi</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white text-accent-600 rounded-full border border-accent-100 shadow-sm">{doc.docNumber}</span>
        </div>
        
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-white/60 rounded-xl border border-slate-100 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nomor Kwitansi</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={doc.docNumber}
                  onChange={(e) => handleDocChange('docNumber', e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 sm:text-sm transition-all"
                />
                <button 
                  onClick={() => handleDocChange('docNumber', `KWT-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`)}
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
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 sm:text-sm transition-all"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-xs">Sudah terima dari</label>
              <input
                type="text"
                value={doc.receivedFrom || ''}
                onChange={(e) => handleDocChange('receivedFrom', e.target.value)}
                placeholder="Nama pihak yang menyetor dana"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 sm:text-base font-medium transition-all"
              />
            </div>

            <div className="bg-accent-50/30 p-5 rounded-xl border border-accent-100/50">
              <label className="block text-sm font-bold text-accent-700 mb-2 uppercase tracking-wider text-xs">Jumlah Uang (Rp)</label>
              <input
                type="number"
                min="0"
                value={doc.amountNumber || ''}
                onChange={(e) => handleDocChange('amountNumber', Number(e.target.value))}
                placeholder="1000000"
                className="w-full px-4 py-3 bg-white border border-accent-200 rounded-xl shadow-sm focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 sm:text-2xl font-bold text-accent-600 transition-all placeholder:text-slate-300"
              />
              
              <div className="mt-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Terbilang</label>
                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 sm:text-sm italic font-medium leading-relaxed min-h-[3rem]">
                  {doc.amountText || '-'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-xs">Untuk Pembayaran</label>
              <textarea
                value={doc.paymentFor || ''}
                onChange={(e) => handleDocChange('paymentFor', e.target.value)}
                rows={3}
                placeholder="Penjelasan rincian peruntukan pembayaran tersebut..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 sm:text-base resize-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200 mt-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lokasi Tanda Tangan</label>
              <input
                type="text"
                value={doc.signatureLocation || ''}
                onChange={(e) => handleDocChange('signatureLocation', e.target.value)}
                placeholder="Misal: Jakarta"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 sm:text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Penerima / Tanda Tangan</label>
              <input
                type="text"
                value={doc.signatureName || ''}
                onChange={(e) => handleDocChange('signatureName', e.target.value)}
                placeholder="Nama jelas yang menandatangani"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 sm:text-sm transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
