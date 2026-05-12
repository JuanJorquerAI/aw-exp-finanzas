'use client';
import { useState } from 'react';
import { Plus, Pencil, Check, X } from 'lucide-react';
import { useCounterparties, useCreateCounterparty, useUpdateCounterparty } from '@/lib/queries';
import { cpMatchesQuery } from '@/lib/counterparty';
import type { Counterparty } from '@/lib/types';
import { cn } from '@/lib/utils';

const INPUT_CLS = 'w-full rounded-md border dark:border-slate-700 border-slate-200 dark:bg-slate-900 bg-white dark:text-slate-200 text-slate-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 dark:focus:ring-slate-600 focus:ring-slate-300 placeholder:dark:text-slate-600 placeholder:text-slate-400';
const SELECT_CLS = INPUT_CLS;

const TYPE_LABELS: Record<string, string> = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Proveedor',
  EMPLOYEE: 'Trabajador',
  GOVERNMENT: 'Gobierno',
  BANK: 'Banco',
  OTHER: 'Otro',
};

const TYPE_CLS: Record<string, string> = {
  CUSTOMER: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  SUPPLIER: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  EMPLOYEE: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  GOVERNMENT: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  BANK: 'bg-slate-500/10 dark:text-slate-400 text-slate-500',
  OTHER: 'bg-slate-500/10 dark:text-slate-400 text-slate-500',
};

const TYPES = Object.entries(TYPE_LABELS) as [string, string][];

interface EditForm {
  name: string;
  razonSocial: string;
  isPersonaNatural: boolean;
  rut: string;
  type: string;
  email: string;
  phone: string;
  notes: string;
}

function emptyEdit(cp?: Counterparty): EditForm {
  return {
    name: cp?.name ?? '',
    razonSocial: cp?.razonSocial ?? '',
    isPersonaNatural: cp?.isPersonaNatural ?? false,
    rut: cp?.rut ?? '',
    type: cp?.type ?? 'SUPPLIER',
    email: '',
    phone: '',
    notes: '',
  };
}

export default function ContrapartesPage() {
  const { data: counterparties = [], isLoading } = useCounterparties();
  const { mutateAsync: create, isPending: creating } = useCreateCounterparty();
  const { mutateAsync: update, isPending: updating } = useUpdateCounterparty();

  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<EditForm>(emptyEdit());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEdit());
  const [search, setSearch] = useState('');

  const filtered = counterparties.filter((c) => !search || cpMatchesQuery(c, search));

  async function handleCreate() {
    if (!newForm.name.trim()) return;
    await create({
      name: newForm.name.trim(),
      type: newForm.type,
      isPersonaNatural: newForm.isPersonaNatural,
      ...(newForm.razonSocial.trim() && { razonSocial: newForm.razonSocial.trim() }),
      ...(newForm.rut.trim() && { rut: newForm.rut.trim() }),
    });
    setNewForm(emptyEdit());
    setShowNew(false);
  }

  function startEdit(cp: Counterparty) {
    setEditId(cp.id);
    setEditForm(emptyEdit(cp));
  }

  async function handleUpdate() {
    if (!editId || !editForm.name.trim()) return;
    await update({
      id: editId,
      dto: {
        name: editForm.name.trim(),
        type: editForm.type,
        isPersonaNatural: editForm.isPersonaNatural,
        razonSocial: editForm.razonSocial.trim() || undefined,
        ...(editForm.rut.trim() && { rut: editForm.rut.trim() }),
      },
    });
    setEditId(null);
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-900">Contrapartes</h2>
          <p className="mt-0.5 text-xs dark:text-slate-500 text-slate-400">{counterparties.length} registros</p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva contraparte
        </button>
      </div>

      {/* New form */}
      {showNew && (
        <div className="mb-5 rounded-lg border dark:border-slate-700 border-slate-200 dark:bg-slate-900/40 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold dark:text-slate-300 text-slate-700">Nueva contraparte</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs dark:text-slate-500 text-slate-500">Nombre fantasía *</label>
              <input value={newForm.name} onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ej: Juan Pérez / Hosting SPA" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs dark:text-slate-500 text-slate-500">Razón social</label>
              <input value={newForm.razonSocial} onChange={(e) => setNewForm((p) => ({ ...p, razonSocial: e.target.value }))} placeholder="Nombre legal (empresas)" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs dark:text-slate-500 text-slate-500">RUT</label>
              <input value={newForm.rut} onChange={(e) => setNewForm((p) => ({ ...p, rut: e.target.value }))} placeholder="12.345.678-9" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs dark:text-slate-500 text-slate-500">Tipo</label>
              <select value={newForm.type} onChange={(e) => setNewForm((p) => ({ ...p, type: e.target.value }))} className={SELECT_CLS}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="new-pn"
                type="checkbox"
                checked={newForm.isPersonaNatural}
                onChange={(e) => setNewForm((p) => ({ ...p, isPersonaNatural: e.target.checked }))}
                className="rounded border-slate-600"
              />
              <label htmlFor="new-pn" className="text-xs dark:text-slate-400 text-slate-600 cursor-pointer">
                Persona natural
              </label>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreate} disabled={!newForm.name.trim() || creating} className="rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition-colors">
              {creating ? 'Creando…' : 'Crear'}
            </button>
            <button onClick={() => setShowNew(false)} className="rounded-md border dark:border-slate-700 border-slate-200 px-3 py-1.5 text-xs dark:text-slate-400 text-slate-500 transition-colors dark:hover:bg-slate-800 hover:bg-slate-100">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, razón social o RUT…" className={INPUT_CLS} />
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm dark:text-slate-600 text-slate-400">Cargando…</p>
      ) : (
        <div className="rounded-lg border dark:border-slate-800 border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b dark:border-slate-800 border-slate-100 dark:bg-slate-900 bg-slate-50">
                <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Nombre</th>
                <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Razón social</th>
                <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">RUT</th>
                <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Tipo</th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
              {filtered.map((cp) =>
                editId === cp.id ? (
                  <tr key={cp.id} className="dark:bg-slate-900/60 bg-slate-50">
                    <td className="px-4 py-2">
                      <div className="space-y-1.5">
                        <input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre *" className={INPUT_CLS} />
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isPersonaNatural}
                            onChange={(e) => setEditForm((p) => ({ ...p, isPersonaNatural: e.target.checked }))}
                            className="rounded border-slate-600"
                          />
                          <span className="text-xs dark:text-slate-400 text-slate-500">Persona natural</span>
                        </label>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input value={editForm.razonSocial} onChange={(e) => setEditForm((p) => ({ ...p, razonSocial: e.target.value }))} placeholder="Razón social" className={INPUT_CLS} />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editForm.rut} onChange={(e) => setEditForm((p) => ({ ...p, rut: e.target.value }))} placeholder="RUT" className={INPUT_CLS} />
                    </td>
                    <td className="px-4 py-2">
                      <select value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))} className={SELECT_CLS}>
                        {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1.5">
                        <button onClick={handleUpdate} disabled={updating} className="rounded p-1 text-emerald-500 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditId(null)} className="rounded p-1 dark:text-slate-500 text-slate-400 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={cp.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="dark:text-slate-200 text-slate-800 font-medium">{cp.name}</span>
                      {cp.isPersonaNatural && (
                        <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400">PN</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 dark:text-slate-400 text-slate-500">
                      {cp.razonSocial ?? <span className="dark:text-slate-700 text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 dark:text-slate-400 text-slate-500 font-mono">
                      {cp.rut ?? <span className="dark:text-slate-700 text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', TYPE_CLS[cp.type] ?? '')}>
                        {TYPE_LABELS[cp.type] ?? cp.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => startEdit(cp)} className="rounded p-1 dark:text-slate-500 text-slate-400 dark:hover:text-indigo-400 hover:text-indigo-600 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              )}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center dark:text-slate-600 text-slate-400">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
