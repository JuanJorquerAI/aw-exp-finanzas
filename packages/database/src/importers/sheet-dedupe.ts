// Plan de limpieza para registros duplicados por importaciones antiguas del sheet.
// Función pura: decide qué conservar y qué borrar; no toca la base.
// Ante cualquier duda (dos copias con información distinta) no borra y lo
// reporta como conflicto para revisión manual.

export interface DedupeTransactionRecord {
  readonly id: string;
  readonly groupKey: string;
  readonly label: string;
  readonly status: string;
  readonly amount: number;
  readonly companyCode: string;
  readonly createdAt: Date;
  // Alguien la editó después de importarla (estado, empresa, categoría…)
  readonly touched: boolean;
  // Resumen de lo editable: dos copias editadas con la misma firma son equivalentes
  readonly signature: string;
  readonly payments: number;
  readonly notes: number;
  // Documentos vinculados además del que creó el importador
  readonly extraDocuments: number;
  // Documentos que solo están vinculados a esta transacción
  readonly exclusiveDocumentIds: readonly string[];
}

export interface DedupeOpportunityRecord {
  readonly id: string;
  readonly groupKey: string;
  readonly label: string;
  readonly signature: string;
  readonly createdAt: Date;
}

export interface DedupeConflict {
  readonly groupKey: string;
  readonly label: string;
  readonly ids: readonly string[];
  readonly reason: string;
}

export interface DedupePlan {
  readonly keepTransactions: readonly DedupeTransactionRecord[];
  readonly deleteTransactions: readonly DedupeTransactionRecord[];
  readonly deleteDocumentIds: readonly string[];
  readonly keepOpportunities: readonly DedupeOpportunityRecord[];
  readonly deleteOpportunities: readonly DedupeOpportunityRecord[];
  readonly conflicts: readonly DedupeConflict[];
}

interface GroupDecision<T> {
  readonly keep: readonly T[];
  readonly remove: readonly T[];
  readonly conflicts: readonly DedupeConflict[];
}

interface Dated {
  readonly createdAt: Date;
}

const byOldest = (a: Dated, b: Dated): number =>
  a.createdAt.getTime() - b.createdAt.getTime();

function groupBy<T extends { groupKey: string }>(
  items: readonly T[],
): ReadonlyMap<string, readonly T[]> {
  return items.reduce((acc, item) => {
    const group = acc.get(item.groupKey) ?? [];
    return new Map(acc).set(item.groupKey, [...group, item]);
  }, new Map<string, readonly T[]>());
}

function hasUserData(t: DedupeTransactionRecord): boolean {
  return t.payments > 0 || t.notes > 0 || t.extraDocuments > 0;
}

function keepOne<T extends { id: string }>(
  group: readonly T[],
  survivor: T,
): GroupDecision<T> {
  return {
    keep: [survivor],
    remove: group.filter((g) => g.id !== survivor.id),
    conflicts: [],
  };
}

function conflict<T extends { id: string; label: string }>(
  groupKey: string,
  group: readonly T[],
  reason: string,
): GroupDecision<T> {
  return {
    keep: group,
    remove: [],
    conflicts: [
      { groupKey, label: group[0].label, ids: group.map((g) => g.id), reason },
    ],
  };
}

function decideTransactions(
  groupKey: string,
  group: readonly DedupeTransactionRecord[],
): GroupDecision<DedupeTransactionRecord> {
  if (group.length < 2) return { keep: group, remove: [], conflicts: [] };
  if (new Set(group.map((t) => t.amount)).size > 1) {
    return conflict(groupKey, group, "montos distintos entre copias");
  }

  const cancelledWithUserData = group.filter(
    (t) => t.status === "CANCELLED" && hasUserData(t),
  );
  const active = group.filter((t) => t.status !== "CANCELLED");

  if (cancelledWithUserData.length > 0 && active.length > 0) {
    return conflict(
      groupKey,
      group,
      "una copia anulada tiene abonos, notas o documentos agregados",
    );
  }
  if (group.filter(hasUserData).length > 1) {
    return conflict(
      groupKey,
      group,
      "más de una copia tiene abonos, notas o documentos agregados",
    );
  }

  if (active.length === 0) {
    const survivor = [...group].sort(
      (a, b) =>
        Number(hasUserData(b)) - Number(hasUserData(a)) || byOldest(a, b),
    )[0];
    return keepOne(group, survivor);
  }

  const edited = active.filter((t) => t.touched || hasUserData(t));
  if (edited.length === 0) {
    if (active.length < group.length) {
      return conflict(
        groupKey,
        group,
        "una copia fue anulada y otra sigue intacta: ¿anulación real o limpieza manual?",
      );
    }
    return keepOne(group, [...active].sort(byOldest)[0]);
  }
  if (new Set(edited.map((t) => t.signature)).size > 1) {
    return conflict(groupKey, group, "copias editadas de forma distinta");
  }
  const survivor = [...edited].sort(
    (a, b) => Number(hasUserData(b)) - Number(hasUserData(a)) || byOldest(a, b),
  )[0];
  return keepOne(group, survivor);
}

function decideOpportunities(
  groupKey: string,
  group: readonly DedupeOpportunityRecord[],
): GroupDecision<DedupeOpportunityRecord> {
  if (group.length < 2) return { keep: group, remove: [], conflicts: [] };
  if (new Set(group.map((o) => o.signature)).size > 1) {
    return conflict(groupKey, group, "las copias tienen datos distintos");
  }
  return keepOne(group, [...group].sort(byOldest)[0]);
}

function decideAll<T extends { groupKey: string }>(
  items: readonly T[],
  decide: (groupKey: string, group: readonly T[]) => GroupDecision<T>,
): GroupDecision<T> {
  const decisions = [...groupBy(items)].map(([key, group]) =>
    decide(key, group),
  );
  return {
    keep: decisions.flatMap((d) => d.keep),
    remove: decisions.flatMap((d) => d.remove),
    conflicts: decisions.flatMap((d) => d.conflicts),
  };
}

export function planSheetDedupe(
  transactions: readonly DedupeTransactionRecord[],
  opportunities: readonly DedupeOpportunityRecord[],
): DedupePlan {
  const txs = decideAll(transactions, decideTransactions);
  const opps = decideAll(opportunities, decideOpportunities);
  return {
    keepTransactions: txs.keep,
    deleteTransactions: txs.remove,
    deleteDocumentIds: txs.remove.flatMap((t) => t.exclusiveDocumentIds),
    keepOpportunities: opps.keep,
    deleteOpportunities: opps.remove,
    conflicts: [...txs.conflicts, ...opps.conflicts],
  };
}
