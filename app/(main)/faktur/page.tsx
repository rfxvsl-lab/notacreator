'use client';

import { Suspense } from 'react';
import EmbedFakturPage from '@/app/embed/faktur/page';

export default function FakturPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <EmbedFakturPage />
      </Suspense>
    </div>
  );
}
