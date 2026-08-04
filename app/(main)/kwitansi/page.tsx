'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, FileText, Receipt } from 'lucide-react';

export default function KwitansiPage() {
  const { data: session, status } = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-600 mb-6">
          <ArrowLeft size={16} /> Kembali ke dashboard
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-accent-100 text-accent-600">
            <Receipt size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Buat Kwitansi</h1>
            <p className="text-sm text-slate-500">Halaman ini sedang dipersiapkan. Anda dapat kembali ke dashboard untuk melihat dokumen yang ada.</p>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          {status === 'authenticated' ? (
            <p>Halo {session?.user?.name || 'pengguna'}, fitur kwitansi akan segera tersedia.</p>
          ) : (
            <p>Silakan masuk terlebih dahulu untuk mengakses fitur lengkap.</p>
          )}
        </div>
      </div>
    </div>
  );
}
