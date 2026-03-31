export default function CFDIsPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-white/70 hover:text-white text-sm transition">
          ← Dashboard
        </a>
        <span className="text-white/30">|</span>
        <h1 className="text-base font-bold">CFDIs</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h2 className="text-xl font-bold text-[#333333]">CFDIs</h2>
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
