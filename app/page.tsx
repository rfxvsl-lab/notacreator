'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { FileText, Receipt, Plus, Trash2, Edit, Printer } from 'lucide-react';
import { getDocs, deleteDoc, DocumentData, formatCurrency, formatDate } from '@/lib/docStore';

export default function Dashboard() {
  const [docs, setDocs] = useState<DocumentData[]>([]);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const loadData = () => {
      if (mounted) {
        setDocs(getDocs().sort((a, b) => b.updatedAt - a.updatedAt));
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      deleteDoc(id);
      setDocs(getDocs().sort((a, b) => b.updatedAt - a.updatedAt));
    }
  };

  const handleCreateNew = (type: 'faktur' | 'kwitansi') => {
    const id = uuidv4();
    router.push(`/${type}/${id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Dokumen</h1>
            <p className="text-gray-500 mt-1 text-sm">Kelola faktur dan kwitansi Anda di sini. Semua data disimpan secara lokal di peramban (browser) Anda.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleCreateNew('faktur')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <FileText size={18} />
              Buat Faktur
            </button>
            <button
               onClick={() => handleCreateNew('kwitansi')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Receipt size={18} />
              Buat Kwitansi
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-t border-gray-100">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Jenis</th>
                <th className="px-6 py-4 font-medium">Nomor</th>
                <th className="px-6 py-4 font-medium">Klien / Penerima</th>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FileText size={48} className="text-gray-200" />
                      <p>Belum ada dokumen yang dibuat.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {doc.type === 'faktur' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          <FileText size={14} /> Faktur
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Receipt size={14} /> Kwitansi
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.docNumber || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {doc.type === 'faktur' ? doc.customerName : doc.receivedFrom || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(doc.date)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {formatCurrency(doc.type === 'faktur' ? (doc.totalAmount || 0) : (doc.amountNumber || 0))}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                       <Link
                        href={`/${doc.type}/${doc.id}?print=true`}
                        target="_blank"
                        className="inline-flex items-center p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                        title="Cetak"
                      >
                        <Printer size={18} />
                      </Link>
                      <Link
                        href={`/${doc.type}/${doc.id}`}
                        className="inline-flex items-center p-2 text-blue-400 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="inline-flex items-center p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
