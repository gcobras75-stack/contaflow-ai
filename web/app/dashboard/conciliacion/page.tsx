export default function ConciliaciónPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-white/70 hover:text-white text-sm transition">
          ← Dashboard
        </a>
        <span className="text-white/30">|</span>
        <h1 className="text-base font-bold">Conciliación</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h2 className="text-xl font-bold text-[#333333]">Conciliación</h2>
        <span className="bg-[#E8F8F0] text-[#00A651] text-sm font-semibold px-3 py-1 rounded-full">
          En construcción
        </span>
        <p className="text-gray-400 text-sm text-center max-w-sm">
          Este módulo estará disponible en la próxima sesión de desarrollo.
        </p>
      </main>
    </div>
  );
}
