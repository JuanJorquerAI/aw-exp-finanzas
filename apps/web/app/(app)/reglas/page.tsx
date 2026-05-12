'use client';
import { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, TestTube2, ChevronUp, ChevronDown } from 'lucide-react';
import { useCategorizationRules, useCreateCategorizationRule, useUpdateCategorizationRule, useDeleteCategorizationRule, useCategories } from '@/lib/queries';
import { testCategorizationRule } from '@/lib/api';
import type { CategorizationRule, TestRuleResult } from '@/lib/types';
import { cn } from '@/lib/utils';

const INPUT_CLS = 'w-full rounded-md border dark:border-slate-700 border-slate-200 dark:bg-slate-900 bg-white dark:text-slate-200 text-slate-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 dark:focus:ring-slate-600 focus:ring-slate-300 placeholder:dark:text-slate-600 placeholder:text-slate-400';
const SELECT_CLS = INPUT_CLS;

interface NewRuleForm {
  pattern: string;
  isRegex: boolean;
  categoryId: string;
  priority: number;
}

function emptyForm(): NewRuleForm {
  return { pattern: '', isRegex: false, categoryId: '', priority: 0 };
}

function CategoryBadge({ name, color }: { name: string; color: string | null }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: color ? `${color}22` : undefined,
        color: color ?? undefined,
      }}
    >
      {name}
    </span>
  );
}

export default function ReglasPage() {
  const { data: rules = [], isLoading } = useCategorizationRules();
  const { data: categories = [] } = useCategories();
  const { mutateAsync: create, isPending: creating } = useCreateCategorizationRule();
  const { mutateAsync: update } = useUpdateCategorizationRule();
  const { mutateAsync: remove } = useDeleteCategorizationRule();

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<NewRuleForm>(emptyForm());
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<TestRuleResult | null>(null);
  const [testing, setTesting] = useState(false);

  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  async function handleCreate() {
    if (!form.pattern.trim() || !form.categoryId) return;
    await create({
      pattern: form.pattern.trim(),
      isRegex: form.isRegex,
      categoryId: form.categoryId,
      priority: form.priority,
    });
    setForm(emptyForm());
    setShowNew(false);
  }

  async function handleToggleActive(rule: CategorizationRule) {
    await update({ id: rule.id, dto: { isActive: !rule.isActive } });
  }

  async function handleChangePriority(rule: CategorizationRule, delta: number) {
    await update({ id: rule.id, dto: { priority: rule.priority + delta } });
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta regla?')) return;
    await remove(id);
  }

  async function handleTest() {
    if (!testText.trim()) return;
    setTesting(true);
    try {
      const result = await testCategorizationRule(testText.trim());
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-900">Reglas de categorización</h2>
          <p className="mt-0.5 text-xs dark:text-slate-500 text-slate-400">
            Se aplican automáticamente al importar desde banco. Mayor prioridad = se evalúa primero.
          </p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva regla
        </button>
      </div>

      {/* Tester */}
      <div className="mb-6 rounded-lg border dark:border-slate-800 border-slate-200 dark:bg-slate-900/50 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-medium dark:text-slate-400 text-slate-600">Probar descripción</p>
        <div className="flex gap-2">
          <input
            className={cn(INPUT_CLS, 'flex-1')}
            placeholder="Ej: TRANSFERENCIA SUELDO MARZO"
            value={testText}
            onChange={(e) => { setTestText(e.target.value); setTestResult(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleTest()}
          />
          <button
            onClick={handleTest}
            disabled={testing || !testText.trim()}
            className="flex items-center gap-1.5 rounded-md bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
          >
            <TestTube2 className="h-3.5 w-3.5" />
            Probar
          </button>
        </div>
        {testResult !== null && (
          <div className={cn('mt-2 flex items-center gap-2 text-xs', testResult.matched ? 'text-emerald-500' : 'dark:text-slate-500 text-slate-400')}>
            {testResult.matched && testResult.category ? (
              <>
                <span className="font-medium">Coincide →</span>
                <CategoryBadge name={testResult.category.name} color={testResult.category.color} />
              </>
            ) : (
              <span>Sin coincidencia — quedará sin categoría</span>
            )}
          </div>
        )}
      </div>

      {/* Formulario nueva regla */}
      {showNew && (
        <div className="mb-4 rounded-lg border dark:border-slate-700 border-slate-200 dark:bg-slate-900 bg-white p-4">
          <p className="mb-3 text-xs font-semibold dark:text-slate-300 text-slate-700">Nueva regla</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs dark:text-slate-500 text-slate-500">Patrón</label>
              <input
                className={INPUT_CLS}
                placeholder={form.isRegex ? 'Ej: SUELDO\\s+\\d+' : 'Ej: SUELDO'}
                value={form.pattern}
                onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs dark:text-slate-500 text-slate-500">Categoría</label>
              <select
                className={SELECT_CLS}
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">— seleccionar —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs dark:text-slate-500 text-slate-500">Prioridad</label>
              <input
                type="number"
                className={INPUT_CLS}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="isRegex"
                type="checkbox"
                checked={form.isRegex}
                onChange={(e) => setForm((f) => ({ ...f, isRegex: e.target.checked }))}
                className="rounded border-slate-600"
              />
              <label htmlFor="isRegex" className="text-xs dark:text-slate-400 text-slate-600 cursor-pointer">
                Usar como expresión regular (regex)
              </label>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => { setShowNew(false); setForm(emptyForm()); }}
              className="rounded-md px-3 py-1.5 text-xs dark:text-slate-500 text-slate-400 dark:hover:text-slate-300 hover:text-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !form.pattern.trim() || !form.categoryId}
              className="rounded-md bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
            >
              {creating ? 'Guardando...' : 'Crear regla'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de reglas */}
      {isLoading ? (
        <p className="text-sm dark:text-slate-500 text-slate-400">Cargando...</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border dark:border-slate-800 border-slate-200 p-8 text-center">
          <p className="text-sm dark:text-slate-500 text-slate-400">Sin reglas configuradas.</p>
          <p className="mt-1 text-xs dark:text-slate-600 text-slate-400">
            Crea una regla para que las importaciones bancarias se categoricen automáticamente.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border dark:border-slate-800 border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-slate-800 border-slate-200 dark:bg-slate-900 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium dark:text-slate-500 text-slate-500">Patrón</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium dark:text-slate-500 text-slate-500">Categoría</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium dark:text-slate-500 text-slate-500 w-20">Tipo</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium dark:text-slate-500 text-slate-500 w-24">Prioridad</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium dark:text-slate-500 text-slate-500 w-20">Activa</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((rule) => (
                <tr
                  key={rule.id}
                  className={cn(
                    'border-b last:border-0 dark:border-slate-800 border-slate-100',
                    !rule.isActive && 'opacity-40',
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-xs dark:text-slate-300 text-slate-700">
                    {rule.pattern}
                  </td>
                  <td className="px-4 py-2.5">
                    <CategoryBadge name={rule.category.name} color={rule.category.color} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-xs',
                      rule.isRegex
                        ? 'dark:bg-purple-900/30 bg-purple-50 dark:text-purple-400 text-purple-600'
                        : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500',
                    )}>
                      {rule.isRegex ? 'regex' : 'texto'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleChangePriority(rule, 1)}
                        className="rounded p-0.5 dark:text-slate-600 text-slate-400 dark:hover:text-slate-300 hover:text-slate-600"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs dark:text-slate-400 text-slate-600 tabular-nums">
                        {rule.priority}
                      </span>
                      <button
                        onClick={() => handleChangePriority(rule, -1)}
                        className="rounded p-0.5 dark:text-slate-600 text-slate-400 dark:hover:text-slate-300 hover:text-slate-600"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => handleToggleActive(rule)}>
                      {rule.isActive
                        ? <ToggleRight className="h-5 w-5 text-indigo-500" />
                        : <ToggleLeft className="h-5 w-5 dark:text-slate-600 text-slate-400" />}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="rounded p-1 dark:text-slate-700 text-slate-400 dark:hover:text-red-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
