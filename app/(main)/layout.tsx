import Link from 'next/link';
import { auth, signIn, signOut } from '@/auth';
import { Providers } from '@/app/providers';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <>
      {/* Background gradient subtle blobs (soft colors) */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none hidden-print">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-100/60 blur-3xl opacity-60 mix-blend-multiply" />
        <div className="absolute top-[30%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-100/60 blur-3xl opacity-50 mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] rounded-full bg-pink-100/50 blur-3xl opacity-50 mix-blend-multiply" />
      </div>

      <header className="glass sticky top-0 z-50 hidden-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold flex items-center gap-2 group transition-all">
            <div className="bg-gradient-to-br from-brand-400 to-brand-600 text-white p-1.5 rounded-lg shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M3 18h6"/><path d="M14 15h.01"/><path d="M14 18h.01"/></svg>
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 font-outfit tracking-tight">QuickNota</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="text-slate-500 hover:text-brand-600 transition-colors hidden sm:block">Dashboard</Link>
            
            {session?.user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800">{session.user.name}</span>
                  <span className="text-xs text-slate-500">{session.user.email}</span>
                </div>
                {session.user.image ? (
                  <img src={session.user.image} alt={session.user.name || "User"} className="w-8 h-8 rounded-full border border-slate-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                    {session.user.name?.charAt(0) || "U"}
                  </div>
                )}
                <form action={async () => {
                  'use server';
                  await signOut();
                }}>
                  <button type="submit" className="text-xs text-red-500 hover:text-red-700 hover:underline ml-2">Keluar</button>
                </form>
              </div>
            ) : (
              <form action={async () => {
                'use server';
                await signIn('google');
              }}>
                <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full shadow-sm transition-all text-sm font-semibold ml-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18px" height="18px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
                  Masuk
                </button>
              </form>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full relative">
        <Providers>
          {children}
        </Providers>
      </main>
    </>
  );
}
