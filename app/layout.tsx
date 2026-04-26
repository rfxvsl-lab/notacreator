import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'QuickNota | Pembuat Faktur & Kwitansi',
  description: 'Aplikasi mudah dan cepat untuk membuat nota dan kwitansi.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans bg-gray-50 text-gray-900 min-h-screen antialiased`} suppressHydrationWarning>
        <div className="flex flex-col min-h-screen">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden hidden-print">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <Link href="/" className="text-xl font-bold text-blue-600 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M3 18h6"/><path d="M14 15h.01"/><path d="M14 18h.01"/></svg>
                QuickNota
              </Link>
              <nav className="flex items-center gap-4 text-sm font-medium">
                <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">Dashboard</Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
