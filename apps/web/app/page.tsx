import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
      <h1 className="text-4xl font-bold text-slate-900 mb-2">aw-finanzas</h1>
      <p className="text-slate-500 mb-1">AplicacionesWeb · Expande PRO</p>
      <p className="text-slate-400 text-sm mb-8">Sistema de gestión financiera multi-empresa</p>
      <Link
        href="/transactions"
        className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-700 transition-colors"
      >
        Ver Transacciones →
      </Link>
    </main>
  );
}
