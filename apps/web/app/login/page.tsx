import { loginAction } from './actions';

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <div className="flex min-h-screen items-center justify-center dark:bg-slate-950 bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold dark:text-white text-slate-900 tracking-tight">aw-finanzas</h1>
          <p className="mt-1 text-sm dark:text-slate-500 text-slate-400">AplicacionesWeb · Expande PRO</p>
        </div>

        <div className="rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900 bg-white p-8 shadow-sm">
          <form action={loginAction} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-wider dark:text-slate-400 text-slate-600"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                placeholder="••••••••"
                className="w-full rounded-md border dark:border-slate-700 border-slate-200 dark:bg-slate-950 bg-slate-50 dark:text-slate-200 text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 dark:focus:ring-slate-600 focus:ring-slate-300 placeholder:dark:text-slate-600 placeholder:text-slate-400"
              />
            </div>

            <ErrorMessage searchParams={searchParams} />

            <button
              type="submit"
              className="mt-1 w-full rounded-md bg-indigo-600 hover:bg-indigo-500 py-2 text-sm font-semibold text-white transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

async function ErrorMessage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  if (!params.error) return null;
  return (
    <p className="text-xs text-red-500 dark:text-red-400">Contraseña incorrecta.</p>
  );
}
