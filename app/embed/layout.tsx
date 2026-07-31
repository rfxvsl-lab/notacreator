export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex flex-col w-full relative">
      {children}
    </main>
  );
}
