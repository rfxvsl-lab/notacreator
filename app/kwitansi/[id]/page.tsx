'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getDoc, saveDoc, DocumentData, formatCurrency, formatDate 
} from '@/lib/docStore';
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import Link from 'next/link';

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
  
  const [doc, setDoc] = useState<DocumentData>(() => ({
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
    signatureName: '',
    signatureLocation: 'Jakarta'
  }));

  const [isPrintMode, setIsPrintMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('print') === 'true';
    }
    return false;
  });

  useEffect(() => {
    let mounted = true;
    const loadDoc = () => {
      if (!mounted) return;
      const existingDoc = getDoc(id);
      if (existingDoc && existingDoc.type === 'kwitansi') {
        setDoc(existingDoc);
      } else if (existingDoc) {
        router.replace('/'); 
      }
    };
    loadDoc();
    return () => {
      mounted = false;
    };
  }, [id, router]);

  useEffect(() => {
    if (isPrintMode) {
      const handleAfterPrint = () => {
        setIsPrintMode(false);
        // Replace URL to remove ?print=true parameter to avoid print loop on refresh
        router.replace(`/${doc.type}/${id}`);
      };
      
      window.addEventListener('afterprint', handleAfterPrint);
      
      setTimeout(() => {
        window.print();
      }, 500);
      
      return () => {
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [isPrintMode, router, id, doc.type]);

  const handleDocChange = (field: keyof DocumentData, value: any) => {
    setDoc(prev => {
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

  const handleSave = () => {
    saveDoc(doc);
    router.push('/');
  };

  if (isPrintMode) {
    return (
      <div className="bg-white mx-auto min-w-[210mm] min-h-[148mm] p-[10mm] text-black" style={{maxWidth: '210mm'}}>
        <div className="border-[3px] border-emerald-900 rounded-lg p-6 relative">
          <div className="text-center border-b-2 border-emerald-900 pb-4 mb-6">
            <h1 className="text-3xl font-bold tracking-widest text-emerald-900 uppercase">K W I T A N S I</h1>
          </div>
          
          <div className="absolute top-6 right-6 font-medium text-emerald-900">
            No. <span className="underline decoration-dotted underline-offset-4 font-bold">{doc.docNumber}</span>
          </div>

          <div className="space-y-6 mt-8">
            <div className="flex items-start">
              <div className="w-48 font-semibold text-emerald-900">Sudah terima dari</div>
              <div className="flex-1 border-b border-dotted border-gray-400 pl-4 font-bold text-lg text-gray-800">
                : {doc.receivedFrom}
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-48 font-semibold text-emerald-900">Uang sejumlah</div>
              <div className="flex-1 bg-gray-100 italic px-4 py-2 font-serif text-gray-800 rounded">
                {doc.amountText || '...................................................'}
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-48 font-semibold text-emerald-900 pt-2">Untuk pembayaran</div>
              <div className="flex-1 border-b border-dotted border-gray-400 pl-4 pt-2 pb-1 font-medium text-gray-800 leading-relaxed min-h-[3rem]">
                : {doc.paymentFor}
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-48"></div>
              <div className="flex-1 border-b border-dotted border-gray-400 pl-4 min-h-[2rem]"></div>
            </div>
          </div>

          <div className="mt-12 flex justify-between items-end">
            <div className="bg-gray-100 border border-emerald-900 rounded-lg p-4 font-bold text-2xl text-emerald-900 min-w-[250px] shadow-sm">
              Terbilang: {formatCurrency(doc.amountNumber || 0)}
            </div>

            <div className="text-center w-64">
              <p className="text-emerald-900 font-medium mb-16">
                {doc.signatureLocation || '......................'}, {formatDate(doc.date)}
              </p>
              <div className="border-b border-gray-800 w-full mb-1"></div>
              <p className="font-bold text-gray-800 uppercase text-sm">
                ({doc.signatureName || '...........................................'})
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex justify-between items-center mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Kembali ke Dashboard
        </Link>
        <div className="flex gap-3">
          <button
            onClick={() => {
              saveDoc(doc);
              setIsPrintMode(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Printer size={16} />
            Simpan & Cetak
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            Simpan Kwitansi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
          <h2 className="text-lg font-semibold text-emerald-900">Form Kwitansi</h2>
        </div>
        
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Kwitansi</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={doc.docNumber}
                  onChange={(e) => handleDocChange('docNumber', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
                <button 
                  onClick={() => handleDocChange('docNumber', `KWT-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`)}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-gray-700"
                  title="Generate Acak"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
            
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={doc.date}
                onChange={(e) => handleDocChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sudah terima dari</label>
            <input
              type="text"
              value={doc.receivedFrom || ''}
              onChange={(e) => handleDocChange('receivedFrom', e.target.value)}
              placeholder="Nama pihak yang menyetor dana"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Uang (Rp)</label>
            <input
              type="number"
              min="0"
              value={doc.amountNumber || ''}
              onChange={(e) => handleDocChange('amountNumber', Number(e.target.value))}
              placeholder="1000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-semibold text-lg text-emerald-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terbilang</label>
            <textarea
              readOnly
              value={doc.amountText || ''}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-600 sm:text-sm resize-none italic"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Untuk Pembayaran</label>
            <textarea
              value={doc.paymentFor || ''}
              onChange={(e) => handleDocChange('paymentFor', e.target.value)}
              rows={3}
              placeholder="Penjelasan rincian peruntukan pembayaran tersebut"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Tanda Tangan</label>
              <input
                type="text"
                value={doc.signatureLocation || ''}
                onChange={(e) => handleDocChange('signatureLocation', e.target.value)}
                placeholder="Misal: Jakarta"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Penerima / Tanda Tangan</label>
              <input
                type="text"
                value={doc.signatureName || ''}
                onChange={(e) => handleDocChange('signatureName', e.target.value)}
                placeholder="Nama jelas yang menandatangani"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
