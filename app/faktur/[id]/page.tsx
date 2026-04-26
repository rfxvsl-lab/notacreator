'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { 
  getDoc, saveDoc, DocumentData, InvoiceItem, 
  formatCurrency, formatDate 
} from '@/lib/docStore';
import { Plus, Trash2, ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function FakturPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const id = resolvedParams.id;
  
  const [doc, setDoc] = useState<DocumentData>(() => ({
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
      if (existingDoc && existingDoc.type === 'faktur') {
        setDoc(existingDoc);
      } else if (existingDoc) {
        router.replace('/'); // wrong type
      }
    };
    loadDoc();
    return () => {
      mounted = false;
    };
  }, [id, router]);

  const calculateTotals = (currentDoc: DocumentData) => {
    const items = currentDoc.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subtotal - (currentDoc.discount || 0)) * ((currentDoc.tax || 0) / 100);
    const totalAmount = subtotal - (currentDoc.discount || 0) + taxAmount;
    
    return { ...currentDoc, subtotal, totalAmount };
  };

  const handleDocChange = (field: keyof DocumentData, value: any) => {
    setDoc(prev => calculateTotals({ ...prev, [field]: value }));
  };

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setDoc(prev => {
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
    setDoc(prev => ({
      ...prev,
      items: [...(prev.items || []), { id: uuidv4(), description: '', quantity: 1, price: 0, total: 0 }]
    }));
  };

  const removeItem = (itemId: string) => {
    setDoc(prev => {
      const newItems = prev.items?.filter(item => item.id !== itemId);
      return calculateTotals({ ...prev, items: newItems });
    });
  };

  const handleSave = () => {
    saveDoc(doc);
    router.push('/');
  };

  if (isPrintMode) {
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
             className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md flex items-center gap-2 transition-transform active:scale-95"
          >
             <Printer size={18} />
             Cetak / Simpan PDF
          </button>
        </div>

        <div className="bg-white max-w-[210mm] mx-auto min-h-[297mm] p-[15mm] text-black shadow-lg print:shadow-none">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">FAKTUR</h1>
            <p className="text-gray-500 font-medium">{doc.docNumber}</p>
          </div>
          <div className="text-right">
            <h2 className="font-bold text-xl mb-1 text-gray-800">Perusahaan Anda</h2>
            <p className="text-sm text-gray-600">Jl. Contoh Alamat No. 123</p>
            <p className="text-sm text-gray-600">Kota, Negara 12345</p>
            <p className="text-sm text-gray-600">info@perusahaan.com</p>
          </div>
        </div>

        <div className="flex justify-between mb-12 border-t border-gray-200 pt-6">
          <div className="w-1/2">
            <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Ditagihkan Kepada:</p>
            <h3 className="font-bold text-lg text-gray-800">{doc.customerName || '-'}</h3>
            <p className="text-gray-600 whitespace-pre-wrap mt-1 text-sm leading-relaxed">{doc.customerAddress || '-'}</p>
          </div>
          <div className="w-1/2 text-right">
            <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">Tanggal Faktur</p>
            <p className="font-medium text-gray-800 mb-4">{formatDate(doc.date)}</p>
            <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">Total Tagihan</p>
            <p className="font-bold text-2xl text-blue-600">{formatCurrency(doc.totalAmount || 0)}</p>
          </div>
        </div>

        <table className="w-full mb-8 text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-3 px-2 font-semibold text-gray-800 w-full">Deskripsi Barang / Jasa</th>
              <th className="py-3 px-2 font-semibold text-gray-800 text-center whitespace-nowrap">Kuantitas</th>
              <th className="py-3 px-2 font-semibold text-gray-800 text-right whitespace-nowrap">Harga Satuan</th>
              <th className="py-3 px-2 font-semibold text-gray-800 text-right whitespace-nowrap">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {(doc.items || []).map((item) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-4 px-2 text-gray-800">{item.description}</td>
                <td className="py-4 px-2 text-gray-800 text-center">{item.quantity}</td>
                <td className="py-4 px-2 text-gray-800 text-right">{formatCurrency(item.price)}</td>
                <td className="py-4 px-2 text-gray-800 text-right font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-16">
          <div className="w-1/2 max-w-sm">
            <div className="flex justify-between py-2 items-center">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-800">{formatCurrency(doc.subtotal || 0)}</span>
            </div>
            {doc.discount !== undefined && doc.discount > 0 && (
              <div className="flex justify-between py-2 items-center">
                <span className="text-gray-600">Diskon</span>
                <span className="font-medium text-red-600">-{formatCurrency(doc.discount || 0)}</span>
              </div>
            )}
            {doc.tax !== undefined && doc.tax > 0 && (
              <div className="flex justify-between py-2 items-center border-b border-gray-200">
                <span className="text-gray-600">Pajak ({doc.tax}%)</span>
                <span className="font-medium text-gray-800">
                  {formatCurrency(((doc.subtotal || 0) - (doc.discount || 0)) * (doc.tax / 100))}
                </span>
              </div>
            )}
            <div className="flex justify-between py-4 items-center">
              <span className="font-bold text-gray-800 text-lg">Total</span>
              <span className="font-bold text-blue-600 text-xl">{formatCurrency(doc.totalAmount || 0)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Catatan / Keterangan</p>
          <p className="text-gray-600 text-sm whitespace-pre-wrap">{doc.notes}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex justify-between items-center mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Kembali ke Dashboard
        </Link>
        <div className="flex gap-3">
          <button
            onClick={() => {
              saveDoc(doc);
              window.open(`/${doc.type}/${id}?print=true`, '_blank');
              router.push('/');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Printer size={16} />
            Simpan & Cetak
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            Simpan Faktur
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Editor Form */}
        <div className="p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Faktur</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={doc.docNumber}
                    onChange={(e) => handleDocChange('docNumber', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <button 
                    onClick={() => handleDocChange('docNumber', `INV-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`)}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan (Ditagih Kepada)</label>
                <input
                  type="text"
                  value={doc.customerName || ''}
                  onChange={(e) => handleDocChange('customerName', e.target.value)}
                  placeholder="Nama Perusahaan / Klien"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Pelanggan</label>
                <textarea
                  value={doc.customerAddress || ''}
                  onChange={(e) => handleDocChange('customerAddress', e.target.value)}
                  rows={3}
                  placeholder="Alamat lengkap"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-y"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Daftar Barang / Jasa</h3>
            
            <div className="space-y-3">
              {(doc.items || []).map((item, index) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs text-gray-500 mb-1 sm:hidden">Deskripsi</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      placeholder="Nama barang atau jasa..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex w-full sm:w-auto gap-3">
                    <div className="w-20">
                      <label className="block text-xs text-gray-500 mb-1 sm:hidden">Jumlah</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center"
                      />
                    </div>
                    <div className="flex-1 sm:w-40">
                      <label className="block text-xs text-gray-500 mb-1 sm:hidden">Harga</label>
                      <input
                        type="number"
                        min="0"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))}
                        placeholder="Harga"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
                      />
                    </div>
                    <div className="w-32 hidden sm:flex items-center justify-end font-medium text-gray-900">
                      {formatCurrency(item.total)}
                    </div>
                    <div className="flex items-center sm:pt-0 pt-5">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Hapus baris"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={addItem}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Plus size={16} /> Tambah Baris
            </button>
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-8 border-t border-gray-200 pt-6">
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan / Keterangan</label>
                <textarea
                  value={doc.notes || ''}
                  onChange={(e) => handleDocChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Instruksi pembayaran, ucapan terima kasih, dll."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-y"
                />
              </div>
            </div>
            
            <div className="w-full md:w-72 space-y-3 bg-gray-50 p-5 rounded-lg border border-gray-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(doc.subtotal || 0)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm gap-4">
                <span className="text-gray-600 whitespace-nowrap">Diskon (Rp)</span>
                <input
                  type="number"
                  min="0"
                  value={doc.discount || ''}
                  onChange={(e) => handleDocChange('discount', Number(e.target.value))}
                  className="w-24 px-2 py-1 text-right border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="flex justify-between items-center text-sm gap-4">
                <span className="text-gray-600 whitespace-nowrap">Pajak (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={doc.tax || ''}
                  onChange={(e) => handleDocChange('tax', Number(e.target.value))}
                  className="w-24 px-2 py-1 text-right border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-xl text-blue-600">{formatCurrency(doc.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
