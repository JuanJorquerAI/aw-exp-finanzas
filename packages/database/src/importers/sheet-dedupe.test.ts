import {
  DedupeOpportunityRecord,
  DedupeTransactionRecord,
  planSheetDedupe,
} from "./sheet-dedupe";
import { canonicalRut, normalizeRut } from "./sheet-import-keys";

const OLD = new Date("2026-05-12T22:31:36Z");
const NEW = new Date("2026-05-15T17:10:41Z");

function tx(
  overrides: Partial<DedupeTransactionRecord> & { id: string },
): DedupeTransactionRecord {
  return {
    groupKey: "factura|AFECTA|1190|cp1",
    label: "Factura 1190 - Lira",
    status: "PENDING",
    amount: 1196747,
    companyCode: "AW",
    createdAt: OLD,
    touched: false,
    signature: "PENDING|AW",
    payments: 0,
    notes: 0,
    extraDocuments: 0,
    exclusiveDocumentIds: [],
    ...overrides,
  };
}

function opp(
  overrides: Partial<DedupeOpportunityRecord> & { id: string },
): DedupeOpportunityRecord {
  return {
    groupKey: "oportunidad|co1|AdOnTheGo",
    label: "AdOnTheGo",
    signature: "PROPOSAL_SENT|12000000|50",
    createdAt: OLD,
    ...overrides,
  };
}

const ids = (items: readonly { id: string }[]): string[] =>
  items.map((i) => i.id);

describe("planSheetDedupe — transacciones", () => {
  it("no toca registros sin duplicado", () => {
    const plan = planSheetDedupe([tx({ id: "a" })], []);
    expect(plan.deleteTransactions).toEqual([]);
    expect(plan.conflicts).toEqual([]);
  });

  it("si nadie tocó las copias conserva la más antigua", () => {
    const plan = planSheetDedupe(
      [tx({ id: "nueva", createdAt: NEW }), tx({ id: "vieja" })],
      [],
    );
    expect(ids(plan.keepTransactions)).toEqual(["vieja"]);
    expect(ids(plan.deleteTransactions)).toEqual(["nueva"]);
  });

  it("conserva la copia editada (pagada) y borra la intacta con su documento", () => {
    const plan = planSheetDedupe(
      [
        tx({ id: "intacta", createdAt: NEW, exclusiveDocumentIds: ["d1"] }),
        tx({
          id: "pagada",
          status: "PAID",
          touched: true,
          signature: "PAID|EXPRO",
          exclusiveDocumentIds: ["d2"],
        }),
      ],
      [],
    );
    expect(ids(plan.keepTransactions)).toEqual(["pagada"]);
    expect(ids(plan.deleteTransactions)).toEqual(["intacta"]);
    expect(plan.deleteDocumentIds).toEqual(["d1"]);
  });

  it("conserva la copia con abonos aunque sea la más nueva", () => {
    const plan = planSheetDedupe(
      [tx({ id: "sin" }), tx({ id: "con", createdAt: NEW, payments: 1 })],
      [],
    );
    expect(ids(plan.keepTransactions)).toEqual(["con"]);
  });

  it("un documento agregado a mano cuenta como dato a conservar", () => {
    const plan = planSheetDedupe(
      [tx({ id: "sin" }), tx({ id: "con", createdAt: NEW, extraDocuments: 1 })],
      [],
    );
    expect(ids(plan.keepTransactions)).toEqual(["con"]);
  });

  it("dos copias editadas igual: conserva la más antigua", () => {
    const paid = { status: "PAID", touched: true, signature: "PAID|EXPRO" };
    const plan = planSheetDedupe(
      [tx({ id: "b", createdAt: NEW, ...paid }), tx({ id: "a", ...paid })],
      [],
    );
    expect(ids(plan.keepTransactions)).toEqual(["a"]);
    expect(ids(plan.deleteTransactions)).toEqual(["b"]);
  });

  it("dos copias editadas distinto: conflicto, no borra", () => {
    const plan = planSheetDedupe(
      [
        tx({ id: "a", status: "PAID", touched: true, signature: "PAID|AW" }),
        tx({ id: "b", status: "PAID", touched: true, signature: "PAID|EXPRO" }),
      ],
      [],
    );
    expect(plan.deleteTransactions).toEqual([]);
    expect(plan.conflicts[0].reason).toContain("editadas de forma distinta");
  });

  it("más de una copia con abonos o notas: conflicto", () => {
    const plan = planSheetDedupe(
      [tx({ id: "a", payments: 1 }), tx({ id: "b", notes: 2 })],
      [],
    );
    expect(plan.deleteTransactions).toEqual([]);
    expect(plan.conflicts[0].reason).toContain("abonos, notas");
  });

  it("pagada + anulada: borra la anulada", () => {
    const plan = planSheetDedupe(
      [
        tx({
          id: "pagada",
          status: "PAID",
          touched: true,
          signature: "PAID|AW",
        }),
        tx({ id: "anulada", status: "CANCELLED", touched: true }),
      ],
      [],
    );
    expect(ids(plan.keepTransactions)).toEqual(["pagada"]);
    expect(ids(plan.deleteTransactions)).toEqual(["anulada"]);
  });

  it("anulada + pendiente intacta: conflicto (¿anulación real o limpieza?)", () => {
    const plan = planSheetDedupe(
      [
        tx({ id: "pendiente" }),
        tx({ id: "anulada", status: "CANCELLED", touched: true }),
      ],
      [],
    );
    expect(plan.deleteTransactions).toEqual([]);
    expect(plan.conflicts[0].reason).toContain("anulada");
  });

  it("anulada con abonos + activa pagada: conflicto, no borra para no perder abonos", () => {
    const plan = planSheetDedupe(
      [
        tx({
          id: "pagada",
          status: "PAID",
          touched: true,
          signature: "PAID|AW",
        }),
        tx({
          id: "anulada",
          status: "CANCELLED",
          touched: true,
          payments: 1,
        }),
      ],
      [],
    );
    expect(plan.deleteTransactions).toEqual([]);
    expect(plan.conflicts[0].reason).toContain(
      "una copia anulada tiene abonos, notas o documentos agregados",
    );
  });

  it("todas anuladas pero una tiene abonos: conserva la que tiene abonos", () => {
    const plan = planSheetDedupe(
      [
        tx({ id: "sin", status: "CANCELLED" }),
        tx({ id: "con", status: "CANCELLED", createdAt: NEW, payments: 1 }),
      ],
      [],
    );
    expect(ids(plan.keepTransactions)).toEqual(["con"]);
    expect(ids(plan.deleteTransactions)).toEqual(["sin"]);
  });

  it("todas anuladas: deja una", () => {
    const plan = planSheetDedupe(
      [
        tx({ id: "a", status: "CANCELLED" }),
        tx({ id: "b", status: "CANCELLED", createdAt: NEW }),
      ],
      [],
    );
    expect(ids(plan.keepTransactions)).toEqual(["a"]);
  });

  it("montos distintos: conflicto", () => {
    const plan = planSheetDedupe(
      [tx({ id: "a" }), tx({ id: "b", amount: 1 })],
      [],
    );
    expect(plan.deleteTransactions).toEqual([]);
    expect(plan.conflicts[0].reason).toContain("montos distintos");
  });

  it("dos líneas iguales legítimas en el sheet: con expectedCounts conserva 2 y borra los sobrantes", () => {
    const t1 = tx({
      id: "t1",
      groupKey: "gasto|ChatGPT",
      createdAt: new Date("2026-06-01T10:00:00Z"),
    });
    const t2 = tx({
      id: "t2",
      groupKey: "gasto|ChatGPT",
      createdAt: new Date("2026-06-01T10:00:01Z"),
    });
    const t3 = tx({
      id: "t3",
      groupKey: "gasto|ChatGPT",
      createdAt: new Date("2026-06-02T10:00:00Z"),
    });
    const t4 = tx({
      id: "t4",
      groupKey: "gasto|ChatGPT",
      createdAt: new Date("2026-06-02T10:00:01Z"),
    });

    const expectedCounts = new Map([["gasto|ChatGPT", 2]]);
    const plan = planSheetDedupe([t4, t3, t2, t1], [], { expectedCounts });
    expect(ids(plan.keepTransactions)).toEqual(["t1", "t2"]);
    expect(ids(plan.deleteTransactions)).toEqual(["t4", "t3"]);
    expect(plan.conflicts).toEqual([]);
  });

  it("si las copias existentes son menores o iguales a las esperadas, no borra nada", () => {
    const t1 = tx({ id: "t1", groupKey: "gasto|ChatGPT" });
    const t2 = tx({ id: "t2", groupKey: "gasto|ChatGPT", createdAt: NEW });
    const expectedCounts = new Map([["gasto|ChatGPT", 2]]);
    const plan = planSheetDedupe([t1, t2], [], { expectedCounts });
    expect(ids(plan.keepTransactions)).toEqual(["t1", "t2"]);
    expect(plan.deleteTransactions).toEqual([]);
  });

  it("dos facturas S/N legítimas iguales en el sheet: con expectedCounts conserva 2 y borra los sobrantes", () => {
    const key = "factura|AFECTA|S/N|769968946|100000";
    const t1 = tx({
      id: "t1",
      groupKey: key,
      createdAt: new Date("2026-06-01T10:00:00Z"),
    });
    const t2 = tx({
      id: "t2",
      groupKey: key,
      createdAt: new Date("2026-06-01T10:00:01Z"),
    });
    const t3 = tx({
      id: "t3",
      groupKey: key,
      createdAt: new Date("2026-06-02T10:00:00Z"),
    });
    const t4 = tx({
      id: "t4",
      groupKey: key,
      createdAt: new Date("2026-06-02T10:00:01Z"),
    });

    const expectedCounts = new Map([[key, 2]]);
    const plan = planSheetDedupe([t4, t3, t2, t1], [], { expectedCounts });
    expect(ids(plan.keepTransactions)).toEqual(["t1", "t2"]);
    expect(ids(plan.deleteTransactions)).toEqual(["t4", "t3"]);
    expect(plan.conflicts).toEqual([]);
  });

  it("claves con RUT sin guion (banco) y RUT con guion (sheet) coinciden por canonicalRut y protegen copias legítimas", () => {
    // Si una contraparte en BD tiene el RUT guardado sin guion (formato banco):
    const rutBanco = "769968946";
    // Y el sheet viene con puntos y guion:
    const rutSheet = "76.996.894-6";

    // Ambos deben generar la misma clave gracias a canonicalRut:
    const keyBanco = `factura|AFECTA|S/N|${canonicalRut(rutBanco)}|100000`;
    const keySheet = `factura|AFECTA|S/N|${canonicalRut(rutSheet)}|100000`;
    expect(keyBanco).toBe(keySheet);
    expect(keyBanco).toBe("factura|AFECTA|S/N|769968946|100000");

    // Con normalizeRut, keySheet tendría guion ("76996894-6") y keyBanco no ("769968946").
    // Aquí verificamos que con canonicalRut las 2 copias legítimas se preservan con el Map del sheet:
    const t1 = tx({ id: "t1", groupKey: keyBanco, createdAt: new Date("2026-06-01T10:00:00Z") });
    const t2 = tx({ id: "t2", groupKey: keyBanco, createdAt: new Date("2026-06-01T10:00:01Z") });
    const tClone = tx({ id: "tClone", groupKey: keyBanco, createdAt: new Date("2026-06-02T10:00:00Z") });

    const expectedCounts = new Map([[keySheet, 2]]);
    const plan = planSheetDedupe([tClone, t2, t1], [], { expectedCounts });

    expect(ids(plan.keepTransactions)).toEqual(["t1", "t2"]);
    expect(ids(plan.deleteTransactions)).toEqual(["tClone"]);
    expect(plan.conflicts).toEqual([]);
  });
});

describe("planSheetDedupe — oportunidades", () => {
  it("borra copias idénticas y deja la más antigua", () => {
    const plan = planSheetDedupe(
      [],
      [opp({ id: "o2", createdAt: NEW }), opp({ id: "o1" })],
    );
    expect(ids(plan.keepOpportunities)).toEqual(["o1"]);
    expect(ids(plan.deleteOpportunities)).toEqual(["o2"]);
  });

  it("oportunidades respetan expectedCounts cuando hay copias legítimas múltiples", () => {
    const o1 = opp({
      id: "o1",
      groupKey: "oportunidad|AW|AdOnTheGo",
      createdAt: new Date("2026-06-01T10:00:00Z"),
    });
    const o2 = opp({
      id: "o2",
      groupKey: "oportunidad|AW|AdOnTheGo",
      createdAt: new Date("2026-06-01T10:00:01Z"),
    });
    const o3 = opp({
      id: "o3",
      groupKey: "oportunidad|AW|AdOnTheGo",
      createdAt: new Date("2026-06-02T10:00:00Z"),
    });

    const expectedCounts = new Map([["oportunidad|AW|AdOnTheGo", 2]]);
    const plan = planSheetDedupe([], [o3, o2, o1], { expectedCounts });
    expect(ids(plan.keepOpportunities)).toEqual(["o1", "o2"]);
    expect(ids(plan.deleteOpportunities)).toEqual(["o3"]);
  });

  it("no borra copias con datos distintos", () => {
    const plan = planSheetDedupe(
      [],
      [opp({ id: "o1" }), opp({ id: "o2", signature: "WON|12000000|100" })],
    );
    expect(plan.deleteOpportunities).toEqual([]);
    expect(plan.conflicts).toHaveLength(1);
  });
});
