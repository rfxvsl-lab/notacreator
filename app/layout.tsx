import type {Metadata} from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  metadataBase: new URL('https://quicknota.rfx.web.id'),
  title: {
    default: 'QuickNota | Buat Nota & Kwitansi Online Gratis',
    template: '%s | QuickNota'
  },
  description: 'Aplikasi profesional, mudah, dan gratis untuk membuat nota, faktur (invoice), dan kwitansi secara online. Cetak dan simpan langsung ke PDF.',
  keywords: ['buat nota online', 'buat kwitansi online', 'aplikasi invoice gratis', 'nota pembuat', 'invoice maker', 'kwitansi generator'],
  authors: [{ name: 'NotaCreator' }],
  creator: 'NotaCreator',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://quicknota.rfx.web.id',
    title: 'QuickNota | Buat Nota & Kwitansi Online Gratis',
    description: 'Aplikasi profesional, mudah, dan gratis untuk membuat nota, faktur (invoice), dan kwitansi secara online.',
    siteName: 'QuickNota',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuickNota | Buat Nota & Kwitansi Online Gratis',
    description: 'Aplikasi profesional, mudah, dan gratis untuk membuat nota, faktur (invoice), dan kwitansi secara online.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-[#fdfdfd] min-h-screen antialiased flex flex-col`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
