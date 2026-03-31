export default function ConfiguraciónPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-white/70 hover:text-white text-sm transition">
          ← Dashboard
        </a>
        <span className="text-white/30">|</span>
        <h1 className="text-base font-bold">Configuración</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h2 className="text-xl font-bold text-[#333333]">Configuración</h2>
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
