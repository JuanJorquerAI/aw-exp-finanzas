import { Suspense } from 'react';
import { AppProviders } from '@/components/layout/AppProviders';
import { AppSidebar } from '@/components/layout/AppSidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Suspense>
          <AppSidebar />
        </Suspense>
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<div className="p-8 text-sm text-slate-400">Cargando...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </AppProviders>
  );
}
